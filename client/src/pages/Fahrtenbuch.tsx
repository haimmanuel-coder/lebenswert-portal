import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import BottomSheet from "@/components/BottomSheet";

function fmtDate(d: string | Date | null) {
  if (!d) return "–";
  const s = typeof d === "string" ? d : d.toISOString().split("T")[0];
  const [y, m, day] = s.split("-");
  return `${day}.${m}.${y}`;
}

export default function Fahrtenbuch() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const [datum, setDatum] = useState(today);
  const [typ, setTyp] = useState<"normal" | "sonder">("normal");
  const [vonOrt, setVonOrt] = useState("");
  const [nachOrt, setNachOrt] = useState("");
  const [km, setKm] = useState("");
  const [kundenId, setKundenId] = useState("");
  const [zweck, setZweck] = useState("");

  const { data: kunden = [] } = trpc.kunden.list.useQuery();
  const { data: fahrten = [], refetch } = trpc.fahrten.list.useQuery();
  const createFahrt = trpc.fahrten.create.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("✅ Fahrt gespeichert");
      setSheetOpen(false);
      setVonOrt(""); setNachOrt(""); setKm(""); setZweck(""); setKundenId("");
    },
    onError: (e) => toast.error("❌ " + e.message),
  });

  const deleteFahrt = trpc.fahrten.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("🗑️ Fahrt gelöscht"); },
    onError: (e) => toast.error("❌ " + e.message),
  });

  const handleDeleteFahrt = (id: number, label: string) => {
    if (!window.confirm(`Fahrt "${label}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) return;
    deleteFahrt.mutate({ id });
  };

  const monat = today.slice(0, 7);
  const monatStr = new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  const monFahrten = fahrten.filter((f) => {
    const fd = typeof f.datum === "string" ? f.datum : (f.datum as Date).toISOString().split("T")[0];
    return fd?.slice(0, 7) === monat;
  });
  const totalKm = monFahrten.reduce((s, f) => s + parseFloat(String(f.kilometer ?? 0)), 0);
  const totalEur = monFahrten.reduce((s, f) => s + parseFloat(String(f.verguetung ?? 0)), 0);

  const rate = typ === "sonder" ? 0.35 : 0.30;
  const eurPreview = ((parseFloat(km) || 0) * rate).toFixed(2);

  // Auto-Berechnung via Google Maps
  const [autoBerechnung, setAutoBerechnung] = useState<{ km: number; verguetung: number; distanzText: string | null; dauerText: string | null } | null>(null);
  const [autoLoading, setAutoLoading] = useState(false);
  const fahrtkostenMut = trpc.admin.fahrtkostenBerechne.useMutation({
    onSuccess: (data) => {
      setAutoBerechnung(data);
      if (data.km > 0) {
        setKm(String(data.km));
        toast.success(`📍 ${data.distanzText} – ${data.dauerText}`);
      } else {
        toast.error("Adresse nicht gefunden");
      }
      setAutoLoading(false);
    },
    onError: () => { toast.error("Berechnung fehlgeschlagen"); setAutoLoading(false); },
  });

  function berechneKm() {
    if (!vonOrt.trim() || !nachOrt.trim()) { toast.error("Von- und Zielort eingeben"); return; }
    setAutoLoading(true);
    fahrtkostenMut.mutate({ vonAdresse: vonOrt, nachAdresse: nachOrt });
  }

  const saveFahrt = () => {
    if (!datum || !vonOrt || !nachOrt || !km) { toast.error("Bitte alle Pflichtfelder ausfüllen!"); return; }
    createFahrt.mutate({
      datum,
      vonOrt,
      nachOrt,
      kilometer: parseFloat(km),
      typ,
      kundenId: kundenId ? parseInt(kundenId) : null,
      zweck,
    });
  };

  const sorted = [...fahrten].sort((a, b) => {
    const da = typeof a.datum === "string" ? a.datum : (a.datum as Date).toISOString().split("T")[0];
    const db2 = typeof b.datum === "string" ? b.datum : (b.datum as Date).toISOString().split("T")[0];
    return db2.localeCompare(da);
  });

  return (
    <div className="page-enter">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Fahrtenbuch</div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{monatStr}</div>
        </div>
        <button
          onClick={() => setSheetOpen(true)}
          style={{ padding: "9px 16px", background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >
          + Fahrt
        </button>
      </div>

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div className="kpi-card">
          <div className="kpi-value">{totalKm.toFixed(1)}</div>
          <div className="kpi-label">km gesamt</div>
        </div>
        <div className="kpi-card teal">
          <div className="kpi-value">{totalEur.toFixed(2)} €</div>
          <div className="kpi-label">Vergütung</div>
        </div>
      </div>

      {/* Liste */}
      {sorted.length === 0 ? (
        <p style={{ color: "#6b7280", fontSize: 13 }}>Noch keine Fahrten erfasst.</p>
      ) : (
        sorted.map((f) => {
          const datum2 = typeof f.datum === "string" ? f.datum : (f.datum as Date).toISOString().split("T")[0];
          return (
            <div key={f.id} style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,.08)", padding: 14, marginBottom: 10 }}>
              <div className="list-item" style={{ padding: 0, border: "none" }}>
                <div className="li-icon">🚗</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.vonOrt} → {f.nachOrt}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                    {fmtDate(datum2)} · {f.zweck || "–"}
                    <span
                      style={{
                        display: "inline-block", padding: "2px 6px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                        ...(f.typ === "sonder"
                          ? { background: "#ede9f6", color: "#6b4c9a" }
                          : { background: "#f3f4f6", color: "#4b5563" }),
                      }}
                    >
                      {f.typ === "sonder" ? "Sonderfahrt" : "Normal"}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{parseFloat(String(f.kilometer ?? 0)).toFixed(1)} km</div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>{parseFloat(String(f.verguetung ?? 0)).toFixed(2)} €</div>
                  <button
                    onClick={() => handleDeleteFahrt(f.id, `${f.vonOrt} → ${f.nachOrt}`)}
                    style={{ marginTop: 6, padding: "4px 10px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                  >
                    🗑️ Löschen
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Fahrt-Sheet */}
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Fahrt erfassen">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 5 }}>Datum</label>
            <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)}
              style={{ width: "100%", padding: "12px 13px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 15, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 5 }}>Typ</label>
            <select value={typ} onChange={(e) => setTyp(e.target.value as typeof typ)}
              style={{ width: "100%", padding: "12px 13px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 15, outline: "none", background: "#fff", boxSizing: "border-box" }}>
              <option value="normal">Normal (0,30 €/km)</option>
              <option value="sonder">Sonderfahrt (0,35 €/km)</option>
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 5 }}>Von</label>
            <input type="text" value={vonOrt} onChange={(e) => setVonOrt(e.target.value)} placeholder="Startort"
              style={{ width: "100%", padding: "12px 13px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 15, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 5 }}>Nach</label>
            <input type="text" value={nachOrt} onChange={(e) => setNachOrt(e.target.value)} placeholder="Zielort"
              style={{ width: "100%", padding: "12px 13px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 15, outline: "none", boxSizing: "border-box" }} />
          </div>
        </div>

        {/* Auto-Berechnen Button */}
        <div style={{ marginBottom: 10 }}>
          <button
            onClick={berechneKm}
            disabled={autoLoading || !vonOrt.trim() || !nachOrt.trim()}
            style={{ width: "100%", padding: "11px 13px", background: autoLoading ? "#9ca3af" : "#1d4ed8", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: autoLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            {autoLoading ? "⏳ Berechne..." : "📍 km automatisch berechnen (Google Maps)"}
          </button>
          {autoBerechnung && autoBerechnung.km > 0 && (
            <div style={{ background: "#dbeafe", border: "1px solid #93c5fd", color: "#1e40af", padding: "8px 12px", borderRadius: 8, fontSize: 12, marginTop: 6 }}>
              🗺️ {autoBerechnung.distanzText} · ⏱️ {autoBerechnung.dauerText}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 5 }}>Kilometer</label>
            <input type="number" value={km} onChange={(e) => setKm(e.target.value)} min="0.1" step="0.1" placeholder="0.0" inputMode="decimal"
              style={{ width: "100%", padding: "12px 13px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 15, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 5 }}>Kunde (opt.)</label>
            <select value={kundenId} onChange={(e) => setKundenId(e.target.value)}
              style={{ width: "100%", padding: "12px 13px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 15, outline: "none", background: "#fff", boxSizing: "border-box" }}>
              <option value="">–</option>
              {kunden.map((k) => (
                <option key={k.id} value={k.id}>{k.vorname} {k.nachname}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 5 }}>Zweck</label>
          <input type="text" value={zweck} onChange={(e) => setZweck(e.target.value)} placeholder="z.B. Einsatz bei Frau Müller"
            style={{ width: "100%", padding: "12px 13px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 15, outline: "none", boxSizing: "border-box" }} />
        </div>

        {/* Vergütungsvorschau */}
        {parseFloat(km) > 0 && (
          <div style={{ background: "#dbeafe", border: "1px solid #93c5fd", color: "#1e40af", padding: "11px 13px", borderRadius: 10, fontSize: 13, marginBottom: 14 }}>
            Vergütung: {eurPreview} € ({km} km × {rate} €)
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 20, paddingTop: 16, borderTop: "1px solid #e5e7eb" }}>
          <button onClick={() => setSheetOpen(false)} style={{ flex: 1, padding: 13, background: "#f4f6f3", color: "#6b7280", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Abbrechen</button>
          <button onClick={saveFahrt} disabled={createFahrt.isPending} style={{ flex: 1, padding: 13, background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            {createFahrt.isPending ? "Speichern…" : "Fahrt speichern"}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
