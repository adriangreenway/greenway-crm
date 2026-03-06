import React from "react";
import { COLORS, FONTS, RADII } from "../tokens";
import Icon from "../icons";
import { ComingBadge } from "./Badge";

// PlaceholderCard — for stub pages (Band Ops, Content, AI Crew)
// White bg, border, rounded 16px
// Icon at top in bg circle, title 15px weight 700, description 12.5px textMuted
// "COMING" badge in amber
const PlaceholderCard = ({ icon, title, description, week }) => (
  <div
    style={{
      background: COLORS.white,
      border: `1px solid ${COLORS.border}`,
      borderRadius: RADII.xl,
      padding: "28px 24px",
      position: "relative",
    }}
  >
    <div style={{ position: "absolute", top: 18, right: 18 }}>
      <ComingBadge />
    </div>
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: RADII.lg,
        background: COLORS.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
      }}
    >
      <Icon type={icon} size={22} color={COLORS.black} />
    </div>
    <h3
      style={{
        fontSize: 15,
        fontWeight: 700,
        color: COLORS.black,
        fontFamily: FONTS.body,
        marginBottom: 8,
        paddingRight: 60,
      }}
    >
      {title}
    </h3>
    <p
      style={{
        fontSize: 12.5,
        color: COLORS.textMuted,
        lineHeight: 1.6,
        margin: 0,
      }}
    >
      {description}
    </p>
    {week && (
      <div
        style={{
          fontSize: 11,
          color: COLORS.textLight,
          marginTop: 12,
          fontWeight: 500,
        }}
      >
        Week {week}
      </div>
    )}
  </div>
);

export default PlaceholderCard;
