import { Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes } from "react";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

/** Einheitliches Passwortfeld mit Umschalter zum Anzeigen und Verbergen. */
export default function PasswordInput({ style, ...props }: PasswordInputProps) {
  const [sichtbar, setSichtbar] = useState(false);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <input
        {...props}
        type={sichtbar ? "text" : "password"}
        style={{ width: "100%", ...style, paddingRight: style?.paddingRight ?? 44 }}
      />
      <button
        type="button"
        aria-label={sichtbar ? "Passwort verbergen" : "Passwort anzeigen"}
        title={sichtbar ? "Passwort verbergen" : "Passwort anzeigen"}
        onClick={() => setSichtbar((wert) => !wert)}
        style={{
          position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 30, height: 30, padding: 0, border: "none", borderRadius: 7,
          color: "#64748b", background: "transparent", cursor: "pointer",
        }}
      >
        {sichtbar ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </div>
  );
}
