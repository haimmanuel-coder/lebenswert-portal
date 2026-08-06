import { useState } from "react";
import Fahrtenbuch from "./Fahrtenbuch";
import FahrtenAbrechnung from "./FahrtenAbrechnung";
import { usePortalAuth } from "@/contexts/PortalAuthContext";

export default function MobilitaetPage() {
  const [activeTab, setActiveTab] = useState<"fahrtenbuch" | "abrechnung">("fahrtenbuch");
  const { mitarbeiter } = usePortalAuth();
  const isAdmin = mitarbeiter?.rolle === "admin" || mitarbeiter?.rolle === "teamleitung";

  const tabs = [
    { id: "fahrtenbuch" as const, label: "🚗 Fahrtenbuch", desc: "Fahrten erfassen & verwalten" },
    ...(isAdmin ? [{ id: "abrechnung" as const, label: "💶 Fahrtabrechnung", desc: "Monatliche Abrechnung" }] : []),
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1a2e1a", margin: 0 }}>🚗 Mobilität</h1>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>Fahrtenbuch und Fahrtabrechnung</p>
      </div>

      {/* Tab-Navigation */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#f3f4f6", borderRadius: 12, padding: 4 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: "10px 16px",
              background: activeTab === tab.id ? "#fff" : "transparent",
              border: "none", borderRadius: 9,
              boxShadow: activeTab === tab.id ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              transition: "all 0.15s",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 500, color: activeTab === tab.id ? "#1a2e1a" : "#6b7280" }}>
              {tab.label}
            </span>
            <span style={{ fontSize: 10, color: "#9ca3af" }}>{tab.desc}</span>
          </button>
        ))}
      </div>

      {/* Tab-Inhalt */}
      {activeTab === "fahrtenbuch" && <Fahrtenbuch />}
      {activeTab === "abrechnung" && <FahrtenAbrechnung />}
    </div>
  );
}
