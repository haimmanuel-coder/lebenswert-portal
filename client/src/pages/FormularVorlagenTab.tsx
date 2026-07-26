import { useState } from "react";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";

export function FormularVorlagenTab() {
  const vorlagenQ = (trpc as any).besuchsberichte.listVorlagen.useQuery();
  const createMut = (trpc as any).besuchsberichte.createVorlage.useMutation({
    onSuccess: () => { vorlagenQ.refetch(); setShowForm(false); setForm({ name: "", version: "1.0", felder: "" }); toast.success("Vorlage erstellt"); },
    onError: (e: any) => toast.error("Fehler: " + e.message),
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", version: "1.0", felder: "" });

  const inputStyle = { width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, boxSizing: "border-box" as const, marginTop: 4 };
  const labelStyle = { fontSize: 11, fontWeight: 700 as const, color: "#6b7280", textTransform: "uppercase" as const };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>📋 Formularvorlagen</div>
        <button onClick={() => setShowForm(!showForm)} style={{ padding: "7px 14px", background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          {showForm ? "✕ Abbrechen" : "+ Neue Vorlage"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "#f0fdf4", borderRadius: 12, padding: 16, marginBottom: 16, border: "1px solid #bbf7d0" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "#166534" }}>Neue Formularvorlage</div>
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="z.B. Standardbericht §45b" />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Version</label>
            <input value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} style={inputStyle} placeholder="1.0" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Felder (JSON)</label>
            <textarea value={form.felder} onChange={e => setForm(f => ({ ...f, felder: e.target.value }))} style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} placeholder='[{"name":"taetigkeiten","typ":"text","pflicht":true}]' />
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>JSON-Array mit Felddefinitionen. Jedes Feld: name, typ (text/checkbox/datum), pflicht (true/false)</div>
          </div>
          <button
            onClick={() => createMut.mutate(form)}
            disabled={createMut.isPending || !form.name}
            style={{ padding: "10px 20px", background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: createMut.isPending ? 0.6 : 1 }}
          >
            {createMut.isPending ? "Speichern…" : "✅ Vorlage speichern"}
          </button>
        </div>
      )}

      {vorlagenQ.isLoading ? (
        <div style={{ color: "#6b7280", fontSize: 13 }}>Lade Vorlagen…</div>
      ) : (vorlagenQ.data as any[] ?? []).length === 0 ? (
        <div style={{ background: "#f9fafb", borderRadius: 12, padding: 24, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
          Noch keine Formularvorlagen angelegt. Klicke auf "Neue Vorlage" um eine zu erstellen.
        </div>
      ) : (
        <div>
          {(vorlagenQ.data as any[]).map((v: any) => (
            <div key={v.id} style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,.07)", padding: 14, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{v.name}</div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>Version {v.version} · {v.aktiv ? "✅ Aktiv" : "⏸ Inaktiv"}</div>
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>
                  {v.createdAt ? new Date(v.createdAt).toLocaleDateString("de-DE") : ""}
                </div>
              </div>
              {v.felder && (
                <details style={{ marginTop: 8 }}>
                  <summary style={{ fontSize: 11, color: "#4a8c3f", cursor: "pointer", fontWeight: 600 }}>Felder anzeigen</summary>
                  <pre style={{ fontSize: 11, background: "#f9fafb", borderRadius: 6, padding: 8, marginTop: 6, overflow: "auto", maxHeight: 120 }}>{v.felder}</pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
