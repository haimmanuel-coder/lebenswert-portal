import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { trpc } from "@/lib/trpc";
import Dashboard from "./Dashboard";
import Einsaetze from "./Einsaetze";
import Zeiterfassung from "./Zeiterfassung";
import Leistungsnachweise from "./Leistungsnachweise";
import Fahrtenbuch from "./Fahrtenbuch";
import AdminPanel from "./AdminPanel";
import ManagementDashboard from "./ManagementDashboard";
import KundenDetail from "./KundenDetail";
import Kundenliste from "./Kundenliste";
import Kostentraeger from "./Kostentraeger";
import Textbausteine from "./Textbausteine";
import ExportCenter from "./ExportCenter";
import Fuehrerschein from "./Fuehrerschein";
import Sicherheitsunterweisungen from "./Sicherheitsunterweisungen";
import MeineArbeitssicherheit from "./MeineArbeitssicherheit";
import NeukundenAufnahme from "./NeukundenAufnahme";
import Kalender from "./Kalender";
import Kassenanfrage from "./Kassenanfrage";
import PflegekassenPage from "./PflegekassenPage";
import Urlaubsverwaltung from "./Urlaubsverwaltung";
import Krankmeldung from "./Krankmeldung";
import Benachrichtigungen from "./Benachrichtigungen";
import MeinProfil from "./MeinProfil";
import LeistungsFreigabe from "./LeistungsFreigabe";
import BuchhaltungsExport from "./BuchhaltungsExport";
import Mitarbeiterakte from "./Mitarbeiterakte";
import Logbuch from "./Logbuch";
import Vertretungen from "./Vertretungen";
import AdminDashboard from "./AdminDashboard";
import Rollenverwaltung from "./Rollenverwaltung";
import Kundenzuteilung from "./Kundenzuteilung";
import Besuchsberichte from "./Besuchsberichte";
import Datenschutz from "./Datenschutz";
import Integrationen from "./Integrationen";
import PflichtenheftCenter from "./PflichtenheftCenter";
import ZweiFaktor from "./ZweiFaktor";
import Verfuegbarkeiten from "./Verfuegbarkeiten";
import AnalyseDashboard from "./AnalyseDashboard";
import BackupStatus from "./BackupStatus";
import OnboardingTour, { useOnboardingTour } from "@/components/OnboardingTour";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useSSENotifications } from "@/hooks/useSSENotifications";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import DsgvoErstDialog from "@/components/DsgvoErstDialog";
import { DsgvoPflichtModal } from "@/components/DsgvoPflichtModal";
import Einsatzplanung from "./Einsatzplanung";
import ImportAssistent from "./ImportAssistent";
import BudgetVerwaltung from "./BudgetVerwaltung";
import ControllingDashboard from "./ControllingDashboard";
import ControllingPage from "./ControllingPage";
import FahrtenAbrechnung from "./FahrtenAbrechnung";
import Privatrechnung from "./Privatrechnung";
import { NavigationProvider, type SeitenId } from "@/contexts/NavigationContext";

/**
 * Seitenkennungen werden zentral im NavigationContext gepflegt, damit
 * Unterseiten (z. B. Schnellzugriffe im Ampel-Dashboard) dieselben Ziele
 * ansteuern können.
 */
type PageId = SeitenId;

