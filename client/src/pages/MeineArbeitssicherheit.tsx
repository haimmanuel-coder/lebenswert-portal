import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import UnterschriftDialog from "@/components/UnterschriftDialog";

// ─── Ampel-Hilfsfunktionen ────────────────────────────────────────────────────

function unterweisungAmpel(bestaetigt: boolean, naechste: string | null) {
  if (!bestaetigt) return { bg: "#fee2e2", color: "#dc2626", label: "🔴 Bestätigung ausstehend" };
  if (!naechste) return { bg: "#dcfce7", color: "#16a34a", label: "✅ Bestätigt" };
  const days = Math.ceil((new Date(naechste).getTime() - Date.now()) / 86400000);
  if (days < 0) return { bg: "#fee2e2", color: "#dc2626", label: "🔴 Wiederholung fällig" };
  if (days <= 60) return { bg: "#fef9c3", color: "#ca8a04", label: `🟡 Fällig in ${days} Tagen` };
  return { bg: "#dcfce7", color: "#16a34a", label: "✅ Aktuell" };
}

function vorsorgeAmpel(faelligkeit: string | null, durchgefuehrt: string | null) {
  if (durchgefuehrt) return { bg: "#dcfce7", color: "#16a34a", label: "✅ Erledigt" };
  if (!faelligkeit) return { bg: "#f3f4f6", color: "#6b7280", label: "⬜ Offen" };
  const days = Math.ceil((new Date(faelligkeit).getTime() - Date.now()) / 86400000);
  if (days < 0) return { bg: "#fee2e2", color: "#dc2626", label: "🔴 Überfällig" };
  if (days <= 30) return { bg: "#fef9c3", color: "#ca8a04", label: `🟡 In ${days} Tagen` };
  return { bg: "#dcfce7", color: "#16a34a", label: `🟢 In ${days} Tagen` };
}

const THEMEN_LABELS: Record<string, string> = {
  notfall_erste_hilfe: "Notfälle & Erste Hilfe",
  hygiene_desinfektion: "Hygiene & Desinfektion",
  ergonomie_heben_tragen: "Ergonomie / Heben & Tragen",
  deeskalation_demenz: "Deeskalation bei Demenz",
  verkehrssicherheit: "Verkehrssicherheit",
  psa_verwendung: "PSA-Verwendung",
  alleinarbeit_schutz: "Schutz bei Alleinarbeit",
  biostoff_infektionsschutz: "Biostoff & Infektionsschutz",
  sonstiges: "Sonstiges",
};

const PSA_LABELS: Record<string, string> = {
  einmalhandschuhe: "Einmalhandschuhe",
  ffp2_maske: "FFP2-Maske",
  mund_nasen_schutz: "Mund-Nasen-Schutz",
  schutzkittel: "Schutzkittel",
  schutzbrille: "Schutzbrille",
  desinfektionsmittel: "Händedesinfektionsmittel",
  sonstiges: "Sonstiges",
};

// ─── Hauptkomponente ──────────────────────────────────────────────────────────

