import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, User, Award, FileText, Phone, MapPin, Calendar,
  Briefcase, CheckCircle, Clock, XCircle, Upload, Edit2, Save,
  X, FileDown, Car, Shield, Plus, Trash2, Lock, Unlock,
  AlertTriangle, FolderOpen,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

// ─── Typen ────────────────────────────────────────────────────────────────────
type ZertifikatStatus = "erhalten" | "angemeldet" | "nicht_angemeldet";
type Beschaeftigungsart = "minijob" | "teilzeit" | "vollzeit";
type AkteTab = "stamm" | "dokumente" | "zertifikat" | "vertrag" | "rechte";
type DokTyp = "zertifikat" | "arbeitsvertrag" | "krankmeldung" | "fuehrerschein" | "erstehilfe" | "sonstiges";

// ─── Konfigurationen ──────────────────────────────────────────────────────────
const ZERT_CONFIG: Record<ZertifikatStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  erhalten:          { label: "Zertifikat erhalten",       color: "bg-green-100 text-green-800 border-green-200",  icon: CheckCircle },
  angemeldet:        { label: "Zur Schulung angemeldet",   color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
  nicht_angemeldet:  { label: "Nicht angemeldet",          color: "bg-red-100 text-red-800 border-red-200",        icon: XCircle },
};
const BESCHAEFT_CONFIG: Record<Beschaeftigungsart, { label: string; color: string }> = {
  minijob:  { label: "Minijob",  color: "bg-purple-100 text-purple-800 border-purple-200" },
  teilzeit: { label: "Teilzeit", color: "bg-blue-100 text-blue-800 border-blue-200" },
  vollzeit: { label: "Vollzeit", color: "bg-green-100 text-green-800 border-green-200" },
};
const DOK_TYP_LABEL: Record<DokTyp, string> = {
  zertifikat:    "Zertifikat",
  arbeitsvertrag:"Arbeitsvertrag",
  krankmeldung:  "Krankmeldung",
  fuehrerschein: "Führerschein",
  erstehilfe:    "Erste-Hilfe-Kurs",
  sonstiges:     "Sonstiges",
};
const DOK_TYP_FARBE: Record<DokTyp, string> = {
  zertifikat:    "bg-teal-100 text-teal-800",
  arbeitsvertrag:"bg-blue-100 text-blue-800",
  krankmeldung:  "bg-orange-100 text-orange-800",
  fuehrerschein: "bg-indigo-100 text-indigo-800",
  erstehilfe:    "bg-red-100 text-red-800",
  sonstiges:     "bg-gray-100 text-gray-700",
};

// ─── Modul-Berechtigungen (alle verfügbaren Module) ───────────────────────────
const ALLE_MODULE = [
  { key: "einsaetze",          label: "Einsätze einsehen" },
  { key: "einsaetze_erstellen", label: "Einsätze erstellen/bearbeiten" },
  { key: "leistungsnachweise", label: "Leistungsnachweise" },
  { key: "fahrten",            label: "Fahrtennachweise" },
  { key: "kunden",             label: "Kundenliste" },
  { key: "tourplanung",        label: "Tourplanung" },
  { key: "buchhaltung",        label: "Buchhaltung / Abschluss" },
  { key: "analysen",           label: "Analysen & Berichte" },
  { key: "sicherheit",         label: "Sicherheitsunterweisungen" },
  { key: "fuehrerschein",      label: "Führerschein-Checks" },
  { key: "admin",              label: "Admin-Bereich" },
  { key: "dsgvo",              label: "DSGVO-Dokumente" },
];

