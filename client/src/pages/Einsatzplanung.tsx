/**
 * ════════════════════════════════════════════════════════════════════════════
 *  EINSATZPLANUNG – zentrale Planungsoberfläche für die Teamleitung
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Zeigt jederzeit, welcher Mitarbeiter bei welchem Kunden an welchem Tag zu
 * welcher Uhrzeit im Einsatz ist. Die Planung berücksichtigt gleichzeitig
 * Personaleinsatz, Budget, Paragraphen, Lohnkosten, Touren, Urlaub und
 * Warnungen – alles in Echtzeit.
 *
 * Ansichten: 14 Tage (Standard), Woche, Monat.
 *
 * Der Terminassistent berechnet Stunden automatisch aus Start- und Endzeit
 * (nie manuelle Eingabe) und zeigt vor dem Speichern:
 *   • verfügbares Restbudget und Reststunden je Paragraph
 *   • Kosten des Einsatzes inklusive Anfahrtspauschale
 *   • Restbudget und Reststunden nach diesem Einsatz
 *   • Lohnkosten und Minijob-Auslastung des Mitarbeiters
 *   • alle blockierenden Konflikte (Urlaub, Doppelbuchung, Budget)
 */

import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { toast } from "sonner";
import AuswahlFeld, { kundenZuOptionen, mitarbeiterZuOptionen } from "@/components/AuswahlFeld";
import {
  addTage,
  berechneStunden,
  formatEuro,
  formatStunden,
  getFeiertag,
  getMitarbeiterFarbe,
  liegtImZeitraum,
  montagDerWoche,
  zuDatumsString,
  type Paragraph,
} from "@shared/planungsLogik";

// ── Darstellungshilfen ──────────────────────────────────────────────────────

const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const STATUS_FARBEN: Record<string, { hintergrund: string; text: string; label: string }> = {
  geplant: { hintergrund: "#eff6ff", text: "#1d4ed8", label: "Geplant" },
  bestaetigt: { hintergrund: "#f0fdf4", text: "#15803d", label: "Bestätigt" },
  abgeschlossen: { hintergrund: "#ecfdf5", text: "#047857", label: "Abgeschlossen" },
  abgesagt: { hintergrund: "#fef2f2", text: "#b91c1c", label: "Abgesagt" },
  aenderung_angefragt: { hintergrund: "#fefce8", text: "#a16207", label: "Änderung angefragt" },
};

function tagesLabel(datum: string): string {
  const d = new Date(`${datum}T12:00:00`);
  return `${WOCHENTAGE[(d.getDay() + 6) % 7]}, ${String(d.getDate()).padStart(2, "0")}.${String(
    d.getMonth() + 1,
  ).padStart(2, "0")}.`;
}

function istWochenende(datum: string): boolean {
  const tag = new Date(`${datum}T12:00:00`).getDay();
  return tag === 0 || tag === 6;
}

/** Standardformular eines neuen Termins. */
const LEERES_FORMULAR = {
  id: null as number | null,
  mitarbeiterId: null as number | null,
  kundenId: null as number | null,
  datum: "",
  startzeit: "09:00",
  endzeit: "11:30",
  paragraph: "45b" as Paragraph,
  paragraph2: null as Paragraph | null,
  stunden2: 0,
  notizen: "",
};

type FormularZustand = typeof LEERES_FORMULAR;

// ════════════════════════════════════════════════════════════════════════════

