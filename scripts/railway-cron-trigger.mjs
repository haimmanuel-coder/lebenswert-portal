/**
 * Kurzlebiger Starter für einen einzelnen Railway-Cron-Service.
 * Verwendung: pnpm cron:railway -- backup-woechentlich
 */
const knownJobs = new Set([
  "fuehrerschein-erinnerung",
  "neukunden-eskalation",
  "vertretung-bereinigung",
  "fahrtennachweise-versand",
  "sicherheitsunterweisung-erinnerung",
  "aufbewahrungsfristen-pruefung",
  "backup-woechentlich",
  "monatsabschluss-erinnerung",
  "pflichtmitteilungen-erinnerung",
]);

const jobName = process.argv[2];
const targetUrl = process.env.SCHEDULER_TARGET_URL?.replace(/\/+$/, "");
const secret = process.env.RAILWAY_CRON_SECRET;

if (!jobName || !knownJobs.has(jobName)) {
  console.error(`Unbekannte Railway-Cron-Aufgabe: ${jobName ?? "(nicht angegeben)"}`);
  process.exit(2);
}
if (!targetUrl || !secret) {
  console.error("SCHEDULER_TARGET_URL oder RAILWAY_CRON_SECRET fehlt.");
  process.exit(2);
}

try {
  const response = await fetch(`${targetUrl}/api/scheduled/${jobName}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-railway-cron-secret": secret,
    },
  });
  const body = await response.text();
  if (!response.ok) {
    console.error(`[RailwayCron] ${jobName} fehlgeschlagen (${response.status}): ${body.slice(0, 500)}`);
    process.exit(1);
  }
  console.log(`[RailwayCron] ${jobName} erfolgreich: ${body.slice(0, 500)}`);
} catch (error) {
  console.error(`[RailwayCron] ${jobName} nicht erreichbar:`, error);
  process.exit(1);
}
