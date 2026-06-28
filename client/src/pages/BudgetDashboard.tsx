import { useState } from "react";
import { trpc } from "@/lib/trpc";
import BottomSheet from "@/components/BottomSheet";
import { toast } from "sonner";

const PFLEGEGRAD_BUDGETS: Record<number, { b45b: number; b45a: number; b39: number }> = {
  1: { b45b: 125, b45a: 0, b39: 0 },
  2: { b45b: 724, b45a: 0, b39: 1612 },
  3: { b45b: 1432, b45a: 0, b39: 1612 },
  4: { b45b: 1778, b45a: 0, b39: 1612 },
  5: { b45b: 2200, b45a: 0, b39: 1612 },
};

function BudgetBalken({ label, budget, verbraucht, farbe }: { label: string; budget: number; verbraucht: number; farbe: string }) {
  const pct = budget > 0 ? Math.min((verbraucht / budget) * 100, 100) : 0;
  const rest = Math.max(budget - verbraucht, 0);
  const kritisch = budget > 0 && pct >= 90;
  const warnung = budget > 0 && pct >= 70 && pct < 90;

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{label}</span>
        <span style={{ fontSize: 12, color: kritisch ? "#dc2626" : warnung ? "#d97706" : "#6b7280" }}>
          {rest.toFixed(0)} € verfügbar
        </span>
      </div>
      <div style={{ height: 8, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: kritisch ? "#dc2626" : warnung ? "#f59e0b" : farbe,
          borderRadius: 4,
          transition: "width 0.4s ease",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
        <span style={{ fontSize: 10, color: "#9ca3af" }}>Verbraucht: {verbraucht.toFixed(2)} €</span>
        <span style={{ fontSize: 10, color: "#9ca3af" }}>Gesamt: {budget.toFixed(2)} €</span>
      </div>
    </div>
  );
}

export default function BudgetDashboard() {
  const { data: kunden = [], refetch } = trpc.kunden.list.useQuery();
  const { data: warnungen = [] } = trpc.kunden.budgetWarnungen.useQuery();
  const { data: kostentraegerListe = [] } = trpc.kostentraeger.list.useQuery();
  const updateBudget = trpc.kunden.updateBudget.useMutation({ onSuccess: () => { refetch(); setEditOpen(false); toast.success("Budget aktualisiert!"); } });
  const updateKunde = trpc.kunden.update.useMutation({ onSuccess: () => { refetch(); toast.success("Vollmacht gespeichert!"); } });

  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [budgetForm, setBudgetForm] = useState({ budget45b: "", verbraucht45b: "", budget45a: "", verbraucht45a: "", budget39: "", verbraucht39: "" });
  const [filter, setFilter] = useState<"alle" | "kritisch" | "warnung">("alle");
  const [suchtext, setSuchtext] = useState("");

  const warningIds = new Set(warnungen.map((w: any) => w.id));

  const openEdit = (k: any) => {
    setSelected(k);
    setBudgetForm({
      budget45b: String(k.budget45b ?? 0),
      verbraucht45b: String(k.verbraucht45b ?? 0),
      budget45a: String(k.budget45a ?? 0),
      verbraucht45a: String(k.verbraucht45a ?? 0),
      budget39: String(k.budget39 ?? 0),
      verbraucht39: String(k.verbraucht39 ?? 0),
    });
    setEditOpen(true);
  };

  const autoFill = () => {
    if (!selected?.pflegegrad) return;
    const defaults = PFLEGEGRAD_BUDGETS[selected.pflegegrad] ?? PFLEGEGRAD_BUDGETS[2];
    setBudgetForm(f => ({
      ...f,
      budget45b: String(defaults.b45b),
      budget45a: String(defaults.b45a),
      budget39: String(defaults.b39),
    }));
    toast.info(`Standardbudget für Pflegegrad ${selected.pflegegrad} eingetragen`);
  };

  const gefilterteKunden = kunden.filter(k => {
    const matchText = `${k.vorname} ${k.nachname}`.toLowerCase().includes(suchtext.toLowerCase());
    if (!matchText) return false;
    if (filter === "kritisch") return warningIds.has(k.id);
    if (filter === "warnung") {
      const b45b = parseFloat(String(k.budget45b ?? 0));
      const v45b = parseFloat(String(k.verbraucht45b ?? 0));
      const pct = b45b > 0 ? v45b / b45b : 0;
      return pct >= 0.7;
    }
    return true;
  });

  const gesamtBudget = kunden.reduce((s, k) => s + parseFloat(String(k.budget45b ?? 0)), 0);
  const gesamtVerbraucht = kunden.reduce((s, k) => s + parseFloat(String(k.verbraucht45b ?? 0)), 0);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1f2937", margin: 0 }}>📊 Budget-Dashboard</h2>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>Pflegegrade & Budgets aller Kunden</p>
      </div>

      {/* Gesamt-KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Kunden gesamt", wert: kunden.length, farbe: "#4a8c3f", icon: "👥" },
          { label: "Budget-Warnungen", wert: warnungen.length, farbe: "#dc2626", icon: "⚠️" },
          { label: "Ø Verbrauch §45b", wert: gesamtBudget > 0 ? Math.round((gesamtVerbraucht / gesamtBudget) * 100) + "%" : "–", farbe: "#2a9d8f", icon: "📈" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 12, padding: "12px 10px", border: "1px solid #e5e7eb", textAlign: "center" }}>
            <div style={{ fontSize: 20 }}>{s.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.farbe }}>{s.wert}</div>
            <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Warnungs-Banner */}
      {warnungen.length > 0 && (
        <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
          <div style={{ fontWeight: 700, color: "#dc2626", fontSize: 13, marginBottom: 6 }}>⚠️ {warnungen.length} Kunde(n) mit kritischem Budget (&lt; 10% verfügbar)</div>
          {warnungen.slice(0, 3).map((w: any) => (
            <div key={w.id} style={{ fontSize: 12, color: "#7f1d1d", marginTop: 2 }}>
              • {w.vorname} {w.nachname} – Pflegegrad {w.pflegegrad}
            </div>
          ))}
          {warnungen.length > 3 && <div style={{ fontSize: 12, color: "#7f1d1d", marginTop: 2 }}>... und {warnungen.length - 3} weitere</div>}
        </div>
      )}

      {/* Filter & Suche */}
      <div style={{ marginBottom: 12 }}>
        <input value={suchtext} onChange={e => setSuchtext(e.target.value)}
          placeholder="🔍 Kunde suchen..."
          style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #d1d5db", borderRadius: 10, fontSize: 14, marginBottom: 10, boxSizing: "border-box" }} />
        <div style={{ display: "flex", gap: 8 }}>
          {(["alle", "kritisch", "warnung"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
                background: filter === f ? "#4a8c3f" : "#f3f4f6",
                color: filter === f ? "#fff" : "#6b7280" }}>
              {f === "alle" ? "Alle" : f === "kritisch" ? "⚠️ Kritisch" : "🟡 Warnung"}
            </button>
          ))}
        </div>
      </div>

      {/* Kunden-Liste */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {gefilterteKunden.map(k => {
          const b45b = parseFloat(String(k.budget45b ?? 0));
          const v45b = parseFloat(String(k.verbraucht45b ?? 0));
          const b39 = parseFloat(String(k.budget39 ?? 0));
          const v39 = parseFloat(String(k.verbraucht39 ?? 0));
          const istKritisch = warningIds.has(k.id);
          const kt = kostentraegerListe.find((kt: any) => kt.id === k.kostentraegerId);

          return (
            <div key={k.id}
              onClick={() => openEdit(k)}
              style={{
                background: "#fff", borderRadius: 14, padding: "14px 16px",
                border: `1.5px solid ${istKritisch ? "#fca5a5" : "#e5e7eb"}`,
                cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,.05)",
              }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#1f2937" }}>{k.vorname} {k.nachname}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                    Pflegegrad {k.pflegegrad ?? "–"} • §{k.paragraph ?? "45b"} SGB XI
                  </div>
                  {kt && <div style={{ fontSize: 11, color: "#4a8c3f", marginTop: 2 }}>🏥 {kt.name}</div>}
                  {k.versicherungsnummer && <div style={{ fontSize: 11, color: "#9ca3af" }}>VNr: {k.versicherungsnummer}</div>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  {istKritisch && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: "#fee2e2", color: "#dc2626" }}>⚠️ Kritisch</span>}
                  {(k as any).vollmachtErteilt && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: "#dcfce7", color: "#16a34a" }}>✅ Vollmacht</span>}
                </div>
              </div>
              {b45b > 0 && <BudgetBalken label="§45b SGB XI" budget={b45b} verbraucht={v45b} farbe="#4a8c3f" />}
              {b39 > 0 && <BudgetBalken label="§39 SGB XI" budget={b39} verbraucht={v39} farbe="#2a9d8f" />}
            </div>
          );
        })}
      </div>

      {/* Budget-Bearbeitung */}
      <BottomSheet open={editOpen} onClose={() => setEditOpen(false)} title={`Budget: ${selected?.vorname ?? ""} ${selected?.nachname ?? ""}`}>
        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Info */}
            <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "10px 14px", border: "1px solid #bbf7d0" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#166534" }}>Pflegegrad {selected.pflegegrad ?? "–"}</div>
              <div style={{ fontSize: 12, color: "#15803d", marginTop: 2 }}>§{selected.paragraph ?? "45b"} SGB XI</div>
            </div>

            {/* Auto-Fill Button */}
            <button onClick={autoFill}
              style={{ padding: "10px 14px", background: "#e8f5e4", color: "#4a8c3f", border: "1.5px solid #4a8c3f", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              🤖 Standardbudget für Pflegegrad {selected.pflegegrad} automatisch eintragen
            </button>

            {/* §45b */}
            <div style={{ background: "#f9fafb", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>§45b SGB XI – Entlastungsleistungen</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Jahresbudget (€)</label>
                  <input type="number" value={budgetForm.budget45b} onChange={e => setBudgetForm(f => ({ ...f, budget45b: e.target.value }))}
                    style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Bereits verbraucht (€)</label>
                  <input type="number" value={budgetForm.verbraucht45b} onChange={e => setBudgetForm(f => ({ ...f, verbraucht45b: e.target.value }))}
                    style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
                </div>
              </div>
              {parseFloat(budgetForm.budget45b) > 0 && (
                <div style={{ marginTop: 8 }}>
                  <BudgetBalken label="§45b Vorschau" budget={parseFloat(budgetForm.budget45b)} verbraucht={parseFloat(budgetForm.verbraucht45b || "0")} farbe="#4a8c3f" />
                </div>
              )}
            </div>

            {/* §39 */}
            <div style={{ background: "#f9fafb", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>§39 SGB XI – Verhinderungspflege</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Jahresbudget (€)</label>
                  <input type="number" value={budgetForm.budget39} onChange={e => setBudgetForm(f => ({ ...f, budget39: e.target.value }))}
                    style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Bereits verbraucht (€)</label>
                  <input type="number" value={budgetForm.verbraucht39} onChange={e => setBudgetForm(f => ({ ...f, verbraucht39: e.target.value }))}
                    style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
                </div>
              </div>
            </div>

            {/* Vollmacht */}
            <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "12px 14px", border: "1px solid #bbf7d0" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#166534", marginBottom: 8 }}>📜 Dauervollmacht</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="checkbox" id="vollmacht" checked={(selected as any).vollmachtErteilt ?? false}
                  onChange={e => {
                    updateKunde.mutate({ id: selected.id, vollmachtErteilt: e.target.checked, vollmachtDatum: e.target.checked ? new Date().toISOString().split("T")[0] : undefined });
                    setSelected((s: any) => ({ ...s, vollmachtErteilt: e.target.checked }));
                  }}
                  style={{ width: 18, height: 18, cursor: "pointer" }} />
                <label htmlFor="vollmacht" style={{ fontSize: 13, color: "#166534", cursor: "pointer" }}>
                  Dauervollmacht erteilt (Kasse kann direkt angefragt werden)
                </label>
              </div>
              {(selected as any).vollmachtDatum && (
                <div style={{ fontSize: 11, color: "#15803d", marginTop: 6 }}>
                  Erteilt am: {(selected as any).vollmachtDatum}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => updateBudget.mutate({ id: selected.id, ...budgetForm })} disabled={updateBudget.isPending}
                style={{ flex: 1, padding: 13, background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                {updateBudget.isPending ? "Speichern..." : "✅ Budget speichern"}
              </button>
              <button onClick={() => setEditOpen(false)}
                style={{ padding: 13, background: "#f4f6f3", color: "#6b7280", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                Schließen
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
