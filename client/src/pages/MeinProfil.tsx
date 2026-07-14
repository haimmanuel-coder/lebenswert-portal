import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { toast } from "sonner";

export default function MeinProfil() {
  const { mitarbeiter, refreshAuth } = usePortalAuth() as any;
  const [tab, setTab] = useState<"profil" | "passwort">("profil");

  // Profil-Formular
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
  // Formular synchronisieren wenn mitarbeiter-Daten nach dem ersten Render laden
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

  // Passwort-Formular
  const [pwForm, setPwForm] = useState({ alt: "", neu: "", bestaetigung: "" });
  const [pwVisible, setPwVisible] = useState({ alt: false, neu: false, best: false });

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
          { id: "passwort", label: "🔒 Passwort ändern" },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            style={{
              flex: 1, padding: "10px 8px", borderRadius: 10, border: "none", cursor: "pointer",
              fontWeight: 700, fontSize: 13, transition: "all 0.15s ease",
              background: tab === t.id ? "#fff" : "transparent",
              color: tab === t.id ? "#0d9488" : "#6b7280",
              boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Profil-Tab */}
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

      {/* Passwort-Tab */}
      {tab === "passwort" && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6", fontWeight: 700, fontSize: 14, color: "#111827" }}>
            🔒 Passwort ändern
          </div>
          <div style={{ padding: "16px 18px", display: "grid", gap: 16 }}>
            <div style={{ background: "#fef9c3", border: "1px solid #fcd34d", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#92400e" }}>
              ⚠️ Wähle ein sicheres Passwort mit mindestens 6 Zeichen. Du wirst nach der Änderung nicht automatisch ausgeloggt.
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
    </div>
  );
}
