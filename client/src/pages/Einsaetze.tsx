import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import BottomSheet from "@/components/BottomSheet";
import SignatureCanvas from "@/components/SignatureCanvas";

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
  const [activeEinsatz, setActiveEinsatz] = useState<{ id: number; name: string; datum: string } | null>(null);
  const [bericht, setBericht] = useState("");
  const [gesundheit, setGesundheit] = useState<"gut" | "stabil" | "auffaellig" | "kritisch">("gut");
  const [bemerkung, setBemerkung] = useState("");
  const sigRef = useRef<import("@/components/SignatureCanvas").SignatureCanvasRef>(null);

  const { data: einsaetze = [], refetch } = trpc.einsaetze.list.useQuery();
  const updateStatus = trpc.einsaetze.updateStatus.useMutation({
    onSuccess: () => { refetch(); toast.success("✅ Einsatz abgeschlossen"); setAbschlussOpen(false); },
    onError: (e) => toast.error("❌ " + e.message),
  });

  const filtered = filter === "alle" ? einsaetze : einsaetze.filter((e) => e.status === filter);
  const sorted = [...filtered].sort((a, b) => {
    const da = typeof a.datum === "string" ? a.datum : (a.datum as Date).toISOString().split("T")[0];
    const db2 = typeof b.datum === "string" ? b.datum : (b.datum as Date).toISOString().split("T")[0];
    return db2.localeCompare(da);
  });

  const handleAbschluss = (id: number, name: string, datum: string) => {
    setActiveEinsatz({ id, name, datum });
    setBericht(""); setBemerkung(""); setGesundheit("gut");
    setAbschlussOpen(true);
  };

  const saveAbschluss = () => {
    if (!activeEinsatz) return;
    updateStatus.mutate({
      id: activeEinsatz.id,
      status: "abgeschlossen",
      bericht,
      gesundheit,
      bemerkung,
      unterschriftMitarbeiter: sigRef.current?.toDataURL() ?? undefined,
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
                    {e.kundeName || "–"}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                    {fmtDate(datum)} · {(e.startzeit || "").slice(0, 5)} Uhr · {e.dauerStunden}h
                    <span className={pb.cls} style={{ display: "inline-block", padding: "2px 6px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>
                      {pb.label}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <span className={sb.cls} style={{ display: "inline-block", padding: "3px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                    {sb.label}
                  </span>
                  {e.status === "geplant" && (
                    <div>
                      <button
                        onClick={() => handleAbschluss(e.id, e.kundeName || "–", fmtDate(datum))}
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
          <SignatureCanvas ref={sigRef} height={140} />
          <button onClick={() => sigRef.current?.clear()} style={{ marginTop: 8, padding: "7px 12px", background: "#f4f6f3", color: "#6b7280", border: "2px solid #e5e7eb", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Löschen</button>
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