export default function MeineArbeitssicherheit() {
  const utils = trpc.useUtils();

  // Daten
  const { data: unterweisungen = [] } = trpc.arbeitssicherheit.unterweisung.meineUnterweisungen.useQuery();
  const { data: psa = [] } = trpc.arbeitssicherheit.psa.meinePsa.useQuery();
  const { data: vorsorgen = [] } = trpc.arbeitssicherheit.vorsorge.meineVorsorgen.useQuery();
  const { data: alleinStatus } = trpc.arbeitssicherheit.alleinarbeit.meinStatus.useQuery(undefined, { refetchInterval: 30000 });
  const { data: alleinVerlauf = [] } = trpc.arbeitssicherheit.alleinarbeit.meinVerlauf.useQuery();

  // Mutations
  const bestaetigen = trpc.arbeitssicherheit.unterweisung.bestaetigen.useMutation({
    onSuccess: () => { utils.arbeitssicherheit.unterweisung.meineUnterweisungen.invalidate(); toast.success("Unterweisung bestätigt ✅"); },
    onError: (e) => toast.error(e.message),
  });
  const bestaetigenMitUnterschrift = (trpc as any).unterweisungNachweis.bestaetigenMitUnterschrift.useMutation({
    onSuccess: (data: any) => {
      utils.arbeitssicherheit.unterweisung.meineUnterweisungen.invalidate();
      toast.success("Unterweisung unterschrieben & Nachweis gespeichert ✅");
      setUnterschriftDialogOpen(false);
      setAktiveUnterweisung(null);
      if (data?.pdfUrl) window.open(data.pdfUrl, "_blank");
    },
    onError: (e: any) => toast.error(e.message),
  });
  const getNachweis = (trpc as any).unterweisungNachweis.getNachweis.useMutation({
    onSuccess: (data: any) => {
      if (data?.signedPdfUrl) window.open(data.signedPdfUrl, "_blank");
      else toast.error("Kein PDF-Nachweis vorhanden");
    },
    onError: (e: any) => toast.error(e.message),
  });
  const [unterschriftDialogOpen, setUnterschriftDialogOpen] = useState(false);
  const [aktiveUnterweisung, setAktiveUnterweisung] = useState<any>(null);
  const checkIn = trpc.arbeitssicherheit.alleinarbeit.checkIn.useMutation({
    onSuccess: () => { utils.arbeitssicherheit.alleinarbeit.meinStatus.invalidate(); utils.arbeitssicherheit.alleinarbeit.meinVerlauf.invalidate(); toast.success("Check-in erfolgreich"); },
    onError: (e) => toast.error(e.message),
  });
  const checkOut = trpc.arbeitssicherheit.alleinarbeit.checkOut.useMutation({
    onSuccess: () => { utils.arbeitssicherheit.alleinarbeit.meinStatus.invalidate(); utils.arbeitssicherheit.alleinarbeit.meinVerlauf.invalidate(); toast.success("Check-out erfolgreich"); },
    onError: (e) => toast.error(e.message),
  });

  const [notfallKontakt, setNotfallKontakt] = useState("");
  const [showCheckInForm, setShowCheckInForm] = useState(false);

  // Zähler für offene Unterweisungen
  const offeneUnterweisungen = unterweisungen.filter((u: any) => !u.bestaetigt).length;

  return (
    <div style={{ padding: 16, maxWidth: 700, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1e3a2f", margin: 0 }}>⛑️ Meine Arbeitssicherheit</h2>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>Unterweisungen, PSA, Vorsorge und Alleinarbeitsschutz</p>
      </div>

      {/* ── Alleinarbeit Check-in/out ─────────────────────────────────────── */}
      <div style={{ background: alleinStatus ? "#fff7ed" : "#f0fdf4", border: `1px solid ${alleinStatus ? "#fed7aa" : "#bbf7d0"}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
          {alleinStatus ? "🟡 Alleinarbeit aktiv" : "⚪ Kein aktiver Alleinarbeit-Check-in"}
        </div>
        {alleinStatus ? (
          <div>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
              Eingecheckt seit: {alleinStatus.checkInZeit ? new Date(alleinStatus.checkInZeit as any).toLocaleString("de-DE") : "–"}
              {alleinStatus.notfallKontakt ? ` · Notfallkontakt: ${alleinStatus.notfallKontakt}` : ""}
            </div>
            <Button size="sm" onClick={() => checkOut.mutate({ bemerkung: "Einsatz beendet" })} style={{ background: "#16a34a", color: "#fff" }}>
              ✅ Check-out – Einsatz beendet
            </Button>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 13, color: "#374151", marginBottom: 10 }}>
              Wenn Sie alleine bei einem Kunden im Einsatz sind, checken Sie sich bitte ein. Ihr Teamleiter kann Ihren Status dann überwachen.
            </p>
            {!showCheckInForm ? (
              <Button size="sm" onClick={() => setShowCheckInForm(true)}>
                📍 Check-in starten
              </Button>
            ) : (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Notfallkontakt (optional)</label>
                  <input value={notfallKontakt} onChange={(e) => setNotfallKontakt(e.target.value)} placeholder="z.B. Teamleitung: 0123 456789" style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, boxSizing: "border-box" as const }} />
                </div>
                <Button size="sm" onClick={() => { checkIn.mutate({ notfallKontakt: notfallKontakt || undefined }); setShowCheckInForm(false); setNotfallKontakt(""); }}>
                  Einchecken
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowCheckInForm(false)}>Abbrechen</Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Unterweisungen ────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>📋 Meine Unterweisungen</h3>
          {offeneUnterweisungen > 0 && (
            <span style={{ background: "#fee2e2", color: "#dc2626", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>
              {offeneUnterweisungen} ausstehend
            </span>
          )}
        </div>

        {unterweisungen.length === 0 && (
          <div style={{ textAlign: "center", color: "#9ca3af", padding: 24, background: "#f9fafb", borderRadius: 10 }}>Noch keine Unterweisungen zugewiesen</div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {unterweisungen.map((u: any) => {
            const ampel = unterweisungAmpel(u.bestaetigt, u.naechsteFaelligkeit);
            return (
              <div key={u.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{THEMEN_LABELS[u.thema] ?? u.thema}</span>
                      <span style={{ background: ampel.bg, color: ampel.color, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>{ampel.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>
                      Datum: {u.unterweisungsDatum}
                      {u.naechsteFaelligkeit ? ` · Wiederholung fällig: ${u.naechsteFaelligkeit}` : ""}
                    </div>
                    {u.inhalt && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4, fontStyle: "italic" }}>{u.inhalt}</div>}
                    {u.bestaetigt && u.bestaetigtAm && (
                      <div style={{ fontSize: 11, color: "#16a34a", marginTop: 4 }}>
                        ✅ Bestätigt am {new Date(u.bestaetigtAm).toLocaleDateString("de-DE")}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginLeft: 12, flexShrink: 0 }}>
                    {!u.bestaetigt && (
                      <Button size="sm" onClick={() => { setAktiveUnterweisung(u); setUnterschriftDialogOpen(true); }} style={{ background: "#1e3a2f", color: "#fff", whiteSpace: "nowrap" }}>
                        ✍️ Lesen & Unterschreiben
                      </Button>
                    )}
                    {u.bestaetigt && (
                      <Button size="sm" variant="outline" onClick={() => getNachweis.mutate({ unterweisungId: u.id })} disabled={getNachweis.isPending} style={{ whiteSpace: "nowrap", borderColor: "#16a34a", color: "#16a34a" }}>
                        📄 Nachweis-PDF
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Unterschrift-Dialog ────────────────────────────────────── */}
      {aktiveUnterweisung && (
        <UnterschriftDialog
          open={unterschriftDialogOpen}
          onClose={() => { setUnterschriftDialogOpen(false); setAktiveUnterweisung(null); }}
          titel={THEMEN_LABELS[aktiveUnterweisung.thema] ?? aktiveUnterweisung.thema}
          inhalt={aktiveUnterweisung.inhalt}
          isPending={bestaetigenMitUnterschrift.isPending}
          onConfirm={(unterschriftBase64) => {
            bestaetigenMitUnterschrift.mutate({
              unterweisungId: aktiveUnterweisung.id,
              unterschriftBase64,
              ipAdresse: "browser",
              browserInfo: navigator.userAgent,
            });
          }}
        />
      )}
      {/* ── PSA ──────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>🦺 Meine PSA-Ausgaben</h3>
        {psa.length === 0 && (
          <div style={{ textAlign: "center", color: "#9ca3af", padding: 24, background: "#f9fafb", borderRadius: 10 }}>Keine PSA-Ausgaben vorhanden</div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {psa.map((p: any) => (
            <div key={p.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{PSA_LABELS[p.psaTyp] ?? p.psaTyp}</span>
                {p.groesse && <span style={{ color: "#6b7280", fontSize: 12, marginLeft: 8 }}>Größe: {p.groesse}</span>}
                <span style={{ color: "#6b7280", fontSize: 12, marginLeft: 8 }}>Menge: {p.menge}</span>
              </div>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>
                Ausgegeben: {p.ausgabeDatum}
                {p.rueckgabeDatum ? ` · Zurückgegeben: ${p.rueckgabeDatum}` : ""}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Arbeitsmedizinische Vorsorge ──────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>🏥 Meine Vorsorge-Termine</h3>
        {vorsorgen.length === 0 && (
          <div style={{ textAlign: "center", color: "#9ca3af", padding: 24, background: "#f9fafb", borderRadius: 10 }}>Keine Vorsorge-Termine vorhanden</div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {vorsorgen.map((v: any) => {
            const ampel = vorsorgeAmpel(v.faelligkeit, v.durchgefuehrtAm);
            return (
              <div key={v.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{v.anlass}</span>
                      <span style={{ background: "#f3f4f6", color: "#374151", borderRadius: 20, padding: "2px 8px", fontSize: 11 }}>
                        {v.vorsorgeart === "pflicht" ? "Pflicht" : v.vorsorgeart === "angebot" ? "Angebot" : "Wunsch"}
                      </span>
                      <span style={{ background: ampel.bg, color: ampel.color, borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{ampel.label}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                      Fällig: {v.faelligkeit}
                      {v.arzt ? ` · Arzt: ${v.arzt}` : ""}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Alleinarbeit-Verlauf ──────────────────────────────────────────── */}
      {alleinVerlauf.length > 0 && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>📅 Alleinarbeit-Verlauf (letzte 30 Einträge)</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {alleinVerlauf.map((a: any) => (
              <div key={a.id} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 12, display: "flex", justifyContent: "space-between" }}>
                <span>
                  {a.checkInZeit ? new Date(a.checkInZeit as any).toLocaleDateString("de-DE") : "–"}
                  {" "}
                  {a.checkInZeit ? new Date(a.checkInZeit as any).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : ""}
                  {" → "}
                  {a.checkOutZeit ? new Date(a.checkOutZeit as any).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "noch offen"}
                </span>
                <span style={{ color: a.checkInStatus === "ausgecheckt" ? "#16a34a" : a.checkInStatus === "notfall" ? "#dc2626" : "#ca8a04", fontWeight: 600 }}>
                  {a.checkInStatus === "ausgecheckt" ? "✅ Abgeschlossen" : a.checkInStatus === "notfall" ? "🚨 Notfall" : "🟡 Aktiv"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
