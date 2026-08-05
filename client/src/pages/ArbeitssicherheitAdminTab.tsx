import { useState } from "react";
import { trpc } from "@/lib/trpc";
import UnterweisungNachweisAdminTab from "./UnterweisungNachweisAdminTab";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// ─── Hilfsfunktionen ────────────────────────────────────────────────────────

function risikoAmpel(stufe: string) {
  if (stufe === "hoch") return { bg: "#fee2e2", color: "#dc2626", label: "🔴 Hoch" };
  if (stufe === "mittel") return { bg: "#fef9c3", color: "#ca8a04", label: "🟡 Mittel" };
  return { bg: "#dcfce7", color: "#16a34a", label: "🟢 Niedrig" };
}

function vorsorgeAmpel(faelligkeit: string | null, durchgefuehrt: string | null) {
  if (durchgefuehrt) return { bg: "#dcfce7", color: "#16a34a", label: "✅ Erledigt" };
  if (!faelligkeit) return { bg: "#f3f4f6", color: "#6b7280", label: "⬜ Offen" };
  const diff = new Date(faelligkeit).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days < 0) return { bg: "#fee2e2", color: "#dc2626", label: "🔴 Überfällig" };
  if (days <= 30) return { bg: "#fef9c3", color: "#ca8a04", label: `🟡 In ${days} Tagen` };
  return { bg: "#dcfce7", color: "#16a34a", label: `🟢 In ${days} Tagen` };
}

function unterweisungAmpel(bestaetigt: boolean, naechste: string | null) {
  if (!bestaetigt) return { bg: "#fee2e2", color: "#dc2626", label: "🔴 Ausstehend" };
  if (!naechste) return { bg: "#dcfce7", color: "#16a34a", label: "✅ Bestätigt" };
  const diff = new Date(naechste).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days < 0) return { bg: "#fee2e2", color: "#dc2626", label: "🔴 Wiederholung fällig" };
  if (days <= 60) return { bg: "#fef9c3", color: "#ca8a04", label: `🟡 Fällig in ${days} Tagen` };
  return { bg: "#dcfce7", color: "#16a34a", label: "✅ Aktuell" };
}

const BEREICH_LABELS: Record<string, string> = {
  haushalt_senior: "Haushalt beim Senioren",
  wegeunfall: "Wegeunfall / Dienstfahrt",
  ergonomie_physisch: "Ergonomie & physische Belastung",
  psychisch: "Psychische Belastung",
  hygiene_infektion: "Hygiene & Infektionsschutz",
  sonstiges: "Sonstiges",
};

const THEMEN_LABELS: Record<string, string> = {
  notfall_erste_hilfe: "Notfälle & Erste Hilfe",
  hygiene_desinfektion: "Hygiene & Desinfektion",
  ergonomie_heben_tragen: "Ergonomie / Heben & Tragen",
  deeskalation_demenz: "Deeskalation bei Demenz",
  verkehrssicherheit: "Verkehrssicherheit",
  psa_verwendung: "PSA-Verwendung",
  alleinarbeit_schutz: "Schutz bei Alleinarbeit",
  biostoff_infektionsschutz: "Biostoff & Infektionsschutz",
  sonstiges: "Sonstiges",
};

const PSA_LABELS: Record<string, string> = {
  einmalhandschuhe: "Einmalhandschuhe",
  ffp2_maske: "FFP2-Maske",
  mund_nasen_schutz: "Mund-Nasen-Schutz",
  schutzkittel: "Schutzkittel",
  schutzbrille: "Schutzbrille",
  desinfektionsmittel: "Händedesinfektionsmittel",
  sonstiges: "Sonstiges",
};

// ─── Sub-Tabs ────────────────────────────────────────────────────────────────

type SubTab = "dashboard" | "gefaehrdung" | "psa" | "vorsorge" | "unterweisungen" | "nachweise" | "alleinarbeit";

// ─── Dashboard ───────────────────────────────────────────────────────────────

