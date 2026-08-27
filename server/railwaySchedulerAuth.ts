import type { NextFunction, Request, Response } from "express";
import { sdk } from "./_core/sdk";

const RAILWAY_CRON_HEADER = "x-railway-cron-secret";

/**
 * Erlaubt geplante Aufrufe entweder aus Manus Heartbeat (Standard) oder aus
 * einem eigenen Railway-Cron-Service. Railway nutzt ein separates Secret,
 * weil dort keine Manus-Cron-Identität existiert.
 */
export async function requireScheduledInvocation(req: Request, res: Response, next: NextFunction) {
  if (process.env.SCHEDULER_PROVIDER === "railway") {
    const configuredSecret = process.env.RAILWAY_CRON_SECRET;
    const suppliedSecret = req.get(RAILWAY_CRON_HEADER);

    if (!configuredSecret || !suppliedSecret || suppliedSecret !== configuredSecret) {
      return res.status(403).json({ error: "cron-only endpoint" });
    }

    return next();
  }

  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) return res.status(403).json({ error: "cron-only endpoint" });
    return next();
  } catch (error) {
    console.warn("[CronAuth] Nicht autorisierter Scheduler-Aufruf:", error);
    return res.status(403).json({ error: "cron-only endpoint" });
  }
}

export const railwayCronHeader = RAILWAY_CRON_HEADER;
