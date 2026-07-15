import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────
const WOCHENTAGE_KURZ = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONATE = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];

function get14Days(baseDate: Date): Date[] {
  // Beginnt am Montag der aktuellen Woche
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

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

const STATUS_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  geplant:       { bg: "#dbeafe", text: "#1e40af", border: "#93c5fd" },
  aktiv:         { bg: "#fef9c3", text: "#92400e", border: "#fcd34d" },
  abgeschlossen: { bg: "#dcfce7", text: "#166534", border: "#86efac" },
};

// ── Drag-Typen ────────────────────────────────────────────────────────────────
type DragPayload =
  | { type: "tour"; tourId: number }
  | { type: "kunde"; kundenId: number; mitarbeiterId: number };

// ── Hauptkomponente ───────────────────────────────────────────────────────────
export default function Tourenplanung() {
  const { user } = useAuth();
  const isAdmin = (user as any)?.rolle === "admin";

  // Kalender-Navigation (2 Wochen ab Montag der aktuellen Woche)
  const [currentDate, setCurrentDate] = useState(new Date());
  const days = useMemo(() => get14Days(currentDate), [currentDate]);
  const heute = useMemo(() => toDateStr(new Date()), []);
  const maxPlanDatum = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + 14);
    return toDateStr(d);
  }, []);

  // Drag-State
  const [dragPayload, setDragPayload] = useState<DragPayload | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createDatum, setCreateDatum] = useState("");
  const [createMaId, setCreateMaId] = useState<number | null>(null);
  const [createTitel, setCreateTitel] = useState("");
  const [createNotizen, setCreateNotizen] = useState("");
  const [editTour, setEditTour] = useState<any | null>(null);

  // Mitarbeiter-Filter (Admin kann für jeden Mitarbeiter filtern)
  const [filterMaId, setFilterMaId] = useState<number | null>(null);

  // ── Daten ─────────────────────────────────────────────────────────────────
  const { data: touren = [], refetch } = trpc.touren.list.useQuery();
  const { data: mitarbeiterListe = [] } = trpc.admin.mitarbeiterList.useQuery(undefined, { enabled: isAdmin });
  const { data: abwesenheiten = [] } = (trpc.touren as any).listAbwesenheiten.useQuery();
  const { data: zugewieseneKunden = [] } = (trpc.touren as any).listZugewieseneKunden.useQuery();

  // Effektiver Mitarbeiter-ID für Kunden-Sidebar
  const effektivMaId = filterMaId ?? (user as any)?.mitarbeiterId ?? null;

  // Kunden-Sidebar: gefiltert nach ausgewähltem Mitarbeiter (Admin: alle oder gefiltert)
  const sidebarKunden = useMemo(() => {
    if (!isAdmin || !filterMaId) return zugewieseneKunden as any[];
    // Admin mit Filter: nur Kunden des gewählten Mitarbeiters
    return (zugewieseneKunden as any[]);
  }, [zugewieseneKunden, isAdmin, filterMaId]);

  // Touren nach Datum gruppieren
  const tourenByDatum = useMemo(() => {
    const map: Record<string, any[]> = {};
    (touren as any[]).forEach(t => {
      const d = toDateStr(new Date(t.datum));
      if (!map[d]) map[d] = [];
      map[d].push(t);
    });
    return map;
  }, [touren]);

  // Abwesenheiten nach Datum
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

  // ── Mutations ─────────────────────────────────────────────────────────────
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

  const deleteMut = (trpc.touren as any).deleteTour?.useMutation({
    onSuccess: () => { toast.success("🗑️ Tour gelöscht"); setEditTour(null); refetch(); },
    onError: (e: any) => toast.error("❌ " + e.message),
  });

  const createFromKundeMut = (trpc.touren as any).createFromKunde?.useMutation({
    onSuccess: () => { toast.success("✅ Besuchstermin erstellt!"); refetch(); },
    onError: (e: any) => toast.error("❌ " + e.message),
  });

  // ── Drag-and-Drop Handler ─────────────────────────────────────────────────
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
      if (!moveMut) return;
      moveMut.mutate({ id: dragPayload.tourId, newDatum: dateStr });
    } else if (dragPayload.type === "kunde") {
      if (!createFromKundeMut) return;
      createFromKundeMut.mutate({ mitarbeiterId: dragPayload.mitarbeiterId, kundenId: dragPayload.kundenId, datum: dateStr });
    }
    setDragPayload(null);
  }, [dragPayload, moveMut, createFromKundeMut]);

  const handleDragEnd = useCallback(() => {
    setDragPayload(null);
    setDragOverDate(null);
  }, []);

  // ── Kalender-Label ────────────────────────────────────────────────────────
  const rangeLabel = useMemo(() => {
    const start = days[0];
    const end = days[13];
    return `${start.getDate()}. ${MONATE[start.getMonth()]} – ${end.getDate()}. ${MONATE[end.getMonth()]} ${end.getFullYear()}`;
  }, [days]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", gap: 0, height: "100%", minHeight: "calc(100vh - 120px)", background: "#f8fafc" }}>

      {/* ── Kunden-Sidebar ─────────────────────────────────────────────────── */}
      <div style={{
        width: 220, minWidth: 180, maxWidth: 260, background: "#fff",
        borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column",
        flexShrink: 0,
      }}>
        <div style={{ padding: "14px 12px 8px", borderBottom: "1px solid #f3f4f6" }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#111827", marginBottom: 6 }}>👥 Kunden</div>
          {isAdmin && (
            <Select onValueChange={v => setFilterMaId(v === "alle" ? null : Number(v))}>
              <SelectTrigger style={{ fontSize: 11, height: 30 }}>
                <SelectValue placeholder="Mitarbeiter filtern..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle Mitarbeiter</SelectItem>
                {(mitarbeiterListe as any[]).map(ma => (
                  <SelectItem key={ma.id} value={String(ma.id)}>{ma.vorname} {ma.nachname}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 6, lineHeight: 1.4 }}>
            Kunden per Drag &amp; Drop auf einen Kalender-Tag ziehen → Besuchstermin erstellen
          </p>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 6px" }}>
          {(sidebarKunden as any[]).length === 0 ? (
            <div style={{ padding: "16px 8px", textAlign: "center", color: "#9ca3af", fontSize: 12 }}>
              Keine zugewiesenen Kunden
            </div>
          ) : (
            (sidebarKunden as any[]).map((k: any) => (
              <div
                key={k.id}
                draggable
                onDragStart={(e) => handleKundeDragStart(e, k.id)}
                onDragEnd={handleDragEnd}
                style={{
                  background: "#f0fdfa", border: "1px solid #99f6e4",
                  borderRadius: 8, padding: "7px 9px", marginBottom: 5,
                  cursor: "grab", userSelect: "none",
                  transition: "box-shadow 0.15s ease",
                }}
                title={`${k.vorname} ${k.nachname}${k.ort ? ` · ${k.ort}` : ''} · Pflegegrad ${k.pflegegrad}`}
              >
                <div style={{ fontWeight: 600, fontSize: 12, color: "#0f766e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {k.nachname}, {k.vorname}
                </div>
                {k.ort && <div style={{ fontSize: 10, color: "#6b7280", marginTop: 1 }}>📍 {k.ort}</div>}
                {k.pflegegrad > 0 && (
                  <div style={{ fontSize: 10, color: "#0d9488", marginTop: 1 }}>PG {k.pflegegrad}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Kalender-Hauptbereich ───────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "12px 16px 8px", background: "#fff", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 14); setCurrentDate(d); }}
              style={{ background: "#f3f4f6", border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 16, color: "#374151" }}
            >‹</button>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>🗓️ {rangeLabel}</div>
              <button onClick={() => setCurrentDate(new Date())} style={{ background: "none", border: "none", color: "#0d9488", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Heute</button>
            </div>
            <button
              onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 14); setCurrentDate(d); }}
              style={{ background: "#f3f4f6", border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 16, color: "#374151" }}
            >›</button>
          </div>
          {isAdmin && (
            <button
              onClick={() => { setCreateDatum(heute); setShowCreateModal(true); }}
              style={{ background: "#0d9488", color: "#fff", border: "none", borderRadius: 10, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            >
              + Tour erstellen
            </button>
          )}
        </div>

        {/* Wochentag-Header */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
          {WOCHENTAGE_KURZ.map(w => (
            <div key={w} style={{ textAlign: "center", padding: "6px 2px", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>{w}</div>
          ))}
        </div>

        {/* 2-Wochen-Kalender-Grid (2 Zeilen × 7 Spalten) */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
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
                <div
                  key={dateStr}
                  onDragOver={(e) => !isPast && !isFuture && handleDragOver(e, dateStr)}
                  onDrop={(e) => !isPast && !isFuture && handleDrop(e, dateStr)}
                  onDragLeave={() => setDragOverDate(null)}
                  onClick={() => {
                    if (isAdmin && !isPast && !isFuture) {
                      setCreateDatum(dateStr);
                      setShowCreateModal(true);
                    }
                  }}
                  style={{
                    borderRadius: 10,
                    border: isDragOver ? "2px dashed #0d9488" : isToday ? "2px solid #0d9488" : "1px solid #e5e7eb",
                    background: isDragOver ? "#f0fdf4" : isToday ? "#f0fdfa" : isWeekend ? "#fafafa" : isPast ? "#f9fafb" : "#fff",
                    minHeight: 100,
                    padding: "6px 5px",
                    cursor: isAdmin && !isPast && !isFuture ? "pointer" : "default",
                    transition: "all 0.12s ease",
                    opacity: isFuture ? 0.45 : 1,
                    position: "relative",
                  }}
                >
                  {/* Datum-Kopf */}
                  <div style={{ textAlign: "center", marginBottom: 3 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 700,
                      color: isToday ? "#fff" : isPast ? "#9ca3af" : "#111827",
                      background: isToday ? "#0d9488" : "transparent",
                      borderRadius: isToday ? "50%" : 0,
                      width: isToday ? 24 : "auto",
                      height: isToday ? 24 : "auto",
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      margin: "0 auto",
                    }}>
                      {date.getDate()}
                    </div>
                    {/* Monatswechsel-Label */}
                    {date.getDate() === 1 && (
                      <div style={{ fontSize: 9, color: "#0d9488", fontWeight: 700 }}>{MONATE[date.getMonth()]}</div>
                    )}
                  </div>

                  {/* Abwesenheiten */}
                  {dayAbwesenheiten.slice(0, 2).map((a: any, idx: number) => (
                    <div key={idx} title={`${a.typ === 'urlaub' ? 'Urlaub' : 'Krank'}: ${a.name}`} style={{
                      background: a.typ === 'urlaub' ? '#fef3c7' : '#fee2e2',
                      color: a.typ === 'urlaub' ? '#92400e' : '#dc2626',
                      border: `1px solid ${a.typ === 'urlaub' ? '#fcd34d' : '#fca5a5'}`,
                      borderRadius: 4, padding: '1px 4px', fontSize: 9, fontWeight: 700,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2,
                    }}>
                      {a.typ === 'urlaub' ? '🏖' : '🤒'} {a.name.split(' ')[0]}
                    </div>
                  ))}

                  {/* Touren */}
                  {dayTouren.slice(0, 4).map((t: any) => {
                    const sc = STATUS_COLOR[t.status] || { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb" };
                    return (
                      <div
                        key={t.id}
                        draggable={isAdmin}
                        onDragStart={(e) => { e.stopPropagation(); handleTourDragStart(e, t.id); }}
                        onDragEnd={handleDragEnd}
                        onClick={(e) => { e.stopPropagation(); setEditTour(t); }}
                        style={{
                          background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
                          borderRadius: 5, padding: "2px 4px", fontSize: 10, fontWeight: 600,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          cursor: isAdmin ? "grab" : "pointer", marginBottom: 2,
                        }}
                        title={`${t.mitarbeiterVorname} ${t.mitarbeiterNachname}${t.titel ? ` – ${t.titel}` : ''}`}
                      >
                        {t.mitarbeiterVorname?.[0]}{t.mitarbeiterNachname?.[0]}{t.titel ? ` ${t.titel.slice(0, 12)}` : ""}
                      </div>
                    );
                  })}
                  {dayTouren.length > 4 && (
                    <div style={{ fontSize: 9, color: "#6b7280", textAlign: "center" }}>+{dayTouren.length - 4}</div>
                  )}

                  {/* Drag-Drop-Hinweis */}
                  {isDragOver && (
                    <div style={{
                      position: "absolute", inset: 0, borderRadius: 10,
                      background: "rgba(13,148,136,0.08)", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18, pointerEvents: "none",
                    }}>📌</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legende */}
        <div style={{ padding: "8px 12px", background: "#f9fafb", borderTop: "1px solid #f3f4f6", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#6b7280" }}>Legende:</span>
          {[
            { bg: "#dbeafe", border: "#93c5fd", label: "Geplant" },
            { bg: "#fef9c3", border: "#fcd34d", label: "Aktiv" },
            { bg: "#dcfce7", border: "#86efac", label: "Fertig" },
            { bg: "#fef3c7", border: "#fcd34d", label: "🏖️ Urlaub" },
            { bg: "#fee2e2", border: "#fca5a5", label: "🤒 Krank" },
          ].map(item => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: item.bg, border: `1px solid ${item.border}` }} />
              <span style={{ fontSize: 10, color: "#374151" }}>{item.label}</span>
            </div>
          ))}
          <span style={{ marginLeft: "auto", fontSize: 10, color: "#9ca3af" }}>
            Kunden-Sidebar → Drag &amp; Drop auf Tag = Besuch planen · Tour-Chip → Drag = verschieben
          </span>
        </div>
      </div>

      {/* ── Tour-Detail-Modal ───────────────────────────────────────────────── */}
      {editTour && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 24, maxWidth: 420, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>📋 Tour-Details</h2>
              <button onClick={() => setEditTour(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#6b7280" }}>✕</button>
            </div>
            <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: "#374151" }}><strong>Mitarbeiter:</strong> {editTour.mitarbeiterVorname} {editTour.mitarbeiterNachname}</div>
              <div style={{ fontSize: 13, color: "#374151" }}><strong>Datum:</strong> {new Date(editTour.datum + "T12:00:00").toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</div>
              <div style={{ fontSize: 13, color: "#374151" }}>
                <strong>Status:</strong>{" "}
                <span style={{ background: STATUS_COLOR[editTour.status]?.bg, color: STATUS_COLOR[editTour.status]?.text, padding: "2px 8px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                  {editTour.status}
                </span>
              </div>
              {editTour.titel && <div style={{ fontSize: 13, color: "#374151" }}><strong>Titel:</strong> {editTour.titel}</div>}
              {editTour.notizen && <div style={{ fontSize: 13, color: "#374151" }}><strong>Notizen:</strong> {editTour.notizen}</div>}
            </div>
            {isAdmin && editTour.status !== "abgeschlossen" && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {editTour.status === "geplant" && (
                  <button onClick={() => { updateStatusMut.mutate({ id: editTour.id, status: "aktiv" }); setEditTour(null); }}
                    style={{ flex: 1, background: "#fef9c3", color: "#92400e", border: "1px solid #fcd34d", borderRadius: 10, padding: "8px 12px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    ▶ Starten
                  </button>
                )}
                {editTour.status === "aktiv" && (
                  <button onClick={() => { updateStatusMut.mutate({ id: editTour.id, status: "abgeschlossen" }); setEditTour(null); }}
                    style={{ flex: 1, background: "#dcfce7", color: "#166534", border: "1px solid #86efac", borderRadius: 10, padding: "8px 12px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    ✅ Abschließen
                  </button>
                )}
                {deleteMut && (
                  <button onClick={() => { if (!window.confirm("Tour wirklich löschen?")) return; deleteMut.mutate({ id: editTour.id }); }}
                    style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 10, padding: "8px 12px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    🗑️ Löschen
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tour erstellen Modal ────────────────────────────────────────────── */}
      {showCreateModal && isAdmin && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 24, maxWidth: 420, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>🗺️ Neue Tour planen</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#6b7280" }}>✕</button>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 4 }}>MITARBEITER</label>
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
                <label style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 4 }}>
                  DATUM <span style={{ color: "#0d9488" }}>(max. 2 Wochen im Voraus)</span>
                </label>
                <input type="date" value={createDatum} min={heute} max={maxPlanDatum}
                  onChange={e => setCreateDatum(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 4 }}>TITEL (optional)</label>
                <input type="text" value={createTitel} onChange={e => setCreateTitel(e.target.value)}
                  placeholder="z. B. Morgenrunde Nord"
                  style={{ width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 4 }}>NOTIZEN (optional)</label>
                <textarea value={createNotizen} onChange={e => setCreateNotizen(e.target.value)}
                  rows={2} placeholder="Besonderheiten, Hinweise..."
                  style={{ width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, boxSizing: "border-box", resize: "vertical" }}
                />
              </div>
              <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "10px 12px", fontSize: 12, color: "#166534" }}>
                ℹ️ Jeder Einsatz muss mindestens <strong>1,5 Stunden (90 Min.)</strong> dauern.
              </div>
              {/* Abwesenheits-Konflikt-Warnung */}
              {createMaId && createDatum && (() => {
                const konflikte = (abwesenheitenByDatum[createDatum] || []).filter((a: any) => {
                  const ma = (mitarbeiterListe as any[]).find(m => m.id === createMaId);
                  return ma && a.name === `${ma.vorname} ${ma.nachname}`.trim();
                });
                if (konflikte.length === 0) return null;
                return (
                  <div style={{ background: "#fef9c3", border: "1px solid #fcd34d", borderRadius: 10, padding: "10px 12px", fontSize: 13, color: "#92400e" }}>
                    ⚠️ <strong>Achtung:</strong> Mitarbeiter ist am {new Date(createDatum + 'T12:00:00').toLocaleDateString('de-DE')} als{' '}
                    {konflikte.map((k: any) => k.typ === 'urlaub' ? 'im Urlaub' : 'krank').join(', ')} eingetragen.
                  </div>
                );
              })()}
              <button
                onClick={() => {
                  if (!createMaId || !createDatum) { toast.error("Bitte Mitarbeiter und Datum wählen."); return; }
                  createMut.mutate({ mitarbeiterId: createMaId, datum: createDatum, titel: createTitel || undefined, notizen: createNotizen || undefined });
                }}
                disabled={createMut.isPending}
                style={{ background: "#0d9488", color: "#fff", border: "none", borderRadius: 12, padding: "12px", fontWeight: 700, fontSize: 15, cursor: "pointer", opacity: createMut.isPending ? 0.7 : 1 }}
              >
                {createMut.isPending ? "Wird erstellt..." : "✅ Tour erstellen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