function DashboardTab() {
  const { data } = trpc.arbeitssicherheit.dashboard.useQuery();
  const kpis = [
    { label: "Offene Gefährdungen", value: data?.offeneGefaehrdungen ?? 0, icon: "⚠️", color: data?.offeneGefaehrdungen ? "#dc2626" : "#16a34a" },
    { label: "PSA-Ausgaben gesamt", value: data?.psaAusgabenGesamt ?? 0, icon: "🦺", color: "#2563eb" },
    { label: "Überfällige Vorsorgen", value: data?.ueberfaelligeVorsorgen ?? 0, icon: "🏥", color: data?.ueberfaelligeVorsorgen ? "#dc2626" : "#16a34a" },
    { label: "Offene Alleinarbeit-Check-ins", value: data?.offeneAlleinarbeit ?? 0, icon: "👤", color: data?.offeneAlleinarbeit ? "#ca8a04" : "#16a34a" },
    { label: "Unbestätigte Unterweisungen", value: data?.offeneUnterweisungen ?? 0, icon: "📋", color: data?.offeneUnterweisungen ? "#dc2626" : "#16a34a" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
      {kpis.map((k) => (
        <div key={k.label} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 14px", textAlign: "center" }}>
          <div style={{ fontSize: 28 }}>{k.icon}</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: k.color }}>{k.value}</div>
          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{k.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Gefährdungsbeurteilung ───────────────────────────────────────────────────

function GefaehrdungTab() {
  
  const utils = trpc.useUtils();
  const { data = [] } = trpc.arbeitssicherheit.gefaehrdung.list.useQuery();
  const create = trpc.arbeitssicherheit.gefaehrdung.create.useMutation({ onSuccess: () => { utils.arbeitssicherheit.gefaehrdung.list.invalidate(); utils.arbeitssicherheit.dashboard.invalidate(); toast.success("Gefährdung erfasst"); }});
  const update = trpc.arbeitssicherheit.gefaehrdung.update.useMutation({ onSuccess: () => { utils.arbeitssicherheit.gefaehrdung.list.invalidate(); utils.arbeitssicherheit.dashboard.invalidate(); }});
  const del = trpc.arbeitssicherheit.gefaehrdung.delete.useMutation({ onSuccess: () => { utils.arbeitssicherheit.gefaehrdung.list.invalidate(); utils.arbeitssicherheit.dashboard.invalidate(); toast.success("Gelöscht"); }});

  const [form, setForm] = useState({ titel: "", bereich: "haushalt_senior" as any, risikobeschreibung: "", massnahmen: "", verantwortlich: "", risikoStufe: "mittel" as any, naechstePruefung: "" });
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState("alle");

  const filtered = filterStatus === "alle" ? data : data.filter((r: any) => r.status === filterStatus);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {["alle", "offen", "in_bearbeitung", "erledigt"].map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{ padding: "4px 12px", borderRadius: 20, border: "1px solid #d1d5db", background: filterStatus === s ? "#1e3a2f" : "#fff", color: filterStatus === s ? "#fff" : "#374151", fontSize: 12, cursor: "pointer" }}>
              {s === "alle" ? "Alle" : s === "in_bearbeitung" ? "In Bearbeitung" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>+ Neue Gefährdung</Button>
      </div>

      {showForm && (
        <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>Titel *</label><Input value={form.titel} onChange={(e) => setForm({ ...form, titel: e.target.value })} placeholder="z.B. Sturzgefahr im Treppenhaus" /></div>
            <div><label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>Bereich *</label>
              <Select value={form.bereich} onValueChange={(v) => setForm({ ...form, bereich: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(BEREICH_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div style={{ gridColumn: "1/-1" }}><label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>Risikobeschreibung *</label><Textarea value={form.risikobeschreibung} onChange={(e) => setForm({ ...form, risikobeschreibung: e.target.value })} rows={2} placeholder="Beschreiben Sie die Gefährdung..." /></div>
            <div style={{ gridColumn: "1/-1" }}><label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>Schutzmaßnahmen</label><Textarea value={form.massnahmen} onChange={(e) => setForm({ ...form, massnahmen: e.target.value })} rows={2} placeholder="Welche Maßnahmen werden ergriffen?" /></div>
            <div><label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>Verantwortlich</label><Input value={form.verantwortlich} onChange={(e) => setForm({ ...form, verantwortlich: e.target.value })} placeholder="Name / Funktion" /></div>
            <div><label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>Risikostufe</label>
              <Select value={form.risikoStufe} onValueChange={(v) => setForm({ ...form, risikoStufe: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="niedrig">🟢 Niedrig</SelectItem><SelectItem value="mittel">🟡 Mittel</SelectItem><SelectItem value="hoch">🔴 Hoch</SelectItem></SelectContent>
              </Select>
            </div>
            <div><label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>Nächste Prüfung</label><Input type="date" value={form.naechstePruefung} onChange={(e) => setForm({ ...form, naechstePruefung: e.target.value })} /></div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Button size="sm" onClick={() => { if (!form.titel || !form.risikobeschreibung) { toast.error("Titel und Beschreibung sind Pflichtfelder"); return; } create.mutate({ ...form, naechstePruefung: form.naechstePruefung || undefined }); setShowForm(false); setForm({ titel: "", bereich: "haushalt_senior", risikobeschreibung: "", massnahmen: "", verantwortlich: "", risikoStufe: "mittel", naechstePruefung: "" }); }}>Speichern</Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Abbrechen</Button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.length === 0 && <div style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>Keine Einträge vorhanden</div>}
        {filtered.map((r: any) => {
          const ampel = risikoAmpel(r.risikoStufe);
          return (
            <div key={r.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{r.titel}</span>
                    <span style={{ background: ampel.bg, color: ampel.color, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>{ampel.label}</span>
                    <span style={{ background: "#f3f4f6", color: "#374151", borderRadius: 20, padding: "2px 10px", fontSize: 11 }}>{BEREICH_LABELS[r.bereich] ?? r.bereich}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>{r.risikobeschreibung}</div>
                  {r.massnahmen && <div style={{ fontSize: 12, color: "#374151", marginTop: 4 }}>📌 {r.massnahmen}</div>}
                  {r.verantwortlich && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Verantwortlich: {r.verantwortlich}</div>}
                </div>
                <div style={{ display: "flex", gap: 6, marginLeft: 12 }}>
                  {r.status !== "erledigt" && (
                    <button onClick={() => update.mutate({ id: r.id, status: r.status === "offen" ? "in_bearbeitung" : "erledigt" })} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #d1d5db", background: "#f9fafb", fontSize: 11, cursor: "pointer" }}>
                      {r.status === "offen" ? "→ In Bearbeitung" : "→ Erledigt"}
                    </button>
                  )}
                  <button onClick={() => { if (confirm("Gefährdung löschen?")) del.mutate({ id: r.id }); }} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #fee2e2", background: "#fff5f5", color: "#dc2626", fontSize: 11, cursor: "pointer" }}>🗑</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── PSA-Verwaltung ───────────────────────────────────────────────────────────

function PsaTab() {
  
  const utils = trpc.useUtils();
  const { data: allMa = [] } = trpc.admin.mitarbeiterList.useQuery();
  const { data = [] } = trpc.arbeitssicherheit.psa.listAll.useQuery();
  const create = trpc.arbeitssicherheit.psa.create.useMutation({ onSuccess: () => { utils.arbeitssicherheit.psa.listAll.invalidate(); toast.success("PSA-Ausgabe erfasst"); }});
  const rueckgabe = trpc.arbeitssicherheit.psa.rueckgabe.useMutation({ onSuccess: () => { utils.arbeitssicherheit.psa.listAll.invalidate(); toast.success("Rückgabe vermerkt"); }});
  const del = trpc.arbeitssicherheit.psa.delete.useMutation({ onSuccess: () => { utils.arbeitssicherheit.psa.listAll.invalidate(); toast.success("Gelöscht"); }});

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ mitarbeiterId: "", psaTyp: "einmalhandschuhe" as any, groesse: "", menge: "1", ausgabeDatum: new Date().toISOString().split("T")[0], notizen: "" });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>+ PSA ausgeben</Button>
      </div>

      {showForm && (
        <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div><label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>Mitarbeiter *</label>
              <Select value={form.mitarbeiterId} onValueChange={(v) => setForm({ ...form, mitarbeiterId: v })}>
                <SelectTrigger><SelectValue placeholder="Auswählen..." /></SelectTrigger>
                <SelectContent>{allMa.map((m: any) => <SelectItem key={m.id} value={String(m.id)}>{m.vorname} {m.nachname}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PSA-Typ *</label>
              <Select value={form.psaTyp} onValueChange={(v) => setForm({ ...form, psaTyp: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(PSA_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>Größe</label><Input value={form.groesse} onChange={(e) => setForm({ ...form, groesse: e.target.value })} placeholder="S/M/L/XL" /></div>
            <div><label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>Menge</label><Input type="number" min={1} value={form.menge} onChange={(e) => setForm({ ...form, menge: e.target.value })} /></div>
            <div><label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>Ausgabedatum *</label><Input type="date" value={form.ausgabeDatum} onChange={(e) => setForm({ ...form, ausgabeDatum: e.target.value })} /></div>
            <div><label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>Notizen</label><Input value={form.notizen} onChange={(e) => setForm({ ...form, notizen: e.target.value })} placeholder="Optional..." /></div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Button size="sm" onClick={() => { if (!form.mitarbeiterId || !form.ausgabeDatum) { toast.error("Pflichtfelder fehlen"); return; } create.mutate({ mitarbeiterId: Number(form.mitarbeiterId), psaTyp: form.psaTyp, groesse: form.groesse || undefined, menge: Number(form.menge), ausgabeDatum: form.ausgabeDatum, notizen: form.notizen || undefined }); setShowForm(false); }}>Speichern</Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Abbrechen</Button>
          </div>
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr style={{ background: "#f9fafb" }}>
            {["Mitarbeiter", "PSA-Typ", "Größe", "Menge", "Ausgabe", "Rückgabe", "Zustand", "Aktionen"].map((h) => <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {data.length === 0 && <tr><td colSpan={8} style={{ textAlign: "center", color: "#9ca3af", padding: 24 }}>Keine Einträge</td></tr>}
            {data.map((r: any) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "8px 10px" }}>{r.maVorname} {r.maNachname}</td>
                <td style={{ padding: "8px 10px" }}>{PSA_LABELS[r.psaTyp] ?? r.psaTyp}</td>
                <td style={{ padding: "8px 10px" }}>{r.groesse ?? "–"}</td>
                <td style={{ padding: "8px 10px" }}>{r.menge}</td>
                <td style={{ padding: "8px 10px" }}>{r.ausgabeDatum}</td>
                <td style={{ padding: "8px 10px" }}>{r.rueckgabeDatum ?? "–"}</td>
                <td style={{ padding: "8px 10px" }}>
                  <span style={{ background: r.zustand === "zurueckgegeben" ? "#dcfce7" : r.zustand === "beschaedigt" ? "#fee2e2" : "#f3f4f6", color: r.zustand === "zurueckgegeben" ? "#16a34a" : r.zustand === "beschaedigt" ? "#dc2626" : "#374151", borderRadius: 20, padding: "2px 8px", fontSize: 11 }}>
                    {r.zustand === "zurueckgegeben" ? "Zurückgegeben" : r.zustand === "beschaedigt" ? "Beschädigt" : r.zustand === "gut" ? "Gut" : "Neu"}
                  </span>
                </td>
                <td style={{ padding: "8px 10px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    {!r.rueckgabeDatum && <button onClick={() => rueckgabe.mutate({ id: r.id, rueckgabeDatum: new Date().toISOString().split("T")[0] })} style={{ padding: "3px 8px", borderRadius: 6, border: "1px solid #d1d5db", background: "#f9fafb", fontSize: 11, cursor: "pointer" }}>Rückgabe</button>}
                    <button onClick={() => { if (confirm("Eintrag löschen?")) del.mutate({ id: r.id }); }} style={{ padding: "3px 8px", borderRadius: 6, border: "1px solid #fee2e2", background: "#fff5f5", color: "#dc2626", fontSize: 11, cursor: "pointer" }}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Arbeitsmedizinische Vorsorge ─────────────────────────────────────────────

function VorsorgeTab() {
  
  const utils = trpc.useUtils();
  const { data: allMa = [] } = trpc.admin.mitarbeiterList.useQuery();
  const { data = [] } = trpc.arbeitssicherheit.vorsorge.listAll.useQuery();
  const create = trpc.arbeitssicherheit.vorsorge.create.useMutation({ onSuccess: () => { utils.arbeitssicherheit.vorsorge.listAll.invalidate(); utils.arbeitssicherheit.dashboard.invalidate(); toast.success("Vorsorge erfasst"); }});
  const abschliessen = trpc.arbeitssicherheit.vorsorge.abschliessen.useMutation({ onSuccess: () => { utils.arbeitssicherheit.vorsorge.listAll.invalidate(); utils.arbeitssicherheit.dashboard.invalidate(); toast.success("Vorsorge abgeschlossen"); }});
  const del = trpc.arbeitssicherheit.vorsorge.delete.useMutation({ onSuccess: () => { utils.arbeitssicherheit.vorsorge.listAll.invalidate(); toast.success("Gelöscht"); }});

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ mitarbeiterId: "", vorsorgeart: "pflicht" as any, anlass: "", faelligkeit: "", arzt: "", notizen: "" });
  const [abschlussId, setAbschlussId] = useState<number | null>(null);
  const [abschlussForm, setAbschlussForm] = useState({ durchgefuehrtAm: new Date().toISOString().split("T")[0], ergebnis: "geeignet" as any, arzt: "", naechsteFaelligkeit: "" });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>+ Vorsorge erfassen</Button>
      </div>

      {showForm && (
        <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div><label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>Mitarbeiter *</label>
              <Select value={form.mitarbeiterId} onValueChange={(v) => setForm({ ...form, mitarbeiterId: v })}>
                <SelectTrigger><SelectValue placeholder="Auswählen..." /></SelectTrigger>
                <SelectContent>{allMa.map((m: any) => <SelectItem key={m.id} value={String(m.id)}>{m.vorname} {m.nachname}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>Art *</label>
              <Select value={form.vorsorgeart} onValueChange={(v) => setForm({ ...form, vorsorgeart: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="pflicht">Pflichtvorsorge</SelectItem><SelectItem value="angebot">Angebotsvorsorge</SelectItem><SelectItem value="wunsch">Wunschvorsorge</SelectItem></SelectContent>
              </Select>
            </div>
            <div><label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>Anlass *</label><Input value={form.anlass} onChange={(e) => setForm({ ...form, anlass: e.target.value })} placeholder="z.B. Infektionsgefahr, Feuchtarbeit" /></div>
            <div><label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>Fälligkeit *</label><Input type="date" value={form.faelligkeit} onChange={(e) => setForm({ ...form, faelligkeit: e.target.value })} /></div>
            <div><label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>Arzt / Praxis</label><Input value={form.arzt} onChange={(e) => setForm({ ...form, arzt: e.target.value })} placeholder="Optional" /></div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Button size="sm" onClick={() => { if (!form.mitarbeiterId || !form.anlass || !form.faelligkeit) { toast.error("Pflichtfelder fehlen"); return; } create.mutate({ mitarbeiterId: Number(form.mitarbeiterId), vorsorgeart: form.vorsorgeart, anlass: form.anlass, faelligkeit: form.faelligkeit, arzt: form.arzt || undefined }); setShowForm(false); }}>Speichern</Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Abbrechen</Button>
          </div>
        </div>
      )}

      {abschlussId !== null && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Vorsorge abschließen</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div><label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>Durchgeführt am</label><Input type="date" value={abschlussForm.durchgefuehrtAm} onChange={(e) => setAbschlussForm({ ...abschlussForm, durchgefuehrtAm: e.target.value })} /></div>
            <div><label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>Ergebnis</label>
              <Select value={abschlussForm.ergebnis} onValueChange={(v) => setAbschlussForm({ ...abschlussForm, ergebnis: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="geeignet">✅ Geeignet</SelectItem><SelectItem value="bedingt_geeignet">🟡 Bedingt geeignet</SelectItem><SelectItem value="nicht_geeignet">🔴 Nicht geeignet</SelectItem></SelectContent>
              </Select>
            </div>
            <div><label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>Nächste Fälligkeit</label><Input type="date" value={abschlussForm.naechsteFaelligkeit} onChange={(e) => setAbschlussForm({ ...abschlussForm, naechsteFaelligkeit: e.target.value })} /></div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Button size="sm" onClick={() => { abschliessen.mutate({ id: abschlussId!, ...abschlussForm, naechsteFaelligkeit: abschlussForm.naechsteFaelligkeit || undefined }); setAbschlussId(null); }}>Abschließen</Button>
            <Button size="sm" variant="outline" onClick={() => setAbschlussId(null)}>Abbrechen</Button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {data.length === 0 && <div style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>Keine Einträge</div>}
        {data.map((r: any) => {
          const ampel = vorsorgeAmpel(r.faelligkeit, r.durchgefuehrtAm);
          return (
            <div key={r.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{r.maVorname} {r.maNachname}</span>
                  <span style={{ background: "#f3f4f6", color: "#374151", borderRadius: 20, padding: "2px 8px", fontSize: 11 }}>{r.vorsorgeart === "pflicht" ? "Pflicht" : r.vorsorgeart === "angebot" ? "Angebot" : "Wunsch"}</span>
                  <span style={{ background: ampel.bg, color: ampel.color, borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{ampel.label}</span>
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{r.anlass} {r.arzt ? `· ${r.arzt}` : ""}</div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>Fällig: {r.faelligkeit} {r.naechsteFaelligkeit ? `· Nächste: ${r.naechsteFaelligkeit}` : ""}</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {!r.durchgefuehrtAm && <button onClick={() => setAbschlussId(r.id)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #d1d5db", background: "#f9fafb", fontSize: 11, cursor: "pointer" }}>Abschließen</button>}
                <button onClick={() => { if (confirm("Eintrag löschen?")) del.mutate({ id: r.id }); }} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #fee2e2", background: "#fff5f5", color: "#dc2626", fontSize: 11, cursor: "pointer" }}>🗑</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Unterweisungen ───────────────────────────────────────────────────────────

function UnterweisungenTab() {
  
  const utils = trpc.useUtils();
  const { data: allMa = [] } = trpc.admin.mitarbeiterList.useQuery();
  const { data = [] } = trpc.arbeitssicherheit.unterweisung.listAll.useQuery();
  const create = trpc.arbeitssicherheit.unterweisung.adminCreate.useMutation({ onSuccess: () => { utils.arbeitssicherheit.unterweisung.listAll.invalidate(); utils.arbeitssicherheit.dashboard.invalidate(); toast.success("Unterweisung erfasst"); }});
  const del = trpc.arbeitssicherheit.unterweisung.delete.useMutation({ onSuccess: () => { utils.arbeitssicherheit.unterweisung.listAll.invalidate(); toast.success("Gelöscht"); }});

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ mitarbeiterId: "", thema: "notfall_erste_hilfe" as any, unterweisungsDatum: new Date().toISOString().split("T")[0], inhalt: "" });
  const [filterThema, setFilterThema] = useState("alle");

  const filtered = filterThema === "alle" ? data : data.filter((r: any) => r.thema === filterThema);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Select value={filterThema} onValueChange={setFilterThema}>
          <SelectTrigger style={{ width: 220 }}><SelectValue placeholder="Alle Themen" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Themen</SelectItem>
            {Object.entries(THEMEN_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>+ Unterweisung erfassen</Button>
      </div>

      {showForm && (
        <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div><label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>Mitarbeiter *</label>
              <Select value={form.mitarbeiterId} onValueChange={(v) => setForm({ ...form, mitarbeiterId: v })}>
                <SelectTrigger><SelectValue placeholder="Auswählen..." /></SelectTrigger>
                <SelectContent>{allMa.map((m: any) => <SelectItem key={m.id} value={String(m.id)}>{m.vorname} {m.nachname}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>Thema *</label>
              <Select value={form.thema} onValueChange={(v) => setForm({ ...form, thema: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(THEMEN_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>Datum *</label><Input type="date" value={form.unterweisungsDatum} onChange={(e) => setForm({ ...form, unterweisungsDatum: e.target.value })} /></div>
            <div style={{ gridColumn: "1/-1" }}><label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>Inhalt / Notizen</label><Textarea value={form.inhalt} onChange={(e) => setForm({ ...form, inhalt: e.target.value })} rows={2} placeholder="Kurze Beschreibung der Unterweisung..." /></div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Button size="sm" onClick={() => { if (!form.mitarbeiterId || !form.unterweisungsDatum) { toast.error("Pflichtfelder fehlen"); return; } create.mutate({ mitarbeiterId: Number(form.mitarbeiterId), thema: form.thema, unterweisungsDatum: form.unterweisungsDatum, inhalt: form.inhalt || undefined }); setShowForm(false); }}>Speichern</Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Abbrechen</Button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.length === 0 && <div style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>Keine Einträge</div>}
        {filtered.map((r: any) => {
          const ampel = unterweisungAmpel(r.bestaetigt, r.naechsteFaelligkeit);
          return (
            <div key={r.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{r.maVorname} {r.maNachname}</span>
                  <span style={{ background: "#f3f4f6", color: "#374151", borderRadius: 20, padding: "2px 8px", fontSize: 11 }}>{THEMEN_LABELS[r.thema] ?? r.thema}</span>
                  <span style={{ background: ampel.bg, color: ampel.color, borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{ampel.label}</span>
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Datum: {r.unterweisungsDatum} {r.naechsteFaelligkeit ? `· Wiederholung: ${r.naechsteFaelligkeit}` : ""}</div>
                {r.inhalt && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{r.inhalt}</div>}
              </div>
              <button onClick={() => { if (confirm("Eintrag löschen?")) del.mutate({ id: r.id }); }} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #fee2e2", background: "#fff5f5", color: "#dc2626", fontSize: 11, cursor: "pointer" }}>🗑</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Alleinarbeit-Monitor ─────────────────────────────────────────────────────

function AlleinarbeitTab() {
  const utils = trpc.useUtils();
  const { data = [] } = trpc.arbeitssicherheit.alleinarbeit.listOffen.useQuery(undefined, { refetchInterval: 60000 });
  const notfall = trpc.arbeitssicherheit.alleinarbeit.notfallMelden.useMutation({ onSuccess: () => utils.arbeitssicherheit.alleinarbeit.listOffen.invalidate() });

  function stunden(checkIn: Date | string | null): string {
    if (!checkIn) return "–";
    const diff = Date.now() - new Date(checkIn).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}min`;
  }

  function warnung(checkIn: Date | string | null): boolean {
    if (!checkIn) return false;
    return Date.now() - new Date(checkIn).getTime() > 4 * 3600000;
  }

  return (
    <div>
      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13 }}>
        <strong>ℹ️ Alleinarbeitsschutz (§6 ArbSchG):</strong> Mitarbeiter im Allein-Einsatz checken sich ein. Bei mehr als 4 Stunden ohne Check-out erscheint eine Warnung. Bitte regelmäßig prüfen.
      </div>
      <div style={{ fontWeight: 700, marginBottom: 12 }}>Aktive Check-ins ({data.length})</div>
      {data.length === 0 && <div style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>Keine offenen Check-ins</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {data.map((r: any) => {
          const istWarnung = warnung(r.checkInZeit);
          return (
            <div key={r.id} style={{ background: istWarnung ? "#fff7ed" : "#fff", border: `1px solid ${istWarnung ? "#fed7aa" : "#e5e7eb"}`, borderRadius: 10, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{r.maVorname} {r.maNachname}</span>
                  {istWarnung && <span style={{ background: "#fee2e2", color: "#dc2626", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>⚠️ Überfällig ({stunden(r.checkInZeit)})</span>}
                  {!istWarnung && <span style={{ background: "#dcfce7", color: "#16a34a", borderRadius: 20, padding: "2px 10px", fontSize: 11 }}>✅ Aktiv ({stunden(r.checkInZeit)})</span>}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                  Check-in: {r.checkInZeit ? new Date(r.checkInZeit).toLocaleString("de-DE") : "–"}
                  {r.notfallKontakt ? ` · Notfallkontakt: ${r.notfallKontakt}` : ""}
                </div>
              </div>
              {istWarnung && (
                <button onClick={() => { if (confirm("Notfall melden? Der Status wird auf 'Notfall' gesetzt.")) notfall.mutate({ id: r.id }); }} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#dc2626", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🚨 Notfall</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

export function ArbeitssicherheitAdminTab() {
  const [subTab, setSubTab] = useState<SubTab>("dashboard");
  const { data: kpis } = trpc.arbeitssicherheit.dashboard.useQuery();

  const tabs: { key: SubTab; label: string; badge?: number }[] = [
    { key: "dashboard", label: "📊 Übersicht" },
    { key: "gefaehrdung", label: "⚠️ Gefährdungsbeurteilung", badge: kpis?.offeneGefaehrdungen },
    { key: "psa", label: "🦺 PSA-Ausgaben" },
    { key: "vorsorge", label: "🏥 Arbeitsmed. Vorsorge", badge: kpis?.ueberfaelligeVorsorgen },
    { key: "unterweisungen", label: "📋 Unterweisungen", badge: kpis?.offeneUnterweisungen },
    { key: "nachweise", label: "📜 Nachweise" },
    { key: "alleinarbeit", label: "👤 Alleinarbeit-Monitor", badge: kpis?.offeneAlleinarbeit },
  ];

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1e3a2f", margin: 0 }}>🦺 Arbeitssicherheit</h2>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>§5 ArbSchG · DGUV V2 · BioStoffV · ArbMedVV · §12 ArbSchG</p>
      </div>

      {/* Sub-Tab-Navigation */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 20, borderBottom: "1px solid #e5e7eb", paddingBottom: 12 }}>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setSubTab(t.key)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: subTab === t.key ? "#1e3a2f" : "#f3f4f6", color: subTab === t.key ? "#fff" : "#374151", fontSize: 13, fontWeight: subTab === t.key ? 700 : 400, cursor: "pointer", position: "relative" }}>
            {t.label}
            {t.badge !== undefined && t.badge > 0 && (
              <span style={{ position: "absolute", top: -4, right: -4, background: "#dc2626", color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {subTab === "dashboard" && <DashboardTab />}
      {subTab === "gefaehrdung" && <GefaehrdungTab />}
      {subTab === "psa" && <PsaTab />}
      {subTab === "vorsorge" && <VorsorgeTab />}
      {subTab === "unterweisungen" && <UnterweisungenTab />}
      {subTab === "nachweise" && <UnterweisungNachweisAdminTab />}
      {subTab === "alleinarbeit" && <AlleinarbeitTab />}
    </div>
  );
}
