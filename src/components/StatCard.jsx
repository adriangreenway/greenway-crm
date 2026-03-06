import React from "react";
import { COLORS, FONTS, RADII } from "../tokens";
import Icon from "../icons";

// StatCard — matches vision mockup exactly
// White bg, 1px border, rounded 14, padding 22px 24px
// Top row: label (uppercase 12px) + icon in bg circle (34px, rounded 10)
// Value: 30px weight 700 Plus Jakarta Sans
// Subtitle: 12px, green if trend="up", textLight otherwise
const StatCard = ({ label, value, sub, icon, trend }) => (
  <div
    style={{
      background: COLORS.white,
      border: `1px solid ${COLORS.border}`,
      borderRadius: RADII.lg,
      padding: "22px 24px",
      minWidth: 0,
      position: "relative",
      overflow: "hidden",
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: COLORS.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </span>
      {icon && (
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: RADII.md,
            background: COLORS.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon type={icon} size={16} color={COLORS.textMuted} />
        </div>
      )}
    </div>
    <div
      style={{
        fontSize: 30,
        fontWeight: 700,
        color: COLORS.black,
        fontFamily: FONTS.body,
        lineHeight: 1,
      }}
    >
      {value}
    </div>
    {sub && (
      <div
        style={{
          fontSize: 12,
          color: trend === "up" ? COLORS.green : COLORS.textLight,
          marginTop: 6,
          fontWeight: 500,
        }}
      >
        {sub}
      </div>
    )}
  </div>
);

export default StatCard;
