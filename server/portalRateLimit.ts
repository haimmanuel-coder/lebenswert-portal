import { TRPCError } from "@trpc/server";

type LimitKategorie = "login" | "passwort_reset";

type LimitEintrag = { anzahl: number; ablaufAt: number };

const LIMITS: Record<LimitKategorie, { maximum: number; fensterMs: number }> = {
  login: { maximum: 10, fensterMs: 15 * 60 * 1000 },
  passwort_reset: { maximum: 5, fensterMs: 15 * 60 * 1000 },
};

const versuche = new Map<string, LimitEintrag>();

function bereinigeKennung(kennung: string) {
  return kennung.trim().toLowerCase().slice(0, 320);
}

function clientAdresse(req: { ip?: string; socket?: { remoteAddress?: string | undefined } }) {
  return req.ip || req.socket?.remoteAddress || "unbekannt";
}

function schluessel(kategorie: LimitKategorie, req: { ip?: string; socket?: { remoteAddress?: string | undefined } }, kennung: string) {
  return `${kategorie}:${clientAdresse(req)}:${bereinigeKennung(kennung)}`;
}

function aktuellenEintrag(key: string, jetzt: number) {
  const eintrag = versuche.get(key);
  if (!eintrag || eintrag.ablaufAt <= jetzt) {
    versuche.delete(key);
    return null;
  }
  return eintrag;
}

/** Prüft das Limit vor einer sicherheitskritischen Aktion, ohne Werte zu protokollieren. */
export function pruefePortalRateLimit(kategorie: LimitKategorie, req: { ip?: string; socket?: { remoteAddress?: string | undefined } }, kennung: string, jetzt = Date.now()) {
  const eintrag = aktuellenEintrag(schluessel(kategorie, req, kennung), jetzt);
  if (eintrag && eintrag.anzahl >= LIMITS[kategorie].maximum) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Zu viele Versuche. Bitte in 15 Minuten erneut versuchen." });
  }
}

/** Zählt einen fehlgeschlagenen Login oder eine bewusst begrenzte Reset-Anforderung. */
export function erfassePortalVersuch(kategorie: LimitKategorie, req: { ip?: string; socket?: { remoteAddress?: string | undefined } }, kennung: string, jetzt = Date.now()) {
  const key = schluessel(kategorie, req, kennung);
  const eintrag = aktuellenEintrag(key, jetzt);
  const limit = LIMITS[kategorie];
  versuche.set(key, {
    anzahl: (eintrag?.anzahl ?? 0) + 1,
    ablaufAt: eintrag?.ablaufAt ?? jetzt + limit.fensterMs,
  });
}

/** Ein erfolgreicher Login setzt ausschließlich den Zähler dieses Kontos an dieser Adresse zurück. */
export function loeschePortalVersuche(kategorie: LimitKategorie, req: { ip?: string; socket?: { remoteAddress?: string | undefined } }, kennung: string) {
  versuche.delete(schluessel(kategorie, req, kennung));
}

/** Ausschließlich für automatisierte Tests; im Produktcode nicht verwenden. */
export function leerePortalRateLimitsFuerTest() {
  versuche.clear();
}
