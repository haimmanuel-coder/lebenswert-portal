import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { toast } from "sonner";

const DOK_TYPEN: Record<string, string> = {
  zertifikat: "📜 Zertifikat",
  arbeitsvertrag: "📄 Arbeitsvertrag",
  krankmeldung: "🏥 Krankmeldung",
  fuehrerschein: "🚗 Führerschein",
  erstehilfe: "🩺 Erste-Hilfe-Kurs",
  sonstiges: "📁 Sonstiges",
};

export default function MeinProfil() {
  const { mitarbeiter, refreshAuth } = usePortalAuth() as any;
  const [tab, setTab] = useState<"profil" | "passwort" | "dokumente">("profil");

  // ── Profil-Formular ──────────────────────────────────────────────────────
  const [form, setForm] = useState({
    vorname: mitarbeiter?.vorname ?? "",
    nachname: mitarbeiter?.nachname ?? "",
    email: mitarbeiter?.email ?? "",
    telefon: mitarbeiter?.telefon ?? "",
    mobil: mitarbeiter?.mobil ?? "",
    strasse: mitarbeiter?.strasse ?? "",
    plz: mitarbeiter?.plz ?? "",
    ort: mitarbeiter?.ort ?? "",
  });
  useEffect(() => {
    if (mitarbeiter) {
      setForm({
        vorname: mitarbeiter.vorname ?? "",
        nachname: mitarbeiter.nachname ?? "",
        email: mitarbeiter.email ?? "",
        telefon: mitarbeiter.telefon ?? "",
        mobil: mitarbeiter.mobil ?? "",
        strasse: mitarbeiter.strasse ?? "",
        plz: mitarbeiter.plz ?? "",
        ort: mitarbeiter.ort ?? "",
      });
    }
  }, [mitarbeiter?.id]);

  const [editMode, setEditMode] = useState(false);

  // ── Passwort-Formular ────────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ alt: "", neu: "", bestaetigung: "" });
  const [pwVisible, setPwVisible] = useState({ alt: false, neu: false, best: false });

  // ── Dokument-Upload ──────────────────────────────────────────────────────
  const [uploadTyp, setUploadTyp] = useState<keyof typeof DOK_TYPEN>("zertifikat");
  const [uploadBezeichnung, setUploadBezeichnung] = useState("");
  const [uploadAusstellungsdatum, setUploadAusstellungsdatum] = useState("");
  const [uploadAblaufdatum, setUploadAblaufdatum] = useState("");
  const [uploadNotizen, setUploadNotizen] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: dokumente = [], refetch: refetchDoks } = (trpc.mitarbeiterakte as any).listDokumente.useQuery(
    {},
    { enabled: tab === "dokumente" }
  );

  const addDokument = (trpc.mitarbeiterakte as any).addDokument.useMutation({
    onSuccess: () => {
      toast.success("✅ Dokument gespeichert!");
      refetchDoks();
      setUploadBezeichnung("");
      setUploadAusstellungsdatum("");
      setUploadAblaufdatum("");
      setUploadNotizen("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (e: any) => toast.error("❌ " + e.message),
  });

  const deleteDokument = (trpc.mitarbeiterakte as any).deleteDokument.useMutation({
    onSuccess: () => { toast.success("🗑️ Dokument gelöscht"); refetchDoks(); },
    onError: (e: any) => toast.error("❌ " + e.message),
  });

  const getUploadUrl = (trpc.mitarbeiterakte as any).getUploadUrl.useMutation();

  async function handleUpload() {
    if (!uploadBezeichnung.trim()) { toast.error("Bitte Bezeichnung eingeben"); return; }
    const file = fileInputRef.current?.files?.[0];

    setUploading(true);
    try {
      let dateiUrl: string | undefined;
      let dateiname: string | undefined;

      if (file) {
        // Upload-URL vom Server holen
        const { uploadUrl, key } = await getUploadUrl.mutateAsync({
          dateiname: file.name,
          contentType: file.type || "application/octet-stream",
        });
        // Datei direkt per PUT hochladen
        const res = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type || "application/octet-stream" },
        });
        if (!res.ok) throw new Error("Upload fehlgeschlagen");
        dateiUrl = `/manus-storage/${key}`;
        dateiname = file.name;
      }

      await addDokument.mutateAsync({
        typ: uploadTyp as any,
        bezeichnung: uploadBezeichnung.trim(),
        dateiUrl,
        dateiname,
        ausstellungsdatum: uploadAusstellungsdatum || undefined,
        ablaufdatum: uploadAblaufdatum || undefined,
        notizen: uploadNotizen || undefined,
      });
    } catch (e: any) {
      toast.error("❌ " + (e.message ?? "Fehler beim Upload"));
    } finally {
      setUploading(false);
    }
  }

  const updateProfile = (trpc.portal as any).updateProfile.useMutation({
    onSuccess: () => {
      toast.success("✅ Profil gespeichert!");
      setEditMode(false);
      if (refreshAuth) refreshAuth();
    },
    onError: (e: any) => toast.error("❌ " + e.message),
  });

  const changePassword = (trpc.portal as any).changePassword.useMutation({
    onSuccess: () => {
      toast.success("🔒 Passwort erfolgreich geändert!");
      setPwForm({ alt: "", neu: "", bestaetigung: "" });
    },
    onError: (e: any) => toast.error("❌ " + e.message),
  });

  function handleSaveProfil() {
    updateProfile.mutate({
      vorname: form.vorname,
      nachname: form.nachname,
      email: form.email,
      telefon: form.telefon,
      mobil: form.mobil,
      strasse: form.strasse,
      plz: form.plz,
      ort: form.ort,
    });
  }

  function handleChangePassword() {
    if (!pwForm.alt || !pwForm.neu || !pwForm.bestaetigung) {
      toast.error("Bitte alle Felder ausfüllen.");
      return;
    }
    if (pwForm.neu !== pwForm.bestaetigung) {
      toast.error("Die neuen Passwörter stimmen nicht überein.");
      return;
    }
    if (pwForm.neu.length < 6) {
      toast.error("Das neue Passwort muss mindestens 6 Zeichen haben.");
      return;
    }
    changePassword.mutate({ altesPasswort: pwForm.alt, neuesPasswort: pwForm.neu });
  }

  const initials = `${mitarbeiter?.vorname?.[0] ?? ""}${mitarbeiter?.nachname?.[0] ?? ""}`.toUpperCase();

  return (
    <div style={{ padding: "16px 12px 100px", maxWidth: 540, margin: "0 auto" }}>
      {/* Avatar + Name */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, background: "#fff", borderRadius: 16, padding: "20px 18px", border: "1px solid #e5e7eb" }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #0d9488, #14b8a6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, fontWeight: 800, color: "#fff", flexShrink: 0,
        }}>
          {initials || "?"}
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>
            {mitarbeiter?.vorname} {mitarbeiter?.nachname}
          </div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{mitarbeiter?.email}</div>
          <div style={{ marginTop: 6 }}>
            <span style={{
              background: mitarbeiter?.rolle === "admin" ? "#fef9c3" : "#dbeafe",
              color: mitarbeiter?.rolle === "admin" ? "#92400e" : "#1e40af",
              border: `1px solid ${mitarbeiter?.rolle === "admin" ? "#fcd34d" : "#93c5fd"}`,
              borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700,
            }}>
              {mitarbeiter?.rolle === "admin" ? "👑 Administrator" : "👤 Mitarbeiter"}
            </span>
          </div>
        </div>
      </div>

      {/* Tab-Navigation */}
      <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 12, padding: 4, marginBottom: 20, gap: 4 }}>
        {[
          { id: "profil", label: "👤 Meine Daten" },
          { id: "passwort", label: "🔒 Passwort" },
          { id: "dokumente", label: "📁 Dokumente" },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            style={{
              flex: 1, padding: "10px 6px", borderRadius: 10, border: "none", cursor: "pointer",
              fontWeight: 700, fontSize: 12, transition: "all 0.15s ease",
              background: tab === t.id ? "#fff" : "transparent",
              color: tab === t.id ? "#0d9488" : "#6b7280",
              boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Profil-Tab ── */}
      {tab === "profil" && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #f3f4f6" }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>Persönliche Daten</div>
            {!editMode ? (
              <button
                onClick={() => setEditMode(true)}
                style={{ background: "#f0fdfa", color: "#0d9488", border: "1px solid #99f6e4", borderRadius: 10, padding: "6px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
              >
                ✏️ Bearbeiten
              </button>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => {
                    setEditMode(false);
                    setForm({
                      vorname: mitarbeiter?.vorname ?? "",
                      nachname: mitarbeiter?.nachname ?? "",
                      email: mitarbeiter?.email ?? "",
                      telefon: mitarbeiter?.telefon ?? "",
                      mobil: mitarbeiter?.mobil ?? "",
                      strasse: mitarbeiter?.strasse ?? "",
                      plz: mitarbeiter?.plz ?? "",
                      ort: mitarbeiter?.ort ?? "",
                    });
                  }}
                  style={{ background: "#f3f4f6", color: "#6b7280", border: "1px solid #e5e7eb", borderRadius: 10, padding: "6px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSaveProfil}
                  disabled={updateProfile.isPending}
                  style={{ background: "#0d9488", color: "#fff", border: "none", borderRadius: 10, padding: "6px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer", opacity: updateProfile.isPending ? 0.7 : 1 }}
                >
                  {updateProfile.isPending ? "Speichert..." : "💾 Speichern"}
                </button>
              </div>
            )}
          </div>
          <div style={{ padding: "16px 18px", display: "grid", gap: 14 }}>
            {[
              { label: "Vorname", key: "vorname" },
              { label: "Nachname", key: "nachname" },
              { label: "E-Mail", key: "email", type: "email" },
              { label: "Telefon", key: "telefon", type: "tel" },
              { label: "Mobil", key: "mobil", type: "tel" },
              { label: "Straße & Hausnummer", key: "strasse" },
              { label: "PLZ", key: "plz" },
              { label: "Ort", key: "ort" },
            ].map(({ label, key, type = "text" }) => (
              <div key={key}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", display: "block", marginBottom: 4 }}>{label}</label>
                {editMode ? (
                  <input
                    type={type}
                    value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ width: "100%", padding: "10px 12px", border: "2px solid #0d9488", borderRadius: 10, fontSize: 14, boxSizing: "border-box", outline: "none" }}
                  />
                ) : (
                  <div style={{ fontSize: 14, color: (form as any)[key] ? "#111827" : "#d1d5db", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
                    {(form as any)[key] || "—"}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Passwort-Tab ── */}
      {tab === "passwort" && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6", fontWeight: 700, fontSize: 14, color: "#111827" }}>
            🔒 Passwort ändern
          </div>
          <div style={{ padding: "16px 18px", display: "grid", gap: 16 }}>
            <div style={{ background: "#fef9c3", border: "1px solid #fcd34d", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#92400e" }}>
              ⚠️ Wähle ein sicheres Passwort mit mindestens 6 Zeichen.
            </div>
            {[
              { label: "Aktuelles Passwort", key: "alt", visKey: "alt" as const },
              { label: "Neues Passwort", key: "neu", visKey: "neu" as const },
              { label: "Neues Passwort bestätigen", key: "bestaetigung", visKey: "best" as const },
            ].map(({ label, key, visKey }) => (
              <div key={key}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", display: "block", marginBottom: 4 }}>{label}</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={pwVisible[visKey] ? "text" : "password"}
                    value={(pwForm as any)[key]}
                    onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder="••••••••"
                    style={{ width: "100%", padding: "10px 40px 10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, boxSizing: "border-box", outline: "none" }}
                    onFocus={e => (e.target.style.borderColor = "#0d9488")}
                    onBlur={e => (e.target.style.borderColor = "#e5e7eb")}
                  />
                  <button
                    type="button"
                    onClick={() => setPwVisible(v => ({ ...v, [visKey]: !v[visKey] }))}
                    style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#9ca3af" }}
                  >
                    {pwVisible[visKey] ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={handleChangePassword}
              disabled={changePassword.isPending}
              style={{ background: "#0d9488", color: "#fff", border: "none", borderRadius: 12, padding: "13px", fontWeight: 700, fontSize: 15, cursor: "pointer", opacity: changePassword.isPending ? 0.7 : 1, marginTop: 4 }}
            >
              {changePassword.isPending ? "Wird geändert..." : "🔒 Passwort jetzt ändern"}
            </button>
          </div>
        </div>
      )}

      {/* ── Dokumente-Tab ── */}
      {tab === "dokumente" && (
        <div>
          {/* Upload-Formular */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden", marginBottom: 16 }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6", fontWeight: 700, fontSize: 14, color: "#111827" }}>
              📤 Dokument hochladen
            </div>
            <div style={{ padding: "16px 18px", display: "grid", gap: 12 }}>
              <div style={{ background: "#f0fdfa", border: "1px solid #99f6e4", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#0f766e" }}>
                💡 Lade hier deine Qualifikationsnachweise, Zertifikate und Dokumente hoch. Der Administrator sieht diese im Personalbogen.
              </div>

              {/* Typ */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Dokumenttyp</label>
                <select
                  value={uploadTyp}
                  onChange={e => setUploadTyp(e.target.value as any)}
                  style={{ width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, background: "#fff", boxSizing: "border-box", outline: "none" }}
                >
                  {Object.entries(DOK_TYPEN).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              {/* Bezeichnung */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Bezeichnung *</label>
                <input
                  type="text"
                  value={uploadBezeichnung}
                  onChange={e => setUploadBezeichnung(e.target.value)}
                  placeholder="z.B. Erste-Hilfe-Kurs 2024"
                  style={{ width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, boxSizing: "border-box", outline: "none" }}
                  onFocus={e => (e.target.style.borderColor = "#0d9488")}
                  onBlur={e => (e.target.style.borderColor = "#e5e7eb")}
                />
              </div>

              {/* Daten */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Ausstellungsdatum</label>
                  <input
                    type="date"
                    value={uploadAusstellungsdatum}
                    onChange={e => setUploadAusstellungsdatum(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, boxSizing: "border-box", outline: "none" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Ablaufdatum</label>
                  <input
                    type="date"
                    value={uploadAblaufdatum}
                    onChange={e => setUploadAblaufdatum(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, boxSizing: "border-box", outline: "none" }}
                  />
                </div>
              </div>

              {/* Datei */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Datei (optional)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  style={{ width: "100%", padding: "8px 12px", border: "2px dashed #d1d5db", borderRadius: 10, fontSize: 13, boxSizing: "border-box", cursor: "pointer", background: "#fafafa" }}
                />
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>PDF, JPG, PNG, DOC bis 16 MB</div>
              </div>

              {/* Notizen */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Notizen</label>
                <textarea
                  value={uploadNotizen}
                  onChange={e => setUploadNotizen(e.target.value)}
                  placeholder="Optionale Anmerkungen..."
                  rows={2}
                  style={{ width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, boxSizing: "border-box", outline: "none", resize: "vertical" }}
                  onFocus={e => (e.target.style.borderColor = "#0d9488")}
                  onBlur={e => (e.target.style.borderColor = "#e5e7eb")}
                />
              </div>

              <button
                onClick={handleUpload}
                disabled={uploading || addDokument.isPending}
                style={{ background: "#0d9488", color: "#fff", border: "none", borderRadius: 12, padding: "13px", fontWeight: 700, fontSize: 15, cursor: "pointer", opacity: (uploading || addDokument.isPending) ? 0.7 : 1 }}
              >
                {uploading ? "⏳ Wird hochgeladen..." : "📤 Dokument speichern"}
              </button>
            </div>
          </div>

          {/* Dokument-Liste */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6", fontWeight: 700, fontSize: 14, color: "#111827" }}>
              📁 Meine Dokumente ({dokumente.length})
            </div>
            {dokumente.length === 0 ? (
              <div style={{ padding: "24px 18px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                Noch keine Dokumente hochgeladen.
              </div>
            ) : (
              <div style={{ padding: "8px 0" }}>
                {dokumente.map((d: any) => {
                  const isAbgelaufen = d.ablaufdatum && new Date(d.ablaufdatum) < new Date();
                  const laeuftBaldAb = d.ablaufdatum && !isAbgelaufen && (new Date(d.ablaufdatum).getTime() - Date.now()) < 30 * 24 * 60 * 60 * 1000;
                  return (
                    <div key={d.id} style={{ padding: "12px 18px", borderBottom: "1px solid #f9fafb", display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>
                        {DOK_TYPEN[d.typ]?.split(" ")[0] ?? "📁"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{d.bezeichnung}</div>
                        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                          {DOK_TYPEN[d.typ] ?? d.typ}
                          {d.ausstellungsdatum && ` · Ausgestellt: ${new Date(d.ausstellungsdatum).toLocaleDateString("de-DE")}`}
                          {d.ablaufdatum && (
                            <span style={{ color: isAbgelaufen ? "#dc2626" : laeuftBaldAb ? "#d97706" : "#6b7280" }}>
                              {` · Ablauf: ${new Date(d.ablaufdatum).toLocaleDateString("de-DE")}`}
                              {isAbgelaufen && " ⚠️ Abgelaufen"}
                              {laeuftBaldAb && " ⏰ Läuft bald ab"}
                            </span>
                          )}
                        </div>
                        {d.notizen && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2, fontStyle: "italic" }}>{d.notizen}</div>}
                        {d.dateiUrl && (
                          <a
                            href={d.dateiUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: 12, color: "#0d9488", fontWeight: 600, display: "inline-block", marginTop: 4 }}
                          >
                            📎 {d.dateiname ?? "Datei öffnen"}
                          </a>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          if (!window.confirm(`Dokument "${d.bezeichnung}" wirklich löschen?`)) return;
                          deleteDokument.mutate({ id: d.id });
                        }}
                        style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
                      >
                        🗑️
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
