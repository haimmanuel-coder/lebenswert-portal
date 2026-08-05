import { FormularVorlagenTab } from "./FormularVorlagenTab";
import { DsgvoAdminTab } from "./DsgvoAdminTab";
import { VerrechnungssaetzeTab } from "./VerrechnungssaetzeTab";
import { SicherheitsunterweisungenAdminTab } from "./SicherheitsunterweisungenAdminTab";
import { FuehrerscheinCheckTab } from "./FuehrerscheinCheckTab";
import ComplianceAmpelTab from "./ComplianceAmpelTab";
import ComplianceGesamtuebersicht from "./ComplianceGesamtuebersicht";
import { ArbeitssicherheitAdminTab } from "./ArbeitssicherheitAdminTab";
import { UnterschriftenArchivTab } from "./UnterschriftenArchivTab";
import LohnkostenTab from "./LohnkostenTab";
import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import BottomSheet from "@/components/BottomSheet";
import MitarbeiterDetail from "./MitarbeiterDetail";

type AdminTab = "mitarbeiter" | "kunden" | "zuordnung" | "abschluss" | "vorlagen" | "dsgvo" | "preise" | "sicherheit" | "fuehrerschein" | "compliance" | "compliance-gesamt" | "arbeitssicherheit" | "unterschriften-archiv" | "lohnkosten";
type PortalRolle = "mitarbeiter" | "teamleitung" | "buchhaltung" | "admin";

const ROLLEN_LABEL: Record<PortalRolle, string> = {
  mitarbeiter: "Mitarbeiter",
  teamleitung: "Teamleitung",
  buchhaltung: "Buchhaltung",
  admin: "Admin",
};

const ZERT_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  erhalten: { label: "✅ Zertifikat erhalten", bg: "#e8f5e4", color: "#4a8c3f" },
  angemeldet: { label: "⏳ Zur Schulung angemeldet", bg: "#fef9c3", color: "#92400e" },
  nicht_angemeldet: { label: "❌ Nicht angemeldet", bg: "#fee2e2", color: "#991b1b" },
};

const BESCHAEFT_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  minijob: { label: "Minijob", bg: "#f3e8ff", color: "#7e22ce" },
  teilzeit: { label: "Teilzeit", bg: "#dbeafe", color: "#1d4ed8" },
  vollzeit: { label: "Vollzeit", bg: "#e8f5e4", color: "#4a8c3f" },
};

