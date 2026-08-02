/**
 * VerrechnungssaetzeTab.tsx
 * Admin-Interface zum Ändern der Verrechnungssätze (§45b, §45a, §39).
 * Liest aktuelle Werte via planung.konfiguration und speichert via planung.setzeSatz.
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Paragraph = "45b" | "45a" | "39";

const PARAGRAPHEN: { id: Paragraph; label: string; farbe: string; beschreibung: string }[] = [
  { id: "45b", label: "§ 45b", farbe: "#4a8c3f", beschreibung: "Entlastungsleistungen (SGB XI)" },
  { id: "45a", label: "§ 45a", farbe: "#2563eb", beschreibung: "Niedrigschwellige Betreuungsangebote" },
  { id: "39", label: "§ 39", farbe: "#7c3aed", beschreibung: "Häusliche Pflegehilfe (SGB XI)" },
];

interface SatzFormular {
  satzProStunde: string;
  lohnProStunde: string;
  anfahrtPauschale: string;
}

const leerFormular = (): SatzFormular => ({
  satzProStunde: "",
  lohnProStunde: "",
  anfahrtPauschale: "",
});

export function VerrechnungssaetzeTab() {
  const { data: konfiguration, isLoading, refetch } = (trpc as any).planung.konfiguration.useQuery();
  const setzeSatz = (trpc as any).planung.setzeSatz.useMutation({
    onSuccess: () => {
      toast.success("Verrechnungssatz gespeichert");
      refetch();
      setBearbeiteParagraph(null);
    },
    onError: (err: any) => toast.error("Fehler: " + err.message),
  });

  const [bearbeiteParagraph, setBearbeiteParagraph] = useState<Paragraph | null>(null);
  const [formular, setFormular] = useState<SatzFormular>(leerFormular());

  const oeffneBearbeiten = (paragraph: Paragraph) => {
    const satz = konfiguration?.saetze?.[paragraph] ?? 36;
    setFormular({
      satzProStunde: String(satz),
      lohnProStunde: String(konfiguration?.lohnProStunde ?? 16),
      anfahrtPauschale: String(konfiguration?.anfahrtPauschale ?? 6),
    });
    setBearbeiteParagraph(paragraph);
  };

  const speichern = () => {
    if (!bearbeiteParagraph) return;
    const satz = parseFloat(formular.satzProStunde.replace(",", "."));
    const lohn = parseFloat(formular.lohnProStunde.replace(",", "."));
    const anfahrt = parseFloat(formular.anfahrtPauschale.replace(",", "."));
    if (isNaN(satz) || satz <= 0) return toast.error("Ungültiger Stundensatz");
    if (isNaN(lohn) || lohn <= 0) return toast.error("Ungültiger Lohnwert");
    if (isNaN(anfahrt) || anfahrt < 0) return toast.error("Ungültige Anfahrtspauschale");
    setzeSatz.mutate({ paragraph: bearbeiteParagraph, satzProStunde: satz, lohnProStunde: lohn, anfahrtPauschale: anfahrt });
  };

  if (isLoading) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "#6b7280" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
        Lade Verrechnungssätze …
      </div>
    );
  }

  return (
    <div style={{ padding: "0 0 32px" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: "#111827", marginBottom: 4 }}>
          💶 Leistungskosten & Verrechnungssätze
        </div>
        <div style={{ fontSize: 13, color: "#6b7280" }}>
          Hier legen Sie die Stundensätze für die Kundenabrechnung, den internen Lohnansatz
          und die Anfahrtspauschale fest. Änderungen gelten sofort für neue Einsätze.
        </div>
      </div>

      {/* Globale Werte */}
      <div style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Lohn pro Stunde (intern)</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#4a8c3f" }}>{konfiguration?.lohnProStunde?.toFixed(2) ?? "–"} €</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Anfahrtspauschale pro Besuch</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#4a8c3f" }}>{konfiguration?.anfahrtPauschale?.toFixed(2) ?? "–"} €</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Minijob-Grenze</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#4a8c3f" }}>{konfiguration?.minijobGrenze ?? "–"} €</div>
        </div>
      </div>

      {/* Paragraph-Karten */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
        {PARAGRAPHEN.map((p) => {
          const satz = konfiguration?.saetze?.[p.id];
          const istBearbeitung = bearbeiteParagraph === p.id;
          return (
            <div
              key={p.id}
              style={{
                background: "#fff",
                border: `2px solid ${istBearbeitung ? p.farbe : "#e5e7eb"}`,
                borderRadius: 14,
                padding: 18,
                transition: "border-color 0.2s",
              }}
            >
              {/* Karten-Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: p.farbe }}>{p.label}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{p.beschreibung}</div>
                </div>
                <div style={{ fontSize: 26, fontWeight: 900, color: p.farbe }}>
                  {satz != null ? `${satz.toFixed(2)} €` : "–"}
                  <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400, textAlign: "right" }}>/ Stunde</div>
                </div>
              </div>

              {/* Bearbeitungsformular */}
              {istBearbeitung ? (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, display: "block", marginBottom: 4 }}>
                        Stundensatz (€) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formular.satzProStunde}
                        onChange={(e) => setFormular((f) => ({ ...f, satzProStunde: e.target.value }))}
                        style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
                        placeholder="z.B. 36.00"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, display: "block", marginBottom: 4 }}>
                        Lohn/Std. intern (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formular.lohnProStunde}
                        onChange={(e) => setFormular((f) => ({ ...f, lohnProStunde: e.target.value }))}
                        style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
                        placeholder="z.B. 16.00"
                      />
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, display: "block", marginBottom: 4 }}>
                        Anfahrtspauschale (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formular.anfahrtPauschale}
                        onChange={(e) => setFormular((f) => ({ ...f, anfahrtPauschale: e.target.value }))}
                        style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
                        placeholder="z.B. 6.00"
                      />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={speichern}
                      disabled={setzeSatz.isPending}
                      style={{
                        flex: 1, padding: "9px 0", background: p.farbe, color: "#fff",
                        border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13,
                        cursor: setzeSatz.isPending ? "not-allowed" : "pointer", opacity: setzeSatz.isPending ? 0.7 : 1,
                      }}
                    >
                      {setzeSatz.isPending ? "Speichert …" : "✓ Speichern"}
                    </button>
                    <button
                      onClick={() => setBearbeiteParagraph(null)}
                      style={{ padding: "9px 14px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => oeffneBearbeiten(p.id)}
                  style={{
                    width: "100%", padding: "9px 0", background: "#f3f4f6", color: "#374151",
                    border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#e5e7eb")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#f3f4f6")}
                >
                  ✏️ Satz bearbeiten
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Hinweis */}
      <div style={{ marginTop: 20, background: "#fef9c3", border: "1.5px solid #fde047", borderRadius: 10, padding: "12px 16px", fontSize: 12.5, color: "#713f12" }}>
        <strong>⚠️ Hinweis:</strong> Änderungen an Verrechnungssätzen wirken sich auf alle <em>neu geplanten</em> Einsätze aus.
        Bereits abgeschlossene Einsätze und Leistungsnachweise behalten ihre ursprünglichen Kosten.
        Die Anfahrtspauschale gilt für alle drei Paragraphen gemeinsam.
      </div>
    </div>
  );
}
