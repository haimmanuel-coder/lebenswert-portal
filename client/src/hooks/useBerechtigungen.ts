/**
 * useBerechtigungen – lädt die Modul-Berechtigungen des eingeloggten
 * Mitarbeiters und stellt eine Prüffunktion bereit.
 *
 * Logik:
 *  - Admins haben immer Vollzugriff (kein DB-Check nötig).
 *  - Für alle anderen gilt:
 *      • Kein Eintrag in der DB → Standard-Zugriff (erlaubt)
 *      • Eintrag "erlaubt"    → explizit erlaubt
 *      • Eintrag "verweigert" → gesperrt
 */
import { trpc } from "@/lib/trpc";
import { usePortalAuth } from "@/contexts/PortalAuthContext";

export function useBerechtigungen() {
  const { mitarbeiter } = usePortalAuth();
  const isAdmin = mitarbeiter?.rolle === "admin";

  const { data: berechtigungen = [], isLoading } = (trpc as any).compliance.meineBerechtigungen.useQuery(
    undefined,
    { enabled: !!mitarbeiter && !isAdmin, staleTime: 60_000 }
  );

  /**
   * Gibt true zurück, wenn der Mitarbeiter das Modul nutzen darf.
   * @param modul  Modulname, z.B. "buchhaltung", "analysen", "export"
   */
  const darfNutzen = (modul: string): boolean => {
    if (isAdmin) return true;
    const eintrag = (berechtigungen as Array<{ modul: string; zugriff: string }>)
      .find(b => b.modul === modul);
    if (!eintrag) return true; // Kein Eintrag = Standard = erlaubt
    return eintrag.zugriff === "erlaubt";
  };

  return { darfNutzen, isLoading, isAdmin };
}
