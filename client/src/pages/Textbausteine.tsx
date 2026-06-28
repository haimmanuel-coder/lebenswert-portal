import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { toast } from "sonner";
import { BookOpen, Search, Plus, Copy, Check, X, Loader2, Edit2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const KAT_FARBEN: Record<string, string> = {
  alltagsbegleitung: "bg-green-100 text-green-700",
  haushalt: "bg-yellow-100 text-yellow-700",
  mobilisierung: "bg-blue-100 text-blue-700",
  soziales: "bg-purple-100 text-purple-700",
  transport: "bg-orange-100 text-orange-700",
  sonstiges: "bg-gray-100 text-gray-600",
};
const KAT_LABEL: Record<string, string> = {
  alltagsbegleitung: "Alltagsbegleitung",
  haushalt: "Haushalt",
  mobilisierung: "Mobilisierung",
  soziales: "Soziales",
  transport: "Transport",
  sonstiges: "Sonstiges",
};
const PARA_LABEL: Record<string, string> = {
  "45b": "§45b SGB XI",
  "45a": "§45a SGB XI",
  "39": "§39 SGB XI",
  "alle": "Alle §§",
};

export default function Textbausteine() {
  const { mitarbeiter } = usePortalAuth();
  const isAdmin = mitarbeiter?.rolle === "admin";
  const [suche, setSuche] = useState("");
  const [filterPara, setFilterPara] = useState("alle");
  const [filterKat, setFilterKat] = useState("alle");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [kopiert, setKopiert] = useState<number | null>(null);
  const [form, setForm] = useState({ titel: "", text: "", kategorie: "alltagsbegleitung", paragraph: "45b" });

  const { data: liste = [], refetch } = trpc.admin.textbausteine.useQuery(
    { paragraph: filterPara !== "alle" ? filterPara : undefined },
    { enabled: !!mitarbeiter }
  );

  const createMut = trpc.admin.textbausteineCreate.useMutation({
    onSuccess: () => { toast.success("Textbaustein angelegt"); setShowForm(false); refetch(); setForm({ titel: "", text: "", kategorie: "alltagsbegleitung", paragraph: "45b" }); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.admin.textbausteineUpdate.useMutation({
    onSuccess: () => { toast.success("Gespeichert"); setEditItem(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const gefiltert = useMemo(() => {
    let result = liste as any[];
    if (filterKat !== "alle") result = result.filter((t: any) => t.kategorie === filterKat);
    if (suche.trim()) {
      const q = suche.toLowerCase();
      result = result.filter((t: any) => t.titel?.toLowerCase().includes(q) || t.text?.toLowerCase().includes(q));
    }
    return result;
  }, [liste, filterKat, suche]);

  function kopieren(t: any) {
    navigator.clipboard.writeText(t.text).then(() => {
      setKopiert(t.id);
      toast.success("Text kopiert!");
      setTimeout(() => setKopiert(null), 2000);
    });
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#4a8c3f]" />
            <h1 className="font-bold text-gray-800">Textbausteine</h1>
            <Badge variant="outline" className="text-xs">{liste.length}</Badge>
          </div>
          {isAdmin && (
            <Button size="sm" className="bg-[#4a8c3f] hover:bg-[#3a7230] text-white gap-1"
              onClick={() => { setShowForm(true); setEditItem(null); }}>
              <Plus className="w-4 h-4" /> Neu
            </Button>
          )}
        </div>
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Textbausteine durchsuchen..."
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
        {/* Filter-Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {["alle", "45b", "45a", "39"].map((p) => (
            <button
              key={p}
              onClick={() => setFilterPara(p)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filterPara === p ? "bg-[#4a8c3f] text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {p === "alle" ? "Alle §§" : `§${p} SGB XI`}
            </button>
          ))}
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1 mt-1 scrollbar-hide">
          {["alle", ...Object.keys(KAT_LABEL)].map((k) => (
            <button
              key={k}
              onClick={() => setFilterKat(k)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filterKat === k ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {k === "alle" ? "Alle Kategorien" : KAT_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      <div className="px-4 pt-3 space-y-2">
        {gefiltert.map((t: any) => (
          <Card key={t.id} className="border border-gray-100 shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm text-gray-800">{t.titel}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${KAT_FARBEN[t.kategorie] ?? KAT_FARBEN.sonstiges}`}>
                      {KAT_LABEL[t.kategorie] ?? t.kategorie}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">
                      {PARA_LABEL[t.paragraph] ?? t.paragraph}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{t.text}</p>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button
                    className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600"
                    onClick={() => kopieren(t)}
                    title="Text kopieren"
                  >
                    {kopiert === t.id ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                  {isAdmin && (
                    <button
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                      onClick={() => setEditItem(t)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {gefiltert.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Keine Textbausteine gefunden</p>
          </div>
        )}
      </div>

      {/* Formular Sheet */}
      {(showForm || editItem) && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowForm(false); setEditItem(null); }} />
          <div className="relative w-full bg-white rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800">{editItem ? "Textbaustein bearbeiten" : "Neuer Textbaustein"}</h2>
              <button onClick={() => { setShowForm(false); setEditItem(null); }}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Titel *</label>
                <Input
                  placeholder="z.B. Spaziergang im Park"
                  value={editItem ? editItem.titel : form.titel}
                  onChange={(e) => editItem ? setEditItem({ ...editItem, titel: e.target.value }) : setForm({ ...form, titel: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Kategorie</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={editItem ? editItem.kategorie : form.kategorie}
                    onChange={(e) => editItem ? setEditItem({ ...editItem, kategorie: e.target.value }) : setForm({ ...form, kategorie: e.target.value })}
                  >
                    {Object.entries(KAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Paragraph</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={editItem ? editItem.paragraph : form.paragraph}
                    onChange={(e) => editItem ? setEditItem({ ...editItem, paragraph: e.target.value }) : setForm({ ...form, paragraph: e.target.value })}
                  >
                    <option value="45b">§45b SGB XI</option>
                    <option value="45a">§45a SGB XI</option>
                    <option value="39">§39 SGB XI</option>
                    <option value="alle">Alle §§</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Text *</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm min-h-[120px] resize-none"
                  placeholder="Vollständiger Dokumentationstext..."
                  value={editItem ? editItem.text : form.text}
                  onChange={(e) => editItem ? setEditItem({ ...editItem, text: e.target.value }) : setForm({ ...form, text: e.target.value })}
                />
              </div>
              <Button
                className="w-full bg-[#4a8c3f] hover:bg-[#3a7230] text-white"
                disabled={createMut.isPending || updateMut.isPending}
                onClick={() => {
                  if (editItem) {
                    updateMut.mutate({ id: editItem.id, titel: editItem.titel, text: editItem.text });
                  } else {
                    if (!form.titel.trim() || !form.text.trim()) { toast.error("Titel und Text sind erforderlich"); return; }
                    createMut.mutate({ titel: form.titel, text: form.text, kategorie: form.kategorie as any, paragraph: form.paragraph as any });
                  }
                }}
              >
                {(createMut.isPending || updateMut.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editItem ? "Speichern" : "Anlegen"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
