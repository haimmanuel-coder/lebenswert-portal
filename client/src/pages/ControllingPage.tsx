import { useState } from "react";
import ManagementDashboard from "./ManagementDashboard";
import AnalyseDashboard from "./AnalyseDashboard";
import ControllingDashboard from "./ControllingDashboard";
import BuchhaltungsExport from "./BuchhaltungsExport";

type TabId = "management" | "analysen" | "controlling" | "buchhaltung";

const TABS: { id: TabId; icon: string; label: string; desc: string }[] = [
  { id: "management",  icon: "📈", label: "Management",          desc: "KPIs & Übersicht"       },
  { id: "analysen",    icon: "📊", label: "Analysen",            desc: "Daten & Trends"          },
  { id: "controlling", icon: "📉", label: "Controlling",         desc: "Kosten & Kennzahlen"     },
  { id: "buchhaltung", icon: "💼", label: "Buchhaltungs-Export", desc: "DATEV / CSV-Export"      },
];

export default function ControllingPage() {
  const [activeTab, setActiveTab] = useState<TabId>("management");

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1a2e1a", margin: 0 }}>
          📈 Controlling
        </h1>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
          Management, Analysen, Controlling und Buchhaltungs-Export
        </p>
      </div>

      {/* Tab-Navigation */}
      <div
        style={{
          display: "flex", gap: 4, marginBottom: 24,
          background: "#f3f4f6", borderRadius: 14, padding: 4,
          overflowX: "auto",
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: "1 1 0", minWidth: 110, padding: "10px 14px",
                background: isActive ? "#fff" : "transparent",
                border: "none", borderRadius: 10,
                boxShadow: isActive ? "0 1px 6px rgba(0,0,0,0.12)" : "none",
                cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: 18 }}>{tab.icon}</span>
              <span
                style={{
                  fontSize: 12, fontWeight: isActive ? 700 : 500,
                  color: isActive ? "#1a2e1a" : "#6b7280",
                  whiteSpace: "nowrap",
                }}
              >
                {tab.label}
              </span>
              <span style={{ fontSize: 10, color: "#9ca3af", whiteSpace: "nowrap" }}>
                {tab.desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab-Inhalt */}
      {activeTab === "management"  && <ManagementDashboard />}
      {activeTab === "analysen"    && <AnalyseDashboard />}
      {activeTab === "controlling" && <ControllingDashboard />}
      {activeTab === "buchhaltung" && <BuchhaltungsExport />}
    </div>
  );
}
