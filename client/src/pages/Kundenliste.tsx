import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { toast } from "sonner";

type KundeDetail = {
  id: number;
  vorname: string;
  nachname: string;
  geburtsdatum?: string | Date | null;
  strasse?: string | null;
  plz?: string | null;
  ort?: string | null;
  telefon?: string | null;
  mobil?: string | null;
  email?: string | null;
  kostentraeger?: string | null;
  kostentraegerId?: number | null;
  versicherungsnummer?: string | null;
  pflegegrad?: number | null;
  paragraph?: string | null;
  budget45b?: string | number | null;
  verbraucht45b?: string | number | null;
  letzteAbrechnung45b?: string | null;
  budget45a?: string | number | null;
  verbraucht45a?: string | number | null;
  letzteAbrechnung45a?: string | null;
  budget39?: string | number | null;
  verbraucht39?: string | number | null;
  letzteAbrechnung39?: string | null;
  aktiv?: number;
};

type Kostentraeger = { id: number; name: string; ikNummer?: string | null };

function toNum(v: string | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === "number" ? v : parseFloat(v) || 0;
}

function formatEuro(v: string | number | null | undefined): string {
  return toNum(v).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

function formatDate(v: string | Date | null | undefined): string {
  if (!v) return "–";
  const d = new Date(v);
  return d.toLocaleDateString("de-DE");
}

function BudgetBar({ budget, verbraucht, label }: { budget: number; verbraucht: number; label: string }) {
  if (budget <= 0 && verbraucht <= 0) return null;
  const total = Math.max(budget, verbraucht);
  const pct = total > 0 ? Math.min(100, (verbraucht / total) * 100) : 0;
  const rest = budget - verbraucht;
  const color = pct > 90 ? "#ef4444" : pct > 70 ? "#f59e0b" : "#4a8c3f";
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 3 }}>
        <span>§{label} SGB XI</span>
        <span style={{ color: rest < 0 ? "#ef4444" : "#4a8c3f" }}>
          {rest >= 0 ? `${formatEuro(rest)} verfügbar` : `${formatEuro(Math.abs(rest))} überschritten`}
        </span>
      </div>
      <div style={{ height: 8, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 0.4s ease" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#9ca3af", marginTop: 2 }}>
        <span>Verbraucht: {formatEuro(verbraucht)}</span>
        <span>Budget: {formatEuro(budget)}</span>
      </div>
    </div>
  );
}

function KundenKarte({ k, onClick, istKritisch }: { k: KundeDetail; onClick: () => void; istKritisch?: boolean }) {
  const b45b = toNum(k.budget45b); const v45b = toNum(k.verbraucht45b);
  const b45a = toNum(k.budget45a); const v45a = toNum(k.verbraucht45a);
  const b39 = toNum(k.budget39); const v39 = toNum(k.verbraucht39);
  const hasBudget = b45b > 0 || v45b > 0 || b45a > 0 || v45a > 0 || b39 > 0 || v39 > 0;
  const pgColors: Record<number, string> = { 1: "#94a3b8", 2: "#60a5fa", 3: "#34d399", 4: "#f59e0b", 5: "#ef4444" };
  const pg = k.pflegegrad ?? 2;
  return (
    <div onClick={onClick} style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,.08)", padding: 16, marginBottom: 12, cursor: "pointer", borderLeft: `4px solid ${pgColors[pg] ?? "#4a8c3f"}`, transition: "transform 0.15s ease, box-shadow 0.15s ease" }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 20px rgba(0,0,0,.12)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(0,0,0,.08)"; }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: hasBudget ? 12 : 0 }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${pgColors[pg]}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🏠</div>
          {istKritisch && <div style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, background: "#ef4444", borderRadius: "50%", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#fff", fontWeight: 900 }}>!</div>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#1f2937" }}>{k.vorname} {k.nachname}</div>
          {k.geburtsdatum && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 1 }}>🎂 {formatDate(k.geburtsdatum)}</div>}
          {(k.strasse || k.ort) && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📍 {[k.strasse, k.plz, k.ort].filter(Boolean).join(", ")}</div>}
          {k.telefon && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 1 }}>📞 {k.telefon}</div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", flexShrink: 0 }}>
          <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 800, background: `${pgColors[pg]}22`, color: pgColors[pg] }}>PG {pg}</span>
          {k.paragraph && <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "#e8f5e4", color: "#4a8c3f" }}>§{k.paragraph}</span>}
        </div>
      </div>
      {hasBudget && (
        <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 10 }}>
          <BudgetBar budget={b45b} verbraucht={v45b} label="45b" />
          <BudgetBar budget={b45a} verbraucht={v45a} label="45a" />
          <BudgetBar budget={b39} verbraucht={v39} label="39" />
        </div>
      )}
      {k.kostentraeger && <div style={{ marginTop: 8, fontSize: 11, color: "#9ca3af" }}>🏥 {k.kostentraeger} {k.versicherungsnummer ? `· ${k.versicherungsnummer}` : ""}</div>}
    </div>
  );
}

