import React from "react";
import { COLORS, FONTS, RADII } from "../tokens";
import Icon from "../icons";

// EmptyState — centered icon + title + description
// Used when tables/lists have no data
const EmptyState = ({ icon = "pipeline", title, description }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "60px 20px",
      textAlign: "center",
    }}
  >
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: RADII.lg,
        background: COLORS.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
      }}
    >
      <Icon type={icon} size={24} color={COLORS.border} />
    </div>
    {title && (
      <div
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: COLORS.black,
          fontFamily: FONTS.body,
          marginBottom: 6,
        }}
      >
        {title}
      </div>
    )}
    {description && (
      <div
        style={{
          fontSize: 13,
          color: COLORS.textMuted,
          maxWidth: 320,
          lineHeight: 1.6,
        }}
      >
        {description}
      </div>
    )}
  </div>
);

export default EmptyState;
