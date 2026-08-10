import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const PRIO_STYLE: Record<string, { bg: string; border: string; color: string; icon: string }> = {
  normal:   { bg: "#f0fdf4", border: "#bbf7d0", color: "#166534", icon: "📢" },
  wichtig:  { bg: "#fffbeb", border: "#fde68a", color: "#92400e", icon: "⚠️" },
  dringend: { bg: "#fef2f2", border: "#fecaca", color: "#991b1b", icon: "🚨" },
};

export default function MitteilungenWidget() {
  const { data: mitteilungen = [], refetch } = (trpc as any).mitteilungen.list.useQuery();
  const bestaetigen = (trpc as any).mitteilungen.bestaetigen.useMutation({
    onSuccess: () => { toast.success("✅ Lesebestätigung gespeichert"); refetch(); },
    onError: (e: any) => toast.error("❌ " + e.message),
  });

  const ungelesen = (mitteilungen as any[]).filter((m: any) => !Number(m.gelesen));

  if ((mitteilungen as any[]).length === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      {ungelesen.length > 0 && (
        <div style={{ background: "#fef3c7", borderRadius: 8, padding: "8px 12px", marginBottom: 10, fontSize: 13, fontWeight: 600, color: "#92400e" }}>
          📬 {ungelesen.length} ungelesene Mitteilung{ungelesen.length !== 1 ? "en" : ""}
        </div>
      )}
      {(mitteilungen as any[]).map((m: any) => {
        const prio = PRIO_STYLE[m.prioritaet] ?? PRIO_STYLE.normal;
        const gelesen = Number(m.gelesen) > 0;
        return (
          <div key={m.id} style={{ background: prio.bg, border: `2px solid ${prio.border}`, borderRadius: 12, padding: 14, marginBottom: 10, opacity: gelesen ? 0.7 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: prio.color, marginBottom: 4 }}>
                  {prio.icon} {m.titel}
                </div>
                <div style={{ fontSize: 12, color: "#374151", whiteSpace: "pre-wrap", marginBottom: 6 }}>{m.inhalt}</div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>{new Date(m.createdAt).toLocaleString("de-DE")}</div>
              </div>
              <div style={{ flexShrink: 0 }}>
                {gelesen ? (
                  <span style={{ padding: "4px 10px", background: "#dcfce7", color: "#166534", borderRadius: 8, fontSize: 11, fontWeight: 700 }}>✓ Gelesen</span>
                ) : m.lesebestaetigung_pflicht ? (
                  <button onClick={() => bestaetigen.mutate({ mitteilungId: m.id })}
                    disabled={bestaetigen.isPending}
                    style={{ padding: "6px 14px", background: prio.color, color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    ✍️ Bestätigen
                  </button>
                ) : (
                  <button onClick={() => bestaetigen.mutate({ mitteilungId: m.id })}
                    style={{ padding: "6px 14px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>
                    Als gelesen markieren
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

