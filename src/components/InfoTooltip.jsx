// src/components/InfoTooltip.jsx
import React, { useEffect, useState } from "react";

/**
 * Minimal tooltip that positions next to an anchor element.
 * Uses only inline styles on the tooltip box; does not alter global/theme styles.
 */
export default function InfoTooltip({ anchorEl, open, onClose, children }) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    function updatePos() {
      if (!anchorEl) return;
      const rect = anchorEl.getBoundingClientRect();
      const gap = 8;
      const width = 300;
      const left = Math.min(
        Math.max(8, rect.left + window.scrollX),
        window.innerWidth - width - 8
      );
      const top = rect.bottom + window.scrollY + gap;
      setPos({ top, left });
    }
    updatePos();
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [anchorEl, open]);

  if (!open) return null;

  // Inline styles only here; neutral, self-contained.
  const boxStyle = {
    position: "absolute",
    top: pos.top,
    left: pos.left,
    width: "300px",
    maxWidth: "90vw",
    background: "rgba(17,17,17,0.98)",
    color: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "10px",
    padding: "10px 12px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
    fontSize: "12px",
    lineHeight: 1.35,
    zIndex: 1000,
  };

  return (
    <div style={boxStyle}
         role="tooltip"
         onMouseLeave={onClose}
         onKeyDown={(e) => e.key === "Escape" && onClose()}>
      {children}
    </div>
  );
}