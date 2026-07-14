import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  User,
  Award,
  FileText,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  CheckCircle,
  Clock,
  XCircle,
  Upload,
  Edit2,
  Save,
  X,
  FileDown,
  Car,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

// ── P3: Dienstwagen-Karte (Admin-only) ───────────────────────────────────────
function DienstwagenCard({ mitarbeiterId, ma }: { mitarbeiterId: number; ma: any }) {
  const utils = trpc.useUtils();
  const setDienstwagen = (trpc as any).dienstwagen.setzen.useMutation({
    onSuccess: () => {
      toast.success('Dienstwagen-Status gespeichert');
      utils.admin.mitarbeiterDetail.invalidate({ id: mitarbeiterId });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const [fahrzeugTyp, setFahrzeugTyp] = useState(ma?.fahrzeugTyp ?? '');

  return (
    <div className="bg-card rounded-xl p-4 border space-y-3">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1">
        <Car className="w-3 h-3" /> Dienstwagen (P3)
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
      {ma?.dienstwagen ? (
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
      ) : null}
    </div>
  );
}

type ZertifikatStatus = "erhalten" | "angemeldet" | "nicht_angemeldet";
type Beschaeftigungsart = "minijob" | "teilzeit" | "vollzeit";

interface Props {
  mitarbeiterId: number;
  onBack: () => void;
}

const ZERT_CONFIG: Record<ZertifikatStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  erhalten: { label: "Zertifikat erhalten", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle },
  angemeldet: { label: "Zur Schulung angemeldet", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
  nicht_angemeldet: { label: "Nicht angemeldet", color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
};

const BESCHAEFT_CONFIG: Record<Beschaeftigungsart, { label: string; color: string }> = {
  minijob: { label: "Minijob", color: "bg-purple-100 text-purple-800 border-purple-200" },
  teilzeit: { label: "Teilzeit", color: "bg-blue-100 text-blue-800 border-blue-200" },
  vollzeit: { label: "Vollzeit", color: "bg-green-100 text-green-800 border-green-200" },
};

export default function MitarbeiterDetail({ mitarbeiterId, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<"stamm" | "zertifikat" | "vertrag">("stamm");
  const [editStamm, setEditStamm] = useState(false);
  const [editZert, setEditZert] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const utils = trpc.useUtils();
  const { data: ma, isLoading } = trpc.admin.mitarbeiterDetail.useQuery({ id: mitarbeiterId });
  // Dokumente des Mitarbeiters für Personalbogen
  const { data: mitarbeiterDoks = [] } = (trpc.mitarbeiterakte as any).listDokumente.useQuery({ mitarbeiterId });

  async function exportPersonalbogen(ma: any) {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const lm = 20; let y = 20;
      const line = (text: string, size = 11, bold = false, color = '#111827') => {
        doc.setFontSize(size);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setTextColor(color);
        doc.text(text, lm, y);
        y += size * 0.5 + 2;
      };
      const section = (title: string) => {
        y += 4;
        doc.setFillColor(13, 148, 136);
        doc.rect(lm - 2, y - 5, 170, 8, 'F');
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor('#ffffff');
        doc.text(title, lm, y);
        y += 8;
      };
      const field = (label: string, value: string | null | undefined) => {
        doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor('#6b7280');
        doc.text(label.toUpperCase(), lm, y);
        doc.setFont('helvetica', 'normal'); doc.setTextColor('#111827');
        doc.text(value || '–', lm + 55, y);
        y += 6;
      };
      // Header
      doc.setFillColor(13, 148, 136);
      doc.rect(0, 0, 210, 28, 'F');
      doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor('#ffffff');
      doc.text('PERSONALBOGEN', lm, 14);
      doc.setFontSize(10); doc.setFont('helvetica', 'normal');
      doc.text('Lebensnah Betreuung – Vertraulich', lm, 21);
      doc.setFontSize(9); doc.setTextColor('#ccfbf1');
      doc.text(`Erstellt: ${new Date().toLocaleDateString('de-DE')}`, 150, 21);
      y = 38;
      section('PERSÖNLICHE DATEN');
      field('Name', `${ma.vorname} ${ma.nachname}`);
      field('E-Mail', ma.email);
      field('Telefon', ma.telefon);
      field('Mobil', ma.mobil);
      field('Geburtsdatum', ma.geburtsdatum ? new Date(ma.geburtsdatum).toLocaleDateString('de-DE') : undefined);
      field('Adresse', [ma.strasse, ma.plz, ma.ort].filter(Boolean).join(', '));
      section('BESCHÄFTIGUNG');
      field('Beschäftigungsart', ma.beschaeftigungsart);
      field('Position', ma.position);
      field('Eintrittsdatum', ma.eintrittsdatum ? new Date(ma.eintrittsdatum).toLocaleDateString('de-DE') : undefined);
      field('Stunden/Woche', ma.stundenProWoche ? String(ma.stundenProWoche) : undefined);
      section('QUALIFIKATION');
      field('Zertifikat-Status', ma.zertifikatStatus);
      field('Schulungsdatum', ma.schulungsDatum ? new Date(ma.schulungsDatum).toLocaleDateString('de-DE') : undefined);
      field('Zertifikat-Datum', ma.zertifikatDatum ? new Date(ma.zertifikatDatum).toLocaleDateString('de-DE') : undefined);
      field('Zertifikat-Nr.', ma.zertifikatNummer);
      if (ma.aktenvermerke) {
        section('AKTENVERMERKE');
        const lines = doc.splitTextToSize(ma.aktenvermerke, 160);
        doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor('#111827');
        doc.text(lines, lm, y);
        y += lines.length * 5 + 4;
      }
      // Dokumente aus Self-Service
      if (mitarbeiterDoks && mitarbeiterDoks.length > 0) {
        // Neue Seite wenn zu wenig Platz
        if (y > 230) { doc.addPage(); y = 20; }
        section('HOCHGELADENE DOKUMENTE & QUALIFIKATIONSNACHWEISE');
        const dokTypLabels: Record<string, string> = {
          zertifikat: 'Zertifikat', arbeitsvertrag: 'Arbeitsvertrag', krankmeldung: 'Krankmeldung',
          fuehrerschein: 'Führerschein', erstehilfe: 'Erste-Hilfe-Kurs', sonstiges: 'Sonstiges',
        };
        mitarbeiterDoks.forEach((d: any, idx: number) => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor('#111827');
          doc.text(`${idx + 1}. ${d.bezeichnung}`, lm, y);
          y += 5;
          doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor('#6b7280');
          const typ = dokTypLabels[d.typ] ?? d.typ;
          let info = `Typ: ${typ}`;
          if (d.ausstellungsdatum) info += `  |  Ausgestellt: ${new Date(d.ausstellungsdatum).toLocaleDateString('de-DE')}`;
          if (d.ablaufdatum) {
            const abgelaufen = new Date(d.ablaufdatum) < new Date();
            info += `  |  Ablauf: ${new Date(d.ablaufdatum).toLocaleDateString('de-DE')}${abgelaufen ? ' (ABGELAUFEN)' : ''}`;
          }
          doc.text(info, lm + 4, y);
          y += 5;
          if (d.notizen) {
            doc.setTextColor('#9ca3af');
            doc.text(`Notiz: ${d.notizen}`, lm + 4, y);
            y += 5;
          }
          if (d.dateiUrl) {
            doc.setTextColor('#0d9488');
            doc.text(`Datei: ${d.dateiname ?? d.dateiUrl}`, lm + 4, y);
            y += 5;
          }
          y += 2;
        });
      }
      // Footer
      doc.setFontSize(8); doc.setTextColor('#9ca3af');
      doc.text('Vertraulich – nur für den internen Gebrauch', lm, 285);
      doc.text(`Seite 1`, 185, 285);
      doc.save(`Personalbogen_${ma.vorname}_${ma.nachname}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('📄 Personalbogen als PDF heruntergeladen');
    } catch (err) {
      toast.error('PDF-Export fehlgeschlagen');
    }
  }

  // Stammdaten-Formular
  const [stammForm, setStammForm] = useState<Record<string, string>>({});
  const updateStamm = trpc.admin.updateStammdaten.useMutation({
    onSuccess: () => {
      toast.success("Stammdaten gespeichert");
      utils.admin.mitarbeiterDetail.invalidate({ id: mitarbeiterId });
      utils.admin.mitarbeiterList.invalidate();
      setEditStamm(false);
    },
    onError: (e) => toast.error(e.message),
  });

  // Zertifikat-Formular
  const [zertForm, setZertForm] = useState<{
    zertifikatStatus: ZertifikatStatus;
    zertifikatDatum: string;
    zertifikatAblauf: string;
    zertifikatBemerkung: string;
  }>({ zertifikatStatus: "nicht_angemeldet", zertifikatDatum: "", zertifikatAblauf: "", zertifikatBemerkung: "" });

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

  const handleStammSave = () => {
    updateStamm.mutate({ id: mitarbeiterId, ...stammForm } as any);
  };

  const handleZertSave = () => {
    updateZert.mutate({ id: mitarbeiterId, ...zertForm });
  };

  const handleFileUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    try {
      // Datei als Base64 lesen und als URL speichern (Demo: lokaler Dateiname)
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
    } catch {
      toast.error("Upload fehlgeschlagen");
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="bg-primary text-white p-4 flex items-center gap-3">
        <button onClick={onBack} className="p-1 rounded-full hover:bg-white/20 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-lg">{ma.vorname} {ma.nachname}</h1>
          <p className="text-white/80 text-sm">{ma.position ?? "Mitarbeiter"}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge className={`text-xs border ${BESCHAEFT_CONFIG[beschArt].color}`}>
            {BESCHAEFT_CONFIG[beschArt].label}
          </Badge>
          <Badge className={`text-xs border ${ZERT_CONFIG[zertStatus].color}`}>
            <ZertIcon className="w-3 h-3 mr-1" />
            {ZERT_CONFIG[zertStatus].label}
          </Badge>
          <button
            onClick={() => exportPersonalbogen(ma)}
            className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-2 py-1 rounded-lg transition-colors mt-1"
            title="Personalbogen als PDF exportieren (nur Admin)"
          >
            <FileDown className="w-3 h-3" />
            Personalbogen
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b bg-white">
        {[
          { id: "stamm", label: "Stammdaten", icon: User },
          { id: "zertifikat", label: "Zertifikate", icon: Award },
          { id: "vertrag", label: "Arbeitsvertrag", icon: FileText },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
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

      {/* Tab-Inhalte */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* ── STAMMDATEN ── */}
        {activeTab === "stamm" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Persönliche Daten</h2>
              {!editStamm ? (
                <Button size="sm" variant="outline" onClick={() => {
                  setStammForm({
                    vorname: ma.vorname,
                    nachname: ma.nachname,
                    email: ma.email,
                    telefon: ma.telefon ?? "",
                    mobil: ma.mobil ?? "",
                    strasse: ma.strasse ?? "",
                    plz: ma.plz ?? "",
                    ort: ma.ort ?? "",
                    geburtsdatum: ma.geburtsdatum ? String(ma.geburtsdatum).split("T")[0] : "",
                    eintrittsdatum: ma.eintrittsdatum ? String(ma.eintrittsdatum).split("T")[0] : "",
                    position: ma.position ?? "",
                    notizen: ma.notizen ?? "",
                  });
                  setEditStamm(true);
                }}>
                  <Edit2 className="w-4 h-4 mr-1" /> Bearbeiten
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleStammSave} disabled={updateStamm.isPending}>
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
                    <button
                      key={art}
                      onClick={() => setStammForm(f => ({ ...f, beschaeftigungsart: art }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        (stammForm.beschaeftigungsart ?? beschArt) === art
                          ? "bg-primary text-white border-primary"
                          : "bg-white text-muted-foreground border-border hover:border-primary"
                      }`}
                    >
                      {BESCHAEFT_CONFIG[art].label}
                    </button>
                  ))}
                </div>
              ) : (
                <Badge className={`border ${BESCHAEFT_CONFIG[beschArt].color}`}>
                  <Briefcase className="w-3 h-3 mr-1" />
                  {BESCHAEFT_CONFIG[beschArt].label}
                </Badge>
              )}
            </div>

            {/* Kontakt */}
            <div className="bg-card rounded-xl p-4 border space-y-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Kontakt</p>
              {editStamm ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Vorname</label>
                      <Input value={stammForm.vorname ?? ""} onChange={e => setStammForm(f => ({ ...f, vorname: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Nachname</label>
                      <Input value={stammForm.nachname ?? ""} onChange={e => setStammForm(f => ({ ...f, nachname: e.target.value }))} className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">E-Mail</label>
                    <Input value={stammForm.email ?? ""} onChange={e => setStammForm(f => ({ ...f, email: e.target.value }))} className="mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Telefon</label>
                      <Input value={stammForm.telefon ?? ""} onChange={e => setStammForm(f => ({ ...f, telefon: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Mobil</label>
                      <Input value={stammForm.mobil ?? ""} onChange={e => setStammForm(f => ({ ...f, mobil: e.target.value }))} className="mt-1" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-primary" />
                    <span>{ma.telefon ?? "—"}</span>
                    {ma.mobil && <span className="text-muted-foreground">· {ma.mobil}</span>}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-primary" />
                    <span>{ma.email}</span>
                  </div>
                </>
              )}
            </div>

            {/* Adresse */}
            <div className="bg-card rounded-xl p-4 border space-y-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Adresse</p>
              {editStamm ? (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground">Straße</label>
                    <Input value={stammForm.strasse ?? ""} onChange={e => setStammForm(f => ({ ...f, strasse: e.target.value }))} className="mt-1" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">PLZ</label>
                      <Input value={stammForm.plz ?? ""} onChange={e => setStammForm(f => ({ ...f, plz: e.target.value }))} className="mt-1" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-muted-foreground">Ort</label>
                      <Input value={stammForm.ort ?? ""} onChange={e => setStammForm(f => ({ ...f, ort: e.target.value }))} className="mt-1" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-primary mt-0.5" />
                  <div>
                    {ma.strasse ? (
                      <>
                        <p>{ma.strasse}</p>
                        <p>{ma.plz} {ma.ort}</p>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Keine Adresse hinterlegt</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Beschäftigung */}
            <div className="bg-card rounded-xl p-4 border space-y-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Beschäftigung</p>
              {editStamm ? (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground">Position</label>
                    <Input value={stammForm.position ?? ""} onChange={e => setStammForm(f => ({ ...f, position: e.target.value }))} className="mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Geburtsdatum</label>
                      <Input type="date" value={stammForm.geburtsdatum ?? ""} onChange={e => setStammForm(f => ({ ...f, geburtsdatum: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Eintrittsdatum</label>
                      <Input type="date" value={stammForm.eintrittsdatum ?? ""} onChange={e => setStammForm(f => ({ ...f, eintrittsdatum: e.target.value }))} className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Notizen</label>
                    <textarea
                      value={stammForm.notizen ?? ""}
                      onChange={e => setStammForm(f => ({ ...f, notizen: e.target.value }))}
                      className="w-full mt-1 p-2 border rounded-lg text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="w-4 h-4 text-primary" />
                    <span>{ma.position ?? "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span>Eintritt: {ma.eintrittsdatum ? new Date(ma.eintrittsdatum).toLocaleDateString("de-DE") : "—"}</span>
                  </div>
                  {ma.geburtsdatum && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span>Geb.: {new Date(ma.geburtsdatum).toLocaleDateString("de-DE")}</span>
                    </div>
                  )}
                  {ma.notizen && (
                    <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-2 mt-2">
                      {ma.notizen}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* P3: Dienstwagen-Bereich */}
            <DienstwagenCard mitarbeiterId={mitarbeiterId} ma={ma} />

          </div>
        )}

        {/* ── ZERTIFIKATE ── */}
        {activeTab === "zertifikat" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Schulungen & Zertifikate</h2>
              {!editZert ? (
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
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleZertSave} disabled={updateZert.isPending}>
                    <Save className="w-4 h-4 mr-1" /> Speichern
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditZert(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Aktueller Status */}
            <div className={`rounded-xl p-4 border-2 ${
              zertStatus === "erhalten" ? "bg-green-50 border-green-200" :
              zertStatus === "angemeldet" ? "bg-yellow-50 border-yellow-200" :
              "bg-red-50 border-red-200"
            }`}>
              <div className="flex items-center gap-3">
                <ZertIcon className={`w-8 h-8 ${
                  zertStatus === "erhalten" ? "text-green-600" :
                  zertStatus === "angemeldet" ? "text-yellow-600" :
                  "text-red-600"
                }`} />
                <div>
                  <p className="font-semibold text-foreground">{ZERT_CONFIG[zertStatus].label}</p>
                  <p className="text-sm text-muted-foreground">
                    {zertStatus === "erhalten" ? "Schulung erfolgreich abgeschlossen" :
                     zertStatus === "angemeldet" ? "Schulungstermin ist gebucht" :
                     "Bitte Schulung einplanen"}
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
                        <button
                          key={s}
                          onClick={() => setZertForm(f => ({ ...f, zertifikatStatus: s }))}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                            zertForm.zertifikatStatus === s
                              ? "bg-primary text-white border-primary"
                              : "bg-white text-foreground border-border hover:border-primary"
                          }`}
                        >
                          <Ic className="w-4 h-4" />
                          <span className="text-sm font-medium">{ZERT_CONFIG[s].label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Zertifikat-Datum</label>
                    <Input type="date" value={zertForm.zertifikatDatum} onChange={e => setZertForm(f => ({ ...f, zertifikatDatum: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Ablauf-Datum</label>
                    <Input type="date" value={zertForm.zertifikatAblauf} onChange={e => setZertForm(f => ({ ...f, zertifikatAblauf: e.target.value }))} className="mt-1" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Bemerkung</label>
                  <textarea
                    value={zertForm.zertifikatBemerkung}
                    onChange={e => setZertForm(f => ({ ...f, zertifikatBemerkung: e.target.value }))}
                    className="w-full mt-1 p-2 border rounded-lg text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="z.B. Schulungsanbieter, Kurs-Nummer..."
                  />
                </div>
              </div>
            ) : (
              <div className="bg-card rounded-xl p-4 border space-y-3">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Details</p>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>Zertifikat-Datum: {ma.zertifikatDatum ? new Date(ma.zertifikatDatum).toLocaleDateString("de-DE") : "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>Ablauf: {ma.zertifikatAblauf ? new Date(ma.zertifikatAblauf).toLocaleDateString("de-DE") : "—"}</span>
                </div>
                {ma.zertifikatBemerkung && (
                  <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-2">
                    {ma.zertifikatBemerkung}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── ARBEITSVERTRAG ── */}
        {activeTab === "vertrag" && (
          <div className="space-y-4">
            <h2 className="font-semibold text-foreground">Arbeitsvertrag</h2>

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
                  <a
                    href={ma.arbeitsvertragUrl}
                    download={ma.arbeitsvertragDateiname ?? "Arbeitsvertrag.pdf"}
                    className="mt-3 flex items-center gap-2 text-sm text-primary hover:underline"
                  >
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
            <div className="bg-card rounded-xl p-4 border space-y-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                {ma.arbeitsvertragUrl ? "Vertrag ersetzen" : "Vertrag hochladen"}
              </p>
              <label className="block">
                <div className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  uploadFile ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}>
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  {uploadFile ? (
                    <div>
                      <p className="font-medium text-sm text-foreground">{uploadFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(uploadFile.size / 1024).toFixed(0)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-foreground">PDF oder Bild auswählen</p>
                      <p className="text-xs text-muted-foreground mt-1">Tippe hier um eine Datei auszuwählen</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    className="hidden"
                    onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
                  />
                </div>
              </label>
              {uploadFile && (
                <Button
                  className="w-full"
                  onClick={handleFileUpload}
                  disabled={uploading}
                >
                  {uploading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {uploading ? "Wird hochgeladen..." : "Vertrag hinterlegen"}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
