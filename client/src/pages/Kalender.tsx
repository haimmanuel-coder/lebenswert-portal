import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";

const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

type Einsatz = {
  id: number;
  datum: string | Date;
  status: string;
  kundenId: number;
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstWeekday(year: number, month: number) {
  // 0=So → wir wollen Mo=0
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

function toDateStr(d: string | Date): string {
  if (typeof d === "string") return d.split("T")[0];
  return d.toISOString().split("T")[0];
}

const STATUS_STYLE: Record<string, { bg: string; color: string; dot: string }> = {
  geplant:       { bg: "#f3f4f6", color: "#374151", dot: "#9ca3af" },
  abgeschlossen: { bg: "#d1fae5", color: "#166534", dot: "#22c55e" },
  verpasst:      { bg: "#fee2e2", color: "#dc2626", dot: "#ef4444" },
  unterwegs:     { bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },
};

export default function Kalender() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const { data: einsaetze = [], isLoading: einsaetzeLoading, isError: einsaetzeError, refetch: refetchEinsaetze } = trpc.einsaetze.list.useQuery();
  const { data: kunden = [] } = trpc.kunden.list.useQuery();

  const getKundeName = (id: number) => {
    const k = kunden.find((c: any) => c.id === id);
    return k ? `${(k as any).vorname} ${(k as any).nachname}` : `Kunde #${id}`;
  };

  // Einsätze nach Datum gruppieren
  const byDate = useMemo(() => {
    const map: Record<string, Einsatz[]> = {};
    (einsaetze as Einsatz[]).forEach(e => {
      const d = toDateStr(e.datum);
      if (!map[d]) map[d] = [];
      map[d].push(e);
    });
    return map;
  }, [einsaetze]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstWeekday = getFirstWeekday(year, month);
  const today = now.toISOString().split("T")[0];

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };

  // Statistik für diesen Monat
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthEinsaetze = (einsaetze as Einsatz[]).filter(e => toDateStr(e.datum).startsWith(monthStr));
  const stats = {
    gesamt: monthEinsaetze.length,
    abgeschlossen: monthEinsaetze.filter(e => e.status === "abgeschlossen").length,
    geplant: monthEinsaetze.filter(e => e.status === "geplant").length,
    verpasst: monthEinsaetze.filter(e => e.status === "verpasst").length,
  };

  const selectedEinsaetze = selectedDay ? (byDate[selectedDay] ?? []) : [];

  return (
    <div style={{ padding: "20px 16px", maxWidth: 600, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1a2e1a", margin: 0 }}>📅 Einsatz-Kalender</h1>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>Monatsübersicht aller Einsätze</p>
      </div>

      {/* Monats-Statistik */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
        {[
          { label: "Gesamt", value: stats.gesamt, bg: "#f3f4f6", color: "#374151" },
          { label: "Erledigt", value: stats.abgeschlossen, bg: "#d1fae5", color: "#166534" },
          { label: "Geplant", value: stats.geplant, bg: "#dbeafe", color: "#1e40af" },
          { label: "Verpasst", value: stats.verpasst, bg: "#fee2e2", color: "#dc2626" },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: s.color, fontWeight: 600, textTransform: "uppercase" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Loading / Error */}
      {einsaetzeLoading && (
        <div style={{ textAlign: "center", padding: "20px", color: "#9ca3af" }}>⏳ Lade Einsätze...</div>
      )}
      {einsaetzeError && (
        <div style={{ textAlign: "center", padding: "16px", color: "#dc2626", background: "#fee2e2", borderRadius: 10, marginBottom: 12 }}>
          ❌ Fehler beim Laden der Einsätze
          <button onClick={() => refetchEinsaetze()} style={{ marginLeft: 12, padding: "4px 12px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>Erneut</button>
        </div>
      )}

      {/* Kalender-Navigation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button onClick={prevMonth} style={{ background: "#f3f4f6", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 16, cursor: "pointer", fontWeight: 700 }}>‹</button>
        <span style={{ fontSize: 17, fontWeight: 800, color: "#1a2e1a" }}>{MONATE[month]} {year}</span>
        <button onClick={nextMonth} style={{ background: "#f3f4f6", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 16, cursor: "pointer", fontWeight: 700 }}>›</button>
      </div>

      {/* Kalender-Grid */}
      <div style={{ background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        {/* Wochentag-Header */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "#4a8c3f" }}>
          {WOCHENTAGE.map(d => (
            <div key={d} style={{ textAlign: "center", padding: "8px 2px", fontSize: 11, fontWeight: 700, color: "#fff" }}>{d}</div>
          ))}
        </div>

        {/* Tage */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {/* Leere Felder vor dem 1. */}
          {Array.from({ length: firstWeekday }).map((_, i) => (
            <div key={`empty-${i}`} style={{ minHeight: 52, borderRight: "1px solid #f3f4f6", borderBottom: "1px solid #f3f4f6", background: "#fafafa" }} />
          ))}

          {/* Tage des Monats */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayEinsaetze = byDate[dateStr] ?? [];
            const isToday = dateStr === today;
            const isSelected = dateStr === selectedDay;
            const colIdx = (firstWeekday + i) % 7;
            const isWeekend = colIdx >= 5;

            return (
              <div
                key={day}
                onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                style={{
                  minHeight: 52,
                  borderRight: "1px solid #f3f4f6",
                  borderBottom: "1px solid #f3f4f6",
                  padding: "5px 4px",
                  cursor: "pointer",
                  background: isSelected ? "#f0fdf4" : isToday ? "#fefce8" : isWeekend ? "#fafafa" : "#fff",
                  transition: "background 0.15s",
                  position: "relative",
                }}
              >
                <div style={{
                  fontSize: 12, fontWeight: isToday ? 800 : 500,
                  color: isToday ? "#4a8c3f" : isWeekend ? "#9ca3af" : "#374151",
                  marginBottom: 3,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 22, height: 22, borderRadius: "50%",
                  background: isToday ? "#d1fae5" : "transparent",
                }}>
                  {day}
                </div>
                {/* Einsatz-Dots */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                  {dayEinsaetze.slice(0, 3).map((e, idx) => {
                    const s = STATUS_STYLE[e.status] ?? STATUS_STYLE.geplant;
                    return (
                      <div key={idx} style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot }} title={e.status} />
                    );
                  })}
                  {dayEinsaetze.length > 3 && (
                    <div style={{ fontSize: 8, color: "#6b7280", fontWeight: 700 }}>+{dayEinsaetze.length - 3}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legende */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
        {Object.entries(STATUS_STYLE).map(([key, val]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#6b7280" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: val.dot }} />
            <span style={{ textTransform: "capitalize" }}>{key === "abgeschlossen" ? "Erledigt" : key === "geplant" ? "Geplant" : key === "verpasst" ? "Verpasst" : "Unterwegs"}</span>
          </div>
        ))}
      </div>

      {/* Tages-Detail */}
      {selectedDay && (
        <div style={{ marginTop: 16, background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 14, padding: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#1a2e1a", marginBottom: 10 }}>
            📋 {new Date(selectedDay + "T12:00:00").toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}
          </div>
          {selectedEinsaetze.length === 0 ? (
            <div style={{ color: "#9ca3af", fontSize: 13 }}>Keine Einsätze an diesem Tag</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {selectedEinsaetze.map((e: any) => {
                const s = STATUS_STYLE[e.status] ?? STATUS_STYLE.geplant;
                return (
                  <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, background: s.bg, borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: s.color }}>{getKundeName(e.kundenId)}</div>
                      {e.paragraph && <div style={{ fontSize: 11, color: s.color }}>§ {e.paragraph}</div>}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: s.color, textTransform: "capitalize" }}>{e.status}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
