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
type AkteTab = "stamm" | "dokumente" | "zertifikat" | "vertrag" | "rechte" | "urlaubkrank" | "erstehilfe";
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

  // Urlaub/Krank Admin-States
  const [showUrlaubForm, setShowUrlaubForm] = useState(false);
  const [urlaubForm, setUrlaubForm] = useState({ von: "", bis: "", tage: 1, notizen: "", status: "genehmigt" as "beantragt" | "genehmigt" | "abgelehnt", keineVertretung: false });
  const [showKrankForm, setShowKrankForm] = useState(false);
  const [krankForm, setKrankForm] = useState({ von: "", bis: "", tage: 1, notizen: "", auAttest: false });
  // Erste-Hilfe States
  const [ehShowForm, setEhShowForm] = useState(false);
  const [ehForm, setEhForm] = useState({ kursName: 'Erste-Hilfe-Kurs', kursAnbieter: '', kursDatum: '', ablaufDatum: '', status: 'bestanden' as 'bestanden'|'angemeldet'|'abgelaufen', bemerkung: '' });
  const [ehFoto, setEhFoto] = useState<{ base64: string; mime: string } | null>(null);

  // ─── Queries ───────────────────────────────────────────────────────────────
  const utils = trpc.useUtils();
  const { data: ma, isLoading } = trpc.admin.mitarbeiterDetail.useQuery({ id: mitarbeiterId });
  const { data: urlaubListe = [] } = (trpc as any).urlaubAdmin.listByMitarbeiter.useQuery(
    { mitarbeiterId },
    { enabled: activeTab === "urlaubkrank" }
  );
  const { data: urlaubsKonto } = (trpc as any).urlaubAdmin.urlaubsKonto.useQuery(
    { mitarbeiterId },
    { enabled: activeTab === "urlaubkrank" }
  );
  const { data: krankListe = [] } = (trpc as any).krankAdmin.listByMitarbeiter.useQuery(
    { mitarbeiterId },
    { enabled: activeTab === "urlaubkrank" }
  );
  // Erste-Hilfe Queries
  const { data: ersteHilfeList = [], refetch: refetchEH } = (trpc as any).ersteHilfe.listByMitarbeiter.useQuery(
    { mitarbeiterId },
    { enabled: activeTab === "erstehilfe" }
  );
  const ersteHilfeCreate = (trpc as any).ersteHilfe.create.useMutation({
    onSuccess: () => { toast.success('✅ Erste-Hilfe-Kurs gespeichert'); refetchEH(); setEhShowForm(false); setEhForm({ kursName: 'Erste-Hilfe-Kurs', kursAnbieter: '', kursDatum: '', ablaufDatum: '', status: 'bestanden', bemerkung: '' }); setEhFoto(null); },
    onError: (e: any) => toast.error('❌ ' + e.message),
  });
  const ersteHilfeDelete = (trpc as any).ersteHilfe.delete.useMutation({
    onSuccess: () => { toast.success('Eintrag gelöscht'); refetchEH(); },
    onError: (e: any) => toast.error('❌ ' + e.message),
  });
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

  const urlaubCreate = (trpc as any).urlaubAdmin.create.useMutation({
    onSuccess: () => {
      toast.success("Urlaubsantrag gespeichert");
      (trpc as any).urlaubAdmin.listByMitarbeiter.invalidate({ mitarbeiterId });
      setShowUrlaubForm(false);
      setUrlaubForm({ von: "", bis: "", tage: 1, notizen: "", status: "genehmigt", keineVertretung: false });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const urlaubUpdateStatus = (trpc as any).urlaubAdmin.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status aktualisiert");
      (trpc as any).urlaubAdmin.listByMitarbeiter.invalidate({ mitarbeiterId });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const urlaubDelete = (trpc as any).urlaubAdmin.delete.useMutation({
    onSuccess: () => {
      toast.success("Urlaubsantrag gelöscht");
      (trpc as any).urlaubAdmin.listByMitarbeiter.invalidate({ mitarbeiterId });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const krankCreate = (trpc as any).krankAdmin.create.useMutation({
    onSuccess: () => {
      toast.success("Krankmeldung gespeichert");
      (trpc as any).krankAdmin.listByMitarbeiter.invalidate({ mitarbeiterId });
      setShowKrankForm(false);
      setKrankForm({ von: "", bis: "", tage: 1, notizen: "", auAttest: false });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const krankDelete = (trpc as any).krankAdmin.delete.useMutation({
    onSuccess: () => {
      toast.success("Krankmeldung gelöscht");
      (trpc as any).krankAdmin.listByMitarbeiter.invalidate({ mitarbeiterId });
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
    { id: "urlaubkrank", label: "Urlaub/Krank", icon: Calendar },
    { id: "erstehilfe", label: "Erste Hilfe", icon: Award },
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
                    wochenstunden: String((ma as any).wochenstunden ?? ""),
                    monatslohn: String((ma as any).monatslohn ?? ""),
                    stundenlohn: String((ma as any).stundenlohn ?? ""),
                    zuschlaege: (ma as any).zuschlaege ?? "",
                    probezeit: String((ma as any).probezeit ?? ""),
                    probeEnde: (ma as any).probeEnde ? String((ma as any).probeEnde).split("T")[0] : "",
                    kuendigungsfrist: String((ma as any).kuendigungsfrist ?? ""),
                    arbeitszeitmodell: (ma as any).arbeitszeitmodell ?? "",
                    sozialversicherungsnummer: (ma as any).sozialversicherungsnummer ?? "",
                    steuerklasse: String((ma as any).steuerklasse ?? ""),
                    steueridentnummer: (ma as any).steueridentnummer ?? "",
                    iban: (ma as any).iban ?? "",
                    bic: (ma as any).bic ?? "",
                    bankname: (ma as any).bankname ?? "",
                    krankenkasse: (ma as any).krankenkasse ?? "",
                    krankenversicherungsart: (ma as any).krankenversicherungsart ?? "",
                    notfallkontaktName: (ma as any).notfallkontaktName ?? "",
                    notfallkontaktTelefon: (ma as any).notfallkontaktTelefon ?? "",
                    notfallkontaktBeziehung: (ma as any).notfallkontaktBeziehung ?? "",
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
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs text-muted-foreground">Wochenstunden</label>
                      <Input type="number" step="0.5" value={stammForm.wochenstunden ?? ""} onChange={e => setStammForm(f => ({ ...f, wochenstunden: e.target.value }))} className="mt-1" placeholder="z.B. 20" /></div>
                    <div><label className="text-xs text-muted-foreground">Arbeitszeitmodell</label>
                      <select value={stammForm.arbeitszeitmodell ?? ""} onChange={e => setStammForm(f => ({ ...f, arbeitszeitmodell: e.target.value }))}
                        className="w-full mt-1 p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                        <option value="">— wählen —</option>
                        <option value="flexibel">Flexibel</option>
                        <option value="fest">Feste Arbeitszeiten</option>
                        <option value="schicht">Schichtdienst</option>
                      </select></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs text-muted-foreground">Probezeit (Monate)</label>
                      <Input type="number" value={stammForm.probezeit ?? ""} onChange={e => setStammForm(f => ({ ...f, probezeit: e.target.value }))} className="mt-1" placeholder="z.B. 6" /></div>
                    <div><label className="text-xs text-muted-foreground">Probezeit-Ende</label>
                      <Input type="date" value={stammForm.probeEnde ?? ""} onChange={e => setStammForm(f => ({ ...f, probeEnde: e.target.value }))} className="mt-1" /></div>
                  </div>
                  <div><label className="text-xs text-muted-foreground">Kündigungsfrist (Tage)</label>
                    <Input type="number" value={stammForm.kuendigungsfrist ?? ""} onChange={e => setStammForm(f => ({ ...f, kuendigungsfrist: e.target.value }))} className="mt-1" placeholder="z.B. 30" /></div>
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
                  {(ma as any).wochenstunden && <div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">⏱</span><span>{(ma as any).wochenstunden} Std./Woche · {(ma as any).arbeitszeitmodell ?? "—"}</span></div>}
                  {(ma as any).probeEnde && <div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">📋</span><span>Probezeit bis: {new Date((ma as any).probeEnde).toLocaleDateString("de-DE")}</span></div>}
                  {(ma as any).kuendigungsfrist && <div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">📄</span><span>Kündigungsfrist: {(ma as any).kuendigungsfrist} Tage</span></div>}
                  {ma.notizen && <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-2 mt-2">{ma.notizen}</div>}
                </>
              )}
            </div>

            {/* Vergütung */}
            {isAdmin && (
            <div className="bg-card rounded-xl p-4 border space-y-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">💶 Vergütung</p>
              {editStamm ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs text-muted-foreground">Monatslohn (€)</label>
                      <Input type="number" step="0.01" value={stammForm.monatslohn ?? ""} onChange={e => setStammForm(f => ({ ...f, monatslohn: e.target.value }))} className="mt-1" placeholder="z.B. 1200.00" /></div>
                    <div><label className="text-xs text-muted-foreground">Stundenlohn (€)</label>
                      <Input type="number" step="0.01" value={stammForm.stundenlohn ?? ""} onChange={e => setStammForm(f => ({ ...f, stundenlohn: e.target.value }))} className="mt-1" placeholder="z.B. 14.50" /></div>
                  </div>
                  <div><label className="text-xs text-muted-foreground">Zuschläge / Sonderzahlungen</label>
                    <Input value={stammForm.zuschlaege ?? ""} onChange={e => setStammForm(f => ({ ...f, zuschlaege: e.target.value }))} className="mt-1" placeholder="z.B. Weihnachtsgeld, Nachtschichtzuschlag" /></div>
                </>
              ) : (
                <>
                  {(ma as any).monatslohn ? <div className="text-sm">💰 Monatslohn: <strong>{Number((ma as any).monatslohn).toFixed(2)} €</strong></div> : null}
                  {(ma as any).stundenlohn ? <div className="text-sm">⏱ Stundenlohn: <strong>{Number((ma as any).stundenlohn).toFixed(2)} €</strong></div> : null}
                  {(ma as any).zuschlaege ? <div className="text-sm text-muted-foreground">{(ma as any).zuschlaege}</div> : null}
                  {!(ma as any).monatslohn && !(ma as any).stundenlohn && <div className="text-sm text-muted-foreground">Keine Vergütungsdaten hinterlegt</div>}
                </>
              )}
            </div>
            )}

            {/* Sozialversicherung & Steuer */}
            {isAdmin && (
            <div className="bg-card rounded-xl p-4 border space-y-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">🏛 Sozialversicherung & Steuer</p>
              {editStamm ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs text-muted-foreground">SV-Nummer</label>
                      <Input value={stammForm.sozialversicherungsnummer ?? ""} onChange={e => setStammForm(f => ({ ...f, sozialversicherungsnummer: e.target.value }))} className="mt-1" placeholder="12 345678 A 123" /></div>
                    <div><label className="text-xs text-muted-foreground">Steuerklasse</label>
                      <select value={stammForm.steuerklasse ?? ""} onChange={e => setStammForm(f => ({ ...f, steuerklasse: e.target.value }))}
                        className="w-full mt-1 p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                        <option value="">—</option>
                        {[1,2,3,4,5,6].map(k => <option key={k} value={k}>{k}</option>)}
                      </select></div>
                  </div>
                  <div><label className="text-xs text-muted-foreground">Steueridentnummer</label>
                    <Input value={stammForm.steueridentnummer ?? ""} onChange={e => setStammForm(f => ({ ...f, steueridentnummer: e.target.value }))} className="mt-1" placeholder="12 345 678 901" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs text-muted-foreground">Krankenkasse</label>
                      <Input value={stammForm.krankenkasse ?? ""} onChange={e => setStammForm(f => ({ ...f, krankenkasse: e.target.value }))} className="mt-1" placeholder="z.B. AOK Bayern" /></div>
                    <div><label className="text-xs text-muted-foreground">KV-Art</label>
                      <select value={stammForm.krankenversicherungsart ?? ""} onChange={e => setStammForm(f => ({ ...f, krankenversicherungsart: e.target.value }))}
                        className="w-full mt-1 p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                        <option value="">—</option>
                        <option value="gesetzlich">Gesetzlich</option>
                        <option value="privat">Privat</option>
                      </select></div>
                  </div>
                </>
              ) : (
                <>
                  {(ma as any).sozialversicherungsnummer && <div className="text-sm">SV-Nr.: {(ma as any).sozialversicherungsnummer}</div>}
                  {(ma as any).steuerklasse && <div className="text-sm">Steuerklasse {(ma as any).steuerklasse} · {(ma as any).steueridentnummer ?? "—"}</div>}
                  {(ma as any).krankenkasse && <div className="text-sm">{(ma as any).krankenkasse} ({(ma as any).krankenversicherungsart ?? "—"})</div>}
                  {!(ma as any).sozialversicherungsnummer && !(ma as any).steuerklasse && <div className="text-sm text-muted-foreground">Keine SV/Steuer-Daten hinterlegt</div>}
                </>
              )}
            </div>
            )}

            {/* Bankverbindung */}
            {isAdmin && (
            <div className="bg-card rounded-xl p-4 border space-y-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">🏦 Bankverbindung</p>
              {editStamm ? (
                <>
                  <div><label className="text-xs text-muted-foreground">IBAN</label>
                    <Input value={stammForm.iban ?? ""} onChange={e => setStammForm(f => ({ ...f, iban: e.target.value }))} className="mt-1" placeholder="DE89 3704 0044 0532 0130 00" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs text-muted-foreground">BIC</label>
                      <Input value={stammForm.bic ?? ""} onChange={e => setStammForm(f => ({ ...f, bic: e.target.value }))} className="mt-1" placeholder="COBADEFFXXX" /></div>
                    <div><label className="text-xs text-muted-foreground">Bank</label>
                      <Input value={stammForm.bankname ?? ""} onChange={e => setStammForm(f => ({ ...f, bankname: e.target.value }))} className="mt-1" placeholder="z.B. Commerzbank" /></div>
                  </div>
                </>
              ) : (
                <>
                  {(ma as any).iban ? <div className="text-sm font-mono">IBAN: {(ma as any).iban}</div> : null}
                  {(ma as any).bankname ? <div className="text-sm text-muted-foreground">{(ma as any).bankname} · BIC: {(ma as any).bic ?? "—"}</div> : null}
                  {!(ma as any).iban && <div className="text-sm text-muted-foreground">Keine Bankverbindung hinterlegt</div>}
                </>
              )}
            </div>
            )}

            {/* Notfallkontakt */}
            <div className="bg-card rounded-xl p-4 border space-y-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">🚨 Notfallkontakt</p>
              {editStamm ? (
                <>
                  <div><label className="text-xs text-muted-foreground">Name</label>
                    <Input value={stammForm.notfallkontaktName ?? ""} onChange={e => setStammForm(f => ({ ...f, notfallkontaktName: e.target.value }))} className="mt-1" placeholder="z.B. Maria Mustermann" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs text-muted-foreground">Telefon</label>
                      <Input value={stammForm.notfallkontaktTelefon ?? ""} onChange={e => setStammForm(f => ({ ...f, notfallkontaktTelefon: e.target.value }))} className="mt-1" placeholder="+49 123 456789" /></div>
                    <div><label className="text-xs text-muted-foreground">Beziehung</label>
                      <Input value={stammForm.notfallkontaktBeziehung ?? ""} onChange={e => setStammForm(f => ({ ...f, notfallkontaktBeziehung: e.target.value }))} className="mt-1" placeholder="z.B. Ehepartner" /></div>
                  </div>
                </>
              ) : (
                <>
                  {(ma as any).notfallkontaktName ? (
                    <div className="space-y-1">
                      <div className="text-sm font-medium">{(ma as any).notfallkontaktName} <span className="text-muted-foreground font-normal">({(ma as any).notfallkontaktBeziehung ?? "—"})</span></div>
                      <div className="text-sm text-muted-foreground">📞 {(ma as any).notfallkontaktTelefon ?? "—"}</div>
                    </div>
                  ) : <div className="text-sm text-muted-foreground">Kein Notfallkontakt hinterlegt</div>}
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

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 6: URLAUB & KRANKMELDUNGEN (ADMIN)
        ═══════════════════════════════════════════════════════════════════ */}
                {activeTab === "urlaubkrank" && (
          <div className="space-y-6">
            {/* ── URLAUBSKONTO ── */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Jahresurlaubskonto {new Date().getFullYear()}
                </h3>
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-blue-700">Jahresanspruch:</label>
                    <input
                      type="number" min={0} max={365}
                      defaultValue={urlaubsKonto?.urlaubstageJahr ?? (ma as any)?.urlaubstageJahr ?? 24}
                      onBlur={(e) => updateStamm.mutate({ id: mitarbeiterId, urlaubstageJahr: Number(e.target.value) })}
                      className="w-16 px-2 py-1 border border-blue-300 rounded-lg text-sm text-center bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <span className="text-xs text-blue-700">Tage</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-lg p-3 text-center border border-blue-100">
                  <p className="text-2xl font-bold text-blue-700">{urlaubsKonto?.urlaubstageJahr ?? 24}</p>
                  <p className="text-xs text-muted-foreground">Jahresanspruch</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center border border-orange-100">
                  <p className="text-2xl font-bold text-orange-600">{urlaubsKonto?.genommen ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Genommen</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center border border-green-100">
                  <p className={`text-2xl font-bold ${(urlaubsKonto?.rest ?? 24) <= 5 ? "text-red-600" : "text-green-600"}`}>{urlaubsKonto?.rest ?? 24}</p>
                  <p className="text-xs text-muted-foreground">Resturlaub</p>
                </div>
              </div>
              {(urlaubsKonto?.rest ?? 24) <= 5 && (
                <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Weniger als 5 Resturlaubstage!
                </p>
              )}
            </div>
            {/* ── URLAUB ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" /> Urlaubsanträge
                </h2>
                {isAdmin && (
                  <Button size="sm" onClick={() => setShowUrlaubForm(v => !v)}>
                    <Plus className="w-4 h-4 mr-1" /> Neu
                  </Button>
                )}
              </div>

              {/* Urlaub-Formular */}
              {showUrlaubForm && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-blue-800">Neuen Urlaubsantrag anlegen</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs text-muted-foreground">Von *</label>
                      <Input type="date" value={urlaubForm.von} onChange={e => setUrlaubForm(f => ({ ...f, von: e.target.value }))} className="mt-1" /></div>
                    <div><label className="text-xs text-muted-foreground">Bis *</label>
                      <Input type="date" value={urlaubForm.bis} onChange={e => setUrlaubForm(f => ({ ...f, bis: e.target.value }))} className="mt-1" /></div>
                  </div>
                  <div><label className="text-xs text-muted-foreground">Anzahl Tage</label>
                    <Input type="number" min={1} value={urlaubForm.tage} onChange={e => setUrlaubForm(f => ({ ...f, tage: Number(e.target.value) }))} className="mt-1" /></div>
                  <div><label className="text-xs text-muted-foreground">Status</label>
                    <select value={urlaubForm.status} onChange={e => setUrlaubForm(f => ({ ...f, status: e.target.value as any }))}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary">
                      <option value="genehmigt">✅ Genehmigt</option>
                      <option value="beantragt">🟡 Beantragt</option>
                      <option value="abgelehnt">❌ Abgelehnt</option>
                    </select>
                  </div>
                  <div><label className="text-xs text-muted-foreground">Notizen</label>
                    <textarea value={urlaubForm.notizen} onChange={e => setUrlaubForm(f => ({ ...f, notizen: e.target.value }))}
                      className="w-full mt-1 p-2 border rounded-lg text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-primary" /></div>
                  {/* Keine Vertretung Toggle */}
                  <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <Switch
                      checked={urlaubForm.keineVertretung}
                      onCheckedChange={(val) => setUrlaubForm(f => ({ ...f, keineVertretung: val }))}
                    />
                    <div>
                      <p className="text-sm font-medium text-amber-900">Kunde wünscht keine Vertretung</p>
                      <p className="text-xs text-amber-700">Kein Mitarbeiter erhält eine Vertretungsanfrage für diesen Urlaub</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => urlaubCreate.mutate({ mitarbeiterId, ...urlaubForm })} disabled={!urlaubForm.von || !urlaubForm.bis || urlaubCreate.isPending}>
                      <Save className="w-4 h-4 mr-1" /> Speichern
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowUrlaubForm(false)}>Abbrechen</Button>
                  </div>
                </div>
              )}

              {/* Urlaub-Liste */}
              {(urlaubListe as any[]).length === 0 && !showUrlaubForm ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Keine Urlaubsanträge vorhanden</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(urlaubListe as any[]).map((u: any) => (
                    <div key={u.id} className="bg-card rounded-xl border p-3 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">
                            {u.von ? new Date(u.von).toLocaleDateString("de-DE") : ""} – {u.bis ? new Date(u.bis).toLocaleDateString("de-DE") : ""}
                          </span>
                          <span className="text-xs text-muted-foreground">({u.tage} Tage)</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            u.status === "genehmigt" ? "bg-green-100 text-green-700" :
                            u.status === "abgelehnt" ? "bg-red-100 text-red-700" :
                            "bg-yellow-100 text-yellow-700"
                          }`}>
                            {u.status === "genehmigt" ? "✅ Genehmigt" : u.status === "abgelehnt" ? "❌ Abgelehnt" : "🟡 Beantragt"}
                          </span>
                          {u.keineVertretung === 1 && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                              🚫 Keine Vertretung
                            </span>
                          )}
                        </div>
                        {u.notizen && <p className="text-xs text-muted-foreground mt-1 italic">{u.notizen}</p>}
                        {isAdmin && u.status === "beantragt" && (
                          <div className="flex gap-1 mt-2">
                            <button onClick={() => urlaubUpdateStatus.mutate({ id: u.id, status: "genehmigt" })}
                              className="text-xs bg-green-600 text-white px-2 py-1 rounded-lg hover:bg-green-700 transition-colors">✅ Genehmigen</button>
                            <button onClick={() => urlaubUpdateStatus.mutate({ id: u.id, status: "abgelehnt" })}
                              className="text-xs bg-red-600 text-white px-2 py-1 rounded-lg hover:bg-red-700 transition-colors">❌ Ablehnen</button>
                          </div>
                        )}
                      </div>
                      {isAdmin && (
                        <button onClick={() => { if (confirm("Urlaubsantrag wirklich löschen?")) urlaubDelete.mutate({ id: u.id }); }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Trennlinie */}
            <div className="border-t" />

            {/* ── KRANKMELDUNGEN ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" /> Krankmeldungen
                </h2>
                {isAdmin && (
                  <Button size="sm" variant="outline" onClick={() => setShowKrankForm(v => !v)}>
                    <Plus className="w-4 h-4 mr-1" /> Neu
                  </Button>
                )}
              </div>

              {/* Krank-Formular */}
              {showKrankForm && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-orange-800">Neue Krankmeldung anlegen</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs text-muted-foreground">Von *</label>
                      <Input type="date" value={krankForm.von} onChange={e => setKrankForm(f => ({ ...f, von: e.target.value }))} className="mt-1" /></div>
                    <div><label className="text-xs text-muted-foreground">Bis (optional)</label>
                      <Input type="date" value={krankForm.bis} onChange={e => setKrankForm(f => ({ ...f, bis: e.target.value }))} className="mt-1" /></div>
                  </div>
                  <div><label className="text-xs text-muted-foreground">Anzahl Tage</label>
                    <Input type="number" min={1} value={krankForm.tage} onChange={e => setKrankForm(f => ({ ...f, tage: Number(e.target.value) }))} className="mt-1" /></div>
                  <div className="flex items-center gap-3">
                    <Switch checked={krankForm.auAttest} onCheckedChange={v => setKrankForm(f => ({ ...f, auAttest: v }))} />
                    <label className="text-sm text-foreground">AU-Attest vorhanden</label>
                  </div>
                  <div><label className="text-xs text-muted-foreground">Notizen</label>
                    <textarea value={krankForm.notizen} onChange={e => setKrankForm(f => ({ ...f, notizen: e.target.value }))}
                      className="w-full mt-1 p-2 border rounded-lg text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-primary" /></div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => krankCreate.mutate({ mitarbeiterId, ...krankForm, bis: krankForm.bis || undefined, tage: krankForm.tage || undefined })} disabled={!krankForm.von || krankCreate.isPending}>
                      <Save className="w-4 h-4 mr-1" /> Speichern
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowKrankForm(false)}>Abbrechen</Button>
                  </div>
                </div>
              )}

              {/* Krank-Liste */}
              {(krankListe as any[]).length === 0 && !showKrankForm ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Keine Krankmeldungen vorhanden</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(krankListe as any[]).map((k: any) => (
                    <div key={k.id} className="bg-card rounded-xl border p-3 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">
                            Ab {k.von ? new Date(k.von).toLocaleDateString("de-DE") : ""}
                            {k.bis ? ` bis ${new Date(k.bis).toLocaleDateString("de-DE")}` : ""}
                          </span>
                          {k.tage && <span className="text-xs text-muted-foreground">({k.tage} Tage)</span>}
                          {k.auAttest && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">📄 AU-Attest</span>}
                        </div>
                        {k.notizen && <p className="text-xs text-muted-foreground mt-1 italic">{k.notizen}</p>}
                      </div>
                      {isAdmin && (
                        <button onClick={() => { if (confirm("Krankmeldung wirklich löschen?")) krankDelete.mutate({ id: k.id }); }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ── TAB: ERSTE HILFE ────────────────────────────────────────────── */}
      {activeTab === "erstehilfe" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">🩺 Erste-Hilfe-Kurse</h3>
            {isAdmin && (
              <button onClick={() => setEhShowForm(!ehShowForm)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                <Plus className="w-4 h-4" />
                Kurs erfassen
              </button>
            )}
          </div>

          {ehShowForm && isAdmin && (
            <div className="bg-card rounded-xl border p-4 space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Neuer Eintrag</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Kursname</label>
                  <input value={ehForm.kursName} onChange={e => setEhForm(p => ({...p, kursName: e.target.value}))}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm" placeholder="Erste-Hilfe-Kurs" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Anbieter</label>
                  <input value={ehForm.kursAnbieter} onChange={e => setEhForm(p => ({...p, kursAnbieter: e.target.value}))}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm" placeholder="DRK, ASB, ..." />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Kursdatum *</label>
                  <input type="date" value={ehForm.kursDatum} onChange={e => setEhForm(p => ({...p, kursDatum: e.target.value}))}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Ablaufdatum (auto +2 Jahre)</label>
                  <input type="date" value={ehForm.ablaufDatum} onChange={e => setEhForm(p => ({...p, ablaufDatum: e.target.value}))}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Status</label>
                  <select value={ehForm.status} onChange={e => setEhForm(p => ({...p, status: e.target.value as any}))}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm">
                    <option value="bestanden">✅ Bestanden</option>
                    <option value="angemeldet">📋 Angemeldet</option>
                    <option value="abgelaufen">⚠️ Abgelaufen</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Foto (Zertifikat)</label>
                  <input type="file" accept="image/*" capture="environment"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = ev => setEhFoto({ base64: ev.target?.result as string, mime: file.type });
                      reader.readAsDataURL(file);
                    }}
                    className="w-full text-sm" />
                  {ehFoto && <p className="text-xs text-green-600 mt-1">📷 Foto geladen</p>}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Bemerkung</label>
                <textarea value={ehForm.bemerkung} onChange={e => setEhForm(p => ({...p, bemerkung: e.target.value}))}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm resize-none" rows={2} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => {
                  if (!ehForm.kursDatum) { toast.error('Bitte Kursdatum angeben'); return; }
                  ersteHilfeCreate.mutate({
                    mitarbeiterId: mitarbeiterId!,
                    kursName: ehForm.kursName,
                    kursAnbieter: ehForm.kursAnbieter || undefined,
                    kursDatum: ehForm.kursDatum,
                    ablaufDatum: ehForm.ablaufDatum || undefined,
                    status: ehForm.status,
                    fotoBase64: ehFoto?.base64 || undefined,
                    fotoMimeType: ehFoto?.mime || undefined,
                    bemerkung: ehForm.bemerkung || undefined,
                  });
                }} disabled={ersteHilfeCreate.isPending}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                  {ersteHilfeCreate.isPending ? 'Speichern…' : '💾 Speichern'}
                </button>
                <button onClick={() => setEhShowForm(false)}
                  className="px-4 py-2 border rounded-lg text-sm hover:bg-muted">
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {ersteHilfeList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Award className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Noch keine Erste-Hilfe-Kurse erfasst</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ersteHilfeList.map((k: any) => {
                const rawAblauf = k.ablaufDatum;
                const ablauf = rawAblauf ? new Date(rawAblauf) : null;
                const heute = new Date();
                const diffDays = ablauf ? Math.ceil((ablauf.getTime() - heute.getTime()) / 86400000) : null;
                const ampelColor = diffDays === null ? 'bg-gray-100 text-gray-700' : diffDays > 60 ? 'bg-green-100 text-green-700' : diffDays > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
                const ampelLabel = diffDays === null ? '⚪ Kein Ablauf' : diffDays > 60 ? '🟢 Gültig' : diffDays > 0 ? '🟡 Läuft ab' : '🔴 Abgelaufen';
                return (
                  <div key={k.id} className="bg-card rounded-xl border p-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{k.kursName}</span>
                        {k.kursAnbieter && <span className="text-xs text-muted-foreground">({k.kursAnbieter})</span>}
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ampelColor}`}>{ampelLabel}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          k.status === 'bestanden' ? 'bg-green-100 text-green-700' :
                          k.status === 'angemeldet' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                        }`}>{k.status === 'bestanden' ? '✅ Bestanden' : k.status === 'angemeldet' ? '📋 Angemeldet' : '⚠️ Abgelaufen'}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>📅 Kurs: {k.kursDatum ? new Date(k.kursDatum).toLocaleDateString('de-DE') : '–'}</span>
                        {ablauf && <span>⏳ Ablauf: {ablauf.toLocaleDateString('de-DE')}</span>}
                        {diffDays !== null && diffDays > 0 && <span className="text-amber-600">({diffDays} Tage verbleibend)</span>}
                      </div>
                      {k.bemerkung && <p className="text-xs text-muted-foreground mt-1 italic">{k.bemerkung}</p>}
                      {k.fotoBase64 && (
                        <button onClick={() => window.open(k.fotoBase64, '_blank')}
                          className="mt-1 text-xs text-blue-600 hover:underline">📷 Zertifikat anzeigen</button>
                      )}
                    </div>
                    {isAdmin && (
                      <button onClick={() => { if (confirm('Eintrag löschen?')) ersteHilfeDelete.mutate({ id: k.id }); }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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
