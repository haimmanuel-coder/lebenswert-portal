import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import net from "net";
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
import { ensureTables } from "../ensureTables";
import { ensureHeartbeatJobs } from "../ensureHeartbeatJobs";
import multer from "multer";
import { storagePut } from "../storage";

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
  // Heartbeat-Jobs registrieren (idempotent)
  ensureHeartbeatJobs().catch((e) => console.warn("[HeartbeatJobs] Hintergrund-Init fehlgeschlagen:", e));

  const app = express();
  const server = createServer(app);
  // Trust reverse proxy (Manus gateway) so req.protocol is correctly 'https'
  app.set('trust proxy', 1);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(cookieParser());
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // Foto/Audio-Upload-Endpoints
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 16 * 1024 * 1024 } });
  app.post("/api/upload/foto", upload.single("file"), async (req: any, res: any) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Keine Datei" });
      const key = `fotos/${Date.now()}-${(req.file.originalname as string).replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { url } = await storagePut(key, req.file.buffer, req.file.mimetype);
      return res.json({ url, key });
    } catch (e: any) { return res.status(500).json({ error: e.message }); }
  });
  app.post("/api/upload/audio", upload.single("file"), async (req: any, res: any) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Keine Datei" });
      const key = `audio/${Date.now()}-${(req.file.originalname as string).replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { url } = await storagePut(key, req.file.buffer, req.file.mimetype);
      return res.json({ url, key });
    } catch (e: any) { return res.status(500).json({ error: e.message }); }
  });
  // ⏱ Heartbeat-Handler (Cron-only, vor tRPC registrieren)
  app.post("/api/scheduled/neukunden-eskalation", neukundenEskalationHandler);
  app.post("/api/scheduled/fuehrerschein-erinnerung", fuehrerscheinErinnerungHandler);
  app.post("/api/scheduled/vertretung-bereinigung", vertretungBereinigungHandler);
  app.post("/api/scheduled/datenschutz-erinnerung", datenschutzErinnerungHandler);
  app.post("/api/scheduled/unterweisungen-faelligkeit", unterweisungenFaelligkeitHandler);
  // Fahrtennachweise: automatischer Versand am 18. jeden Monats
  app.post("/api/scheduled/fahrtennachweise-versand", async (_req: any, res: any) => {
    try {
      const result = await handleFahrtenVersandCron();
      res.json({ ok: true, ...result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Scheduled/FahrtenVersand]", err);
      res.status(500).json({ ok: false, error: msg });
    }
  });

  // 📡 SSE-Kanal für Echtzeit-Benachrichtigungen
  const sseClients = new Map<number, Set<any>>();
  app.get("/api/sse", (req: any, res: any) => {
    const mitarbeiterId = parseInt(req.query.mitarbeiterId ?? "0");
    if (!mitarbeiterId) return res.status(400).end();
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
