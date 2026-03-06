import React from "react";
import { COLORS, FONTS } from "../tokens";
import Icon from "../icons";

// MobileHeader — shown only at < 768px
// Hamburger button (left) + logo (center)
const MobileHeader = ({ onMenuToggle }) => (
  <div
    style={{
      height: 56,
      background: COLORS.white,
      borderBottom: `1px solid ${COLORS.border}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 16px",
      position: "sticky",
      top: 0,
      zIndex: 50,
    }}
  >
    <button
      onClick={onMenuToggle}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 6,
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon type="menu" size={22} color={COLORS.black} />
    </button>
    <div
      style={{
        fontFamily: FONTS.display,
        fontSize: 16,
        fontWeight: 600,
        letterSpacing: "0.02em",
        color: COLORS.black,
      }}
    >
      THE GREENWAY BAND
    </div>
    {/* Spacer for centering */}
    <div style={{ width: 34 }} />
  </div>
);

export default MobileHeader;
