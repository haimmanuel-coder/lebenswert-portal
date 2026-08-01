import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "–";
  const s = typeof d === "string" ? d.split("T")[0] : d.toISOString().split("T")[0];
  const [y, m, day] = s.split("-");
  return `${day}.${m}.${y}`;
}

// ── P2: DSGVO-Vertretungs-Übernahme-Panel ──────────────────────────────────────
function VertretungsUebernahmePanel() {
  const { data: meineAktiven = [] } = (trpc as any).vertretungUebernahme.meineAktiven.useQuery();
  const [showUebernahme, setShowUebernahme] = useState(false);
  const [urlaubsantragId, setUrlaubsantragId] = useState("");
  const [kundenId, setKundenId] = useState("");
  const [vollzugriffBis, setVollzugriffBis] = useState("");
  const utils = trpc.useUtils();

  const uebernehmen = (trpc as any).vertretungUebernahme.uebernahme.useMutation({
    onSuccess: () => {
      toast.success("✅ Vertretungs-Übernahme bestätigt! Vollzugriff aktiv.");
      setShowUebernahme(false);
      (utils as any).vertretungUebernahme.meineAktiven.invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="lw-card" style={{ marginBottom: "1.25rem", border: "2px solid #bae6fd" }}>
      <div className="lw-card-header">
        <div style={{ fontWeight: 700 }}>🛡️ DSGVO-Vertretungs-Übernahme (P2)</div>
        <button className="lw-btn lw-btn-primary lw-btn-sm" onClick={() => setShowUebernahme(!showUebernahme)}>
          {showUebernahme ? "Schließen" : "+ Übernahme bestätigen"}
        </button>
      </div>
      <div className="lw-card-body">
        <div style={{ fontSize: 13, color: "#0369a1", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
          ℹ️ Wenn du einen Kunden während des Urlaubs eines Kollegen übernimmst, bestätige hier die DSGVO-konforme Übernahme. Du erhältst temporären Vollzugriff auf die Kundendaten.
        </div>

        {/* Aktive Übernahmen */}
        {(meineAktiven as any[]).length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>AKTIVE ÜBERNAHMEN</div>
            {(meineAktiven as any[]).map((v: any) => (
              <div key={v.id} style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "8px 12px", marginBottom: 6, fontSize: 13 }}>
                ✅ Kunde #{v.kundenId} – Vollzugriff bis {v.vollzugriffBis ? new Date(v.vollzugriffBis).toLocaleDateString("de-DE") : "–"}
              </div>
            ))}
          </div>
        )}

        {/* Übernahme-Formular */}
        {showUebernahme && (
          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <label className="lw-label">Urlaubsantrags-ID (vom Admin mitgeteilt)</label>
              <input className="lw-input" type="number" value={urlaubsantragId} onChange={e => setUrlaubsantragId(e.target.value)} placeholder="z.B. 42" />
            </div>
            <div>
              <label className="lw-label">Kunden-ID</label>
              <input className="lw-input" type="number" value={kundenId} onChange={e => setKundenId(e.target.value)} placeholder="z.B. 7" />
            </div>
            <div>
              <label className="lw-label">Vollzugriff bis (Datum)</label>
              <input className="lw-input" type="date" value={vollzugriffBis} onChange={e => setVollzugriffBis(e.target.value)} />
            </div>
            <div style={{ background: "#fef9c3", border: "1px solid #fcd34d", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#92400e" }}>
              ⚠️ <strong>DSGVO-Hinweis:</strong> Du bestätigst, dass du die Kundendaten nur für die Vertretungszeit und ausschließlich für die Pflege des Kunden nutzt. Nach Ablauf wird der Zugriff automatisch entzogen.
            </div>
            <button
              className="lw-btn lw-btn-primary"
              disabled={!urlaubsantragId || !kundenId || !vollzugriffBis || uebernehmen.isPending}
              onClick={() => uebernehmen.mutate({ urlaubsantragId: Number(urlaubsantragId), kundenId: Number(kundenId), vollzugriffBisDatum: vollzugriffBis })}
            >
              {uebernehmen.isPending ? "Wird gespeichert..." : "✅ DSGVO-Übernahme bestätigen"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Vertretungen() {
  const { data: me } = trpc.portal.me.useQuery();
  const isAdmin = me?.rolle === "admin";

  const { data: allMa = [] } = trpc.admin.mitarbeiterList.useQuery();
  const { data: vertretungen = [], refetch } = trpc.vertretungen.list.useQuery(undefined, { enabled: isAdmin });
  const { data: meineVertretungen = [] } = trpc.vertretungen.meineVertretungen.useQuery(undefined, { enabled: !isAdmin });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ vertreterId: "", vertretenId: "", von: "", bis: "", grund: "" });

  const createMut = trpc.vertretungen.create.useMutation({
    onSuccess: () => { refetch(); setShowForm(false); setForm({ vertreterId: "", vertretenId: "", von: "", bis: "", grund: "" }); toast.success("Vertretung eingerichtet!"); },
    onError: (e) => toast.error(e.message),
  });

  const deactivateMut = trpc.vertretungen.deactivate.useMutation({
    onSuccess: () => { refetch(); toast.success("Vertretung beendet"); },
    onError: (e) => toast.error(e.message),
  });

  const getMaName = (id: number) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ma = (allMa as any[]).find((m: any) => m.id === id);
    return ma ? `${ma.vorname} ${ma.nachname}` : `#${id}`;
  };

  const handleCreate = () => {
    if (!form.vertreterId || !form.vertretenId || !form.von || !form.bis) {
      toast.error("Bitte alle Pflichtfelder ausfüllen");
      return;
    }
    createMut.mutate({
      vertreterId: Number(form.vertreterId),
      vertretenId: Number(form.vertretenId),
      von: form.von,
      bis: form.bis,
      grund: form.grund || undefined,
    });
  };

  return (
    <div className="lw-page">
      <div className="lw-page-header">
        <div>
          <div className="lw-page-title">Vertretungen</div>
          <div className="lw-page-subtitle">Temporärer Zugriff für Vertretungskräfte</div>
        </div>
        {isAdmin && (
          <button className="lw-btn lw-btn-primary" onClick={() => setShowForm(true)}>
            + Vertretung einrichten
          </button>
        )}
      </div>

      {/* Formular */}
      {isAdmin && showForm && (
        <div className="lw-card" style={{ marginBottom: "1.25rem", border: "2px solid var(--lw-green-400)" }}>
          <div className="lw-card-header">
            <div style={{ fontWeight: 700 }}>🔄 Neue Vertretung</div>
            <button className="lw-btn lw-btn-ghost lw-btn-sm" onClick={() => setShowForm(false)}>✕</button>
          </div>
          <div className="lw-card-body">
            <div className="lw-grid-2" style={{ marginBottom: "0.75rem" }}>
              <div>
                <label className="lw-label">Vertretung übernimmt *</label>
                <select className="lw-input" value={form.vertreterId} onChange={e => setForm(f => ({ ...f, vertreterId: e.target.value }))}>
                  <option value="">– Mitarbeiter wählen –</option>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(allMa as any[]).map((m: any) => (
                    <option key={m.id} value={m.id}>{m.vorname} {m.nachname}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="lw-label">Vertritt wen *</label>
                <select className="lw-input" value={form.vertretenId} onChange={e => setForm(f => ({ ...f, vertretenId: e.target.value }))}>
                  <option value="">– Mitarbeiter wählen –</option>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(allMa as any[]).map((m: any) => (
                    <option key={m.id} value={m.id}>{m.vorname} {m.nachname}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="lw-grid-2" style={{ marginBottom: "0.75rem" }}>
              <div>
                <label className="lw-label">Von *</label>
                <input type="date" className="lw-input" value={form.von} onChange={e => setForm(f => ({ ...f, von: e.target.value }))} />
              </div>
              <div>
                <label className="lw-label">Bis *</label>
                <input type="date" className="lw-input" value={form.bis} onChange={e => setForm(f => ({ ...f, bis: e.target.value }))} />
              </div>
            </div>
            <div style={{ marginBottom: "0.75rem" }}>
              <label className="lw-label">Grund</label>
              <input className="lw-input" placeholder="z.B. Urlaub, Krankmeldung…" value={form.grund} onChange={e => setForm(f => ({ ...f, grund: e.target.value }))} />
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="lw-btn lw-btn-primary" onClick={handleCreate} disabled={createMut.isPending}>
                {createMut.isPending ? "Speichern…" : "✓ Vertretung einrichten"}
              </button>
              <button className="lw-btn lw-btn-secondary" onClick={() => setShowForm(false)}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}

      {/* Admin-Ansicht: Alle Vertretungen */}
      {isAdmin && (
        <div className="lw-card">
          <div className="lw-card-header">
            <div style={{ fontWeight: 700 }}>📋 Alle Vertretungen</div>
            <span className="lw-badge lw-badge-gray">{(vertretungen as unknown[]).length}</span>
          </div>
          {(vertretungen as unknown[]).length === 0 ? (
            <div className="lw-empty">
              <div className="lw-empty-icon">🔄</div>
              <div className="lw-empty-text">Keine Vertretungen eingerichtet</div>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="lw-table">
                <thead>
                  <tr>
                    <th>Vertretung</th>
                    <th>Vertritt</th>
                    <th>Zeitraum</th>
                    <th>Grund</th>
                    <th>Status</th>
                    <th>Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(vertretungen as any[]).map((v: any) => {
                    // A6: Farbkennzeichnung nach Status
                    const heute = new Date().toISOString().split('T')[0];
                    const vonStr = typeof v.von === 'string' ? v.von.split('T')[0] : (v.von as Date)?.toISOString?.()?.split('T')[0] ?? '';
                    const bisStr = typeof v.bis === 'string' ? v.bis.split('T')[0] : (v.bis as Date)?.toISOString?.()?.split('T')[0] ?? '';
                    const laeuftHeute = v.aktiv && vonStr <= heute && bisStr >= heute;
                    const baldAblaufend = v.aktiv && bisStr >= heute && bisStr <= new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
                    const zeilenFarbe = laeuftHeute ? '#f0fdf4' : baldAblaufend ? '#fefce8' : v.aktiv ? '#fff' : '#f9fafb';
                    return (
                    <tr key={v.id} style={{ background: zeilenFarbe }}>
                      <td style={{ fontWeight: 600 }}>{getMaName(v.vertreterId)}</td>
                      <td>{getMaName(v.vertretenId)}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{fmtDate(v.von)} – {fmtDate(v.bis)}</td>
                      <td style={{ fontSize: "0.8125rem" }}>{v.grund ?? "–"}</td>
                      <td>
                        {laeuftHeute ? (
                          <span className="lw-badge lw-badge-green">🟢 Läuft heute</span>
                        ) : baldAblaufend ? (
                          <span className="lw-badge lw-badge-yellow">⚠️ Läuft ab</span>
                        ) : v.aktiv ? (
                          <span className="lw-badge lw-badge-green">✓ Aktiv</span>
                        ) : (
                          <span className="lw-badge lw-badge-gray">Beendet</span>
                        )}
                      </td>
                      <td>
                        {v.aktiv && (
                          <button
                            className="lw-btn lw-btn-ghost lw-btn-sm"
                            style={{ color: "var(--lw-red)" }}
                            onClick={() => { if (confirm("Vertretung beenden?")) deactivateMut.mutate({ id: v.id }); }}
                          >
                            Beenden
                          </button>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* P2: DSGVO-Vertretungs-Übernahme-UI */}
      {!isAdmin && <VertretungsUebernahmePanel />}

      {/* Mitarbeiter-Ansicht: Eigene Vertretungen */}
      {!isAdmin && (
        <div className="lw-card">
          <div className="lw-card-header">
            <div style={{ fontWeight: 700 }}>🔄 Meine Vertretungen</div>
          </div>
          {(meineVertretungen as unknown[]).length === 0 ? (
            <div className="lw-empty">
              <div className="lw-empty-icon">🔄</div>
              <div className="lw-empty-text">Keine aktiven Vertretungen</div>
              <div className="lw-empty-sub">Du wirst hier informiert, wenn du eine Vertretung übernimmst.</div>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="lw-table">
                <thead>
                  <tr>
                    <th>Ich vertrete</th>
                    <th>Zeitraum</th>
                    <th>Grund</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(meineVertretungen as any[]).map((v: any) => (
                    <tr key={v.id}>
                      <td style={{ fontWeight: 600 }}>{getMaName(v.vertretenId)}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{fmtDate(v.von)} – {fmtDate(v.bis)}</td>
                      <td style={{ fontSize: "0.8125rem" }}>{v.grund ?? "–"}</td>
                      <td>
                        {v.aktiv ? (
                          <span className="lw-badge lw-badge-green">✓ Aktiv</span>
                        ) : (
                          <span className="lw-badge lw-badge-gray">Beendet</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
