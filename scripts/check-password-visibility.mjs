import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const passwordInput = await readFile(new URL("client/src/components/PasswordInput.tsx", root), "utf8");
const files = [
  "client/src/pages/Login.tsx",
  "client/src/components/PasswortwechselPflichtModal.tsx",
  "client/src/pages/ResetPasswort.tsx",
  "client/src/pages/MeinProfil.tsx",
  "client/src/pages/AdminPanel.tsx",
  "client/src/pages/SmtpKonfiguration.tsx",
  "client/src/pages/Integrationen.tsx",
  "client/src/pages/PflichtenheftCenter.tsx",
  "client/src/pages/ComponentShowcase.tsx",
];

if (!passwordInput.includes('aria-label={sichtbar ? "Passwort verbergen" : "Passwort anzeigen"}')) {
  throw new Error("PasswordInput besitzt keine eindeutige, barrierefreie Umschaltbeschriftung.");
}
if (!passwordInput.includes("<Eye") || !passwordInput.includes("<EyeOff")) {
  throw new Error("PasswordInput verwendet keine einheitlichen Auge-Symbole.");
}

for (const file of files) {
  const content = await readFile(new URL(file, root), "utf8");
  if (!content.includes('PasswordInput from "@/components/PasswordInput"')) {
    throw new Error(`${file}: gemeinsame Passwortkomponente fehlt.`);
  }
  if (/<input[^>]*type="password"/s.test(content)) {
    throw new Error(`${file}: altes Passwortfeld ohne Auge gefunden.`);
  }
  if (content.includes("pwVisible") || content.includes("pwResetSichtbar") || content.includes("🙈")) {
    throw new Error(`${file}: abweichende alte Passwortsichtbarkeit gefunden.`);
  }
}

console.log(`Passwortsichtbarkeit geprüft: ${files.length} Formulare verwenden das gemeinsame Auge-Symbol.`);
