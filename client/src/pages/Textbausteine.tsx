import { useState } from "react";
import { trpc } from "@/lib/trpc";
import BottomSheet from "@/components/BottomSheet";
import { toast } from "sonner";

const KATEGORIEN: Record<string, { label: string; farbe: string; icon: string }> = {
  bericht: { label: "Bericht", farbe: "#4a8c3f", icon: "📝" },
  gesundheit: { label: "Gesundheit", farbe: "#dc2626", icon: "❤️" },
  aktivitaet: { label: "Aktivität", farbe: "#2a9d8f", icon: "🏃" },
  bemerkung: { label: "Bemerkung", farbe: "#d97706", icon: "💬" },
  sonstiges: { label: "Sonstiges", farbe: "#6b7280", icon: "📌" },
};

const PARAGRAPHEN: Record<string, string> = {
  alle: "Alle Paragraphen",
  "45b": "§45b SGB XI",
  "45a": "§45a SGB XI",
  "39": "§39 SGB XI",
};

export default function Textbausteine() {
  const { data: bausteine = [], refetch } = trpc.textbausteine.list.useQuery();
  const createMut = trpc.textbausteine.create.useMutation({ onSuccess: () => { refetch(); setFormOpen(false); toast.success("Textbaustein gespeichert!"); } });
  const updateMut = trpc.textbausteine.update.useMutation({ onSuccess: () => { refetch(); setEditOpen(false); toast.success("Textbaustein aktualisiert!"); } });
  const deleteMut = trpc.textbausteine.delete.useMutation({ onSuccess: () => { refetch(); setEditOpen(false); toast.success("Textbaustein gelöscht!"); } });

  const [formOpen, setFormOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [filterKat, setFilterKat] = useState<string>("alle");
  const [form, setForm] = useState({ titel: "", inhalt: "", kategorie: "bericht" as any, paragraph: "alle" as any });

  const resetForm = () => setForm({ titel: "", inhalt: "", kategorie: "bericht", paragraph: "alle" });

  const openEdit = (b: any) => {
    setSelected(b);
    setForm({ titel: b.titel, inhalt: b.inhalt, kategorie: b.kategorie, paragraph: b.paragraph ?? "alle" });
    setEditOpen(true);
  };

  const gefiltert = bausteine.filter(b => filterKat === "alle" || b.kategorie === filterKat);

  const FormFields = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Titel *</label>
        <input value={form.titel} onChange={e => setForm(f => ({ ...f, titel: e.target.value }))}
          placeholder="z.B. Spaziergang unternommen"
          style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Textinhalt *</label>
        <textarea value={form.inhalt} onChange={e => setForm(f => ({ ...f, inhalt: e.target.value }))}
          rows={5} placeholder="Der vollständige Text, der beim Einsatz eingefügt wird..."
          style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 14, resize: "vertical", boxSizing: "border-box" }} />
        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>{form.inhalt.length} Zeichen</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Kategorie</label>
          <select value={form.kategorie} onChange={e => setForm(f => ({ ...f, kategorie: e.target.value as any }))}
            style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 14 }}>
            {Object.entries(KATEGORIEN).map(([v, k]) => <option key={v} value={v}>{k.icon} {k.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Paragraph</label>
          <select value={form.paragraph} onChange={e => setForm(f => ({ ...f, paragraph: e.target.value as any }))}
            style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 14 }}>
            {Object.entries(PARAGRAPHEN).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1f2937", margin: 0 }}>📝 Textbausteine</h2>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>Vordefinierte Texte für schnelle Dokumentation</p>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: "#6b7280" }}>{bausteine.length} Bausteine gespeichert</div>
        <button onClick={() => { resetForm(); setFormOpen(true); }}
          style={{ padding: "9px 16px", background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + Neu
        </button>
      </div>

      {/* Kategorie-Filter */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 14 }}>
        <button onClick={() => setFilterKat("alle")}
          style={{ padding: "6px 12px", borderRadius: 20, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
            background: filterKat === "alle" ? "#4a8c3f" : "#f3f4f6", color: filterKat === "alle" ? "#fff" : "#6b7280" }}>
          Alle ({bausteine.length})
        </button>
        {Object.entries(KATEGORIEN).map(([v, k]) => {
          const anzahl = bausteine.filter(b => b.kategorie === v).length;
          return (
            <button key={v} onClick={() => setFilterKat(v)}
              style={{ padding: "6px 12px", borderRadius: 20, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                background: filterKat === v ? k.farbe : "#f3f4f6", color: filterKat === v ? "#fff" : "#6b7280" }}>
              {k.icon} {k.label} ({anzahl})
            </button>
          );
        })}
      </div>

      {/* Bausteine-Liste */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {gefiltert.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
            <div style={{ fontSize: 40 }}>📝</div>
            <div style={{ marginTop: 8 }}>Keine Textbausteine in dieser Kategorie</div>
          </div>
        )}
        {gefiltert.map(b => {
          const kat = KATEGORIEN[b.kategorie];
          return (
            <div key={b.id} onClick={() => openEdit(b)}
              style={{ background: "#fff", borderRadius: 14, padding: "14px 16px", border: "1px solid #e5e7eb", cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{kat?.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#1f2937" }}>{b.titel}</span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: kat?.farbe + "20", color: kat?.farbe }}>
                    {kat?.label}
                  </span>
                  {b.paragraph && b.paragraph !== "alle" && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: "#e0f2fe", color: "#0369a1" }}>
                      §{b.paragraph}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                {b.inhalt}
              </div>
            </div>
          );
        })}
      </div>

      {/* Neu */}
      <BottomSheet open={formOpen} onClose={() => setFormOpen(false)} title="Neuer Textbaustein">
        <FormFields />
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button onClick={() => { if (!form.titel.trim() || !form.inhalt.trim()) { toast.error("Titel und Text sind erforderlich"); return; } createMut.mutate(form); }}
            disabled={createMut.isPending}
            style={{ flex: 1, padding: 13, background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            {createMut.isPending ? "Speichern..." : "✅ Speichern"}
          </button>
          <button onClick={() => setFormOpen(false)}
            style={{ padding: 13, background: "#f4f6f3", color: "#6b7280", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Abbrechen
          </button>
        </div>
      </BottomSheet>

      {/* Bearbeiten */}
      <BottomSheet open={editOpen} onClose={() => setEditOpen(false)} title="Textbaustein bearbeiten">
        <FormFields />
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button onClick={() => { if (!selected) return; updateMut.mutate({ id: selected.id, ...form }); }}
            disabled={updateMut.isPending}
            style={{ flex: 1, padding: 13, background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            {updateMut.isPending ? "Speichern..." : "✅ Aktualisieren"}
          </button>
          <button onClick={() => { if (selected) deleteMut.mutate({ id: selected.id }); }}
            style={{ padding: 13, background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            🗑️
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