// ─── Dienstwagen-Karte ────────────────────────────────────────────────────────
function DienstwagenCard({ mitarbeiterId, ma }: { mitarbeiterId: number; ma: any }) {
  const utils = trpc.useUtils();
  const setDienstwagen = (trpc as any).dienstwagen.setzen.useMutation({
    onSuccess: () => {
      toast.success("Dienstwagen-Status gespeichert");
      utils.admin.mitarbeiterDetail.invalidate({ id: mitarbeiterId });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const [fahrzeugTyp, setFahrzeugTyp] = useState(ma?.fahrzeugTyp ?? "");
  return (
    <div className="bg-card rounded-xl p-4 border space-y-3">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1">
        <Car className="w-3 h-3" /> Dienstwagen
      </p>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Dienstwagen gestellt</p>
          <p className="text-xs text-muted-foreground">1%-Regelung – keine km-Erstattung</p>
        </div>
        <Switch
          checked={!!(ma?.dienstwagen)}
          onCheckedChange={(val) => setDienstwagen.mutate({ mitarbeiterId, dienstwagen: val, fahrzeugTyp: fahrzeugTyp || undefined })}
          disabled={setDienstwagen.isPending}
        />
      </div>
      {ma?.dienstwagen && (
        <div>
          <label className="text-xs text-muted-foreground">Fahrzeugtyp / Kennzeichen</label>
          <div className="flex gap-2 mt-1">
            <input
              value={fahrzeugTyp}
              onChange={e => setFahrzeugTyp(e.target.value)}
              placeholder="z.B. VW Golf · AB-CD 123"
              className="flex-1 px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button size="sm" onClick={() => setDienstwagen.mutate({ mitarbeiterId, dienstwagen: true, fahrzeugTyp: fahrzeugTyp || undefined })} disabled={setDienstwagen.isPending}>
              <Save className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  mitarbeiterId: number;
  onBack: () => void;
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────
export default function MitarbeiterDetail({ mitarbeiterId, onBack }: Props) {
  const { mitarbeiter: portalUser } = usePortalAuth();
  const isAdmin = portalUser?.rolle === "admin";

  // Tab-State
  const [activeTab, setActiveTab] = useState<AkteTab>("stamm");

  // Stammdaten-Edit
  const [editStamm, setEditStamm] = useState(false);
  const [stammForm, setStammForm] = useState<Record<string, string>>({});

  // Zertifikat-Edit
  const [editZert, setEditZert] = useState(false);
  const [zertForm, setZertForm] = useState<{
    zertifikatStatus: ZertifikatStatus;
    zertifikatDatum: string;
    zertifikatAblauf: string;
    zertifikatBemerkung: string;
  }>({ zertifikatStatus: "nicht_angemeldet", zertifikatDatum: "", zertifikatAblauf: "", zertifikatBemerkung: "" });

  // Vertrag-Upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Dokument-Formular
  const [showDokForm, setShowDokForm] = useState(false);
  const [dokForm, setDokForm] = useState<{
    typ: DokTyp; bezeichnung: string; ausstellungsdatum: string;
    ablaufdatum: string; notizen: string; base64?: string; mimeType?: string; dateiname?: string;
  }>({ typ: "sonstiges", bezeichnung: "", ausstellungsdatum: "", ablaufdatum: "", notizen: "" });
  const [dokUploading, setDokUploading] = useState(false);

  // Rechte-State
  const [rechteMap, setRechteMap] = useState<Record<string, "erlaubt" | "verweigert" | "standard">>({});
  const [rechteLoaded, setRechteLoaded] = useState(false);

  // Deaktivierungs-Dialog
  const [showDeaktDialog, setShowDeaktDialog] = useState(false);
  const [deaktGrund, setDeaktGrund] = useState("");

  // ─── Queries ───────────────────────────────────────────────────────────────
  const utils = trpc.useUtils();
  const { data: ma, isLoading } = trpc.admin.mitarbeiterDetail.useQuery({ id: mitarbeiterId });
  const { data: mitarbeiterDoks = [] } = (trpc.mitarbeiterakte as any).listDokumente.useQuery({ mitarbeiterId });
  const { data: berechtigungenData = [] } = (trpc.admin as any).getBerechtigungen.useQuery(
    { mitarbeiterId },
    {
      enabled: activeTab === "rechte",
      onSuccess: (data: any[]) => {
        if (!rechteLoaded) {
          const map: Record<string, "erlaubt" | "verweigert" | "standard"> = {};
          data.forEach((b: any) => { map[b.modul] = b.zugriff; });
          setRechteMap(map);
          setRechteLoaded(true);
        }
      },
    }
  );

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const updateStamm = trpc.admin.updateStammdaten.useMutation({
    onSuccess: () => {
      toast.success("Stammdaten gespeichert");
      utils.admin.mitarbeiterDetail.invalidate({ id: mitarbeiterId });
      utils.admin.mitarbeiterList.invalidate();
      setEditStamm(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateZert = trpc.admin.updateZertifikat.useMutation({
    onSuccess: () => {
      toast.success("Zertifikat-Status aktualisiert");
      utils.admin.mitarbeiterDetail.invalidate({ id: mitarbeiterId });
      utils.admin.mitarbeiterList.invalidate();
      setEditZert(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateVertrag = trpc.admin.updateArbeitsvertrag.useMutation({
    onSuccess: () => {
      toast.success("Arbeitsvertrag hinterlegt");
      utils.admin.mitarbeiterDetail.invalidate({ id: mitarbeiterId });
      setUploading(false);
      setUploadFile(null);
    },
    onError: (e) => { toast.error(e.message); setUploading(false); },
  });

  const addDokument = (trpc.admin as any).addDokumentAdmin.useMutation({
    onSuccess: () => {
      toast.success("Dokument hinzugefügt");
      (trpc.mitarbeiterakte as any).listDokumente.invalidate({ mitarbeiterId });
      utils.admin.mitarbeiterDetail.invalidate({ id: mitarbeiterId });
      setShowDokForm(false);
      setDokForm({ typ: "sonstiges", bezeichnung: "", ausstellungsdatum: "", ablaufdatum: "", notizen: "" });
    },
    onError: (e: any) => { toast.error(e.message); setDokUploading(false); },
  });

  const deleteDokument = (trpc.admin as any).deleteDokumentAdmin.useMutation({
    onSuccess: () => {
      toast.success("Dokument gelöscht");
      (trpc.mitarbeiterakte as any).listDokumente.invalidate({ mitarbeiterId });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setBerechtigungen = (trpc.admin as any).setBerechtigungen.useMutation({
    onSuccess: () => {
      toast.success("Berechtigungen gespeichert");
      (trpc.admin as any).getBerechtigungen.invalidate({ mitarbeiterId });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deaktivieren = (trpc.admin as any).mitarbeiterDeaktivieren.useMutation({
    onSuccess: () => {
      toast.success("Mitarbeiter deaktiviert");
      utils.admin.mitarbeiterList.invalidate();
      onBack();
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleFileUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      await updateVertrag.mutateAsync({
        id: mitarbeiterId,
        arbeitsvertragUrl: dataUrl,
        arbeitsvertragDateiname: uploadFile.name,
        arbeitsvertragDatum: new Date().toISOString().split("T")[0],
      });
    };
    reader.readAsDataURL(uploadFile);
  };

  const handleDokFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Datei max. 10 MB"); return; }
    setDokUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      setDokForm(f => ({ ...f, base64, mimeType: file.type, dateiname: file.name }));
      setDokUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDokSave = () => {
    if (!dokForm.bezeichnung.trim()) { toast.error("Bitte Bezeichnung eingeben"); return; }
    addDokument.mutate({ mitarbeiterId, ...dokForm });
  };

  const handleRechteSave = () => {
    const berechtigungen = Object.entries(rechteMap)
      .filter(([, v]) => v !== "standard")
      .map(([modul, zugriff]) => ({ modul, zugriff: zugriff as "erlaubt" | "verweigert" }));
    setBerechtigungen.mutate({ mitarbeiterId, berechtigungen });
  };

  async function exportPersonalbogen(maData: any) {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const lm = 20; let y = 20;
      const field = (label: string, value: string | null | undefined) => {
        doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor("#6b7280");
        doc.text(label.toUpperCase(), lm, y);
        doc.setFont("helvetica", "normal"); doc.setTextColor("#111827");
        doc.text(value || "–", lm + 55, y);
        y += 6;
      };
      const section = (title: string) => {
        y += 4;
        doc.setFillColor(13, 148, 136);
        doc.rect(lm - 2, y - 5, 170, 8, "F");
        doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor("#ffffff");
        doc.text(title, lm, y); y += 8;
      };
      doc.setFillColor(13, 148, 136); doc.rect(0, 0, 210, 28, "F");
      doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.setTextColor("#ffffff");
      doc.text("PERSONALBOGEN", lm, 14);
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      doc.text("Lebenswert Betreuung – Vertraulich", lm, 21);
      doc.setFontSize(9); doc.setTextColor("#ccfbf1");
      doc.text(`Erstellt: ${new Date().toLocaleDateString("de-DE")}`, 150, 21);
      y = 38;
      section("PERSÖNLICHE DATEN");
      field("Name", `${maData.vorname} ${maData.nachname}`);
      field("E-Mail", maData.email);
      field("Telefon", maData.telefon);
      field("Mobil", maData.mobil);
      field("Geburtsdatum", maData.geburtsdatum ? new Date(maData.geburtsdatum).toLocaleDateString("de-DE") : undefined);
      field("Adresse", [maData.strasse, maData.plz, maData.ort].filter(Boolean).join(", "));
      section("BESCHÄFTIGUNG");
      field("Beschäftigungsart", maData.beschaeftigungsart);
      field("Position", maData.position);
      field("Eintrittsdatum", maData.eintrittsdatum ? new Date(maData.eintrittsdatum).toLocaleDateString("de-DE") : undefined);
      section("QUALIFIKATION");
      field("Zertifikat-Status", maData.zertifikatStatus);
      field("Zertifikat-Datum", maData.zertifikatDatum ? new Date(maData.zertifikatDatum).toLocaleDateString("de-DE") : undefined);
      if (mitarbeiterDoks && mitarbeiterDoks.length > 0) {
        if (y > 230) { doc.addPage(); y = 20; }
        section("DOKUMENTE & QUALIFIKATIONSNACHWEISE");
        (mitarbeiterDoks as any[]).forEach((d: any, idx: number) => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor("#111827");
          doc.text(`${idx + 1}. ${d.bezeichnung}`, lm, y); y += 5;
          doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor("#6b7280");
          let info = `Typ: ${DOK_TYP_LABEL[d.typ as DokTyp] ?? d.typ}`;
          if (d.ausstellungsdatum) info += `  |  Ausgestellt: ${new Date(d.ausstellungsdatum).toLocaleDateString("de-DE")}`;
          if (d.ablaufdatum) info += `  |  Ablauf: ${new Date(d.ablaufdatum).toLocaleDateString("de-DE")}`;
          doc.text(info, lm + 4, y); y += 5;
        });
      }
      doc.setFontSize(8); doc.setTextColor("#9ca3af");
      doc.text("Vertraulich – nur für den internen Gebrauch", lm, 285);
      doc.save(`Personalbogen_${maData.vorname}_${maData.nachname}_${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("📄 Personalbogen als PDF heruntergeladen");
    } catch { toast.error("PDF-Export fehlgeschlagen"); }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!ma) return <div className="p-4 text-center text-muted-foreground">Mitarbeiter nicht gefunden</div>;

  const zertStatus = (ma.zertifikatStatus ?? "nicht_angemeldet") as ZertifikatStatus;
  const beschArt = (ma.beschaeftigungsart ?? "minijob") as Beschaeftigungsart;
  const ZertIcon = ZERT_CONFIG[zertStatus].icon;
  const istAktiv = ma.aktiv == null ? true : Number(ma.aktiv) !== 0;

  const TABS: { id: AkteTab; label: string; icon: typeof User }[] = [
    { id: "stamm",     label: "Stammdaten",  icon: User },
    { id: "dokumente", label: "Dokumente",   icon: FolderOpen },
    { id: "zertifikat",label: "Zertifikate", icon: Award },
    { id: "vertrag",   label: "Vertrag",     icon: FileText },
    { id: "rechte",    label: "Rechte",      icon: Shield },
  ];

  return (
    <div className="flex flex-col h-full bg-background">

      {/* ── Header ── */}
      <div className="bg-primary text-white p-4 flex items-center gap-3">
        <button onClick={onBack} className="p-1 rounded-full hover:bg-white/20 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-lg leading-tight truncate">{ma.vorname} {ma.nachname}</h1>
          <p className="text-white/80 text-sm truncate">{ma.position ?? "Mitarbeiter"}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge className={`text-xs border ${BESCHAEFT_CONFIG[beschArt].color}`}>
            {BESCHAEFT_CONFIG[beschArt].label}
          </Badge>
          {!istAktiv && (
            <Badge className="text-xs border bg-gray-200 text-gray-600 border-gray-300">
              ⛔ Inaktiv
            </Badge>
          )}
          {isAdmin && (
            <button
              onClick={() => exportPersonalbogen(ma)}
              className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-2 py-1 rounded-lg transition-colors mt-1"
            >
              <FileDown className="w-3 h-3" /> Personalbogen
            </button>
          )}
        </div>
      </div>

      {/* ── Tab-Navigation ── */}
      <div className="flex border-b bg-white overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 min-w-[64px] flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors whitespace-nowrap px-2 ${
              activeTab === id
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab-Inhalte ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 1: STAMMDATEN
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "stamm" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Persönliche Daten</h2>
              {isAdmin && !editStamm && (
                <Button size="sm" variant="outline" onClick={() => {
                  setStammForm({
                    vorname: ma.vorname, nachname: ma.nachname, email: ma.email,
                    telefon: ma.telefon ?? "", mobil: ma.mobil ?? "",
                    strasse: ma.strasse ?? "", plz: ma.plz ?? "", ort: ma.ort ?? "",
                    geburtsdatum: ma.geburtsdatum ? String(ma.geburtsdatum).split("T")[0] : "",
                    eintrittsdatum: ma.eintrittsdatum ? String(ma.eintrittsdatum).split("T")[0] : "",
                    position: ma.position ?? "", notizen: ma.notizen ?? "",
                    beschaeftigungsart: beschArt,
                  });
                  setEditStamm(true);
                }}>
                  <Edit2 className="w-4 h-4 mr-1" /> Bearbeiten
                </Button>
              )}
              {editStamm && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => updateStamm.mutate({ id: mitarbeiterId, ...stammForm } as any)} disabled={updateStamm.isPending}>
                    <Save className="w-4 h-4 mr-1" /> Speichern
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditStamm(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Beschäftigungsart */}
            <div className="bg-card rounded-xl p-4 border">
              <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Beschäftigungsart</p>
              {editStamm ? (
                <div className="flex gap-2">
                  {(["minijob", "teilzeit", "vollzeit"] as Beschaeftigungsart[]).map((art) => (
                    <button key={art}
                      onClick={() => setStammForm(f => ({ ...f, beschaeftigungsart: art }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        (stammForm.beschaeftigungsart ?? beschArt) === art
                          ? "bg-primary text-white border-primary"
                          : "bg-white text-muted-foreground border-border hover:border-primary"
                      }`}
                    >{BESCHAEFT_CONFIG[art].label}</button>
                  ))}
                </div>
              ) : (
                <Badge className={`border ${BESCHAEFT_CONFIG[beschArt].color}`}>
                  <Briefcase className="w-3 h-3 mr-1" /> {BESCHAEFT_CONFIG[beschArt].label}
                </Badge>
              )}
            </div>

            {/* Kontakt */}
            <div className="bg-card rounded-xl p-4 border space-y-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Kontakt</p>
              {editStamm ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs text-muted-foreground">Vorname</label>
                      <Input value={stammForm.vorname ?? ""} onChange={e => setStammForm(f => ({ ...f, vorname: e.target.value }))} className="mt-1" /></div>
                    <div><label className="text-xs text-muted-foreground">Nachname</label>
                      <Input value={stammForm.nachname ?? ""} onChange={e => setStammForm(f => ({ ...f, nachname: e.target.value }))} className="mt-1" /></div>
                  </div>
                  <div><label className="text-xs text-muted-foreground">E-Mail</label>
                    <Input value={stammForm.email ?? ""} onChange={e => setStammForm(f => ({ ...f, email: e.target.value }))} className="mt-1" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs text-muted-foreground">Telefon</label>
                      <Input value={stammForm.telefon ?? ""} onChange={e => setStammForm(f => ({ ...f, telefon: e.target.value }))} className="mt-1" /></div>
                    <div><label className="text-xs text-muted-foreground">Mobil</label>
                      <Input value={stammForm.mobil ?? ""} onChange={e => setStammForm(f => ({ ...f, mobil: e.target.value }))} className="mt-1" /></div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-primary" />
                    <span>{ma.telefon ?? "—"}</span>{ma.mobil && <span className="text-muted-foreground">· {ma.mobil}</span>}</div>
                  <div className="flex items-center gap-2 text-sm"><User className="w-4 h-4 text-primary" /><span>{ma.email}</span></div>
                </>
              )}
            </div>

            {/* Adresse */}
            <div className="bg-card rounded-xl p-4 border space-y-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Adresse</p>
              {editStamm ? (
                <>
                  <div><label className="text-xs text-muted-foreground">Straße</label>
                    <Input value={stammForm.strasse ?? ""} onChange={e => setStammForm(f => ({ ...f, strasse: e.target.value }))} className="mt-1" /></div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><label className="text-xs text-muted-foreground">PLZ</label>
                      <Input value={stammForm.plz ?? ""} onChange={e => setStammForm(f => ({ ...f, plz: e.target.value }))} className="mt-1" /></div>
                    <div className="col-span-2"><label className="text-xs text-muted-foreground">Ort</label>
                      <Input value={stammForm.ort ?? ""} onChange={e => setStammForm(f => ({ ...f, ort: e.target.value }))} className="mt-1" /></div>
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-2 text-sm"><MapPin className="w-4 h-4 text-primary mt-0.5" />
                  <div>{ma.strasse ? <><p>{ma.strasse}</p><p>{ma.plz} {ma.ort}</p></> : <span className="text-muted-foreground">Keine Adresse hinterlegt</span>}</div>
                </div>
              )}
            </div>

            {/* Beschäftigung */}
            <div className="bg-card rounded-xl p-4 border space-y-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Beschäftigung</p>
              {editStamm ? (
                <>
                  <div><label className="text-xs text-muted-foreground">Position</label>
                    <Input value={stammForm.position ?? ""} onChange={e => setStammForm(f => ({ ...f, position: e.target.value }))} className="mt-1" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs text-muted-foreground">Geburtsdatum</label>
                      <Input type="date" value={stammForm.geburtsdatum ?? ""} onChange={e => setStammForm(f => ({ ...f, geburtsdatum: e.target.value }))} className="mt-1" /></div>
                    <div><label className="text-xs text-muted-foreground">Eintrittsdatum</label>
                      <Input type="date" value={stammForm.eintrittsdatum ?? ""} onChange={e => setStammForm(f => ({ ...f, eintrittsdatum: e.target.value }))} className="mt-1" /></div>
                  </div>
                  <div><label className="text-xs text-muted-foreground">Notizen</label>
                    <textarea value={stammForm.notizen ?? ""} onChange={e => setStammForm(f => ({ ...f, notizen: e.target.value }))}
                      className="w-full mt-1 p-2 border rounded-lg text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-primary" /></div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm"><Briefcase className="w-4 h-4 text-primary" /><span>{ma.position ?? "—"}</span></div>
                  <div className="flex items-center gap-2 text-sm"><Calendar className="w-4 h-4 text-primary" />
                    <span>Eintritt: {ma.eintrittsdatum ? new Date(ma.eintrittsdatum).toLocaleDateString("de-DE") : "—"}</span></div>
                  {ma.geburtsdatum && <div className="flex items-center gap-2 text-sm"><Calendar className="w-4 h-4 text-primary" />
                    <span>Geb.: {new Date(ma.geburtsdatum).toLocaleDateString("de-DE")}</span></div>}
                  {ma.notizen && <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-2 mt-2">{ma.notizen}</div>}
                </>
              )}
            </div>

            {/* Dienstwagen */}
            <DienstwagenCard mitarbeiterId={mitarbeiterId} ma={ma} />

            {/* Mitarbeiter deaktivieren (nur Admin) */}
            {isAdmin && istAktiv && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-red-700 flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4" /> Mitarbeiter deaktivieren
                </p>
                <p className="text-xs text-red-600 mb-3">
                  Deaktivierte Mitarbeiter können sich nicht mehr einloggen. Alle Daten bleiben erhalten (Soft-Delete).
                </p>
                {!showDeaktDialog ? (
                  <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-100" onClick={() => setShowDeaktDialog(true)}>
                    <XCircle className="w-4 h-4 mr-1" /> Mitarbeiter deaktivieren
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Input
                      placeholder="Grund der Deaktivierung (Pflichtfeld)"
                      value={deaktGrund}
                      onChange={e => setDeaktGrund(e.target.value)}
                      className="border-red-300 focus:ring-red-400"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white"
                        disabled={deaktGrund.length < 3 || deaktivieren.isPending}
                        onClick={() => deaktivieren.mutate({ id: mitarbeiterId, grund: deaktGrund })}>
                        Endgültig deaktivieren
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setShowDeaktDialog(false); setDeaktGrund(""); }}>
                        Abbrechen
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 2: DOKUMENTE
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "dokumente" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Dokumente & Nachweise</h2>
              {isAdmin && (
                <Button size="sm" onClick={() => setShowDokForm(v => !v)}>
                  <Plus className="w-4 h-4 mr-1" /> Hinzufügen
                </Button>
              )}
            </div>

            {/* Dokument-Formular */}
            {showDokForm && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-blue-800">Neues Dokument hinzufügen</p>
                <div>
                  <label className="text-xs text-muted-foreground">Dokumenttyp</label>
                  <select
                    value={dokForm.typ}
                    onChange={e => setDokForm(f => ({ ...f, typ: e.target.value as DokTyp }))}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  >
                    {(Object.keys(DOK_TYP_LABEL) as DokTyp[]).map(t => (
                      <option key={t} value={t}>{DOK_TYP_LABEL[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Bezeichnung *</label>
                  <Input value={dokForm.bezeichnung} onChange={e => setDokForm(f => ({ ...f, bezeichnung: e.target.value }))} placeholder="z.B. Erste-Hilfe-Kurs 2024" className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-xs text-muted-foreground">Ausstellungsdatum</label>
                    <Input type="date" value={dokForm.ausstellungsdatum} onChange={e => setDokForm(f => ({ ...f, ausstellungsdatum: e.target.value }))} className="mt-1" /></div>
                  <div><label className="text-xs text-muted-foreground">Ablaufdatum</label>
                    <Input type="date" value={dokForm.ablaufdatum} onChange={e => setDokForm(f => ({ ...f, ablaufdatum: e.target.value }))} className="mt-1" /></div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Notizen</label>
                  <textarea value={dokForm.notizen} onChange={e => setDokForm(f => ({ ...f, notizen: e.target.value }))}
                    className="w-full mt-1 p-2 border rounded-lg text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Datei hochladen (optional, max. 10 MB)</label>
                  <div className="mt-1 flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer bg-white border rounded-lg px-3 py-2 text-sm hover:bg-gray-50 transition-colors">
                      <Upload className="w-4 h-4 text-primary" />
                      {dokForm.dateiname ? dokForm.dateiname : "Datei auswählen"}
                      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleDokFileSelect} />
                    </label>
                    {dokUploading && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleDokSave} disabled={addDokument.isPending || dokUploading}>
                    <Save className="w-4 h-4 mr-1" /> Speichern
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowDokForm(false)}>
                    Abbrechen
                  </Button>
                </div>
              </div>
            )}

            {/* Dokument-Liste gruppiert nach Typ */}
            {(Object.keys(DOK_TYP_LABEL) as DokTyp[]).map(typ => {
              const doks = (mitarbeiterDoks as any[]).filter((d: any) => d.typ === typ);
              if (doks.length === 0) return null;
              return (
                <div key={typ} className="bg-card rounded-xl border overflow-hidden">
                  <div className={`px-4 py-2 flex items-center gap-2 ${DOK_TYP_FARBE[typ]}`}>
                    <FileText className="w-4 h-4" />
                    <span className="text-sm font-semibold">{DOK_TYP_LABEL[typ]}</span>
                    <Badge className="ml-auto text-xs bg-white/60 text-gray-700">{doks.length}</Badge>
                  </div>
                  <div className="divide-y">
                    {doks.map((d: any) => {
                      const abgelaufen = d.ablaufdatum && new Date(d.ablaufdatum) < new Date();
                      const bald = d.ablaufdatum && !abgelaufen && new Date(d.ablaufdatum) < new Date(Date.now() + 30 * 86400000);
                      return (
                        <div key={d.id} className="px-4 py-3 flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{d.bezeichnung}</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {d.ausstellungsdatum && (
                                <span className="text-xs text-muted-foreground">
                                  Ausgestellt: {new Date(d.ausstellungsdatum).toLocaleDateString("de-DE")}
                                </span>
                              )}
                              {d.ablaufdatum && (
                                <span className={`text-xs font-medium ${abgelaufen ? "text-red-600" : bald ? "text-orange-600" : "text-green-600"}`}>
                                  {abgelaufen ? "⛔ Abgelaufen" : bald ? "⚠️ Läuft bald ab" : "✅ Gültig bis"}: {new Date(d.ablaufdatum).toLocaleDateString("de-DE")}
                                </span>
                              )}
                            </div>
                            {d.notizen && <p className="text-xs text-muted-foreground mt-1 italic">{d.notizen}</p>}
                            {d.dateiUrl && (
                              <a href={d.dateiUrl} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                                <FileDown className="w-3 h-3" /> {d.dateiname ?? "Datei öffnen"}
                              </a>
                            )}
                          </div>
                          {isAdmin && (
                            <button onClick={() => { if (confirm("Dokument wirklich löschen?")) deleteDokument.mutate({ id: d.id }); }}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors shrink-0">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {(mitarbeiterDoks as any[]).length === 0 && !showDokForm && (
              <div className="text-center py-12 text-muted-foreground">
                <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Noch keine Dokumente hinterlegt</p>
                {isAdmin && <p className="text-xs mt-1">Klicke auf „Hinzufügen" um das erste Dokument hochzuladen</p>}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 3: ZERTIFIKATE
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "zertifikat" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Schulungen & Zertifikate</h2>
              {isAdmin && !editZert && (
                <Button size="sm" variant="outline" onClick={() => {
                  setZertForm({
                    zertifikatStatus: zertStatus,
                    zertifikatDatum: ma.zertifikatDatum ? String(ma.zertifikatDatum).split("T")[0] : "",
                    zertifikatAblauf: ma.zertifikatAblauf ? String(ma.zertifikatAblauf).split("T")[0] : "",
                    zertifikatBemerkung: ma.zertifikatBemerkung ?? "",
                  });
                  setEditZert(true);
                }}>
                  <Edit2 className="w-4 h-4 mr-1" /> Bearbeiten
                </Button>
              )}
              {editZert && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => updateZert.mutate({ id: mitarbeiterId, ...zertForm })} disabled={updateZert.isPending}>
                    <Save className="w-4 h-4 mr-1" /> Speichern
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditZert(false)}><X className="w-4 h-4" /></Button>
                </div>
              )}
            </div>

            <div className={`rounded-xl p-4 border-2 ${
              zertStatus === "erhalten" ? "bg-green-50 border-green-200" :
              zertStatus === "angemeldet" ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200"
            }`}>
              <div className="flex items-center gap-3">
                <ZertIcon className={`w-8 h-8 ${
                  zertStatus === "erhalten" ? "text-green-600" :
                  zertStatus === "angemeldet" ? "text-yellow-600" : "text-red-600"
                }`} />
                <div>
                  <p className="font-semibold text-foreground">{ZERT_CONFIG[zertStatus].label}</p>
                  <p className="text-sm text-muted-foreground">
                    {zertStatus === "erhalten" ? "Schulung erfolgreich abgeschlossen" :
                     zertStatus === "angemeldet" ? "Schulungstermin ist gebucht" : "Bitte Schulung einplanen"}
                  </p>
                </div>
              </div>
            </div>

            {editZert ? (
              <div className="bg-card rounded-xl p-4 border space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-2">Zertifikat-Status</p>
                  <div className="space-y-2">
                    {(["erhalten", "angemeldet", "nicht_angemeldet"] as ZertifikatStatus[]).map((s) => {
                      const Ic = ZERT_CONFIG[s].icon;
                      return (
                        <button key={s} onClick={() => setZertForm(f => ({ ...f, zertifikatStatus: s }))}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                            zertForm.zertifikatStatus === s ? "bg-primary text-white border-primary" : "bg-white text-foreground border-border hover:border-primary"
                          }`}>
                          <Ic className="w-4 h-4" />
                          <span className="text-sm font-medium">{ZERT_CONFIG[s].label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-muted-foreground">Zertifikat-Datum</label>
                    <Input type="date" value={zertForm.zertifikatDatum} onChange={e => setZertForm(f => ({ ...f, zertifikatDatum: e.target.value }))} className="mt-1" /></div>
                  <div><label className="text-xs text-muted-foreground">Ablauf-Datum</label>
                    <Input type="date" value={zertForm.zertifikatAblauf} onChange={e => setZertForm(f => ({ ...f, zertifikatAblauf: e.target.value }))} className="mt-1" /></div>
                </div>
                <div><label className="text-xs text-muted-foreground">Bemerkung</label>
                  <textarea value={zertForm.zertifikatBemerkung} onChange={e => setZertForm(f => ({ ...f, zertifikatBemerkung: e.target.value }))}
                    className="w-full mt-1 p-2 border rounded-lg text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="z.B. Schulungsanbieter, Kurs-Nummer..." /></div>
              </div>
            ) : (
              <div className="bg-card rounded-xl p-4 border space-y-3">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Details</p>
                <div className="flex items-center gap-2 text-sm"><Calendar className="w-4 h-4 text-primary" />
                  <span>Zertifikat-Datum: {ma.zertifikatDatum ? new Date(ma.zertifikatDatum).toLocaleDateString("de-DE") : "—"}</span></div>
                <div className="flex items-center gap-2 text-sm"><Calendar className="w-4 h-4 text-primary" />
                  <span>Ablauf: {ma.zertifikatAblauf ? new Date(ma.zertifikatAblauf).toLocaleDateString("de-DE") : "—"}</span></div>
                {ma.zertifikatBemerkung && <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-2">{ma.zertifikatBemerkung}</div>}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 4: ANSTELLUNGSVERHÄLTNIS / ARBEITSVERTRAG
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "vertrag" && (
          <div className="space-y-4">
            <h2 className="font-semibold text-foreground">Anstellungsverhältnis & Arbeitsvertrag</h2>

            {/* Anstellungsdaten-Übersicht */}
            <div className="bg-card rounded-xl p-4 border space-y-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Anstellungsdaten</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Beschäftigungsart</p>
                  <p className="text-sm font-semibold mt-1">{BESCHAEFT_CONFIG[beschArt].label}</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Eintrittsdatum</p>
                  <p className="text-sm font-semibold mt-1">{ma.eintrittsdatum ? new Date(ma.eintrittsdatum).toLocaleDateString("de-DE") : "—"}</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Position</p>
                  <p className="text-sm font-semibold mt-1">{ma.position ?? "—"}</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className={`text-sm font-semibold mt-1 ${istAktiv ? "text-green-600" : "text-red-600"}`}>
                    {istAktiv ? "✅ Aktiv" : "⛔ Inaktiv"}
                  </p>
                </div>
              </div>
            </div>

            {/* Arbeitsvertrag-Datei */}
            {ma.arbeitsvertragUrl ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-foreground">{ma.arbeitsvertragDateiname ?? "Arbeitsvertrag.pdf"}</p>
                    <p className="text-xs text-muted-foreground">
                      Hinterlegt am: {ma.arbeitsvertragDatum ? new Date(ma.arbeitsvertragDatum).toLocaleDateString("de-DE") : "—"}
                    </p>
                  </div>
                  <Badge className="bg-green-100 text-green-800 border-green-200 border text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" /> Vorhanden
                  </Badge>
                </div>
                {ma.arbeitsvertragUrl.startsWith("data:") && (
                  <a href={ma.arbeitsvertragUrl} download={ma.arbeitsvertragDateiname ?? "Arbeitsvertrag.pdf"}
                    className="mt-3 flex items-center gap-2 text-sm text-primary hover:underline">
                    <FileText className="w-4 h-4" /> Vertrag herunterladen
                  </a>
                )}
              </div>
            ) : (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
                <XCircle className="w-6 h-6 text-orange-500" />
                <div>
                  <p className="font-medium text-sm text-foreground">Kein Arbeitsvertrag hinterlegt</p>
                  <p className="text-xs text-muted-foreground">Bitte Vertrag hochladen</p>
                </div>
              </div>
            )}

            {/* Upload-Bereich */}
            {isAdmin && (
              <div className="bg-card rounded-xl p-4 border space-y-3">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  {ma.arbeitsvertragUrl ? "Vertrag ersetzen" : "Vertrag hochladen"}
                </p>
                <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  uploadFile ? "border-primary bg-primary/5" : "border-border hover:border-primary hover:bg-primary/5"
                }`}>
                  <Upload className={`w-6 h-6 mb-2 ${uploadFile ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-sm font-medium text-foreground">
                    {uploadFile ? uploadFile.name : "PDF oder Bild auswählen"}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG – max. 10 MB</span>
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e => setUploadFile(e.target.files?.[0] ?? null)} />
                </label>
                {uploadFile && (
                  <Button onClick={handleFileUpload} disabled={uploading} className="w-full">
                    {uploading ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Wird hochgeladen...</>
                    ) : (
                      <><Upload className="w-4 h-4 mr-2" /> Vertrag speichern</>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 5: ROLLENRECHTE
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "rechte" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-foreground">Rollenrechte & Berechtigungen</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Systemrolle: <strong>{ma.rolle ?? "mitarbeiter"}</strong></p>
              </div>
              {isAdmin && (
                <Button size="sm" onClick={handleRechteSave} disabled={setBerechtigungen.isPending}>
                  <Save className="w-4 h-4 mr-1" /> Speichern
                </Button>
              )}
            </div>

            {/* Systemrolle ändern */}
            {isAdmin && (
              <div className="bg-card rounded-xl p-4 border space-y-3">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Systemrolle</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["mitarbeiter", "teamleitung", "buchhaltung", "admin"] as const).map((rolle) => (
                    <button key={rolle}
                      onClick={() => updateStamm.mutate({ id: mitarbeiterId, rolle } as any)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                        ma.rolle === rolle ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:border-primary"
                      }`}>
                      {rolle === "mitarbeiter" ? "👤 Mitarbeiter" :
                       rolle === "teamleitung" ? "👥 Teamleitung" :
                       rolle === "buchhaltung" ? "💼 Buchhaltung" : "🔑 Admin"}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Die Systemrolle bestimmt den Standard-Zugriff. Modulrechte unten überschreiben die Systemrolle.
                </p>
              </div>
            )}

            {/* Modul-Berechtigungen */}
            <div className="bg-card rounded-xl border overflow-hidden">
              <div className="bg-muted/50 px-4 py-2 border-b">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Modul-Berechtigungen (individuelle Ausnahmen)</p>
              </div>
              <div className="divide-y">
                {ALLE_MODULE.map(({ key, label }) => {
                  const recht = rechteMap[key] ?? "standard";
                  return (
                    <div key={key} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2">
                        {recht === "erlaubt" ? <Unlock className="w-4 h-4 text-green-600" /> :
                         recht === "verweigert" ? <Lock className="w-4 h-4 text-red-500" /> :
                         <Shield className="w-4 h-4 text-muted-foreground" />}
                        <span className="text-sm text-foreground">{label}</span>
                      </div>
                      {isAdmin ? (
                        <div className="flex gap-1">
                          {(["standard", "erlaubt", "verweigert"] as const).map((v) => (
                            <button key={v}
                              onClick={() => setRechteMap(m => ({ ...m, [key]: v }))}
                              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                recht === v
                                  ? v === "erlaubt" ? "bg-green-600 text-white" :
                                    v === "verweigert" ? "bg-red-600 text-white" :
                                    "bg-gray-500 text-white"
                                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                              }`}>
                              {v === "standard" ? "Standard" : v === "erlaubt" ? "✅ Erlaubt" : "🚫 Gesperrt"}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <Badge className={`text-xs ${
                          recht === "erlaubt" ? "bg-green-100 text-green-800" :
                          recht === "verweigert" ? "bg-red-100 text-red-800" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {recht === "erlaubt" ? "Erlaubt" : recht === "verweigert" ? "Gesperrt" : "Standard"}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legende */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-1">
              <p className="text-xs font-semibold text-blue-800">Legende</p>
              <p className="text-xs text-blue-700">🔘 <strong>Standard</strong> – Zugriff gemäß Systemrolle</p>
              <p className="text-xs text-blue-700">✅ <strong>Erlaubt</strong> – Zugriff immer gewährt (überschreibt Rolle)</p>
              <p className="text-xs text-blue-700">🚫 <strong>Gesperrt</strong> – Zugriff immer verweigert (überschreibt Rolle)</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
