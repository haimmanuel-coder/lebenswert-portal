import { useState } from "react";
import Kassenanfrage from "./Kassenanfrage";
import Kostentraeger from "./Kostentraeger";

type TabId = "kassenanfragen" | "kostentraeger";

const TABS: { id: TabId; icon: string; label: string; desc: string }[] = [
  { id: "kassenanfragen", icon: "🏥", label: "Kassenanfragen",  desc: "Anfragen & Status"      },
  { id: "kostentraeger",  icon: "🏦", label: "Kostenträger",    desc: "Kassen & Verträge"      },
];

export default function PflegekassenPage() {
  const [activeTab, setActiveTab] = useState<TabId>("kassenanfragen");

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1a2e1a", margin: 0 }}>
          🏥 Pflegekassen
        </h1>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
          Kassenanfragen und Kostenträger-Verwaltung
        </p>
      </div>

      {/* Tab-Navigation */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#f3f4f6", borderRadius: 14, padding: 4 }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, padding: "10px 16px",
                background: isActive ? "#fff" : "transparent",
                border: "none", borderRadius: 10,
                boxShadow: isActive ? "0 1px 6px rgba(0,0,0,0.12)" : "none",
                cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: 20 }}>{tab.icon}</span>
              <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? "#1a2e1a" : "#6b7280" }}>
                {tab.label}
              </span>
              <span style={{ fontSize: 10, color: "#9ca3af" }}>{tab.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Tab-Inhalt */}
      {activeTab === "kassenanfragen" && <Kassenanfrage />}
      {activeTab === "kostentraeger"  && <Kostentraeger />}
    </div>
  );
}
