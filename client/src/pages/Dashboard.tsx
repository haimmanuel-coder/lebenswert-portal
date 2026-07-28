import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { useTimer } from "@/contexts/TimerContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState, useRef } from "react";
import BottomSheet from "@/components/BottomSheet";
import SignatureCanvas from "@/components/SignatureCanvas";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useNavigation, type SeitenId } from "@/contexts/NavigationContext";
import { formatEuro, formatStunden } from "@shared/planungsLogik";

function fmtDate(d: string | Date | null) {
  if (!d) return "–";
  const s = typeof d === "string" ? d : d.toISOString().split("T")[0];
  const [y, m, day] = s.split("-");
  return `${day}.${m}.${y}`;
}

function getParagraphBadge(para: string) {
  if (para === "39") return { cls: "badge-purple", label: "§39" };
  if (para === "45a") return { cls: "badge-teal", label: "§45a" };
  return { cls: "badge-green", label: "§45b" };
}

function getStatusBadge(status: string) {
  if (status === "abgeschlossen") return { cls: "badge-teal", label: "Abgeschlossen" };
  if (status === "abgesagt") return { cls: "badge-red", label: "Abgesagt" };
  return { cls: "badge-yellow", label: "Geplant" };
}

/**
 * Liste der offenen Planungswarnungen.
 *
 * Teamleitung und Administrator bestätigen eine Meldung und können sie
 * anschließend vollständig löschen – bestätigte Meldungen sollen den
 * Arbeitsbereich nicht dauerhaft blockieren.
 */
