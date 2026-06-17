import React, { useEffect } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white w-full overflow-y-auto"
        style={{
          borderRadius: "20px 20px 0 0",
          maxHeight: "90vh",
          padding: "20px 20px calc(20px + env(safe-area-inset-bottom))",
          animation: "slideUp 0.25s cubic-bezier(0.23,1,0.32,1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            width: 40, height: 4, background: "#e5e7eb",
            borderRadius: 2, margin: "0 auto 16px",
          }}
        />
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>{title}</div>
        {children}
      </div>
    </div>
  );
}
