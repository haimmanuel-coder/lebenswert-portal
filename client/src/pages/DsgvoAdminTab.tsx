/**
 * DsgvoAdminTab – Admin-Interface für DSGVO-Dokumente
 * Ermöglicht Bearbeiten, Versionieren, Neu-Anlegen und zeigt Zustimmungs-Übersicht.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const TYP_LABELS: Record<string, string> = {
  datenschutzerklaerung: "Datenschutzerklärung",
  avv: "Auftragsverarbeitungsvertrag",
  einwilligung: "Einwilligung Datenverarbeitung",
  loeschkonzept: "Löschkonzept",
  verarbeitungsverzeichnis: "Verarbeitungsverzeichnis",
};

const ROLLEN_LABEL: Record<string, string> = {
  mitarbeiter: "Mitarbeiter",
  teamleitung: "Teamleitung",
  buchhaltung: "Buchhaltung",
  admin: "Admin",
};

type DokTyp = "datenschutzerklaerung" | "avv" | "einwilligung" | "loeschkonzept" | "verarbeitungsverzeichnis";

interface Dokument {
  id: number;
  typ: string;
  titel: string;
  version: string;
  inhalt: string;
  aktiv: boolean;
  createdAt: Date | string;
}

interface ZustimmungsEintrag {
  mitarbeiterId: number;
  vorname: string;
  nachname: string;
  rolle: string;
  zugestimmt: boolean;
  zugestimmtAt: Date | string | null;
  dokumentVersion: string | null;
}

// ── Zustimmungs-Übersicht für ein einzelnes Dokument ─────────────────────────
function ZustimmungsUebersicht({ dok, onClose }: { dok: Dokument; onClose: () => void }) {
  const { data: eintraege = [], isLoading } = (trpc as any).datenschutz.getZustimmungsUebersicht.useQuery(
    { dokumentId: dok.id },
    { refetchOnWindowFocus: false }
  );

  const zugestimmt = (eintraege as ZustimmungsEintrag[]).filter(e => e.zugestimmt);
  const ausstehend = (eintraege as ZustimmungsEintrag[]).filter(e => !e.zugestimmt);
  const total = (eintraege as ZustimmungsEintrag[]).length;
  const pct = total > 0 ? Math.round((zugestimmt.length / total) * 100) : 0;

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onClose} style={{ background: "none", border: "none", color: "#4a8c3f", fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: 16 }}>
        ← Zurück zur Liste
      </button>

      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1f2937", marginBottom: 4 }}>
        📋 Zustimmungs-Übersicht
      </h3>
      <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>
        {dok.titel} · Version {dok.version}
      </p>

      {/* Fortschrittsbalken */}
      {!isLoading && total > 0 && (
        <div style={{ background: "#f3f4f6", borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1f2937" }}>
              {zugestimmt.length} von {total} Mitarbeitern haben zugestimmt
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: pct === 100 ? "#166534" : "#92400e" }}>{pct}%</span>
          </div>
          <div style={{ height: 8, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#4a8c3f" : "#f59e0b", borderRadius: 4, transition: "width 0.5s ease" }} />
          </div>
        </div>
      )}

      {isLoading && <p style={{ color: "#6b7280", fontSize: 13 }}>Lade Zustimmungen…</p>}

      {/* Ausstehend */}
      {ausstehend.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#dc2626", display: "inline-block" }} />
            Noch nicht zugestimmt ({ausstehend.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {ausstehend.map(e => (
              <div key={e.mitarbeiterId} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#dc2626", flexShrink: 0 }}>
                  {e.vorname[0]}{e.nachname[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1f2937" }}>{e.vorname} {e.nachname}</div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>{ROLLEN_LABEL[e.rolle] ?? e.rolle}</div>
                </div>
                <span style={{ fontSize: 10, background: "#fee2e2", color: "#dc2626", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>AUSSTEHEND</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Zugestimmt */}
      {zugestimmt.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#166534", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4a8c3f", display: "inline-block" }} />
            Zugestimmt ({zugestimmt.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {zugestimmt.map(e => (
              <div key={e.mitarbeiterId} style={{ display: "flex", alignItems: "center", gap: 10, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "8px 12px" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#166534", flexShrink: 0 }}>
                  {e.vorname[0]}{e.nachname[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1f2937" }}>{e.vorname} {e.nachname}</div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>
                    {ROLLEN_LABEL[e.rolle] ?? e.rolle}
                    {e.dokumentVersion && ` · Version ${e.dokumentVersion}`}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 10, background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: 4, fontWeight: 600, display: "block" }}>✓ ZUGESTIMMT</span>
                  {e.zugestimmtAt && (
                    <span style={{ fontSize: 10, color: "#6b7280", marginTop: 2, display: "block" }}>
                      {new Date(e.zugestimmtAt).toLocaleDateString("de-DE")}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && total === 0 && (
        <p style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: 24 }}>Keine aktiven Mitarbeiter gefunden.</p>
      )}
    </div>
  );
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────
export function DsgvoAdminTab() {
  const utils = trpc.useUtils();
  const { data: dokumente = [], isLoading } = (trpc as any).datenschutz.listAlleDokumente.useQuery();

  const [mode, setMode] = useState<"list" | "edit" | "create" | "version" | "uebersicht">("list");
  const [selected, setSelected] = useState<Dokument | null>(null);
  const [form, setForm] = useState({ titel: "", inhalt: "", version: "", typ: "datenschutzerklaerung" as DokTyp, neueVersion: "" });

  const invalidate = () => (utils as any).datenschutz.listAlleDokumente.invalidate();

  const updateMut = (trpc as any).datenschutz.updateDokument.useMutation({
    onSuccess: () => { toast.success("Dokument gespeichert"); invalidate(); setMode("list"); },
    onError: (e: any) => toast.error(e.message),
  });
  const createMut = (trpc as any).datenschutz.createDokument.useMutation({
    onSuccess: () => { toast.success("Dokument erstellt"); invalidate(); setMode("list"); },
    onError: (e: any) => toast.error(e.message),
  });
  const versionMut = (trpc as any).datenschutz.neueVersion.useMutation({
    onSuccess: () => { toast.success("Neue Version erstellt"); invalidate(); setMode("list"); },
    onError: (e: any) => toast.error(e.message),
  });
  const deaktivMut = (trpc as any).datenschutz.deaktiviereDokument.useMutation({
    onSuccess: () => { toast.success("Dokument deaktiviert"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  function openEdit(dok: Dokument) {
    setSelected(dok);
    setForm({ titel: dok.titel, inhalt: dok.inhalt, version: dok.version, typ: dok.typ as DokTyp, neueVersion: "" });
    setMode("edit");
  }

  function openVersion(dok: Dokument) {
    setSelected(dok);
    setForm({ titel: dok.titel, inhalt: dok.inhalt, version: dok.version, typ: dok.typ as DokTyp, neueVersion: "" });
    setMode("version");
  }

  function openUebersicht(dok: Dokument) {
    setSelected(dok);
    setMode("uebersicht");
  }

  function openCreate() {
    setSelected(null);
    setForm({ titel: "", inhalt: "", version: "1.0", typ: "datenschutzerklaerung", neueVersion: "" });
    setMode("create");
  }

  function handleSave() {
    if (!form.titel.trim() || !form.version.trim()) { toast.error("Titel und Version sind Pflichtfelder"); return; }
    if (mode === "edit" && selected) {
      updateMut.mutate({ id: selected.id, titel: form.titel, inhalt: form.inhalt, version: form.version });
    } else if (mode === "create") {
      createMut.mutate({ titel: form.titel, inhalt: form.inhalt, version: form.version, typ: form.typ });
    } else if (mode === "version" && selected) {
      if (!form.neueVersion.trim()) { toast.error("Neue Versionsnummer eingeben"); return; }
      versionMut.mutate({ id: selected.id, titel: form.titel, inhalt: form.inhalt, neueVersion: form.neueVersion });
    }
  }

  const isBusy = updateMut.isPending || createMut.isPending || versionMut.isPending;

  // ── Zustimmungs-Übersicht ─────────────────────────────────────────────────
  if (mode === "uebersicht" && selected) {
    return <ZustimmungsUebersicht dok={selected} onClose={() => setMode("list")} />;
  }

  // ── Formular ──────────────────────────────────────────────────────────────
  if (mode !== "list") {
    return (
      <div style={{ padding: 16 }}>
        <button onClick={() => setMode("list")} style={{ background: "none", border: "none", color: "#4a8c3f", fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: 16 }}>
          ← Zurück zur Liste
        </button>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1f2937", marginBottom: 16 }}>
          {mode === "create" ? "Neues Dokument anlegen" : mode === "version" ? "Neue Version erstellen" : "Dokument bearbeiten"}
        </h3>

        {mode === "create" && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Dokumenttyp</label>
            <select value={form.typ} onChange={e => setForm(f => ({ ...f, typ: e.target.value as DokTyp }))}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13 }}>
              {Object.entries(TYP_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Titel *</label>
          <input value={form.titel} onChange={e => setForm(f => ({ ...f, titel: e.target.value }))}
            style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, boxSizing: "border-box" as const }} />
        </div>

        {mode !== "version" && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Version *</label>
            <input value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))}
              placeholder="z.B. 1.0, 2.1, 2024-01"
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, boxSizing: "border-box" as const }} />
          </div>
        )}

        {mode === "version" && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Neue Versionsnummer *</label>
            <input value={form.neueVersion} onChange={e => setForm(f => ({ ...f, neueVersion: e.target.value }))}
              placeholder="z.B. 2.0"
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, boxSizing: "border-box" as const }} />
            <p style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>Das aktuelle Dokument wird deaktiviert. Alle Mitarbeiter müssen der neuen Version erneut zustimmen.</p>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Inhalt (Text / HTML)</label>
          <textarea value={form.inhalt} onChange={e => setForm(f => ({ ...f, inhalt: e.target.value }))} rows={12}
            style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 12, fontFamily: "monospace", boxSizing: "border-box" as const, resize: "vertical" }} />
        </div>

        <button onClick={handleSave} disabled={isBusy}
          style={{ width: "100%", padding: "13px", background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          {isBusy ? "Speichern…" : mode === "create" ? "✅ Dokument erstellen" : mode === "version" ? "🔄 Neue Version anlegen" : "✅ Änderungen speichern"}
        </button>
      </div>
    );
  }

  // ── Liste ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1f2937", margin: 0 }}>🔒 DSGVO-Dokumente</h3>
        <button onClick={openCreate}
          style={{ padding: "8px 16px", background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          + Neu anlegen
        </button>
      </div>

      {isLoading && <p style={{ color: "#6b7280", fontSize: 13 }}>Lade Dokumente…</p>}

      {!isLoading && dokumente.length === 0 && (
        <div style={{ textAlign: "center", padding: 32, color: "#9ca3af" }}>
          <p style={{ fontSize: 14 }}>Noch keine Dokumente vorhanden.</p>
          <button onClick={openCreate} style={{ marginTop: 8, padding: "8px 16px", background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
            Erstes Dokument anlegen
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {(dokumente as Dokument[]).map((dok) => (
          <div key={dok.id} style={{ background: dok.aktiv ? "#f0fdf4" : "#f9fafb", border: `1px solid ${dok.aktiv ? "#86efac" : "#e5e7eb"}`, borderRadius: 10, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1f2937" }}>{dok.titel}</span>
                  {dok.aktiv && <span style={{ fontSize: 10, background: "#dcfce7", color: "#166534", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>AKTIV</span>}
                </div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>
                  {TYP_LABELS[dok.typ] ?? dok.typ} · Version {dok.version} · {new Date(dok.createdAt).toLocaleDateString("de-DE")}
                </div>
                {dok.inhalt && (
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 280 }}>
                    {dok.inhalt.replace(/<[^>]+>/g, "").substring(0, 80)}…
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <button onClick={() => openUebersicht(dok)} style={{ padding: "5px 10px", background: "#f0fdf4", color: "#166534", border: "1px solid #86efac", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                  📋 Zustimmungen
                </button>
                <button onClick={() => openEdit(dok)} style={{ padding: "5px 10px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                  ✏️ Bearbeiten
                </button>
                <button onClick={() => openVersion(dok)} style={{ padding: "5px 10px", background: "#fefce8", color: "#92400e", border: "1px solid #fde68a", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                  🔄 Neue Version
                </button>
                {dok.aktiv && (
                  <button onClick={() => { if (confirm("Dokument deaktivieren?")) deaktivMut.mutate({ id: dok.id }); }}
                    style={{ padding: "5px 10px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                    🚫 Deaktivieren
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