interface NavItem {
  id: PageId;
  icon: string;
  label: string;
  badge?: number;
  adminOnly?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export default function PortalApp() {
  const { mitarbeiter, logout } = usePortalAuth();
  const [activePage, setActivePage] = useState<PageId>("home");
  const [startPageSet, setStartPageSet] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("menu-collapsed");
      return saved ? new Set(JSON.parse(saved)) : new Set<string>();
    } catch { return new Set<string>(); }
  });
  const toggleSection = (title: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title); else next.add(title);
      try { localStorage.setItem("menu-collapsed", JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
  };
  // ── Menü-Suche ───────────────────────────────────────
  const [menuSearch, setMenuSearch] = useState("");
  const [kundenDetailId, setKundenDetailId] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const { data: leistungen = [] } = trpc.leistungen.list.useQuery();
  const { data: warnungen = [] } = trpc.kunden.budgetWarnungen.useQuery();
  const { data: unreadNotifs = [] } = trpc.notifications.list.useQuery();
  const { data: neukundenPushOffen = [] } = (trpc as any).neukundenPush.meineOffenen.useQuery();
  // Offene Planungswarnungen (Minijob, Budget) als Badge in der Navigation (nur Admin/Teamleitung)
  const { data: planungsWarnungen = [] } = (trpc as any).planung.warnungen.list.useQuery({ nurOffene: true });
  // Heutige eigene Einsätze für MA-Badge in der Einsatzplanung-Navigation
  const { data: meineEinsaetze = [] } = trpc.einsaetze.list.useQuery();
  const offenCount = leistungen.filter((l) => l.status === "offen").length;
  // Das Feld heisst in der Datenbank "gelesen" (boolean) – zuvor wurde ein
  // nicht vorhandenes Feld geprueft, wodurch der Badge alle Meldungen zaehlte.
  const unreadCount = (unreadNotifs as any[]).filter((n: any) => !n.gelesen).length;
  const neukundenPushCount = (neukundenPushOffen as any[]).length;
  const isAdmin = mitarbeiter?.rolle === "admin";
  const isTeamleitung = mitarbeiter?.rolle === "teamleitung";
  // ── Modul-Berechtigungen: Gesperrte Module aus Navigation ausblenden ──
  const { data: meineBerechtigungen = [] } = (trpc as any).compliance.meineBerechtigungen.useQuery(
    undefined, { enabled: !!mitarbeiter && !isAdmin, staleTime: 60_000 }
  );
  const darfModulNutzen = (modul: string): boolean => {
    if (isAdmin) return true;
    const eintrag = (meineBerechtigungen as Array<{ modul: string; zugriff: string }>).find(b => b.modul === modul);
    if (!eintrag) return true; // kein Eintrag = Standard = erlaubt
    return eintrag.zugriff === "erlaubt";
  };
  // Badge-Logik: Admin/Teamleitung sehen Warnungsanzahl, normale MA sehen heutige Einsätze
  const today = new Date().toISOString().split("T")[0];
  const heutigeEinsaetze = (meineEinsaetze as any[]).filter((e: any) => {
    const datum = typeof e.datum === "string" ? e.datum : (e.datum as Date).toISOString().split("T")[0];
    return datum === today && e.status !== "abgeschlossen";
  });
  const planungsBadge = (isAdmin || isTeamleitung)
    ? (planungsWarnungen.length > 0 ? planungsWarnungen.length : undefined)
    : (heutigeEinsaetze.length > 0 ? heutigeEinsaetze.length : undefined);
  // Offene Pflicht-Sicherheitsunterweisungen für Badge
  const { data: sicherheitOffen } = (trpc as any).sicherheitsunterweisung.countOffen.useQuery();
  const sicherheitBadge = (sicherheitOffen as any)?.count > 0 ? (sicherheitOffen as any).count : undefined;
  // Personalisierte Startseite: einmalig nach Login setzen
  useEffect(() => {
    if (mitarbeiter && !startPageSet) {
      setStartPageSet(true);
      if (mitarbeiter.rolle === "admin" || mitarbeiter.rolle === "teamleitung") {
        setActivePage("controllingpage");
      } else {
        setActivePage("planung");
      }
    }
  }, [mitarbeiter, startPageSet]);
  const { isOnline, offlineCount } = useOfflineSync();
  const { show: showTour, startTour, closeTour } = useOnboardingTour();
  useSSENotifications(mitarbeiter?.id);
  // Aufgabe 17: Automatischer Sitzungs-Timeout nach 30 Minuten Inaktivität
  useSessionTimeout(logout, !!mitarbeiter);
  // DSGVO-Erstanmeldungs-Dialog
  const { data: dsgvoCheck } = (trpc.datenschutz as any).checkZustimmung.useQuery(
    undefined, { enabled: !!mitarbeiter }
  );
  const [dsgvoDialogGeschlossen, setDsgvoDialogGeschlossen] = useState(false);
  const showDsgvoDialog = !!mitarbeiter && !!dsgvoCheck && dsgvoCheck.required && !dsgvoCheck.zugestimmt && !dsgvoDialogGeschlossen;
  // Pflichtprüfung beim Login: alle aktiven Dokumente ohne Zustimmung
  const { data: offenePflichtDokumente } = (trpc.datenschutz as any).checkPflichtZustimmungen.useQuery(
    undefined, { enabled: !!mitarbeiter && !showDsgvoDialog }
  );
  const [pflichtModalGeschlossen, setPflichtModalGeschlossen] = useState(false);
  const showPflichtModal = !!mitarbeiter && !showDsgvoDialog && !pflichtModalGeschlossen
    && Array.isArray(offenePflichtDokumente) && (offenePflichtDokumente as any[]).length > 0;
  const initials = mitarbeiter
    ? `${mitarbeiter.vorname?.[0] ?? ""}${mitarbeiter.nachname?.[0] ?? ""}`.toUpperCase()
    : "MA";

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const navTo = (page: PageId) => {
    setKundenDetailId(null);
    setActivePage(page);
    if (isMobile) setSidebarOpen(false);
  };

  const sections: NavSection[] = [
    // ── 🏠 DASHBOARD ──────────────────────────────────────────────────────
    {
      title: "🏠 Dashboard",
      items: [
        { id: "home", icon: "🏠", label: "Dashboard" },
        ...(isAdmin ? [{ id: "admindashboard" as PageId, icon: "🚦", label: "Ampel-Dashboard", adminOnly: true }] : []),
      ],
    },
    // ── 📅 PLANUNG ────────────────────────────────────────────────────────
    {
      title: "📅 Planung",
      items: [
        { id: "planung", icon: "📅", label: "Einsatzplanung", badge: planungsBadge },
        { id: "einsaetze", icon: "📋", label: "Einsätze" },
        { id: "kalender", icon: "📆", label: "Kalender" },
        { id: "verfuegbarkeiten" as PageId, icon: "🕐", label: "Verfügbarkeiten" },
        ...(isAdmin || isTeamleitung ? [{ id: "kundenzuteilung" as PageId, icon: "📌", label: "Kundenzuteilung", adminOnly: true }] : []),
      ],
    },
    // ── 👥 KUNDEN ─────────────────────────────────────────────────────────
    {
      title: "👥 Kunden",
      items: [
        { id: "kunden", icon: "👥", label: "Kundenliste", badge: warnungen.length > 0 ? warnungen.length : undefined },
        ...(isAdmin ? [
          { id: "neukundenaufnahme" as PageId, icon: "➕", label: "Neukundenaufnahme", badge: neukundenPushCount > 0 ? neukundenPushCount : undefined },
          { id: "pflegekassen" as PageId, icon: "🏥", label: "Pflegekassen", adminOnly: true },
          { id: "budget" as PageId, icon: "💰", label: "Budgetverwaltung", adminOnly: true },
        ] : []),
        { id: "besuchsberichte" as PageId, icon: "📋", label: "Dokumentation" },
        { id: "lnw", icon: "📝", label: "Leistungsnachweise", badge: offenCount > 0 ? offenCount : undefined },
      ],
    },
    // ── 👨 MITARBEITER ────────────────────────────────────────────────────
    {
      title: "👨 Mitarbeiter",
      items: [
        ...(isAdmin ? [{ id: "mitarbeiterakte" as PageId, icon: "📂", label: "Mitarbeiterakte", adminOnly: true }] : []),
        { id: "zeit", icon: "⏱", label: "Zeiterfassung" },
        { id: "fahrt", icon: "🚗", label: "Mobilität" },
        { id: "urlaub", icon: "🌴", label: "Urlaub" },
        { id: "krank", icon: "🤒", label: "Krankmeldung" },
        { id: "profil", icon: "👤", label: "Mein Profil" },
        { id: "zweifaktor" as PageId, icon: "🔒", label: "2FA-Sicherheit" },
      ],
    },
    // ── 📈 CONTROLLING ────────────────────────────────────────────────────
    ...(isAdmin || isTeamleitung ? [{
      title: "📈 Controlling",
      items: [
        { id: "controllingpage" as PageId, icon: "📈", label: "Controlling", adminOnly: true },
      ],
    }] : []),
    // ── ✅ QUALITÄT & COMPLIANCE ──────────────────────────────────────────
    {
      title: "✅ Qualität",
      items: [
        { id: "fuehrerschein", icon: "🪪", label: "Führerschein-Check" },
        { id: "sicherheitsunterweisung", icon: "🛡️", label: "Unterweisungen", badge: sicherheitBadge },
        { id: "meinearbeitssicherheit" as PageId, icon: "⛑️", label: "Arbeitssicherheit" },
        ...(isAdmin || isTeamleitung ? [{ id: "leistungsfreigabe" as PageId, icon: "✅", label: "LNW-Freigabe" }] : []),
      ],
    },
    // ── 🔔 KOMMUNIKATION ──────────────────────────────────────────────────
    {
      title: "🔔 Kommunikation",
      items: [
        { id: "benachrichtigungen", icon: "🔔", label: "Benachrichtigungen", badge: unreadCount },
      ],
    },
    // ── ⚙️ EINSTELLUNGEN ──────────────────────────────────────────────────
    {
      title: "⚙️ Einstellungen",
      items: [
        ...(isAdmin ? [
          { id: "admin" as PageId, icon: "⚙️", label: "Admin-Panel", adminOnly: true },
          { id: "datenschutz" as PageId, icon: "🔐", label: "Datenschutz" },
          { id: "integrationen" as PageId, icon: "🔌", label: "Integrationen", adminOnly: true },
          { id: "export" as PageId, icon: "📮", label: "Export & Briefe", adminOnly: true },
          { id: "logbuch" as PageId, icon: "🗒️", label: "Logbuch", adminOnly: true },
        ] : [
          { id: "export" as PageId, icon: "📮", label: "Export & Briefe" },
          { id: "datenschutz" as PageId, icon: "🔐", label: "Datenschutz" },
        ]),
      ],
    },
  ]

  const renderPage = () => {
    if (kundenDetailId !== null) {
      return <KundenDetail kundenId={kundenDetailId} onBack={() => setKundenDetailId(null)} />;
    }
    switch (activePage) {
      case "home": return <Dashboard />;
      case "planung": return <Einsatzplanung />;
      case "einsaetze": return <Einsaetze />;
      case "zeit": return <Zeiterfassung />;
      case "lnw": return <Leistungsnachweise />;
      case "fahrt": return <Fahrtenbuch />;
      case "admin": return <AdminPanel />;
      case "management": return <ManagementDashboard />;
      case "kunden": return <Kundenliste onKundeSelect={(id) => setKundenDetailId(id)} />;
      case "kostentraeger": return <Kostentraeger />;
      case "textbausteine": return <Textbausteine />;
      case "export": return <ExportCenter />;
      case "fuehrerschein": return <Fuehrerschein />;
      case "sicherheitsunterweisung": return <Sicherheitsunterweisungen />;
      case "meinearbeitssicherheit": return <MeineArbeitssicherheit />;
      case "neukundenaufnahme": return <NeukundenAufnahme />;
      case "kalender": return <Kalender />;
      case "kassenanfrage": return <Kassenanfrage />;
      case "pflegekassen": return <PflegekassenPage />;
      case "urlaub": return <Urlaubsverwaltung />;
      case "krank": return <Krankmeldung />;
      case "benachrichtigungen": return <Benachrichtigungen />;
      case "profil": return <MeinProfil />;
      case "leistungsfreigabe": return <LeistungsFreigabe />;
      case "buchhaltung": return <BuchhaltungsExport />;
      case "mitarbeiterakte": return <Mitarbeiterakte />;
      case "logbuch": return <Logbuch />;
      case "vertretungen": return <Vertretungen />;
      case "admindashboard": return <AdminDashboard />;
      case "rollenverwaltung": return <Rollenverwaltung />;
      case "kundenzuteilung": return <Kundenzuteilung />;
      case "besuchsberichte": return <Besuchsberichte />;
      case "datenschutz": return <Datenschutz />;
      case "integrationen": return <Integrationen />;
      case "arbeitszentrum": return <PflichtenheftCenter />;
      case "zweifaktor": return <ZweiFaktor />;
      case "verfuegbarkeiten": return <Verfuegbarkeiten />;
      case "analysen": return <AnalyseDashboard />;
      case "backupstatus": return <BackupStatus />;
      case "import": return <ImportAssistent />;
      case "budget": return <BudgetVerwaltung />;
      case "controlling": return <ControllingDashboard />;
      case "controllingpage": return <ControllingPage />;
      case "fahrtenabrechnung": return <FahrtenAbrechnung />;
      case "privatrechnung": return <Privatrechnung />;
      default: return <Dashboard />;
    }
  };

  const currentPageLabel = sections.flatMap(s => s.items).find(i => i.id === activePage)?.label ?? "Dashboard";

  const SidebarContent = () => (
    <aside style={{
      width: 240, minWidth: 240, height: "100%",
      background: "#1a2e1a", display: "flex", flexDirection: "column",
      overflowY: "auto", overflowX: "hidden",
    }}>
      {/* Logo */}
      <div style={{ padding: "20px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: "#4a8c3f",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, fontWeight: 900, color: "#fff", flexShrink: 0,
          }}>L</div>
          <div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 13, lineHeight: 1.2 }}>Lebenswert</div>
            <div style={{ color: "#6ee7b7", fontSize: 10, fontWeight: 600 }}>Betreuung Portal</div>
          </div>
        </div>
      </div>

      {/* Suchfeld */}
      <div style={{ padding: "8px 12px 4px", flexShrink: 0 }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, opacity: 0.4 }}>🔍</span>
          <input
            type="text"
            placeholder="Suchen…"
            value={menuSearch}
            onChange={e => setMenuSearch(e.target.value)}
            style={{
              width: "100%", padding: "7px 10px 7px 28px",
              background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, color: "#fff", fontSize: 12, outline: "none",
              boxSizing: "border-box" as const,
            }}
          />
          {menuSearch && (
            <button onClick={() => setMenuSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 14, padding: 0 }}>×</button>
          )}
        </div>
      </div>
      {/* Nav */}
      <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
        {menuSearch.trim() ? (
          // Suche aktiv: alle passenden Items flach anzeigen
          <div>
            {sections.flatMap(s => s.items.filter(item => darfModulNutzen(item.id) && item.label.toLowerCase().includes(menuSearch.toLowerCase()))).map(item => {
              const isActive = activePage === item.id && kundenDetailId === null;
              return (
                <button key={item.id} onClick={() => { navTo(item.id); setMenuSearch(""); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 16px",
                    background: isActive ? "rgba(74,140,63,0.25)" : "transparent", border: "none",
                    borderLeft: isActive ? "3px solid #4a8c3f" : "3px solid transparent",
                    cursor: "pointer", textAlign: "left", transition: "background 0.12s" }}>
                  <span style={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ fontSize: 12.5, fontWeight: isActive ? 700 : 500, flex: 1, color: isActive ? "#6ee7b7" : "rgba(255,255,255,0.72)" }}>{item.label}</span>
                </button>
              );
            })}
            {sections.flatMap(s => s.items.filter(item => darfModulNutzen(item.id) && item.label.toLowerCase().includes(menuSearch.toLowerCase()))).length === 0 && (
              <div style={{ padding: "16px", fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>Keine Ergebnisse</div>
            )}
          </div>
        ) : (
        <>{sections.map((section) => (
          <div key={section.title} style={{ marginBottom: 4 }}>
            <button
              onClick={() => toggleSection(section.title)}
              style={{
                width: "100%", background: "none", border: "none", cursor: "pointer",
                fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.55)",
                padding: "12px 12px 4px",
                display: "flex", alignItems: "center", gap: 6,
                borderTop: "1px solid rgba(255,255,255,0.06)",
                marginTop: 2, textAlign: "left",
              }}
            >
              <span style={{ fontSize: 13 }}>{section.title.split(" ")[0]}</span>
              <span style={{ letterSpacing: 0.5, textTransform: "uppercase", fontSize: 9, fontWeight: 800, flex: 1 }}>
                {section.title.split(" ").slice(1).join(" ")}
              </span>
              <span style={{ fontSize: 9, opacity: 0.6, marginRight: 4 }}>
                {collapsedSections.has(section.title) ? "▶" : "▼"}
              </span>
            </button>
            {!collapsedSections.has(section.title) && section.items.filter(item => darfModulNutzen(item.id)).map((item) => {
              const isActive = activePage === item.id && kundenDetailId === null;
              return (
                <button
                  key={item.id}
                  onClick={() => navTo(item.id)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 16px",
                    background: isActive ? "rgba(74,140,63,0.25)" : "transparent",
                    border: "none",
                    borderLeft: isActive ? "3px solid #4a8c3f" : "3px solid transparent",
                    cursor: "pointer", textAlign: "left",
                    transition: "background 0.12s",
                  }}
                >
                  <span style={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
                  <span style={{
                    fontSize: 12.5, fontWeight: isActive ? 700 : 500, flex: 1,
                    color: isActive ? "#6ee7b7" : "rgba(255,255,255,0.72)",
                  }}>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span style={{
                      background:
                        item.id === "kunden" ? "#f59e0b"
                        : item.id === "planung" && !(isAdmin || isTeamleitung) ? "#6366f1"
                        : "#dc2626",
                      color: "#fff", fontSize: 9, fontWeight: 800,
                      minWidth: 16, height: 16, borderRadius: 8,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      padding: "0 4px", flexShrink: 0,
                    }}>{item.badge > 99 ? "99+" : item.badge}</span>
                  )}
                  {item.adminOnly && (
                    <span style={{
                      fontSize: 8, fontWeight: 700, color: "#4a8c3f",
                      background: "rgba(74,140,63,0.2)", padding: "1px 4px",
                      borderRadius: 4, flexShrink: 0,
                    }}>ADM</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}</>)}
      </nav>

      {/* User-Footer */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "12px 16px", flexShrink: 0 }}>
        {!isOnline && (
          <div style={{
            background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.4)",
            borderRadius: 8, padding: "5px 10px", marginBottom: 8,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span style={{ fontSize: 12 }}>📡</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#fbbf24" }}>
              OFFLINE{offlineCount > 0 ? ` (${offlineCount})` : ""}
            </span>
          </div>
        )}
        {warnungen.length > 0 && (
          <button onClick={() => navTo("kunden")} style={{
            width: "100%", background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.4)",
            borderRadius: 8, padding: "5px 10px", marginBottom: 8,
            display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
          }}>
            <span style={{ fontSize: 12 }}>⚠️</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#f87171" }}>
              {warnungen.length} Budget-Warnung{warnungen.length > 1 ? "en" : ""}
            </span>
          </button>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%", background: "#4a8c3f",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 12, color: "#fff", flexShrink: 0,
          }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {mitarbeiter ? `${mitarbeiter.vorname} ${mitarbeiter.nachname}` : "Mitarbeiter"}
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
              {isAdmin ? "Administrator" : "Mitarbeiter"}
            </div>
          </div>
          <button onClick={logout} title="Abmelden" style={{
            background: "none", border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 6, padding: "4px 7px", cursor: "pointer",
            color: "rgba(255,255,255,0.5)", fontSize: 14,
          }}>↩</button>
        </div>
        <button onClick={startTour} style={{
          width: "100%", marginTop: 8,
          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8, padding: "6px 10px", cursor: "pointer",
          color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <span>❓</span> Hilfe & Tour
        </button>
      </div>
    </aside>
  );

  // Navigation für alle Unterseiten bereitstellen – dadurch funktionieren
  // Schnellzugriffe und Verlinkungen aus Dashboards heraus.
  const navigationWert = {
    navigiere: navTo,
    oeffneKunde: (id: number) => setKundenDetailId(id),
    aktuelleSeite: activePage,
  };

  return (
    <NavigationProvider wert={navigationWert}>
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#f4f6f3", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>

      {/* Desktop Sidebar */}
      {!isMobile && (
        <div style={{ height: "100vh", flexShrink: 0 }}>
          <SidebarContent />
        </div>
      )}

      {/* Mobile Sidebar (Drawer) */}
      {isMobile && (
        <>
          {sidebarOpen && (
            <div
              onClick={() => setSidebarOpen(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 199, backdropFilter: "blur(2px)" }}
            />
          )}
          <div style={{
            position: "fixed", top: 0, left: sidebarOpen ? 0 : -260, bottom: 0,
            width: 240, zIndex: 200,
            transition: "left 0.25s cubic-bezier(0.23,1,0.32,1)",
            boxShadow: sidebarOpen ? "4px 0 24px rgba(0,0,0,0.35)" : "none",
          }}>
            <SidebarContent />
          </div>
        </>
      )}

      {/* Hauptbereich */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* TopBar */}
        <div style={{
          height: 52, background: "#fff", borderBottom: "1px solid #e5e7eb",
          display: "flex", alignItems: "center", padding: "0 16px",
          gap: 10, flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}>
          {isMobile && (
            <button onClick={() => setSidebarOpen(true)} style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#1a2e1a", fontSize: 22, padding: 4, lineHeight: 1,
            }}>☰</button>
          )}
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
            {!isMobile && <span style={{ fontSize: 12, color: "#9ca3af" }}>Lebenswert Betreuung /</span>}
            <span style={{ fontSize: 14, fontWeight: 700, color: "#1f2937" }}>{currentPageLabel}</span>
          </div>
          {!isOnline && (
            <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: "#92400e" }}>
              📡 OFFLINE
            </div>
          )}
          {isAdmin && !isMobile && (
            <div style={{ background: "#f0fdf4", border: "1px solid #4a8c3f", borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: "#14532d" }}>
              🔑 Administrator
            </div>
          )}
          {isMobile && (
            <button onClick={() => navTo("benachrichtigungen")} style={{ position: "relative", background: "none", border: "none", cursor: "pointer", fontSize: 20, padding: 4 }}>
              🔔
              {unreadCount > 0 && (
                <span style={{ position: "absolute", top: 0, right: 0, background: "#dc2626", color: "#fff", fontSize: 8, fontWeight: 800, width: 14, height: 14, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Seiteninhalt */}
        <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
          {renderPage()}
        </main>
      </div>

      <OnboardingTour forceShow={showTour} onClose={closeTour} />
      {showDsgvoDialog && <DsgvoErstDialog onClose={() => setDsgvoDialogGeschlossen(true)} />}
      {showPflichtModal && (
        <DsgvoPflichtModal
          offeneDokumente={(offenePflichtDokumente as any[]) ?? []}
          onAlleBestaetigt={() => setPflichtModalGeschlossen(true)}
        />
      )}
      <Toaster
        position="top-right"
        richColors
        toastOptions={{
          style: { fontSize: "14px", fontWeight: 600 },
          duration: 3000,
        }}
      />
    </div>
    </NavigationProvider>
  );
}
