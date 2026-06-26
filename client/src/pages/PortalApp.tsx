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
import BottomSheet from "@/components/BottomSheet";

type PageId = "home" | "einsaetze" | "zeit" | "lnw" | "fahrt" | "admin" | "management";

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
  const offenCount = leistungen.filter((l) => l.status === "offen").length;

  const isAdmin = mitarbeiter?.rolle === "admin";

  const initials = mitarbeiter
    ? (mitarbeiter.vorname[0] + mitarbeiter.nachname[0]).toUpperCase()
    : "MA";

  const renderPage = () => {
    // Kunden-Detail-Overlay
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
        <div style={{ display: "flex", gap: 4 }}>
          {isAdmin && (
            <button
              onClick={() => setMenuOpen(true)}
              title="Admin-Menü"
              style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", padding: 6, borderRadius: 8, color: "#4a8c3f" }}
            >
              ⚙️
            </button>
          )}
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
            onClick={() => setFabOpen(false)}
            style={{ padding: 13, background: "#f4f6f3", color: "#6b7280", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
          >
            Abbrechen
          </button>
        </div>
      </BottomSheet>

      {/* Admin-Menü Sheet */}
      {isAdmin && (
        <BottomSheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Admin-Bereich">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
              onClick={() => { setMenuOpen(false); navTo("admin"); }}
              style={{ padding: 13, background: "#2a9d8f", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
            >
              <span>⚙️</span>
              <div style={{ textAlign: "left" }}>
                <div>Admin-Panel</div>
                <div style={{ fontSize: 11, opacity: 0.85 }}>Mitarbeiter, Kunden, Zuordnung</div>
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
    </div>
  );
}
