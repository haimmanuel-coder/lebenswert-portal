import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { toast } from "sonner";

export default function Datenschutz() {
  const { mitarbeiter } = usePortalAuth() as any;
  const isAdmin = mitarbeiter?.rolle === "admin";
  const [tab, setTab] = useState<"meine" | "alle" | "vorlagen">(isAdmin ? "alle" : "meine");
  const [erinnerungId, setErinnerungId] = useState<number | null>(null);

  const { data: meineZustimmungen = [], refetch: refetchMeine } = (trpc.datenschutz as any).getMeineZustimmungen.useQuery(
    undefined,
    { enabled: tab === "meine" }
  );
  const { data: alleZustimmungen = [], refetch: refetchAlle } = (trpc.datenschutz as any).getAlleZustimmungen.useQuery(
    undefined,
    { enabled: tab === "alle" && isAdmin }
  );
  const { data: vorlagen = [], refetch: refetchVorlagen } = (trpc.datenschutz as any).listVorlagen.useQuery(
    undefined,
    { enabled: tab === "vorlagen" && isAdmin }
  );
  const { data: csvDaten } = (trpc.datenschutz as any).csvExport.useQuery(
    undefined,
    { enabled: tab === "alle" && isAdmin }
  );

  const zustimmen = (trpc.datenschutz as any).zustimmen.useMutation({
    onSuccess: () => { toast.success("✅ Zustimmung gespeichert!"); refetchMeine(); },
    onError: (e: any) => toast.error("❌ " + e.message),
  });

  const [neueVorlage, setNeueVorlage] = useState({ titel: "", inhalt: "", version: "1.0", pflicht: true });
  const createVorlage = (trpc.datenschutz as any).createVorlage.useMutation({
    onSuccess: () => { toast.success("✅ Vorlage erstellt!"); refetchVorlagen(); setNeueVorlage({ titel: "", inhalt: "", version: "1.0", pflicht: true }); },
    onError: (e: any) => toast.error("❌ " + e.message),
  });
  const deleteVorlage = (trpc.datenschutz as any).deleteVorlage.useMutation({
    onSuccess: () => { toast.success("🗑️ Vorlage deaktiviert!"); refetchVorlagen(); },
    onError: (e: any) => toast.error("❌ " + e.message),
  });
  const zustimmungsErinnerung = (trpc.datenschutz as any).zustimmungsErinnerung.useMutation({
    onSuccess: (r: any) => { toast.success(`📧 Erinnerung an ${r.gesendet} Mitarbeiter versendet!`); setErinnerungId(null); },
    onError: (e: any) => toast.error("❌ " + e.message),
  });

  const handleCsvDownload = () => {
    if (!csvDaten) return;
    const blob = new Blob([csvDaten as string], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `datenschutz-zustimmungen-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("📥 CSV-Export heruntergeladen!");
  };

  return (
    <div style={{ padding: "20px 16px 100px", maxWidth: 860, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 }}>🔐 Datenschutz & Einwilligungen</h1>
        <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>DSGVO-konforme Zustimmungsverwaltung für alle Mitarbeiter</p>
      </div>

      {/* Tab-Navigation */}
      <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 12, padding: 4, marginBottom: 20, gap: 4 }}>
        {[
          { id: "meine", label: "📋 Meine Einwilligungen" },
          ...(isAdmin ? [
            { id: "alle", label: "👥 Alle Mitarbeiter" },
            { id: "vorlagen", label: "📝 Vorlagen verwalten" },
          ] : []),
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            style={{
              flex: 1, padding: "10px 8px", borderRadius: 10, border: "none", cursor: "pointer",
              fontWeight: 700, fontSize: 12,
              background: tab === t.id ? "#fff" : "transparent",
              color: tab === t.id ? "#0d9488" : "#6b7280",
              boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Meine Einwilligungen */}
      {tab === "meine" && (
        <div style={{ display: "grid", gap: 12 }}>
          {(meineZustimmungen as any[]).length === 0 ? (
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: "40px 20px", textAlign: "center", color: "#9ca3af" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 700 }}>Keine ausstehenden Einwilligungen</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Alle Datenschutzerklärungen wurden bereits bestätigt.</div>
            </div>
          ) : (
            (meineZustimmungen as any[]).map((z: any) => (
              <div key={z.id} style={{ background: "#fff", borderRadius: 16, border: `2px solid ${z.zugestimmt ? "#86efac" : "#fcd34d"}`, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{z.titel ?? "Datenschutzerklärung"}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Version {z.version ?? "1.0"}</div>
                  </div>
                  <span style={{
                    background: z.zugestimmt ? "#f0fdf4" : "#fef9c3",
                    color: z.zugestimmt ? "#166534" : "#92400e",
                    border: `1px solid ${z.zugestimmt ? "#86efac" : "#fcd34d"}`,
                    borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700,
                  }}>
                    {z.zugestimmt ? "✅ Zugestimmt" : "⏳ Ausstehend"}
                  </span>
                </div>
                <div style={{ padding: "14px 18px" }}>
                  {z.inhalt && (
                    <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6, marginBottom: 14, maxHeight: 120, overflow: "auto", background: "#f9fafb", borderRadius: 8, padding: "10px 12px" }}>
                      {z.inhalt}
                    </div>
                  )}
                  {!z.zugestimmt && (
                    <button
                      onClick={() => zustimmen.mutate({ dokumentId: z.id })}
                      disabled={zustimmen.isPending}
                      style={{ background: "#0d9488", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer", width: "100%" }}
                    >
                      {zustimmen.isPending ? "Wird gespeichert..." : "✅ Ich stimme zu"}
                    </button>
                  )}
                  {z.zugestimmt && z.zugestimmtAt && (
                    <div style={{ fontSize: 11, color: "#6b7280" }}>
                      Zugestimmt am {new Date(z.zugestimmtAt).toLocaleDateString("de-DE")} um {new Date(z.zugestimmtAt).toLocaleTimeString("de-DE")}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Alle Mitarbeiter (Admin) */}
      {tab === "alle" && isAdmin && (
        <div style={{ display: "grid", gap: 16 }}>
          {/* Aktions-Leiste */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={handleCsvDownload}
              disabled={!csvDaten}
              style={{ background: "#0d9488", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
            >
              📥 CSV-Export
            </button>
            {/* Erinnerung an alle MA ohne Zustimmung für das erste aktive Dokument */}
            {(vorlagen as any[]).filter((v: any) => v.aktiv).slice(0, 1).map((v: any) => (
              <button
                key={v.id}
                onClick={() => { setErinnerungId(v.id); zustimmungsErinnerung.mutate({ dokumentId: v.id }); }}
                disabled={zustimmungsErinnerung.isPending && erinnerungId === v.id}
                style={{ background: "#f59e0b", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
              >
                {zustimmungsErinnerung.isPending && erinnerungId === v.id ? "⏳ Wird gesendet..." : "📧 Erinnerung senden"}
              </button>
            ))}
          </div>

          {/* Tabelle */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6", fontWeight: 700, fontSize: 14, color: "#111827" }}>
              Einwilligungs-Übersicht aller Mitarbeiter
            </div>
            {(alleZustimmungen as any[]).length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af" }}>Keine Einträge vorhanden.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      {["Mitarbeiter", "Dokumente", "Zugestimmt", "Ausstehend"].map(h => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(alleZustimmungen as any[]).map((z: any, i: number) => {
                      const zustimmungen: any[] = z.zustimmungen ?? [];
                      const zugestimmt = zustimmungen.filter((s: any) => s.zugestimmt).length;
                      const ausstehend = zustimmungen.filter((s: any) => !s.zugestimmt).length;
                      return (
                        <tr key={z.mitarbeiterId ?? i} style={{ borderTop: i > 0 ? "1px solid #f3f4f6" : "none" }}>
                          <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "#111827" }}>
                            {z.name ?? `${z.mitarbeiter?.vorname ?? ""} ${z.mitarbeiter?.nachname ?? ""}`}
                          </td>
                          <td style={{ padding: "12px 16px", fontSize: 12, color: "#6b7280" }}>
                            {zustimmungen.map((s: any) => s.titel).join(", ") || "—"}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #86efac", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                              ✅ {zugestimmt}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            {ausstehend > 0 ? (
                              <span style={{ background: "#fef9c3", color: "#92400e", border: "1px solid #fcd34d", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                                ⏳ {ausstehend}
                              </span>
                            ) : (
                              <span style={{ color: "#9ca3af", fontSize: 12 }}>—</span>
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
        </div>
      )}

      {/* Vorlagen verwalten (Admin) */}
      {tab === "vorlagen" && isAdmin && (
        <div style={{ display: "grid", gap: 16 }}>
          {/* Neue Vorlage erstellen */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6", fontWeight: 700, fontSize: 14, color: "#111827" }}>
              ➕ Neue Datenschutz-Vorlage
            </div>
            <div style={{ padding: "16px 18px", display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Titel</label>
                  <input
                    value={neueVorlage.titel}
                    onChange={e => setNeueVorlage(v => ({ ...v, titel: e.target.value }))}
                    placeholder="z.B. Datenschutzerklärung 2026"
                    style={{ width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Version</label>
                  <input
                    value={neueVorlage.version}
                    onChange={e => setNeueVorlage(v => ({ ...v, version: e.target.value }))}
                    style={{ width: 80, padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Pflicht</label>
                  <div style={{ display: "flex", alignItems: "center", height: 42 }}>
                    <input
                      type="checkbox"
                      checked={neueVorlage.pflicht}
                      onChange={e => setNeueVorlage(v => ({ ...v, pflicht: e.target.checked }))}
                      style={{ width: 18, height: 18, cursor: "pointer" }}
                    />
                  </div>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Inhalt</label>
                <textarea
                  value={neueVorlage.inhalt}
                  onChange={e => setNeueVorlage(v => ({ ...v, inhalt: e.target.value }))}
                  placeholder="Vollständiger Datenschutztext..."
                  rows={6}
                  style={{ width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 13, boxSizing: "border-box", resize: "vertical" }}
                />
              </div>
              <button
                onClick={() => createVorlage.mutate(neueVorlage)}
                disabled={createVorlage.isPending || !neueVorlage.titel || !neueVorlage.inhalt}
                style={{ background: "#0d9488", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
              >
                {createVorlage.isPending ? "Wird erstellt..." : "💾 Vorlage speichern"}
              </button>
            </div>
          </div>

          {/* Vorlagen-Liste */}
          {(vorlagen as any[]).map((v: any) => (
            <div key={v.id} style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: "16px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{v.titel}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                    Version {v.version} · Typ: {v.typ} · {v.aktiv ? "🟢 Aktiv" : "🔴 Inaktiv"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {/* Erinnerung für diese Vorlage */}
                  <button
                    onClick={() => { setErinnerungId(v.id); zustimmungsErinnerung.mutate({ dokumentId: v.id }); }}
                    disabled={zustimmungsErinnerung.isPending && erinnerungId === v.id}
                    title="Erinnerung an MA ohne Zustimmung senden"
                    style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                  >
                    📧 Erinnern
                  </button>
                  {v.aktiv && (
                    <button
                      onClick={() => { if (confirm(`Vorlage "${v.titel}" deaktivieren?`)) deleteVorlage.mutate({ id: v.id }); }}
                      disabled={deleteVorlage.isPending}
                      style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                    >
                      🗑️ Deaktivieren
                    </button>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 10, lineHeight: 1.5, maxHeight: 80, overflow: "hidden" }}>
                {v.inhalt}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
