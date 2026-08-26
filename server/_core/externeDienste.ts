/**
 * ════════════════════════════════════════════════════════════════════════════
 *  AUSWAHL EXTERNER OpenAI-KOMPATIBLER DIENSTE (LLM / Speech-to-Text)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Reine, testbare Logik: bevorzugt einen eigenen Anbieter (Basis-URL + Schlüssel),
 * fällt sonst auf den Manus/Forge-Dienst zurück. So läuft die KI auf jedem
 * OpenAI-kompatiblen Anbieter (OpenAI, Mistral, Azure OpenAI, self-hosted …).
 */

export type DienstEndpunkt = { basis: string; key: string };

export function resolveEndpunkt(cfg: {
  eigenUrl?: string;
  eigenKey?: string;
  forgeUrl?: string;
  forgeKey?: string;
  /** Standard-Basis für Forge, falls forgeUrl leer ist (nur beim LLM genutzt). */
  forgeFallbackBasis?: string;
}): DienstEndpunkt | null {
  const eUrl = (cfg.eigenUrl ?? "").trim();
  const eKey = (cfg.eigenKey ?? "").trim();
  if (eUrl && eKey) return { basis: eUrl.replace(/\/+$/, ""), key: eKey };

  const fKey = (cfg.forgeKey ?? "").trim();
  if (fKey) {
    const basis = ((cfg.forgeUrl ?? "").trim() || cfg.forgeFallbackBasis || "").replace(/\/+$/, "");
    if (basis) return { basis, key: fKey };
  }
  return null;
}
