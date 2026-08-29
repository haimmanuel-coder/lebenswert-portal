import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import { railwayCronHeader, requireScheduledInvocation } from "./railwaySchedulerAuth";

const previousProvider = process.env.SCHEDULER_PROVIDER;
const previousSecret = process.env.RAILWAY_CRON_SECRET;

afterEach(() => {
  process.env.SCHEDULER_PROVIDER = previousProvider;
  process.env.RAILWAY_CRON_SECRET = previousSecret;
});

async function startProtectedTestEndpoint() {
  const app = express();
  app.post("/api/scheduled/test", requireScheduledInvocation, (_req, res) => res.json({ ok: true }));
  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Testserver konnte nicht gestartet werden");
  return { server, url: `http://127.0.0.1:${address.port}/api/scheduled/test` };
}

describe("Railway-Cron-Schutz", () => {
  it("akzeptiert nur einen Aufruf mit dem gesetzten Railway-Cron-Secret", async () => {
    // CI erhält keine Produktivgeheimnisse. Lokal wird das gesetzte Secret geprüft,
    // in CI simuliert ein ausschließlich testbezogenes Secret denselben HTTP-Vertrag.
    const suppliedSecret = process.env.RAILWAY_CRON_SECRET || "railway-ci-test-secret";
    process.env.RAILWAY_CRON_SECRET = suppliedSecret;
    expect(suppliedSecret).toBeTruthy();

    process.env.SCHEDULER_PROVIDER = "railway";
    const { server, url } = await startProtectedTestEndpoint();
    try {
      const accepted = await fetch(url, { method: "POST", headers: { [railwayCronHeader]: suppliedSecret! } });
      const rejected = await fetch(url, { method: "POST" });
      expect(accepted.status).toBe(200);
      expect(await accepted.json()).toEqual({ ok: true });
      expect(rejected.status).toBe(403);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});
