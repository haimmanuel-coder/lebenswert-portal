/**
 * ════════════════════════════════════════════════════════════════════════════
 *  RATE-LIMITING FÜR AUTHENTIFIZIERUNGS-ROUTEN (S-1)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Schützt Login, Passwort-Reset und 2FA-Prüfung vor automatisiertem
 * Durchprobieren (Brute-Force). Ohne diese Drosselung konnte ein Angreifer
 * beliebig viele Passwörter oder sechsstellige Codes testen.
 *
 * Bewusst als schlanke In-Memory-Lösung umgesetzt:
 *   • Kein zusätzliches npm-Paket nötig (die Umgebung hat eingeschränkten
 *     Netzwerkzugang; weniger Abhängigkeiten bedeuten weniger Angriffsfläche).
 *   • Gleitendes Zeitfenster je Schlüssel (z. B. IP+E-Mail).
 *
 * Grenze für eine Einzelinstanz: Der Zähler lebt im Prozessspeicher. Bei
 * mehreren Server-Instanzen hinter einem Load Balancer greift das Limit je
 * Instanz. Für eine harte, instanzübergreifende Grenze wäre ein gemeinsamer
 * Speicher (z. B. Redis) nötig – das ist hier bewusst nicht umgesetzt, da die
 * Anwendung als Einzelinstanz betrieben wird. Der Schutz gegen einfaches
 * Durchprobieren ist damit dennoch wirksam.
 */

import { TRPCError } from "@trpc/server";

type Versuchseintrag = {
  /** Zeitstempel der Versuche im aktuellen Fenster (ms) */
  zeitpunkte: number[];
  /** Sperre bis zu diesem Zeitpunkt (ms), 0 = keine Sperre */
  gesperrtBis: number;
};

const speicher = new Map<string, Versuchseintrag>();

export type RateLimitOptionen = {
  /** Maximale Versuche im Zeitfenster */
  maxVersuche: number;
  /** Länge des Zeitfensters in Millisekunden */
  fensterMs: number;
  /** Sperrdauer nach Überschreitung in Millisekunden */
  sperreMs: number;
};

/** Voreinstellung für Anmeldeversuche: 5 Versuche in 5 Minuten, dann 15 Min. Sperre. */
export const LOGIN_LIMIT: RateLimitOptionen = {
  maxVersuche: 5,
  fensterMs: 5 * 60 * 1000,
  sperreMs: 15 * 60 * 1000,
};

/** Voreinstellung für Passwort-Reset-Anforderungen: 3 in 15 Minuten. */
export const RESET_LIMIT: RateLimitOptionen = {
  maxVersuche: 3,
  fensterMs: 15 * 60 * 1000,
  sperreMs: 15 * 60 * 1000,
};

/**
 * Prüft und registriert einen Versuch für den angegebenen Schlüssel.
 * Wirft TOO_MANY_REQUESTS, sobald die Grenze überschritten ist.
 *
 * Aufruf VOR der eigentlichen Prüfung (z. B. vor dem Passwortvergleich),
 * damit auch fehlgeschlagene Versuche gezählt werden.
 */
export function pruefeRateLimit(schluessel: string, optionen: RateLimitOptionen): void {
  const jetzt = Date.now();
  const eintrag = speicher.get(schluessel) ?? { zeitpunkte: [], gesperrtBis: 0 };

  // Aktive Sperre?
  if (eintrag.gesperrtBis > jetzt) {
    const restSekunden = Math.ceil((eintrag.gesperrtBis - jetzt) / 1000);
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message:
        `Zu viele Versuche. Bitte in ${Math.ceil(restSekunden / 60)} Minute(n) erneut versuchen.`,
    });
  }

  // Alte Zeitpunkte außerhalb des Fensters verwerfen
  eintrag.zeitpunkte = eintrag.zeitpunkte.filter((t) => jetzt - t < optionen.fensterMs);
  eintrag.zeitpunkte.push(jetzt);

  if (eintrag.zeitpunkte.length > optionen.maxVersuche) {
    eintrag.gesperrtBis = jetzt + optionen.sperreMs;
    eintrag.zeitpunkte = [];
    speicher.set(schluessel, eintrag);
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message:
        `Zu viele Versuche. Der Zugang ist für ${Math.ceil(optionen.sperreMs / 60000)} Minuten gesperrt.`,
    });
  }

  speicher.set(schluessel, eintrag);
}

/**
 * Setzt den Zähler eines Schlüssels zurück – nach einem erfolgreichen Login,
 * damit legitime Nutzer nach einer Anmeldung nicht durch frühere Fehlversuche
 * belastet bleiben.
 */
export function ratelimitZuruecksetzen(schluessel: string): void {
  speicher.delete(schluessel);
}

/**
 * Ermittelt die Client-IP aus dem Request.
 * `app.set('trust proxy', 1)` ist gesetzt, daher liefert req.ip die echte
 * Client-Adresse hinter dem Reverse Proxy.
 */
export function clientIp(req: any): string {
  return (req?.ip as string) || (req?.socket?.remoteAddress as string) || "unbekannt";
}

/** Entfernt abgelaufene Einträge, damit die Map nicht unbegrenzt wächst. */
function aufraeumen(): void {
  const jetzt = Date.now();
  const zuLoeschen: string[] = [];
  speicher.forEach((eintrag, schluessel) => {
    const aktiv =
      eintrag.gesperrtBis > jetzt || eintrag.zeitpunkte.some((t: number) => jetzt - t < 60 * 60 * 1000);
    if (!aktiv) zuLoeschen.push(schluessel);
  });
  for (const schluessel of zuLoeschen) speicher.delete(schluessel);
}

// Stündliche Bereinigung; unref, damit der Timer den Prozess nicht offenhält.
const aufraeumTimer = setInterval(aufraeumen, 60 * 60 * 1000);
if (typeof aufraeumTimer.unref === "function") aufraeumTimer.unref();
