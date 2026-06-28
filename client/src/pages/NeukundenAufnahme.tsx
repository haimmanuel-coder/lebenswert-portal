import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import SignatureCanvas from "@/components/SignatureCanvas";
import jsPDF from "jspdf";

type Step = 1 | 2 | 3 | 4;

function generateVollmachtPdf(data: {
  vorname: string; nachname: string; geburtsdatum: string;
  strasse: string; plz: string; ort: string; telefon: string;
  pflegegrad: number; kostentraeger: string; versicherungsnummer: string;
  paragraph: string; vollmachtUnterschrift?: string; kundenUnterschrift?: string;
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const green = [74, 140, 63] as [number, number, number];
  const darkGreen = [26, 46, 26] as [number, number, number];

  // Header
  doc.setFillColor(...green);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16); doc.setFont("helvetica", "bold");
  doc.text("Lebensnah Betreuung", 15, 12);
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.text("Neukundenaufnahme – Vollmacht & Stammdaten", 15, 20);
  doc.text(new Date().toLocaleDateString("de-DE"), 195, 20, { align: "right" });

  // Stammdaten
  doc.setTextColor(...darkGreen);
  doc.setFontSize(13); doc.setFont("helvetica", "bold");
  doc.text("Stammdaten", 15, 40);
  doc.setDrawColor(...green); doc.setLineWidth(0.5);
  doc.line(15, 42, 195, 42);

  const rows = [
    ["Name:", `${data.vorname} ${data.nachname}`],
    ["Geburtsdatum:", data.geburtsdatum ? new Date(data.geburtsdatum).toLocaleDateString("de-DE") : "–"],
    ["Adresse:", `${data.strasse}, ${data.plz} ${data.ort}`],
    ["Telefon:", data.telefon || "–"],
    ["Pflegegrad:", data.pflegegrad ? `Pflegegrad ${data.pflegegrad}` : "–"],
    ["Kostenträger:", data.kostentraeger || "–"],
    ["Versicherungsnummer:", data.versicherungsnummer || "–"],
    ["Leistungsart:", `§ ${data.paragraph}`],
  ];
  doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(50, 50, 50);
  rows.forEach(([label, value], i) => {
    const y = 50 + i * 9;
    doc.setFont("helvetica", "bold"); doc.text(label, 15, y);
    doc.setFont("helvetica", "normal"); doc.text(value, 65, y);
  });

  // Vollmacht-Text
  doc.setTextColor(...darkGreen);
  doc.setFontSize(13); doc.setFont("helvetica", "bold");
  doc.text("Vollmacht", 15, 130);
  doc.setDrawColor(...green); doc.line(15, 132, 195, 132);
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(50, 50, 50);
  const vollmachtText = `Ich, ${data.vorname} ${data.nachname}, bevollmächtige hiermit die Lebensnah Betreuung, mich gegenüber meiner Pflegekasse und dem zuständigen Kostenträger (${data.kostentraeger || "–"}) zu vertreten und in meinem Namen Budgetabfragen durchzuführen, Leistungsnachweise einzureichen sowie alle für die Betreuungsleistungen nach § ${data.paragraph} SGB XI notwendigen Korrespondenzen zu führen. Diese Vollmacht gilt bis auf Widerruf.`;
  const lines = doc.splitTextToSize(vollmachtText, 180);
  doc.text(lines, 15, 140);

  // Unterschriften
  const sigY = 200;
  doc.setTextColor(...darkGreen); doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text("Unterschrift Mitarbeiter:", 15, sigY);
  doc.text("Unterschrift Kunde:", 110, sigY);
  doc.setDrawColor(200, 200, 200);
  doc.rect(15, sigY + 3, 80, 25);
  doc.rect(110, sigY + 3, 80, 25);
  if (data.vollmachtUnterschrift) {
    try { doc.addImage(data.vollmachtUnterschrift, "PNG", 16, sigY + 4, 78, 23); } catch {}
  }
  if (data.kundenUnterschrift) {
    try { doc.addImage(data.kundenUnterschrift, "PNG", 111, sigY + 4, 78, 23); } catch {}
  }
  doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
  doc.text(`Datum: ${new Date().toLocaleDateString("de-DE")}`, 15, sigY + 35);

  doc.save(`Vollmacht_${data.nachname}_${data.vorname}.pdf`);
}

