/**
 * ════════════════════════════════════════════════════════════════════════════
 *  NAVIGATIONS-CONTEXT
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Die Anwendung navigiert über einen Zustand in `PortalApp` statt über einen
 * Router. Ohne gemeinsamen Zugriff darauf konnten Unterseiten keine
 * Seitenwechsel auslösen – deshalb hatten sämtliche Schnellzugriffe im
 * Ampel-Dashboard keine Funktion.
 *
 * Dieser Context stellt die Navigation allen Seiten zur Verfügung:
 *
 *   const { navigiere } = useNavigation();
 *   <button onClick={() => navigiere("urlaub")}>Urlaubsanträge prüfen</button>
 *
 * `useNavigation` funktioniert auch außerhalb des Providers (z. B. in Tests):
 * Dort ist `navigiere` eine wirkungslose Funktion statt eines Fehlers.
 */

import { createContext, useContext, type ReactNode } from "react";

/** Alle Seiten, die per Schnellzugriff angesteuert werden können. */
export type SeitenId =
  | "home" | "einsaetze" | "planung" | "zeit" | "lnw" | "fahrt"
  | "admin" | "management" | "kunden" | "kostentraeger"
  | "textbausteine" | "export" | "fuehrerschein"
  | "neukundenaufnahme" | "kalender" | "kassenanfrage"
  | "urlaub" | "krank" | "touren" | "meinetour" | "benachrichtigungen"
  | "profil" | "leistungsfreigabe" | "buchhaltung"
  | "mitarbeiterakte" | "logbuch" | "vertretungen"
  | "admindashboard" | "rollenverwaltung" | "kundenzuteilung" | "rbacverwaltung"
  | "besuchsberichte" | "datenschutz" | "integrationen" | "arbeitszentrum"
  | "zweifaktor" | "verfuegbarkeiten" | "analysen" | "backupstatus"
  | "import" | "privatrechnung" | "budget" | "controlling" | "fahrtenabrechnung";

type NavigationWert = {
  /** Wechselt zur angegebenen Seite. */
  navigiere: (seite: SeitenId) => void;
  /** Öffnet die Detailansicht eines Kunden. */
  oeffneKunde: (kundenId: number) => void;
  /** Aktuell angezeigte Seite. */
  aktuelleSeite: SeitenId;
};

const NavigationContext = createContext<NavigationWert | null>(null);

export function NavigationProvider({
  wert,
  children,
}: {
  wert: NavigationWert;
  children: ReactNode;
}) {
  return <NavigationContext.Provider value={wert}>{children}</NavigationContext.Provider>;
}

/**
 * Zugriff auf die Navigation.
 * Außerhalb des Providers wird eine wirkungslose Variante geliefert, damit
 * einzelne Seiten auch isoliert gerendert werden können.
 */
export function useNavigation(): NavigationWert {
  const wert = useContext(NavigationContext);
  if (wert) return wert;
  return {
    navigiere: () => {
      console.warn("[Navigation] Kein NavigationProvider vorhanden – Seitenwechsel ignoriert.");
    },
    oeffneKunde: () => {
      console.warn("[Navigation] Kein NavigationProvider vorhanden – Kundendetail ignoriert.");
    },
    aktuelleSeite: "home",
  };
}
