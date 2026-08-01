/**
 * DsgvoAdminTab – Admin-Interface für DSGVO-Dokumente
 * Ermöglicht Bearbeiten, Versionieren und Neu-Anlegen von Datenschutzdokumenten.
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

export function DsgvoAdminTab() {
  const utils = trpc.useUtils();
  const { data: dokumente = [], isLoading } = (trpc as any).datenschutz.listAlleDokumente.useQuery();

  // Formular-State
  const [mode, setMode] = useState<"list" | "edit" | "create" | "version">("list");
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
