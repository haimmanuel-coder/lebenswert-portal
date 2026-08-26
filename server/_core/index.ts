import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import net from "net";
import rateLimit from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { neukundenEskalationHandler, vertretungBereinigungHandler } from "../scheduledHandlers";
import { handleFahrtenVersandCron } from "../scheduled/fahrtenVersand";
import { fuehrerscheinErinnerungHandler } from "../scheduled/fuehrerscheinErinnerung";
import { datenschutzErinnerungHandler } from "../scheduled/datenschutzErinnerung";
import { unterweisungenFaelligkeitHandler } from "../scheduled/unterweisungenFaelligkeit";
import { aufbewahrungsfristenHandler } from "../scheduled/aufbewahrungsfristen";
import { backupWoechentlichHandler } from "../scheduled/backupWoechentlich";
import { pflichtmitteilungenErinnerungHandler } from "../scheduled/pflichtmitteilungenErinnerung";
import { ensureTables } from "../ensureTables";
import { seedAdminFallsNoetig } from "../seedAdmin";
import { ensureHeartbeatJobs } from "../ensureHeartbeatJobs";
import { handleMonatsabschlussErinnerung } from "../scheduled/monatsabschlussErinnerung";
import multer from "multer";
import { storagePut } from "../storage";
import { PORTAL_COOKIE, verifyPortalToken } from "../portalAuth";
import { getMitarbeiterById } from "../db";
import { sdk } from "./sdk";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Tabellen-Absicherung: alle Tabellen per CREATE TABLE IF NOT EXISTS erstellen
  await ensureTables();
  // Start-Admin einmalig anlegen (nur bei leerer Installation + gesetzten SEED_ADMIN_*).
  await seedAdminFallsNoetig().catch((e) => console.warn("[SeedAdmin] übersprungen:", e));
  // Heartbeat-Jobs registrieren (idempotent)
  ensureHeartbeatJobs().catch((e) => console.warn("[HeartbeatJobs] Hintergrund-Init fehlgeschlagen:", e));

  const app = express();
  const server = createServer(app);
  // Trust reverse proxy (Manus gateway) so req.protocol is correctly 'https'
  app.set('trust proxy', 1);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ limit: "2mb", extended: true }));
  app.use(cookieParser());

  const requirePortalMitarbeiter = async (req: any, res: any, next: any) => {
    try {
      const cookieToken = req.cookies?.[PORTAL_COOKIE] as string | undefined;
      const bearerToken = typeof req.headers.authorization === "string" && req.headers.authorization.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : undefined;
      const session = await verifyPortalToken(cookieToken ?? bearerToken ?? "");
      if (!session) return res.status(401).json({ error: "Nicht angemeldet" });
      const ma = await getMitarbeiterById(session.mitarbeiterId);
      if (!ma?.aktiv) return res.status(403).json({ error: "Zugang ist nicht aktiv" });
      req.portalMitarbeiter = ma;
      return next();
    } catch (error) {
      console.warn("[PortalAuth] Zugriff auf Direkt-Endpunkt abgewiesen:", error);
      return res.status(401).json({ error: "Nicht angemeldet" });
    }
  };

  const requireCron = async (req: any, res: any, next: any) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron) return res.status(403).json({ error: "cron-only endpoint" });
      return next();
    } catch (error) {
      console.warn("[CronAuth] Nicht autorisierter Scheduler-Aufruf:", error);
      return res.status(403).json({ error: "cron-only endpoint" });
    }
  };

  // ── Rate-Limiting ──────────────────────────────────────────────────────────
  // Login-Schutz: max. 10 Versuche pro 15 Minuten pro IP
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Zu viele Anmeldeversuche. Bitte in 15 Minuten erneut versuchen." },
    skip: (_req: import("express").Request) => process.env.NODE_ENV === "test",
  });
  // Passwort-Reset: max. 5 Versuche pro 15 Minuten pro IP
  const passwortLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Zu viele Passwort-Anfragen. Bitte in 15 Minuten erneut versuchen." },
    skip: (_req: import("express").Request) => process.env.NODE_ENV === "test",
  });
  // Allgemeines API-Limit: max. 300 Anfragen pro Minute pro IP (Schutz vor Massenanfragen)
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Zu viele Anfragen. Bitte kurz warten." },
    skip: (_req: import("express").Request) => process.env.NODE_ENV === "test",
  });
  // Login-Endpunkte absichern (tRPC batch-kompatibel: URL-Matching)
  app.use("/api/trpc/portal.login", loginLimiter);
  app.use("/api/trpc/portal.passwortVergessen", passwortLimiter);
  app.use("/api/trpc/portal.passwortZuruecksetzen", passwortLimiter);
  app.use("/api/trpc/admin.mitarbeiterPasswortReset", passwortLimiter);
  app.use("/api/trpc/admin.mitarbeiterTempPasswort", passwortLimiter);
  app.use("/api/trpc", apiLimiter);
  // ──────────────────────────────────────────────────────────────────────────

  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // Foto/Audio-Upload-Endpoints
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 16 * 1024 * 1024 } });
  app.post("/api/upload/foto", requirePortalMitarbeiter, upload.single("file"), async (req: any, res: any) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Keine Datei" });
      const key = `fotos/${Date.now()}-${(req.file.originalname as string).replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { url } = await storagePut(key, req.file.buffer, req.file.mimetype);
      return res.json({ url, key });
    } catch (e: any) { console.error("[Upload/Foto]", e); return res.status(500).json({ error: "Foto konnte nicht gespeichert werden." }); }
  });
  app.post("/api/upload/audio", requirePortalMitarbeiter, upload.single("file"), async (req: any, res: any) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Keine Datei" });
      const key = `audio/${Date.now()}-${(req.file.originalname as string).replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { url } = await storagePut(key, req.file.buffer, req.file.mimetype);
      return res.json({ url, key });
    } catch (e: any) { console.error("[Upload/Audio]", e); return res.status(500).json({ error: "Audio konnte nicht gespeichert werden." }); }
  });
  // ⏱ Heartbeat-Handler (Cron-only, vor tRPC registrieren)
  app.use("/api/scheduled", requireCron);
  app.post("/api/scheduled/neukunden-eskalation", neukundenEskalationHandler);
  app.post("/api/scheduled/fuehrerschein-erinnerung", fuehrerscheinErinnerungHandler);
  app.post("/api/scheduled/vertretung-bereinigung", vertretungBereinigungHandler);
  app.post("/api/scheduled/datenschutz-erinnerung", datenschutzErinnerungHandler);
  app.post("/api/scheduled/aufbewahrungsfristen-pruefung", aufbewahrungsfristenHandler);
  app.post("/api/scheduled/unterweisungen-faelligkeit", unterweisungenFaelligkeitHandler);
  app.post("/api/scheduled/pflichtmitteilungen-erinnerung", pflichtmitteilungenErinnerungHandler);
  // Fahrtennachweise: automatischer Versand am 18. jeden Monats
  app.post("/api/scheduled/backup-woechentlich", backupWoechentlichHandler);
  // Fahrtennachweise: automatischer Versand am 18. jeden Monats
  app.post("/api/scheduled/fahrtennachweise-versand", async (_req: any, res: any) => {
    try {
      const result = await handleFahrtenVersandCron();
      res.json({ ok: true, ...result });
    } catch (err) {
      console.error("[Scheduled/FahrtenVersand]", err);
      res.status(500).json({ ok: false, error: "Fahrtennachweis-Versand fehlgeschlagen." });
    }
  });
  // Monatsabschluss-Erinnerung: am 28. jeden Monats
  app.post("/api/scheduled/monatsabschluss-erinnerung", async (_req: any, res: any) => {
    try {
      const result = await handleMonatsabschlussErinnerung();
      res.json({ ok: true, ...result });
    } catch (err) {
      console.error("[Scheduled/MonatsabschlussErinnerung]", err);
      res.status(500).json({ ok: false, error: "Monatsabschluss-Erinnerung fehlgeschlagen." });
    }
  });

  // 📡 SSE-Kanal für Echtzeit-Benachrichtigungen
  const sseClients = new Map<number, Set<any>>();
  app.get("/api/sse", requirePortalMitarbeiter, (req: any, res: any) => {
    const angefragteId = parseInt(req.query.mitarbeiterId ?? "0");
    const mitarbeiterId = angefragteId || req.portalMitarbeiter.id;
    if (angefragteId && angefragteId !== req.portalMitarbeiter.id && req.portalMitarbeiter.rolle !== "admin") {
      return res.status(403).json({ error: "Kein Zugriff auf diesen Echtzeitkanal" });
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    res.write('data: {"type":"connected"}\n\n');
    if (!sseClients.has(mitarbeiterId)) sseClients.set(mitarbeiterId, new Set());
    sseClients.get(mitarbeiterId)!.add(res);
    const heartbeat = setInterval(() => { try { res.write(": ping\n\n"); } catch { clearInterval(heartbeat); } }, 25000);
    req.on("close", () => {
      clearInterval(heartbeat);
      sseClients.get(mitarbeiterId)?.delete(res);
    });
  });
  (global as any).sseBroadcast = (mitarbeiterId: number, event: string, data: object) => {
    const clients = sseClients.get(mitarbeiterId);
    if (!clients) return;
    const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    clients.forEach((res: any) => { try { res.write(msg); } catch { clients.delete(res); } });
  };

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
