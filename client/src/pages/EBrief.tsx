import { useState } from "react";
import { trpc } from "@/lib/trpc";
import BottomSheet from "@/components/BottomSheet";
import { toast } from "sonner";

const TYPEN: Record<string, { label: string; icon: string; farbe: string }> = {
  leistungsnachweis: { label: "Leistungsnachweis", icon: "📋", farbe: "#4a8c3f" },
  protokoll: { label: "Protokoll/Bericht", icon: "📄", farbe: "#2a9d8f" },
  kostenvoranschlag: { label: "Kostenvoranschlag", icon: "💰", farbe: "#d97706" },
  sonstiges: { label: "Sonstiges", icon: "📬", farbe: "#6b7280" },
};

const VERSANDARTEN: Record<string, { label: string; icon: string; info: string }> = {
  email: { label: "E-Mail", icon: "📧", info: "Direkt per E-Mail versenden" },
  ebrief: { label: "E-Brief (Digital)", icon: "📮", info: "Digitaler Briefversand – wird automatisch gedruckt & versendet" },
  post: { label: "Post (Notiz)", icon: "✉️", info: "Manuelle Erinnerung zum postalischen Versand" },
};

const STATUS_FARBEN: Record<string, string> = {
  entwurf: "#d97706",
  versendet: "#16a34a",
  fehler: "#dc2626",
};

