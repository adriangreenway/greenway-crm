import React from "react";
import { COLORS, STAGE_COLORS, BRAND_COLORS } from "../tokens";

// Base badge — matches vision mockup exactly
// padding 3px 10px, borderRadius 100, fontSize 11, fontWeight 600, letterSpacing 0.03em, uppercase
const Badge = ({ children, color = COLORS.textMuted, bg = COLORS.cream, style }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "3px 10px",
      borderRadius: 100,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.03em",
      color,
      background: bg,
      textTransform: "uppercase",
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </span>
);

// Stage badge — auto maps stage name to correct colors
export const StageBadge = ({ stage }) => {
  const s = STAGE_COLORS[stage] || { color: COLORS.textMuted, bg: COLORS.cream };
  return <Badge color={s.color} bg={s.bg}>{stage}</Badge>;
};

// Brand badge — Greenway = black on cream, Kirby Collective = teal on tealLight
export const BrandBadge = ({ brand }) => {
  const b = BRAND_COLORS[brand] || { color: COLORS.textMuted, bg: COLORS.cream };
  return <Badge color={b.color} bg={b.bg}>{brand}</Badge>;
};

// Status badge — for musician status, integration status, etc.
export const StatusBadge = ({ status }) => {
  const map = {
    active: { color: COLORS.green, bg: COLORS.greenLight },
    inactive: { color: COLORS.textLight, bg: COLORS.bg },
    connected: { color: COLORS.green, bg: COLORS.greenLight },
    "not connected": { color: COLORS.textLight, bg: COLORS.bg },
    pending: { color: COLORS.amber, bg: COLORS.amberLight },
    confirmed: { color: COLORS.green, bg: COLORS.greenLight },
    declined: { color: COLORS.red, bg: COLORS.redLight },
  };
  const s = map[status?.toLowerCase()] || { color: COLORS.textLight, bg: COLORS.bg };
  return <Badge color={s.color} bg={s.bg}>{status}</Badge>;
};

// Coming badge — amber for placeholder cards
export const ComingBadge = () => (
  <Badge color={COLORS.amber} bg={COLORS.amberLight}>COMING</Badge>
);

export default Badge;
