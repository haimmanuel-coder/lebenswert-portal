/**
 * Heartbeat-Handler für automatisierte Hintergrundjobs.
 * Registrierung: server/_core/index.ts → app.post("/api/scheduled/...")
 * Auth: sdk.authenticateRequest → user.isCron === true
 */
import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import {
  getStaleNeukundenPush,
  eskaliereNeukundenPush,
  getAllMitarbeiter,
  getAbgelaufeneVertretungen,
  deaktiviereVertretung,
  createNotification,
  createAuditLog,
} from "./db";

// ── HANDLER 1: Neukunden-Eskalation ──────────────────────────────────────────
export async function neukundenEskalationHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only endpoint" });
    }

    const alleMa = await getAllMitarbeiter();
    const admins = alleMa.filter((m: { rolle: string }) => m.rolle === "admin");

    // Stufe 0 → 1: 24h ohne Bestätigung
    const stale24h = await getStaleNeukundenPush(24 * 60 * 60 * 1000);
    let eskaliert24 = 0;
    for (const row of stale24h) {
      const stufe = (row.eskalationsstufe ?? 0) as number;
      if (stufe === 0) {
        await eskaliereNeukundenPush(row.id, 1);
        await createNotification({
          empfaengerId: row.mitarbeiterId,
          titel: "⚠️ Erinnerung: Neukunden-Bestätigung ausstehend (24h)",
          nachricht:
            "Du hast eine Neukunden-Bestätigung noch nicht abgehakt. Bitte jetzt erledigen.",
          typ: "warnung",
        });
        eskaliert24++;
      }
    }

    // Stufe 1 → 2: 48h ohne Bestätigung → Admin-Alert
    const stale48h = await getStaleNeukundenPush(48 * 60 * 60 * 1000);
    let eskaliert48 = 0;
    for (const row of stale48h) {
      const stufe = (row.eskalationsstufe ?? 0) as number;
      if (stufe === 1) {
        await eskaliereNeukundenPush(row.id, 2);
        for (const admin of admins) {
          await createNotification({
            empfaengerId: admin.id,
            titel: "🚨 Admin-Alert: Neukunden-Push 48h unbestätigt",
            nachricht: `Mitarbeiter-ID ${row.mitarbeiterId} hat eine Neukunden-Bestätigung seit 48h nicht abgehakt!`,
            typ: "fehler",
          });
        }
        eskaliert48++;
      }
    }

    // Audit-Log mit System-ID -1 (Cron-Kontext)
    await createAuditLog({
      mitarbeiterId: -1,
      action: "CRON",
      ressource: "neukunden_eskalation",
      details: `eskaliert_24h=${eskaliert24} eskaliert_48h=${eskaliert48}`,
      status: "success",
    });

    console.log(
      `[Heartbeat] neukunden-eskalation: 24h=${eskaliert24} 48h=${eskaliert48}`
    );
    return res.json({
      ok: true,
      eskaliert24h: eskaliert24,
      eskaliert48h: eskaliert48,
    });
  } catch (err: any) {
    console.error("[Heartbeat] neukunden-eskalation FEHLER:", err);
    return res.status(500).json({
      error: String(err?.message ?? err),
      stack: err?.stack,
      context: { url: req.url, taskUid: (req as any).__taskUid },
      timestamp: new Date().toISOString(),
    });
  }
}

// ── HANDLER 2: Vertretungs-Bereinigung ───────────────────────────────────────
export async function vertretungBereinigungHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only endpoint" });
    }

    const alleMa = await getAllMitarbeiter();
    const admins = alleMa.filter((m: { rolle: string }) => m.rolle === "admin");

    const abgelaufene = await getAbgelaufeneVertretungen();
    let bereinigt = 0;

    for (const v of abgelaufene) {
      await deaktiviereVertretung(v.id);
      for (const admin of admins) {
        await createNotification({
          empfaengerId: admin.id,
          titel: "✅ Vertretung automatisch beendet",
          nachricht: `Vertretung für Kunden-ID ${v.kundenId} durch Mitarbeiter-ID ${v.vertreterId} ist abgelaufen und wurde automatisch bereinigt.`,
          typ: "info",
        });
      }
      bereinigt++;
    }

    await createAuditLog({
      mitarbeiterId: -1,
      action: "CRON",
      ressource: "vertretung_bereinigung",
      details: `bereinigt=${bereinigt}`,
      status: "success",
    });

    console.log(`[Heartbeat] vertretung-bereinigung: bereinigt=${bereinigt}`);
    return res.json({ ok: true, bereinigt });
  } catch (err: any) {
    console.error("[Heartbeat] vertretung-bereinigung FEHLER:", err);
    return res.status(500).json({
      error: String(err?.message ?? err),
      stack: err?.stack,
      context: { url: req.url, taskUid: (req as any).__taskUid },
      timestamp: new Date().toISOString(),
    });
  }
}
