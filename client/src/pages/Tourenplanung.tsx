import { useState, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function getWeekDates(baseDate: Date) {
  const day = baseDate.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
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

export default function Tourenplanung() {
  const { user } = useAuth();
  const isAdmin = (user as any)?.rolle === "admin";

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDatum, setSelectedDatum] = useState<string | null>(null);
  const [dragTourId, setDragTourId] = useState<number | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createDatum, setCreateDatum] = useState("");
  const [createMaId, setCreateMaId] = useState<number | null>(null);
  const [createTitel, setCreateTitel] = useState("");
  const [createNotizen, setCreateNotizen] = useState("");
  const [editTour, setEditTour] = useState<any | null>(null);
  const [editNotizen, setEditNotizen] = useState("");

  const heute = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    return d.toISOString().split("T")[0];
  }, []);
  const maxPlanDatum = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  }, []);

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);

  const { data: touren = [], refetch } = trpc.touren.list.useQuery();
  const { data: mitarbeiterListe = [] } = trpc.admin.mitarbeiterList.useQuery(undefined, { enabled: isAdmin });
  const { data: abwesenheiten = [] } = (trpc.touren as any).listAbwesenheiten.useQuery();

  // Abwesenheiten nach Datum-Bereich aufschlüsseln
  const abwesenheitenByDatum = useMemo(() => {
    const map: Record<string, Array<{ typ: 'urlaub' | 'krank'; name: string; bis: string | null }>> = {};
    (abwesenheiten as any[]).forEach(a => {
      const von = new Date(a.von);
      const bis = a.bis ? new Date(a.bis) : von;
      const cursor = new Date(von);
      while (cursor <= bis) {
        const key = cursor.toISOString().split('T')[0];
        if (!map[key]) map[key] = [];
        map[key].push({ typ: a.typ, name: `${a.mitarbeiterVorname} ${a.mitarbeiterNachname}`.trim(), bis: a.bis });
        cursor.setDate(cursor.getDate() + 1);
      }
    });
    return map;
  }, [abwesenheiten]);

  const createMut = trpc.touren.create.useMutation({
    onSuccess: () => {
      toast.success("✅ Tour erstellt!");
      setShowCreateModal(false);
      setCreateTitel(""); setCreateNotizen(""); setCreateMaId(null);
      refetch();
    },
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

  const tourenByDatum = useMemo(() => {
    const map: Record<string, any[]> = {};
    (touren as any[]).forEach(t => {
      const d = toDateStr(new Date(t.datum));
      if (!map[d]) map[d] = [];
      map[d].push(t);
    });
    return map;
  }, [touren]);

  const weekLabel = `${weekDates[0].toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })} – ${weekDates[6].toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}`;

  function handleDayClick(dateStr: string) {
    if (isAdmin) {
      setCreateDatum(dateStr);
      setShowCreateModal(true);
    } else {
      setSelectedDatum(selectedDatum === dateStr ? null : dateStr);
    }
  }

  function handleDragStart(e: React.DragEvent, tourId: number) {
    setDragTourId(tourId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, dateStr: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverDate(dateStr);
  }

  function handleDrop(e: React.DragEvent, dateStr: string) {
    e.preventDefault();
    setDragOverDate(null);
    if (!dragTourId || !moveMut) return;
    moveMut.mutate({ id: dragTourId, newDatum: dateStr });
    setDragTourId(null);
  }

  function handleDragEnd() {
    setDragTourId(null);
    setDragOverDate(null);
  }

  function openEditTour(t: any) {
    setEditTour(t);
    setEditNotizen(t.notizen || "");
  }

  return (
    <div style={{ padding: "16px 12px 100px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: 0 }}>🗺️ Tourenplanung</h1>
        {isAdmin && (
          <button
            onClick={() => { setCreateDatum(heute); setShowCreateModal(true); }}
            style={{ background: "#0d9488", color: "#fff", border: "none", borderRadius: 10, padding: "8px 16px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
          >
            + Tour erstellen
          </button>
        )}
      </div>

      {/* Wochennavigation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", padding: "10px 14px", marginBottom: 14 }}>
        <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); }}
          style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#374151", padding: "0 8px" }}>‹</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{weekLabel}</div>
          <button onClick={() => setCurrentDate(new Date())} style={{ background: "none", border: "none", color: "#0d9488", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Heute</button>
        </div>
        <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); }}
          style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#374151", padding: "0 8px" }}>›</button>
      </div>

      {/* Kalender-Wochenansicht */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 16 }}>
        {weekDates.map((date, i) => {
          const dateStr = toDateStr(date);
          const isToday = toDateStr(new Date()) === dateStr;
          const isDragOver = dragOverDate === dateStr;
          const dayTouren = tourenByDatum[dateStr] || [];
          const isPast = dateStr < heute;
          const isFuture = dateStr > maxPlanDatum;
          const dayAbwesenheiten = abwesenheitenByDatum[dateStr] || [];

          return (
            <div
              key={dateStr}
              onClick={() => handleDayClick(dateStr)}
              onDragOver={(e) => !isPast && handleDragOver(e, dateStr)}
              onDrop={(e) => !isPast && handleDrop(e, dateStr)}
              onDragLeave={() => setDragOverDate(null)}
              style={{
                borderRadius: 12,
                border: isDragOver ? "2px dashed #0d9488" : isToday ? "2px solid #0d9488" : "1px solid #e5e7eb",
                background: isDragOver ? "#f0fdf4" : isToday ? "#f0fdfa" : isPast ? "#fafafa" : "#fff",
                minHeight: 90,
                padding: "8px 6px",
                cursor: isAdmin ? "pointer" : "default",
                transition: "all 0.15s ease",
                opacity: isFuture ? 0.5 : 1,
              }}
            >
              <div style={{ textAlign: "center", marginBottom: 4 }}>
                <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase" }}>{WOCHENTAGE[i]}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: isToday ? "#0d9488" : isPast ? "#9ca3af" : "#111827" }}>
                  {date.getDate()}
                </div>
              </div>
              {dayAbwesenheiten.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 2 }}>
                  {dayAbwesenheiten.slice(0, 2).map((a: any, idx: number) => (
                    <div
                      key={idx}
                      title={`${a.typ === 'urlaub' ? 'Urlaub' : 'Krank'}: ${a.name}`}
                      style={{
                        background: a.typ === 'urlaub' ? '#fef3c7' : '#fee2e2',
                        color: a.typ === 'urlaub' ? '#92400e' : '#dc2626',
                        border: `1px solid ${a.typ === 'urlaub' ? '#fcd34d' : '#fca5a5'}`,
                        borderRadius: 4, padding: '1px 4px', fontSize: 9, fontWeight: 700,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}
                    >
                      {a.typ === 'urlaub' ? '🏖' : '🤒'} {a.name.split(' ')[0]}
                    </div>
                  ))}
                  {dayAbwesenheiten.length > 2 && (
                    <div style={{ fontSize: 9, color: '#9ca3af', textAlign: 'center' }}>+{dayAbwesenheiten.length - 2}</div>
                  )}
                </div>
              )}
              {dayTouren.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {dayTouren.slice(0, 3).map((t: any) => {
                    const sc = STATUS_COLOR[t.status] || { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb" };
                    return (
                      <div
                        key={t.id}
                        draggable={isAdmin}
                        onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, t.id); }}
                        onDragEnd={handleDragEnd}
                        onClick={(e) => { e.stopPropagation(); openEditTour(t); }}
                        style={{
                          background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
                          borderRadius: 6, padding: "2px 5px", fontSize: 10, fontWeight: 600,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          cursor: isAdmin ? "grab" : "pointer",
                        }}
                        title={`${t.mitarbeiterVorname} ${t.mitarbeiterNachname} – ${t.status}`}
                      >
                        {t.mitarbeiterVorname?.[0]}{t.mitarbeiterNachname?.[0]} {t.titel ? `· ${t.titel}` : ""}
                      </div>
                    );
                  })}
                  {dayTouren.length > 3 && (
                    <div style={{ fontSize: 9, color: "#6b7280", textAlign: "center" }}>+{dayTouren.length - 3} mehr</div>
                  )}
                </div>
              )}
              {isAdmin && dayTouren.length === 0 && !isPast && !isFuture && (
                <div style={{ textAlign: "center", color: "#d1d5db", fontSize: 18, marginTop: 4 }}>+</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legende */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12, padding: '8px 12px', background: '#f9fafb', borderRadius: 10, border: '1px solid #f3f4f6' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280' }}>Legende:</span>
        {[{bg:'#dbeafe',border:'#93c5fd',label:'Tour geplant'},{bg:'#fef9c3',border:'#fcd34d',label:'Tour aktiv'},{bg:'#dcfce7',border:'#86efac',label:'Tour fertig'},{bg:'#fef3c7',border:'#fcd34d',label:'🏖️ Urlaub'},{bg:'#fee2e2',border:'#fca5a5',label:'🤒 Krank'}].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: item.bg, border: `1px solid ${item.border}` }} />
            <span style={{ fontSize: 11, color: '#374151' }}>{item.label}</span>
          </div>
        ))}
        {isAdmin && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#9ca3af' }}>Klick = Tour erstellen · Drag &amp; Drop = verschieben</span>}
      </div>

      {/* Tour-Detail-Ansicht (Klick auf Tour-Chip) */}
      {editTour && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 24, maxWidth: 420, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>📋 Tour-Details</h2>
              <button onClick={() => setEditTour(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#6b7280" }}>✕</button>
            </div>
            <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: "#374151" }}>
                <strong>Mitarbeiter:</strong> {editTour.mitarbeiterVorname} {editTour.mitarbeiterNachname}
              </div>
              <div style={{ fontSize: 13, color: "#374151" }}>
                <strong>Datum:</strong> {new Date(editTour.datum + "T12:00:00").toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
              </div>
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
                  <button
                    onClick={() => { updateStatusMut.mutate({ id: editTour.id, status: "aktiv" }); setEditTour(null); }}
                    style={{ flex: 1, background: "#fef9c3", color: "#92400e", border: "1px solid #fcd34d", borderRadius: 10, padding: "8px 12px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                  >▶ Starten</button>
                )}
                {editTour.status === "aktiv" && (
                  <button
                    onClick={() => { updateStatusMut.mutate({ id: editTour.id, status: "abgeschlossen" }); setEditTour(null); }}
                    style={{ flex: 1, background: "#dcfce7", color: "#166534", border: "1px solid #86efac", borderRadius: 10, padding: "8px 12px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                  >✅ Abschließen</button>
                )}
                {deleteMut && (
                  <button
                    onClick={() => {
                      if (!window.confirm("Tour wirklich löschen?")) return;
                      deleteMut.mutate({ id: editTour.id });
                    }}
                    style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 10, padding: "8px 12px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                  >🗑️ Löschen</button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tour erstellen Modal */}
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
                <input
                  type="date" value={createDatum} min={heute} max={maxPlanDatum}
                  onChange={e => setCreateDatum(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 4 }}>TITEL (optional)</label>
                <input
                  type="text" value={createTitel} onChange={e => setCreateTitel(e.target.value)}
                  placeholder="z. B. Morgenrunde Nord"
                  style={{ width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 4 }}>NOTIZEN (optional)</label>
                <textarea
                  value={createNotizen} onChange={e => setCreateNotizen(e.target.value)}
                  rows={2} placeholder="Besonderheiten, Hinweise..."
                  style={{ width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, boxSizing: "border-box", resize: "vertical" }}
                />
              </div>
              {/* P4: Mindestbetreuungszeit-Hinweis */}
              <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "10px 12px", fontSize: 12, color: "#166534" }}>
                ℹ️ Jeder Einsatz in dieser Tour muss mindestens <strong>1,5 Stunden (90 Min.)</strong> dauern. Kürzere Einsätze werden automatisch eskaliert.
              </div>
              {/* P4: Abwesenheits-Konflikt-Warnung */}
              {createMaId && createDatum && (() => {
                const konflikte = (abwesenheitenByDatum[createDatum] || []).filter(a => {
                  const ma = (mitarbeiterListe as any[]).find(m => m.id === createMaId);
                  return ma && a.name === `${ma.vorname} ${ma.nachname}`.trim();
                });
                if (konflikte.length === 0) return null;
                return (
                  <div style={{ background: "#fef9c3", border: "1px solid #fcd34d", borderRadius: 10, padding: "10px 12px", fontSize: 13, color: "#92400e" }}>
                    ⚠️ <strong>Achtung:</strong> Der gewählte Mitarbeiter ist am {new Date(createDatum + 'T12:00:00').toLocaleDateString('de-DE')} als{' '}
                    {konflikte.map(k => k.typ === 'urlaub' ? 'im Urlaub' : 'krank gemeldet').join(', ')} eingetragen.
                    Die Tour kann trotzdem erstellt werden.
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

      {/* Alle Touren Liste */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #f3f4f6", fontWeight: 700, fontSize: 14, color: "#111827" }}>
          📋 Alle Touren ({(touren as any[]).length})
        </div>
        {(touren as any[]).length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>Noch keine Touren geplant.</div>
        ) : (
          <div style={{ maxHeight: 320, overflowY: "auto" }}>
            {(touren as any[]).slice(0, 30).map((t: any) => {
              const sc = STATUS_COLOR[t.status] || { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb" };
              return (
                <div
                  key={t.id}
                  onClick={() => openEditTour(t)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid #f9fafb", cursor: "pointer" }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                      {new Date(t.datum).toLocaleDateString("de-DE")} – {t.mitarbeiterVorname} {t.mitarbeiterNachname}
                    </div>
                    {t.titel && <div style={{ fontSize: 11, color: "#6b7280" }}>{t.titel}</div>}
                  </div>
                  <span style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
                    {t.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