export default function Einsatzplanung() {
  const { mitarbeiter } = usePortalAuth();
  const heute = zuDatumsString(new Date());

  const [ansicht, setAnsicht] = useState<"14tage" | "woche" | "monat">("14tage");
  const [startDatum, setStartDatum] = useState(heute);
  const [filterMitarbeiterId, setFilterMitarbeiterId] = useState<number | null>(null);
  const [formularOffen, setFormularOffen] = useState(false);
  const [formular, setFormular] = useState<FormularZustand>(LEERES_FORMULAR);
  const [uebersteuern, setUebersteuern] = useState(false);

  const utils = trpc.useUtils();

  // ── Daten laden ───────────────────────────────────────────────────────────
  const {
    data: planung,
    isLoading,
    error,
    refetch,
  } = (trpc as any).planung.uebersicht.useQuery({
    ansicht,
    startDatum,
    mitarbeiterId: filterMitarbeiterId,
  });

  const { data: kunden = [] } = trpc.kunden.list.useQuery();
  // Eigene Planungsroute: liefert der Teamleitung nur die Basisangaben,
  // ohne dass Admin-Rechte auf die volle Mitarbeiterakte nötig wären.
  const { data: alleMitarbeiter = [] } = (trpc as any).planung.mitarbeiterListe.useQuery();

  const darfPlanen = Boolean(planung?.rechte?.darfPlanen);
  const darfLoeschen = Boolean(planung?.rechte?.darfLoeschen);
  const darfAlleSehen = Boolean(planung?.rechte?.darfAlleSehen);

  const kundenOptionen = useMemo(() => kundenZuOptionen(kunden as any[]), [kunden]);
  const mitarbeiterOptionen = useMemo(
    () => mitarbeiterZuOptionen(alleMitarbeiter as any[], getMitarbeiterFarbe),
    [alleMitarbeiter],
  );

  // ── Live-Prüfung des Formulars ───────────────────────────────────────────
  // Wird bei jeder Eingabe neu ausgeführt, damit Warnungen während der
  // Planung erscheinen – nicht erst nach dem Speichern.
  const pruefEingabe = useMemo(() => {
    if (!formular.mitarbeiterId || !formular.kundenId || !formular.datum) return null;
    return {
      mitarbeiterId: formular.mitarbeiterId,
      kundenId: formular.kundenId,
      datum: formular.datum,
      startzeit: formular.startzeit,
      endzeit: formular.endzeit,
      paragraph: formular.paragraph,
      paragraph2: formular.paragraph2,
      stunden2: formular.paragraph2 ? formular.stunden2 : null,
      notizen: formular.notizen || null,
      uebersteuern,
    };
  }, [formular, uebersteuern]);

  const { data: pruefung, isFetching: pruefungLaeuft } = (trpc as any).planung.pruefe.useQuery(
    pruefEingabe,
    { enabled: Boolean(pruefEingabe) && formularOffen, retry: false },
  );

  // Stunden werden immer berechnet, nie eingegeben.
  const berechneteStunden = berechneStunden(formular.startzeit, formular.endzeit);

  // ── Mutationen ────────────────────────────────────────────────────────────
  const nachSpeichern = () => {
    refetch();
    utils.kunden.list.invalidate();
    utils.kunden.budgetWarnungen.invalidate();
    setFormularOffen(false);
    setFormular(LEERES_FORMULAR);
    setUebersteuern(false);
  };

  const erstellen = (trpc as any).planung.erstelle.useMutation({
    onSuccess: () => {
      toast.success("Termin geplant und Budget reserviert.");
      nachSpeichern();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const aktualisieren = (trpc as any).planung.aktualisiere.useMutation({
    onSuccess: () => {
      toast.success("Termin aktualisiert.");
      nachSpeichern();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const loeschen = (trpc as any).planung.loesche.useMutation({
    onSuccess: () => {
      toast.success("Termin gelöscht – Budget wurde zurückgebucht.");
      refetch();
      utils.kunden.list.invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const statusSetzen = (trpc as any).planung.setzeStatus.useMutation({
    onSuccess: () => {
      toast.success("Status geändert.");
      refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Abgeleitete Daten für die Kalenderdarstellung ────────────────────────
  const tage = useMemo(() => {
    if (!planung) return [] as string[];
    const liste: string[] = [];
    let aktuell = planung.von;
    while (aktuell <= planung.bis) {
      liste.push(aktuell);
      aktuell = addTage(aktuell, 1);
    }
    return liste;
  }, [planung]);

  const termineProTag = useMemo(() => {
    const karte = new Map<string, any[]>();
    for (const termin of (planung?.termine ?? []) as any[]) {
      const liste = karte.get(termin.datum) ?? [];
      liste.push(termin);
      karte.set(termin.datum, liste);
    }
    // Innerhalb eines Tages nach Startzeit sortieren
    karte.forEach((liste) => {
      liste.sort((a: any, b: any) => (a.startzeit ?? "").localeCompare(b.startzeit ?? ""));
    });
    return karte;
  }, [planung]);

  const abwesenheitenProTag = (datum: string) =>
    ((planung?.abwesenheiten ?? []) as any[]).filter((a) => liegtImZeitraum(datum, a.von, a.bis));

  // Kennzahlen des Zeitraums
  const kennzahlen = useMemo(() => {
    const termine = ((planung?.termine ?? []) as any[]).filter((t) => t.status !== "abgesagt");
    return {
      anzahl: termine.length,
      stunden: termine.reduce((s, t) => s + (t.stunden ?? 0), 0),
      kosten: termine.reduce((s, t) => s + (t.kostenGesamt ?? 0), 0),
      lohnkosten: termine.reduce((s, t) => s + (t.lohnkosten ?? 0), 0),
    };
  }, [planung]);

  const kritischeMitarbeiter = useMemo(
    () => ((planung?.auslastung ?? []) as any[]).filter((a) => a.ueberschritten),
    [planung],
  );

  // ── Formular öffnen ───────────────────────────────────────────────────────
  const neuerTermin = (datum: string) => {
    if (!darfPlanen) return;
    setFormular({
      ...LEERES_FORMULAR,
      datum,
      mitarbeiterId: filterMitarbeiterId ?? mitarbeiter?.id ?? null,
    });
    setUebersteuern(false);
    setFormularOffen(true);
  };

  const terminBearbeiten = (termin: any) => {
    if (!darfPlanen) return;
    setFormular({
      id: termin.id,
      mitarbeiterId: termin.mitarbeiterId,
      kundenId: termin.kundenId,
      datum: termin.datum,
      startzeit: termin.startzeit ?? "09:00",
      endzeit: termin.endzeit ?? "11:30",
      paragraph: termin.paragraph,
      paragraph2: termin.paragraph2,
      stunden2: termin.stunden2 ?? 0,
      notizen: termin.notizen ?? "",
    });
    setUebersteuern(false);
    setFormularOffen(true);
  };

  const speichern = () => {
    if (!pruefEingabe) {
      toast.error("Bitte Mitarbeiter, Kunde und Datum auswählen.");
      return;
    }
    if (pruefung && !pruefung.speicherbar) {
      toast.error("Der Termin kann noch nicht gespeichert werden – bitte die roten Hinweise beachten.");
      return;
    }
    if (formular.id) {
      aktualisieren.mutate({ ...pruefEingabe, id: formular.id });
    } else {
      erstellen.mutate(pruefEingabe);
    }
  };

  // Bei Wechsel des zweiten Paragraphen sinnvolle Stundenaufteilung vorschlagen
  useEffect(() => {
    if (!formular.paragraph2) return;
    if (formular.stunden2 > 0) return;
    const gesamt = berechneStunden(formular.startzeit, formular.endzeit) ?? 0;
    if (gesamt > 0) {
      setFormular((f) => ({ ...f, stunden2: Math.round((gesamt / 2) * 100) / 100 }));
    }
    // Nur beim Aktivieren des zweiten Paragraphen einen Vorschlag machen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formular.paragraph2]);

  // ── Zeitraumnavigation ───────────────────────────────────────────────────
  const schritt = ansicht === "monat" ? 30 : ansicht === "woche" ? 7 : 14;
  const zurueck = () => setStartDatum((d) => addTage(d, -schritt));
  const vor = () => setStartDatum((d) => addTage(d, schritt));

  // ── Rendern ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Einsatzplanung</div>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              height: 90,
              background: "linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%)",
              backgroundSize: "200% 100%",
              animation: "lwShimmer 1.4s infinite",
              borderRadius: 12,
              marginBottom: 10,
            }}
          />
        ))}
        <style>{`@keyframes lwShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
        <div style={{ color: "#dc2626", fontWeight: 700, marginBottom: 4 }}>
          Planung konnte nicht geladen werden
        </div>
        <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 12 }}>{(error as any).message}</div>
        <button
          onClick={() => refetch()}
          style={{
            padding: "9px 18px",
            background: "#4a8c3f",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, paddingBottom: 80 }}>
      {/* ── Kopfbereich ───────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 19, fontWeight: 800 }}>Einsatzplanung</div>
          <div style={{ fontSize: 12.5, color: "#6b7280", marginTop: 2 }}>
            {planung?.von} bis {planung?.bis} · {kennzahlen.anzahl} Termine ·{" "}
            {formatStunden(kennzahlen.stunden)}
          </div>
        </div>
        {darfPlanen && (
          <button
            onClick={() => neuerTermin(heute)}
            style={{
              padding: "10px 18px",
              background: "#4a8c3f",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 13.5,
              cursor: "pointer",
            }}
          >
            + Termin planen
          </button>
        )}
      </div>

      {/* ── Minijob-Warnungen (Admin-Sicht) ───────────────────────────── */}
      {kritischeMitarbeiter.length > 0 && (
        <div
          style={{
            background: "linear-gradient(135deg,#ef4444,#dc2626)",
            color: "#fff",
            borderRadius: 12,
            padding: "12px 16px",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 26 }}>🔴</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 14.5 }}>
              {kritischeMitarbeiter.length} Mitarbeiter überschreitet die Minijob-Grenze
            </div>
            <div style={{ fontSize: 12, opacity: 0.92, marginTop: 2 }}>
              {kritischeMitarbeiter
                .map((m: any) => `${m.name} (${formatEuro(m.lohnkosten)})`)
                .join(" · ")}
            </div>
          </div>
        </div>
      )}

      {/* ── Kennzahlen ────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 10,
          marginBottom: 14,
        }}
      >
        {[
          { label: "Termine", wert: String(kennzahlen.anzahl), farbe: "#4a8c3f" },
          { label: "Betreuungsstunden", wert: formatStunden(kennzahlen.stunden), farbe: "#0ea5e9" },
          { label: "Budgetkosten", wert: formatEuro(kennzahlen.kosten), farbe: "#8b5cf6" },
          { label: "Lohnkosten", wert: formatEuro(kennzahlen.lohnkosten), farbe: "#f59e0b" },
        ].map((karte) => (
          <div
            key={karte.label}
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: "12px 14px",
              boxShadow: "0 2px 8px rgba(0,0,0,.06)",
              borderLeft: `4px solid ${karte.farbe}`,
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 800, color: "#111827" }}>{karte.wert}</div>
            <div style={{ fontSize: 11.5, color: "#6b7280", marginTop: 2 }}>{karte.label}</div>
          </div>
        ))}
      </div>

      {/* ── Schnellansicht: Heutige eigene Einsätze (nur für normale MA) ─── */}
      {!darfAlleSehen && (() => {
        const heutigeTermine = (termineProTag.get(heute) ?? []).filter(
          (t: any) => t.status !== "abgesagt"
        );
        if (heutigeTermine.length === 0) return null;
        return (
          <div style={{
            background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
            border: "1.5px solid #93c5fd",
            borderRadius: 14,
            padding: "14px 16px",
            marginBottom: 14,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 18 }}>🗓️</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#1d4ed8" }}>
                Deine Einsätze heute
              </span>
              <span style={{
                background: "#6366f1", color: "#fff",
                fontSize: 10, fontWeight: 800,
                padding: "2px 8px", borderRadius: 20, marginLeft: "auto",
              }}>
                {heutigeTermine.length} Termin{heutigeTermine.length !== 1 ? "e" : ""}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {heutigeTermine.map((t: any) => {
                const kunde = (kunden as any[]).find((k: any) => k.id === t.kundenId);
                const kundeName = kunde
                  ? `${kunde.vorname ?? ""} ${kunde.nachname ?? ""}`.trim()
                  : `Kunde #${t.kundenId}`;
                const sf = STATUS_FARBEN[t.status] ?? STATUS_FARBEN.geplant;
                return (
                  <div key={t.id} style={{
                    background: "#fff",
                    borderRadius: 10,
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%",
                      background: "#eff6ff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18, flexShrink: 0,
                    }}>👤</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14, fontWeight: 700, color: "#111827",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {kundeName}
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                        {(t.startzeit ?? "").slice(0, 5)} – {(t.endzeit ?? "").slice(0, 5)} Uhr
                        {t.stunden ? ` · ${t.stunden}h` : ""}
                        {t.paragraph ? ` · §${t.paragraph}` : ""}
                      </div>
                    </div>
                    <span style={{
                      background: sf.hintergrund, color: sf.text,
                      fontSize: 10, fontWeight: 700,
                      padding: "3px 8px", borderRadius: 20, flexShrink: 0,
                    }}>{sf.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Steuerleiste ──────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
          flexWrap: "wrap",
          background: "#fff",
          padding: 10,
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,.05)",
        }}
      >
        <div style={{ display: "flex", gap: 4 }}>
          {([
            { key: "14tage", label: "14 Tage" },
            { key: "woche", label: "Woche" },
            { key: "monat", label: "Monat" },
          ] as const).map((option) => (
            <button
              key={option.key}
              onClick={() => {
                setAnsicht(option.key);
                if (option.key === "woche") setStartDatum(montagDerWoche(startDatum));
              }}
              style={{
                padding: "7px 14px",
                borderRadius: 8,
                border: "none",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                background: ansicht === option.key ? "#e8f5e4" : "#f3f4f6",
                color: ansicht === option.key ? "#2d6a27" : "#4b5563",
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <button onClick={zurueck} style={navButtonStil}>
            ‹
          </button>
          <button onClick={() => setStartDatum(heute)} style={{ ...navButtonStil, width: "auto", padding: "6px 12px" }}>
            Heute
          </button>
          <button onClick={vor} style={navButtonStil}>
            ›
          </button>
        </div>

        {darfAlleSehen && (
          <div style={{ minWidth: 210, flex: 1, maxWidth: 300 }}>
            <AuswahlFeld
              optionen={mitarbeiterOptionen}
              wert={filterMitarbeiterId}
              onChange={setFilterMitarbeiterId}
              platzhalter="Alle Mitarbeiter"
              suchPlatzhalter="Mitarbeiter suchen …"
              loeschbar
            />
          </div>
        )}
      </div>

      {/* ── Kalender ──────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: ansicht === "monat" ? "repeat(7, 1fr)" : "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 10,
        }}
      >
        {tage.map((datum) => {
          const termine = termineProTag.get(datum) ?? [];
          const abwesend = abwesenheitenProTag(datum);
          const feiertag = getFeiertag(datum);
          const istHeute = datum === heute;
          const wochenende = istWochenende(datum);

          return (
            <div
              key={datum}
              style={{
                background: feiertag ? "#fff7ed" : wochenende ? "#fafafa" : "#fff",
                borderRadius: 12,
                boxShadow: "0 2px 8px rgba(0,0,0,.05)",
                border: istHeute ? "2px solid #4a8c3f" : "1px solid #f0f0f0",
                overflow: "hidden",
                minHeight: ansicht === "monat" ? 120 : 150,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Tageskopf */}
              <div
                style={{
                  padding: "8px 10px",
                  borderBottom: "1px solid #f3f4f6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: istHeute ? "#f0fdf4" : "transparent",
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: istHeute ? "#2d6a27" : wochenende ? "#9ca3af" : "#374151",
                  }}
                >
                  {tagesLabel(datum)}
                </span>
                {darfPlanen && (
                  <button
                    onClick={() => neuerTermin(datum)}
                    title="Termin an diesem Tag planen"
                    style={{
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      color: "#2d6a27",
                      borderRadius: 6,
                      width: 22,
                      height: 22,
                      fontSize: 14,
                      lineHeight: 1,
                      cursor: "pointer",
                      fontWeight: 800,
                    }}
                  >
                    +
                  </button>
                )}
              </div>

              <div style={{ padding: 8, flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                {feiertag && (
                  <div
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: "#c2410c",
                      background: "#ffedd5",
                      borderRadius: 6,
                      padding: "3px 6px",
                    }}
                  >
                    🎌 {feiertag}
                  </div>
                )}

                {/* Abwesenheiten */}
                {abwesend.map((a: any, index: number) => (
                  <div
                    key={`${a.typ}-${a.mitarbeiterId}-${index}`}
                    title={`${a.mitarbeiterName}: ${a.typ === "urlaub" ? "Urlaub" : "krank"} ${a.von} – ${a.bis}`}
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      borderRadius: 6,
                      padding: "3px 6px",
                      background: a.typ === "urlaub" ? "#fef9c3" : "#fee2e2",
                      color: a.typ === "urlaub" ? "#854d0e" : "#b91c1c",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {a.typ === "urlaub" ? "🌴" : "🤒"} {a.mitarbeiterName}
                  </div>
                ))}

                {/* Termine */}
                {termine.length === 0 && abwesend.length === 0 && !feiertag && (
                  <div style={{ fontSize: 11, color: "#d1d5db", padding: "8px 2px" }}>Keine Termine</div>
                )}

                {termine.map((termin: any) => {
                  const status = STATUS_FARBEN[termin.status] ?? STATUS_FARBEN.geplant;
                  const farbe = getMitarbeiterFarbe(termin.mitarbeiterId);
                  return (
                    <div
                      key={termin.id}
                      onClick={() => terminBearbeiten(termin)}
                      style={{
                        borderRadius: 8,
                        borderLeft: `4px solid ${farbe}`,
                        background: status.hintergrund,
                        padding: "6px 8px",
                        cursor: darfPlanen ? "pointer" : "default",
                        opacity: termin.status === "abgesagt" ? 0.55 : 1,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11.5,
                          fontWeight: 800,
                          color: "#111827",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {termin.startzeit}–{termin.endzeit} · {termin.kundenName}
                      </div>
                      <div style={{ fontSize: 10.5, color: "#4b5563", marginTop: 2 }}>
                        {termin.mitarbeiterName}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 4,
                          marginTop: 4,
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        <span style={etikettStil("#e8f5e4", "#2d6a27")}>§{termin.paragraph}</span>
                        {termin.paragraph2 && (
                          <span style={etikettStil("#ede9fe", "#6d28d9")}>§{termin.paragraph2}</span>
                        )}
                        <span style={etikettStil("#f3f4f6", "#4b5563")}>
                          {formatStunden(termin.stunden)}
                        </span>
                        <span style={etikettStil("#fef3c7", "#92400e")}>
                          {formatEuro(termin.lohnkosten)}
                        </span>
                      </div>
                      {darfLoeschen && (
                        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                          {termin.status !== "abgesagt" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Termin bei ${termin.kundenName} absagen? Das Budget wird zurückgebucht.`)) {
                                  statusSetzen.mutate({ id: termin.id, status: "abgesagt" });
                                }
                              }}
                              style={miniButtonStil("#fef3c7", "#92400e")}
                            >
                              Absagen
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (
                                window.confirm(
                                  `Termin bei ${termin.kundenName} am ${termin.datum} endgültig löschen?\n\n` +
                                    `Das reservierte Budget wird zurückgebucht. Der Vorgang wird protokolliert.`,
                                )
                              ) {
                                loeschen.mutate({ id: termin.id });
                              }
                            }}
                            style={miniButtonStil("#fee2e2", "#b91c1c")}
                          >
                            Löschen
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Auslastung je Mitarbeiter ─────────────────────────────────── */}
      {darfAlleSehen && (planung?.auslastung?.length ?? 0) > 0 && (
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: 16,
            marginTop: 16,
            boxShadow: "0 2px 8px rgba(0,0,0,.05)",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>
            Lohnkosten &amp; Minijob-Auslastung ({planung?.monat})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {((planung?.auslastung ?? []) as any[]).map((eintrag) => (
              <div key={eintrag.mitarbeiterId} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: getMitarbeiterFarbe(eintrag.mitarbeiterId),
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 12.5, fontWeight: 600, width: 150, flexShrink: 0 }}>
                  {eintrag.name}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 8,
                    background: "#f3f4f6",
                    borderRadius: 4,
                    overflow: "hidden",
                    minWidth: 80,
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, eintrag.auslastungProzent)}%`,
                      height: "100%",
                      background: eintrag.ueberschritten
                        ? "#dc2626"
                        : eintrag.vorwarnung
                          ? "#f59e0b"
                          : "#4a8c3f",
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: eintrag.ueberschritten ? "#dc2626" : "#4b5563",
                    width: 130,
                    textAlign: "right",
                    flexShrink: 0,
                  }}
                >
                  {formatEuro(eintrag.lohnkosten)} / {formatEuro(eintrag.minijobGrenze)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Terminassistent ───────────────────────────────────────────── */}
      {formularOffen && (
        <TerminAssistent
          formular={formular}
          setFormular={setFormular}
          kundenOptionen={kundenOptionen}
          mitarbeiterOptionen={mitarbeiterOptionen}
          berechneteStunden={berechneteStunden}
          pruefung={pruefung}
          pruefungLaeuft={pruefungLaeuft}
          uebersteuern={uebersteuern}
          setUebersteuern={setUebersteuern}
          istAdmin={mitarbeiter?.rolle === "admin"}
          speichert={erstellen.isPending || aktualisieren.isPending}
          onSpeichern={speichern}
          onAbbrechen={() => {
            setFormularOffen(false);
            setFormular(LEERES_FORMULAR);
            setUebersteuern(false);
          }}
          onLoeschen={
            formular.id && darfLoeschen
              ? () => {
                  if (window.confirm("Diesen Termin löschen? Das Budget wird zurückgebucht.")) {
                    loeschen.mutate({ id: formular.id });
                    setFormularOffen(false);
                    setFormular(LEERES_FORMULAR);
                  }
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

// ── Hilfsstile ──────────────────────────────────────────────────────────────

const navButtonStil: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  background: "#fff",
  cursor: "pointer",
  fontSize: 15,
  fontWeight: 700,
  color: "#4b5563",
};

function etikettStil(hintergrund: string, text: string): React.CSSProperties {
  return {
    fontSize: 9.5,
    fontWeight: 800,
    padding: "1.5px 5px",
    borderRadius: 20,
    background: hintergrund,
    color: text,
    whiteSpace: "nowrap",
  };
}

function miniButtonStil(hintergrund: string, text: string): React.CSSProperties {
  return {
    fontSize: 10,
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: 6,
    border: "none",
    background: hintergrund,
    color: text,
    cursor: "pointer",
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  TERMINASSISTENT
// ════════════════════════════════════════════════════════════════════════════

type AssistentProps = {
  formular: FormularZustand;
  setFormular: React.Dispatch<React.SetStateAction<FormularZustand>>;
  kundenOptionen: ReturnType<typeof kundenZuOptionen>;
  mitarbeiterOptionen: ReturnType<typeof mitarbeiterZuOptionen>;
  berechneteStunden: number | null;
  pruefung: any;
  pruefungLaeuft: boolean;
  uebersteuern: boolean;
  setUebersteuern: (wert: boolean) => void;
  istAdmin: boolean;
  speichert: boolean;
  onSpeichern: () => void;
  onAbbrechen: () => void;
  onLoeschen?: () => void;
};

function TerminAssistent({
  formular,
  setFormular,
  kundenOptionen,
  mitarbeiterOptionen,
  berechneteStunden,
  pruefung,
  pruefungLaeuft,
  uebersteuern,
  setUebersteuern,
  istAdmin,
  speichert,
  onSpeichern,
  onAbbrechen,
  onLoeschen,
}: AssistentProps) {
  const blockierend = ((pruefung?.meldungen ?? []) as any[]).filter((m) => m.schwere === "blockierend");
  const warnungen = ((pruefung?.meldungen ?? []) as any[]).filter((m) => m.schwere === "warnung");
  const hinweise = ((pruefung?.meldungen ?? []) as any[]).filter((m) => m.schwere === "hinweis");
  const budgetProblem = blockierend.some((m) => m.code === "budget_nicht_ausreichend");

  const aendere = <K extends keyof FormularZustand>(feld: K, wert: FormularZustand[K]) =>
    setFormular((f) => ({ ...f, [feld]: wert }));

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 300,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        backdropFilter: "blur(2px)",
      }}
      onClick={onAbbrechen}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          width: "100%",
          maxWidth: 720,
          maxHeight: "94vh",
          overflowY: "auto",
          borderRadius: "18px 18px 0 0",
          padding: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontSize: 17, fontWeight: 800 }}>
            {formular.id ? "Termin bearbeiten" : "Neuen Termin planen"}
          </div>
          <button
            onClick={onAbbrechen}
            style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#9ca3af" }}
          >
            ×
          </button>
        </div>

        {/* Mitarbeiter & Kunde */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12, marginBottom: 14 }}>
          <div>
            <label style={feldLabelStil}>Mitarbeiter *</label>
            <AuswahlFeld
              optionen={mitarbeiterOptionen}
              wert={formular.mitarbeiterId}
              onChange={(id) => aendere("mitarbeiterId", id)}
              platzhalter="Mitarbeiter auswählen …"
              suchPlatzhalter="Name suchen …"
              pflicht
            />
          </div>
          <div>
            <label style={feldLabelStil}>Kunde *</label>
            <AuswahlFeld
              optionen={kundenOptionen}
              wert={formular.kundenId}
              onChange={(id) => aendere("kundenId", id)}
              platzhalter="Kunden auswählen …"
              suchPlatzhalter="Name, Ort, Versicherungsnummer …"
              pflicht
            />
          </div>
        </div>

        {/* Datum & Zeiten – Stunden werden automatisch berechnet */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12, marginBottom: 14 }}>
          <div>
            <label style={feldLabelStil}>Datum *</label>
            <input
              type="date"
              value={formular.datum}
              onChange={(e) => aendere("datum", e.target.value)}
              style={eingabeStil}
            />
          </div>
          <div>
            <label style={feldLabelStil}>Startzeit *</label>
            <input
              type="time"
              value={formular.startzeit}
              onChange={(e) => aendere("startzeit", e.target.value)}
              style={eingabeStil}
            />
          </div>
          <div>
            <label style={feldLabelStil}>Endzeit *</label>
            <input
              type="time"
              value={formular.endzeit}
              onChange={(e) => aendere("endzeit", e.target.value)}
              style={eingabeStil}
            />
          </div>
          <div>
            <label style={feldLabelStil}>Stunden (automatisch)</label>
            <div
              style={{
                ...eingabeStil,
                background: "#f0fdf4",
                border: "2px solid #bbf7d0",
                color: "#166534",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
              }}
              title="Die Stunden werden aus Start- und Endzeit berechnet und können nicht manuell eingegeben werden."
            >
              {berechneteStunden !== null && berechneteStunden > 0
                ? formatStunden(berechneteStunden)
                : "–"}
            </div>
          </div>
        </div>

        {/* Paragraph 1 & 2 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 14 }}>
          <div>
            <label style={feldLabelStil}>Abrechnungsparagraph *</label>
            <select
              value={formular.paragraph}
              onChange={(e) => aendere("paragraph", e.target.value as Paragraph)}
              style={eingabeStil}
            >
              <option value="45b">§45b – Entlastungsbetrag</option>
              <option value="45a">§45a – Alltagsbegleitung</option>
              <option value="39">§39 – Verhinderungspflege</option>
            </select>
          </div>
          <div>
            <label style={feldLabelStil}>
              Zweiter Paragraph
              <span style={{ fontWeight: 400, color: "#9ca3af", textTransform: "none" }}> (optional)</span>
            </label>
            <select
              value={formular.paragraph2 ?? ""}
              onChange={(e) =>
                setFormular((f) => ({
                  ...f,
                  paragraph2: (e.target.value || null) as Paragraph | null,
                  stunden2: e.target.value ? f.stunden2 : 0,
                }))
              }
              style={eingabeStil}
            >
              <option value="">– kein zweiter Paragraph –</option>
              {(["45b", "45a", "39"] as Paragraph[])
                .filter((p) => p !== formular.paragraph)
                .map((p) => (
                  <option key={p} value={p}>
                    §{p}
                  </option>
                ))}
            </select>
          </div>
          {formular.paragraph2 && (
            <div>
              <label style={feldLabelStil}>Stunden über §{formular.paragraph2}</label>
              <input
                type="number"
                min={0}
                max={berechneteStunden ?? 24}
                step={0.25}
                value={formular.stunden2}
                onChange={(e) => aendere("stunden2", parseFloat(e.target.value) || 0)}
                style={eingabeStil}
              />
              <div style={{ fontSize: 10.5, color: "#6b7280", marginTop: 3 }}>
                Rest über §{formular.paragraph}:{" "}
                {formatStunden(Math.max(0, (berechneteStunden ?? 0) - formular.stunden2))}
              </div>
            </div>
          )}
        </div>

        {/* Budgetvorschau */}
        {pruefung?.budgetVorschau?.length > 0 && (
          <div
            style={{
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 12,
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 8, color: "#374151" }}>
              Budgetwirkung {pruefungLaeuft && <span style={{ color: "#9ca3af" }}>· wird berechnet …</span>}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, minWidth: 520 }}>
                <thead>
                  <tr style={{ color: "#6b7280", textAlign: "left" }}>
                    <th style={zellenStil}>Paragraph</th>
                    <th style={zellenStil}>Restbudget</th>
                    <th style={zellenStil}>Stundensatz</th>
                    <th style={zellenStil}>Verfügbar</th>
                    <th style={zellenStil}>Kosten</th>
                    <th style={zellenStil}>Rest danach</th>
                    <th style={zellenStil}>Stunden danach</th>
                  </tr>
                </thead>
                <tbody>
                  {(pruefung.budgetVorschau as any[]).map((zeile) => (
                    <tr
                      key={zeile.paragraph}
                      style={{
                        borderTop: "1px solid #e5e7eb",
                        background: zeile.reichtNicht ? "#fef2f2" : "transparent",
                      }}
                    >
                      <td style={{ ...zellenStil, fontWeight: 800 }}>§{zeile.paragraph}</td>
                      <td style={zellenStil}>{formatEuro(zeile.restbudgetVorher)}</td>
                      <td style={zellenStil}>{formatEuro(zeile.stundensatz)}/Std.</td>
                      <td style={zellenStil}>{formatStunden(zeile.stundenVorher)}</td>
                      <td style={{ ...zellenStil, color: "#b45309", fontWeight: 700 }}>
                        −{formatEuro(zeile.kosten)}
                      </td>
                      <td
                        style={{
                          ...zellenStil,
                          fontWeight: 800,
                          color: zeile.reichtNicht ? "#dc2626" : "#166534",
                        }}
                      >
                        {formatEuro(zeile.restbudgetNachher)}
                      </td>
                      <td style={{ ...zellenStil, fontWeight: 700 }}>{formatStunden(zeile.stundenNachher)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 10.5, color: "#6b7280", marginTop: 6 }}>
              Die Kosten enthalten die Anfahrtspauschale von {formatEuro(pruefung.fahrtkosten ?? 0)}. Die
              verfügbaren Stunden ergeben sich aus Restbudget ÷ Stundensatz des Paragraphen.
            </div>
          </div>
        )}

        {/* Lohnkosten & Minijob */}
        {pruefung?.minijob && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <InfoKachel
              titel="Lohnkosten dieses Einsatzes"
              wert={formatEuro(pruefung.lohnkosten ?? 0)}
              hinweis={`${formatStunden(pruefung.stunden ?? 0)} × ${formatEuro(
                (pruefung.stunden ?? 0) > 0 ? (pruefung.lohnkosten ?? 0) / (pruefung.stunden ?? 1) : 0,
              )}`}
            />
            <InfoKachel
              titel="Budgetkosten gesamt"
              wert={formatEuro(pruefung.kostenGesamt ?? 0)}
              hinweis={`inkl. ${formatEuro(pruefung.fahrtkosten ?? 0)} Anfahrt`}
            />
            <InfoKachel
              titel="Minijob-Auslastung"
              wert={`${pruefung.minijob.auslastungProzent} %`}
              hinweis={`${formatEuro(pruefung.minijob.gesamtLohnkosten)} von ${formatEuro(
                pruefung.minijob.grenze,
              )}`}
              farbe={
                pruefung.minijob.ueberschritten
                  ? "#dc2626"
                  : pruefung.minijob.vorwarnung
                    ? "#f59e0b"
                    : "#4a8c3f"
              }
            />
          </div>
        )}

        {/* Meldungen */}
        {blockierend.map((meldung, index) => (
          <MeldungsBox key={`b-${index}`} art="blockierend" text={meldung.text} />
        ))}
        {warnungen.map((meldung, index) => (
          <MeldungsBox key={`w-${index}`} art="warnung" text={meldung.text} />
        ))}
        {hinweise.map((meldung, index) => (
          <MeldungsBox key={`h-${index}`} art="hinweis" text={meldung.text} />
        ))}

        {/* Budget-Übersteuerung nur für Admins */}
        {istAdmin && budgetProblem && (
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#fff7ed",
              border: "1.5px solid #fdba74",
              borderRadius: 10,
              padding: "10px 12px",
              marginBottom: 12,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={uebersteuern}
              onChange={(e) => setUebersteuern(e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            <span style={{ fontSize: 12, color: "#9a3412", fontWeight: 600 }}>
              Als Administrator trotz fehlender Budgetdeckung speichern (wird protokolliert)
            </span>
          </label>
        )}

        {/* Notizen */}
        <div style={{ marginBottom: 16 }}>
          <label style={feldLabelStil}>Notizen</label>
          <textarea
            value={formular.notizen}
            onChange={(e) => aendere("notizen", e.target.value)}
            placeholder="Besondere Hinweise: Schlüssel, Haustiere, Medikamente, Zugang …"
            style={{ ...eingabeStil, minHeight: 64, resize: "vertical", fontFamily: "inherit" }}
          />
        </div>

        {/* Aktionen */}
        <div style={{ display: "flex", gap: 10, paddingTop: 14, borderTop: "1px solid #e5e7eb" }}>
          {onLoeschen && (
            <button onClick={onLoeschen} style={{ ...aktionsButtonStil, background: "#fee2e2", color: "#b91c1c" }}>
              Löschen
            </button>
          )}
          <button
            onClick={onAbbrechen}
            style={{ ...aktionsButtonStil, background: "#f4f6f3", color: "#6b7280", flex: 1 }}
          >
            Abbrechen
          </button>
          <button
            onClick={onSpeichern}
            disabled={speichert || blockierend.length > 0}
            style={{
              ...aktionsButtonStil,
              flex: 2,
              background: blockierend.length > 0 ? "#d1d5db" : "#4a8c3f",
              color: "#fff",
              cursor: blockierend.length > 0 ? "not-allowed" : "pointer",
            }}
          >
            {speichert ? "Wird gespeichert …" : formular.id ? "Änderungen speichern" : "Termin planen"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Kleine Bausteine ────────────────────────────────────────────────────────

function InfoKachel({
  titel,
  wert,
  hinweis,
  farbe = "#374151",
}: {
  titel: string;
  wert: string;
  hinweis?: string;
  farbe?: string;
}) {
  return (
    <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ fontSize: 10.5, color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>{titel}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: farbe, marginTop: 2 }}>{wert}</div>
      {hinweis && <div style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 1 }}>{hinweis}</div>}
    </div>
  );
}

function MeldungsBox({ art, text }: { art: "blockierend" | "warnung" | "hinweis"; text: string }) {
  const stile = {
    blockierend: { hintergrund: "#fef2f2", rand: "#fca5a5", farbe: "#991b1b", symbol: "⛔" },
    warnung: { hintergrund: "#fffbeb", rand: "#fcd34d", farbe: "#92400e", symbol: "⚠️" },
    hinweis: { hintergrund: "#eff6ff", rand: "#bfdbfe", farbe: "#1e40af", symbol: "ℹ️" },
  }[art];
  return (
    <div
      style={{
        background: stile.hintergrund,
        border: `1.5px solid ${stile.rand}`,
        color: stile.farbe,
        borderRadius: 10,
        padding: "10px 12px",
        marginBottom: 8,
        fontSize: 12.5,
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
        lineHeight: 1.45,
      }}
    >
      <span style={{ fontSize: 15, flexShrink: 0 }}>{stile.symbol}</span>
      <span style={{ fontWeight: art === "blockierend" ? 700 : 500 }}>{text}</span>
    </div>
  );
}

const feldLabelStil: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 800,
  textTransform: "uppercase",
  color: "#6b7280",
  marginBottom: 5,
  letterSpacing: 0.3,
};

const eingabeStil: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "2px solid #e5e7eb",
  borderRadius: 10,
  fontSize: 14,
  outline: "none",
  background: "#fff",
  boxSizing: "border-box",
};

const zellenStil: React.CSSProperties = { padding: "6px 8px", whiteSpace: "nowrap" };

const aktionsButtonStil: React.CSSProperties = {
  padding: "12px 18px",
  border: "none",
  borderRadius: 10,
  fontSize: 13.5,
  fontWeight: 700,
  cursor: "pointer",
};