export default function EBrief() {
  const { data: log = [], refetch } = trpc.ebrief.list.useQuery({ limit: 100 });
  const { data: kunden = [] } = trpc.kunden.list.useQuery();
  const { data: kostentraeger = [] } = trpc.kostentraeger.list.useQuery();
  const sendMut = trpc.ebrief.send.useMutation({
    onSuccess: () => { refetch(); setFormOpen(false); toast.success("Brief erfolgreich versendet!"); },
    onError: (e) => toast.error("Fehler: " + e.message),
  });

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    kundenId: "" as any,
    kostentraegerId: "" as any,
    betreff: "",
    inhalt: "",
    empfaenger: "",
    typ: "leistungsnachweis" as any,
    versandart: "email" as any,
  });

  const handleKundeChange = (kundenId: string) => {
    setForm(f => ({ ...f, kundenId: kundenId ? parseInt(kundenId) : "" }));
    if (kundenId) {
      const k = kunden.find((c: any) => c.id === parseInt(kundenId));
      if (k?.kostentraegerId) {
        const kt = kostentraeger.find((t: any) => t.id === k.kostentraegerId);
        if (kt?.email) setForm(f => ({ ...f, empfaenger: kt.email ?? "", kostentraegerId: kt.id }));
      }
    }
  };

  const handleKostentraegerChange = (ktId: string) => {
    setForm(f => ({ ...f, kostentraegerId: ktId ? parseInt(ktId) : "" }));
    if (ktId) {
      const kt = kostentraeger.find((t: any) => t.id === parseInt(ktId));
      if (kt?.email) setForm(f => ({ ...f, empfaenger: kt.email ?? "" }));
    }
  };

  const handleSend = () => {
    if (!form.betreff.trim()) { toast.error("Betreff ist erforderlich"); return; }
    if (!form.empfaenger.trim()) { toast.error("Empfänger ist erforderlich"); return; }
    if (!form.inhalt.trim()) { toast.error("Inhalt ist erforderlich"); return; }
    sendMut.mutate({
      ...form,
      kundenId: form.kundenId || undefined,
      kostentraegerId: form.kostentraegerId || undefined,
    });
  };

  const resetForm = () => setForm({
    kundenId: "", kostentraegerId: "", betreff: "", inhalt: "", empfaenger: "", typ: "leistungsnachweis", versandart: "email",
  });

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1f2937", margin: 0 }}>📮 E-Brief / Korrespondenz</h2>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>Briefe & Dokumente an Kassen versenden</p>
      </div>

      {/* Statistik */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Gesamt", wert: log.length, farbe: "#4a8c3f" },
          { label: "Versendet", wert: log.filter((l: any) => l.status === "versendet").length, farbe: "#16a34a" },
          { label: "Diesen Monat", wert: log.filter((l: any) => l.createdAt?.slice?.(0, 7) === new Date().toISOString().slice(0, 7)).length, farbe: "#2a9d8f" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 12, padding: "12px 10px", border: "1px solid #e5e7eb", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.farbe }}>{s.wert}</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Neuer Brief Button */}
      <button onClick={() => { resetForm(); setFormOpen(true); }}
        style={{ width: "100%", padding: "14px", background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <span>✉️</span> Neuen Brief / E-Mail verfassen
      </button>

      {/* Versandarten Info */}
      <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "12px 14px", marginBottom: 16, border: "1px solid #bbf7d0" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#166534", marginBottom: 8 }}>ℹ️ Versandarten erklärt</div>
        {Object.entries(VERSANDARTEN).map(([v, info]) => (
          <div key={v} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 14 }}>{info.icon}</span>
            <div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{info.label}: </span>
              <span style={{ fontSize: 12, color: "#6b7280" }}>{info.info}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Brief-Log */}
      <div style={{ marginBottom: 8, fontWeight: 700, color: "#374151", fontSize: 14 }}>Versandverlauf</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {log.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
            <div style={{ fontSize: 40 }}>📮</div>
            <div style={{ marginTop: 8 }}>Noch keine Briefe versendet</div>
          </div>
        )}
        {log.map((l: any) => {
          const typ = TYPEN[l.typ];
          const versand = VERSANDARTEN[l.versandart];
          const kunde = kunden.find((k: any) => k.id === l.kundenId);
          const datum = l.createdAt ? new Date(l.createdAt).toLocaleDateString("de-DE") : "";
          return (
            <div key={l.id} style={{ background: "#fff", borderRadius: 14, padding: "14px 16px", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{typ?.icon ?? "📬"}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1f2937" }}>{l.betreff}</div>
                    {kunde && <div style={{ fontSize: 12, color: "#6b7280" }}>Kunde: {kunde.vorname} {kunde.nachname}</div>}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: STATUS_FARBEN[l.status] + "20", color: STATUS_FARBEN[l.status] }}>
                    {l.status === "versendet" ? "✅ Versendet" : l.status === "fehler" ? "❌ Fehler" : "📝 Entwurf"}
                  </div>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{datum}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#f3f4f6", color: "#6b7280" }}>
                  {versand?.icon} {versand?.label}
                </span>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#f3f4f6", color: "#6b7280" }}>
                  An: {l.empfaenger}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Brief-Formular */}
      <BottomSheet open={formOpen} onClose={() => setFormOpen(false)} title="Brief / E-Mail verfassen">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Typ */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Dokumententyp</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {Object.entries(TYPEN).map(([v, t]) => (
                <button key={v} onClick={() => setForm(f => ({ ...f, typ: v as any }))}
                  style={{ padding: "10px 8px", borderRadius: 10, border: `2px solid ${form.typ === v ? t.farbe : "#e5e7eb"}`,
                    background: form.typ === v ? t.farbe + "15" : "#fff", cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: 18 }}>{t.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: form.typ === v ? t.farbe : "#6b7280" }}>{t.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Versandart */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Versandart</label>
            <div style={{ display: "flex", gap: 8 }}>
              {Object.entries(VERSANDARTEN).map(([v, va]) => (
                <button key={v} onClick={() => setForm(f => ({ ...f, versandart: v as any }))}
                  style={{ flex: 1, padding: "8px 6px", borderRadius: 10, border: `2px solid ${form.versandart === v ? "#4a8c3f" : "#e5e7eb"}`,
                    background: form.versandart === v ? "#e8f5e4" : "#fff", cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: 16 }}>{va.icon}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: form.versandart === v ? "#4a8c3f" : "#6b7280" }}>{va.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Kunde */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Kunde (optional)</label>
            <select value={form.kundenId} onChange={e => handleKundeChange(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 14 }}>
              <option value="">– Kein Kunde –</option>
              {kunden.map((k: any) => <option key={k.id} value={k.id}>{k.nachname}, {k.vorname}</option>)}
            </select>
          </div>

          {/* Kostenträger */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Kostenträger (optional)</label>
            <select value={form.kostentraegerId} onChange={e => handleKostentraegerChange(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 14 }}>
              <option value="">– Kein Kostenträger –</option>
              {kostentraeger.map((k: any) => <option key={k.id} value={k.id}>{k.name} {k.ikNummer ? `(IK: ${k.ikNummer})` : ""}</option>)}
            </select>
          </div>

          {/* Empfänger */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Empfänger *</label>
            <input value={form.empfaenger} onChange={e => setForm(f => ({ ...f, empfaenger: e.target.value }))}
              placeholder="empfaenger@kasse.de oder Name/Adresse"
              style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
          </div>

          {/* Betreff */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Betreff *</label>
            <input value={form.betreff} onChange={e => setForm(f => ({ ...f, betreff: e.target.value }))}
              placeholder="z.B. Leistungsnachweis Oktober 2025"
              style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
          </div>

          {/* Inhalt */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Nachricht / Inhalt *</label>
            <textarea value={form.inhalt} onChange={e => setForm(f => ({ ...f, inhalt: e.target.value }))}
              rows={6} placeholder="Sehr geehrte Damen und Herren,&#10;&#10;anbei übersende ich Ihnen..."
              style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 14, resize: "vertical", boxSizing: "border-box" }} />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleSend} disabled={sendMut.isPending}
              style={{ flex: 1, padding: 13, background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              {sendMut.isPending ? "Senden..." : "📤 Jetzt versenden"}
            </button>
            <button onClick={() => setFormOpen(false)}
              style={{ padding: 13, background: "#f4f6f3", color: "#6b7280", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              Abbrechen
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
