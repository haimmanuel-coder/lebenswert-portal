import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { toast } from "sonner";
import {
  Building2, Search, Plus, Phone, Mail, MapPin, Hash,
  ChevronRight, X, Check, Loader2, Edit2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const TYP_FARBEN: Record<string, string> = {
  pflegekasse: "bg-green-100 text-green-700",
  krankenkasse: "bg-blue-100 text-blue-700",
  privat: "bg-purple-100 text-purple-700",
  sonstige: "bg-gray-100 text-gray-600",
};
const TYP_LABEL: Record<string, string> = {
  pflegekasse: "Pflegekasse",
  krankenkasse: "Krankenkasse",
  privat: "Privat",
  sonstige: "Sonstige",
};

export default function Kostentraeger() {
  const { mitarbeiter } = usePortalAuth();
  const isAdmin = mitarbeiter?.rolle === "admin";
  const [suche, setSuche] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ name: "", kurzname: "", ikNummer: "", typ: "pflegekasse", plz: "", ort: "", telefon: "", email: "" });

  const { data: liste = [], refetch } = trpc.admin.kostentraegerList.useQuery(undefined, { enabled: isAdmin });

  const createMut = trpc.admin.kostentraegerCreate.useMutation({
    onSuccess: () => { toast.success("Kostenträger angelegt"); setShowForm(false); refetch(); resetForm(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.admin.kostentraegerUpdate.useMutation({
    onSuccess: () => { toast.success("Gespeichert"); setEditItem(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  function resetForm() {
    setForm({ name: "", kurzname: "", ikNummer: "", typ: "pflegekasse", plz: "", ort: "", telefon: "", email: "" });
  }

  const gefiltert = useMemo(() => {
    if (!suche.trim()) return liste;
    const q = suche.toLowerCase();
    return liste.filter((k: any) =>
      k.name?.toLowerCase().includes(q) ||
      k.ikNummer?.toLowerCase().includes(q) ||
      k.kurzname?.toLowerCase().includes(q) ||
      k.ort?.toLowerCase().includes(q)
    );
  }, [liste, suche]);

  if (!isAdmin) {
    return (
      <div className="p-6 text-center text-gray-500">
        <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Nur für Administratoren zugänglich.</p>
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#4a8c3f]" />
            <h1 className="font-bold text-gray-800">Kostenträger</h1>
            <Badge variant="outline" className="text-xs">{liste.length}</Badge>
          </div>
          <Button size="sm" className="bg-[#4a8c3f] hover:bg-[#3a7230] text-white gap-1"
            onClick={() => { setShowForm(true); setEditItem(null); }}>
            <Plus className="w-4 h-4" /> Neu
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Name, IK-Nummer oder Ort suchen..."
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            className="pl-9 text-sm"
          />
          {suche && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSuche("")}>
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
        {suche && (
          <p className="text-xs text-gray-500 mt-1">{gefiltert.length} Ergebnis{gefiltert.length !== 1 ? "se" : ""}</p>
        )}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 px-4 py-3">
        <Card className="border-0 bg-green-50">
          <CardContent className="p-3">
            <p className="text-xs text-gray-500">Pflegekassen</p>
            <p className="text-2xl font-bold text-green-700">
              {liste.filter((k: any) => k.typ === "pflegekasse").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-blue-50">
          <CardContent className="p-3">
            <p className="text-xs text-gray-500">Krankenkassen</p>
            <p className="text-2xl font-bold text-blue-700">
              {liste.filter((k: any) => k.typ === "krankenkasse").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Liste */}
      <div className="px-4 space-y-2">
        {gefiltert.map((k: any) => (
          <Card key={k.id} className="border border-gray-100 shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-gray-800 truncate">{k.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYP_FARBEN[k.typ] ?? TYP_FARBEN.sonstige}`}>
                      {TYP_LABEL[k.typ] ?? k.typ}
                    </span>
                  </div>
                  {k.ikNummer && (
                    <div className="flex items-center gap-1 mt-1">
                      <Hash className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500 font-mono">IK: {k.ikNummer}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3 mt-1">
                    {k.ort && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="w-3 h-3" />{k.plz} {k.ort}
                      </span>
                    )}
                    {k.telefon && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Phone className="w-3 h-3" />{k.telefon}
                      </span>
                    )}
                    {k.email && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Mail className="w-3 h-3" />{k.email}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 flex-shrink-0"
                  onClick={() => setEditItem(k)}
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
        {gefiltert.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Keine Kostenträger gefunden</p>
          </div>
        )}
      </div>

      {/* Neu-Formular Sheet */}
      {(showForm || editItem) && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowForm(false); setEditItem(null); }} />
          <div className="relative w-full bg-white rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800">{editItem ? "Kostenträger bearbeiten" : "Neuer Kostenträger"}</h2>
              <button onClick={() => { setShowForm(false); setEditItem(null); }}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Name *</label>
                <Input
                  placeholder="z.B. AOK Bayern"
                  value={editItem ? editItem.name : form.name}
                  onChange={(e) => editItem ? setEditItem({ ...editItem, name: e.target.value }) : setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Kurzname</label>
                  <Input
                    placeholder="z.B. AOK BY"
                    value={editItem ? (editItem.kurzname ?? "") : form.kurzname}
                    onChange={(e) => editItem ? setEditItem({ ...editItem, kurzname: e.target.value }) : setForm({ ...form, kurzname: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">IK-Nummer</label>
                  <Input
                    placeholder="z.B. 108310400"
                    value={editItem ? (editItem.ikNummer ?? "") : form.ikNummer}
                    onChange={(e) => editItem ? setEditItem({ ...editItem, ikNummer: e.target.value }) : setForm({ ...form, ikNummer: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Typ</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={editItem ? editItem.typ : form.typ}
                  onChange={(e) => editItem ? setEditItem({ ...editItem, typ: e.target.value }) : setForm({ ...form, typ: e.target.value })}
                >
                  <option value="pflegekasse">Pflegekasse</option>
                  <option value="krankenkasse">Krankenkasse</option>
                  <option value="privat">Privat</option>
                  <option value="sonstige">Sonstige</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">PLZ</label>
                  <Input
                    placeholder="12345"
                    value={editItem ? (editItem.plz ?? "") : form.plz}
                    onChange={(e) => editItem ? setEditItem({ ...editItem, plz: e.target.value }) : setForm({ ...form, plz: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Ort</label>
                  <Input
                    placeholder="München"
                    value={editItem ? (editItem.ort ?? "") : form.ort}
                    onChange={(e) => editItem ? setEditItem({ ...editItem, ort: e.target.value }) : setForm({ ...form, ort: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Telefon</label>
                <Input
                  placeholder="089 1234-0"
                  value={editItem ? (editItem.telefon ?? "") : form.telefon}
                  onChange={(e) => editItem ? setEditItem({ ...editItem, telefon: e.target.value }) : setForm({ ...form, telefon: e.target.value })}
                />
              </div>
              <Button
                className="w-full bg-[#4a8c3f] hover:bg-[#3a7230] text-white"
                disabled={createMut.isPending || updateMut.isPending}
                onClick={() => {
                  if (editItem) {
                    updateMut.mutate({ id: editItem.id, name: editItem.name, kurzname: editItem.kurzname, ikNummer: editItem.ikNummer, typ: editItem.typ, plz: editItem.plz, ort: editItem.ort, telefon: editItem.telefon });
                  } else {
                    if (!form.name.trim()) { toast.error("Name ist erforderlich"); return; }
                    createMut.mutate({ name: form.name, kurzname: form.kurzname || undefined, ikNummer: form.ikNummer || undefined, typ: form.typ as any, plz: form.plz || undefined, ort: form.ort || undefined, telefon: form.telefon || undefined });
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
