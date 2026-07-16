import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import BottomSheet from "@/components/BottomSheet";
import SignatureCanvas from "@/components/SignatureCanvas";
import { saveOfflineEinsatz } from "@/hooks/useOfflineSync";

function fmtDate(d: string | Date | null) {
  if (!d) return "–";
  const s = typeof d === "string" ? d : d.toISOString().split("T")[0];
  const [y, m, day] = s.split("-");
  return `${day}.${m}.${y}`;
}

function getParagraphBadge(para: string) {
  if (para === "39") return { cls: "badge-purple", label: "§39" };
  if (para === "45a") return { cls: "badge-teal", label: "§45a" };
  return { cls: "badge-green", label: "§45b" };
}

function getStatusBadge(status: string) {
  if (status === "abgeschlossen") return { cls: "badge-teal", label: "Abgeschlossen" };
  if (status === "abgesagt") return { cls: "badge-red", label: "Abgesagt" };
  return { cls: "badge-yellow", label: "Geplant" };
}

type FilterType = "alle" | "geplant" | "abgeschlossen";

export default function Einsaetze() {
  const [filter, setFilter] = useState<FilterType>("alle");
  const [abschlussOpen, setAbschlussOpen] = useState(false);
  const [activeEinsatz, setActiveEinsatz] = useState<{ id: number; name: string; datum: string; dauerStunden?: number | null } | null>(null);
  const [bericht, setBericht] = useState("");
  const [gesundheit, setGesundheit] = useState<"gut" | "stabil" | "auffaellig" | "kritisch">("gut");
  const [bemerkung, setBemerkung] = useState("");
  const sigRef = useRef<import("@/components/SignatureCanvas").SignatureCanvasRef>(null);
  const sigKundeRef = useRef<import("@/components/SignatureCanvas").SignatureCanvasRef>(null);
  const [previewMitarbeiter, setPreviewMitarbeiter] = useState<string | null>(null);
  const [previewKunde, setPreviewKunde] = useState<string | null>(null);
  const [signaturMitarbeiter, setSignaturMitarbeiter] = useState<string | null>(null);
  const [signaturKunde, setSignaturKunde] = useState<string | null>(null);

  const { data: einsaetze = [], refetch } = trpc.einsaetze.listWithKunden.useQuery();
  const { data: kunden = [] } = trpc.kunden.list.useQuery();
  const getKundeName = (id: number) => { const k = kunden.find((c) => c.id === id); return k ? `${k.vorname} ${k.nachname}` : `Kunde #${id}`; };
  const updateStatus = trpc.einsaetze.updateStatus.useMutation({
    onSuccess: () => { refetch(); toast.success("✅ Einsatz abgeschlossen"); setAbschlussOpen(false); },
    onError: async (e) => {
      // Bei Netzwerkfehler: Offline-Queue nutzen
      if (!navigator.onLine && activeEinsatz) {
        try {
          const kunde = kunden.find((k) => k.id === activeEinsatz.id);
          await saveOfflineEinsatz({
            kundenId: activeEinsatz.id,
            datum: activeEinsatz.datum,
            paragraph: "45b",
            bericht,
          });
          toast.warning("📡 Offline gespeichert – wird beim nächsten Online-Gang synchronisiert");
          setAbschlussOpen(false);
        } catch {
          toast.error("❌ " + e.message);
        }
      } else {
        toast.error("❌ " + e.message);
      }
    },
  });

  const filtered = filter === "alle" ? einsaetze : einsaetze.filter((e) => e.status === filter);
  const sorted = [...filtered].sort((a, b) => {
    const da = typeof a.datum === "string" ? a.datum : (a.datum as Date).toISOString().split("T")[0];
    const db2 = typeof b.datum === "string" ? b.datum : (b.datum as Date).toISOString().split("T")[0];
    return db2.localeCompare(da);
  });

  const handleAbschluss = (id: number, name: string, datum: string, dauerStunden?: number | null) => {
    setActiveEinsatz({ id, name, datum, dauerStunden });
    setBericht(""); setBemerkung(""); setGesundheit("gut");
    setSignaturMitarbeiter(null);
    setSignaturKunde(null);
    setPreviewMitarbeiter(null);
    setPreviewKunde(null);
    setAbschlussOpen(true);
  };

  const saveAbschluss = () => {
    if (!activeEinsatz) return;
    const unterschriftMitarbeiter = signaturMitarbeiter ?? undefined;
    const unterschriftKunde = signaturKunde ?? undefined;
    updateStatus.mutate({
      id: activeEinsatz.id,
      status: "abgeschlossen",
      bericht,
      gesundheit,
      bemerkung,
      unterschriftMitarbeiter,
      unterschriftKunde,
    });
  };

  const filterBtns: { key: FilterType; label: string; cls: string }[] = [
    { key: "alle", label: "Alle", cls: "badge-green" },
    { key: "geplant", label: "Geplant", cls: "badge-gray" },
    { key: "abgeschlossen", label: "Abgeschlossen", cls: "badge-teal" },
  ];

  return (
    <div className="page-enter">
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Einsätze</div>
        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>Deine Touren</div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, overflowX: "auto", paddingBottom: 4 }}>
        {filterBtns.map((btn) => (
          <button
            key={btn.key}
            onClick={() => setFilter(btn.key)}
            style={{
              padding: "7px 14px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s",
              ...(filter === btn.key
                ? { background: "#e8f5e4", color: "#4a8c3f" }
                : { background: "#f3f4f6", color: "#4b5563" }),
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* List */}
      {sorted.length === 0 ? (
        <p style={{ color: "#6b7280", fontSize: 13 }}>Keine Einsätze gefunden.</p>
      ) : (
        sorted.map((e) => {
          const datum = typeof e.datum === "string" ? e.datum : (e.datum as Date).toISOString().split("T")[0];
          const pb = getParagraphBadge(e.paragraph);
          const sb = getStatusBadge(e.status);
          return (
            <div key={e.id} style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,.08)", padding: 14, marginBottom: 10 }}>
              <div className="list-item" style={{ padding: 0, border: "none" }}>
                <div className={`li-icon ${e.status === "abgeschlossen" ? "teal" : ""}`}>
                  {e.status === "abgeschlossen" ? "✅" : "📍"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {getKundeName(e.kundenId)}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                    {fmtDate(datum)} · {(e.startzeit || "").slice(0, 5)} Uhr · {e.dauerStunden}h
                    {(e as any).kundeStrasse && (e as any).kundeOrt && (
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(`${(e as any).kundeStrasse}, ${(e as any).kundePlz ?? ''} ${(e as any).kundeOrt}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(ev) => ev.stopPropagation()}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', textDecoration: 'none', marginLeft: 2 }}
                      >
                        🗺️ Navigation
                      </a>
                    )}
                    <span className={pb.cls} style={{ display: "inline-block", padding: "2px 6px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>
                      {pb.label}
                    </span>
                    {/* P3: Anfahrtspauschale */}
                    {(e as any).anfahrtPauschale && parseFloat(String((e as any).anfahrtPauschale)) > 0 && (
                      <span style={{ display: "inline-block", padding: "2px 6px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" }}>
                        +{parseFloat(String((e as any).anfahrtPauschale)).toFixed(2)}€ Anfahrt
                      </span>
                    )}
                    {/* P3: Mindestzeit-Warnung */}
                    {e.dauerStunden !== null && parseFloat(String(e.dauerStunden)) < 1.5 && (
                      <span style={{ display: "inline-block", padding: "2px 6px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: "#fef9c3", color: "#854d0e", border: "1px solid #fde047" }}>
                        ⚠️ &lt; 1,5h
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <span className={sb.cls} style={{ display: "inline-block", padding: "3px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                    {sb.label}
                  </span>
                  {e.status === "geplant" && (
                    <div>
                      <button
                        onClick={() => handleAbschluss(e.id, getKundeName(e.kundenId), fmtDate(datum), e.dauerStunden != null ? parseFloat(String(e.dauerStunden)) : null)}
                        style={{
                          marginTop: 6, padding: "7px 12px", background: "#4a8c3f", color: "#fff",
                          border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                        }}
                      >
                        Abschließen
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Abschluss Sheet */}
      <BottomSheet open={abschlussOpen} onClose={() => setAbschlussOpen(false)} title="Einsatz abschließen">
        {activeEinsatz && (
          <div style={{ background: "#dbeafe", border: "1px solid #93c5fd", color: "#1e40af", padding: "11px 13px", borderRadius: 10, fontSize: 13, marginBottom: 14 }}>
            Einsatz bei {activeEinsatz.name} am {activeEinsatz.datum}
          </div>
        )}
        {/* P3: Mindestzeit-Warnung im Abschluss-Modal */}
        {activeEinsatz?.dauerStunden != null && activeEinsatz.dauerStunden < 1.5 && (
          <div style={{ background: "#fef9c3", border: "1.5px solid #fde047", color: "#854d0e", padding: "10px 13px", borderRadius: 10, fontSize: 13, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div>
              <strong>Mindestzeit unterschritten!</strong><br />
              Dieser Einsatz dauert nur {activeEinsatz.dauerStunden}h – Mindestdauer sind 1,5h (90 Min). Der Admin wird automatisch informiert.
            </div>
          </div>
        )}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 5 }}>Besuchsbericht</label>
          <textarea value={bericht} onChange={(e) => setBericht(e.target.value)} placeholder="Was wurde gemacht? Besonderheiten?" style={{ width: "100%", padding: "12px 13px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 15, outline: "none", resize: "none", minHeight: 80, fontFamily: "inherit", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 5 }}>Gesundheitszustand</label>
          <select value={gesundheit} onChange={(e) => setGesundheit(e.target.value as typeof gesundheit)} style={{ width: "100%", padding: "12px 13px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 15, outline: "none", background: "#fff", boxSizing: "border-box" }}>
            <option value="gut">Gut</option>
            <option value="stabil">Stabil</option>
            <option value="auffaellig">Auffällig – Admin informiert</option>
            <option value="kritisch">Kritisch – Notfall eingeleitet</option>
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 5 }}>Bemerkungen</label>
          <textarea value={bemerkung} onChange={(e) => setBemerkung(e.target.value)} placeholder="Optional..." style={{ width: "100%", padding: "12px 13px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 15, outline: "none", resize: "none", minHeight: 60, fontFamily: "inherit", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 5 }}>Unterschrift Mitarbeiter</label>
          <SignatureCanvas
            ref={sigRef}
            height={130}
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
              height={130}
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
        <div style={{ display: "flex", gap: 10, marginTop: 20, paddingTop: 16, borderTop: "1px solid #e5e7eb" }}>
          <button onClick={() => setAbschlussOpen(false)} style={{ flex: 1, padding: 13, background: "#f4f6f3", color: "#6b7280", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Abbrechen</button>
          <button onClick={saveAbschluss} disabled={updateStatus.isPending} style={{ flex: 1, padding: 13, background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            {updateStatus.isPending ? "Speichern…" : "✓ Abschließen"}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
