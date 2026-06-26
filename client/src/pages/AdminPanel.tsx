import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import BottomSheet from "@/components/BottomSheet";

type AdminTab = "mitarbeiter" | "kunden" | "zuordnung" | "abschluss";

export default function AdminPanel() {
  const [tab, setTab] = useState<AdminTab>("mitarbeiter");

  // ── Mitarbeiter ──────────────────────────────────────
  const [maSheet, setMaSheet] = useState(false);
  const [editMa, setEditMa] = useState<{ id: number; vorname: string; nachname: string; email: string; rolle: "mitarbeiter" | "admin"; aktiv: number; telefon?: string | null } | null>(null);
  const [maVorname, setMaVorname] = useState("");
  const [maNachname, setMaNachname] = useState("");
  const [maEmail, setMaEmail] = useState("");
  const [maPasswort, setMaPasswort] = useState("");
  const [maRolle, setMaRolle] = useState<"mitarbeiter" | "admin">("mitarbeiter");
  const [maTelefon, setMaTelefon] = useState("");

  const { data: maList = [], refetch: refetchMa } = trpc.admin.mitarbeiterList.useQuery();
  const createMa = trpc.admin.mitarbeiterCreate.useMutation({
    onSuccess: () => { refetchMa(); toast.success("✅ Mitarbeiter angelegt"); resetMaForm(); setMaSheet(false); },
    onError: (e) => toast.error("❌ " + e.message),
  });
  const updateMa = trpc.admin.mitarbeiterUpdate.useMutation({
    onSuccess: () => { refetchMa(); toast.success("✅ Mitarbeiter aktualisiert"); resetMaForm(); setMaSheet(false); },
    onError: (e) => toast.error("❌ " + e.message),
  });

  const resetMaForm = () => { setEditMa(null); setMaVorname(""); setMaNachname(""); setMaEmail(""); setMaPasswort(""); setMaRolle("mitarbeiter"); setMaTelefon(""); };
  const openEditMa = (ma: typeof maList[0]) => {
    setEditMa(ma);
    setMaVorname(ma.vorname); setMaNachname(ma.nachname); setMaEmail(ma.email);
    setMaRolle(ma.rolle); setMaTelefon(ma.telefon || "");
    setMaPasswort(""); setMaSheet(true);
  };
  const saveMa = () => {
    if (!maVorname || !maNachname || !maEmail) { toast.error("Pflichtfelder ausfüllen!"); return; }
    if (editMa) {
      updateMa.mutate({ id: editMa.id, vorname: maVorname, nachname: maNachname, email: maEmail, rolle: maRolle, telefon: maTelefon, ...(maPasswort ? { neuesPasswort: maPasswort } : {}) });
    } else {
      if (!maPasswort) { toast.error("Passwort eingeben!"); return; }
      createMa.mutate({ vorname: maVorname, nachname: maNachname, email: maEmail, passwort: maPasswort, rolle: maRolle, telefon: maTelefon });
    }
  };

  // ── Kunden ───────────────────────────────────────────
  const [kdSheet, setKdSheet] = useState(false);
  const [editKd, setEditKd] = useState<{ id: number; vorname: string; nachname: string; adresse?: string | null; telefon?: string | null; pflegegrad?: number | null; paragraph?: string | null } | null>(null);
  const [kdVorname, setKdVorname] = useState("");
  const [kdNachname, setKdNachname] = useState("");
  const [kdAdresse, setKdAdresse] = useState("");
  const [kdTelefon, setKdTelefon] = useState("");
  const [kdPflegegrad, setKdPflegegrad] = useState("2");
  const [kdParagraph, setKdParagraph] = useState<"45b" | "45a" | "39" | "privat">("45b");

  const { data: kundenList = [], refetch: refetchKd } = trpc.kunden.list.useQuery();
  const createKd = trpc.kunden.create.useMutation({
    onSuccess: () => { refetchKd(); toast.success("✅ Kunde angelegt"); resetKdForm(); setKdSheet(false); },
    onError: (e) => toast.error("❌ " + e.message),
  });
  const updateKd = trpc.kunden.update.useMutation({
    onSuccess: () => { refetchKd(); toast.success("✅ Kunde aktualisiert"); resetKdForm(); setKdSheet(false); },
    onError: (e) => toast.error("❌ " + e.message),
  });

  const resetKdForm = () => { setEditKd(null); setKdVorname(""); setKdNachname(""); setKdAdresse(""); setKdTelefon(""); setKdPflegegrad("2"); setKdParagraph("45b"); };
  const openEditKd = (k: typeof kundenList[0]) => {
    setEditKd(k);
    setKdVorname(k.vorname); setKdNachname(k.nachname); setKdAdresse(k.adresse || "");
    setKdTelefon(k.telefon || ""); setKdPflegegrad(String(k.pflegegrad || 2));
    setKdParagraph((k.paragraph as "45b" | "45a" | "39" | "privat") || "45b");
    setKdSheet(true);
  };
  const saveKd = () => {
    if (!kdVorname || !kdNachname) { toast.error("Pflichtfelder ausfüllen!"); return; }
    const data = { vorname: kdVorname, nachname: kdNachname, adresse: kdAdresse, telefon: kdTelefon, pflegegrad: parseInt(kdPflegegrad), paragraph: kdParagraph };
    if (editKd) updateKd.mutate({ id: editKd.id, ...data });
    else createKd.mutate(data);
  };

  // ── Zuordnung ─────────────────────────────────────────
  const [zuordMaId, setZuordMaId] = useState<number | null>(null);
  const [selectedKunden, setSelectedKunden] = useState<number[]>([]);
  const { data: zuordDaten = [] } = trpc.admin.getZuordnung.useQuery({ mitarbeiterId: zuordMaId ?? 0 }, { enabled: !!zuordMaId });
  const setZuordnung = trpc.admin.setZuordnung.useMutation({
    onSuccess: () => toast.success("✅ Zuordnung gespeichert"),
    onError: (e) => toast.error("❌ " + e.message),
  });

  const openZuordnung = (maId: number) => {
    setZuordMaId(maId);
    setSelectedKunden(zuordDaten.map((z) => z.kundenId));
  };

  const toggleKunde = (id: number) => {
    setSelectedKunden((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const saveZuordnung = () => {
    if (!zuordMaId) return;
    setZuordnung.mutate({ mitarbeiterId: zuordMaId, kundenIds: selectedKunden });
  };

  // ── Monatsabschluss ───────────────────────────────────
  const today = new Date().toISOString().split("T")[0];
  const [monat, setMonat] = useState(today.slice(0, 7));
  const { data: abschluesse = [] } = trpc.admin.monatsabschluesse.useQuery();
  const abschluss = trpc.admin.monatsabschluss.useMutation({
    onSuccess: (data) => {
      toast.success(`✅ Abschluss für ${monat} erstellt`);
      if (data.csvExport) {
        const blob = new Blob([data.csvExport], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `abschluss_${monat}.csv`; a.click();
        URL.revokeObjectURL(url);
      }
    },
    onError: (e) => toast.error("❌ " + e.message),
  });

  const tabStyle = (t: AdminTab) => ({
    padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer",
    ...(tab === t ? { background: "#4a8c3f", color: "#fff" } : { background: "#f3f4f6", color: "#4b5563" }),
  });

  const inputStyle: React.CSSProperties = { width: "100%", padding: "11px 12px", border: "2px solid #e5e7eb", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff" };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#6b7280", marginBottom: 4 };
  const btnGreen: React.CSSProperties = { padding: "11px 20px", background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", width: "100%" };

  return (
    <div className="page-enter">
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Admin-Panel</div>
        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>Lebenswert Betreuung – Verwaltung</div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {[
          { key: "mitarbeiter" as AdminTab, label: "👥 Mitarbeiter" },
          { key: "kunden" as AdminTab, label: "🏠 Kunden" },
          { key: "zuordnung" as AdminTab, label: "🔗 Zuordnung" },
          { key: "abschluss" as AdminTab, label: "📊 Abschluss" },
        ].map((t) => (
          <button key={t.key} style={tabStyle(t.key)} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* ── MITARBEITER ── */}
      {tab === "mitarbeiter" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{maList.length} Mitarbeiter</span>
            <button onClick={() => { resetMaForm(); setMaSheet(true); }} style={{ padding: "8px 14px", background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Neu</button>
          </div>
          {maList.map((ma) => (
            <div key={ma.id} style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,.08)", padding: 14, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: ma.rolle === "admin" ? "#4a8c3f" : "#e8f5e4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                  {ma.rolle === "admin" ? "👑" : "👤"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{ma.vorname} {ma.nachname}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>{ma.email}</div>
                  {ma.telefon && <div style={{ fontSize: 12, color: "#6b7280" }}>📞 {ma.telefon}</div>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                  <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: ma.aktiv ? "#e8f5e4" : "#fee2e2", color: ma.aktiv ? "#4a8c3f" : "#991b1b" }}>
                    {ma.aktiv ? "Aktiv" : "Inaktiv"}
                  </span>
                  <button onClick={() => openEditMa(ma)} style={{ padding: "4px 10px", background: "#f3f4f6", color: "#4b5563", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Bearbeiten</button>
                  <button onClick={() => { updateMa.mutate({ id: ma.id, aktiv: ma.aktiv ? 0 : 1 }); }} style={{ padding: "4px 10px", background: ma.aktiv ? "#fee2e2" : "#e8f5e4", color: ma.aktiv ? "#991b1b" : "#4a8c3f", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    {ma.aktiv ? "Deaktivieren" : "Aktivieren"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── KUNDEN ── */}
      {tab === "kunden" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{kundenList.length} Kunden</span>
            <button onClick={() => { resetKdForm(); setKdSheet(true); }} style={{ padding: "8px 14px", background: "#4a8c3f", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Neu</button>
          </div>
          {kundenList.map((k) => (
            <div key={k.id} style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,.08)", padding: 14, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#e8f5e4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🏠</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{k.vorname} {k.nachname}</div>
                  {k.adresse && <div style={{ fontSize: 12, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📍 {k.adresse}</div>}
                  <div style={{ fontSize: 12, color: "#6b7280", display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                    {k.pflegegrad && <span style={{ padding: "1px 6px", borderRadius: 10, background: "#e0f2f0", color: "#2a9d8f", fontWeight: 700 }}>PG {k.pflegegrad}</span>}
                    {k.paragraph && <span style={{ padding: "1px 6px", borderRadius: 10, background: "#e8f5e4", color: "#4a8c3f", fontWeight: 700 }}>§{k.paragraph}</span>}
                  </div>
                </div>
                <button onClick={() => openEditKd(k)} style={{ padding: "6px 12px", background: "#f3f4f6", color: "#4b5563", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>Bearbeiten</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── ZUORDNUNG ── */}
      {tab === "zuordnung" && (
        <div>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>Wähle einen Mitarbeiter und weise Kunden zu.</div>
          {maList.map((ma) => (
            <div key={ma.id} style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,.08)", padding: 14, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{ma.vorname} {ma.nachname}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>{ma.email}</div>
                </div>
                <button
                  onClick={() => openZuordnung(ma.id)}
                  style={{ padding: "7px 14px", background: zuordMaId === ma.id ? "#4a8c3f" : "#f3f4f6", color: zuordMaId === ma.id ? "#fff" : "#4b5563", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  {zuordMaId === ma.id ? "Ausgewählt ✓" : "Zuordnen"}
                </button>
              </div>
            </div>
          ))}

          {zuordMaId && (
            <div style={{ background: "#f0faf0", borderRadius: 12, padding: 16, marginTop: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: "#4a8c3f" }}>
                Kunden für {maList.find((m) => m.id === zuordMaId)?.vorname} {maList.find((m) => m.id === zuordMaId)?.nachname}
              </div>
              {kundenList.map((k) => (
                <label key={k.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #e5e7eb", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={selectedKunden.includes(k.id)}
                    onChange={() => toggleKunde(k.id)}
                    style={{ width: 18, height: 18, accentColor: "#4a8c3f" }}
                  />
                  <span style={{ fontSize: 14 }}>{k.vorname} {k.nachname}</span>
                  {k.paragraph && <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 10, background: "#e8f5e4", color: "#4a8c3f", fontWeight: 700 }}>§{k.paragraph}</span>}
                </label>
              ))}
              <button onClick={saveZuordnung} style={{ ...btnGreen, marginTop: 12 }}>
                {setZuordnung.isPending ? "Speichern…" : "Zuordnung speichern"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── MONATSABSCHLUSS ── */}
      {tab === "abschluss" && (
        <div>
          <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,.08)", padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Neuer Monatsabschluss</div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Monat</label>
              <input type="month" value={monat} onChange={(e) => setMonat(e.target.value)} style={inputStyle} />
            </div>
            <button
              onClick={() => abschluss.mutate({ monat })}
              disabled={abschluss.isPending}
              style={btnGreen}
            >
              {abschluss.isPending ? "Erstelle…" : "📊 Abschluss erstellen & CSV exportieren"}
            </button>
          </div>

          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Bisherige Abschlüsse</div>
          {abschluesse.length === 0 ? (
            <p style={{ color: "#6b7280", fontSize: 13 }}>Noch keine Abschlüsse.</p>
          ) : (
            abschluesse.map((a) => (
              <div key={a.id} style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,.08)", padding: 14, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{a.monat}</div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                      {a.gesamtEinsaetze} Einsätze · {parseFloat(String(a.gesamtStunden ?? 0)).toFixed(1)}h · {parseFloat(String(a.gesamtKm ?? 0)).toFixed(0)} km
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#4a8c3f" }}>{parseFloat(String(a.gesamtVerguetung ?? 0)).toFixed(2)} €</div>
                    {a.csvExport && (
                      <button
                        onClick={() => {
                          const blob = new Blob([a.csvExport!], { type: "text/csv;charset=utf-8;" });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.href = url; link.download = `abschluss_${a.monat}.csv`; link.click();
                          URL.revokeObjectURL(url);
                        }}
                        style={{ padding: "4px 10px", background: "#e8f5e4", color: "#4a8c3f", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", marginTop: 4 }}
                      >
                        ⬇ CSV
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Mitarbeiter-Sheet ── */}
      <BottomSheet open={maSheet} onClose={() => { setMaSheet(false); resetMaForm(); }} title={editMa ? "Mitarbeiter bearbeiten" : "Neuer Mitarbeiter"}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Vorname *</label>
            <input value={maVorname} onChange={(e) => setMaVorname(e.target.value)} style={inputStyle} placeholder="Max" />
          </div>
          <div>
            <label style={labelStyle}>Nachname *</label>
            <input value={maNachname} onChange={(e) => setMaNachname(e.target.value)} style={inputStyle} placeholder="Mustermann" />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>E-Mail *</label>
          <input type="email" value={maEmail} onChange={(e) => setMaEmail(e.target.value)} style={inputStyle} placeholder="max@lebenswert.de" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>{editMa ? "Neues Passwort (leer = unverändert)" : "Passwort *"}</label>
          <input type="password" value={maPasswort} onChange={(e) => setMaPasswort(e.target.value)} style={inputStyle} placeholder="••••••••" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Telefon</label>
            <input value={maTelefon} onChange={(e) => setMaTelefon(e.target.value)} style={inputStyle} placeholder="+49 123 456" />
          </div>
          <div>
            <label style={labelStyle}>Rolle</label>
            <select value={maRolle} onChange={(e) => setMaRolle(e.target.value as "mitarbeiter" | "admin")} style={inputStyle}>
              <option value="mitarbeiter">Mitarbeiter</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <button onClick={saveMa} disabled={createMa.isPending || updateMa.isPending} style={btnGreen}>
          {createMa.isPending || updateMa.isPending ? "Speichern…" : editMa ? "Änderungen speichern" : "Mitarbeiter anlegen"}
        </button>
      </BottomSheet>

      {/* ── Kunden-Sheet ── */}
      <BottomSheet open={kdSheet} onClose={() => { setKdSheet(false); resetKdForm(); }} title={editKd ? "Kunde bearbeiten" : "Neuer Kunde"}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Vorname *</label>
            <input value={kdVorname} onChange={(e) => setKdVorname(e.target.value)} style={inputStyle} placeholder="Maria" />
          </div>
          <div>
            <label style={labelStyle}>Nachname *</label>
            <input value={kdNachname} onChange={(e) => setKdNachname(e.target.value)} style={inputStyle} placeholder="Müller" />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Adresse</label>
          <input value={kdAdresse} onChange={(e) => setKdAdresse(e.target.value)} style={inputStyle} placeholder="Musterstr. 1, 12345 Stadt" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Telefon</label>
            <input value={kdTelefon} onChange={(e) => setKdTelefon(e.target.value)} style={inputStyle} placeholder="+49 123 456" />
          </div>
          <div>
            <label style={labelStyle}>Pflegegrad</label>
            <select value={kdPflegegrad} onChange={(e) => setKdPflegegrad(e.target.value)} style={inputStyle}>
              {[1, 2, 3, 4, 5].map((g) => <option key={g} value={g}>PG {g}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Paragraph</label>
          <select value={kdParagraph} onChange={(e) => setKdParagraph(e.target.value as "45b" | "45a" | "39" | "privat")} style={inputStyle}>
            <option value="45b">§45b SGB XI</option>
            <option value="45a">§45a SGB XI</option>
            <option value="39">§39 SGB XI</option>
            <option value="privat">Privat</option>
          </select>
        </div>
        <button onClick={saveKd} disabled={createKd.isPending || updateKd.isPending} style={btnGreen}>
          {createKd.isPending || updateKd.isPending ? "Speichern…" : editKd ? "Änderungen speichern" : "Kunde anlegen"}
        </button>
      </BottomSheet>
    </div>
  );
}
