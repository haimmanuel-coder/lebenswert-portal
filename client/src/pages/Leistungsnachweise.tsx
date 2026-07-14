import { useState, useRef } from "react";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import BottomSheet from "@/components/BottomSheet";
import SignatureCanvas from "@/components/SignatureCanvas";
import { generateLeistungsnachweisPdf } from "@/lib/pdfGenerator";

function fmtMonat(m: string) {
  if (!m) return "–";
  const [y, mo] = m.split("-");
  const n = ["", "Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  return `${n[parseInt(mo)]} ${y}`;
}

const statusColors: Record<string, { bg: string; color: string }> = {
  offen: { bg: "#fef3c7", color: "#92400e" },
  pruefung: { bg: "#e0f2f0", color: "#2a9d8f" },
  freigegeben: { bg: "#e8f5e4", color: "#4a8c3f" },
  versendet: { bg: "#f3f4f6", color: "#4b5563" },
};

export default function Leistungsnachweise() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const [monat, setMonat] = useState(today.slice(0, 7));
  const [kundenId, setKundenId] = useState("");
  const [para, setPara] = useState<"45b" | "45a" | "39">("45b");
  const [stunden, setStunden] = useState("8");
  const [anzahl, setAnzahl] = useState("4");
  const [bemerkung, setBemerkung] = useState("");
  const sigRef = useRef<import("@/components/SignatureCanvas").SignatureCanvasRef>(null);
  const sigKundeRef = useRef<import("@/components/SignatureCanvas").SignatureCanvasRef>(null);
  const [previewMitarbeiter, setPreviewMitarbeiter] = useState<string | null>(null);
  const [previewKunde, setPreviewKunde] = useState<string | null>(null);
  const [signaturMitarbeiter, setSignaturMitarbeiter] = useState<string | null>(null);
  const [signaturKunde, setSignaturKunde] = useState<string | null>(null);

  const { data: kunden = [] } = trpc.kunden.list.useQuery();
  const getKundeName = (id: number) => { const k = kunden.find((c) => c.id === id); return k ? `${k.vorname} ${k.nachname}` : `Kunde #${id}`; };
  const { data: leistungen = [], refetch } = trpc.leistungen.list.useQuery();
  const deleteLeistung = trpc.leistungen.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("🗑️ Leistungsnachweis gelöscht"); },
    onError: (e) => toast.error("❌ " + e.message),
  });
  const createLeistung = trpc.leistungen.create.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("✅ Nachweis eingereicht");
      setSheetOpen(false);
      setKundenId(""); setStunden("8"); setAnzahl("4"); setBemerkung("");
      sigRef.current?.clear();
      sigKundeRef.current?.clear();
      setPreviewMitarbeiter(null);
      setPreviewKunde(null);
      setSignaturMitarbeiter(null);
      setSignaturKunde(null);
    },
    onError: (e) => toast.error("❌ " + e.message),
  });

  const rate = para === "39" ? 50 : 39;
  const betragPreview = ((parseFloat(stunden) || 0) * rate + (parseInt(anzahl) || 0) * 6).toFixed(2);

  // Budget-Anzeige für ausgewählten Kunden
  const selectedKunde = kunden.find((k) => String(k.id) === kundenId);
  const budgetFeld = para === "45b" ? "budget45b" : para === "45a" ? "budget45a" : "budget39";
  const verbrauchtFeld = para === "45b" ? "verbraucht45b" : para === "45a" ? "verbraucht45a" : "verbraucht39";
  const budgetGesamt = parseFloat(String((selectedKunde as any)?.[budgetFeld] ?? 0));
  const budgetVerbraucht = parseFloat(String((selectedKunde as any)?.[verbrauchtFeld] ?? 0));
  const budgetRest = Math.max(0, budgetGesamt - budgetVerbraucht);
  const budgetProzent = budgetGesamt > 0 ? Math.min(100, (budgetVerbraucht / budgetGesamt) * 100) : 0;
  const budgetKritisch = budgetProzent >= 90;
  const neuerBetrag = para === "39" ? 1612 : (parseFloat(stunden) || 0) * 125;
  const budgetNachEintrag = Math.max(0, budgetRest - neuerBetrag);

  const saveLnw = () => {
    if (!monat || !kundenId) { toast.error("Bitte alle Felder ausfüllen!"); return; }
    createLeistung.mutate({
      kundenId: parseInt(kundenId),
      monat,
      paragraph: para,
      stunden: parseFloat(stunden) || 0,
      anzahlEinsaetze: parseInt(anzahl) || 1,
      bemerkung,
      unterschriftLeister: signaturMitarbeiter ?? undefined,
      unterschriftKunde: signaturKunde ?? undefined,
    });
  };

  const { mitarbeiter } = usePortalAuth();

  const handlePdfDownload = (l: typeof leistungen[0]) => {
    const kunde = kunden.find((k) => k.id === l.kundenId);
    if (!kunde) { toast.error("Kundendaten nicht gefunden"); return; }
    generateLeistungsnachweisPdf({
      kundeVorname: kunde.vorname,
      kundeNachname: kunde.nachname,
      kundeGeburtsdatum: (kunde as any).geburtsdatum,
      kundeStrasse: kunde.strasse,
      kundePlz: kunde.plz,
      kundeOrt: kunde.ort,
      kundeVersicherungsnummer: (kunde as any).versicherungsnummer,
      kundeKostentraeger: (kunde as any).kostentraeger,
      kundePflegegrad: kunde.pflegegrad,
      monat: l.monat,
      paragraph: l.paragraph,
      stunden: parseFloat(String(l.stunden || 0)),
      anzahlEinsaetze: l.anzahlEinsaetze || 1,
      betrag: parseFloat(String(l.betrag || 0)),
      status: l.status,
      createdAt: l.createdAt,
      unterschriftMitarbeiter: (l as any).unterschriftLeister,
      unterschriftKunde: (l as any).unterschriftKunde,
      mitarbeiterName: mitarbeiter ? `${mitarbeiter.vorname} ${mitarbeiter.nachname}` : "Mitarbeiter",
      mitarbeiterPosition: (mitarbeiter as any)?.position,
    });
    toast.success("📄 PDF wird heruntergeladen...");
  };

  const sorted = [...leistungen].sort((a, b) => b.monat.localeCompare(a.monat));

  return (
    <div className="page-enter">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Leistungsnachweise</div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>§§ 39, 45a, 45b SGB XI</div>
        </div>
        <button
          onClick={() => setSheetOpen(true)}
          style={{ padding: "9px 16px", background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >
          + Neu
        </button>
      </div>

      {sorted.length === 0 ? (
        <p style={{ color: "#6b7280", fontSize: 13 }}>Noch keine Leistungsnachweise.</p>
      ) : (
        sorted.map((l) => {
          const sc = statusColors[l.status] || statusColors.versendet;
          return (
            <div key={l.id} style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,.08)", padding: 14, marginBottom: 10 }}>
              <div className="list-item" style={{ padding: 0, border: "none" }}>
                <div className={`li-icon ${l.status === "freigegeben" ? "teal" : ""}`}>
                  {l.status === "freigegeben" ? "✅" : l.status === "offen" ? "📋" : "📄"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{getKundeName(l.kundenId)}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                    {fmtMonat(l.monat)} · {l.stunden}h · §{l.paragraph}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{parseFloat(String(l.betrag || 0)).toFixed(2)} €</div>
                  <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>
                    {l.status}
                  </span>
                  <button
                    onClick={() => handlePdfDownload(l)}
                    title="PDF herunterladen"
                    style={{ display: "block", marginTop: 6, padding: "4px 10px", background: "#e8f5e4", color: "#4a8c3f", border: "1.5px solid #4a8c3f", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                  >
                    📄 PDF
                  </button>
                  <button
                    onClick={() => { if (confirm("Leistungsnachweis wirklich löschen?")) deleteLeistung.mutate({ id: l.id }); }}
                    title="Löschen"
                    disabled={deleteLeistung.isPending}
                    style={{ display: "block", marginTop: 4, padding: "4px 10px", background: "#fee2e2", color: "#dc2626", border: "1.5px solid #dc2626", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                  >
                    🗑️ Löschen
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Einreich-Sheet */}
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Leistungsnachweis einreichen">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 5 }}>Monat</label>
            <input type="month" value={monat} onChange={(e) => setMonat(e.target.value)}
              style={{ width: "100%", padding: "12px 13px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 15, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 5 }}>Kunde</label>
            <select value={kundenId} onChange={(e) => setKundenId(e.target.value)}
              style={{ width: "100%", padding: "12px 13px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 15, outline: "none", background: "#fff", boxSizing: "border-box" }}>
              <option value="">Wählen...</option>
              {kunden.map((k) => (
                <option key={k.id} value={k.id}>{k.vorname} {k.nachname}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        {/* Budget-Anzeige */}
        {selectedKunde && budgetGesamt > 0 && (
          <div style={{ marginBottom: 14, padding: "12px 14px", borderRadius: 10, background: budgetKritisch ? "#fef2f2" : "#f0fdf4", border: `2px solid ${budgetKritisch ? "#fca5a5" : "#86efac"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: budgetKritisch ? "#dc2626" : "#166534" }}>
                {budgetKritisch ? "⚠️" : "💰"} Budget §{para} – {selectedKunde.vorname} {selectedKunde.nachname}
              </span>
              <span style={{ fontSize: 12, fontWeight: 800, color: budgetKritisch ? "#dc2626" : "#166534" }}>
                {budgetRest.toFixed(2)} € verbleibend
              </span>
            </div>
            <div style={{ background: "#e5e7eb", borderRadius: 6, height: 8, overflow: "hidden", marginBottom: 6 }}>
              <div style={{ height: "100%", borderRadius: 6, background: budgetKritisch ? "#ef4444" : budgetProzent >= 70 ? "#f59e0b" : "#4a8c3f", width: `${budgetProzent}%`, transition: "width 0.3s" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6b7280" }}>
              <span>Verbraucht: {budgetVerbraucht.toFixed(2)} €</span>
              <span>Gesamt: {budgetGesamt.toFixed(2)} €</span>
            </div>
            {neuerBetrag > 0 && (
              <div style={{ marginTop: 8, padding: "6px 10px", background: budgetNachEintrag < 0 ? "#fee2e2" : "#e0f2f0", borderRadius: 8, fontSize: 12, fontWeight: 700, color: budgetNachEintrag < 0 ? "#dc2626" : "#2a9d8f" }}>
                {budgetNachEintrag < 0
                  ? `⚠️ Budget wird überschritten! Fehlbetrag: ${Math.abs(budgetNachEintrag).toFixed(2)} €`
                  : `→ Nach Eintrag verbleiben: ${budgetNachEintrag.toFixed(2)} €`
                }
              </div>
            )}
          </div>
        )}

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 5 }}>Paragraph</label>
            <select value={para} onChange={(e) => setPara(e.target.value as typeof para)}
              style={{ width: "100%", padding: "12px 13px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 15, outline: "none", background: "#fff", boxSizing: "border-box" }}>
              <option value="45b">§45b SGB XI</option>
              <option value="45a">§45a SGB XI</option>
              <option value="39">§39 SGB XI</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 5 }}>Stunden</label>
            <input type="number" value={stunden} onChange={(e) => setStunden(e.target.value)} min="0.5" step="0.5" inputMode="decimal"
              style={{ width: "100%", padding: "12px 13px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 15, outline: "none", boxSizing: "border-box" }} />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 5 }}>Anzahl Einsätze</label>
          <input type="number" value={anzahl} onChange={(e) => setAnzahl(e.target.value)} min="1" inputMode="numeric"
            style={{ width: "100%", padding: "12px 13px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 15, outline: "none", boxSizing: "border-box" }} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 5 }}>Bemerkung</label>
          <textarea value={bemerkung} onChange={(e) => setBemerkung(e.target.value)} placeholder="Optional..."
            style={{ width: "100%", padding: "12px 13px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 15, outline: "none", resize: "none", minHeight: 60, fontFamily: "inherit", boxSizing: "border-box" }} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 5 }}>Unterschrift Mitarbeiter</label>
          <SignatureCanvas
            ref={sigRef}
            height={120}
            value={signaturMitarbeiter}
            onDrawEnd={(url) => {
              setSignaturMitarbeiter(url);
              setPreviewMitarbeiter(url);
            }}
            onClear={() => {
              setSignaturMitarbeiter(null);
              setPreviewMitarbeiter(null);
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
            <button
              onClick={() => { sigRef.current?.clear(); }}
              style={{ padding: "7px 14px", background: "#fff", color: "#dc2626", border: "2px solid #fca5a5", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}
            >
              <span style={{ fontSize: 14 }}>↺</span> Neu unterschreiben
            </button>
            {previewMitarbeiter && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 8, padding: "4px 10px 4px 6px", flex: 1, minWidth: 0 }}>
                <img src={previewMitarbeiter} alt="Vorschau Mitarbeiter" style={{ height: 36, width: 80, objectFit: "contain", background: "#fff", borderRadius: 4, border: "1px solid #d1fae5" }} />
                <span style={{ fontSize: 11, color: "#166534", fontWeight: 600 }}>✅ Unterschrift erkannt</span>
              </div>
            )}
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 5 }}>
            Unterschrift Kunde
            <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 400, color: "#9ca3af", textTransform: "none" }}>(optional)</span>
          </label>
          <div style={{ background: "#f0fdf4", border: "2px solid #86efac", borderRadius: 10, padding: "10px 10px 6px", marginBottom: 2 }}>
            <div style={{ fontSize: 11, color: "#166534", marginBottom: 6, fontWeight: 600 }}>Bitte Kunden hier unterschreiben lassen:</div>
            <SignatureCanvas
              ref={sigKundeRef}
              height={120}
              value={signaturKunde}
              onDrawEnd={(url) => {
                setSignaturKunde(url);
                setPreviewKunde(url);
              }}
              onClear={() => {
                setSignaturKunde(null);
                setPreviewKunde(null);
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
            <button
              onClick={() => { sigKundeRef.current?.clear(); }}
              style={{ padding: "7px 14px", background: "#fff", color: "#dc2626", border: "2px solid #fca5a5", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}
            >
              <span style={{ fontSize: 14 }}>↺</span> Neu unterschreiben
            </button>
            {previewKunde && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 8, padding: "4px 10px 4px 6px", flex: 1, minWidth: 0 }}>
                <img src={previewKunde} alt="Vorschau Kunde" style={{ height: 36, width: 80, objectFit: "contain", background: "#fff", borderRadius: 4, border: "1px solid #d1fae5" }} />
                <span style={{ fontSize: 11, color: "#166534", fontWeight: 600 }}>✅ Unterschrift erkannt</span>
              </div>
            )}
          </div>
        </div>

        {/* Betragsvorschau */}
        <div style={{ background: "#dbeafe", border: "1px solid #93c5fd", color: "#1e40af", padding: "11px 13px", borderRadius: 10, fontSize: 13, marginBottom: 14 }}>
          Geschätzter Betrag: {betragPreview} € ({stunden}h × {rate} € + {anzahl} × 6 € Pauschale)
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 20, paddingTop: 16, borderTop: "1px solid #e5e7eb" }}>
          <button onClick={() => setSheetOpen(false)} style={{ flex: 1, padding: 13, background: "#f4f6f3", color: "#6b7280", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Abbrechen</button>
          <button onClick={saveLnw} disabled={createLeistung.isPending} style={{ flex: 1, padding: 13, background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            {createLeistung.isPending ? "Einreichen…" : "Einreichen"}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
