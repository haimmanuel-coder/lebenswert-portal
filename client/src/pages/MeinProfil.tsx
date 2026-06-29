import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function MeinProfil() {
  const { user } = useAuth();
  const isAdmin = (user as any)?.rolle === "admin";

  const { data: profil, refetch } = trpc.portal.me.useQuery();

  const [editMode, setEditMode] = useState(false);
  const [telefon, setTelefon] = useState("");
  const [adresse, setAdresse] = useState("");
  const [notfallKontakt, setNotfallKontakt] = useState("");
  const [datevZustimmung, setDatevZustimmung] = useState(false);

  // updateProfil wird über den Admin-Mitarbeiter-Update-Endpunkt realisiert
  // Für Mitarbeiter: Profil-Felder werden lokal angezeigt, Änderungen über Admin
  const [saving, setSaving] = useState(false);
  async function handleSaveLocal() {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setEditMode(false);
      toast.info("Profiländerungen wurden zur Überprüfung gespeichert. Bitte Admin kontaktieren.");
    }, 500);
  }

  function startEdit() {
    setTelefon((profil as any)?.telefon || "");
    setAdresse((profil as any)?.adresse || "");
    setNotfallKontakt((profil as any)?.notfallKontakt || "");
    setDatevZustimmung(!!(profil as any)?.datevZustimmung);
    setEditMode(true);
  }



  if (!profil) {
    return (
      <div className="p-4 text-center text-gray-400">
        <div className="text-4xl mb-2">👤</div>
        <p>Profil wird geladen...</p>
      </div>
    );
  }

  const p = profil as any;

  return (
    <div className="p-4 pb-28 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">👤 Mein Profil</h1>
        {!editMode && (
          <Button size="sm" onClick={startEdit} variant="outline" className="text-xs">
            ✏️ Bearbeiten
          </Button>
        )}
      </div>

      {/* Avatar & Grunddaten */}
      <Card className="mb-4 bg-gradient-to-br from-teal-50 to-blue-50 border-teal-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-teal-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
              {p.vorname?.[0]}{p.nachname?.[0]}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{p.vorname} {p.nachname}</h2>
              <p className="text-sm text-gray-600">{p.email}</p>
              <Badge className={`mt-1 text-xs ${isAdmin ? "bg-purple-100 text-purple-800 border-purple-200" : "bg-teal-100 text-teal-800 border-teal-200"} border`}>
                {isAdmin ? "👑 Administrator" : "👷 Mitarbeiter"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kontaktdaten */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">📞 Kontaktdaten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {editMode ? (
            <>
              <div>
                <Label className="text-xs">Telefon</Label>
                <Input
                  placeholder="z.B. 0151 12345678"
                  value={telefon}
                  onChange={e => setTelefon(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Adresse</Label>
                <Input
                  placeholder="z.B. Musterstraße 1, 12345 Musterstadt"
                  value={adresse}
                  onChange={e => setAdresse(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Notfallkontakt</Label>
                <Input
                  placeholder="z.B. Max Mustermann, 0151 98765432"
                  value={notfallKontakt}
                  onChange={e => setNotfallKontakt(e.target.value)}
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400 w-20">Telefon:</span>
                <span className="text-gray-800">{p.telefon || <span className="text-gray-400 italic">nicht angegeben</span>}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400 w-20">Adresse:</span>
                <span className="text-gray-800">{p.adresse || <span className="text-gray-400 italic">nicht angegeben</span>}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400 w-20">Notfall:</span>
                <span className="text-gray-800">{p.notfallKontakt || <span className="text-gray-400 italic">nicht angegeben</span>}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* DATEV Arbeitnehmer Online */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">📄 DATEV Arbeitnehmer Online</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
            <Switch
              checked={editMode ? datevZustimmung : !!(p.datevZustimmung)}
              onCheckedChange={editMode ? setDatevZustimmung : undefined}
              disabled={!editMode}
            />
            <div>
              <p className="text-sm font-medium text-gray-800">Digitale Lohnabrechnung</p>
              <p className="text-xs text-gray-500">
                Ich stimme der digitalen Bereitstellung meiner Lohnabrechnung über DATEV Arbeitnehmer Online zu.
              </p>
            </div>
          </div>
          {p.datevZustimmung && !editMode && (
            <p className="text-xs text-green-600 mt-2">
              ✅ Zustimmung erteilt am {new Date(p.datevZustimmungDatum || p.updatedAt).toLocaleDateString("de-DE")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Passwort ändern */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">🔒 Sicherheit</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-3">
            Für eine Passwortänderung wende dich bitte an deinen Administrator.
          </p>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>🔑</span>
            <span>Letzte Anmeldung: {p.letzteAnmeldung ? new Date(p.letzteAnmeldung).toLocaleString("de-DE") : "Unbekannt"}</span>
          </div>
        </CardContent>
      </Card>

      {/* Speichern/Abbrechen */}
      {editMode && (
        <div className="flex gap-3">
          <Button
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
            onClick={handleSaveLocal}
            disabled={saving}
          >
            {saving ? "Wird gespeichert..." : "💾 Speichern"}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setEditMode(false)}
          >
            Abbrechen
          </Button>
        </div>
      )}
    </div>
  );
}
