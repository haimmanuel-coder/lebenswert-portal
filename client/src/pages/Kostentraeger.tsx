import { useState } from "react";
import { trpc } from "@/lib/trpc";
import BottomSheet from "@/components/BottomSheet";
import { toast } from "sonner";

const TYPEN: Record<string, string> = {
  pflegekasse: "Pflegekasse",
  krankenkasse: "Krankenkasse",
  beihilfe: "Beihilfe",
  privat: "Privat",
  sonstige: "Sonstige",
};

const ABRECHNUNGSARTEN: Record<string, string> = {
  dta: "DTA (Datenträgeraustausch)",
  email: "E-Mail",
  ebrief: "E-Brief (Digitaler Brief)",
  post: "Post",
  manuell: "Manuell",
};

const TYP_FARBEN: Record<string, string> = {
  pflegekasse: "#4a8c3f",
  krankenkasse: "#2a9d8f",
  beihilfe: "#e9c46a",
  privat: "#6b7280",
  sonstige: "#9ca3af",
};

export default function Kostentraeger() {
  const { data: liste = [], refetch } = trpc.kostentraeger.list.useQuery();
  const createMut = trpc.kostentraeger.create.useMutation({ onSuccess: () => { refetch(); setFormOpen(false); toast.success("Kostenträger gespeichert!"); } });
  const updateMut = trpc.kostentraeger.update.useMutation({ onSuccess: () => { refetch(); setEditOpen(false); toast.success("Kostenträger aktualisiert!"); } });

  const [formOpen, setFormOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [suchtext, setSuchtext] = useState("");
  const [form, setForm] = useState({
    name: "", ikNummer: "", typ: "pflegekasse" as any,
    strasse: "", plz: "", ort: "", telefon: "", email: "", fax: "",
    abrechnungsart: "email" as any, notizen: "",
  });

  const gefiltert = liste.filter(k =>
    k.name.toLowerCase().includes(suchtext.toLowerCase()) ||
    (k.ikNummer ?? "").includes(suchtext) ||
    (k.ort ?? "").toLowerCase().includes(suchtext.toLowerCase())
  );

  const resetForm = () => setForm({ name: "", ikNummer: "", typ: "pflegekasse", strasse: "", plz: "", ort: "", telefon: "", email: "", fax: "", abrechnungsart: "email", notizen: "" });

  const openEdit = (k: any) => {
    setSelected(k);
    setForm({ name: k.name, ikNummer: k.ikNummer ?? "", typ: k.typ, strasse: k.strasse ?? "", plz: k.plz ?? "", ort: k.ort ?? "", telefon: k.telefon ?? "", email: k.email ?? "", fax: k.fax ?? "", abrechnungsart: k.abrechnungsart ?? "email", notizen: k.notizen ?? "" });
    setEditOpen(true);
  };

  const handleCreate = () => {
    if (!form.name.trim()) { toast.error("Name ist erforderlich"); return; }
    createMut.mutate(form);
  };

  const handleUpdate = () => {
    if (!selected) return;
    updateMut.mutate({ id: selected.id, ...form });
  };

  const FormFields = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Name der Kasse *</label>
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="z.B. AOK Bayern"
          style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>IK-Nummer</label>
        <input value={form.ikNummer} onChange={e => setForm(f => ({ ...f, ikNummer: e.target.value }))}
          placeholder="z.B. 108310400"
          style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Typ</label>
          <select value={form.typ} onChange={e => setForm(f => ({ ...f, typ: e.target.value as any }))}
            style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 14 }}>
            {Object.entries(TYPEN).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Abrechnung via</label>
          <select value={form.abrechnungsart} onChange={e => setForm(f => ({ ...f, abrechnungsart: e.target.value as any }))}
            style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 14 }}>
            {Object.entries(ABRECHNUNGSARTEN).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Straße & Hausnummer</label>
        <input value={form.strasse} onChange={e => setForm(f => ({ ...f, strasse: e.target.value }))}
          placeholder="Musterstraße 1"
          style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>PLZ</label>
          <input value={form.plz} onChange={e => setForm(f => ({ ...f, plz: e.target.value }))}
            placeholder="80335"
            style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Ort</label>
          <input value={form.ort} onChange={e => setForm(f => ({ ...f, ort: e.target.value }))}
            placeholder="München"
            style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Telefon</label>
          <input value={form.telefon} onChange={e => setForm(f => ({ ...f, telefon: e.target.value }))}
            placeholder="089 123456"
            style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Fax</label>
          <input value={form.fax} onChange={e => setForm(f => ({ ...f, fax: e.target.value }))}
            placeholder="089 123457"
            style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
        </div>
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>E-Mail</label>
        <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          placeholder="info@kasse.de" type="email"
          style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Notizen</label>
        <textarea value={form.notizen} onChange={e => setForm(f => ({ ...f, notizen: e.target.value }))}
          rows={3} placeholder="Interne Notizen..."
          style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 14, resize: "vertical", boxSizing: "border-box" }} />
      </div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1f2937", margin: 0 }}>🏥 Kostenträger</h2>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>Krankenkassen & Pflegekassen verwalten</p>
      </div>

      {/* Suche + Neu */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <input
          value={suchtext}
          onChange={e => setSuchtext(e.target.value)}
          placeholder="🔍 Suche nach Name, IK-Nr. oder Ort..."
          style={{ flex: 1, padding: "10px 14px", border: "1.5px solid #d1d5db", borderRadius: 10, fontSize: 14 }}
        />
        <button
          onClick={() => { resetForm(); setFormOpen(true); }}
          style={{ padding: "10px 16px", background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
        >
          + Neu
        </button>
      </div>

      {/* Statistik */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Gesamt", wert: liste.length, farbe: "#4a8c3f" },
          { label: "Pflegekassen", wert: liste.filter(k => k.typ === "pflegekasse").length, farbe: "#2a9d8f" },
          { label: "Sonstige", wert: liste.filter(k => k.typ !== "pflegekasse").length, farbe: "#6b7280" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", border: "1px solid #e5e7eb", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.farbe }}>{s.wert}</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Liste */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {gefiltert.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
            <div style={{ fontSize: 40 }}>🏥</div>
            <div style={{ marginTop: 8 }}>Keine Kostenträger gefunden</div>
          </div>
        )}
        {gefiltert.map(k => (
          <div key={k.id}
            onClick={() => openEdit(k)}
            style={{ background: "#fff", borderRadius: 14, padding: "14px 16px", border: "1px solid #e5e7eb", cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#1f2937" }}>{k.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: TYP_FARBEN[k.typ] + "20", color: TYP_FARBEN[k.typ] }}>
                    {TYPEN[k.typ]}
                  </span>
                </div>
                {k.ikNummer && (
                  <div style={{ fontSize: 12, color: "#6b7280" }}>IK: <strong style={{ color: "#374151" }}>{k.ikNummer}</strong></div>
                )}
                {k.ort && (
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>📍 {k.plz} {k.ort}</div>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "#9ca3af", background: "#f9fafb", padding: "3px 8px", borderRadius: 6 }}>
                  {ABRECHNUNGSARTEN[k.abrechnungsart ?? "email"]?.split(" ")[0]}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Neu-Formular */}
      <BottomSheet open={formOpen} onClose={() => setFormOpen(false)} title="Neuer Kostenträger">
        <FormFields />
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button onClick={handleCreate} disabled={createMut.isPending}
            style={{ flex: 1, padding: 13, background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            {createMut.isPending ? "Speichern..." : "✅ Speichern"}
          </button>
          <button onClick={() => setFormOpen(false)}
            style={{ padding: 13, background: "#f4f6f3", color: "#6b7280", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Abbrechen
          </button>
        </div>
      </BottomSheet>

      {/* Bearbeiten-Formular */}
      <BottomSheet open={editOpen} onClose={() => setEditOpen(false)} title="Kostenträger bearbeiten">
        <FormFields />
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button onClick={handleUpdate} disabled={updateMut.isPending}
            style={{ flex: 1, padding: 13, background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            {updateMut.isPending ? "Speichern..." : "✅ Aktualisieren"}
          </button>
          <button onClick={() => { updateMut.mutate({ id: selected.id, aktiv: 0 }); setEditOpen(false); }}
            style={{ padding: 13, background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Archivieren
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
