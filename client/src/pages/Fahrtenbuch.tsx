import { useState, useMemo } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import BottomSheet from "@/components/BottomSheet";

function fmtDate(d: string | Date | null) {
  if (!d) return "–";
  const s = typeof d === "string" ? d : d.toISOString().split("T")[0];
  const [y, m, day] = s.split("-");
  return `${day}.${m}.${y}`;
}

function toDateStr(d: string | Date | null): string {
  if (!d) return "";
  return typeof d === "string" ? d.split("T")[0] : d.toISOString().split("T")[0];
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
  // Löschen-Dialog State
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; label: string } | null>(null);

  // ── Filter-State ──────────────────────────────────────────────────────────
  const currentMonat = today.slice(0, 7);
  const [filterMonat, setFilterMonat] = useState(currentMonat);
  const [filterTyp, setFilterTyp] = useState<"" | "normal" | "sonder">("");
  const [filterKunde, setFilterKunde] = useState("");

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
    setDeleteTarget({ id, label });
  };
  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteFahrt.mutate({ id: deleteTarget.id });
    setDeleteTarget(null);
  };

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

  // ── Gefilterte und sortierte Liste ────────────────────────────────────────
  const filtered = useMemo(() => {
    return [...fahrten]
      .filter((f) => {
        const ds = toDateStr(f.datum);
        if (filterMonat && !ds.startsWith(filterMonat)) return false;
        if (filterTyp && f.typ !== filterTyp) return false;
        if (filterKunde && String(f.kundenId) !== filterKunde) return false;
        return true;
      })
      .sort((a, b) => toDateStr(b.datum).localeCompare(toDateStr(a.datum)));
  }, [fahrten, filterMonat, filterTyp, filterKunde]);

  const totalKm = filtered.reduce((s, f) => s + parseFloat(String(f.kilometer ?? 0)), 0);
  const totalEur = filtered.reduce((s, f) => s + parseFloat(String(f.verguetung ?? 0)), 0);

  // ── Verfügbare Monate für Dropdown ────────────────────────────────────────
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    fahrten.forEach(f => {
      const ds = toDateStr(f.datum);
      if (ds) months.add(ds.slice(0, 7));
    });
    if (!months.has(currentMonat)) months.add(currentMonat);
    return Array.from(months).sort().reverse();
  }, [fahrten, currentMonat]);

  // ── CSV-Export ────────────────────────────────────────────────────────────
  function exportCSV() {
    if (filtered.length === 0) { toast.error("Keine Fahrten zum Exportieren"); return; }
    const headers = ["Datum", "Von", "Nach", "Kilometer", "Typ", "Vergütung (€)", "Zweck", "Kunde"];
    const rows = filtered.map(f => {
      const kunde = kunden.find(k => k.id === f.kundenId);
      const kundeName = kunde ? `${kunde.vorname} ${kunde.nachname}` : "";
      return [
        fmtDate(f.datum),
        f.vonOrt ?? "",
        f.nachOrt ?? "",
        parseFloat(String(f.kilometer ?? 0)).toFixed(1),
        f.typ === "sonder" ? "Sonderfahrt" : "Normal",
        parseFloat(String(f.verguetung ?? 0)).toFixed(2),
        f.zweck ?? "",
        kundeName,
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(";");
    });
    // Summenzeile
    rows.push(["", "", "GESAMT", totalKm.toFixed(1), "", totalEur.toFixed(2), "", ""].map(v => `"${v}"`).join(";"));
    const csv = [headers.join(";"), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const monatLabel = filterMonat ? filterMonat.replace("-", "_") : "alle";
    a.download = `Fahrtenbuch_${monatLabel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("📥 CSV exportiert");
  }

  const monatStr = filterMonat
    ? new Date(filterMonat + "-01").toLocaleDateString("de-DE", { month: "long", year: "numeric" })
    : "Alle Monate";

  return (
    <div className="page-enter">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Fahrtenbuch</div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{monatStr}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={exportCSV}
            style={{ padding: "9px 14px", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            📥 CSV
          </button>
          <button
            onClick={() => setSheetOpen(true)}
            style={{ padding: "9px 16px", background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            + Fahrt
          </button>
        </div>
      </div>

      {/* Filter-Leiste */}
      <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: "10px 12px", marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#6b7280" }}>Filter:</span>
        {/* Monat */}
        <select
          value={filterMonat}
          onChange={e => setFilterMonat(e.target.value)}
          style={{ padding: "6px 10px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 12, background: "#fff", cursor: "pointer" }}
        >
          <option value="">Alle Monate</option>
          {availableMonths.map(m => (
            <option key={m} value={m}>
              {new Date(m + "-01").toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
            </option>
          ))}
        </select>
        {/* Typ */}
        <select
          value={filterTyp}
          onChange={e => setFilterTyp(e.target.value as typeof filterTyp)}
          style={{ padding: "6px 10px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 12, background: "#fff", cursor: "pointer" }}
        >
          <option value="">Alle Typen</option>
          <option value="normal">Normal</option>
          <option value="sonder">Sonderfahrt</option>
        </select>
        {/* Kunde */}
        <select
          value={filterKunde}
          onChange={e => setFilterKunde(e.target.value)}
          style={{ padding: "6px 10px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 12, background: "#fff", cursor: "pointer" }}
        >
          <option value="">Alle Kunden</option>
          {kunden.map(k => (
            <option key={k.id} value={String(k.id)}>{k.vorname} {k.nachname}</option>
          ))}
        </select>
        {/* Reset */}
        {(filterMonat !== currentMonat || filterTyp || filterKunde) && (
          <button
            onClick={() => { setFilterMonat(currentMonat); setFilterTyp(""); setFilterKunde(""); }}
            style={{ padding: "5px 10px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
          >
            ✕ Zurücksetzen
          </button>
        )}
      </div>

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div className="kpi-card">
          <div className="kpi-value">{filtered.length}</div>
          <div className="kpi-label">Fahrten</div>
        </div>
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
      {filtered.length === 0 ? (
        <p style={{ color: "#6b7280", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
          {fahrten.length === 0 ? "Noch keine Fahrten erfasst." : "Keine Fahrten für diesen Filter."}
        </p>
      ) : (
        filtered.map((f) => {
          const datum2 = toDateStr(f.datum);
          const kunde = kunden.find(k => k.id === f.kundenId);
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
                    {kunde && <span style={{ color: "#0d9488" }}>· {kunde.vorname} {kunde.nachname}</span>}
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

      {/* Löschen-Sicherheitsabfrage */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fahrt wirklich löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{deleteTarget?.label}</span>
              <br />
              Diese Aktion wird im Audit-Log protokolliert und kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Endgültig löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
