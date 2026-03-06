import React from "react";
import { COLORS, FONTS, RADII } from "../tokens";
import Icon from "../icons";
import PlaceholderCard from "../components/PlaceholderCard";

// Status badge for musicians
const StatusBadge = ({ status }) => {
  const isActive = status === "active";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 100,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
        color: isActive ? COLORS.green : COLORS.textLight,
        background: isActive ? COLORS.greenLight : COLORS.bg,
      }}
    >
      {status}
    </span>
  );
};

// Musician row — matches vision mockup
const MusicianRow = ({ m }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "2fr 1.5fr 1fr",
      alignItems: "center",
      padding: "14px 24px",
      borderBottom: `1px solid ${COLORS.borderLight}`,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: COLORS.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 13,
          color: COLORS.textMuted,
          flexShrink: 0,
        }}
      >
        {m.name.charAt(0)}
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.black }}>
        {m.name}
      </div>
    </div>
    <div style={{ fontSize: 13, color: COLORS.textMuted }}>{m.role}</div>
    <div>
      <StatusBadge status={m.status} />
    </div>
  </div>
);

const BandOps = ({ musicians }) => {
  const activeCount = musicians.filter((m) => m.status === "active").length;

  return (
    <div style={{ animation: "fadeUp 0.3s ease", maxWidth: 1200 }}>
      <h1
        style={{
          fontFamily: FONTS.display,
          fontSize: 26,
          fontWeight: 600,
          color: COLORS.black,
          marginBottom: 24,
        }}
      >
        Band Operations
      </h1>

      {/* Musician Roster */}
      <div
        style={{
          background: COLORS.white,
          border: `1px solid ${COLORS.border}`,
          borderRadius: RADII.lg,
          overflow: "hidden",
          marginBottom: 28,
        }}
      >
        <div
          style={{
            padding: "18px 24px",
            borderBottom: `1px solid ${COLORS.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{ fontSize: 14, fontWeight: 700, color: COLORS.black }}
          >
            Musician Roster
          </span>
          <span style={{ fontSize: 12, color: COLORS.textMuted }}>
            {activeCount} active
          </span>
        </div>
        {/* Table header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1.5fr 1fr",
            padding: "10px 24px",
            borderBottom: `1px solid ${COLORS.border}`,
            background: COLORS.bg,
          }}
        >
          {["Name", "Role", "Status"].map((h) => (
            <span
              key={h}
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: COLORS.textLight,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {h}
            </span>
          ))}
        </div>
        {musicians.map((m) => (
          <MusicianRow key={m.id} m={m} />
        ))}
      </div>

      {/* Placeholder cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        <PlaceholderCard
          icon="file"
          title="Gig Sheet Generator"
          description="Build and send gig details to your Music Director."
        />
        <PlaceholderCard
          icon="clipboard"
          title="MC Live Cue Sheet"
          description="iPad formatted reception flow with names and cues."
        />
        <PlaceholderCard
          icon="users"
          title="Band Packager"
          description="Assign musicians to gigs from your roster."
        />
      </div>
    </div>
  );
};

export default BandOps;
