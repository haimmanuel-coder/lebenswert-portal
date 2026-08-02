/**
 * ComplianceAmpelTab – Übersicht aller aktiven Mitarbeiter mit Ampel-Status.
 *
 * Ampel-Logik (Backend):
 *  🔴 Rot   = abgelaufene Dokumente, kein Arbeitsvertrag oder kein Zertifikat
 *  🟡 Gelb  = Dokumente laufen bald ab, kein Erste-Hilfe-Kurs oder Schulung noch nicht abgeschlossen
 *  🟢 Grün  = Alles in Ordnung
 *
 * Zusätzlich: Ablaufende-Dokumente-Liste + Erinnerungs-Push an Admin.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type AmpelStatus = "gruen" | "gelb" | "rot";

interface ComplianceEintrag {
  id: number;
  vorname: string;
  nachname: string;
  rolle: string;
  beschaeftigungsart: string;
  ampel: AmpelStatus;
  abgelaufenAnzahl: number;
  baldAblaufendAnzahl: number;
  hatVertrag: boolean;
  hatErsteHilfe: boolean;
  zertStatus: string;
  probleme: string[];
}

const AMPEL_CONFIG: Record<AmpelStatus, { bg: string; border: string; label: string; emoji: string }> = {
  gruen: { bg: "#f0fdf4", border: "#16a34a", label: "Alles OK", emoji: "🟢" },
  gelb:  { bg: "#fefce8", border: "#ca8a04", label: "Handlungsbedarf", emoji: "🟡" },
  rot:   { bg: "#fef2f2", border: "#dc2626", label: "Dringend", emoji: "🔴" },
};

const BESCHAEFTIGUNG_LABEL: Record<string, string> = {
  minijob: "Minijob",
  teilzeit: "Teilzeit",
  vollzeit: "Vollzeit",
};

export default function ComplianceAmpelTab() {
  const [filter, setFilter] = useState<"alle" | AmpelStatus>("alle");
  const [aufgeklappt, setAufgeklappt] = useState<number | null>(null);
  const [tageFenster, setTageFenster] = useState(30);

  const { data: uebersicht = [], isLoading, refetch } = (trpc as any).compliance.uebersicht.useQuery();
  const { data: ablaufend = [], isLoading: ablaufLaden } = (trpc as any).compliance.ablaufendeDokumente.useQuery({ tage: tageFenster });
  const erinnerungMutation = (trpc as any).compliance.erinnerungSenden.useMutation({
    onSuccess: (res: { gesendet: boolean; anzahl: number }) => {
      if (res.gesendet) toast.success(`✅ Erinnerung gesendet – ${res.anzahl} Dokument(e) gemeldet`);
      else toast.info("Keine ablaufenden Dokumente im gewählten Zeitraum.");
    },
    onError: () => toast.error("Fehler beim Senden der Erinnerung."),
  });

  const gefiltert = (uebersicht as ComplianceEintrag[]).filter(e =>
    filter === "alle" ? true : e.ampel === filter
  );

  const anzahlRot  = (uebersicht as ComplianceEintrag[]).filter(e => e.ampel === "rot").length;
  const anzahlGelb = (uebersicht as ComplianceEintrag[]).filter(e => e.ampel === "gelb").length;
  const anzahlGruen = (uebersicht as ComplianceEintrag[]).filter(e => e.ampel === "gruen").length;

  return (
    <div style={{ padding: "0 0 40px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111", margin: 0 }}>
          🚦 Compliance-Ampel
        </h2>
        <p style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
          Übersicht aller aktiven Mitarbeiter – Dokumente, Zertifikate, Verträge auf einen Blick.
        </p>
      </div>

      {/* KPI-Karten */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Dringend 🔴", count: anzahlRot, bg: "#fef2f2", border: "#dc2626", color: "#dc2626" },
          { label: "Handlungsbedarf 🟡", count: anzahlGelb, bg: "#fefce8", border: "#ca8a04", color: "#ca8a04" },
          { label: "Alles OK 🟢", count: anzahlGruen, bg: "#f0fdf4", border: "#16a34a", color: "#16a34a" },
        ].map(k => (
          <div key={k.label} style={{
            background: k.bg, border: `1.5px solid ${k.border}`, borderRadius: 10,
            padding: "14px 16px", textAlign: "center",
          }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: k.color }}>{k.count}</div>
            <div style={{ fontSize: 12, color: "#374151", marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filter-Buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {(["alle", "rot", "gelb", "gruen"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
              border: filter === f ? "2px solid #4a8c3f" : "1.5px solid #e5e7eb",
              background: filter === f ? "#4a8c3f" : "#fff",
              color: filter === f ? "#fff" : "#374151",
              cursor: "pointer",
            }}
          >
            {f === "alle" ? "Alle" : f === "rot" ? "🔴 Dringend" : f === "gelb" ? "🟡 Handlungsbedarf" : "🟢 OK"}
          </button>
        ))}
        <button
          onClick={() => refetch()}
          style={{
            marginLeft: "auto", padding: "6px 14px", borderRadius: 20, fontSize: 12,
            border: "1.5px solid #e5e7eb", background: "#fff", color: "#374151", cursor: "pointer",
          }}
        >🔄 Aktualisieren</button>
      </div>

      {/* Mitarbeiter-Liste */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>Lade Daten…</div>
      ) : gefiltert.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
          {filter === "alle" ? "Keine aktiven Mitarbeiter gefunden." : `Keine Mitarbeiter mit Status "${filter}".`}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {gefiltert.map(ma => {
            const cfg = AMPEL_CONFIG[ma.ampel];
            const offen = aufgeklappt === ma.id;
            return (
              <div key={ma.id} style={{
                border: `1.5px solid ${cfg.border}`, borderRadius: 10,
                background: cfg.bg, overflow: "hidden",
              }}>
                {/* Kopfzeile */}
                <button
                  onClick={() => setAufgeklappt(offen ? null : ma.id)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 16px", background: "transparent", border: "none",
                    cursor: "pointer", textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: 20 }}>{cfg.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>
                      {ma.vorname} {ma.nachname}
                    </div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                      {BESCHAEFTIGUNG_LABEL[ma.beschaeftigungsart] ?? ma.beschaeftigungsart} · {ma.rolle}
                    </div>
                  </div>
                  {/* Status-Badges */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {ma.abgelaufenAnzahl > 0 && (
                      <span style={{ background: "#dc2626", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10 }}>
                        {ma.abgelaufenAnzahl} abgelaufen
                      </span>
                    )}
                    {ma.baldAblaufendAnzahl > 0 && (
                      <span style={{ background: "#ca8a04", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10 }}>
                        {ma.baldAblaufendAnzahl} bald fällig
                      </span>
                    )}
                    {!ma.hatVertrag && (
                      <span style={{ background: "#7c3aed", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10 }}>
                        Kein Vertrag
                      </span>
                    )}
                    {!ma.hatErsteHilfe && (
                      <span style={{ background: "#ea580c", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10 }}>
                        Kein EH-Kurs
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: 8 }}>{offen ? "▲" : "▼"}</span>
                </button>

                {/* Aufgeklappte Probleme */}
                {offen && (
                  <div style={{ padding: "0 16px 14px", borderTop: `1px solid ${cfg.border}` }}>
                    {ma.probleme.length === 0 ? (
                      <p style={{ color: "#16a34a", fontSize: 13, margin: "10px 0 0" }}>✅ Alle Anforderungen erfüllt</p>
                    ) : (
                      <ul style={{ margin: "10px 0 0", padding: 0, listStyle: "none" }}>
                        {ma.probleme.map((p, i) => (
                          <li key={i} style={{ fontSize: 13, color: "#374151", padding: "3px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                            {p}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                      <span style={{ fontSize: 11, color: "#6b7280" }}>
                        Vertrag: {ma.hatVertrag ? "✅" : "❌"} · Erste Hilfe: {ma.hatErsteHilfe ? "✅" : "❌"} · Zertifikat: {ma.zertStatus}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Ablaufende Dokumente Sektion */}
      <div style={{ marginTop: 36, borderTop: "1.5px solid #e5e7eb", paddingTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111", margin: 0 }}>
              ⏰ Ablaufende Dokumente
            </h3>
            <p style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>
              Dokumente, die in den nächsten {tageFenster} Tagen ablaufen oder bereits abgelaufen sind.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select
              value={tageFenster}
              onChange={e => setTageFenster(Number(e.target.value))}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 12 }}
            >
              <option value={14}>14 Tage</option>
              <option value={30}>30 Tage</option>
              <option value={60}>60 Tage</option>
              <option value={90}>90 Tage</option>
            </select>
            <button
              onClick={() => erinnerungMutation.mutate({ tage: tageFenster })}
              disabled={erinnerungMutation.isPending}
              style={{
                padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: "#4a8c3f", color: "#fff", border: "none", cursor: "pointer",
                opacity: erinnerungMutation.isPending ? 0.6 : 1,
              }}
            >
              {erinnerungMutation.isPending ? "Sende…" : "🔔 Erinnerung senden"}
            </button>
          </div>
        </div>

        {ablaufLaden ? (
          <div style={{ textAlign: "center", padding: 20, color: "#9ca3af" }}>Lade…</div>
        ) : (ablaufend as any[]).length === 0 ? (
          <div style={{
            background: "#f0fdf4", border: "1.5px solid #16a34a", borderRadius: 10,
            padding: "16px 20px", color: "#16a34a", fontSize: 13, fontWeight: 600,
          }}>
            ✅ Keine ablaufenden Dokumente im gewählten Zeitraum.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {(ablaufend as any[]).map((dok: any) => (
              <div key={dok.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 14px", borderRadius: 8,
                background: dok.bereitsAbgelaufen ? "#fef2f2" : "#fefce8",
                border: `1px solid ${dok.bereitsAbgelaufen ? "#fca5a5" : "#fde68a"}`,
              }}>
                <span style={{ fontSize: 18 }}>{dok.bereitsAbgelaufen ? "❌" : "⚠️"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#111" }}>
                    {dok.vorname} {dok.nachname} – {dok.bezeichnung}
                  </div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                    Typ: {dok.typ} · Ablauf: {dok.ablaufdatum ? new Date(dok.ablaufdatum).toLocaleDateString("de-DE") : "–"}
                  </div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 8,
                  background: dok.bereitsAbgelaufen ? "#dc2626" : "#ca8a04",
                  color: "#fff",
                }}>
                  {dok.bereitsAbgelaufen
                    ? `${Math.abs(dok.tageBisAblauf)} Tage überfällig`
                    : `in ${dok.tageBisAblauf} Tagen`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
