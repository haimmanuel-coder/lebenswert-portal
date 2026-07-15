import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONATE = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];

function get14Days(baseDate: Date): Date[] {
  const day = baseDate.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toDateStr(d: Date) { return d.toISOString().split("T")[0]; }

function parseTourDatum(value: unknown) {
  const raw = String(value ?? "");
  const ymd = raw.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
  const datum = new Date(ymd ? `${ymd}T12:00:00` : raw);
  return Number.isNaN(datum.getTime()) ? null : datum;
}

function formatTourDatum(value: unknown, kurz = false) {
  const datum = parseTourDatum(value);
  if (!datum) return "Datum nicht verfügbar";
  return datum.toLocaleDateString("de-DE", kurz
    ? undefined
    : { weekday: "short", day: "2-digit", month: "short" });
}

function tourAdresse(stopp: any) {
  return [stopp.strasse, [stopp.plz, stopp.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ");
}

function mapsRouteUrl(stopps: any[]) {
  const adressen = stopps.map(tourAdresse).filter(Boolean);
  if (adressen.length === 0) return null;
  const params = new URLSearchParams({ api: "1", destination: adressen[adressen.length - 1], travelmode: "driving" });
  if (adressen.length > 1) params.set("waypoints", adressen.slice(0, -1).join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

const STATUS_STYLE: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  geplant:       { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe", dot: "#3b82f6" },
  aktiv:         { bg: "#fefce8", text: "#854d0e", border: "#fde68a", dot: "#f59e0b" },
  abgeschlossen: { bg: "#f0fdf4", text: "#166534", border: "#bbf7d0", dot: "#22c55e" },
};

type DragPayload =
  | { type: "tour"; tourId: number }
  | { type: "kunde"; kundenId: number; mitarbeiterId: number };

export default function Tourenplanung() {
  const { mitarbeiter } = usePortalAuth();
  const isAdmin = mitarbeiter?.rolle === "admin";
  const isPlanner = isAdmin || mitarbeiter?.rolle === "teamleitung";

  const [currentDate, setCurrentDate] = useState(new Date());
  const days = useMemo(() => get14Days(currentDate), [currentDate]);
  const heute = useMemo(() => toDateStr(new Date()), []);
  const maxPlanDatum = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + 14); return toDateStr(d);
  }, []);

  const [dragPayload, setDragPayload] = useState<DragPayload | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createDatum, setCreateDatum] = useState("");
  const [createMaId, setCreateMaId] = useState<number | null>(null);
  const [createTitel, setCreateTitel] = useState("");
  const [createNotizen, setCreateNotizen] = useState("");
  const [createStartzeit, setCreateStartzeit] = useState("08:00");
  const [createEndzeit, setCreateEndzeit] = useState("10:00");
  const [editTour, setEditTour] = useState<any | null>(null);
  const [deleteTourTarget, setDeleteTourTarget] = useState<{ id: number; label: string } | null>(null);
  const [filterMaId, setFilterMaId] = useState<number | null>(null);
  const [sidebarSearch, setSidebarSearch] = useState("");

  const { data: touren = [], refetch } = trpc.touren.list.useQuery();
  const { data: mitarbeiterListe = [] } = trpc.admin.mitarbeiterList.useQuery(undefined, { enabled: isAdmin });
  const { data: abwesenheiten = [] } = (trpc.touren as any).listAbwesenheiten.useQuery();
  const { data: zugewieseneKunden = [] } = (trpc.touren as any).listZugewieseneKunden.useQuery();
  const { data: tourStopps = [], isLoading: tourStoppsLaden, refetch: refetchTourStopps } = (trpc.touren as any).getEinsaetze.useQuery(
    { tourId: editTour?.id ?? 0 },
    { enabled: Boolean(editTour?.id) },
  );

  const effektivMaId = filterMaId ?? (mitarbeiter as any)?.id ?? null;

  const sidebarKunden = useMemo(() => {
    let kunden = zugewieseneKunden as any[];
    if (sidebarSearch.trim()) {
      const q = sidebarSearch.toLowerCase();
      kunden = kunden.filter(k => `${k.vorname} ${k.nachname}`.toLowerCase().includes(q) || (k.ort || "").toLowerCase().includes(q));
    }
    return kunden;
  }, [zugewieseneKunden, sidebarSearch]);

  const tourenByDatum = useMemo(() => {
    const map: Record<string, any[]> = {};
    (touren as any[]).forEach(t => {
      const d = toDateStr(new Date(t.datum));
      if (!map[d]) map[d] = [];
      map[d].push(t);
    });
    return map;
  }, [touren]);

  const abwesenheitenByDatum = useMemo(() => {
    const map: Record<string, Array<{ typ: string; name: string }>> = {};
    (abwesenheiten as any[]).forEach(a => {
      const von = new Date(a.von);
      const bis = a.bis ? new Date(a.bis) : von;
      const cursor = new Date(von);
      while (cursor <= bis) {
        const key = toDateStr(cursor);
        if (!map[key]) map[key] = [];
        map[key].push({ typ: a.typ, name: `${a.mitarbeiterVorname} ${a.mitarbeiterNachname}`.trim() });
        cursor.setDate(cursor.getDate() + 1);
      }
    });
    return map;
  }, [abwesenheiten]);

  const createMut = trpc.touren.create.useMutation({
    onSuccess: () => { toast.success("✅ Tour erstellt!"); setShowCreateModal(false); setCreateTitel(""); setCreateNotizen(""); setCreateMaId(null); refetch(); },
    onError: (e) => toast.error("❌ " + e.message),
  });
  const updateStatusMut = trpc.touren.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status aktualisiert"); refetch(); },
    onError: (e) => toast.error("❌ " + e.message),
  });
  const moveMut = (trpc.touren as any).moveTour?.useMutation({
    onSuccess: () => { toast.success("📅 Tour verschoben"); refetch(); },
    onError: (e: any) => toast.error("❌ " + e.message),
  });
  const deleteTourMut = (trpc.touren as any).deleteTour?.useMutation({
    onSuccess: () => { toast.success("🗑️ Tour gelöscht"); setEditTour(null); setDeleteTourTarget(null); refetch(); },
    onError: (e: any) => toast.error("❌ " + e.message),
  });
  const createFromKundeMut = (trpc.touren as any).createFromKunde?.useMutation({
    onSuccess: () => { toast.success("✅ Besuchstermin erstellt!"); refetch(); },
    onError: (e: any) => toast.error("❌ " + e.message),
  });
  const optimizeMut = trpc.touren.optimieren.useMutation({
    onSuccess: async (result) => { toast.success(result.hinweis); await refetchTourStopps(); },
    onError: (e) => toast.error("❌ " + e.message),
  });

  const handleTourDragStart = useCallback((e: React.DragEvent, tourId: number) => {
    setDragPayload({ type: "tour", tourId });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify({ type: "tour", tourId }));
  }, []);

  const handleKundeDragStart = useCallback((e: React.DragEvent, kundenId: number) => {
    const maId = effektivMaId ?? (isAdmin ? (mitarbeiterListe as any[])[0]?.id : null);
    if (!maId) { toast.error("Bitte zuerst einen Mitarbeiter auswählen."); e.preventDefault(); return; }
    setDragPayload({ type: "kunde", kundenId, mitarbeiterId: maId });
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("text/plain", JSON.stringify({ type: "kunde", kundenId, mitarbeiterId: maId }));
  }, [effektivMaId, isAdmin, mitarbeiterListe]);

  const handleDragOver = useCallback((e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = dragPayload?.type === "kunde" ? "copy" : "move";
    setDragOverDate(dateStr);
  }, [dragPayload]);

  const handleDrop = useCallback((e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    setDragOverDate(null);
    if (!dragPayload) return;
    if (dragPayload.type === "tour") {
      moveMut?.mutate({ id: dragPayload.tourId, newDatum: dateStr });
    } else if (dragPayload.type === "kunde") {
      createFromKundeMut?.mutate({ mitarbeiterId: dragPayload.mitarbeiterId, kundenId: dragPayload.kundenId, datum: dateStr });
    }
    setDragPayload(null);
  }, [dragPayload, moveMut, createFromKundeMut]);

  const handleDragEnd = useCallback(() => { setDragPayload(null); setDragOverDate(null); }, []);

  const rangeLabel = useMemo(() => {
    const s = days[0]; const e = days[13];
    return `${s.getDate()}. ${MONATE[s.getMonth()]} – ${e.getDate()}. ${MONATE[e.getMonth()]} ${e.getFullYear()}`;
  }, [days]);

  // Dauer-Berechnung für Create-Modal
  const dauerMin = useMemo(() => {
    if (!createStartzeit || !createEndzeit) return 0;
    const [sh, sm] = createStartzeit.split(":").map(Number);
    const [eh, em] = createEndzeit.split(":").map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  }, [createStartzeit, createEndzeit]);

  return (
    <div style={{ display: "flex", height: "100%", minHeight: "calc(100vh - 64px)", background: "#f1f5f9" }}>

      {/* ── Kunden-Sidebar ─────────────────────────────────────────────────── */}
      <div style={{ width: 230, minWidth: 200, background: "#fff", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", flexShrink: 0, boxShadow: "2px 0 8px rgba(0,0,0,0.04)" }}>
        <div style={{ padding: "16px 14px 10px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: "#0f172a", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 16 }}>👥</span> Kunden
          </div>
          {isAdmin && (
            <Select onValueChange={v => setFilterMaId(v === "alle" ? null : Number(v))}>
              <SelectTrigger style={{ fontSize: 11, height: 30, marginBottom: 6 }}>
                <SelectValue placeholder="Alle Mitarbeiter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle Mitarbeiter</SelectItem>
                {(mitarbeiterListe as any[]).map(ma => (
                  <SelectItem key={ma.id} value={String(ma.id)}>{ma.vorname} {ma.nachname}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <input
            value={sidebarSearch}
            onChange={e => setSidebarSearch(e.target.value)}
            placeholder="🔍 Suchen..."
            style={{ width: "100%", padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, boxSizing: "border-box", background: "#fff", outline: "none" }}
          />
          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 6, textAlign: "center" }}>↕ Auf Kalender-Tag ziehen</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
          {sidebarKunden.length === 0 ? (
            <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 12, padding: "20px 8px" }}>
              {(zugewieseneKunden as any[]).length === 0 ? "Keine Kunden zugewiesen" : "Keine Treffer"}
            </div>
          ) : (
            sidebarKunden.map((k: any) => (
              <div key={k.id} draggable onDragStart={(e) => handleKundeDragStart(e, k.id)} onDragEnd={handleDragEnd}
                style={{ background: "#fafafa", border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 10px", marginBottom: 6, cursor: "grab", userSelect: "none", transition: "all 0.12s ease" }}
                title={`${k.vorname} ${k.nachname}${k.ort ? ` · ${k.ort}` : ""}`}
              >
                <div style={{ fontWeight: 700, fontSize: 12, color: "#0f766e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k.nachname}, {k.vorname}</div>
                <div style={{ display: "flex", gap: 4, marginTop: 3, flexWrap: "wrap" }}>
                  {k.ort && <span style={{ fontSize: 10, color: "#64748b" }}>📍 {k.ort}</span>}
                  {k.pflegegrad > 0 && <span style={{ fontSize: 10, background: "#e0f2fe", color: "#0369a1", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>PG {k.pflegegrad}</span>}
                </div>
              </div>
            ))
          )}
        </div>
        <div style={{ padding: "8px 12px", borderTop: "1px solid #f1f5f9", background: "#f8fafc" }}>
          <div style={{ fontSize: 10, color: "#94a3b8", textAlign: "center" }}>{sidebarKunden.length} Kunden</div>
        </div>
      </div>

      {/* ── Kalender-Hauptbereich ───────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Kalender-Header */}
        <div style={{ padding: "12px 16px", background: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 14); setCurrentDate(d); }}
              style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 16, color: "#374151", fontWeight: 700 }}>‹</button>
            <div style={{ textAlign: "center", minWidth: 220 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>🗓️ {rangeLabel}</div>
              <button onClick={() => setCurrentDate(new Date())} style={{ background: "none", border: "none", color: "#0d9488", fontSize: 11, cursor: "pointer", fontWeight: 700, marginTop: 2 }}>↩ Heute</button>
            </div>
            <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 14); setCurrentDate(d); }}
              style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 16, color: "#374151", fontWeight: 700 }}>›</button>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {[{ dot: "#3b82f6", label: "Geplant" }, { dot: "#f59e0b", label: "Aktiv" }, { dot: "#22c55e", label: "Fertig" }].map(item => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.dot }} />
                  <span style={{ fontSize: 11, color: "#64748b" }}>{item.label}</span>
                </div>
              ))}
            </div>
            {isAdmin && (
              <button onClick={() => { setCreateDatum(heute); setShowCreateModal(true); }}
                style={{ background: "#0d9488", color: "#fff", border: "none", borderRadius: 10, padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: "0 2px 8px rgba(13,148,136,0.3)" }}>
                + Tour erstellen
              </button>
            )}
          </div>
        </div>

        {/* Wochentag-Header */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", padding: "0 8px" }}>
          {WOCHENTAGE.map(w => (
            <div key={w} style={{ textAlign: "center", padding: "8px 2px", fontSize: 12, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{w}</div>
          ))}
        </div>

        {/* 2-Wochen-Kalender-Grid */}
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px 16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
            {days.map((date, i) => {
              const dateStr = toDateStr(date);
              const isToday = dateStr === heute;
              const isPast = dateStr < heute;
              const isFuture = dateStr > maxPlanDatum;
              const isDragOver = dragOverDate === dateStr;
              const dayTouren = tourenByDatum[dateStr] || [];
              const dayAbwesenheiten = abwesenheitenByDatum[dateStr] || [];
              const isWeekend = i % 7 === 5 || i % 7 === 6;

              return (
                <div key={dateStr}
                  onDragOver={(e) => !isPast && !isFuture && handleDragOver(e, dateStr)}
                  onDrop={(e) => !isPast && !isFuture && handleDrop(e, dateStr)}
                  onDragLeave={() => setDragOverDate(null)}
                  onClick={() => { if (isAdmin && !isPast && !isFuture) { setCreateDatum(dateStr); setShowCreateModal(true); } }}
                  style={{
                    borderRadius: 12,
                    border: isDragOver ? "2px dashed #0d9488" : isToday ? "2px solid #0d9488" : "1px solid #e2e8f0",
                    background: isDragOver ? "#f0fdf4" : isToday ? "#f0fdfa" : isWeekend ? "#f8fafc" : isPast ? "#fafafa" : "#fff",
                    minHeight: 120, padding: "8px 6px 6px",
                    cursor: isAdmin && !isPast && !isFuture ? "pointer" : "default",
                    transition: "all 0.15s ease",
                    opacity: isFuture ? 0.4 : 1,
                    position: "relative",
                    boxShadow: isToday ? "0 0 0 2px rgba(13,148,136,0.15)" : isDragOver ? "0 4px 16px rgba(13,148,136,0.2)" : "none",
                  }}
                >
                  {/* Datum-Header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: "50%",
                      background: isToday ? "#0d9488" : "transparent",
                      color: isToday ? "#fff" : isPast ? "#94a3b8" : "#0f172a",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: isToday ? 800 : 600,
                    }}>{date.getDate()}</div>
                    {dayTouren.length > 0 && (
                      <span style={{ background: "#dbeafe", color: "#1d4ed8", fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 10 }}>{dayTouren.length}</span>
                    )}
                  </div>

                  {/* Abwesenheits-Badges */}
                  {dayAbwesenheiten.slice(0, 2).map((a, idx) => (
                    <div key={idx} style={{
                      fontSize: 9, padding: "1px 4px", borderRadius: 4, marginBottom: 2,
                      background: a.typ === "urlaub" ? "#fef3c7" : "#fee2e2",
                      color: a.typ === "urlaub" ? "#92400e" : "#991b1b",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600,
                    }}>
                      {a.typ === "urlaub" ? "🏖️" : "🤒"} {a.name.split(" ")[1] || a.name}
                    </div>
                  ))}

                  {/* Tour-Chips */}
                  {dayTouren.slice(0, 4).map((t: any) => {
                    const sc = STATUS_STYLE[t.status] || STATUS_STYLE.geplant;
                    return (
                      <div key={t.id}
                        draggable={isAdmin}
                        onDragStart={(e) => { e.stopPropagation(); handleTourDragStart(e, t.id); }}
                        onDragEnd={handleDragEnd}
                        onClick={(e) => { e.stopPropagation(); setEditTour(t); }}
                        style={{
                          background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
                          borderLeft: `3px solid ${sc.dot}`, borderRadius: 6,
                          padding: "3px 5px", fontSize: 10, fontWeight: 600,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          cursor: isAdmin ? "grab" : "pointer", marginBottom: 2, transition: "opacity 0.1s",
                        }}
                        title={`${t.mitarbeiterVorname} ${t.mitarbeiterNachname}${t.titel ? ` – ${t.titel}` : ""}`}
                      >
                        <span style={{ opacity: 0.7 }}>{t.mitarbeiterVorname?.[0]}{t.mitarbeiterNachname?.[0]}</span>
                        {t.titel ? ` ${t.titel.slice(0, 14)}` : " Tour"}
                      </div>
                    );
                  })}
                  {dayTouren.length > 4 && (
                    <div style={{ fontSize: 9, color: "#64748b", textAlign: "center", fontWeight: 600 }}>+{dayTouren.length - 4} weitere</div>
                  )}

                  {/* Drop-Overlay */}
                  {isDragOver && (
                    <div style={{ position: "absolute", inset: 0, borderRadius: 12, background: "rgba(13,148,136,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, pointerEvents: "none" }}>📌</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "8px 16px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
          Kunden-Sidebar → auf Tag ziehen = Besuch planen &nbsp;·&nbsp; Tour-Chip → ziehen = verschieben &nbsp;·&nbsp; Klick auf Tag = neue Tour
        </div>
      </div>

      {/* ── Tour-Detail-Modal ───────────────────────────────────────────────── */}
      {editTour && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 28, maxWidth: 440, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "#0f172a" }}>📋 Tour-Details</h2>
              <button onClick={() => setEditTour(null)} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "#64748b" }}>✕</button>
            </div>
            <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 2 }}>MITARBEITER</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{editTour.mitarbeiterVorname} {editTour.mitarbeiterNachname}</div>
                </div>
                <div style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 2 }}>DATUM</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                    {formatTourDatum(editTour.datum)}
                  </div>
                </div>
              </div>
              {editTour.titel && (
                <div style={{ background: "#f0fdfa", borderRadius: 10, padding: "10px 12px", border: "1px solid #99f6e4" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#0d9488", marginBottom: 2 }}>TITEL</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{editTour.titel}</div>
                </div>
              )}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}><div style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>KARTE & NAVIGATION</div>{isPlanner && (tourStopps as any[]).length > 1 && <button disabled={optimizeMut.isPending} onClick={() => { if (confirm("Stopps jetzt datenschutzfreundlich nach Adressbereichen neu ordnen?")) optimizeMut.mutate({ tourId: editTour.id }); }} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--lw-accent)", background: "var(--lw-accent-light)", color: "var(--lw-accent)", fontWeight: 800, cursor: "pointer" }}>{optimizeMut.isPending ? "Optimiert …" : "Route optimieren"}</button>}</div>
                {tourStoppsLaden ? (
                  <div style={{ padding: 12, background: "#f8fafc", borderRadius: 10, color: "#64748b", fontSize: 12 }}>Kartenstopps werden geladen …</div>
                ) : (tourStopps as any[]).length > 0 ? (
                  <div style={{ border: "1px solid #ddd6fe", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
                    {tourAdresse((tourStopps as any[])[0]) && (
                      <iframe
                        title="Tourenkarte"
                        src={`https://www.google.com/maps?q=${encodeURIComponent(tourAdresse((tourStopps as any[])[0]))}&output=embed`}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        style={{ width: "100%", height: 180, border: 0, display: "block" }}
                      />
                    )}
                    <div style={{ padding: 10, display: "grid", gap: 6 }}>
                      {(tourStopps as any[]).map((stopp, index) => (
                        <div key={stopp.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12 }}>
                          <span style={{ width: 22, height: 22, flexShrink: 0, borderRadius: "50%", background: "var(--lw-accent-light)", color: "var(--lw-accent)", display: "grid", placeItems: "center", fontWeight: 800 }}>{index + 1}</span>
                          <div><strong>{stopp.kundenVorname} {stopp.kundenNachname}</strong><br /><span style={{ color: "#64748b" }}>{tourAdresse(stopp) || "Adresse noch nicht hinterlegt"}</span></div>
                        </div>
                      ))}
                      {mapsRouteUrl(tourStopps as any[]) && (
                        <a href={mapsRouteUrl(tourStopps as any[])!} target="_blank" rel="noopener noreferrer" style={{ marginTop: 4, padding: "10px 12px", borderRadius: 9, background: "var(--lw-accent)", color: "#fff", textDecoration: "none", fontWeight: 800, textAlign: "center" }}>
                          Navigation für die ganze Tour starten
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: 12, background: "#f8fafc", borderRadius: 10, color: "#64748b", fontSize: 12 }}>Dieser Tour ist noch kein Kundenbesuch zugeordnet.</div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>STATUS ÄNDERN</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {["geplant", "aktiv", "abgeschlossen"].map(s => {
                    const sc = STATUS_STYLE[s];
                    const isActive = editTour.status === s;
                    return (
                      <button key={s}
                        onClick={() => { updateStatusMut.mutate({ id: editTour.id, status: s as any }); setEditTour({ ...editTour, status: s }); }}
                        style={{ flex: 1, padding: "8px 4px", background: isActive ? sc.bg : "#f8fafc", color: isActive ? sc.text : "#64748b", border: isActive ? `2px solid ${sc.border}` : "1px solid #e2e8f0", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}
                      >
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: sc.dot, margin: "0 auto 3px" }} />
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>
              {editTour.notizen && (
                <div style={{ background: "#fafafa", borderRadius: 10, padding: "10px 12px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 2 }}>NOTIZEN</div>
                  <div style={{ fontSize: 12, color: "#374151" }}>{editTour.notizen}</div>
                </div>
              )}
            </div>
            {isAdmin && (
              <button
                onClick={() => setDeleteTourTarget({ id: editTour.id, label: `${editTour.mitarbeiterVorname} ${editTour.mitarbeiterNachname} – ${formatTourDatum(editTour.datum, true)}` })}
                style={{ width: "100%", padding: "10px", background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
              >🗑️ Tour löschen</button>
            )}
          </div>
        </div>
      )}

      {/* ── Tour erstellen Modal ────────────────────────────────────────────── */}
      {showCreateModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 28, maxWidth: 440, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.25)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "#0f172a" }}>🗺️ Neue Tour planen</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "#64748b" }}>✕</button>
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 5, textTransform: "uppercase" }}>Mitarbeiter *</label>
                <Select onValueChange={v => setCreateMaId(Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Mitarbeiter wählen..." /></SelectTrigger>
                  <SelectContent>
                    {(mitarbeiterListe as any[]).map(ma => (
                      <SelectItem key={ma.id} value={String(ma.id)}>{ma.vorname} {ma.nachname}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 5, textTransform: "uppercase" }}>
                  Datum * <span style={{ color: "#0d9488", fontWeight: 600, textTransform: "none" }}>(max. 2 Wochen im Voraus)</span>
                </label>
                <input type="date" value={createDatum} min={heute} max={maxPlanDatum} onChange={e => setCreateDatum(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 14, boxSizing: "border-box", outline: "none" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 5, textTransform: "uppercase" }}>Startzeit</label>
                  <input type="time" value={createStartzeit} onChange={e => setCreateStartzeit(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 14, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 5, textTransform: "uppercase" }}>Endzeit</label>
                  <input type="time" value={createEndzeit} onChange={e => setCreateEndzeit(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 14, boxSizing: "border-box" }} />
                </div>
              </div>
              {dauerMin > 0 && (
                <div style={{ background: dauerMin >= 90 ? "#f0fdf4" : "#fef9c3", border: `1px solid ${dauerMin >= 90 ? "#86efac" : "#fcd34d"}`, borderRadius: 10, padding: "8px 12px", fontSize: 12, color: dauerMin >= 90 ? "#166534" : "#92400e" }}>
                  {dauerMin >= 90 ? "✅" : "⚠️"} Dauer: <strong>{Math.floor(dauerMin / 60) > 0 ? `${Math.floor(dauerMin / 60)}h ` : ""}{dauerMin % 60 > 0 ? `${dauerMin % 60}min` : ""}</strong>
                  {dauerMin < 90 && " – Mindestens 1,5 Stunden erforderlich"}
                </div>
              )}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 5, textTransform: "uppercase" }}>Titel (optional)</label>
                <input type="text" value={createTitel} onChange={e => setCreateTitel(e.target.value)} placeholder="z. B. Morgenrunde Nord"
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 5, textTransform: "uppercase" }}>Notizen (optional)</label>
                <textarea value={createNotizen} onChange={e => setCreateNotizen(e.target.value)} rows={2} placeholder="Besonderheiten, Hinweise..."
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 14, boxSizing: "border-box", resize: "vertical" }} />
              </div>
              {createMaId && createDatum && (() => {
                const konflikte = (abwesenheitenByDatum[createDatum] || []).filter((a: any) => {
                  const ma = (mitarbeiterListe as any[]).find(m => m.id === createMaId);
                  return ma && a.name === `${ma.vorname} ${ma.nachname}`.trim();
                });
                if (konflikte.length === 0) return null;
                return (
                  <div style={{ background: "#fef9c3", border: "1px solid #fcd34d", borderRadius: 10, padding: "10px 12px", fontSize: 13, color: "#92400e" }}>
                    ⚠️ <strong>Achtung:</strong> Mitarbeiter ist am {new Date(createDatum + "T12:00:00").toLocaleDateString("de-DE")} als{" "}
                    {konflikte.map((k: any) => k.typ === "urlaub" ? "im Urlaub" : "krank").join(", ")} eingetragen.
                  </div>
                );
              })()}
              <button
                onClick={() => {
                  if (!createMaId || !createDatum) { toast.error("Bitte Mitarbeiter und Datum wählen."); return; }
                  createMut.mutate({ mitarbeiterId: createMaId, datum: createDatum, titel: createTitel || undefined, notizen: createNotizen || undefined });
                }}
                disabled={createMut.isPending}
                style={{ background: "#0d9488", color: "#fff", border: "none", borderRadius: 12, padding: "13px", fontWeight: 800, fontSize: 15, cursor: createMut.isPending ? "not-allowed" : "pointer", opacity: createMut.isPending ? 0.7 : 1, boxShadow: "0 2px 8px rgba(13,148,136,0.3)" }}
              >
                {createMut.isPending ? "Wird erstellt..." : "✅ Tour erstellen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tour-Lösch-Bestätigung ──────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTourTarget} onOpenChange={(open) => !open && setDeleteTourTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tour wirklich löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{deleteTourTarget?.label}</span>
              <br />
              Diese Aktion wird protokolliert und kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTourTarget && deleteTourMut?.mutate({ id: deleteTourTarget.id })} className="bg-red-600 hover:bg-red-700 text-white">
              Endgültig löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
