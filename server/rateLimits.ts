import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";

type RateLimitOptionen = {
  windowMs: number;
  max: number;
  nachricht: string;
};

export const LOGIN_RATE_LIMIT: Readonly<RateLimitOptionen> = {
  windowMs: 15 * 60 * 1000,
  max: 10,
  nachricht: "Zu viele Anmeldeversuche. Bitte in 15 Minuten erneut versuchen.",
};

export const PASSWORT_RATE_LIMIT: Readonly<RateLimitOptionen> = {
  windowMs: 15 * 60 * 1000,
  max: 5,
  nachricht: "Zu viele Passwort-Anfragen. Bitte in 15 Minuten erneut versuchen.",
};

export const API_RATE_LIMIT: Readonly<RateLimitOptionen> = {
  windowMs: 60 * 1000,
  max: 300,
  nachricht: "Zu viele Anfragen. Bitte kurz warten.",
};

function erstelleRateLimiter(optionen: RateLimitOptionen, testsUeberspringen = true): RequestHandler {
  return rateLimit({
    windowMs: optionen.windowMs,
    max: optionen.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: optionen.nachricht },
    // Die Produktionsgrenze bleibt aktiv. Tests können sie gezielt einschalten,
    // damit der Schutz nicht nur per Konfiguration, sondern tatsächlich geprüft wird.
    skip: () => testsUeberspringen && process.env.NODE_ENV === "test",
  });
}

export function erstelleLoginRateLimiter(testsUeberspringen = true): RequestHandler {
  return erstelleRateLimiter(LOGIN_RATE_LIMIT, testsUeberspringen);
}

export function erstellePasswortRateLimiter(testsUeberspringen = true): RequestHandler {
  return erstelleRateLimiter(PASSWORT_RATE_LIMIT, testsUeberspringen);
}

export function erstelleApiRateLimiter(testsUeberspringen = true): RequestHandler {
  return erstelleRateLimiter(API_RATE_LIMIT, testsUeberspringen);
}