function WarnungsListe() {
  const { mitarbeiter } = usePortalAuth();
  const darfVerwalten = mitarbeiter?.rolle === "admin" || mitarbeiter?.rolle === "teamleitung";
  const utils = trpc.useUtils();
  const { data: warnungen = [] } = (trpc as any).planung.warnungen.list.useQuery({ nurOffene: false, limit: 25 });

  const aktualisiere = () => {
    (utils as any).planung.warnungen.list.invalidate();
    (utils as any).planung.dashboard.invalidate();
  };

  const bestaetigen = (trpc as any).planung.warnungen.bestaetige.useMutation({
    onSuccess: () => { toast.success("Meldung bestätigt"); aktualisiere(); },
    onError: (e: any) => toast.error(e.message),
  });
  const loeschen = (trpc as any).planung.warnungen.loesche.useMutation({
    onSuccess: () => { toast.success("Meldung entfernt"); aktualisiere(); },
    onError: (e: any) => toast.error(e.message),
  });
  const alleAufraeumen = (trpc as any).planung.warnungen.loescheBestaetigte.useMutation({
    onSuccess: (r: any) => { toast.success(`${r.anzahl} bestätigte Meldungen entfernt`); aktualisiere(); },
    onError: (e: any) => toast.error(e.message),
  });

  const liste = warnungen as any[];
  if (liste.length === 0) return null;
  const bestaetigteAnzahl = liste.filter((w) => w.bestaetigtAt).length;

  return (
    <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,.08)", padding: 16, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>⚠️ Meldungen ({liste.length})</div>
        {darfVerwalten && bestaetigteAnzahl > 0 && (
          <button
            onClick={() => alleAufraeumen.mutate()}
            style={{ fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#f9fafb", color: "#4b5563", cursor: "pointer" }}
          >
            {bestaetigteAnzahl} bestätigte aufräumen
          </button>
        )}
      </div>
      {liste.map((warnung) => (
        <div
          key={warnung.id}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            padding: "9px 0",
            borderBottom: "1px solid #f3f4f6",
            opacity: warnung.bestaetigtAt ? 0.6 : 1,
          }}
        >
          <span style={{ fontSize: 15, flexShrink: 0 }}>
            {warnung.schwere === "blockierend" ? "⛔" : warnung.schwere === "warnung" ? "⚠️" : "ℹ️"}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700 }}>
              {warnung.titel}
              {warnung.bestaetigtAt && (
                <span style={{ marginLeft: 6, fontSize: 10, color: "#059669", fontWeight: 700 }}>✓ bestätigt</span>
              )}
            </div>
            <div style={{ fontSize: 11.5, color: "#6b7280", marginTop: 2 }}>{warnung.nachricht}</div>
          </div>
          {darfVerwalten && (
            <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
              {!warnung.bestaetigtAt && (
                <button
                  onClick={() => bestaetigen.mutate({ id: warnung.id })}
                  style={{ fontSize: 10, fontWeight: 700, padding: "4px 9px", borderRadius: 6, border: "none", background: "#e8f5e4", color: "#2d6a27", cursor: "pointer" }}
                >
                  Bestätigen
                </button>
              )}
              <button
                onClick={() => loeschen.mutate({ id: warnung.id })}
                title="Meldung aus dem Arbeitsbereich entfernen"
                style={{ fontSize: 10, fontWeight: 700, padding: "4px 9px", borderRadius: 6, border: "none", background: "#fee2e2", color: "#b91c1c", cursor: "pointer" }}
              >
                Löschen
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { mitarbeiter } = usePortalAuth();
  const { navigiere } = useNavigation();
  const { timerDisplay, timerLabel, isRunning, isPaused, start, pause, stop } = useTimer();
  const [abschlussOpen, setAbschlussOpen] = useState(false);
  const [activeEinsatz, setActiveEinsatz] = useState<{ id: number; name: string; datum: string } | null>(null);
  const [bericht, setBericht] = useState("");
  const [gesundheit, setGesundheit] = useState<"gut" | "stabil" | "auffaellig" | "kritisch">("gut");
  const [bemerkung, setBemerkung] = useState("");
  const sigRef = useRef<import("@/components/SignatureCanvas").SignatureCanvasRef>(null);

  const { data: einsaetze = [], refetch } = trpc.einsaetze.list.useQuery();
  const { data: kunden = [] } = trpc.kunden.list.useQuery();
  const getKundeName = (id: number) => { const k = kunden.find((c) => c.id === id); return k ? `${k.vorname} ${k.nachname}` : `Kunde #${id}`; };
  const utils = trpc.useUtils();
  const { data: budgetWarnungenRaw = [] } = trpc.kunden.budgetWarnungen.useQuery();
  // Sammelkennzahlen: heutige Einsätze, Personalstand, offene Vorgänge,
  // Budgetverbrauch, Minijob-Warnungen, Touren, Urlaube, Geburtstage, Dokumente
  const { data: kennzahlen } = (trpc as any).planung.dashboard.useQuery();
  const push = usePushNotifications();
  const anzahlBudgetWarnungen = (budgetWarnungenRaw as { id: number }[]).length;
  const updateStatus = trpc.einsaetze.updateStatus.useMutation({
    onSuccess: () => {
      refetch();
      // Budget-Daten nach Einsatz-Abschluss aktualisieren
      utils.kunden.list.invalidate();
      utils.kunden.budgetWarnungen.invalidate();
      toast.success("✅ Einsatz abgeschlossen – Budget aktualisiert");
      setAbschlussOpen(false);
    },
    onError: (e) => toast.error("❌ " + e.message),
  });

  const today = new Date().toISOString().split("T")[0];
  const todayE = einsaetze.filter((e) => {
    const d = typeof e.datum === "string" ? e.datum : (e.datum as Date).toISOString().split("T")[0];
    return d === today;
  });
  const weekE = einsaetze.filter((e) => {
    const d = new Date(typeof e.datum === "string" ? e.datum : e.datum);
    const now = new Date();
    const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 1);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return d >= mon && d <= sun;
  });
  const offenLnw = 0; // will be from leistungen
  const { data: leistungen = [] } = trpc.leistungen.list.useQuery();
  const offenCount = leistungen.filter((l) => l.status === "offen").length;
  const { data: fahrten = [] } = trpc.fahrten.list.useQuery();
  const kmMonth = fahrten.reduce((s, f) => {
    const fd = typeof f.datum === "string" ? f.datum : (f.datum as Date).toISOString().split("T")[0];
    if (fd?.slice(0, 7) === today.slice(0, 7)) s += parseFloat(String(f.kilometer ?? 0));
    return s;
  }, 0);

  const future = einsaetze
    .filter((e) => {
      const d = typeof e.datum === "string" ? e.datum : (e.datum as Date).toISOString().split("T")[0];
      return d > today && e.status === "geplant";
    })
    .sort((a, b) => {
      const da = typeof a.datum === "string" ? a.datum : (a.datum as Date).toISOString().split("T")[0];
      const db2 = typeof b.datum === "string" ? b.datum : (b.datum as Date).toISOString().split("T")[0];
      return da.localeCompare(db2);
    })
    .slice(0, 4);

  const h = new Date().getHours();
  const greet = h < 12 ? "Guten Morgen" : h < 18 ? "Guten Tag" : "Guten Abend";
  const todayStr = new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });

  const handleAbschluss = (id: number, name: string, datum: string) => {
    setActiveEinsatz({ id, name, datum });
    setBericht(""); setBemerkung(""); setGesundheit("gut");
    setAbschlussOpen(true);
  };

  const saveAbschluss = () => {
    if (!activeEinsatz) return;
    updateStatus.mutate({
      id: activeEinsatz.id,
      status: "abgeschlossen",
      bericht,
      gesundheit,
      bemerkung,
      unterschriftMitarbeiter: sigRef.current?.toDataURL() ?? undefined,
    });
  };

  return (
    <div className="page-enter">
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>
          {greet}, {mitarbeiter?.vorname}! 👋
        </div>
        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{todayStr}</div>
      </div>

      {/* Timer */}
      <div className="timer-card">
        <div style={{ fontSize: 13, opacity: 0.85 }}>{timerLabel}</div>
        <div className="timer-display">{timerDisplay}</div>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            onClick={isRunning ? pause : start}
            style={{
              flex: 1, padding: 12, border: "none", borderRadius: 10,
              fontSize: 14, fontWeight: 700, cursor: "pointer",
              background: "#fff", color: "#4a8c3f", transition: "transform 0.15s",
            }}
            onMouseDown={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = "scale(0.96)")}
            onMouseUp={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1)")}
          >
            {isRunning ? "⏸ Pausieren" : isPaused ? "▶ Weiter" : "▶ Starten"}
          </button>
          {(isRunning || isPaused) && (
            <button
              onClick={() => { stop(); toast.success("Timer beendet"); }}
              style={{
                flex: 1, padding: 12, border: "2px solid rgba(255,255,255,0.4)",
                borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer",
                background: "rgba(255,255,255,0.2)", color: "#fff",
              }}
            >
              ■ Beenden
            </button>
          )}
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div className="kpi-card">
          <div className="kpi-value">{todayE.length}</div>
          <div className="kpi-label">Einsätze heute</div>
        </div>
        <div className="kpi-card teal">
          <div className="kpi-value">{weekE.length}</div>
          <div className="kpi-label">Diese Woche</div>
        </div>
        <div className="kpi-card yellow">
          <div className="kpi-value">{offenCount}</div>
          <div className="kpi-label">Offene Nachweise</div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-value">{kmMonth.toFixed(0)}</div>
          <div className="kpi-label">km diesen Monat</div>
        </div>
        {anzahlBudgetWarnungen > 0 && (
          <div style={{ gridColumn: "1 / -1", background: "linear-gradient(135deg, #ef4444, #dc2626)", borderRadius: 12, padding: "12px 16px", color: "#fff", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 28 }}>⚠️</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 900 }}>{anzahlBudgetWarnungen} Kunden mit kritischem Budget</div>
              <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>Weniger als 10 % des Jahresbudgets verfügbar – bitte prüfen</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Erweiterte Kennzahlen ──────────────────────────────────────── */}
      {kennzahlen && (
        <>
          {/* Minijob-Warnungen */}
          {(kennzahlen.minijobWarnungen?.length ?? 0) > 0 && (
            <div
              onClick={() => navigiere("planung")}
              style={{
                background: "linear-gradient(135deg,#ef4444,#dc2626)",
                borderRadius: 12,
                padding: "12px 16px",
                marginBottom: 12,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                gap: 12,
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 26 }}>🔴</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14.5, fontWeight: 900 }}>
                  {kennzahlen.minijobWarnungen.filter((m: any) => m.status.ueberschritten).length} Mitarbeiter
                  überschreitet die Minijob-Grenze
                </div>
                <div style={{ fontSize: 12, opacity: 0.92, marginTop: 2 }}>
                  {kennzahlen.minijobWarnungen
                    .slice(0, 3)
                    .map((m: any) => `${m.name} (${formatEuro(m.lohnkosten)})`)
                    .join(" · ")}
                </div>
              </div>
              <span style={{ fontSize: 18 }}>›</span>
            </div>
          )}

          {/* Kennzahlenkacheln */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: 10,
              marginBottom: 12,
            }}
          >
            {([
              {
                label: "Einsätze heute",
                wert: String(kennzahlen.einsaetzeHeute?.gesamt ?? 0),
                zusatz: `${formatStunden(kennzahlen.einsaetzeHeute?.stunden ?? 0)}`,
                farbe: "#4a8c3f",
                ziel: "planung" as SeitenId,
              },
              {
                label: "Aktive Mitarbeiter",
                wert: String(kennzahlen.mitarbeiter?.imEinsatz ?? 0),
                zusatz: `von ${kennzahlen.mitarbeiter?.gesamt ?? 0} im Einsatz`,
                farbe: "#0ea5e9",
                ziel: "mitarbeiterakte" as SeitenId,
              },
              {
                label: "Freie Mitarbeiter",
                wert: String(kennzahlen.mitarbeiter?.frei ?? 0),
                zusatz: `${kennzahlen.mitarbeiter?.abwesend ?? 0} abwesend`,
                farbe: "#14b8a6",
                ziel: "planung" as SeitenId,
              },
              {
                label: "Offene Kassenanfragen",
                wert: String(kennzahlen.offeneKassenanfragen ?? 0),
                farbe: "#8b5cf6",
                ziel: "kassenanfrage" as SeitenId,
              },
              {
                label: "Offene Genehmigungen",
                wert: String(kennzahlen.offeneGenehmigungen ?? 0),
                zusatz: `${kennzahlen.offeneUrlaubsantraege ?? 0} Urlaub · ${kennzahlen.offeneLeistungsnachweise ?? 0} LNW`,
                farbe: "#f59e0b",
                ziel: "urlaub" as SeitenId,
              },
              {
                label: "Touren heute",
                wert: String(kennzahlen.tourenHeute?.length ?? 0),
                farbe: "#6366f1",
                ziel: "touren" as SeitenId,
              },
              {
                label: "Kommende Urlaube",
                wert: String(kennzahlen.kommendeUrlaube?.length ?? 0),
                zusatz: "nächste 30 Tage",
                farbe: "#eab308",
                ziel: "urlaub" as SeitenId,
              },
              {
                label: "Offene Dokumente",
                wert: String(kennzahlen.ablaufendeDokumente?.length ?? 0),
                zusatz: "laufen ab",
                farbe: "#ef4444",
                ziel: "mitarbeiterakte" as SeitenId,
              },
            ]).map((karte) => (
              <button
                key={karte.label}
                type="button"
                onClick={() => navigiere(karte.ziel)}
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  padding: "11px 13px",
                  boxShadow: "0 2px 8px rgba(0,0,0,.06)",
                  borderLeft: `4px solid ${karte.farbe}`,
                  border: "none",
                  borderLeftWidth: 4,
                  borderLeftStyle: "solid",
                  borderLeftColor: karte.farbe,
                  textAlign: "left",
                  cursor: "pointer",
                  font: "inherit",
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>{karte.wert}</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2, fontWeight: 600 }}>{karte.label}</div>
                {karte.zusatz && (
                  <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 1 }}>{karte.zusatz}</div>
                )}
              </button>
            ))}
          </div>

          {/* Budgetverbrauch je Paragraph */}
          {kennzahlen.budgetJeParagraph && (
            <div
              style={{
                background: "#fff",
                borderRadius: 12,
                boxShadow: "0 2px 10px rgba(0,0,0,.08)",
                padding: 16,
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Budgetverbrauch je Paragraph</div>
              {(["45b", "45a", "39"] as const).map((paragraph) => {
                const eintrag = kennzahlen.budgetJeParagraph[paragraph];
                if (!eintrag) return null;
                const prozent = eintrag.budget > 0 ? Math.round((eintrag.verbraucht / eintrag.budget) * 100) : 0;
                return (
                  <div key={paragraph} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700 }}>§{paragraph}</span>
                      <span style={{ color: "#6b7280" }}>
                        {formatEuro(eintrag.verbraucht)} von {formatEuro(eintrag.budget)} ·{" "}
                        <strong style={{ color: "#166534" }}>{formatStunden(eintrag.stunden)} frei</strong>
                      </span>
                    </div>
                    <div style={{ height: 8, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${Math.min(100, prozent)}%`,
                          height: "100%",
                          background: prozent >= 90 ? "#dc2626" : prozent >= 70 ? "#f59e0b" : "#4a8c3f",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Budgetverbrauch pro Kunde – kritische Kunden */}
          {(kennzahlen.kritischeKunden?.length ?? 0) > 0 && (
            <div
              style={{
                background: "#fff",
                borderRadius: 12,
                boxShadow: "0 2px 10px rgba(0,0,0,.08)",
                padding: 16,
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
                Kunden mit kritischem Budget ({kennzahlen.kritischeKunden.length})
              </div>
              {kennzahlen.kritischeKunden.slice(0, 6).map((kunde: any, index: number) => (
                <div
                  key={`${kunde.id}-${kunde.paragraph}-${index}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 0",
                    borderBottom: "1px solid #f3f4f6",
                    fontSize: 12.5,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{kunde.name}</span>
                  <span style={{ color: "#6b7280" }}>
                    §{kunde.paragraph}:{" "}
                    <strong style={{ color: "#dc2626" }}>{formatEuro(kunde.rest)}</strong> ={" "}
                    {formatStunden(kunde.stunden)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Geburtstage */}
          {(kennzahlen.geburtstage?.length ?? 0) > 0 && (
            <div
              style={{
                background: "#fff",
                borderRadius: 12,
                boxShadow: "0 2px 10px rgba(0,0,0,.08)",
                padding: 16,
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>🎂 Kommende Geburtstage</div>
              {kennzahlen.geburtstage.slice(0, 5).map((geburtstag: any, index: number) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "5px 0",
                    fontSize: 12.5,
                    borderBottom: "1px solid #f9fafb",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>
                    {geburtstag.name}
                    <span style={{ color: "#9ca3af", fontWeight: 400, marginLeft: 6, fontSize: 11 }}>
                      {geburtstag.typ === "kunde" ? "Kunde" : "Mitarbeiter"}
                    </span>
                  </span>
                  <span style={{ color: "#6b7280" }}>
                    {geburtstag.tageBis === 0 ? "heute" : `in ${geburtstag.tageBis} Tagen`}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Offene Warnungen mit Bestätigen/Löschen */}
          {(kennzahlen.warnungen?.length ?? 0) > 0 && <WarnungsListe />}
        </>
      )}

      {/* Push-Benachrichtigungen Opt-In */}
      {push.isSupported && !push.isSubscribed && push.permission !== "denied" && (
        <div style={{ background: "linear-gradient(135deg, #4a8c3f, #2d6a27)", borderRadius: 12, padding: "14px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 12, color: "#fff" }}>
          <div style={{ fontSize: 26 }}>🔔</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Push-Benachrichtigungen</div>
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>Erhalte sofort Alarm bei kritischen Budget-Warnungen</div>
          </div>
          <button
            onClick={push.subscribe}
            disabled={push.isLoading}
            style={{ background: "#fff", color: "#4a8c3f", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: push.isLoading ? "wait" : "pointer", whiteSpace: "nowrap" }}
          >
            {push.isLoading ? "..." : "Aktivieren"}
          </button>
        </div>
      )}
      {push.isSupported && push.isSubscribed && (
        <div style={{ background: "#e8f5e4", borderRadius: 12, padding: "10px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10, border: "1.5px solid #4a8c3f" }}>
          <span style={{ fontSize: 18 }}>✅</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#4a8c3f", flex: 1 }}>Push-Benachrichtigungen aktiv</span>
          <button onClick={push.unsubscribe} style={{ background: "none", border: "none", fontSize: 12, color: "#6b7280", cursor: "pointer" }}>Deaktivieren</button>
        </div>
      )}

      {/* Heute */}
      <div className="card" style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,.08)", padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          Heute
          <span className="badge-green" style={{ display: "inline-block", padding: "3px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
            {todayE.length}
          </span>
        </div>
        {todayE.length === 0 ? (
          <p style={{ color: "#6b7280", fontSize: 13, padding: "8px 0" }}>Keine Einsätze heute.</p>
        ) : (
          todayE.map((e) => {
            const datum = typeof e.datum === "string" ? e.datum : (e.datum as Date).toISOString().split("T")[0];
            const pb = getParagraphBadge(e.paragraph);
            const sb = getStatusBadge(e.status);
            return (
              <div key={e.id} className="list-item">
                <div className={`li-icon ${e.status === "abgeschlossen" ? "teal" : ""}`}>
                  {e.status === "abgeschlossen" ? "✅" : "📍"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {getKundeName(e.kundenId)}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                    {fmtDate(datum)} · {(e.startzeit || "").slice(0, 5)} Uhr · {e.dauerStunden}h
                    <span className={pb.cls} style={{ display: "inline-block", padding: "2px 6px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>
                      {pb.label}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <span className={sb.cls} style={{ display: "inline-block", padding: "3px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                    {sb.label}
                  </span>
                  {e.status === "geplant" && (
                    <div>
                      <button
                        onClick={() => handleAbschluss(e.id, getKundeName(e.kundenId), fmtDate(datum))}
                        style={{
                          marginTop: 6, padding: "7px 12px", background: "#4a8c3f", color: "#fff",
                          border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                        }}
                      >
                        Abschließen
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Nächste Einsätze */}
      <div className="card" style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,.08)", padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Nächste Einsätze</div>
        {future.length === 0 ? (
          <p style={{ color: "#6b7280", fontSize: 13, padding: "8px 0" }}>Keine weiteren Einsätze geplant.</p>
        ) : (
          future.map((e) => {
            const datum = typeof e.datum === "string" ? e.datum : (e.datum as Date).toISOString().split("T")[0];
            const pb = getParagraphBadge(e.paragraph);
            return (
              <div key={e.id} className="list-item">
                <div className="li-icon">📅</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{getKundeName(e.kundenId)}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                    {fmtDate(datum)} · {(e.startzeit || "").slice(0, 5)} Uhr · {e.dauerStunden}h
                    <span className={pb.cls} style={{ display: "inline-block", padding: "2px 6px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>
                      {pb.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Abschluss Sheet */}
      <BottomSheet open={abschlussOpen} onClose={() => setAbschlussOpen(false)} title="Einsatz abschließen">
        {activeEinsatz && (
          <div style={{ background: "#dbeafe", border: "1px solid #93c5fd", color: "#1e40af", padding: "11px 13px", borderRadius: 10, fontSize: 13, marginBottom: 14 }}>
            Einsatz bei {activeEinsatz.name} am {activeEinsatz.datum}
          </div>
        )}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 5 }}>Besuchsbericht</label>
          <textarea value={bericht} onChange={(e) => setBericht(e.target.value)} placeholder="Was wurde gemacht? Besonderheiten?" style={{ width: "100%", padding: "12px 13px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 15, outline: "none", resize: "none", minHeight: 80, fontFamily: "inherit", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 5 }}>Gesundheitszustand</label>
          <select value={gesundheit} onChange={(e) => setGesundheit(e.target.value as typeof gesundheit)} style={{ width: "100%", padding: "12px 13px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 15, outline: "none", background: "#fff", boxSizing: "border-box" }}>
            <option value="gut">Gut</option>
            <option value="stabil">Stabil</option>
            <option value="auffaellig">Auffällig – Admin informiert</option>
            <option value="kritisch">Kritisch – Notfall eingeleitet</option>
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 5 }}>Bemerkungen</label>
          <textarea value={bemerkung} onChange={(e) => setBemerkung(e.target.value)} placeholder="Optional..." style={{ width: "100%", padding: "12px 13px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 15, outline: "none", resize: "none", minHeight: 60, fontFamily: "inherit", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 5 }}>Unterschrift Mitarbeiter</label>
          <SignatureCanvas ref={sigRef} height={140} />
          <button onClick={() => sigRef.current?.clear()} style={{ marginTop: 8, padding: "7px 12px", background: "#f4f6f3", color: "#6b7280", border: "2px solid #e5e7eb", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Löschen</button>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 20, paddingTop: 16, borderTop: "1px solid #e5e7eb" }}>
          <button onClick={() => setAbschlussOpen(false)} style={{ flex: 1, padding: 13, background: "#f4f6f3", color: "#6b7280", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Abbrechen</button>
          <button onClick={saveAbschluss} disabled={updateStatus.isPending} style={{ flex: 1, padding: 13, background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            {updateStatus.isPending ? "Speichern…" : "✓ Abschließen"}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
