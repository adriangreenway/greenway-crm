import React, { useState } from "react";
import { COLORS, FONTS, RADII } from "../tokens";
import Icon from "../icons";

// Integration card
const IntegrationCard = ({ icon, title, description, children }) => (
  <div
    style={{
      background: COLORS.white,
      border: `1px solid ${COLORS.border}`,
      borderRadius: RADII.lg,
      padding: "20px 24px",
      display: "flex",
      alignItems: "center",
      gap: 16,
    }}
  >
    <div
      style={{
        width: 42,
        height: 42,
        borderRadius: RADII.md,
        background: COLORS.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon type={icon} size={20} color={COLORS.black} />
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.black }}>
        {title}
      </div>
      <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
        {description}
      </div>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
      {children}
    </div>
  </div>
);

// Not Connected badge
const NotConnectedBadge = () => (
  <span
    style={{
      display: "inline-block",
      padding: "4px 10px",
      borderRadius: 100,
      fontSize: 11,
      fontWeight: 600,
      color: COLORS.textLight,
      background: COLORS.bg,
      letterSpacing: "0.02em",
    }}
  >
    Not Connected
  </span>
);

// Disabled connect button
const ConnectButton = () => (
  <button
    disabled
    style={{
      padding: "7px 16px",
      fontSize: 12,
      fontWeight: 600,
      color: COLORS.textLight,
      background: COLORS.bg,
      border: `1px solid ${COLORS.border}`,
      borderRadius: RADII.sm,
      cursor: "not-allowed",
      fontFamily: FONTS.body,
      opacity: 0.7,
    }}
  >
    Connect
  </button>
);

// Account info field
const InfoField = ({ label, value }) => (
  <div style={{ marginBottom: 16 }}>
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: COLORS.textLight,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        marginBottom: 4,
      }}
    >
      {label}
    </div>
    <div style={{ fontSize: 14, color: COLORS.black, fontWeight: 500 }}>
      {value}
    </div>
  </div>
);

const Settings = () => {
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ animation: "fadeUp 0.3s ease", maxWidth: 720 }}>
      <h1
        style={{
          fontFamily: FONTS.display,
          fontSize: 26,
          fontWeight: 600,
          color: COLORS.black,
          marginBottom: 24,
        }}
      >
        Settings
      </h1>

      {/* Integrations */}
      <div style={{ marginBottom: 32 }}>
        <h2
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: COLORS.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 14,
          }}
        >
          Integrations
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Claude API Key */}
          <IntegrationCard
            icon="spark"
            title="Claude API Key"
            description="Powers AI email drafter, Claude Clues, and cheat sheets."
          >
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              style={{
                width: 200,
                padding: "7px 12px",
                fontSize: 12,
                border: `1px solid ${COLORS.border}`,
                borderRadius: RADII.sm,
                outline: "none",
                fontFamily: FONTS.body,
                color: COLORS.text,
                background: COLORS.bg,
              }}
            />
            <button
              onClick={handleSave}
              disabled={!apiKey}
              style={{
                padding: "7px 16px",
                fontSize: 12,
                fontWeight: 600,
                color: !apiKey ? COLORS.textLight : COLORS.white,
                background: !apiKey ? COLORS.bg : COLORS.black,
                border: `1px solid ${!apiKey ? COLORS.border : COLORS.black}`,
                borderRadius: RADII.sm,
                cursor: !apiKey ? "not-allowed" : "pointer",
                fontFamily: FONTS.body,
                transition: "all 0.15s",
              }}
            >
              {saved ? "Saved" : "Save"}
            </button>
          </IntegrationCard>

          {/* Google Calendar */}
          <IntegrationCard
            icon="calendar"
            title="Google Calendar"
            description="Two way sync for events and consultations."
          >
            <NotConnectedBadge />
            <ConnectButton />
          </IntegrationCard>

          {/* HoneyBook */}
          <IntegrationCard
            icon="file"
            title="HoneyBook"
            description="Contract and invoice status sync."
          >
            <NotConnectedBadge />
            <ConnectButton />
          </IntegrationCard>

          {/* Netlify Forms */}
          <IntegrationCard
            icon="globe"
            title="Netlify Forms"
            description="Auto populate leads from greenwayband.com/book."
          >
            <NotConnectedBadge />
            <ConnectButton />
          </IntegrationCard>
        </div>
      </div>

      {/* Account */}
      <div>
        <h2
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: COLORS.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 14,
          }}
        >
          Account
        </h2>

        <div
          style={{
            background: COLORS.white,
            border: `1px solid ${COLORS.border}`,
            borderRadius: RADII.lg,
            padding: 24,
          }}
        >
          <InfoField label="Name" value="Adrian Michael" />
          <InfoField label="Email" value="adrian@greenwayband.com" />
          <InfoField label="Phone" value="(281) 467 1226" />
        </div>
      </div>
    </div>
  );
};

export default Settings;
