import { useState } from "react";
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
import NeukundenAufnahme from "./NeukundenAufnahme";
import Kalender from "./Kalender";
import BottomSheet from "@/components/BottomSheet";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import OnboardingTour, { useOnboardingTour } from "@/components/OnboardingTour";

type PageId = "home" | "einsaetze" | "zeit" | "lnw" | "fahrt" | "admin" | "management" | "kunden" | "kostentraeger" | "textbausteine" | "export" | "fuehrerschein" | "neukundenaufnahme" | "kalender";

const pages: { id: PageId; icon: string; label: string }[] = [
  { id: "home", icon: "🏠", label: "Home" },
  { id: "einsaetze", icon: "📅", label: "Einsätze" },
  { id: "zeit", icon: "⏱", label: "Zeit" },
  { id: "lnw", icon: "📋", label: "Nachweise" },
  { id: "fahrt", icon: "🚗", label: "Fahrten" },
];

export default function PortalApp() {
  const { mitarbeiter, logout } = usePortalAuth();
  const [activePage, setActivePage] = useState<PageId>("home");
  const [fabOpen, setFabOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [kundenDetailId, setKundenDetailId] = useState<number | null>(null);
  const { data: leistungen = [] } = trpc.leistungen.list.useQuery();
  const { data: warnungen = [] } = trpc.kunden.budgetWarnungen.useQuery();
  const offenCount = leistungen.filter((l) => l.status === "offen").length;

  const isAdmin = mitarbeiter?.rolle === "admin";
  const { isOnline, offlineCount } = useOfflineSync();
  const { show: showTour, startTour, closeTour } = useOnboardingTour();

  const initials = mitarbeiter
    ? (mitarbeiter.vorname[0] + mitarbeiter.nachname[0]).toUpperCase()
    : "MA";

  const renderPage = () => {
    if (kundenDetailId !== null) {
      return <KundenDetail kundenId={kundenDetailId} onBack={() => setKundenDetailId(null)} />;
    }
    switch (activePage) {
      case "home": return <Dashboard />;
      case "einsaetze": return <Einsaetze />;
      case "zeit": return <Zeiterfassung />;
      case "lnw": return <Leistungsnachweise />;
      case "fahrt": return <Fahrtenbuch />;
      case "admin": return <AdminPanel />;
      case "management": return <ManagementDashboard />;
      case "kunden": return <Kundenliste />;
      case "kostentraeger": return <Kostentraeger />;
      case "textbausteine": return <Textbausteine />;
      case "export": return <ExportCenter />;
      case "fuehrerschein": return <Fuehrerschein />;
      case "neukundenaufnahme": return <NeukundenAufnahme />;
      case "kalender": return <Kalender />;
      default: return <Dashboard />;
    }
  };

  const navTo = (page: PageId) => {
    setKundenDetailId(null);
    setActivePage(page);
  };

  return (
    <div className="lb-app" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* TOP BAR */}
      <div
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          background: "#fff", borderBottom: "1px solid #e5e7eb",
          padding: "0 16px", height: 56,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          boxShadow: "0 1px 4px rgba(0,0,0,.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34, height: 34, borderRadius: "50%", background: "#4a8c3f",
              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 13, flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              {mitarbeiter ? `${mitarbeiter.vorname} ${mitarbeiter.nachname}` : "Mitarbeiter"}
            </div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>
              Lebenswert Betreuung
              {isAdmin && <span style={{ marginLeft: 6, padding: "1px 5px", borderRadius: 8, background: "#4a8c3f", color: "#fff", fontSize: 9, fontWeight: 700 }}>ADMIN</span>}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {/* Offline-Indikator */}
          {!isOnline && (
            <div
              title={offlineCount > 0 ? `${offlineCount} Einsatz/Einsätze offline gespeichert` : "Offline-Modus aktiv"}
              style={{ background: "#fef3c7", border: "1.5px solid #f59e0b", borderRadius: 8, padding: "3px 8px", display: "flex", alignItems: "center", gap: 4 }}
            >
              <span style={{ fontSize: 13 }}>📡</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#92400e" }}>OFFLINE{offlineCount > 0 ? ` (${offlineCount})` : ""}</span>
            </div>
          )}
          {/* Budget-Warnung Indikator */}
          {warnungen.length > 0 && (
            <button
              onClick={() => { navTo("kunden"); setMenuOpen(false); }}
              title={`${warnungen.length} Budget-Warnung(en)`}
              style={{ background: "#fee2e2", border: "none", borderRadius: 8, padding: "4px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 14 }}>⚠️</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#dc2626" }}>{warnungen.length}</span>
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setMenuOpen(true)}
              title="Admin-Menü"
              style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", padding: 6, borderRadius: 8, color: "#4a8c3f" }}
            >
              ⚙️
            </button>
          )}
          {/* Hilfe / Tour-Button */}
          <button
            onClick={startTour}
            title="Hilfe & Onboarding-Tour starten"
            style={{ background: "none", border: "1.5px solid #e5e7eb", fontSize: 14, cursor: "pointer", padding: "4px 8px", borderRadius: 8, color: "#6b7280", fontWeight: 700 }}
          >
            ?
          </button>
          <button
            onClick={logout}
            title="Abmelden"
            style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", padding: 6, borderRadius: 8, color: "#6b7280" }}
          >
            🚪
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ padding: "72px 16px 80px" }}>
        {renderPage()}
      </div>

      {/* FAB */}
      {kundenDetailId === null && activePage !== "admin" && activePage !== "management" && (
        <button
          onClick={() => setFabOpen(true)}
          style={{
            position: "fixed", right: 20, bottom: "calc(64px + 20px)",
            width: 56, height: 56, borderRadius: "50%",
            background: "#4a8c3f", color: "#fff",
            border: "none", fontSize: 28, cursor: "pointer",
            boxShadow: "0 4px 16px rgba(74,140,63,.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 50, transition: "transform 0.2s",
          }}
          onMouseDown={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = "scale(0.92)")}
          onMouseUp={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1)")}
        >
          ＋
        </button>
      )}

      {/* BOTTOM NAV */}
      <nav
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
          background: "#fff", borderTop: "1px solid #e5e7eb",
          display: "grid", gridTemplateColumns: "repeat(5, 1fr)",
          height: 64, paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {pages.map((p) => {
          const isActive = activePage === p.id && kundenDetailId === null;
          const hasBadge = p.id === "lnw" && offenCount > 0;
          return (
            <button
              key={p.id}
              onClick={() => navTo(p.id)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", gap: 3, cursor: "pointer",
                border: "none", background: "none", padding: "8px 4px",
                position: "relative", transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>{p.icon}</span>
              <span
                style={{
                  fontSize: 10, fontWeight: isActive ? 700 : 500,
                  color: isActive ? "#4a8c3f" : "#6b7280",
                }}
              >
                {p.label}
              </span>
              {isActive && (
                <span style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 20, height: 3, borderRadius: 2, background: "#4a8c3f" }} />
              )}
              {hasBadge && (
                <span
                  style={{
                    position: "absolute", top: 6, right: "calc(50% - 18px)",
                    background: "#dc2626", color: "#fff",
                    fontSize: 9, fontWeight: 700,
                    minWidth: 16, height: 16, borderRadius: 8,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 4px",
                  }}
                >
                  {offenCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* FAB Sheet */}
      <BottomSheet open={fabOpen} onClose={() => setFabOpen(false)} title="Was möchtest du erfassen?">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={() => { setFabOpen(false); navTo("fahrt"); }}
            style={{ padding: 13, background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
          >
            🚗 Fahrt erfassen
          </button>
          <button
            onClick={() => { setFabOpen(false); navTo("lnw"); }}
            style={{ padding: 13, background: "#2a9d8f", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
          >
            📋 Leistungsnachweis einreichen
          </button>
          <button
            onClick={() => { setFabOpen(false); navTo("zeit"); }}
            style={{ padding: 13, background: "#e9c46a", color: "#7c5a00", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
          >
            ⏱ Zeit manuell erfassen
          </button>
          <button
            onClick={() => { setFabOpen(false); navTo("export"); }}
            style={{ padding: 13, background: "#6366f1", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
          >
            📮 Brief / E-Mail an Kasse senden
          </button>
          <button
            onClick={() => setFabOpen(false)}
            style={{ padding: 13, background: "#f4f6f3", color: "#6b7280", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
          >
            Abbrechen
          </button>
        </div>
      </BottomSheet>

      {/* Admin-Menü Sheet – erweitert mit allen 6 Modulen */}
      {isAdmin && (
        <BottomSheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Admin-Bereich">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

            {/* Bestehende Module */}
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, paddingLeft: 4 }}>Bestehend</div>
            <button
              onClick={() => { setMenuOpen(false); navTo("management"); }}
              style={{ padding: 13, background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
            >
              <span>📊</span>
              <div style={{ textAlign: "left" }}>
                <div>Management-Dashboard</div>
                <div style={{ fontSize: 11, opacity: 0.85 }}>KPIs, Diagramme, Audit-Log</div>
              </div>
            </button>
            <button
              onClick={() => { setMenuOpen(false); navTo("kunden"); }}
              style={{ padding: 13, background: "#e8f5e4", color: "#4a8c3f", border: "2px solid #4a8c3f", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
            >
              <span>👥</span>
              <div style={{ textAlign: "left" }}>
                <div>Kundenliste</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>Alle Kunden mit Budget-Übersicht</div>
              </div>
            </button>
            <button
              onClick={() => { setMenuOpen(false); navTo("admin"); }}
              style={{ padding: 13, background: "#2a9d8f", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
            >
              <span>⚙️</span>
              <div style={{ textAlign: "left" }}>
                <div>Admin-Panel</div>
                <div style={{ fontSize: 11, opacity: 0.85 }}>Mitarbeiter, Kunden, Zuordnung</div>
              </div>
            </button>

            {/* Neue Module */}
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, paddingLeft: 4, marginTop: 4 }}>Neue Module</div>

            <button
              onClick={() => { setMenuOpen(false); navTo("kostentraeger"); }}
              style={{ padding: 13, background: "#fff", color: "#374151", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
            >
              <span>🏥</span>
              <div style={{ textAlign: "left" }}>
                <div>Kostenträger</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>Krankenkassen mit IK-Nummern</div>
              </div>
            </button>

            <button
              onClick={() => { setMenuOpen(false); navTo("kunden"); }}
              style={{ padding: 13, background: "#fff", color: "#374151", border: `2px solid ${warnungen.length > 0 ? "#fca5a5" : "#e5e7eb"}`, borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
            >
              <span>📊</span>
              <div style={{ textAlign: "left", flex: 1 }}>
                <div>Budget-Dashboard</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>Pflegegrade & Budgets aller Kunden</div>
              </div>
              {warnungen.length > 0 && (
                <span style={{ background: "#dc2626", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 20 }}>
                  ⚠️ {warnungen.length}
                </span>
              )}
            </button>

            <button
              onClick={() => { setMenuOpen(false); navTo("textbausteine"); }}
              style={{ padding: 13, background: "#fff", color: "#374151", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
            >
              <span>📝</span>
              <div style={{ textAlign: "left" }}>
                <div>Textbausteine</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>Vorlagen für Einsatz-Dokumentation</div>
              </div>
            </button>

            <button
              onClick={() => { setMenuOpen(false); navTo("export"); }}
              style={{ padding: 13, background: "#fff", color: "#374151", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
            >
              <span>📮</span>
              <div style={{ textAlign: "left" }}>
                <div>E-Brief / Korrespondenz</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>Briefe & E-Mails an Kassen senden</div>
              </div>
            </button>

            <button
              onClick={() => { setMenuOpen(false); navTo("export"); }}
              style={{ padding: 13, background: "#1f2937", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
            >
              <span>📦</span>
              <div style={{ textAlign: "left" }}>
                <div>Massen-Export</div>
                <div style={{ fontSize: 11, opacity: 0.85 }}>Alle Daten als CSV herunterladen</div>
              </div>
            </button>

            <button
              onClick={() => { setMenuOpen(false); navTo("kostentraeger"); }}
              style={{ padding: 13, background: "#eff6ff", color: "#1d4ed8", border: "2px solid #93c5fd", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
            >
              <span>🏥</span>
              <div style={{ textAlign: "left" }}>
                <div>Kostenträger</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>Pflegekassen mit IK-Nummern</div>
              </div>
            </button>
            <button
              onClick={() => { setMenuOpen(false); navTo("textbausteine"); }}
              style={{ padding: 13, background: "#f0fdf4", color: "#15803d", border: "2px solid #86efac", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
            >
              <span>📝</span>
              <div style={{ textAlign: "left" }}>
                <div>Textbausteine</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>Dokumentations-Vorlagen</div>
              </div>
            </button>
            <button
              onClick={() => { setMenuOpen(false); navTo("export"); }}
              style={{ padding: 13, background: "#fef3c7", color: "#92400e", border: "2px solid #fcd34d", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
            >
              <span>📦</span>
              <div style={{ textAlign: "left" }}>
                <div>Export-Center</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>CSV-Export, Pflegegrad-Rechner, E-Brief</div>
              </div>
            </button>
            {/* Neue Module Phase 12 */}
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, paddingLeft: 4, marginTop: 4 }}>Compliance & Aufnahme</div>

            <button
              onClick={() => { setMenuOpen(false); navTo("kalender"); }}
              style={{ padding: 13, background: "#f0f9ff", color: "#0369a1", border: "2px solid #7dd3fc", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
            >
              <span>📅</span>
              <div style={{ textAlign: "left" }}>
                <div>Einsatz-Kalender</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>Monatsübersicht mit Farbcodierung</div>
              </div>
            </button>

            <button
              onClick={() => { setMenuOpen(false); navTo("fuehrerschein"); }}
              style={{ padding: 13, background: "#fff7ed", color: "#c2410c", border: "2px solid #fdba74", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
            >
              <span>🪪</span>
              <div style={{ textAlign: "left" }}>
                <div>Führerschein-Kontrolle</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>Halbjährliche Prüfung & Archiv</div>
              </div>
            </button>

            <button
              onClick={() => { setMenuOpen(false); navTo("neukundenaufnahme"); }}
              style={{ padding: 13, background: "#fdf4ff", color: "#7e22ce", border: "2px solid #d8b4fe", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
            >
              <span>👤</span>
              <div style={{ textAlign: "left" }}>
                <div>Neukundenaufnahme</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>Stammdaten, Vollmacht & PDF</div>
              </div>
            </button>

            <button
              onClick={() => setMenuOpen(false)}
              style={{ padding: 13, background: "#f4f6f3", color: "#6b7280", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
            >
              Schließen
            </button>
          </div>
        </BottomSheet>
      )}

      {/* Onboarding-Tour */}
      <OnboardingTour forceShow={showTour} onClose={closeTour} />
    </div>
  );
}
