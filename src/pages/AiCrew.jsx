import React from "react";
import { COLORS, FONTS, RADII } from "../tokens";
import Icon from "../icons";
import { ComingBadge } from "../components/Badge";

// AI persona card — more prominent than PlaceholderCard
const PersonaCard = ({ icon, name, description }) => (
  <div
    style={{
      background: COLORS.white,
      border: `1px solid ${COLORS.border}`,
      borderRadius: RADII.xl,
      padding: "32px 28px",
      position: "relative",
      transition: "box-shadow 0.2s",
    }}
    onMouseEnter={(e) =>
      (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.05)")
    }
    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
  >
    <div style={{ position: "absolute", top: 20, right: 20 }}>
      <ComingBadge />
    </div>

    {/* Larger icon area */}
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: RADII.lg,
        background: COLORS.bg,
        border: `1px solid ${COLORS.borderLight}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
      }}
    >
      <Icon type={icon} size={26} color={COLORS.black} />
    </div>

    <h3
      style={{
        fontSize: 17,
        fontWeight: 700,
        color: COLORS.black,
        fontFamily: FONTS.body,
        marginBottom: 8,
      }}
    >
      {name}
    </h3>
    <p
      style={{
        fontSize: 13,
        color: COLORS.textMuted,
        lineHeight: 1.7,
        margin: 0,
        maxWidth: 320,
      }}
    >
      {description}
    </p>
  </div>
);

const AiCrew = () => (
  <div style={{ animation: "fadeUp 0.3s ease", maxWidth: 1200 }}>
    <div style={{ marginBottom: 24 }}>
      <h1
        style={{
          fontFamily: FONTS.display,
          fontSize: 26,
          fontWeight: 600,
          color: COLORS.black,
        }}
      >
        AI Crew
      </h1>
      <p style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>
        Your AI team members. Each persona specializes in a different part of
        the business.
      </p>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
      <PersonaCard
        icon="spark"
        name="Adrian AI"
        description="Your chief of staff. Pipeline briefings, follow up nudges, daily priorities."
      />
      <PersonaCard
        icon="grid"
        name="Content AI"
        description="Your social media manager. Post scheduling, caption drafting, content gaps."
      />
      <PersonaCard
        icon="trending"
        name="Strategy AI"
        description="Your business consultant. Revenue analysis, pricing optimization, growth insights."
      />
    </div>
  </div>
);

export default AiCrew;
