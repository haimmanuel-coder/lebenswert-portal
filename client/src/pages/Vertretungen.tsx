import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "–";
  const s = typeof d === "string" ? d.split("T")[0] : d.toISOString().split("T")[0];
  const [y, m, day] = s.split("-");
  return `${day}.${m}.${y}`;
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
                  {(vertretungen as any[]).map((v: any) => (
                    <tr key={v.id}>
                      <td style={{ fontWeight: 600 }}>{getMaName(v.vertreterId)}</td>
                      <td>{getMaName(v.vertretenId)}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{fmtDate(v.von)} – {fmtDate(v.bis)}</td>
                      <td style={{ fontSize: "0.8125rem" }}>{v.grund ?? "–"}</td>
                      <td>
                        {v.aktiv ? (
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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
