import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { toast } from "sonner";

const STATUS_FARBEN: Record<string, { bg: string; color: string; border: string }> = {
  entwurf: { bg: "#f3f4f6", color: "#374151", border: "#d1d5db" },
  eingereicht: { bg: "#eff6ff", color: "#1e40af", border: "#93c5fd" },
  genehmigt: { bg: "#f0fdf4", color: "#166534", border: "#86efac" },
  abgelehnt: { bg: "#fef2f2", color: "#991b1b", border: "#fca5a5" },
};

const STIMMUNG_LABELS: Record<string, string> = {
  sehr_gut: "😊 Sehr gut",
  gut: "🙂 Gut",
  neutral: "😐 Neutral",
  besorgniserregend: "😟 Besorgniserregend",
};

export default function Besuchsberichte() {
  const { mitarbeiter } = usePortalAuth() as any;
  const isAdmin = mitarbeiter?.rolle === "admin";
  const [tab, setTab] = useState<"meine" | "alle">(isAdmin ? "alle" : "meine");
  const [showCreate, setShowCreate] = useState(false);
  const [filterKunde, setFilterKunde] = useState("");
  const [filterStatus, setFilterStatus] = useState<"alle" | "entwurf" | "eingereicht" | "genehmigt" | "abgelehnt">("alle");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const { data: meineberichte = [], isLoading: loadingMeine, refetch: refetchMeine } = (trpc.besuchsberichte as any).getMeineBerichte.useQuery(
    undefined,
    { enabled: tab === "meine" }
  );
  const { data: alleberichte = [], isLoading: loadingAlle, refetch: refetchAlle } = (trpc.besuchsberichte as any).getAlleBerichte.useQuery(
    undefined,
    { enabled: tab === "alle" && isAdmin }
  );
  const { data: kunden = [] } = (trpc.kunden as any).list.useQuery();

  const [form, setForm] = useState({
    kundeId: 0,
    datum: new Date().toISOString().split("T")[0],
    startzeit: "09:00",
    endzeit: "10:00",
    inhalt: "",
    stimmung: "gut" as "sehr_gut" | "gut" | "neutral" | "besorgniserregend",
    massnahmen: "",
    naechsterTermin: "",
    unterschriftKunde: false,
  });

  const transkribierenMut = (trpc.besuchsberichte as any).transkribieren.useMutation({
    onSuccess: (data: any) => {
      setForm(f => ({ ...f, inhalt: f.inhalt ? f.inhalt + " " + data.text : data.text }));
      setIsTranscribing(false);
      toast.success("🎤 Sprache transkribiert!");
    },
    onError: (e: any) => {
      setIsTranscribing(false);
      toast.error("Transkription fehlgeschlagen: " + e.message);
    },
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (blob.size > 16 * 1024 * 1024) {
          toast.error("Aufnahme zu lang (max. 16 MB)");
          setIsTranscribing(false);
          return;
        }
        setIsTranscribing(true);
        const formData = new FormData();
        formData.append("file", blob, "aufnahme.webm");
        try {
          const res = await fetch("/api/upload/audio", { method: "POST", body: formData });
          const { url } = await res.json();
          transkribierenMut.mutate({ audioUrl: url, sprache: "de" });
        } catch {
          setIsTranscribing(false);
          toast.error("Upload fehlgeschlagen");
        }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
    } catch {
      toast.error("Mikrofon-Zugriff verweigert");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const createBericht = (trpc.besuchsberichte as any).create.useMutation({
    onSuccess: () => {
      toast.success("✅ Besuchsbericht gespeichert!");
      setShowCreate(false);
      setForm({ kundeId: 0, datum: new Date().toISOString().split("T")[0], startzeit: "09:00", endzeit: "10:00", inhalt: "", stimmung: "gut", massnahmen: "", naechsterTermin: "", unterschriftKunde: false });
      if (tab === "meine") refetchMeine(); else refetchAlle();
    },
    onError: (e: any) => toast.error("❌ " + e.message),
  });

  const updateStatus = (trpc.besuchsberichte as any).updateStatus.useMutation({
    onSuccess: () => { toast.success("Status aktualisiert"); refetchAlle(); },
    onError: (e: any) => toast.error("❌ " + e.message),
  });

  const isLoading = tab === "meine" ? loadingMeine : loadingAlle;
  const berichte = tab === "meine" ? (meineberichte as any[]) : (alleberichte as any[]);
  let gefilterteBerichte = berichte.filter((b: any) => {
    const matchKunde = !filterKunde || `${b.kunde?.vorname} ${b.kunde?.nachname}`.toLowerCase().includes(filterKunde.toLowerCase());
    const matchStatus = filterStatus === "alle" || b.status === filterStatus;
    return matchKunde && matchStatus;
  });
  gefilterteBerichte = [...gefilterteBerichte].sort((a: any, b: any) => {
    const da = new Date(a.datum).getTime();
    const db2 = new Date(b.datum).getTime();
    return sortDir === "desc" ? db2 - da : da - db2;
  });

  return (
    <div style={{ padding: "20px 16px 100px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 }}>📋 Besuchsberichte</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Dokumentation aller Kundenbesuche</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{ background: "#0d9488", color: "#fff", border: "none", borderRadius: 12, padding: "10px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
        >
          ➕ Neuer Bericht
        </button>
      </div>

      {/* Tab-Navigation */}
      {isAdmin && (
        <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 12, padding: 4, marginBottom: 20, gap: 4 }}>
          {[
            { id: "meine", label: "📋 Meine Berichte" },
            { id: "alle", label: "👥 Alle Berichte" },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              style={{
                flex: 1, padding: "10px 8px", borderRadius: 10, border: "none", cursor: "pointer",
                fontWeight: 700, fontSize: 12,
                background: tab === t.id ? "#fff" : "transparent",
                color: tab === t.id ? "#0d9488" : "#6b7280",
                boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Filter & Sortierung */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          placeholder="🔍 Nach Kunde filtern..."
          value={filterKunde}
          onChange={e => { setFilterKunde(e.target.value); }}
          style={{ flex: 2, minWidth: 150, padding: "9px 14px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 13, boxSizing: "border-box" }}
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as any)}
          style={{ flex: 1, minWidth: 130, padding: "9px 10px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 13, background: "#fff", cursor: "pointer" }}
        >
          <option value="alle">Alle Status</option>
          <option value="entwurf">Entwurf</option>
          <option value="eingereicht">Eingereicht</option>
          <option value="genehmigt">Genehmigt</option>
          <option value="abgelehnt">Abgelehnt</option>
        </select>
        <button
          onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
          style={{ padding: "9px 14px", border: "2px solid #e5e7eb", borderRadius: 10, background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#374151", whiteSpace: "nowrap" }}
        >
          {sortDir === "desc" ? "📅 Neueste ↓" : "📅 Älteste ↑"}
        </button>
      </div>

      {/* Skeleton-Ladeanimation */}
      {isLoading && (
        <>
          <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
          <div style={{ display: "grid", gap: 12, marginBottom: 4 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: "18px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <div>
                    <div style={{ width: 140, height: 14, borderRadius: 6, background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite", marginBottom: 8 }} />
                    <div style={{ width: 200, height: 11, borderRadius: 6, background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
                  </div>
                  <div style={{ width: 80, height: 26, borderRadius: 8, background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
                </div>
                <div style={{ width: "90%", height: 11, borderRadius: 6, background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
              </div>
            ))}
          </div>
        </>
      )}
      {/* Berichte-Liste */}
      {!isLoading && <div style={{ display: "grid", gap: 12 }}>
        {gefilterteBerichte.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: "40px 20px", textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <div style={{ fontWeight: 700 }}>Keine Besuchsberichte vorhanden</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Erstelle den ersten Bericht mit dem Button oben rechts.</div>
          </div>
        ) : (
          gefilterteBerichte.map((b: any) => {
            const statusFarbe = STATUS_FARBEN[b.status] ?? STATUS_FARBEN.entwurf;
            return (
              <div key={b.id} style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>
                      {b.kunde?.vorname} {b.kunde?.nachname}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                      {new Date(b.datum).toLocaleDateString("de-DE")} · {b.startzeit}–{b.endzeit} Uhr
                      {b.mitarbeiter && ` · ${b.mitarbeiter.vorname} ${b.mitarbeiter.nachname}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 13 }}>{STIMMUNG_LABELS[b.stimmung] ?? b.stimmung}</span>
                    <span style={{
                      background: statusFarbe.bg, color: statusFarbe.color,
                      border: `1px solid ${statusFarbe.border}`,
                      borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700,
                    }}>
                      {b.status === "entwurf" ? "📝 Entwurf" : b.status === "eingereicht" ? "📤 Eingereicht" : b.status === "genehmigt" ? "✅ Genehmigt" : "❌ Abgelehnt"}
                    </span>
                  </div>
                </div>
                <div style={{ padding: "14px 18px" }}>
                  <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{b.inhalt}</div>
                  {b.massnahmen && (
                    <div style={{ marginTop: 10, padding: "10px 12px", background: "#f0fdf4", borderRadius: 8, fontSize: 12, color: "#166534" }}>
                      <strong>Maßnahmen:</strong> {b.massnahmen}
                    </div>
                  )}
                  {b.unterschriftKunde && (
                    <div style={{ marginTop: 8, fontSize: 11, color: "#6b7280" }}>✍️ Unterschrift des Kunden vorhanden</div>
                  )}
                  {isAdmin && b.status === "eingereicht" && (
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button
                        onClick={() => updateStatus.mutate({ id: b.id, status: "genehmigt" })}
                        style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #86efac", borderRadius: 8, padding: "6px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                      >
                        ✅ Genehmigen
                      </button>
                      <button
                        onClick={() => updateStatus.mutate({ id: b.id, status: "abgelehnt" })}
                        style={{ background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5", borderRadius: 8, padding: "6px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                      >
                        ❌ Ablehnen
                      </button>
                    </div>
                  )}
                  {b.status === "entwurf" && (
                    <button
                      onClick={() => updateStatus.mutate({ id: b.id, status: "eingereicht" })}
                      style={{ marginTop: 10, background: "#eff6ff", color: "#1e40af", border: "1px solid #93c5fd", borderRadius: 8, padding: "6px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                    >
                      📤 Einreichen
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>}
      {/* Neuer Bericht Modal */}
      {showCreate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "24px", maxWidth: 560, width: "100%", maxHeight: "90vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#111827" }}>📋 Neuer Besuchsbericht</h2>
              <button onClick={() => setShowCreate(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9ca3af" }}>✕</button>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Kunde *</label>
                <select
                  value={form.kundeId}
                  onChange={e => setForm(f => ({ ...f, kundeId: Number(e.target.value) }))}
                  style={{ width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14 }}
                >
                  <option value={0}>Bitte wählen...</option>
                  {(kunden as any[]).map((k: any) => (
                    <option key={k.id} value={k.id}>{k.vorname} {k.nachname}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Datum *</label>
                  <input type="date" value={form.datum} onChange={e => setForm(f => ({ ...f, datum: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Von</label>
                  <input type="time" value={form.startzeit} onChange={e => setForm(f => ({ ...f, startzeit: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Bis</label>
                  <input type="time" value={form.endzeit} onChange={e => setForm(f => ({ ...f, endzeit: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, boxSizing: "border-box" }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Stimmung des Kunden</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {Object.entries(STIMMUNG_LABELS).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setForm(f => ({ ...f, stimmung: val as any }))}
                      style={{
                        flex: 1, padding: "8px 4px", borderRadius: 10, border: `2px solid ${form.stimmung === val ? "#0d9488" : "#e5e7eb"}`,
                        background: form.stimmung === val ? "#f0fdfa" : "#fff", cursor: "pointer", fontSize: 11, fontWeight: 700,
                        color: form.stimmung === val ? "#0d9488" : "#6b7280",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bericht-Feld mit Spracheingabe */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" }}>Bericht *</label>
                  <button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isTranscribing}
                    style={{
                      background: isRecording ? "#dc2626" : "#4a8c3f",
                      color: "#fff", border: "none", borderRadius: 8,
                      padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 4,
                    }}
                  >
                    {isTranscribing ? "⏳ Transkribiere..." : isRecording ? "⏹ Aufnahme stoppen" : "🎤 Spracheingabe"}
                  </button>
                </div>
                {isRecording && (
                  <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "6px 10px", marginBottom: 6, fontSize: 11, color: "#dc2626", fontWeight: 700 }}>
                    🔴 Aufnahme läuft... Klicke auf "Aufnahme stoppen" wenn fertig.
                  </div>
                )}
                <textarea
                  value={form.inhalt}
                  onChange={e => setForm(f => ({ ...f, inhalt: e.target.value }))}
                  placeholder="Beschreibe den Besuch, Beobachtungen, Besonderheiten... oder nutze die Spracheingabe."
                  rows={4}
                  style={{ width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 13, boxSizing: "border-box", resize: "vertical" }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Maßnahmen / Empfehlungen</label>
                <textarea
                  value={form.massnahmen}
                  onChange={e => setForm(f => ({ ...f, massnahmen: e.target.value }))}
                  placeholder="Eingeleitete oder empfohlene Maßnahmen..."
                  rows={2}
                  style={{ width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 13, boxSizing: "border-box", resize: "vertical" }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Nächster Termin</label>
                <input type="date" value={form.naechsterTermin} onChange={e => setForm(f => ({ ...f, naechsterTermin: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, boxSizing: "border-box" }} />
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "12px 14px", background: "#f9fafb", borderRadius: 10, border: "1px solid #e5e7eb" }}>
                <input
                  type="checkbox"
                  checked={form.unterschriftKunde}
                  onChange={e => setForm(f => ({ ...f, unterschriftKunde: e.target.checked }))}
                  style={{ width: 18, height: 18 }}
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>✍️ Unterschrift des Kunden liegt vor</span>
              </label>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setShowCreate(false)}
                  style={{ flex: 1, background: "#f3f4f6", color: "#6b7280", border: "none", borderRadius: 10, padding: "12px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => createBericht.mutate(form as any)}
                  disabled={createBericht.isPending || !form.kundeId || !form.inhalt}
                  style={{ flex: 2, background: "#0d9488", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: (!form.kundeId || !form.inhalt) ? 0.5 : 1 }}
                >
                  {createBericht.isPending ? "Wird gespeichert..." : "💾 Bericht speichern"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