// ── DETAIL-SHEET ─────────────────────────────────────────────────────────────
function KundenDetailSheet({
  k, onClose, onEdit, onDeactivate, isAdmin,
}: { k: KundeDetail; onClose: () => void; onEdit: () => void; onDeactivate: () => void; isAdmin: boolean }) {
  const b45b = toNum(k.budget45b); const v45b = toNum(k.verbraucht45b);
  const b45a = toNum(k.budget45a); const v45a = toNum(k.verbraucht45a);
  const b39 = toNum(k.budget39); const v39 = toNum(k.verbraucht39);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", flexDirection: "column" }}>
      <div onClick={onClose} style={{ flex: 1, background: "rgba(0,0,0,0.5)" }} />
      <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", maxHeight: "90vh", overflowY: "auto", padding: 20 }}>
        <div style={{ width: 40, height: 4, background: "#e5e7eb", borderRadius: 2, margin: "0 auto 16px" }} />

        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #4a8c3f, #2a9d8f)", borderRadius: 14, padding: 18, marginBottom: 16, color: "#fff" }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}>🏠</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{k.vorname} {k.nachname}</div>
          {k.geburtsdatum && <div style={{ fontSize: 13, opacity: 0.9, marginTop: 3 }}>🎂 {formatDate(k.geburtsdatum)}</div>}
          {(k.strasse || k.ort) && <div style={{ fontSize: 13, opacity: 0.9, marginTop: 3 }}>📍 {[k.strasse, k.plz, k.ort].filter(Boolean).join(", ")}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {k.pflegegrad && <span style={{ padding: "3px 10px", borderRadius: 20, background: "rgba(255,255,255,0.25)", fontSize: 12, fontWeight: 700 }}>Pflegegrad {k.pflegegrad}</span>}
            {k.paragraph && <span style={{ padding: "3px 10px", borderRadius: 20, background: "rgba(255,255,255,0.25)", fontSize: 12, fontWeight: 700 }}>§{k.paragraph} SGB XI</span>}
          </div>
        </div>

        {/* Kontakt */}
        <div style={{ background: "#f9fafb", borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 8 }}>Kontakt</div>
          {k.telefon && <div style={{ fontSize: 14, marginBottom: 4 }}>📞 {k.telefon}</div>}
          {k.mobil && <div style={{ fontSize: 14, marginBottom: 4 }}>📱 {k.mobil}</div>}
          {k.email && <div style={{ fontSize: 14, marginBottom: 4 }}>✉️ {k.email}</div>}
          {!k.telefon && !k.mobil && !k.email && <div style={{ fontSize: 13, color: "#9ca3af" }}>Keine Kontaktdaten hinterlegt</div>}
        </div>

        {/* Kostenträger */}
        <div style={{ background: "#f9fafb", borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 8 }}>Kostenträger & Versicherung</div>
          {k.kostentraeger && <div style={{ fontSize: 14, marginBottom: 4 }}>🏥 {k.kostentraeger}</div>}
          {k.versicherungsnummer && <div style={{ fontSize: 14, color: "#4b5563" }}>Nr.: {k.versicherungsnummer}</div>}
          {!k.kostentraeger && <div style={{ fontSize: 13, color: "#9ca3af" }}>Keine Angaben</div>}
        </div>

        {/* Budget */}
        <div style={{ background: "#f0faf0", borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#4a8c3f", marginBottom: 12 }}>💰 Budget-Übersicht</div>
          {(b45b > 0 || v45b > 0) && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1f2937", marginBottom: 6 }}>§45b SGB XI – Entlastungsleistungen</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 6 }}>
                <div style={{ background: "#fff", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}><div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Budget</div><div style={{ fontSize: 14, fontWeight: 800, color: "#4a8c3f" }}>{formatEuro(b45b)}</div></div>
                <div style={{ background: "#fff", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}><div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Verbraucht</div><div style={{ fontSize: 14, fontWeight: 800, color: "#f59e0b" }}>{formatEuro(v45b)}</div></div>
                <div style={{ background: "#fff", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}><div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Verfügbar</div><div style={{ fontSize: 14, fontWeight: 800, color: b45b - v45b >= 0 ? "#4a8c3f" : "#ef4444" }}>{formatEuro(b45b - v45b)}</div></div>
              </div>
              <BudgetBar budget={b45b} verbraucht={v45b} label="45b" />
            </div>
          )}
          {(b45a > 0 || v45a > 0) && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1f2937", marginBottom: 6 }}>§45a SGB XI – Angebote zur Unterstützung</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 6 }}>
                <div style={{ background: "#fff", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}><div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Budget</div><div style={{ fontSize: 14, fontWeight: 800, color: "#4a8c3f" }}>{formatEuro(b45a)}</div></div>
                <div style={{ background: "#fff", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}><div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Verbraucht</div><div style={{ fontSize: 14, fontWeight: 800, color: "#f59e0b" }}>{formatEuro(v45a)}</div></div>
                <div style={{ background: "#fff", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}><div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Verfügbar</div><div style={{ fontSize: 14, fontWeight: 800, color: b45a - v45a >= 0 ? "#4a8c3f" : "#ef4444" }}>{formatEuro(b45a - v45a)}</div></div>
              </div>
              <BudgetBar budget={b45a} verbraucht={v45a} label="45a" />
            </div>
          )}
          {(b39 > 0 || v39 > 0) && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1f2937", marginBottom: 6 }}>§39 SGB XI – Häusliche Krankenpflege</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 6 }}>
                <div style={{ background: "#fff", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}><div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Budget</div><div style={{ fontSize: 14, fontWeight: 800, color: "#4a8c3f" }}>{formatEuro(b39)}</div></div>
                <div style={{ background: "#fff", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}><div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Verbraucht</div><div style={{ fontSize: 14, fontWeight: 800, color: "#f59e0b" }}>{formatEuro(v39)}</div></div>
                <div style={{ background: "#fff", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}><div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Verfügbar</div><div style={{ fontSize: 14, fontWeight: 800, color: b39 - v39 >= 0 ? "#4a8c3f" : "#ef4444" }}>{formatEuro(b39 - v39)}</div></div>
              </div>
              <BudgetBar budget={b39} verbraucht={v39} label="39" />
            </div>
          )}
          {b45b === 0 && v45b === 0 && b45a === 0 && v45a === 0 && b39 === 0 && v39 === 0 && (
            <div style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "8px 0" }}>Noch kein Budget hinterlegt</div>
          )}
        </div>

        {/* Admin-Aktionen */}
        {isAdmin && (
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <button onClick={onEdit} style={{ flex: 1, padding: 13, background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              ✏️ Bearbeiten
            </button>
            <button onClick={onDeactivate} style={{ flex: 1, padding: 13, background: "#fee2e2", color: "#dc2626", border: "2px solid #fca5a5", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              🚫 Deaktivieren
            </button>
          </div>
        )}

        <button onClick={onClose} style={{ width: "100%", padding: 14, background: "#f3f4f6", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer", color: "#4b5563" }}>
          Schließen
        </button>
      </div>
    </div>
  );
}

// ── ANLEGEN / BEARBEITEN SHEET ────────────────────────────────────────────────
function KundeFormSheet({
  initialData,
  kostentraegerListe,
  onClose,
  onSave,
  saving,
}: {
  initialData?: Partial<KundeDetail>;
  kostentraegerListe: Kostentraeger[];
  onClose: () => void;
  onSave: (data: any) => void;
  saving: boolean;
}) {
  const isEdit = !!initialData?.id;
  const [form, setForm] = useState({
    vorname: initialData?.vorname ?? "",
    nachname: initialData?.nachname ?? "",
    geburtsdatum: initialData?.geburtsdatum ? String(initialData.geburtsdatum).split("T")[0] : "",
    strasse: initialData?.strasse ?? "",
    plz: initialData?.plz ?? "",
    ort: initialData?.ort ?? "",
    telefon: initialData?.telefon ?? "",
    mobil: initialData?.mobil ?? "",
    email: initialData?.email ?? "",
    pflegegrad: String(initialData?.pflegegrad ?? "2"),
    paragraph: initialData?.paragraph ?? "45b",
    kostentraegerId: String(initialData?.kostentraegerId ?? ""),
    versicherungsnummer: initialData?.versicherungsnummer ?? "",
    // Budget (nur bei Bearbeitung)
    budget45b: String(initialData?.budget45b ?? ""),
    budget45a: String(initialData?.budget45a ?? ""),
    budget39: String(initialData?.budget39 ?? ""),
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff" };
  const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 4, display: "block" };

  const handleSave = () => {
    if (!form.vorname.trim() || !form.nachname.trim()) { toast.error("Vor- und Nachname sind Pflichtfelder"); return; }
    const payload: any = {
      vorname: form.vorname.trim(),
      nachname: form.nachname.trim(),
      strasse: form.strasse || undefined,
      plz: form.plz || undefined,
      ort: form.ort || undefined,
      telefon: form.telefon || undefined,
      mobil: form.mobil || undefined,
      email: form.email || undefined,
      pflegegrad: parseInt(form.pflegegrad) || 2,
      paragraph: form.paragraph as "45b" | "45a" | "39" | "privat",
      kostentraegerId: form.kostentraegerId ? parseInt(form.kostentraegerId) : null,
      versicherungsnummer: form.versicherungsnummer || undefined,
    };
    if (form.geburtsdatum) payload.geburtsdatum = form.geburtsdatum;
    if (isEdit) {
      payload.id = initialData!.id;
      if (form.budget45b) payload.budget45b = form.budget45b;
      if (form.budget45a) payload.budget45a = form.budget45a;
      if (form.budget39) payload.budget39 = form.budget39;
    }
    onSave(payload);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1100, display: "flex", flexDirection: "column" }}>
      <div onClick={onClose} style={{ flex: 1, background: "rgba(0,0,0,0.5)" }} />
      <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", maxHeight: "92vh", overflowY: "auto", padding: 20 }}>
        <div style={{ width: 40, height: 4, background: "#e5e7eb", borderRadius: 2, margin: "0 auto 16px" }} />
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20, color: "#1f2937" }}>
          {isEdit ? "✏️ Kunde bearbeiten" : "➕ Neuen Kunden anlegen"}
        </div>

        {/* Stammdaten */}
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 10 }}>Stammdaten</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div><label style={lbl}>Vorname *</label><input style={inp} value={form.vorname} onChange={e => set("vorname", e.target.value)} placeholder="Maria" /></div>
          <div><label style={lbl}>Nachname *</label><input style={inp} value={form.nachname} onChange={e => set("nachname", e.target.value)} placeholder="Mustermann" /></div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={lbl}>Geburtsdatum</label>
          <input type="date" style={inp} value={form.geburtsdatum} onChange={e => set("geburtsdatum", e.target.value)} />
        </div>

        {/* Adresse */}
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 10, marginTop: 16 }}>Adresse</div>
        <div style={{ marginBottom: 10 }}>
          <label style={lbl}>Straße & Hausnummer</label>
          <input style={inp} value={form.strasse} onChange={e => set("strasse", e.target.value)} placeholder="Musterstraße 12" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginBottom: 10 }}>
          <div><label style={lbl}>PLZ</label><input style={inp} value={form.plz} onChange={e => set("plz", e.target.value)} placeholder="12345" /></div>
          <div><label style={lbl}>Ort</label><input style={inp} value={form.ort} onChange={e => set("ort", e.target.value)} placeholder="Musterstadt" /></div>
        </div>

        {/* Kontakt */}
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 10, marginTop: 16 }}>Kontakt</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div><label style={lbl}>Telefon</label><input style={inp} value={form.telefon} onChange={e => set("telefon", e.target.value)} placeholder="0123 456789" /></div>
          <div><label style={lbl}>Mobil</label><input style={inp} value={form.mobil} onChange={e => set("mobil", e.target.value)} placeholder="0170 123456" /></div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={lbl}>E-Mail</label>
          <input type="email" style={inp} value={form.email} onChange={e => set("email", e.target.value)} placeholder="maria@beispiel.de" />
        </div>

        {/* Pflege */}
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 10, marginTop: 16 }}>Pflegeeinstufung</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={lbl}>Pflegegrad</label>
            <select style={{ ...inp, cursor: "pointer" }} value={form.pflegegrad} onChange={e => set("pflegegrad", e.target.value)}>
              {[1, 2, 3, 4, 5].map(pg => <option key={pg} value={String(pg)}>Pflegegrad {pg}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Paragraph SGB XI</label>
            <select style={{ ...inp, cursor: "pointer" }} value={form.paragraph} onChange={e => set("paragraph", e.target.value)}>
              <option value="45b">§45b – Entlastungsleistungen</option>
              <option value="45a">§45a – Angebote zur Unterstützung</option>
              <option value="39">§39 – Häusliche Krankenpflege</option>
              <option value="privat">Privat</option>
            </select>
          </div>
        </div>

        {/* Kostenträger */}
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 10, marginTop: 16 }}>Kostenträger & Versicherung</div>
        <div style={{ marginBottom: 10 }}>
          <label style={lbl}>Kostenträger (Krankenkasse)</label>
          <select style={{ ...inp, cursor: "pointer" }} value={form.kostentraegerId} onChange={e => set("kostentraegerId", e.target.value)}>
            <option value="">– Bitte wählen –</option>
            {kostentraegerListe.map(kt => <option key={kt.id} value={String(kt.id)}>{kt.name}{kt.ikNummer ? ` (${kt.ikNummer})` : ""}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={lbl}>Versicherungsnummer</label>
          <input style={inp} value={form.versicherungsnummer} onChange={e => set("versicherungsnummer", e.target.value)} placeholder="A123456789" />
        </div>

        {/* Budget (nur bei Bearbeitung) */}
        {isEdit && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#4a8c3f", marginBottom: 10, marginTop: 16 }}>💰 Budget festlegen</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div><label style={lbl}>§45b Budget (€)</label><input type="number" step="0.01" style={inp} value={form.budget45b} onChange={e => set("budget45b", e.target.value)} placeholder="0.00" /></div>
              <div><label style={lbl}>§45a Budget (€)</label><input type="number" step="0.01" style={inp} value={form.budget45a} onChange={e => set("budget45a", e.target.value)} placeholder="0.00" /></div>
              <div><label style={lbl}>§39 Budget (€)</label><input type="number" step="0.01" style={inp} value={form.budget39} onChange={e => set("budget39", e.target.value)} placeholder="0.00" /></div>
            </div>
          </>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 14, background: "#f3f4f6", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", color: "#4b5563" }}>
            Abbrechen
          </button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: 14, background: saving ? "#9ca3af" : "#4a8c3f", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "⏳ Speichern..." : isEdit ? "✅ Änderungen speichern" : "✅ Kunden anlegen"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── HAUPTKOMPONENTE ───────────────────────────────────────────────────────────
interface KundenlisteProps { onKundeSelect?: (id: number) => void; }
export default function Kundenliste({ onKundeSelect }: KundenlisteProps = {}) {
  const { mitarbeiter } = usePortalAuth();
  const isAdmin = mitarbeiter?.rolle === "admin";

  const utils = trpc.useUtils();
  const { data: kundenRaw = [], isLoading, isError, refetch } = trpc.kunden.list.useQuery();
  const { data: warnungenRaw = [] } = trpc.kunden.budgetWarnungen.useQuery();
  const { data: kostentraegerRaw = [] } = trpc.kostentraeger.list.useQuery();

  const kunden = kundenRaw as KundeDetail[];
  const warnungen = warnungenRaw as { id: number }[];
  const kostentraegerListe = kostentraegerRaw as Kostentraeger[];
  const kritischeKundenIds = new Set(warnungen.map((w) => w.id));

  const [suche, setSuche] = useState("");
  const [filterPG, setFilterPG] = useState("alle");
  const [filterParagraph, setFilterParagraph] = useState("alle");
  const [sortBy, setSortBy] = useState<"name" | "pflegegrad" | "budget">("name");
  const [selectedKunde, setSelectedKunde] = useState<KundeDetail | null>(null);
  const [editKunde, setEditKunde] = useState<KundeDetail | null>(null);
  const [showNeuSheet, setShowNeuSheet] = useState(false);
  const [saving, setSaving] = useState(false);

  const createKunde = trpc.kunden.create.useMutation({
    onSuccess: () => { utils.kunden.list.invalidate(); setShowNeuSheet(false); toast.success("✅ Kunde angelegt"); },
    onError: (e) => toast.error("Fehler: " + e.message),
  });

  const updateKunde = trpc.kunden.update.useMutation({
    onSuccess: () => { utils.kunden.list.invalidate(); setEditKunde(null); setSelectedKunde(null); toast.success("✅ Kunde aktualisiert"); },
    onError: (e) => toast.error("Fehler: " + e.message),
  });

  const updateBudget = trpc.kunden.updateBudget.useMutation({
    onSuccess: () => utils.kunden.list.invalidate(),
  });

  const handleSaveNeu = async (data: any) => {
    setSaving(true);
    try { await createKunde.mutateAsync(data); } finally { setSaving(false); }
  };

  const handleSaveEdit = async (data: any) => {
    setSaving(true);
    try {
      const { id, budget45b, budget45a, budget39, ...rest } = data;
      await updateKunde.mutateAsync({ id, ...rest });
      if (budget45b || budget45a || budget39) {
        await updateBudget.mutateAsync({ id, budget45b: budget45b || undefined, budget45a: budget45a || undefined, budget39: budget39 || undefined });
      }
    } finally { setSaving(false); }
  };

  const handleDeactivate = async (k: KundeDetail) => {
    if (!confirm(`Kunden "${k.vorname} ${k.nachname}" wirklich deaktivieren?`)) return;
    await updateKunde.mutateAsync({ id: k.id, aktiv: 0 });
    setSelectedKunde(null);
  };

  // Statistiken
  const mitBudget = kunden.filter(k => toNum(k.budget45b) > 0 || toNum(k.budget45a) > 0 || toNum(k.budget39) > 0).length;
  const gesamtBudget45b = kunden.reduce((s, k) => s + toNum(k.budget45b), 0);
  const gesamtVerbraucht45b = kunden.reduce((s, k) => s + toNum(k.verbraucht45b), 0);
  const gesamtBudget39 = kunden.reduce((s, k) => s + toNum(k.budget39), 0);
  const anzahlKritisch = kritischeKundenIds.size;

  // Filtern & Sortieren
  let gefiltert = kunden.filter(k => {
    const q = suche.toLowerCase();
    const matchSuche = !q || `${k.vorname} ${k.nachname} ${k.strasse ?? ""} ${k.ort ?? ""} ${k.versicherungsnummer ?? ""}`.toLowerCase().includes(q);
    const matchPG = filterPG === "alle" || String(k.pflegegrad) === filterPG;
    const matchPar = filterParagraph === "alle" || k.paragraph === filterParagraph;
    return matchSuche && matchPG && matchPar;
  });
  if (sortBy === "name") gefiltert.sort((a, b) => a.nachname.localeCompare(b.nachname));
  else if (sortBy === "pflegegrad") gefiltert.sort((a, b) => (b.pflegegrad ?? 0) - (a.pflegegrad ?? 0));
  else if (sortBy === "budget") gefiltert.sort((a, b) => toNum(b.budget45b) - toNum(a.budget45b));

  const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff" };
  const selectStyle: React.CSSProperties = { padding: "8px 10px", border: "2px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", background: "#fff", cursor: "pointer" };

  return (
    <div className="page-enter" style={{ paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Kundenliste</div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>Lebenswert Betreuung – {kunden.length} Kunden</div>
        </div>
        {isAdmin && (
          <button
            id="kunden-neu-btn"
            onClick={() => setShowNeuSheet(true)}
            style={{ padding: "10px 16px", background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
          >
            ➕ Neuer Kunde
          </button>
        )}
      </div>

      {/* KPI-Karten */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div style={{ background: "linear-gradient(135deg, #4a8c3f, #2a9d8f)", borderRadius: 12, padding: 14, color: "#fff" }}>
          <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 600 }}>Kunden gesamt</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 2 }}>{kunden.length}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{mitBudget} mit Budget</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: 14, boxShadow: "0 2px 10px rgba(0,0,0,.08)" }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Budget §45b gesamt</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#4a8c3f", marginTop: 2 }}>{formatEuro(gesamtBudget45b)}</div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Verbraucht: {formatEuro(gesamtVerbraucht45b)}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: 14, boxShadow: "0 2px 10px rgba(0,0,0,.08)" }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Budget §39 gesamt</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#2a9d8f", marginTop: 2 }}>{formatEuro(gesamtBudget39)}</div>
        </div>
        <div style={{ background: anzahlKritisch > 0 ? "linear-gradient(135deg, #ef4444, #dc2626)" : "#fff", borderRadius: 12, padding: 14, boxShadow: "0 2px 10px rgba(0,0,0,.08)", color: anzahlKritisch > 0 ? "#fff" : "inherit" }}>
          <div style={{ fontSize: 11, fontWeight: 600, opacity: anzahlKritisch > 0 ? 0.9 : undefined, color: anzahlKritisch > 0 ? undefined : "#6b7280" }}>⚠️ Budget kritisch</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 2 }}>{anzahlKritisch}</div>
          <div style={{ fontSize: 11, marginTop: 2, opacity: 0.85 }}>{anzahlKritisch > 0 ? "Kunden unter 10 %" : "Alle im grünen Bereich"}</div>
        </div>
      </div>

      {/* Suche */}
      <div style={{ marginBottom: 10 }}>
        <input style={inputStyle} placeholder="🔍 Name, Adresse oder Versicherungsnr. suchen..." value={suche} onChange={e => setSuche(e.target.value)} />
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <select style={selectStyle} value={filterPG} onChange={e => setFilterPG(e.target.value)}>
          <option value="alle">Alle PG</option>
          {[1,2,3,4,5].map(pg => <option key={pg} value={String(pg)}>PG {pg}</option>)}
        </select>
        <select style={selectStyle} value={filterParagraph} onChange={e => setFilterParagraph(e.target.value)}>
          <option value="alle">Alle §§</option>
          <option value="45b">§45b</option>
          <option value="45a">§45a</option>
          <option value="39">§39</option>
          <option value="privat">Privat</option>
        </select>
        <select style={selectStyle} value={sortBy} onChange={e => setSortBy(e.target.value as "name" | "pflegegrad" | "budget")}>
          <option value="name">A–Z</option>
          <option value="pflegegrad">Pflegegrad ↓</option>
          <option value="budget">Budget ↓</option>
        </select>
      </div>

      {/* Loading / Error */}
      {isLoading && <div style={{ textAlign: "center", padding: "30px 20px", color: "#9ca3af" }}>⏳ Lade Kunden...</div>}
      {isError && (
        <div style={{ textAlign: "center", padding: "20px", color: "#dc2626", background: "#fee2e2", borderRadius: 10, marginBottom: 12 }}>
          ❌ Fehler beim Laden
          <button onClick={() => refetch()} style={{ marginLeft: 10, padding: "4px 12px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>Erneut</button>
        </div>
      )}

      {/* Liste */}
      {!isLoading && !isError && gefiltert.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#9ca3af" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔍</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Keine Kunden gefunden</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Suchbegriff oder Filter anpassen</div>
          {isAdmin && kunden.length === 0 && (
            <button onClick={() => setShowNeuSheet(true)} style={{ marginTop: 16, padding: "12px 24px", background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              ➕ Ersten Kunden anlegen
            </button>
          )}
        </div>
      ) : (
        gefiltert.map(k => (
          <KundenKarte key={k.id} k={k} onClick={() => setSelectedKunde(k)} istKritisch={kritischeKundenIds.has(k.id)} />
        ))
      )}

      {/* Detail-Sheet */}
      {selectedKunde && !editKunde && (
        <KundenDetailSheet
          k={selectedKunde}
          onClose={() => setSelectedKunde(null)}
          onEdit={() => setEditKunde(selectedKunde)}
          onDeactivate={() => handleDeactivate(selectedKunde)}
          isAdmin={isAdmin}
        />
      )}

      {/* Bearbeiten-Sheet */}
      {editKunde && (
        <KundeFormSheet
          initialData={editKunde}
          kostentraegerListe={kostentraegerListe}
          onClose={() => setEditKunde(null)}
          onSave={handleSaveEdit}
          saving={saving}
        />
      )}

      {/* Neu-Sheet */}
      {showNeuSheet && (
        <KundeFormSheet
          kostentraegerListe={kostentraegerListe}
          onClose={() => setShowNeuSheet(false)}
          onSave={handleSaveNeu}
          saving={saving}
        />
      )}
    </div>
  );
}
