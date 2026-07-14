import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type DokTyp = "zertifikat" | "arbeitsvertrag" | "krankmeldung" | "fuehrerschein" | "erstehilfe" | "sonstiges";

const TYP_LABELS: Record<DokTyp, { label: string; icon: string; color: string }> = {
  zertifikat:    { label: "Zertifikat",       icon: "🏅", color: "lw-badge-green" },
  arbeitsvertrag:{ label: "Arbeitsvertrag",   icon: "📄", color: "lw-badge-blue" },
  krankmeldung:  { label: "Krankmeldung",     icon: "🏥", color: "lw-badge-red" },
  fuehrerschein: { label: "Führerschein",     icon: "🚗", color: "lw-badge-yellow" },
  erstehilfe:    { label: "Erste Hilfe",      icon: "❤️‍🩹", color: "lw-badge-orange" },
  sonstiges:     { label: "Sonstiges",        icon: "📎", color: "lw-badge-gray" },
};

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "–";
  const s = typeof d === "string" ? d : d.toISOString().split("T")[0];
  const [y, m, day] = s.split("-");
  return `${day}.${m}.${y}`;
}

function isAbgelaufen(ablauf: string | Date | null | undefined) {
  if (!ablauf) return false;
  const s = typeof ablauf === "string" ? ablauf : ablauf.toISOString().split("T")[0];
  return new Date(s) < new Date();
}