export default function NeukundenAufnahme() {
  const [step, setStep] = useState<Step>(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState({
    vorname: "", nachname: "", geburtsdatum: "",
    strasse: "", plz: "", ort: "", telefon: "", email: "",
    pflegegrad: "" as string, kostentraeger: "", versicherungsnummer: "",
    paragraph: "45b" as "45b" | "45a" | "39", notizen: "",
  });
  const [previewMitarbeiter, setPreviewMitarbeiter] = useState<string | null>(null);
  const [previewKunde, setPreviewKunde] = useState<string | null>(null);
  const sigMitarbeiterRef = useRef<import("@/components/SignatureCanvas").SignatureCanvasRef>(null);
  const sigKundeRef = useRef<import("@/components/SignatureCanvas").SignatureCanvasRef>(null);

  const { data: aufnahmen = [], refetch, isLoading: aufnahmenLoading, isError: aufnahmenError } = trpc.neukundenaufnahme.list.useQuery(undefined, { retry: false });
  const createAufnahme = trpc.neukundenaufnahme.create.useMutation({
    onSuccess: () => {
      toast.success("✅ Neukundenaufnahme gespeichert");
      setSheetOpen(false);
      setStep(1);
      setForm({ vorname: "", nachname: "", geburtsdatum: "", strasse: "", plz: "", ort: "", telefon: "", email: "", pflegegrad: "", kostentraeger: "", versicherungsnummer: "", paragraph: "45b", notizen: "" });
      setPreviewMitarbeiter(null); setPreviewKunde(null);
      refetch();
    },
    onError: (e) => toast.error("❌ " + e.message),
  });

  const f = (key: keyof typeof form, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = () => {
    if (!form.vorname || !form.nachname) { toast.error("Vor- und Nachname sind Pflichtfelder"); return; }
    const vollmachtUnterschrift = sigMitarbeiterRef.current?.isEmpty() ? undefined : sigMitarbeiterRef.current?.toDataURL() ?? undefined;
    const kundenUnterschrift = sigKundeRef.current?.isEmpty() ? undefined : sigKundeRef.current?.toDataURL() ?? undefined;
    createAufnahme.mutate({
      ...form,
      pflegegrad: form.pflegegrad ? parseInt(form.pflegegrad) : undefined,
      vollmachtUnterschrift,
      kundenUnterschrift,
    });
  };

  const handlePdf = (a: any) => {
    generateVollmachtPdf({
      vorname: a.vorname, nachname: a.nachname, geburtsdatum: a.geburtsdatum ?? "",
      strasse: a.strasse ?? "", plz: a.plz ?? "", ort: a.ort ?? "",
      telefon: a.telefon ?? "", pflegegrad: a.pflegegrad ?? 0,
      kostentraeger: a.kostentraeger ?? "", versicherungsnummer: a.versicherungsnummer ?? "",
      paragraph: a.paragraph ?? "45b",
      vollmachtUnterschrift: a.vollmacht_unterschrift ?? undefined,
      kundenUnterschrift: a.kunden_unterschrift ?? undefined,
    });
  };

  const aufnahmenArr = Array.isArray(aufnahmen) ? aufnahmen : [];

  const statusColor: Record<string, { bg: string; color: string; label: string }> = {
    aufgenommen: { bg: "#dbeafe", color: "#1e40af", label: "Aufgenommen" },
    in_bearbeitung: { bg: "#fef3c7", color: "#d97706", label: "In Bearbeitung" },
    abgeschlossen: { bg: "#d1fae5", color: "#166534", label: "Abgeschlossen" },
  };

  const inputStyle: React.CSSProperties = { width: "100%", padding: "11px 13px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 5 };

  return (
    <div style={{ padding: "20px 16px", maxWidth: 600, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1a2e1a", margin: 0 }}>👤 Neukundenaufnahme</h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>Stammdaten erfassen & Vollmacht erstellen</p>
        </div>
        <button onClick={() => { setSheetOpen(true); setStep(1); }} style={{ background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          + Neuer Kunde
        </button>
      </div>

      {/* Liste */}
      {aufnahmenLoading ? (
        <div style={{ textAlign: "center", padding: "30px 20px", color: "#9ca3af" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
          <div>Lade Neukundenaufnahmen...</div>
        </div>
      ) : aufnahmenError ? (
        <div style={{ textAlign: "center", padding: "30px 20px", color: "#dc2626", background: "#fee2e2", borderRadius: 10 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>❌</div>
          <div style={{ fontWeight: 700 }}>Fehler beim Laden</div>
          <button onClick={() => refetch()} style={{ marginTop: 10, padding: "8px 16px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>Erneut versuchen</button>
        </div>
      ) : aufnahmenArr.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#9ca3af" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>👤</div>
          <div style={{ fontWeight: 600 }}>Noch keine Neuaufnahmen erfasst</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {aufnahmenArr.map((a: any) => {
            const st = statusColor[a.status] ?? statusColor.aufgenommen;
            return (
              <div key={a.id} style={{ background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: "#1a2e1a" }}>{a.vorname} {a.nachname}</div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                      {a.ort && `${a.plz} ${a.ort} · `}
                      {a.pflegegrad && `Pflegegrad ${a.pflegegrad} · `}
                      §{a.paragraph}
                    </div>
                    {a.kostentraeger && <div style={{ fontSize: 12, color: "#6b7280" }}>{a.kostentraeger}</div>}
                    <div style={{ marginTop: 6 }}>
                      <span style={{ background: st.bg, color: st.color, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{st.label}</span>
                    </div>
                  </div>
                  <button onClick={() => handlePdf(a)} style={{ background: "#f0fdf4", color: "#166534", border: "1.5px solid #86efac", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                    📄 Vollmacht PDF
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Sheet – Mehrstufiges Formular */}
      {sheetOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000 }}>
          <div onClick={() => setSheetOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#fff", borderRadius: "20px 20px 0 0", padding: "24px 20px 36px", maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ width: 40, height: 4, background: "#d1d5db", borderRadius: 2, margin: "0 auto 16px" }} />

            {/* Schritt-Anzeige */}
            <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
              {([1, 2, 3, 4] as Step[]).map(s => (
                <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: step >= s ? "#4a8c3f" : "#e5e7eb" }} />
              ))}
            </div>

            {/* Schritt 1: Persönliche Daten */}
            {step === 1 && (
              <>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: "#1a2e1a", marginBottom: 16 }}>Schritt 1 – Persönliche Daten</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div><label style={labelStyle}>Vorname *</label><input style={inputStyle} value={form.vorname} onChange={e => f("vorname", e.target.value)} placeholder="Maria" /></div>
                  <div><label style={labelStyle}>Nachname *</label><input style={inputStyle} value={form.nachname} onChange={e => f("nachname", e.target.value)} placeholder="Müller" /></div>
                </div>
                <div style={{ marginBottom: 12 }}><label style={labelStyle}>Geburtsdatum</label><input type="date" style={inputStyle} value={form.geburtsdatum} onChange={e => f("geburtsdatum", e.target.value)} /></div>
                <div style={{ marginBottom: 12 }}><label style={labelStyle}>Telefon</label><input style={inputStyle} value={form.telefon} onChange={e => f("telefon", e.target.value)} placeholder="0123 456789" /></div>
                <div style={{ marginBottom: 20 }}><label style={labelStyle}>E-Mail</label><input style={inputStyle} value={form.email} onChange={e => f("email", e.target.value)} placeholder="maria@beispiel.de" /></div>
                <button onClick={() => { if (!form.vorname || !form.nachname) { toast.error("Vor- und Nachname sind Pflichtfelder"); return; } setStep(2); }} style={{ width: "100%", padding: 13, background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Weiter →</button>
              </>
            )}

            {/* Schritt 2: Adresse & Pflegedaten */}
            {step === 2 && (
              <>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: "#1a2e1a", marginBottom: 16 }}>Schritt 2 – Adresse & Pflegedaten</h2>
                <div style={{ marginBottom: 12 }}><label style={labelStyle}>Straße & Hausnummer</label><input style={inputStyle} value={form.strasse} onChange={e => f("strasse", e.target.value)} placeholder="Musterstraße 12" /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, marginBottom: 12 }}>
                  <div><label style={labelStyle}>PLZ</label><input style={inputStyle} value={form.plz} onChange={e => f("plz", e.target.value)} placeholder="12345" /></div>
                  <div><label style={labelStyle}>Ort</label><input style={inputStyle} value={form.ort} onChange={e => f("ort", e.target.value)} placeholder="Musterstadt" /></div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Pflegegrad</label>
                  <select style={inputStyle} value={form.pflegegrad} onChange={e => f("pflegegrad", e.target.value)}>
                    <option value="">– Pflegegrad wählen –</option>
                    {[1,2,3,4,5].map(g => <option key={g} value={g}>Pflegegrad {g}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Leistungsart (Paragraph)</label>
                  <select style={inputStyle} value={form.paragraph} onChange={e => f("paragraph", e.target.value as any)}>
                    <option value="45b">§ 45b – Entlastungsleistungen</option>
                    <option value="45a">§ 45a – Angebote zur Unterstützung</option>
                    <option value="39">§ 39 – Kurzzeitpflege</option>
                  </select>
                </div>
                <div style={{ marginBottom: 20 }}><label style={labelStyle}>Notizen</label><textarea style={{ ...inputStyle, resize: "none", minHeight: 60 }} value={form.notizen} onChange={e => f("notizen", e.target.value)} placeholder="Besonderheiten, Hinweise..." /></div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setStep(1)} style={{ flex: 1, padding: 13, background: "#f4f6f3", color: "#6b7280", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>← Zurück</button>
                  <button onClick={() => setStep(3)} style={{ flex: 2, padding: 13, background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Weiter →</button>
                </div>
              </>
            )}

            {/* Schritt 3: Kostenträger */}
            {step === 3 && (
              <>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: "#1a2e1a", marginBottom: 16 }}>Schritt 3 – Kostenträger</h2>
                <div style={{ marginBottom: 12 }}><label style={labelStyle}>Kostenträger / Krankenkasse</label><input style={inputStyle} value={form.kostentraeger} onChange={e => f("kostentraeger", e.target.value)} placeholder="z.B. AOK Bayern" /></div>
                <div style={{ marginBottom: 20 }}><label style={labelStyle}>Versicherungsnummer</label><input style={inputStyle} value={form.versicherungsnummer} onChange={e => f("versicherungsnummer", e.target.value)} placeholder="A123456789" /></div>
                <div style={{ background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: 10, padding: "12px 14px", marginBottom: 20, fontSize: 12, color: "#1e40af" }}>
                  <strong>ℹ️ Dauervollmacht:</strong> Im nächsten Schritt unterschreiben Mitarbeiter und Kunde die Vollmacht. Diese berechtigt Lebensnah Betreuung, Budgetabfragen beim Kostenträger durchzuführen.
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setStep(2)} style={{ flex: 1, padding: 13, background: "#f4f6f3", color: "#6b7280", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>← Zurück</button>
                  <button onClick={() => setStep(4)} style={{ flex: 2, padding: 13, background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Weiter →</button>
                </div>
              </>
            )}

            {/* Schritt 4: Unterschriften */}
            {step === 4 && (
              <>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: "#1a2e1a", marginBottom: 16 }}>Schritt 4 – Unterschriften & Vollmacht</h2>
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Unterschrift Mitarbeiter</label>
                  <SignatureCanvas ref={sigMitarbeiterRef} height={110} onDrawEnd={url => setPreviewMitarbeiter(url)} onClear={() => setPreviewMitarbeiter(null)} />
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                    <button onClick={() => sigMitarbeiterRef.current?.clear()} style={{ padding: "6px 12px", background: "#fff", color: "#dc2626", border: "2px solid #fca5a5", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>↺ Zurücksetzen</button>
                    {previewMitarbeiter && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 8, padding: "4px 10px 4px 6px", flex: 1 }}>
                        <img src={previewMitarbeiter} alt="Vorschau" style={{ height: 32, width: 72, objectFit: "contain", background: "#fff", borderRadius: 4 }} />
                        <span style={{ fontSize: 11, color: "#166534", fontWeight: 600 }}>✅ Erkannt</span>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>Unterschrift Kunde</label>
                  <div style={{ background: "#f0fdf4", border: "2px solid #86efac", borderRadius: 10, padding: "10px 10px 6px", marginBottom: 2 }}>
                    <div style={{ fontSize: 11, color: "#166534", marginBottom: 6, fontWeight: 600 }}>Bitte Kunden hier unterschreiben lassen:</div>
                    <SignatureCanvas ref={sigKundeRef} height={110} onDrawEnd={url => setPreviewKunde(url)} onClear={() => setPreviewKunde(null)} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                    <button onClick={() => sigKundeRef.current?.clear()} style={{ padding: "6px 12px", background: "#fff", color: "#dc2626", border: "2px solid #fca5a5", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>↺ Zurücksetzen</button>
                    {previewKunde && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 8, padding: "4px 10px 4px 6px", flex: 1 }}>
                        <img src={previewKunde} alt="Vorschau" style={{ height: 32, width: 72, objectFit: "contain", background: "#fff", borderRadius: 4 }} />
                        <span style={{ fontSize: 11, color: "#166534", fontWeight: 600 }}>✅ Erkannt</span>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setStep(3)} style={{ flex: 1, padding: 13, background: "#f4f6f3", color: "#6b7280", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>← Zurück</button>
                  <button onClick={handleSave} disabled={createAufnahme.isPending} style={{ flex: 2, padding: 13, background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                    {createAufnahme.isPending ? "Speichern..." : "✅ Aufnahme abschließen"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
