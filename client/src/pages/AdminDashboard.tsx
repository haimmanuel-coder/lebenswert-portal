import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useNavigation, type SeitenId } from "@/contexts/NavigationContext";

type AmpelStatus = "gruen" | "gelb" | "rot" | "grau";

function AmpelDot({ status }: { status: AmpelStatus }) {
  const cls = {
    gruen: "lw-dot lw-dot-green",
    gelb: "lw-dot lw-dot-yellow",
    rot: "lw-dot lw-dot-red",
    grau: "lw-dot",
  }[status];
  return <span className={cls} style={status === "grau" ? { background: "#d1d5db" } : undefined} />;
}

function AmpelBadge({ status, label }: { status: AmpelStatus; label: string }) {
  const cfg = {
    gruen: { cls: "lw-badge lw-badge-green", text: "OK" },
    gelb: { cls: "lw-badge lw-badge-yellow", text: "Warnung" },
    rot: { cls: "lw-badge lw-badge-red", text: "Kritisch" },
    grau: { cls: "lw-badge lw-badge-gray", text: "Kein Budget" },
  }[status];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 72 }}>
      <AmpelDot status={status} />
      <span style={{ fontSize: "0.6875rem", color: "var(--lw-gray-500)", fontWeight: 600 }}>{label}</span>
      <span className={cfg.cls} style={{ fontSize: "0.625rem", padding: "1px 6px" }}>{cfg.text}</span>
    </div>
  );
}

function BudgetProgressBar({ verbraucht, budget, ampel }: { verbraucht: number; budget: number; ampel: AmpelStatus }) {
  const pct = budget > 0 ? Math.min(100, (verbraucht / budget) * 100) : 0;
  const barCls = ampel === "rot" ? "lw-progress-bar lw-progress-bar-red"
    : ampel === "gelb" ? "lw-progress-bar lw-progress-bar-yellow"
    : "lw-progress-bar lw-progress-bar-green";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: "0.75rem", color: "var(--lw-gray-500)" }}>
          {verbraucht.toFixed(0)} € / {budget.toFixed(0)} €
        </span>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: ampel === "rot" ? "var(--lw-red)" : ampel === "gelb" ? "var(--lw-yellow)" : "var(--lw-green-600)" }}>
          {pct.toFixed(0)}%
        </span>
      </div>
      <div className="lw-progress">
        <div className={barCls} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function KpiCard({ icon, value, label, color, sublabel }: { icon: string; value: string | number; label: string; color: string; sublabel?: string }) {
  return (
    <div className="lw-kpi">
      <div className="lw-kpi-icon" style={{ background: color + "20" }}>
        <span style={{ fontSize: "1.25rem" }}>{icon}</span>
      </div>
      <div className="lw-kpi-value" style={{ color }}>{value}</div>
      <div className="lw-kpi-label">{label}</div>
      {sublabel && <div style={{ fontSize: "0.75rem", color: "var(--lw-gray-400)" }}>{sublabel}</div>}
    </div>
  );
}