function laueftBaldAb(ablauf: string | Date | null | undefined) {
  if (!ablauf) return false;
  const s = typeof ablauf === "string" ? ablauf : ablauf.toISOString().split("T")[0];
  const diff = (new Date(s).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 30;
}

export default function Mitarbeiterakte() {
  const { data: me } = trpc.portal.me.useQuery();
  const { data: allMa } = trpc.admin.mitarbeiterList.useQuery();
  const isAdmin = me?.rolle === "admin";

  const [selectedMaId, setSelectedMaId] = useState<number | null>(null);
  const targetId = isAdmin && selectedMaId ? selectedMaId : (me?.id ?? null);

  const { data: dokumente = [], refetch } = trpc.mitarbeiterakte.listDokumente.useQuery(
    { mitarbeiterId: targetId ?? undefined },
    { enabled: !!targetId }
  );

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    typ: "zertifikat" as DokTyp,
    bezeichnung: "",
    dateiUrl: "",
    dateiname: "",
    ausstellungsdatum: "",
    ablaufdatum: "",
    notizen: "",
  });

  const addMut = trpc.mitarbeiterakte.addDokument.useMutation({
    onSuccess: () => {
      refetch();
      setShowForm(false);
      setForm({ typ: "zertifikat", bezeichnung: "", dateiUrl: "", dateiname: "", ausstellungsdatum: "", ablaufdatum: "", notizen: "" });
      toast.success("Dokument gespeichert!");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = trpc.mitarbeiterakte.deleteDokument.useMutation({
    onSuccess: () => { refetch(); toast.success("Dokument gelöscht"); },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    if (!form.bezeichnung.trim()) { toast.error("Bezeichnung erforderlich"); return; }
    addMut.mutate({ ...form, mitarbeiterId: targetId ?? undefined });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const grouped = (dokumente as any[]).reduce((acc: Record<string, any[]>, d: any) => {
    if (!acc[d.typ]) acc[d.typ] = [];
    acc[d.typ].push(d);
    return acc;
  }, {} as Record<DokTyp, typeof dokumente>);

  const selectedMa = allMa?.find((m: { id: number }) => m.id === targetId);

  return (
    <div className="lw-page">
      <div className="lw-page-header">
        <div>
          <div className="lw-page-title">Mitarbeiterakte</div>
          <div className="lw-page-subtitle">Zertifikate, Verträge & Dokumente</div>
        </div>
        <button className="lw-btn lw-btn-primary" onClick={() => setShowForm(true)}>
          + Dokument hinzufügen
        </button>
      </div>

      {/* Admin: Mitarbeiter-Auswahl */}
      {isAdmin && (
        <div className="lw-card" style={{ marginBottom: "1.25rem" }}>
          <div className="lw-card-body">
            <label className="lw-label">Mitarbeiter auswählen</label>
            <select
              className="lw-input"
              value={selectedMaId ?? ""}
              onChange={e => setSelectedMaId(Number(e.target.value) || null)}
            >
              <option value="">– Eigene Akte –</option>
              {(allMa ?? []).map((m: { id: number; vorname: string; nachname: string }) => (
                <option key={m.id} value={m.id}>{m.vorname} {m.nachname}</option>
              ))}
            </select>
            {selectedMa && (
              <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "var(--lw-gray-500)" }}>
                Akte von: <strong>{selectedMa.vorname} {selectedMa.nachname}</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dokument-Formular */}
      {showForm && (
        <div className="lw-card" style={{ marginBottom: "1.25rem", border: "2px solid var(--lw-green-400)" }}>
          <div className="lw-card-header">
            <div style={{ fontWeight: 700 }}>📎 Neues Dokument</div>
            <button className="lw-btn lw-btn-ghost lw-btn-sm" onClick={() => setShowForm(false)}>✕</button>
          </div>
          <div className="lw-card-body">
            <div className="lw-grid-2" style={{ marginBottom: "0.75rem" }}>
              <div>
                <label className="lw-label">Typ *</label>
                <select className="lw-input" value={form.typ} onChange={e => setForm(f => ({ ...f, typ: e.target.value as DokTyp }))}>
                  {Object.entries(TYP_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="lw-label">Bezeichnung *</label>
                <input className="lw-input" placeholder="z.B. Erste-Hilfe-Kurs 2024" value={form.bezeichnung} onChange={e => setForm(f => ({ ...f, bezeichnung: e.target.value }))} />
              </div>
            </div>
            <div className="lw-grid-2" style={{ marginBottom: "0.75rem" }}>
              <div>
                <label className="lw-label">Ausstellungsdatum</label>
                <input type="date" className="lw-input" value={form.ausstellungsdatum} onChange={e => setForm(f => ({ ...f, ausstellungsdatum: e.target.value }))} />
              </div>
              <div>
                <label className="lw-label">Ablaufdatum</label>
                <input type="date" className="lw-input" value={form.ablaufdatum} onChange={e => setForm(f => ({ ...f, ablaufdatum: e.target.value }))} />
              </div>
            </div>
            <div style={{ marginBottom: "0.75rem" }}>
              <label className="lw-label">Datei-URL (optional)</label>
              <input className="lw-input" placeholder="https://..." value={form.dateiUrl} onChange={e => setForm(f => ({ ...f, dateiUrl: e.target.value }))} />
            </div>
            <div style={{ marginBottom: "0.75rem" }}>
              <label className="lw-label">Notizen</label>
              <textarea className="lw-input" rows={2} placeholder="Zusätzliche Informationen..." value={form.notizen} onChange={e => setForm(f => ({ ...f, notizen: e.target.value }))} />
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="lw-btn lw-btn-primary" onClick={handleSave} disabled={addMut.isPending}>
                {addMut.isPending ? "Speichern…" : "💾 Speichern"}
              </button>
              <button className="lw-btn lw-btn-secondary" onClick={() => setShowForm(false)}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}

      {/* Dokumente nach Typ gruppiert */}
      {dokumente.length === 0 ? (
        <div className="lw-card">
          <div className="lw-empty">
            <div className="lw-empty-icon">📂</div>
            <div className="lw-empty-text">Noch keine Dokumente vorhanden</div>
            <div className="lw-empty-sub">Klicke auf „Dokument hinzufügen" um zu starten</div>
          </div>
        </div>
      ) : (
        (Object.keys(TYP_LABELS) as DokTyp[]).map(typ => {
          const docs = grouped[typ];
          if (!docs || docs.length === 0) return null;
          const { label, icon } = TYP_LABELS[typ];
          return (
            <div key={typ} className="lw-card" style={{ marginBottom: "1.25rem" }}>
              <div className="lw-card-header">
                <div style={{ fontWeight: 700, fontSize: "1rem" }}>{icon} {label}</div>
                <span className="lw-badge lw-badge-gray">{docs.length}</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="lw-table">
                  <thead>
                    <tr>
                      <th>Bezeichnung</th>
                      <th>Ausgestellt</th>
                      <th>Ablauf</th>
                      <th>Status</th>
                      <th>Datei</th>
                      {isAdmin && <th>Aktion</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(docs as Array<{
                      id: number;
                      bezeichnung: string;
                      ausstellungsdatum: string | Date | null;
                      ablaufdatum: string | Date | null;
                      dateiUrl: string | null;
                      dateiname: string | null;
                      notizen: string | null;
                    }>).map(d => {
                      const abgelaufen = isAbgelaufen(d.ablaufdatum);
                      const baldAb = laueftBaldAb(d.ablaufdatum);
                      return (
                        <tr key={d.id}>
                          <td style={{ fontWeight: 600 }}>
                            {d.bezeichnung}
                            {d.notizen && <div style={{ fontSize: "0.75rem", color: "var(--lw-gray-500)", marginTop: 2 }}>{d.notizen}</div>}
                          </td>
                          <td>{fmtDate(d.ausstellungsdatum)}</td>
                          <td>{fmtDate(d.ablaufdatum)}</td>
                          <td>
                            {abgelaufen ? (
                              <span className="lw-badge lw-badge-red">⚠️ Abgelaufen</span>
                            ) : baldAb ? (
                              <span className="lw-badge lw-badge-yellow">⏰ Läuft bald ab</span>
                            ) : d.ablaufdatum ? (
                              <span className="lw-badge lw-badge-green">✓ Gültig</span>
                            ) : (
                              <span className="lw-badge lw-badge-gray">–</span>
                            )}
                          </td>
                          <td>
                            {d.dateiUrl ? (
                              <a href={d.dateiUrl} target="_blank" rel="noreferrer" className="lw-btn lw-btn-ghost lw-btn-sm">
                                📥 Öffnen
                              </a>
                            ) : "–"}
                          </td>
                          {isAdmin && (
                            <td>
                              <button
                                className="lw-btn lw-btn-ghost lw-btn-sm"
                                style={{ color: "var(--lw-red)" }}
                                onClick={() => { if (confirm("Dokument löschen?")) deleteMut.mutate({ id: d.id }); }}
                              >
                                🗑️
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
