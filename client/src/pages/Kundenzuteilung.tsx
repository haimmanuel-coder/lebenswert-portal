/**
 * Kundenzuteilung.tsx
 * Admin-Seite: Kunden flexibel Mitarbeitern zuweisen und jederzeit ändern.
 * Anforderung: "Initiale Zuteilung + manuelle Anpassung jederzeit möglich"
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function Kundenzuteilung() {
  const { user } = useAuth();
  const isAdmin = (user as any)?.rolle === "admin";

  const [selectedMaId, setSelectedMaId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // Daten laden
  const { data: mitarbeiterListe = [] } = trpc.admin.mitarbeiterList.useQuery(undefined, { enabled: isAdmin });
  const { data: alleKunden = [] } = trpc.kunden.list.useQuery();

  // Zuordnungen für den ausgewählten Mitarbeiter
  const { data: zuordnungen = [], refetch: refetchZuordnungen } = trpc.admin.getZuordnung.useQuery(
    { mitarbeiterId: selectedMaId! },
    { enabled: !!selectedMaId }
  );

  const setZuordnungMut = trpc.admin.setZuordnung.useMutation({
    onSuccess: () => {
      toast.success("✅ Zuteilung gespeichert!");
      refetchZuordnungen();
      setSaving(false);
    },
    onError: (e) => {
      toast.error("❌ " + e.message);
      setSaving(false);
    },
  });

  // Aktuell zugewiesene Kunden-IDs als Set
  const zugewieseneIds = useMemo(
    () => new Set((zuordnungen as any[]).map((z: any) => z.kundenId)),
    [zuordnungen]
  );

  // Lokaler Toggle-State (vor dem Speichern)
  const [localToggled, setLocalToggled] = useState<Set<number>>(new Set());
  const [localUntoggled, setLocalUntoggled] = useState<Set<number>>(new Set());

  // Effektive Zuordnung (lokal + gespeichert)
  const effectiveIds = useMemo(() => {
    const ids = new Set(zugewieseneIds);
    localToggled.forEach(id => ids.add(id));
    localUntoggled.forEach(id => ids.delete(id));
    return ids;
  }, [zugewieseneIds, localToggled, localUntoggled]);

  const hasChanges = localToggled.size > 0 || localUntoggled.size > 0;

  function handleMaSelect(maId: number) {
    setSelectedMaId(maId);
    setLocalToggled(new Set());
    setLocalUntoggled(new Set());
  }

  function toggleKunde(kundenId: number) {
    const isCurrently = effectiveIds.has(kundenId);
    if (isCurrently) {
      setLocalUntoggled(prev => { const s = new Set(prev); s.add(kundenId); return s; });
      setLocalToggled(prev => { const s = new Set(prev); s.delete(kundenId); return s; });
    } else {
      setLocalToggled(prev => { const s = new Set(prev); s.add(kundenId); return s; });
      setLocalUntoggled(prev => { const s = new Set(prev); s.delete(kundenId); return s; });
    }
  }

  function handleSave() {
    if (!selectedMaId) return;
    setSaving(true);
    setZuordnungMut.mutate({
      mitarbeiterId: selectedMaId,
      kundenIds: Array.from(effectiveIds),
    });
    setLocalToggled(new Set());
    setLocalUntoggled(new Set());
  }

  // Kunden-Filter
  const filteredKunden = useMemo(() => {
    const q = search.toLowerCase();
    return (alleKunden as any[]).filter((k: any) =>
      !q ||
      k.vorname?.toLowerCase().includes(q) ||
      k.nachname?.toLowerCase().includes(q) ||
      k.ort?.toLowerCase().includes(q)
    );
  }, [alleKunden, search]);

  const selectedMa = (mitarbeiterListe as any[]).find(m => m.id === selectedMaId);

  if (!isAdmin) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "#dc2626" }}>
        🔒 Diese Seite ist nur für Administratoren zugänglich.
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 12px 100px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0 }}>👥 Kundenzuteilung</h1>
        <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
          Weisen Sie Kunden flexibel Mitarbeitern zu. Änderungen sind jederzeit möglich und sofort wirksam.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16 }}>

        {/* Mitarbeiter-Liste */}
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid #f3f4f6", fontWeight: 700, fontSize: 13, color: "#111827" }}>
            🧑‍💼 Mitarbeiter
          </div>
          <div style={{ maxHeight: 520, overflowY: "auto" }}>
            {(mitarbeiterListe as any[]).length === 0 ? (
              <div style={{ padding: 16, color: "#9ca3af", fontSize: 13, textAlign: "center" }}>Keine Mitarbeiter</div>
            ) : (
              (mitarbeiterListe as any[]).map((ma: any) => {
                const isSelected = selectedMaId === ma.id;
                return (
                  <div
                    key={ma.id}
                    onClick={() => handleMaSelect(ma.id)}
                    style={{
                      padding: "10px 14px", cursor: "pointer",
                      background: isSelected ? "#f0fdfa" : "transparent",
                      borderLeft: isSelected ? "3px solid #0d9488" : "3px solid transparent",
                      borderBottom: "1px solid #f9fafb",
                      transition: "all 0.1s ease",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13, color: isSelected ? "#0f766e" : "#111827" }}>
                      {ma.vorname} {ma.nachname}
                    </div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>
                      {ma.rolle === "admin" ? "🔑 Admin" : "👤 Mitarbeiter"}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Kunden-Zuteilungs-Panel */}
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", overflow: "hidden" }}>
          {!selectedMaId ? (
            <div style={{ padding: 48, textAlign: "center", color: "#9ca3af" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>👈</div>
              <div style={{ fontSize: 14 }}>Bitte links einen Mitarbeiter auswählen</div>
            </div>
          ) : (
            <>
              {/* Panel-Header */}
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>
                    Kunden für {selectedMa?.vorname} {selectedMa?.nachname}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                    {effectiveIds.size} Kunden zugewiesen · {(alleKunden as any[]).length} gesamt
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {hasChanges && (
                    <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600 }}>
                      ⚠️ Ungespeicherte Änderungen
                    </span>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={!hasChanges || saving}
                    style={{
                      background: hasChanges ? "#0d9488" : "#e5e7eb",
                      color: hasChanges ? "#fff" : "#9ca3af",
                      border: "none", borderRadius: 10, padding: "8px 16px",
                      fontWeight: 700, fontSize: 13, cursor: hasChanges ? "pointer" : "default",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {saving ? "Speichert..." : "💾 Speichern"}
                  </button>
                </div>
              </div>

              {/* Suche */}
              <div style={{ padding: "10px 16px", borderBottom: "1px solid #f9fafb" }}>
                <Input
                  placeholder="Kunden suchen (Name, Ort)..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ fontSize: 13 }}
                />
              </div>

              {/* Kunden-Tabelle */}
              <div style={{ maxHeight: 420, overflowY: "auto" }}>
                {filteredKunden.length === 0 ? (
                  <div style={{ padding: 24, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Keine Kunden gefunden</div>
                ) : (
                  filteredKunden.map((k: any) => {
                    const isAssigned = effectiveIds.has(k.id);
                    const isNew = localToggled.has(k.id);
                    const isRemoved = localUntoggled.has(k.id);
                    return (
                      <div
                        key={k.id}
                        onClick={() => toggleKunde(k.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "10px 16px", cursor: "pointer",
                          background: isNew ? "#f0fdf4" : isRemoved ? "#fef2f2" : "transparent",
                          borderBottom: "1px solid #f9fafb",
                          transition: "background 0.1s ease",
                        }}
                      >
                        {/* Checkbox */}
                        <div style={{
                          width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                          background: isAssigned ? "#0d9488" : "#fff",
                          border: `2px solid ${isAssigned ? "#0d9488" : "#d1d5db"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 0.1s ease",
                        }}>
                          {isAssigned && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>✓</span>}
                        </div>

                        {/* Kunden-Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>
                            {k.nachname}, {k.vorname}
                          </div>
                          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>
                            {k.ort && `📍 ${k.ort}`}
                            {k.pflegegrad > 0 && ` · PG ${k.pflegegrad}`}
                          </div>
                        </div>

                        {/* Status-Badge */}
                        {isNew && <Badge style={{ background: "#dcfce7", color: "#166534", fontSize: 10 }}>Neu</Badge>}
                        {isRemoved && <Badge style={{ background: "#fee2e2", color: "#dc2626", fontSize: 10 }}>Entfernt</Badge>}
                        {isAssigned && !isNew && !isRemoved && (
                          <Badge style={{ background: "#dbeafe", color: "#1e40af", fontSize: 10 }}>Zugeteilt</Badge>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: "10px 16px", borderTop: "1px solid #f3f4f6", background: "#f9fafb", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  onClick={() => {
                    const alleIds = (alleKunden as any[]).map((k: any) => k.id);
                    setLocalToggled(new Set(alleIds));
                    setLocalUntoggled(new Set());
                  }}
                  style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 8, padding: "5px 10px", fontSize: 12, cursor: "pointer", color: "#374151" }}
                >
                  Alle auswählen
                </button>
                <button
                  onClick={() => {
                    setLocalUntoggled(new Set((alleKunden as any[]).map((k: any) => k.id)));
                    setLocalToggled(new Set());
                  }}
                  style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 8, padding: "5px 10px", fontSize: 12, cursor: "pointer", color: "#374151" }}
                >
                  Alle abwählen
                </button>
                <span style={{ marginLeft: "auto", fontSize: 11, color: "#9ca3af" }}>
                  Klick = Zuteilung umschalten · Speichern = sofort wirksam
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
