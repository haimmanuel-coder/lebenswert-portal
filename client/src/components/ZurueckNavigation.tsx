import * as React from "react";

type ZurueckNavigationProps = {
  onZurueck: () => void;
  kompakt?: boolean;
};

/**
 * Einheitlicher Rückweg innerhalb der Portal-App. Der Button verwendet
 * bewusst keinen Browser-Zurück-Aufruf, damit Mitarbeitende die Anwendung
 * nicht versehentlich verlassen.
 */
export function ZurueckNavigation({ onZurueck, kompakt = false }: ZurueckNavigationProps) {
  return (
    <button
      type="button"
      onClick={onZurueck}
      aria-label="Zur vorherigen Ansicht zurück"
      title="Zurück zur vorherigen Ansicht"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: kompakt ? 0 : 6,
        minWidth: kompakt ? 40 : 74,
        minHeight: 40,
        padding: kompakt ? 8 : "8px 11px",
        borderRadius: 9,
        border: "1px solid #cbd5e1",
        background: "#f8fafc",
        color: "#1e3a2a",
        fontSize: 13,
        fontWeight: 750,
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 20, lineHeight: 1 }}>←</span>
      {!kompakt && <span>Zurück</span>}
    </button>
  );
}
