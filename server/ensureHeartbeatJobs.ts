/**
 * ════════════════════════════════════════════════════════════════════════════
 *  HEARTBEAT-JOBS REGISTRIERUNG
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Registriert alle geplanten Cron-Jobs beim Server-Start.
 * Nutzt createHeartbeatJob – idempotent (doppelter Aufruf schadet nicht,
 * da der Dienst bei gleichem Namen den bestehenden Job beibehält).
 */

import { createHeartbeatJob, listHeartbeatJobs } from "./_core/heartbeat";

const JOBS = [
  {
    name: "fuehrerschein-erinnerung",
    cron: "0 0 8 * * *",          // täglich 08:00 UTC
    path: "/api/scheduled/fuehrerschein-erinnerung",
    method: "POST" as const,
    description: "Führerschein-Check: tägliche Fälligkeitsprüfung und Erinnerungen",
  },
  {
    name: "neukunden-eskalation",
    cron: "0 0 9 * * *",          // täglich 09:00 UTC
    path: "/api/scheduled/neukunden-eskalation",
    method: "POST" as const,
    description: "Neukundenaufnahmen: 24h/48h-Eskalation",
  },
  {
    name: "vertretung-bereinigung",
    cron: "0 0 2 * * *",          // täglich 02:00 UTC
    path: "/api/scheduled/vertretung-bereinigung",
    method: "POST" as const,
    description: "Vertretungen: abgelaufene Einträge bereinigen",
  },
  {
    name: "fahrtennachweise-versand",
    cron: "0 0 6 18 * *",         // am 18. jeden Monats 06:00 UTC
    path: "/api/scheduled/fahrtennachweise-versand",
    method: "POST" as const,
    description: "Fahrtennachweise: automatischer Versand am 18. des Monats",
  },
  {
    name: "sicherheitsunterweisung-erinnerung",
    cron: "0 0 8 1 * *",          // am 1. jeden Monats 08:00 UTC
    path: "/api/scheduled/sicherheitsunterweisung-erinnerung",
    method: "POST" as const,
    description: "Sicherheitsunterweisungen: monatliche Fälligkeitsprüfung",
  },
];

export async function ensureHeartbeatJobs(): Promise<void> {
  try {
    // Bestehende Jobs laden um Duplikate zu vermeiden
    let existingNames: Set<string> = new Set();
    try {
      const existing = await listHeartbeatJobs("" /* owner session */);
      existingNames = new Set(existing.jobs.map((j) => j.name));
    } catch {
      // Falls listHeartbeatJobs fehlschlägt, trotzdem versuchen zu erstellen
    }

    let registered = 0;
    let skipped = 0;

    for (const job of JOBS) {
      if (existingNames.has(job.name)) {
        skipped++;
        continue;
      }
      try {
        await createHeartbeatJob(job, "");
        registered++;
        console.log(`[HeartbeatJobs] Registriert: ${job.name}`);
      } catch (err) {
        // Job existiert bereits oder anderer Fehler – ignorieren
        console.warn(`[HeartbeatJobs] Konnte ${job.name} nicht registrieren:`, String(err).slice(0, 100));
      }
    }

    console.log(`[HeartbeatJobs] ${registered} neu registriert, ${skipped} bereits vorhanden`);
  } catch (err) {
    console.warn("[HeartbeatJobs] Initialisierung fehlgeschlagen:", err);
  }
}
