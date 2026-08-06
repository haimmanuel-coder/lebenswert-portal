import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const KAT_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  dokumente:   { label: "Dokumente",   icon: "📄", color: "#3b82f6" },
  sicherheit:  { label: "Sicherheit",  icon: "🦺", color: "#f59e0b" },
  einweisung:  { label: "Einweisung",  icon: "📋", color: "#8b5cf6" },
  system:      { label: "System",      icon: "💻", color: "#4a8c3f" },
  sonstiges:   { label: "Sonstiges",   icon: "📌", color: "#6b7280" },
};

interface Props {
  maList: Array<{ id: number; vorname: string; nachname: string; aktiv: number | boolean }>;
}

export default function OnboardingTab({ maList }: Props) {
  const [selectedMaId, setSelectedMaId] = useState<number | null>(null);

  const { data: checkliste = [], refetch } = (trpc as any).onboarding.list.useQuery(
    { mitarbeiterId: selectedMaId! },
    { enabled: !!selectedMaId }
  );

  const { data: fortschritt } = (trpc as any).onboarding.fortschritt.useQuery(
    { mitarbeiterId: selectedMaId! },
    { enabled: !!selectedMaId }
  );

  const erstellen = (trpc as any).onboarding.erstellen.useMutation({
    onSuccess: (d: { created: number }) => {
      if (d.created > 0) toast.success(`✅ ${d.created} Aufgaben angelegt`);
      else toast.info("Checkliste bereits vorhanden");
      refetch();
    },
    onError: (e: any) => toast.error("❌ " + e.message),
  });

  const abhaken = (trpc as any).onboarding.abhaken.useMutation({
    onSuccess: () => refetch(),
    onError: (e: any) => toast.error("❌ " + e.message),
  });

  const aktiveMa = maList.filter(m => m.aktiv);
  const gesamt = fortschritt?.gesamt ?? 0;
  const erledigt = fortschritt?.erledigt ?? 0;
  const prozent = gesamt > 0 ? Math.round((erledigt / gesamt) * 100) : 0;

  // Gruppieren nach Kategorie
  const gruppen = Object.keys(KAT_CONFIG).map(kat => ({
    kat,
    aufgaben: checkliste.filter((a: any) => a.kategorie === kat),
  })).filter(g => g.aufgaben.length > 0);

  return (
    <div style={{ padding: "0 4px" }}>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>🎯 Onboarding-Checklisten</h3>
        <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
          Beim Anlegen eines neuen Mitarbeiters wird automatisch eine Checkliste mit 12 Aufgaben erstellt.
        </p>
      </div>

      {/* Mitarbeiter-Auswahl */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <select
          value={selectedMaId ?? ""}
          onChange={e => setSelectedMaId(e.target.value ? Number(e.target.value) : null)}
          style={{ flex: 1, minWidth: 200, padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
        >
          <option value="">-- Mitarbeiter auswählen --</option>
          {aktiveMa.map(ma => (
            <option key={ma.id} value={ma.id}>{ma.vorname} {ma.nachname}</option>
          ))}
        </select>
        {selectedMaId && (
          <button
            onClick={() => erstellen.mutate({ mitarbeiterId: selectedMaId })}
            disabled={erstellen.isPending}
            style={{ padding: "8px 14px", background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            {erstellen.isPending ? "…" : "🔄 Checkliste erstellen"}
          </button>
        )}
      </div>

      {/* Fortschrittsbalken */}
      {selectedMaId && gesamt > 0 && (
        <div style={{ marginBottom: 20, padding: "14px 16px", background: "#f9fafb", borderRadius: 12, border: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Onboarding-Fortschritt</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: prozent === 100 ? "#4a8c3f" : "#1f2937" }}>
              {erledigt}/{gesamt} ({prozent}%)
            </span>
          </div>
          <div style={{ height: 10, background: "#e5e7eb", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${prozent}%`, background: prozent === 100 ? "#4a8c3f" : "#3b82f6", borderRadius: 10, transition: "width 0.4s" }} />
          </div>
          {prozent === 100 && (
            <div style={{ marginTop: 8, fontSize: 12, color: "#4a8c3f", fontWeight: 700 }}>🎉 Onboarding abgeschlossen!</div>
          )}
        </div>
      )}

      {/* Checkliste */}
      {selectedMaId && checkliste.length === 0 && (
        <div style={{ textAlign: "center", padding: 32, color: "#9ca3af", fontSize: 13 }}>
          Noch keine Checkliste vorhanden.<br />
          Klicke auf "🔄 Checkliste erstellen" um 12 Standard-Aufgaben anzulegen.
        </div>
      )}

      {gruppen.map(({ kat, aufgaben }) => {
        const cfg = KAT_CONFIG[kat] ?? KAT_CONFIG.sonstiges;
        const erledigtInGruppe = aufgaben.filter((a: any) => a.erledigt).length;
        return (
          <div key={kat} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 16 }}>{cfg.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
              <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: "auto" }}>{erledigtInGruppe}/{aufgaben.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {aufgaben.map((a: any) => (
                <div
                  key={a.id}
                  onClick={() => abhaken.mutate({ id: a.id, erledigt: !a.erledigt })}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                    background: a.erledigt ? "#f0fdf4" : "#fff",
                    border: `1px solid ${a.erledigt ? "#bbf7d0" : "#e5e7eb"}`,
                    borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                    background: a.erledigt ? "#4a8c3f" : "#fff",
                    border: `2px solid ${a.erledigt ? "#4a8c3f" : "#d1d5db"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, color: "#fff", transition: "all 0.15s",
                  }}>
                    {a.erledigt ? "✓" : ""}
                  </div>
                  <span style={{ fontSize: 13, flex: 1, textDecoration: a.erledigt ? "line-through" : "none", color: a.erledigt ? "#6b7280" : "#1f2937" }}>
                    {a.aufgabe}
                  </span>
                  {a.erledigt && a.erledigtAm && (
                    <span style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0 }}>
                      {new Date(a.erledigtAm).toLocaleDateString("de-DE")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