export default function AdminPanel() {
  const [tab, setTab] = useState<AdminTab>("mitarbeiter");

  // ── Mitarbeiter ──────────────────────────────────────
  const [maSheet, setMaSheet] = useState(false);
  const [editMa, setEditMa] = useState<{ id: number; vorname: string; nachname: string; email: string; rolle: PortalRolle; aktiv: number; telefon?: string | null } | null>(null);
  const [maVorname, setMaVorname] = useState("");
  const [maNachname, setMaNachname] = useState("");
  const [maEmail, setMaEmail] = useState("");
  const [maPasswort, setMaPasswort] = useState("");
  const [maRolle, setMaRolle] = useState<PortalRolle>("mitarbeiter");
  const [maTelefon, setMaTelefon] = useState("");
  const [maBeschaeftigung, setMaBeschaeftigung] = useState<"minijob" | "teilzeit" | "vollzeit">("minijob");
  const [maUrlaubstage, setMaUrlaubstage] = useState<number>(24);
  const [maWochenstunden, setMaWochenstunden] = useState<number>(0);
  const [maMonatslohn, setMaMonatslohn] = useState<number>(0);
  const [maStundenlohn, setMaStundenlohn] = useState<number>(0);
  // MA-Filter
  const [maSearch, setMaSearch] = useState("");
  const [maBeschFilter, setMaBeschFilter] = useState<"alle" | "minijob" | "teilzeit" | "vollzeit">("alle");
  const [maZeigeInaktiv, setMaZeigeInaktiv] = useState(false);

  const { data: maList = [], refetch: refetchMa } = trpc.admin.mitarbeiterList.useQuery();
  const createMa = trpc.admin.mitarbeiterCreate.useMutation({
    onSuccess: () => { refetchMa(); toast.success("✅ Mitarbeiter angelegt"); resetMaForm(); setMaSheet(false); },
    onError: (e) => toast.error("❌ " + e.message),
  });
  const updateMa = trpc.admin.mitarbeiterUpdate.useMutation({
    onSuccess: () => { refetchMa(); toast.success("✅ Mitarbeiter aktualisiert"); resetMaForm(); setMaSheet(false); },
    onError: (e) => toast.error("❌ " + e.message),
  });

  const resetMaForm = () => { setEditMa(null); setMaVorname(""); setMaNachname(""); setMaEmail(""); setMaPasswort(""); setMaRolle("mitarbeiter"); setMaTelefon(""); setMaBeschaeftigung("minijob"); setMaUrlaubstage(24); setMaWochenstunden(0); setMaMonatslohn(0); setMaStundenlohn(0); };
  // ── Export ───────────────────────────────────────────
  const { data: exportDaten = [] } = trpc.admin.mitarbeiterExport.useQuery();

  const EXPORT_HEADER = ["ID", "Vorname", "Nachname", "E-Mail", "Rolle", "Beschäftigungsart", "Telefon", "Aktiv", "Urlaubstage/Jahr", "Urlaub verbraucht", "Urlaub Rest", "Wochenstunden", "Monatslohn (€)", "Stundenlohn (€)", "Einstellungsdatum", "Notizen"];
  const EXPORT_KEYS: Array<keyof typeof exportDaten[0]> = ["id", "vorname", "nachname", "email", "rolle", "beschaeftigungsart", "telefon", "aktiv", "urlaubstageJahr", "urlaubstageVerbraucht", "urlaubstageRest", "wochenstunden", "monatslohn", "stundenlohn", "einstellungsdatum", "notizen"];

  const dateiname = () => `mitarbeiterliste_${new Date().toISOString().slice(0, 10)}`;

  const exportExcel = () => {
    if (exportDaten.length === 0) { toast.error("Keine Daten zum Exportieren"); return; }
    const ws = XLSX.utils.aoa_to_sheet([
      EXPORT_HEADER,
      ...exportDaten.map(ma => EXPORT_KEYS.map(k => (ma as any)[k] ?? "")),
    ]);
    // Spaltenbreiten automatisch
    ws["!cols"] = EXPORT_HEADER.map((h, i) => {
      const maxLen = Math.max(h.length, ...exportDaten.map(ma => String((ma as any)[EXPORT_KEYS[i]] ?? "").length));
      return { wch: Math.min(maxLen + 2, 40) };
    });
    // Titelzeile fett
    EXPORT_HEADER.forEach((_, i) => {
      const cell = XLSX.utils.encode_cell({ r: 0, c: i });
      if (ws[cell]) ws[cell].s = { font: { bold: true } };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mitarbeiter");
    XLSX.writeFile(wb, `${dateiname()}.xlsx`);
    toast.success("✅ Excel-Export erfolgreich");
  };

  const exportCSV = () => {
    if (exportDaten.length === 0) { toast.error("Keine Daten zum Exportieren"); return; }
    const rows = [
      EXPORT_HEADER,
      ...exportDaten.map(ma => EXPORT_KEYS.map(k => String((ma as any)[k] ?? "").replace(/;/g, ","))),
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(";")).join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${dateiname()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("✅ CSV-Export erfolgreich");
  };

  // ── Löschen ──────────────────────────────────────────
  const [deleteDialogMa, setDeleteDialogMa] = useState<{ id: number; vorname: string; nachname: string } | null>(null);
  const [deleteBestaetigung, setDeleteBestaetigung] = useState("");
  const deleteMa = trpc.admin.mitarbeiterDelete.useMutation({
    onSuccess: () => { refetchMa(); toast.success("🗑️ Mitarbeiter gelöscht"); setDeleteDialogMa(null); setDeleteBestaetigung(""); },
    onError: (e) => toast.error("❌ " + e.message),
  });
  const openEditMa = (ma: typeof maList[0]) => {
    setEditMa(ma);
    setMaVorname(ma.vorname); setMaNachname(ma.nachname); setMaEmail(ma.email);
    setMaRolle(ma.rolle); setMaTelefon(ma.telefon || "");
    setMaBeschaeftigung(((ma as any).beschaeftigungsart as "minijob" | "teilzeit" | "vollzeit") || "minijob");
    setMaUrlaubstage((ma as any).urlaubstageJahr ?? 24);
    setMaWochenstunden((ma as any).wochenstunden ?? 0);
    setMaMonatslohn((ma as any).monatslohn ?? 0);
    setMaStundenlohn((ma as any).stundenlohn ?? 0);
    setMaPasswort(""); setMaSheet(true);
  };
  const saveMa = () => {
    if (!maVorname || !maNachname || !maEmail) { toast.error("Pflichtfelder ausfüllen!"); return; }
    if (editMa) {
      updateMa.mutate({ id: editMa.id, vorname: maVorname, nachname: maNachname, email: maEmail, rolle: maRolle, telefon: maTelefon, beschaeftigungsart: maBeschaeftigung, urlaubstageJahr: maUrlaubstage, wochenstunden: maWochenstunden, monatslohn: maMonatslohn, stundenlohn: maStundenlohn, ...(maPasswort ? { neuesPasswort: maPasswort } : {}) });
    } else {
      if (!maPasswort) { toast.error("Passwort eingeben!"); return; }
      createMa.mutate({ vorname: maVorname, nachname: maNachname, email: maEmail, passwort: maPasswort, rolle: maRolle, telefon: maTelefon, beschaeftigungsart: maBeschaeftigung, urlaubstageJahr: maUrlaubstage, wochenstunden: maWochenstunden, monatslohn: maMonatslohn, stundenlohn: maStundenlohn });
    }
  };

  // ── Kunden ───────────────────────────────────────────
  const [kdSheet, setKdSheet] = useState(false);
  const [editKd, setEditKd] = useState<{ id: number; vorname: string; nachname: string; strasse?: string | null; plz?: string | null; ort?: string | null; telefon?: string | null; pflegegrad?: number | null; paragraph?: string | null } | null>(null);
  const [kdVorname, setKdVorname] = useState("");
  const [kdNachname, setKdNachname] = useState("");
  const [kdAdresse, setKdAdresse] = useState("");
  const [kdTelefon, setKdTelefon] = useState("");
  const [kdPflegegrad, setKdPflegegrad] = useState("2");
  const [kdPflegegradSeit, setKdPflegegradSeit] = useState("");
  const [kdParagraph, setKdParagraph] = useState<"45b" | "45a" | "39" | "privat">("45b");

  const { data: kundenList = [], refetch: refetchKd } = trpc.kunden.list.useQuery();
  const createKd = trpc.kunden.create.useMutation({
    onSuccess: () => { refetchKd(); toast.success("✅ Kunde angelegt"); resetKdForm(); setKdSheet(false); },
    onError: (e) => toast.error("❌ " + e.message),
  });
  const updateKd = trpc.kunden.update.useMutation({
    onSuccess: () => { refetchKd(); toast.success("✅ Kunde aktualisiert"); resetKdForm(); setKdSheet(false); },
    onError: (e) => toast.error("❌ " + e.message),
  });

  // Budget-States
  const [budgetSheet, setBudgetSheet] = useState(false);
  const [budgetKunde, setBudgetKunde] = useState<{ id: number; vorname: string; nachname: string } | null>(null);
  const [b45b, setB45b] = useState("");
  const [v45b, setV45b] = useState("");
  const [la45b, setLa45b] = useState("");
  const [b45a, setB45a] = useState("");
  const [v45a, setV45a] = useState("");
  const [la45a, setLa45a] = useState("");
  const [b39, setB39] = useState("");
  const [v39, setV39] = useState("");
  const [la39, setLa39] = useState("");

  const updateBudget = trpc.kunden.updateBudget.useMutation({
    onSuccess: () => { refetchKd(); toast.success("✅ Budget aktualisiert"); setBudgetSheet(false); },
    onError: (e) => toast.error("❌ " + e.message),
  });

  const openBudgetSheet = (k: typeof kundenList[0]) => {
    setBudgetKunde({ id: k.id, vorname: k.vorname, nachname: k.nachname });
    setB45b(String(k.budget45b ?? "0")); setV45b(String(k.verbraucht45b ?? "0")); setLa45b(k.letzteAbrechnung45b ?? "");
    setB45a(String(k.budget45a ?? "0")); setV45a(String(k.verbraucht45a ?? "0")); setLa45a(k.letzteAbrechnung45a ?? "");
    setB39(String(k.budget39 ?? "0")); setV39(String(k.verbraucht39 ?? "0")); setLa39(k.letzteAbrechnung39 ?? "");
    setBudgetSheet(true);
  };

  const saveBudget = () => {
    if (!budgetKunde) return;
    updateBudget.mutate({
      id: budgetKunde.id,
      budget45b: b45b, verbraucht45b: v45b, letzteAbrechnung45b: la45b,
      budget45a: b45a, verbraucht45a: v45a, letzteAbrechnung45a: la45a,
      budget39: b39, verbraucht39: v39, letzteAbrechnung39: la39,
    });
  };

  const resetKdForm = () => { setEditKd(null); setKdVorname(""); setKdNachname(""); setKdAdresse(""); setKdTelefon(""); setKdPflegegrad("2"); setKdPflegegradSeit(""); setKdParagraph("45b"); };
  const openEditKd = (k: typeof kundenList[0]) => {
    setEditKd(k);
    setKdVorname(k.vorname); setKdNachname(k.nachname); setKdAdresse(k.strasse || "");
    setKdTelefon(k.telefon || ""); setKdPflegegrad(String(k.pflegegrad || 2));
    setKdPflegegradSeit((k as any).pflegegradSeit ? String((k as any).pflegegradSeit).split("T")[0] : "");
    setKdParagraph((k.paragraph as "45b" | "45a" | "39" | "privat") || "45b");
    setKdSheet(true);
  };
  const saveKd = () => {
    if (!kdVorname || !kdNachname) { toast.error("Pflichtfelder ausfüllen!"); return; }
    const data = { vorname: kdVorname, nachname: kdNachname, strasse: kdAdresse, telefon: kdTelefon, pflegegrad: parseInt(kdPflegegrad), pflegegradSeit: kdPflegegradSeit || null, paragraph: kdParagraph };
    if (editKd) updateKd.mutate({ id: editKd.id, ...data });
    else createKd.mutate(data);
  };

  // ── Zuordnung (Kunden-basiert, max. 3 Mitarbeiter pro Kunde) ──────
  // Kunden-basierte Zuordnung: Wähle einen Kunden, dann bis zu 3 Mitarbeiter
  const [zuordKundeId, setZuordKundeId] = useState<number | null>(null);
  const { data: zuordDaten = [], refetch: refetchZuordnung } = trpc.kunden.getZuordnungen.useQuery(
    { kundenId: zuordKundeId ?? 0 },
    { enabled: !!zuordKundeId }
  );
  // Lokaler State: Array von { mitarbeiterId, prioritaet, rolle }
  const [zuordRows, setZuordRows] = useState<Array<{ mitarbeiterId: number; prioritaet: number; rolle: 'hauptbetreuer' | 'vertretung' }>>([]);
  const setZuordnungenMut = trpc.kunden.setZuordnungen.useMutation({
    onSuccess: () => { toast.success("✅ Zuordnung gespeichert"); refetchZuordnung(); },
    onError: (e) => toast.error("❌ " + e.message),
  });

  const openKundeZuordnung = (kundeId: number) => {
    setZuordKundeId(kundeId);
    setZuordRows([]); // Reset – useEffect befüllt sobald Daten geladen
  };

  // Wenn Zuordnungsdaten geladen werden, in lokalen State übernehmen (korrekt via useEffect)
  useEffect(() => {
    if (zuordKundeId && zuordDaten.length > 0) {
      setZuordRows(zuordDaten.map(z => ({
        mitarbeiterId: z.mitarbeiterId,
        prioritaet: z.prioritaet,
        rolle: z.rolle as 'hauptbetreuer' | 'vertretung',
      })));
    }
  }, [zuordKundeId, zuordDaten]);

  const addZuordRow = () => {
    if (zuordRows.length >= 3) { toast.error("Maximal 3 Mitarbeiter pro Kunde erlaubt."); return; }
    setZuordRows(prev => [...prev, { mitarbeiterId: 0, prioritaet: prev.length + 1, rolle: prev.length === 0 ? 'hauptbetreuer' : 'vertretung' }]);
  };

  const removeZuordRow = (idx: number) => {
    setZuordRows(prev => prev.filter((_, i) => i !== idx).map((r, i) => ({ ...r, prioritaet: i + 1 })));
  };

  const saveZuordnung = () => {
    if (!zuordKundeId) return;
    const valid = zuordRows.filter(r => r.mitarbeiterId > 0);
    if (valid.length === 0) { toast.error("Mindestens einen Mitarbeiter auswählen."); return; }
    setZuordnungenMut.mutate({ kundenId: zuordKundeId, zuordnungen: valid });
  };

  // ── Monatsabschluss ───────────────────────────────────
  const today = new Date().toISOString().split("T")[0];
  const [monat, setMonat] = useState(today.slice(0, 7));
  const { data: abschluesse = [] } = trpc.admin.monatsabschluesse.useQuery();
  const abschluss = trpc.admin.monatsabschluss.useMutation({
    onSuccess: (data) => {
      toast.success(`✅ Abschluss für ${monat} erstellt`);
      if (data.csvExport) {
        const blob = new Blob([data.csvExport], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `abschluss_${monat}.csv`; a.click();
        URL.revokeObjectURL(url);
      }
    },
    onError: (e) => toast.error("❌ " + e.message),
  });

  const [detailMaId, setDetailMaId] = useState<number | null>(null);

  // Wenn Mitarbeiter-Detail geöffnet
  if (detailMaId !== null) {
    return <MitarbeiterDetail mitarbeiterId={detailMaId} onBack={() => setDetailMaId(null)} />;
  }

  const tabStyle = (t: AdminTab) => ({
    padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer",
    ...(tab === t ? { background: "#4a8c3f", color: "#fff" } : { background: "#f3f4f6", color: "#4b5563" }),
  });

  const inputStyle: React.CSSProperties = { width: "100%", padding: "11px 12px", border: "2px solid #e5e7eb", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff" };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#6b7280", marginBottom: 4 };
  const btnGreen: React.CSSProperties = { padding: "11px 20px", background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", width: "100%" };

  return (
    <div className="page-enter">
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Admin-Panel</div>
        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>Lebenswert Betreuung – Verwaltung</div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {[
          { key: "mitarbeiter" as AdminTab, label: "👥 Mitarbeiter" },
          { key: "kunden" as AdminTab, label: "🏠 Kunden" },
          { key: "zuordnung" as AdminTab, label: "🔗 Zuordnung" },
          { key: "abschluss" as AdminTab, label: "📊 Abschluss" },
          { key: "vorlagen" as AdminTab, label: "📋 Formularvorlagen" },
          { key: "dsgvo" as AdminTab, label: "🔒 DSGVO-Dokumente" },
          { key: "preise" as AdminTab, label: "💶 Leistungskosten" },
          { key: "sicherheit" as AdminTab, label: "🦺 Sicherheitsunterweisungen" },
          { key: "fuehrerschein" as AdminTab, label: "🪖 Führerschein-Checks" },
          { key: "compliance" as AdminTab, label: "🚦 Compliance-Ampel" },
          { key: "compliance-gesamt" as AdminTab, label: "📊 Compliance-Gesamt" },
          { key: "arbeitssicherheit" as AdminTab, label: "⛑️ Arbeitssicherheit" },
          { key: "unterschriften-archiv" as AdminTab, label: "📋 Unterschriften-Archiv" },
          { key: "lohnkosten" as AdminTab, label: "💰 Lohnkosten" },
        ].map((t) => (
          <button key={t.key} style={tabStyle(t.key)} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* ── MITARBEITER ── */}
      {tab === "mitarbeiter" && (
        <div>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              {maList.filter(m => maZeigeInaktiv || m.aktiv).length} Mitarbeiter
            </span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button onClick={exportExcel} title="Als Excel-Datei herunterladen" style={{ padding: "8px 12px", background: "#1d6f42", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>📥 Excel</button>
              <button onClick={exportCSV} title="Als CSV-Datei herunterladen (DATEV-kompatibel)" style={{ padding: "8px 12px", background: "#1e40af", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>📥 CSV</button>
              <button onClick={() => { resetMaForm(); setMaSheet(true); }} style={{ padding: "8px 14px", background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Neu anlegen</button>
            </div>
          </div>
          {/* Suchfeld */}
          <input
            value={maSearch}
            onChange={e => setMaSearch(e.target.value)}
            placeholder="🔍 Name oder E-Mail suchen..."
            style={{ width: "100%", padding: "9px 12px", border: "2px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", marginBottom: 8, boxSizing: "border-box" }}
          />
          {/* Beschäftigungsart-Filter + Inaktive */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {(["alle", "minijob", "teilzeit", "vollzeit"] as const).map(f => (
              <button key={f} onClick={() => setMaBeschFilter(f)}
                style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer",
                  background: maBeschFilter === f ? "#4a8c3f" : "#f3f4f6",
                  color: maBeschFilter === f ? "#fff" : "#4b5563" }}>
                {f === "alle" ? "Alle" : f === "minijob" ? "Minijob" : f === "teilzeit" ? "Teilzeit" : "Vollzeit"}
              </button>
            ))}
            <button onClick={() => setMaZeigeInaktiv(v => !v)}
              style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer", marginLeft: "auto",
                background: maZeigeInaktiv ? "#fee2e2" : "#f3f4f6",
                color: maZeigeInaktiv ? "#991b1b" : "#4b5563" }}>
              {maZeigeInaktiv ? "⛔ Inaktive ausblenden" : "Inaktive anzeigen"}
            </button>
          </div>
          {maList
            .filter(ma => maZeigeInaktiv || ma.aktiv)
            .filter(ma => maBeschFilter === "alle" || (ma as any).beschaeftigungsart === maBeschFilter)
            .filter(ma => {
              if (!maSearch.trim()) return true;
              const q = maSearch.toLowerCase();
              return `${ma.vorname} ${ma.nachname}`.toLowerCase().includes(q) || ma.email.toLowerCase().includes(q);
            })
            .map((ma) => {
            const zert = (ma as any).zertifikatStatus as string ?? "nicht_angemeldet";
            const beschaeft = (ma as any).beschaeftigungsart as string ?? "minijob";
            const zertBadge = ZERT_BADGE[zert] ?? ZERT_BADGE.nicht_angemeldet;
            const beschBadge = BESCHAEFT_BADGE[beschaeft] ?? BESCHAEFT_BADGE.minijob;
            return (
            <div key={ma.id} style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,.08)", padding: 14, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: ma.rolle === "admin" ? "#4a8c3f" : "#e8f5e4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                  {ma.rolle === "admin" ? "A" : ma.rolle === "teamleitung" ? "T" : ma.rolle === "buchhaltung" ? "B" : "M"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{ma.vorname} {ma.nachname}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 2 }}>{(ma as any).position ?? ROLLEN_LABEL[ma.rolle]}</div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>{ma.email}</div>
                  {/* Badges */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: beschBadge.bg, color: beschBadge.color }}>
                      {beschBadge.label}
                    </span>
                    <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: zertBadge.bg, color: zertBadge.color }}>
                      {zertBadge.label}
                    </span>
                    {(ma as any).arbeitsvertragUrl && (
                      <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: "#e8f5e4", color: "#4a8c3f" }}>📄 Vertrag vorhanden</span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", flexShrink: 0 }}>
                  <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: ma.aktiv ? "#e8f5e4" : "#fee2e2", color: ma.aktiv ? "#4a8c3f" : "#991b1b" }}>
                    {ma.aktiv ? "Aktiv" : "Inaktiv"}
                  </span>
                  <button onClick={() => setDetailMaId(ma.id)} style={{ padding: "4px 10px", background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Details</button>
                  <button onClick={() => openEditMa(ma)} style={{ padding: "4px 10px", background: "#f3f4f6", color: "#4b5563", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Bearbeiten</button>
                  <button onClick={() => { updateMa.mutate({ id: ma.id, aktiv: ma.aktiv ? 0 : 1 }); }} style={{ padding: "4px 10px", background: ma.aktiv ? "#fee2e2" : "#e8f5e4", color: ma.aktiv ? "#991b1b" : "#4a8c3f", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    {ma.aktiv ? "Deaktivieren" : "Aktivieren"}
                  </button>
                  <button onClick={() => { setDeleteDialogMa({ id: ma.id, vorname: ma.vorname, nachname: ma.nachname }); setDeleteBestaetigung(""); }} style={{ padding: "4px 10px", background: "#7f1d1d", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    🗑️ Löschen
                  </button>
                </div>
              </div>
            </div>
                    );})
          }
        </div>
      )}
      {/* ── KUNDEN ── */}
      {tab === "kunden" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{kundenList.length} Kunden</span>
            <button onClick={() => { resetKdForm(); setKdSheet(true); }} style={{ padding: "8px 14px", background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Neu</button>
          </div>
          {kundenList.map((k) => (
            <div key={k.id} style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,.08)", padding: 14, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#e8f5e4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🏠</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{k.vorname} {k.nachname}</div>
                  {(k.strasse || k.ort) && <div style={{ fontSize: 12, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📍 {[k.strasse, k.plz, k.ort].filter(Boolean).join(', ')}</div>}
                  <div style={{ fontSize: 12, color: "#6b7280", display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                    {k.pflegegrad && <span style={{ padding: "1px 6px", borderRadius: 10, background: "#e0f2f0", color: "#2a9d8f", fontWeight: 700 }}>PG {k.pflegegrad}</span>}
                    {k.paragraph && <span style={{ padding: "1px 6px", borderRadius: 10, background: "#e8f5e4", color: "#4a8c3f", fontWeight: 700 }}>§{k.paragraph}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => openBudgetSheet(k)} style={{ padding: "6px 10px", background: "#fef3c7", color: "#92400e", border: "none", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>€ Budget</button>
                  <button onClick={() => openEditKd(k)} style={{ padding: "6px 12px", background: "#f3f4f6", color: "#4b5563", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Bearbeiten</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── ZUORDNUNG (Kunden-basiert, max. 3 Mitarbeiter) ── */}
      {tab === "zuordnung" && (
        <div>
          <div style={{ background: "#e8f5e4", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#14532d", fontWeight: 600 }}>
            🔗 Weise jedem Kunden bis zu <strong>3 Mitarbeiter</strong> zu (1 Hauptbetreuer + bis zu 2 Vertretungen).
          </div>
          {kundenList.map((k) => (
            <div key={k.id} style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,.08)", padding: 14, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{k.vorname} {k.nachname}</div>
                  {k.paragraph && <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 10, background: "#e8f5e4", color: "#4a8c3f", fontWeight: 700 }}>§{k.paragraph}</span>}
                </div>
                <button
                  onClick={() => openKundeZuordnung(k.id)}
                  style={{ padding: "7px 14px", background: zuordKundeId === k.id ? "#4a8c3f" : "#f3f4f6", color: zuordKundeId === k.id ? "#fff" : "#4b5563", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  {zuordKundeId === k.id ? "Ausgewählt ✓" : "Zuordnen"}
                </button>
              </div>
            </div>
          ))}

          {zuordKundeId && (
            <div style={{ background: "#f0faf0", borderRadius: 12, padding: 16, marginTop: 8, border: "2px solid #4a8c3f" }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: "#4a8c3f" }}>
                Mitarbeiter für: {kundenList.find(k => k.id === zuordKundeId)?.vorname} {kundenList.find(k => k.id === zuordKundeId)?.nachname}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>Max. 3 Mitarbeiter • Priorität 1 = Hauptbetreuer</div>

              {zuordRows.map((row, idx) => (
                <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, background: "#fff", borderRadius: 10, padding: 10, border: "1px solid #d1fae5" }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#4a8c3f", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{idx + 1}</div>
                  <select
                    value={String(row.mitarbeiterId)}
                    onChange={e => setZuordRows(prev => prev.map((r, i) => i === idx ? { ...r, mitarbeiterId: Number(e.target.value) } : r))}
                    style={{ flex: 1, border: "1px solid #d1d5db", borderRadius: 8, padding: "6px 8px", fontSize: 13 }}
                  >
                    <option value="0">Mitarbeiter wählen...</option>
                    {(maList as any[]).map(ma => (
                      <option key={ma.id} value={String(ma.id)}>{ma.vorname} {ma.nachname}</option>
                    ))}
                  </select>
                  <select
                    value={row.rolle}
                    onChange={e => setZuordRows(prev => prev.map((r, i) => i === idx ? { ...r, rolle: e.target.value as 'hauptbetreuer' | 'vertretung' } : r))}
                    style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: "6px 8px", fontSize: 12 }}
                  >
                    <option value="hauptbetreuer">🏠 Hauptbetreuer</option>
                    <option value="vertretung">🔄 Vertretung</option>
                  </select>
                  <button onClick={() => removeZuordRow(idx)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>✕</button>
                </div>
              ))}

              {zuordRows.length < 3 && (
                <button onClick={addZuordRow} style={{ width: "100%", padding: "10px", background: "#f0fdf4", color: "#4a8c3f", border: "2px dashed #4a8c3f", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 12 }}>
                  + Mitarbeiter hinzufügen ({zuordRows.length}/3)
                </button>
              )}

              <button onClick={saveZuordnung} style={{ ...btnGreen, width: "100%" }} disabled={setZuordnungenMut.isPending}>
                {setZuordnungenMut.isPending ? "Speichern…" : "✅ Zuordnung speichern"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── MONATSABSCHLUSS ── */}
      {tab === "abschluss" && (
        <div>
          <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,.08)", padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Neuer Monatsabschluss</div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Monat</label>
              <input type="month" value={monat} onChange={(e) => setMonat(e.target.value)} style={inputStyle} />
            </div>
            <button
              onClick={() => abschluss.mutate({ monat })}
              disabled={abschluss.isPending}
              style={btnGreen}
            >
              {abschluss.isPending ? "Erstelle…" : "📊 Abschluss erstellen & CSV exportieren"}
            </button>
          </div>

          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Bisherige Abschlüsse</div>
          {abschluesse.length === 0 ? (
            <p style={{ color: "#6b7280", fontSize: 13 }}>Noch keine Abschlüsse.</p>
          ) : (
            abschluesse.map((a) => (
              <div key={a.id} style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,.08)", padding: 14, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{a.monat}</div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                      {a.gesamtEinsaetze} Einsätze · {parseFloat(String(a.gesamtStunden ?? 0)).toFixed(1)}h · {parseFloat(String(a.gesamtKm ?? 0)).toFixed(0)} km
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#4a8c3f" }}>{parseFloat(String(a.gesamtVerguetung ?? 0)).toFixed(2)} €</div>
                    {a.csvExport && (
                      <button
                        onClick={() => {
                          const blob = new Blob([a.csvExport!], { type: "text/csv;charset=utf-8;" });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.href = url; link.download = `abschluss_${a.monat}.csv`; link.click();
                          URL.revokeObjectURL(url);
                        }}
                        style={{ padding: "4px 10px", background: "#e8f5e4", color: "#4a8c3f", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", marginTop: 4 }}
                      >
                        ⬇ CSV
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Mitarbeiter-Sheet ── */}
      <BottomSheet open={maSheet} onClose={() => { setMaSheet(false); resetMaForm(); }} title={editMa ? "Mitarbeiter bearbeiten" : "Neuer Mitarbeiter"}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Vorname *</label>
            <input value={maVorname} onChange={(e) => setMaVorname(e.target.value)} style={inputStyle} placeholder="Max" />
          </div>
          <div>
            <label style={labelStyle}>Nachname *</label>
            <input value={maNachname} onChange={(e) => setMaNachname(e.target.value)} style={inputStyle} placeholder="Mustermann" />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>E-Mail *</label>
          <input type="email" value={maEmail} onChange={(e) => setMaEmail(e.target.value)} style={inputStyle} placeholder="max@lebenswert.de" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>{editMa ? "Neues Passwort (leer = unverändert)" : "Passwort *"}</label>
          <input type="password" value={maPasswort} onChange={(e) => setMaPasswort(e.target.value)} style={inputStyle} placeholder="••••••••" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Telefon</label>
            <input value={maTelefon} onChange={(e) => setMaTelefon(e.target.value)} style={inputStyle} placeholder="+49 123 456" />
          </div>
          <div>
            <label style={labelStyle}>Rolle</label>
            <select value={maRolle} onChange={(e) => setMaRolle(e.target.value as PortalRolle)} style={inputStyle}>
              <option value="mitarbeiter">Mitarbeiter</option>
              <option value="teamleitung">Teamleitung</option>
              <option value="buchhaltung">Buchhaltung</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Beschäftigungsart *</label>
            <select value={maBeschaeftigung} onChange={(e) => setMaBeschaeftigung(e.target.value as "minijob" | "teilzeit" | "vollzeit")} style={inputStyle}>
              <option value="minijob">🟣 Minijob</option>
              <option value="teilzeit">🔵 Teilzeit</option>
              <option value="vollzeit">🟢 Vollzeit</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Urlaubstage/Jahr *</label>
            <input type="number" min={0} max={40} value={maUrlaubstage} onChange={(e) => setMaUrlaubstage(Number(e.target.value))} style={inputStyle} placeholder="24" />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Wochenstunden</label>
            <input type="number" min={0} max={48} step={0.5} value={maWochenstunden} onChange={(e) => setMaWochenstunden(Number(e.target.value))} style={inputStyle} placeholder="20" />
          </div>
          <div>
            <label style={labelStyle}>Monatslohn (€)</label>
            <input type="number" min={0} step={0.01} value={maMonatslohn} onChange={(e) => setMaMonatslohn(Number(e.target.value))} style={inputStyle} placeholder="0.00" />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Stundenlohn (€) – nur wenn kein Monatslohn</label>
          <input type="number" min={0} step={0.01} value={maStundenlohn} onChange={(e) => setMaStundenlohn(Number(e.target.value))} style={inputStyle} placeholder="0.00" />
        </div>
        <button onClick={saveMa} disabled={createMa.isPending || updateMa.isPending} style={btnGreen}>
          {createMa.isPending || updateMa.isPending ? "Speichern…" : editMa ? "Änderungen speichern" : "Mitarbeiter anlegen"}
        </button>
      </BottomSheet>

      {/* ── Lösch-Bestätigungsdialog ── */}
      {deleteDialogMa && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, maxWidth: 420, width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,.25)" }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>⚠️ Mitarbeiter endgültig löschen</div>
            <p style={{ fontSize: 14, color: "#374151", marginBottom: 16, lineHeight: 1.6 }}>
              Du bist dabei, <strong>{deleteDialogMa.vorname} {deleteDialogMa.nachname}</strong> dauerhaft zu löschen.<br />
              Diese Aktion kann <strong>nicht rückgängig</strong> gemacht werden.<br /><br />
              Tippe zur Bestätigung den vollständigen Namen ein:
            </p>
            <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontWeight: 700, color: "#991b1b", fontSize: 14 }}>
              {deleteDialogMa.vorname} {deleteDialogMa.nachname}
            </div>
            <input
              value={deleteBestaetigung}
              onChange={(e) => setDeleteBestaetigung(e.target.value)}
              placeholder="Vollständigen Namen eingeben…"
              style={{ width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 8, fontSize: 14, marginBottom: 16, boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => { setDeleteDialogMa(null); setDeleteBestaetigung(""); }}
                style={{ flex: 1, padding: "10px 0", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                Abbrechen
              </button>
              <button
                onClick={() => deleteMa.mutate({ id: deleteDialogMa.id, bestaetigung: deleteBestaetigung })}
                disabled={deleteBestaetigung.toLowerCase().trim() !== `${deleteDialogMa.vorname} ${deleteDialogMa.nachname}`.toLowerCase().trim() || deleteMa.isPending}
                style={{ flex: 1, padding: "10px 0", background: deleteBestaetigung.toLowerCase().trim() === `${deleteDialogMa.vorname} ${deleteDialogMa.nachname}`.toLowerCase().trim() ? "#7f1d1d" : "#d1d5db", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: deleteBestaetigung.toLowerCase().trim() === `${deleteDialogMa.vorname} ${deleteDialogMa.nachname}`.toLowerCase().trim() ? "pointer" : "not-allowed" }}
              >
                {deleteMa.isPending ? "Löschen…" : "🗑️ Endgültig löschen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Kunden-Sheet ── */}
      <BottomSheet open={kdSheet} onClose={() => { setKdSheet(false); resetKdForm(); }} title={editKd ? "Kunde bearbeiten" : "Neuer Kunde"}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Vorname *</label>
            <input value={kdVorname} onChange={(e) => setKdVorname(e.target.value)} style={inputStyle} placeholder="Maria" />
          </div>
          <div>
            <label style={labelStyle}>Nachname *</label>
            <input value={kdNachname} onChange={(e) => setKdNachname(e.target.value)} style={inputStyle} placeholder="Müller" />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Adresse</label>
          <input value={kdAdresse} onChange={(e) => setKdAdresse(e.target.value)} style={inputStyle} placeholder="Musterstr. 1, 12345 Stadt" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Telefon</label>
            <input value={kdTelefon} onChange={(e) => setKdTelefon(e.target.value)} style={inputStyle} placeholder="+49 123 456" />
          </div>
          <div>
            <label style={labelStyle}>Pflegegrad</label>
            <select value={kdPflegegrad} onChange={(e) => setKdPflegegrad(e.target.value)} style={inputStyle}>
              {[1, 2, 3, 4, 5].map((g) => <option key={g} value={g}>PG {g}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Pflegegrad anerkannt seit</label>
          <input type="date" value={kdPflegegradSeit} onChange={(e) => setKdPflegegradSeit(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Paragraph</label>
          <select value={kdParagraph} onChange={(e) => setKdParagraph(e.target.value as "45b" | "45a" | "39" | "privat")} style={inputStyle}>
            <option value="45b">§45b SGB XI</option>
            <option value="45a">§45a SGB XI</option>
            <option value="39">§39 SGB XI</option>
            <option value="privat">Privat</option>
          </select>
        </div>
        <button onClick={saveKd} disabled={createKd.isPending || updateKd.isPending} style={btnGreen}>
          {createKd.isPending || updateKd.isPending ? "Speichern…" : editKd ? "Änderungen speichern" : "Kunde anlegen"}
        </button>
      </BottomSheet>

      {/* ── Budget-Sheet ── */}

      {tab === "vorlagen" && (
        <FormularVorlagenTab />
      )}
      {tab === "dsgvo" && (
        <DsgvoAdminTab />
      )}
      {tab === "preise" && (
        <VerrechnungssaetzeTab />
      )}
      {tab === "sicherheit" && (
        <SicherheitsunterweisungenAdminTab />
      )}
      {tab === "fuehrerschein" && (
        <FuehrerscheinCheckTab />
      )}
            {tab === "compliance" && (
        <ComplianceAmpelTab />
      )}
      {tab === "compliance-gesamt" && (
        <ComplianceGesamtuebersicht />
      )}
      {tab === "arbeitssicherheit" && (
        <ArbeitssicherheitAdminTab />
      )}
      {tab === "unterschriften-archiv" && (
        <UnterschriftenArchivTab />
      )}
      {tab === "lohnkosten" && (
        <LohnkostenTab />
      )}
      <BottomSheet open={budgetSheet} onClose={() => setBudgetSheet(false)} title={budgetKunde ? `Budget: ${budgetKunde.vorname} ${budgetKunde.nachname}` : "Budget bearbeiten"}>
        {/* §45b */}
        <div style={{ background: "#f0fdf4", borderRadius: 10, padding: 12, marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#4a8c3f", marginBottom: 8 }}>§45b SGB XI – Entlastungsleistungen</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Jahresbudget (€)</label>
              <input type="number" value={b45b} onChange={(e) => setB45b(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1fae5", borderRadius: 8, fontSize: 13, boxSizing: "border-box" as const }} placeholder="125.00" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Verbraucht (€)</label>
              <input type="number" value={v45b} onChange={(e) => setV45b(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1fae5", borderRadius: 8, fontSize: 13, boxSizing: "border-box" as const }} placeholder="0.00" />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Letzte Abrechnung</label>
            <input type="date" value={la45b} onChange={(e) => setLa45b(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1fae5", borderRadius: 8, fontSize: 13, boxSizing: "border-box" as const }} />
          </div>
        </div>
        {/* §45a */}
        <div style={{ background: "#eff6ff", borderRadius: 10, padding: 12, marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1d4ed8", marginBottom: 8 }}>§45a SGB XI – Angebote zur Unterstützung</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Jahresbudget (€)</label>
              <input type="number" value={b45a} onChange={(e) => setB45a(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1px solid #bfdbfe", borderRadius: 8, fontSize: 13, boxSizing: "border-box" as const }} placeholder="0.00" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Verbraucht (€)</label>
              <input type="number" value={v45a} onChange={(e) => setV45a(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1px solid #bfdbfe", borderRadius: 8, fontSize: 13, boxSizing: "border-box" as const }} placeholder="0.00" />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Letzte Abrechnung</label>
            <input type="date" value={la45a} onChange={(e) => setLa45a(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1px solid #bfdbfe", borderRadius: 8, fontSize: 13, boxSizing: "border-box" as const }} />
          </div>
        </div>
        {/* §39 */}
        <div style={{ background: "#fdf4ff", borderRadius: 10, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#7c3aed", marginBottom: 8 }}>§39 SGB XI – Verhinderungspflege</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Jahresbudget (€)</label>
              <input type="number" value={b39} onChange={(e) => setB39(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e9d5ff", borderRadius: 8, fontSize: 13, boxSizing: "border-box" as const }} placeholder="0.00" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Verbraucht (€)</label>
              <input type="number" value={v39} onChange={(e) => setV39(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e9d5ff", borderRadius: 8, fontSize: 13, boxSizing: "border-box" as const }} placeholder="0.00" />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Letzte Abrechnung</label>
            <input type="date" value={la39} onChange={(e) => setLa39(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e9d5ff", borderRadius: 8, fontSize: 13, boxSizing: "border-box" as const }} />
          </div>
        </div>
        <button onClick={saveBudget} disabled={updateBudget.isPending} style={{ width: "100%", padding: "13px", background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          {updateBudget.isPending ? "Speichern…" : "✅ Budget speichern"}
        </button>
      </BottomSheet>
    </div>
  );
}
