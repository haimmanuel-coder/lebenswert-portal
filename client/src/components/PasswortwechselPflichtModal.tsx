import { useState } from "react";
import { toast } from "sonner";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { trpc } from "@/lib/trpc";
import { pruefeSicheresPasswort, SICHERES_PASSWORT_HINWEIS } from "@shared/passwordPolicy";

export function PasswortwechselPflichtModal() {
  const { mitarbeiter, refetch, logout } = usePortalAuth();
  const [altesPasswort, setAltesPasswort] = useState("");
  const [neuesPasswort, setNeuesPasswort] = useState("");
  const [wiederholung, setWiederholung] = useState("");
  const wechsel = trpc.portal.changePassword.useMutation({
    onSuccess: async () => {
      setAltesPasswort(""); setNeuesPasswort(""); setWiederholung("");
      await refetch();
      toast.success("Dein persönliches Passwort wurde gespeichert.");
    },
    onError: (error: any) => toast.error(error.message ?? "Passwort konnte nicht geändert werden."),
  });

  if (!mitarbeiter?.passwortWechselErforderlich) return null;
  const pruefung = pruefeSicheresPasswort(neuesPasswort);
  const istGueltig = pruefung.gueltig && neuesPasswort === wiederholung && altesPasswort.length > 0;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="passwortwechsel-titel" style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(15, 23, 42, 0.66)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <form onSubmit={(event) => { event.preventDefault(); if (istGueltig) wechsel.mutate({ altesPasswort, neuesPasswort }); }} style={{ width: "min(100%, 440px)", background: "#fff", borderRadius: 18, padding: 26, boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "#e8f5e4", display: "grid", placeItems: "center", fontSize: 22, marginBottom: 14 }}>🔐</div>
        <h2 id="passwortwechsel-titel" style={{ margin: 0, color: "#173a1a", fontSize: 20 }}>Persönliches Passwort festlegen</h2>
        <p style={{ margin: "8px 0 18px", color: "#4b5563", fontSize: 14, lineHeight: 1.5 }}>Dein Startpasswort ist nur einmal gültig. Bitte lege jetzt ein persönliches Passwort fest, bevor du das Portal nutzt.</p>
        <label style={labelStyle}>Startpasswort</label>
        <input autoComplete="current-password" type="password" value={altesPasswort} onChange={(event) => setAltesPasswort(event.target.value)} style={inputStyle} />
        <label style={labelStyle}>Neues persönliches Passwort</label>
        <input autoComplete="new-password" type="password" value={neuesPasswort} onChange={(event) => setNeuesPasswort(event.target.value)} style={inputStyle} />
        <div style={{ fontSize: 12, color: "#6b7280", margin: "-6px 0 10px" }}>{SICHERES_PASSWORT_HINWEIS}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 10px", margin: "0 0 12px", fontSize: 11 }}>
          {[[pruefung.mindestlaenge, "Mindestens 12 Zeichen"], [pruefung.grossbuchstabe, "Großbuchstabe"], [pruefung.kleinbuchstabe, "Kleinbuchstabe"], [pruefung.ziffer, "Zahl"], [pruefung.sonderzeichen, "Sonderzeichen"]].map(([erfuellt, text]) => <span key={String(text)} style={{ color: erfuellt ? "#15803d" : "#64748b", fontWeight: erfuellt ? 700 : 500 }}>{erfuellt ? "✓" : "○"} {text}</span>)}
        </div>
        <label style={labelStyle}>Neues Passwort wiederholen</label>
        <input autoComplete="new-password" type="password" value={wiederholung} onChange={(event) => setWiederholung(event.target.value)} style={{ ...inputStyle, borderColor: wiederholung && wiederholung !== neuesPasswort ? "#dc2626" : "#d1d5db" }} />
        {wiederholung && wiederholung !== neuesPasswort && <div style={{ color: "#b91c1c", fontSize: 12, marginTop: -6, marginBottom: 10 }}>Die beiden Passwörter stimmen nicht überein.</div>}
        <button type="submit" disabled={!istGueltig || wechsel.isPending} style={{ width: "100%", marginTop: 8, padding: "12px 16px", background: istGueltig ? "#4a8c3f" : "#9ca3af", color: "#fff", border: "none", borderRadius: 10, fontWeight: 800, cursor: istGueltig ? "pointer" : "not-allowed" }}>
          {wechsel.isPending ? "Wird gespeichert …" : "Passwort speichern und fortfahren"}
        </button>
        <button type="button" onClick={logout} style={{ width: "100%", marginTop: 10, padding: "8px", background: "transparent", color: "#4b5563", border: "none", cursor: "pointer", fontSize: 13 }}>Stattdessen abmelden</button>
      </form>
    </div>
  );
}

const labelStyle = { display: "block", color: "#374151", fontSize: 13, fontWeight: 700, marginBottom: 6 } as const;
const inputStyle = { width: "100%", boxSizing: "border-box" as const, padding: "10px 12px", marginBottom: 12, border: "1px solid #d1d5db", borderRadius: 9, fontSize: 14 };
