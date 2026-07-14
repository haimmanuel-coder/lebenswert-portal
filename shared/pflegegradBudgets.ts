/**
 * Monatliche Leistungsbeträge nach Pflegegrad (Stand: 1.7.2025 bis 31.12.2027)
 * Quelle: Pflegedschungel 2025 – Tabelle C. Alle Pflegegrade
 *
 * §45b SGB XI – Entlastungsbetrag: 131 € für ALLE Pflegegrade (1–5)
 * §45a SGB XI – Angebote zur Unterstützung (Umwandlung max. 40% ambulanter Sachleistungsbetrag):
 *   Pflegegrad 1: 0 € (kein Anspruch auf Sachleistung)
 *   Pflegegrad 2: 318 €
 *   Pflegegrad 3: 599 €
 *   Pflegegrad 4: 744 €
 *   Pflegegrad 5: 920 €
 * §39 SGB XI – Verhinderungspflege (Jahresbetrag anteilig):
 *   Pflegegrad 2–5: 3.539 € / Jahr (anteilig je Monat ≈ 294,92 €)
 *   Pflegegrad 1: 0 €
 */

export type PflegegradBudget = {
  budget45b: number;  // monatlich
  budget45a: number;  // monatlich (Umwandlungsbetrag)
  budget39: number;   // monatlich (Jahresbetrag / 12)
};

export const PFLEGEGRAD_BUDGETS: Record<number, PflegegradBudget> = {
  1: { budget45b: 131, budget45a: 0,   budget39: 0 },
  2: { budget45b: 131, budget45a: 318, budget39: 295 },
  3: { budget45b: 131, budget45a: 599, budget39: 295 },
  4: { budget45b: 131, budget45a: 744, budget39: 295 },
  5: { budget45b: 131, budget45a: 920, budget39: 295 },
};

/**
 * Gibt die empfohlenen monatlichen Budgets für einen Pflegegrad zurück.
 * Gibt null zurück wenn der Pflegegrad ungültig ist.
 */
export function getBudgetForPflegegrad(pflegegrad: number | null | undefined): PflegegradBudget | null {
  if (!pflegegrad || pflegegrad < 1 || pflegegrad > 5) return null;
  return PFLEGEGRAD_BUDGETS[pflegegrad] ?? null;
}
