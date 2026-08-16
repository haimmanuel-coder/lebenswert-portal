import { readFile } from "node:fs/promises";

const source = await readFile("client/src/pages/Dashboard.tsx", "utf8");
const markAllHookMatches = source.match(/markAllRead\?\.useMutation\?\./g) ?? [];

if (markAllHookMatches.length !== 1) {
  throw new Error(`Erwartet genau eine Registrierung des markAllRead-Hooks, gefunden: ${markAllHookMatches.length}.`);
}
if (/onClick=\{\(\) =>[^}]*useMutation/s.test(source)) {
  throw new Error("Ein React-Hook wird weiterhin innerhalb eines Dashboard-Klickhandlers aufgerufen.");
}
if (!source.includes("onClick={() => markAllRead?.mutate?.()}")) {
  throw new Error("Der Button „Alle gelesen“ löst die vorbereitete Mutation nicht aus.");
}

console.log("Dashboard-Hook-Prüfung bestanden: Alle gelesen verwendet eine beim Rendern registrierte Mutation.");