function AuslastungsBar({ name, art, ist, soll, pct }: { name: string; art: string; ist: number; soll: number; pct: number }) {
  const ampel = pct >= 90 ? "rot" : pct >= 70 ? "gelb" : "gruen";
  const barCls = ampel === "rot" ? "lw-progress-bar lw-progress-bar-red"
    : ampel === "gelb" ? "lw-progress-bar lw-progress-bar-yellow"
    : "lw-progress-bar lw-progress-bar-green";
  const artLabel = art === "minijob" ? "Minijob" : art === "teilzeit" ? "Teilzeit" : "Vollzeit";
  const artColor = art === "minijob" ? "#8b5cf6" : art === "teilzeit" ? "#0ea5e9" : "#10b981";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0", borderBottom: "1px solid var(--lw-gray-100)" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: artColor + "20", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ fontSize: "1rem" }}>👤</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--lw-gray-800)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
          <span style={{ fontSize: "0.75rem", color: artColor, fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>{artLabel}</span>
        </div>
        <div className="lw-progress">
          <div className={barCls} style={{ width: `${pct}%` }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
          <span style={{ fontSize: "0.6875rem", color: "var(--lw-gray-400)" }}>{ist}h / {soll}h</span>
          <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: ampel === "rot" ? "var(--lw-red)" : ampel === "gelb" ? "#92400e" : "var(--lw-green-700)" }}>{pct}%</span>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [budgetFilter, setBudgetFilter] = useState<"alle" | "rot" | "gelb" | "gruen">("alle");
  const [zugangskartenDialogOffen, setZugangskartenDialogOffen] = useState(false);
  const [zugangskartenBestaetigungOffen, setZugangskartenBestaetigungOffen] = useState(false);
  const [ausgewaehlteMitarbeiterId, setAusgewaehlteMitarbeiterId] = useState("");
  const [passwortabloesungBestaetigt, setPasswortabloesungBestaetigt] = useState(false);
  const [zugangskartenAusgabe, setZugangskartenAusgabe] = useState<{
    dateiname: string;
    kartenAnzahl: number;
    erstelltAm: Date;
    downloadUrl: string;
    gueltigMinuten: number;
  } | null>(null);
  const [bestaetigteErstlogins, setBestaetigteErstlogins] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem("seniorenassistenz-erstlogin-bestaetigt") ?? "[]"); } catch { return []; }
  });
  const [erstloginPopupId, setErstloginPopupId] = useState<number | null>(null);
  const { data, isLoading } = trpc.admin.dashboardStats.useQuery();
  const { navigiere } = useNavigation();
  const utils = trpc.useUtils();
  const { data: mitarbeiterListe = [], isLoading: mitarbeiterLaden } = trpc.admin.mitarbeiterList.useQuery(undefined, {
    enabled: zugangskartenDialogOffen,
  });
  const druckbareMitarbeiter = useMemo(
    () => mitarbeiterListe.filter((mitarbeiter: any) => Boolean(mitarbeiter.aktiv) && mitarbeiter.rolle !== "admin" && Boolean(mitarbeiter.email?.trim())),
    [mitarbeiterListe],
  );
  const ausgewaehlterMitarbeiter = druckbareMitarbeiter.find((mitarbeiter: any) => String(mitarbeiter.id) === ausgewaehlteMitarbeiterId) ?? null;
  const zugangskarteNeuGenerieren = trpc.admin.zugangskarteNeuGenerieren.useMutation({
    onSuccess: async (ausgabe) => {
      setZugangskartenAusgabe(ausgabe);
      setZugangskartenDialogOffen(false);
      setZugangskartenBestaetigungOffen(false);
      setAusgewaehlteMitarbeiterId("");
      setPasswortabloesungBestaetigt(false);
      await Promise.all([
        utils.admin.mitarbeiterList.invalidate(),
        utils.admin.dashboardStats.invalidate(),
      ]);
    },
  });
  const { data: erstloginEreignisse = [] } = (trpc as any).admin.erstloginBenachrichtigungen.useQuery(undefined, { refetchInterval: 15000 });
  const offeneErstloginEreignisse = useMemo(
    () => erstloginEreignisse.filter((ereignis: any) => !bestaetigteErstlogins.includes(ereignis.id)),
    [erstloginEreignisse, bestaetigteErstlogins],
  );
  const erstloginPopup = offeneErstloginEreignisse.find((ereignis: any) => ereignis.id === erstloginPopupId) ?? offeneErstloginEreignisse[0] ?? null;

  useEffect(() => {
    if (offeneErstloginEreignisse[0] && erstloginPopupId === null) setErstloginPopupId(offeneErstloginEreignisse[0].id);
  }, [offeneErstloginEreignisse, erstloginPopupId]);

  const bestaetigeErstlogin = (id: number) => {
    const aktualisiert = Array.from(new Set([...bestaetigteErstlogins, id]));
    setBestaetigteErstlogins(aktualisiert);
    localStorage.setItem("seniorenassistenz-erstlogin-bestaetigt", JSON.stringify(aktualisiert));
    setErstloginPopupId(null);
  };

  const oeffneZugangskartenDialog = () => {
    setZugangskartenAusgabe(null);
    setAusgewaehlteMitarbeiterId("");
    setPasswortabloesungBestaetigt(false);
    setZugangskartenBestaetigungOffen(false);
    setZugangskartenDialogOffen(true);
  };

  const schliesseZugangskartenDialog = () => {
    if (zugangskarteNeuGenerieren.isPending) return;
    setZugangskartenDialogOffen(false);
    setZugangskartenBestaetigungOffen(false);
    setPasswortabloesungBestaetigt(false);
  };

  const bestaetigeNeueZugangskarte = () => {
    if (!ausgewaehlterMitarbeiter || !passwortabloesungBestaetigt) return;
    zugangskarteNeuGenerieren.mutate({ mitarbeiterId: ausgewaehlterMitarbeiter.id });
  };

  // LNW-Status für aktuellen Monat
  const aktuellerMonat = new Date().toISOString().slice(0, 7);
  const { data: lnwStatus } = (trpc as any).fahrtenAbrechnung.leistungsnachweisStatus.useQuery({ monat: aktuellerMonat });

  if (isLoading) {
    return (
      <div className="lw-page">
        <div className="lw-page-header">
          <div>
            <div className="lw-page-title">Admin-Dashboard · Gesamtübersicht</div>
            <div className="lw-page-subtitle">Lade Daten…</div>
          </div>
        </div>
        <div className="lw-grid-4" style={{ marginBottom: "1.25rem" }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="lw-kpi">
              <div className="lw-skeleton" style={{ width: 40, height: 40, borderRadius: "var(--lw-r-md)" }} />
              <div className="lw-skeleton" style={{ width: "60%", height: 28, marginTop: 8 }} />
              <div className="lw-skeleton" style={{ width: "80%", height: 14, marginTop: 4 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const kpis = data?.kpis;
  const budgetAmpel = data?.budgetAmpel ?? [];
  const auslastung = data?.auslastung ?? [];

  const filteredBudget = budgetFilter === "alle"
    ? budgetAmpel
    : budgetAmpel.filter(k =>
        k.p45b.ampel === budgetFilter || k.p45a.ampel === budgetFilter || k.p39.ampel === budgetFilter
      );

  const rotCount = budgetAmpel.filter(k => k.p45b.ampel === "rot" || k.p45a.ampel === "rot" || k.p39.ampel === "rot").length;
  const gelbCount = budgetAmpel.filter(k => (k.p45b.ampel === "gelb" || k.p45a.ampel === "gelb" || k.p39.ampel === "gelb") && k.p45b.ampel !== "rot" && k.p45a.ampel !== "rot" && k.p39.ampel !== "rot").length;
  const gruenCount = budgetAmpel.filter(k => k.p45b.ampel === "gruen" && k.p45a.ampel !== "rot" && k.p39.ampel !== "rot").length;

  const heute = new Date().toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="lw-page">
      {zugangskartenAusgabe && (
        <section data-testid="zugangskarte-download-hinweis" aria-live="polite" style={{ marginBottom: "1rem", border: "1px solid #86efac", background: "#f0fdf4", borderRadius: 14, padding: "1rem", boxShadow: "0 8px 22px rgba(22,101,52,.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
            <div>
              <div style={{ color: "#166534", fontWeight: 800, fontSize: "0.95rem" }}>Neue Zugangskarte wurde sicher erstellt</div>
              <p style={{ margin: "0.3rem 0 0", color: "#365314", lineHeight: 1.5, fontSize: "0.86rem" }}>
                Die bisherigen Zugangsdaten gelten nicht mehr. Der Download ist vertraulich und noch {zugangskartenAusgabe.gueltigMinuten} Minuten verfügbar.
              </p>
              <div style={{ marginTop: "0.45rem", color: "#64748b", fontSize: "0.75rem" }}>{zugangskartenAusgabe.dateiname}</div>
            </div>
            <button type="button" onClick={() => setZugangskartenAusgabe(null)} aria-label="Hinweis schließen" style={{ border: "none", background: "transparent", color: "#64748b", cursor: "pointer", fontSize: "1.2rem", lineHeight: 1, padding: 2 }}>×</button>
          </div>
          <a data-testid="zugangskarte-jetzt-herunterladen" href={zugangskartenAusgabe.downloadUrl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 42, marginTop: "0.85rem", borderRadius: 8, padding: "0.65rem 0.9rem", background: "#166534", color: "#fff", fontWeight: 800, fontSize: "0.86rem", textDecoration: "none" }}>Zugangskarte jetzt herunterladen</a>
        </section>
      )}
      {zugangskartenDialogOffen && (
        <div role="dialog" aria-modal="true" aria-labelledby="zugangskarten-dialog-titel" style={{ position: "fixed", inset: 0, zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", background: "rgba(15, 23, 42, 0.56)" }}>
          <div style={{ width: "min(100%, 520px)", maxHeight: "calc(100vh - 2rem)", overflowY: "auto", background: "#fff", borderRadius: 16, padding: "1.35rem", boxShadow: "0 24px 60px rgba(15,23,42,.3)", border: "1px solid #dbe4ee" }}>
            {!zugangskartenBestaetigungOffen ? (
              <>
                <div style={{ width: 44, height: 44, borderRadius: "50%", display: "grid", placeItems: "center", background: "#eff6eb", fontSize: "1.35rem", marginBottom: 12 }}>🔐</div>
                <h2 id="zugangskarten-dialog-titel" style={{ margin: 0, fontSize: "1.12rem", color: "#173a1a" }}>Zugangskarte neu generieren</h2>
                <p style={{ margin: "0.6rem 0 1rem", color: "#475569", lineHeight: 1.55, fontSize: "0.9rem" }}>Wählen Sie die Mitarbeiterin oder den Mitarbeiter aus. Die neue Karte enthält ein einmaliges Startpasswort und kann danach nur innerhalb von 60 Minuten heruntergeladen werden.</p>
                <label htmlFor="zugangskarte-mitarbeiter" style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.82rem", fontWeight: 800, color: "#334155" }}>Mitarbeiter auswählen</label>
                <select id="zugangskarte-mitarbeiter" data-testid="zugangskarte-mitarbeiter-auswahl" value={ausgewaehlteMitarbeiterId} onChange={(event) => setAusgewaehlteMitarbeiterId(event.target.value)} disabled={mitarbeiterLaden} style={{ width: "100%", minHeight: 44, borderRadius: 8, border: "1px solid #94a3b8", background: "#fff", color: "#0f172a", padding: "0.65rem", font: "inherit" }}>
                  <option value="">{mitarbeiterLaden ? "Mitarbeiter werden geladen …" : "Bitte auswählen"}</option>
                  {druckbareMitarbeiter.map((mitarbeiter: any) => <option key={mitarbeiter.id} value={String(mitarbeiter.id)}>{mitarbeiter.vorname} {mitarbeiter.nachname} · {mitarbeiter.email}</option>)}
                </select>
                {!mitarbeiterLaden && druckbareMitarbeiter.length === 0 && <p style={{ margin: "0.6rem 0 0", color: "#b45309", fontSize: "0.82rem" }}>Es gibt derzeit keine aktiven Nicht-Administrator-Konten mit E-Mail-Adresse für eine Zugangskarte.</p>}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.55rem", marginTop: "1.25rem", flexWrap: "wrap" }}>
                  <button type="button" onClick={schliesseZugangskartenDialog} style={{ minHeight: 42, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", borderRadius: 8, padding: "0.65rem 0.9rem", fontWeight: 700, cursor: "pointer" }}>Abbrechen</button>
                  <button type="button" data-testid="zugangskarte-weiter-zur-bestaetigung" disabled={!ausgewaehlterMitarbeiter} onClick={() => setZugangskartenBestaetigungOffen(true)} style={{ minHeight: 42, border: "none", background: ausgewaehlterMitarbeiter ? "#166534" : "#94a3b8", color: "#fff", borderRadius: 8, padding: "0.65rem 0.9rem", fontWeight: 800, cursor: ausgewaehlterMitarbeiter ? "pointer" : "not-allowed" }}>Weiter</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ width: 44, height: 44, borderRadius: "50%", display: "grid", placeItems: "center", background: "#fff7ed", fontSize: "1.35rem", marginBottom: 12 }}>⚠</div>
                <h2 id="zugangskarten-dialog-titel" style={{ margin: 0, fontSize: "1.12rem", color: "#9a3412" }}>Passwortablösung bestätigen</h2>
                <p style={{ margin: "0.65rem 0", color: "#475569", lineHeight: 1.55, fontSize: "0.9rem" }}>Für <strong>{ausgewaehlterMitarbeiter?.vorname} {ausgewaehlterMitarbeiter?.nachname}</strong> wird ein neues Startpasswort erstellt. Das bisherige Passwort funktioniert danach sofort nicht mehr.</p>
                <label style={{ display: "flex", gap: "0.65rem", alignItems: "flex-start", padding: "0.8rem", borderRadius: 10, background: "#fff7ed", border: "1px solid #fed7aa", color: "#7c2d12", fontSize: "0.84rem", lineHeight: 1.45, cursor: "pointer" }}>
                  <input data-testid="zugangskarte-passwortabloesung-bestaetigen" type="checkbox" checked={passwortabloesungBestaetigt} onChange={(event) => setPasswortabloesungBestaetigt(event.target.checked)} style={{ marginTop: 2, width: 18, height: 18, flexShrink: 0 }} />
                  <span>Ich bestätige die sofortige Ablösung der bisherigen Zugangsdaten und werde die neue Karte vertraulich übergeben.</span>
                </label>
                {zugangskarteNeuGenerieren.error && <p role="alert" style={{ margin: "0.75rem 0 0", color: "#b91c1c", fontSize: "0.83rem", lineHeight: 1.45 }}>{zugangskarteNeuGenerieren.error.message}</p>}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.55rem", marginTop: "1.25rem", flexWrap: "wrap" }}>
                  <button type="button" disabled={zugangskarteNeuGenerieren.isPending} onClick={() => { setZugangskartenBestaetigungOffen(false); setPasswortabloesungBestaetigt(false); }} style={{ minHeight: 42, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", borderRadius: 8, padding: "0.65rem 0.9rem", fontWeight: 700, cursor: zugangskarteNeuGenerieren.isPending ? "not-allowed" : "pointer" }}>Zurück</button>
                  <button type="button" data-testid="zugangskarte-endgueltig-erstellen" disabled={!passwortabloesungBestaetigt || zugangskarteNeuGenerieren.isPending} onClick={bestaetigeNeueZugangskarte} style={{ minHeight: 42, border: "none", background: passwortabloesungBestaetigt ? "#b45309" : "#94a3b8", color: "#fff", borderRadius: 8, padding: "0.65rem 0.9rem", fontWeight: 800, cursor: passwortabloesungBestaetigt && !zugangskarteNeuGenerieren.isPending ? "pointer" : "not-allowed" }}>{zugangskarteNeuGenerieren.isPending ? "Karte wird sicher erstellt …" : "Neue Karte erstellen"}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {erstloginPopup && (
        <div role="dialog" aria-modal="true" aria-labelledby="erstlogin-popup-titel" style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", background: "rgba(15, 23, 42, 0.48)" }}>
          <div style={{ width: "min(100%, 430px)", background: "#fff", borderRadius: 16, padding: "1.4rem", boxShadow: "0 24px 60px rgba(15,23,42,.28)", border: "1px solid #bbf7d0" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", display: "grid", placeItems: "center", background: "#dcfce7", fontSize: "1.35rem", marginBottom: 12 }}>✓</div>
            <h2 id="erstlogin-popup-titel" style={{ margin: 0, fontSize: "1.1rem", color: "#166534" }}>Erstlogin erfolgreich abgeschlossen</h2>
            <p style={{ margin: "0.6rem 0 0", color: "#475569", lineHeight: 1.55, fontSize: "0.9rem" }}>
              <strong>{erstloginPopup.vorname} {erstloginPopup.nachname}</strong> hat den Erstlogin und den persönlichen Passwortwechsel abgeschlossen.
            </p>
            <div style={{ marginTop: "1rem", padding: "0.65rem 0.75rem", borderRadius: 8, background: "#f8fafc", color: "#64748b", fontSize: "0.78rem" }}>
              {new Date(erstloginPopup.createdAt).toLocaleString("de-DE")}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
              <button onClick={() => navigiere("admin" as SeitenId)} style={{ border: "1px solid #cbd5e1", background: "#fff", color: "#334155", borderRadius: 8, padding: "0.65rem 0.85rem", fontWeight: 700, cursor: "pointer" }}>Mitarbeiter öffnen</button>
              <button autoFocus onClick={() => bestaetigeErstlogin(erstloginPopup.id)} style={{ border: "none", background: "#4a8c3f", color: "#fff", borderRadius: 8, padding: "0.65rem 0.85rem", fontWeight: 800, cursor: "pointer" }}>Verstanden</button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="lw-page-header">
        <div>
          <div className="lw-page-title">Admin-Dashboard · Gesamtübersicht</div>
          <div style={{ fontSize: "0.75rem", color: "var(--lw-gray-400)", marginTop: 2 }}>Seniorenassistenz Bernhardt</div>
          <div className="lw-page-subtitle">{heute}</div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {kpis?.rotKunden ? (
            <span className="lw-badge lw-badge-red">⚠ {kpis.rotKunden} Budget-Alarm{kpis.rotKunden !== 1 ? "e" : ""}</span>
          ) : (
            <span className="lw-badge lw-badge-green">✓ Alle Budgets im grünen Bereich</span>
          )}
        </div>
      </div>

      {/* KPI-Kacheln */}
      <div className="lw-grid-3" style={{ marginBottom: "1.5rem" }}>
        <KpiCard icon="👥" value={kpis?.aktiveKunden ?? "–"} label="Aktive Kunden" color="var(--lw-green-600)" />
        <KpiCard icon="🧑‍💼" value={kpis?.aktiveMitarbeiter ?? "–"} label="Aktive Mitarbeiter" color="#0ea5e9" />
        <KpiCard icon="📅" value={kpis?.heuteEinsaetze ?? "–"} label="Einsätze heute" color="#8b5cf6" />
        <KpiCard icon="🏖️" value={kpis?.offeneUrlaube ?? "–"} label="Offene Urlaubsanträge" color="#f59e0b" sublabel="Warten auf Genehmigung" />
        <KpiCard icon="🤒" value={kpis?.aktivKrank ?? "–"} label="Aktive Krankmeldungen" color="var(--lw-red)" sublabel="Aktuell krank gemeldet" />
        <KpiCard icon="🚨" value={kpis?.rotKunden ?? "–"} label="Budget-Alarme" color="var(--lw-red)" sublabel="≥ 90% verbraucht" />
      </div>

      {/* LNW-Status-Widget */}
      {lnwStatus && lnwStatus.gesamt > 0 && (
        <div className="lw-card" style={{ marginBottom: "1.25rem", border: lnwStatus.offen > 0 ? "2px solid #f59e0b" : "2px solid #10b981" }}>
          <div className="lw-card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--lw-gray-900)" }}>
                📋 Leistungsnachweise {aktuellerMonat}
              </div>
              <div style={{ fontSize: "0.8125rem", color: "var(--lw-gray-500)", marginTop: 2 }}>
                {lnwStatus.offen > 0
                  ? `⚠️ ${lnwStatus.offen} von ${lnwStatus.gesamt} noch nicht freigegeben`
                  : `✅ Alle ${lnwStatus.gesamt} Nachweise freigegeben – Export bereit`}
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: lnwStatus.offen > 0 ? "#f59e0b" : "#10b981" }}>{lnwStatus.offen}</div>
                <div style={{ fontSize: "0.6875rem", color: "var(--lw-gray-500)" }}>Offen</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#10b981" }}>{lnwStatus.abgeschlossen}</div>
                <div style={{ fontSize: "0.6875rem", color: "var(--lw-gray-500)" }}>Freigegeben</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--lw-gray-700)" }}>{lnwStatus.gesamtStunden?.toFixed(0)}h</div>
                <div style={{ fontSize: "0.6875rem", color: "var(--lw-gray-500)" }}>Stunden</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ampel-Legende */}
      <div className="lw-card" style={{ marginBottom: "1.25rem" }}>
        <div className="lw-card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--lw-gray-900)" }}>
              📊 Pflegebudget-Ampel (SGB XI)
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--lw-gray-500)", marginTop: 2 }}>
              §45b · §45a · §39 – Verbrauch nach Paragraph
            </div>
          </div>
          {/* Ampel-Filter */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {[
              { key: "alle", label: `Alle (${budgetAmpel.length})`, cls: "lw-btn lw-btn-sm lw-btn-secondary" },
              { key: "rot", label: `🔴 Kritisch (${rotCount})`, cls: "lw-btn lw-btn-sm" },
              { key: "gelb", label: `🟡 Warnung (${gelbCount})`, cls: "lw-btn lw-btn-sm" },
              { key: "gruen", label: `🟢 OK (${gruenCount})`, cls: "lw-btn lw-btn-sm" },
            ].map(f => (
              <button
                key={f.key}
                className={f.cls}
                onClick={() => setBudgetFilter(f.key as typeof budgetFilter)}
                style={{
                  background: budgetFilter === f.key
                    ? f.key === "rot" ? "var(--lw-red)" : f.key === "gelb" ? "var(--lw-yellow)" : f.key === "gruen" ? "var(--lw-green-600)" : "var(--lw-gray-800)"
                    : undefined,
                  color: budgetFilter === f.key && f.key !== "alle" ? "#fff" : undefined,
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ampel-Legende */}
        <div style={{ padding: "0.75rem 1.25rem", background: "var(--lw-gray-50)", borderBottom: "1px solid var(--lw-gray-100)", display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
          {[
            { status: "gruen" as AmpelStatus, text: "< 70% verbraucht – alles gut" },
            { status: "gelb" as AmpelStatus, text: "70–89% verbraucht – Warnung" },
            { status: "rot" as AmpelStatus, text: "≥ 90% verbraucht – kritisch" },
            { status: "grau" as AmpelStatus, text: "Kein Budget hinterlegt" },
          ].map(l => (
            <div key={l.status} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8125rem", color: "var(--lw-gray-600)" }}>
              <AmpelDot status={l.status} />
              {l.text}
            </div>
          ))}
        </div>

        {/* Kunden-Tabelle */}
        {filteredBudget.length === 0 ? (
          <div className="lw-empty">
            <div className="lw-empty-icon">✅</div>
            <div className="lw-empty-text">Keine Kunden in dieser Kategorie</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="lw-table">
              <thead>
                <tr>
                  <th>Kunde</th>
                  <th>§ 45b (Entlastungsleistungen)</th>
                  <th>§ 45a (Niedrigschwellig)</th>
                  <th>§ 39 (Verhinderungspflege)</th>
                </tr>
              </thead>
              <tbody>
                {filteredBudget.map(k => (
                  <tr key={k.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--lw-gray-900)" }}>{k.name}</div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <AmpelDot status={k.p45b.ampel as AmpelStatus} />
                        <div style={{ flex: 1, minWidth: 120 }}>
                          <BudgetProgressBar verbraucht={k.p45b.verbraucht} budget={k.p45b.budget} ampel={k.p45b.ampel as AmpelStatus} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <AmpelDot status={k.p45a.ampel as AmpelStatus} />
                        <div style={{ flex: 1, minWidth: 120 }}>
                          <BudgetProgressBar verbraucht={k.p45a.verbraucht} budget={k.p45a.budget} ampel={k.p45a.ampel as AmpelStatus} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <AmpelDot status={k.p39.ampel as AmpelStatus} />
                        <div style={{ flex: 1, minWidth: 120 }}>
                          <BudgetProgressBar verbraucht={k.p39.verbraucht} budget={k.p39.budget} ampel={k.p39.ampel as AmpelStatus} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Auslastung */}
      <div className="lw-card" style={{ marginBottom: "1.25rem" }}>
        <div className="lw-card-header">
          <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--lw-gray-900)" }}>
            ⏱ Mitarbeiter-Auslastung (aktueller Monat)
          </div>
          <div style={{ fontSize: "0.8125rem", color: "var(--lw-gray-500)", marginTop: 2 }}>
            Minijob: 40h Soll · Teilzeit: 80h Soll · Vollzeit: 160h Soll
          </div>
        </div>
        <div className="lw-card-body">
          {auslastung.length === 0 ? (
            <div className="lw-empty">
              <div className="lw-empty-icon">👤</div>
              <div className="lw-empty-text">Keine Mitarbeiterdaten verfügbar</div>
            </div>
          ) : (
            <div>
              {auslastung.map(m => (
                <AuslastungsBar
                  key={m.id}
                  name={m.name}
                  art={m.art}
                  ist={m.istStunden}
                  soll={m.sollStunden}
                  pct={m.auslastungProzent}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Schnellzugriff */}
      <div className="lw-card">
        <div className="lw-card-header">
          <div style={{ fontWeight: 700, fontSize: "1rem" }}>⚡ Schnellzugriff</div>
        </div>
        <div className="lw-card-body">
          <div className="lw-grid-3">
            {([
              { icon: "🗓️", label: "Einsatzplanung öffnen", ziel: "planung" as SeitenId, color: "#4a8c3f" },
              { icon: "📅", label: "Termine planen", ziel: "planung" as SeitenId, color: "#0ea5e9" },
              { icon: "🏖️", label: "Urlaubsanträge prüfen", badge: kpis?.offeneUrlaube, ziel: "urlaub" as SeitenId, color: "#f59e0b" },
              { icon: "🤒", label: "Krankmeldungen", badge: kpis?.aktivKrank, ziel: "krank" as SeitenId, color: "var(--lw-red)" },
              { icon: "📋", label: "Leistungsnachweise freigeben", ziel: "leistungsfreigabe" as SeitenId, color: "#8b5cf6" },
              { icon: "👥", label: "Mitarbeiter verwalten", ziel: "mitarbeiterakte" as SeitenId, color: "#0ea5e9" },
              { icon: "📤", label: "DATEV / Lexware Export", ziel: "buchhaltung" as SeitenId, color: "#10b981" },
              { icon: "📜", label: "Audit-Logbuch", ziel: "logbuch" as SeitenId, color: "var(--lw-gray-600)" },
              { icon: "🏥", label: "Kassenanfragen", ziel: "kassenanfrage" as SeitenId, color: "#14b8a6" },
            ]).map((item, i) => (
              <button key={i} type="button" onClick={() => navigiere(item.ziel)}
                title={`${item.label} öffnen`}
                style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.875rem", background: "var(--lw-gray-50)", borderRadius: "var(--lw-r-md)", cursor: "pointer", border: "1px solid var(--lw-gray-200)", transition: "all 0.15s var(--ease-out)", width: "100%", textAlign: "left", font: "inherit" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--lw-gray-100)")}
                onMouseLeave={e => (e.currentTarget.style.background = "var(--lw-gray-50)")}
              >
                <div style={{ width: 36, height: 36, borderRadius: "var(--lw-r-sm)", background: item.color + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.125rem", flexShrink: 0 }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--lw-gray-800)" }}>{item.label}</div>
                </div>
                {item.badge ? (
                  <span className="lw-badge lw-badge-red">{item.badge}</span>
                ) : null}
                <span style={{ color: "var(--lw-gray-400)", fontSize: "0.875rem" }}>›</span>
              </button>
            ))}
            <button data-testid="zugangskarte-neu-generieren" type="button" onClick={oeffneZugangskartenDialog}
              title="Neue Zugangskarte mit einmaligem Startpasswort erstellen"
              style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.875rem", background: "#f0fdf4", borderRadius: "var(--lw-r-md)", cursor: "pointer", border: "1px solid #bbf7d0", transition: "transform 0.15s var(--ease-out), background 0.15s var(--ease-out)", width: "100%", textAlign: "left", font: "inherit" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#dcfce7")}
              onMouseLeave={e => (e.currentTarget.style.background = "#f0fdf4")}
            >
              <div style={{ width: 36, height: 36, borderRadius: "var(--lw-r-sm)", background: "#16653420", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.125rem", flexShrink: 0 }}>🔐</div>
              <div style={{ flex: 1 }}><div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#166534" }}>Zugangskarte neu generieren</div><div style={{ fontSize: "0.73rem", color: "#4b7a44", marginTop: 2 }}>Passwort sicher ersetzen</div></div>
              <span style={{ color: "#4a8c3f", fontSize: "0.875rem" }}>›</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
