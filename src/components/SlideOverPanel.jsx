import React, { useEffect } from "react";
import { COLORS, FONTS, RADII, SHADOWS } from "../tokens";

// SlideOverPanel — 520px right drawer
// Fixed position, full height, white bg, left border, panel shadow
// slideIn animation 0.25s ease
// Backdrop overlay with fade
const SlideOverPanel = ({ open, onClose, title, subtitle, children, width = 520 }) => {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(10, 10, 9, 0.3)",
          backdropFilter: "blur(2px)",
          zIndex: 99,
          animation: "fadeIn 0.2s ease",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width,
          maxWidth: "100vw",
          height: "100vh",
          background: COLORS.white,
          borderLeft: `1px solid ${COLORS.border}`,
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          boxShadow: SHADOWS.panel,
          animation: "slideIn 0.25s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: `1px solid ${COLORS.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <div>
            {title && (
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: COLORS.black,
                  fontFamily: FONTS.body,
                }}
              >
                {title}
              </div>
            )}
            {subtitle && (
              <div
                style={{
                  fontSize: 12,
                  color: COLORS.textMuted,
                  marginTop: 2,
                }}
              >
                {subtitle}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 6,
              borderRadius: RADII.sm,
              color: COLORS.textMuted,
              fontSize: 18,
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.bg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: 24,
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
};

export default SlideOverPanel;
