import express from "express";
import type { Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { LOGIN_RATE_LIMIT, erstelleLoginRateLimiter } from "./rateLimits";

let server: Server | undefined;

afterEach(async () => {
  if (server) await new Promise<void>((resolve) => server?.close(() => resolve()));
  server = undefined;
});

describe("Login-Rate-Limit", () => {
  it("lässt höchstens zehn Versuche zu und schützt den elften Versuch mit einer allgemeinen Meldung", async () => {
    const app = express();
    app.use(erstelleLoginRateLimiter(false));
    app.post("/portal.login", (_req, res) => res.status(401).json({ error: "E-Mail oder Passwort ungültig." }));
    server = app.listen(0);
    await new Promise<void>((resolve) => server?.once("listening", () => resolve()));
    const port = (server.address() as { port: number }).port;
    const url = `http://127.0.0.1:${port}/portal.login`;

    for (let versuch = 0; versuch < LOGIN_RATE_LIMIT.max; versuch += 1) {
      const antwort = await fetch(url, { method: "POST" });
      expect(antwort.status).toBe(401);
      await expect(antwort.json()).resolves.toEqual({ error: "E-Mail oder Passwort ungültig." });
    }

    const gesperrteAntwort = await fetch(url, { method: "POST" });
    expect(gesperrteAntwort.status).toBe(429);
    await expect(gesperrteAntwort.json()).resolves.toEqual({ error: LOGIN_RATE_LIMIT.nachricht });
  });
});
