import React, { useState, useEffect } from "react";
import { COLORS, FONTS, RADII } from "../tokens";
import SlideOverPanel from "./SlideOverPanel";
import Icon from "../icons";
import { formatCurrency, parseCurrency } from "../utils/formatters";

// ── Configuration options ──
const CONFIG_OPTIONS = [
  { value: "6pc", label: "6pc" },
  { value: "8pc", label: "8pc" },
  { value: "10pc", label: "10pc" },
  { value: "12pc", label: "12pc" },
  { value: "14pc", label: "14pc" },
];

const TEMPLATE_TYPES = [
  { value: "A", label: "Single Package" },
  { value: "B", label: "Single + Cocktail" },
  { value: "C", label: "Two Options" },
  { value: "D", label: "Two Options + Cocktail" },
];

// Normalize any config string to "Xpc" format
const normalizeConfig = (config) => {
  if (!config) return "";
  const num = String(config).replace(/\D/g, "");
  return num ? `${num}pc` : "";
};

// ── Shared styles ──
const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  fontSize: 13,
  border: `1px solid ${COLORS.border}`,
  borderRadius: RADII.sm,
  outline: "none",
  fontFamily: FONTS.body,
  color: COLORS.text,
  background: COLORS.bg,
};

const selectStyle = {
  ...inputStyle,
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%239E9891' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
  paddingRight: 32,
};

const FormField = ({ label, children }) => (
  <div style={{ marginBottom: 16 }}>
    <label
      style={{
        display: "block",
        fontSize: 11,
        fontWeight: 600,
        color: COLORS.textMuted,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        marginBottom: 6,
      }}
    >
      {label}
    </label>
    {children}
  </div>
);

const SectionDivider = () => (
  <div
    style={{
      height: 1,
      background: COLORS.borderLight,
      margin: "8px 0 16px",
    }}
  />
);

const SectionLabel = ({ label }) => (
  <div
    style={{
      fontSize: 13,
      fontWeight: 700,
      color: COLORS.text,
      marginBottom: 14,
      fontFamily: FONTS.body,
    }}
  >
    {label}
  </div>
);

const ProposalConfigPanel = ({ lead, onClose, onGenerate, onUpdateLead }) => {
  const hasExisting = !!lead.proposal_slug;
  const existingConfig = lead.proposal_config_override || {};

  // ── State ──
  const [templateType, setTemplateType] = useState(
    existingConfig.template_type || "A"
  );
  const [packageName, setPackageName] = useState("The Greenway Band");
  const [config, setConfig] = useState("");
  const [price, setPrice] = useState("");
  const [receptionStart, setReceptionStart] = useState("19:00");
  const [receptionEnd, setReceptionEnd] = useState("23:00");
  const [introText, setIntroText] = useState("");
  const [cocktailStart, setCocktailStart] = useState("");
  const [cocktailEnd, setCocktailEnd] = useState("");
  const [option2PackageName, setOption2PackageName] = useState("The Greenway Band");
  const [option2Config, setOption2Config] = useState("");
  const [option2Price, setOption2Price] = useState("");
  const [generating, setGenerating] = useState(false);
  const [showStagePrompt, setShowStagePrompt] = useState(false);
  const [stageUpdating, setStageUpdating] = useState(false);
  const [toast, setToast] = useState(null);

  // Derived visibility
  const showCocktail = templateType === "B" || templateType === "D";
  const showOption2 = templateType === "C" || templateType === "D";

  // ── Initialize from existing config ──
  useEffect(() => {
    const ec = existingConfig;

    // Package Name — try new schema, then old schema, then default
    setPackageName(
      ec.package_name ||
        ec.primary_package?.name ||
        "The Greenway Band"
    );

    // Config — try new schema, then old nested, then lead.config
    const rawConfig =
      ec.config ||
      ec.primary_package?.config ||
      normalizeConfig(lead.config) ||
      "";
    setConfig(normalizeConfig(rawConfig) || rawConfig);

    // Price — try new schema, then old nested, then lead.price
    const rawPrice =
      ec.price ?? ec.primary_package?.price ?? lead.price ?? null;
    setPrice(rawPrice != null ? formatCurrency(rawPrice) : "");

    // Reception times
    setReceptionStart(
      ec.reception_start || ec.reception_start_24 || "19:00"
    );
    setReceptionEnd(ec.reception_end || ec.reception_end_24 || "23:00");

    // Intro text
    setIntroText(ec.intro_text || ec.intro_paragraph || "");

    // Cocktail times
    setCocktailStart(ec.cocktail_start || ec.cocktail_start_24 || "");
    setCocktailEnd(ec.cocktail_end || ec.cocktail_end_24 || "");

    // Option 2
    setOption2PackageName(ec.option2_package_name || "The Greenway Band");
    setOption2Config(ec.option2_config || "");
    setOption2Price(
      ec.option2_price != null ? formatCurrency(ec.option2_price) : ""
    );
  }, []);

  // ── Build config override ──
  const buildConfigOverride = () => {
    const override = {
      template_type: templateType,
      package_name: packageName,
      config: config,
      price: parseCurrency(price) || 0,
      reception_start: receptionStart,
      reception_end: receptionEnd,
      intro_text: introText || null,
    };

    if (showCocktail) {
      override.cocktail_start = cocktailStart || null;
      override.cocktail_end = cocktailEnd || null;
    }

    if (showOption2) {
      override.option2_package_name = option2PackageName;
      override.option2_config = option2Config;
      override.option2_price = parseCurrency(option2Price) || 0;
    }

    return override;
  };

  // ── Generate handler ──
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const configOverride = buildConfigOverride();
      const primaryPriceRaw = parseCurrency(price);

      // Update lead fields (price, config)
      const leadUpdates = {};
      if (primaryPriceRaw && primaryPriceRaw !== lead.price)
        leadUpdates.price = primaryPriceRaw;
      const configForLead = config
        ? config.replace("pc", "") + " piece"
        : "";
      if (configForLead && configForLead !== lead.config)
        leadUpdates.config = configForLead;

      if (Object.keys(leadUpdates).length > 0) {
        try {
          await onUpdateLead(lead.id, leadUpdates);
        } catch (updateErr) {
          console.error("Lead field update failed:", updateErr);
          throw new Error(`Lead update failed: ${updateErr.message}`);
        }
      }

      if (hasExisting) {
        await onUpdateLead(lead.id, {
          proposal_config_override: configOverride,
        });
        const url = `${window.location.origin}/proposal/${lead.proposal_slug}`;
        await navigator.clipboard.writeText(url);
        setToast("Proposal link copied");
        setTimeout(() => setToast(null), 2500);
      } else {
        const result = await onGenerate(lead.id, configOverride);
        if (result?.url) {
          await navigator.clipboard.writeText(result.url);
          setToast("Proposal link copied");
          setShowStagePrompt(true);
          setTimeout(() => setToast(null), 2500);
        }
      }
    } catch (err) {
      console.error("Proposal generation failed:", err);
      const msg = err?.message || err?.details || String(err);
      setToast(`Failed: ${msg.slice(0, 80)}`);
      setTimeout(() => setToast(null), 5000);
    } finally {
      setGenerating(false);
    }
  };

  const handleStageUpdate = async (shouldUpdate) => {
    if (shouldUpdate) {
      setStageUpdating(true);
      try {
        await onUpdateLead(lead.id, { stage: "Proposal Sent" });
      } catch (err) {
        console.error("Stage update failed:", err);
      } finally {
        setStageUpdating(false);
      }
    }
    setShowStagePrompt(false);
  };

  const existingUrl = hasExisting
    ? `${window.location.origin}/proposal/${lead.proposal_slug}`
    : null;

  return (
    <SlideOverPanel
      open
      title="Generate Proposal"
      subtitle={`${lead.partner1_first || ""}${lead.partner2_first ? ` & ${lead.partner2_first}` : ""} | ${lead.venue || "No venue"}`}
      onClose={onClose}
    >
      {/* Existing proposal URL */}
      {hasExisting && existingUrl && (
        <div
          style={{
            padding: "12px 14px",
            background: COLORS.bg,
            border: `1px solid ${COLORS.border}`,
            borderRadius: RADII.sm,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Icon type="link" size={14} color={COLORS.textMuted} />
          <div
            style={{
              flex: 1,
              fontSize: 12,
              color: COLORS.textMuted,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {existingUrl}
          </div>
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(existingUrl);
              setToast("Link copied");
              setTimeout(() => setToast(null), 2000);
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
            }}
            title="Copy link"
          >
            <Icon type="copy" size={14} color={COLORS.textMuted} />
          </button>
        </div>
      )}

      {/* ── TEMPLATE TYPE SELECTOR ── */}
      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        {TEMPLATE_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setTemplateType(t.value)}
            style={{
              padding: "7px 14px",
              background:
                templateType === t.value ? COLORS.black : COLORS.white,
              color:
                templateType === t.value ? COLORS.white : COLORS.textMuted,
              border: `1px solid ${
                templateType === t.value ? COLORS.black : COLORS.border
              }`,
              borderRadius: RADII.pill,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: FONTS.body,
              transition: "all 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OPTION 1 LABEL (only when C or D) ── */}
      {showOption2 && <SectionLabel label="Option 1" />}

      {/* ── PRIMARY PACKAGE FIELDS (always visible) ── */}
      <FormField label="Package Name">
        <input
          style={inputStyle}
          type="text"
          value={packageName}
          onChange={(e) => setPackageName(e.target.value)}
          placeholder="The Greenway Band"
        />
      </FormField>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}
      >
        <FormField label="Configuration">
          <select
            style={selectStyle}
            value={config}
            onChange={(e) => setConfig(e.target.value)}
          >
            <option value="">Select...</option>
            {CONFIG_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Price">
          <input
            style={inputStyle}
            type="text"
            value={price}
            onChange={(e) =>
              setPrice(e.target.value.replace(/[^\d]/g, ""))
            }
            onBlur={() => setPrice(formatCurrency(price))}
            onFocus={() => {
              const raw = parseCurrency(price);
              setPrice(raw ? String(raw) : "");
            }}
            placeholder="$0"
          />
        </FormField>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}
      >
        <FormField label="Reception Start">
          <input
            style={inputStyle}
            type="time"
            value={receptionStart}
            onChange={(e) => setReceptionStart(e.target.value)}
          />
        </FormField>
        <FormField label="Reception End">
          <input
            style={inputStyle}
            type="time"
            value={receptionEnd}
            onChange={(e) => setReceptionEnd(e.target.value)}
          />
        </FormField>
      </div>

      {/* ── COCKTAIL HOUR (B and D only) ── */}
      {showCocktail && (
        <>
          <div style={{ marginTop: 8 }}>
            <SectionDivider />
            <SectionLabel label="Cocktail Hour" />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <FormField label="Cocktail Start">
              <input
                style={inputStyle}
                type="time"
                value={cocktailStart}
                onChange={(e) => setCocktailStart(e.target.value)}
              />
            </FormField>
            <FormField label="Cocktail End">
              <input
                style={inputStyle}
                type="time"
                value={cocktailEnd}
                onChange={(e) => setCocktailEnd(e.target.value)}
              />
            </FormField>
          </div>
        </>
      )}

      {/* ── OPTION 2 (C and D only) ── */}
      {showOption2 && (
        <>
          <div style={{ marginTop: 8 }}>
            <SectionDivider />
            <SectionLabel label="Option 2" />
          </div>
          <FormField label="Package Name">
            <input
              style={inputStyle}
              type="text"
              value={option2PackageName}
              onChange={(e) => setOption2PackageName(e.target.value)}
              placeholder="The Greenway Band"
            />
          </FormField>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <FormField label="Configuration">
              <select
                style={selectStyle}
                value={option2Config}
                onChange={(e) => setOption2Config(e.target.value)}
              >
                <option value="">Select...</option>
                {CONFIG_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Price">
              <input
                style={inputStyle}
                type="text"
                value={option2Price}
                onChange={(e) =>
                  setOption2Price(e.target.value.replace(/[^\d]/g, ""))
                }
                onBlur={() =>
                  setOption2Price(formatCurrency(option2Price))
                }
                onFocus={() => {
                  const raw = parseCurrency(option2Price);
                  setOption2Price(raw ? String(raw) : "");
                }}
                placeholder="$0"
              />
            </FormField>
          </div>
        </>
      )}

      <SectionDivider />

      {/* ── INTRO TEXT ── */}
      <FormField label="Intro Text">
        <textarea
          style={{
            ...inputStyle,
            minHeight: 80,
            resize: "vertical",
            lineHeight: 1.6,
          }}
          value={introText}
          onChange={(e) => setIntroText(e.target.value)}
          placeholder="Write a personal note for the couple..."
        />
      </FormField>

      {/* ── GENERATE BUTTON ── */}
      <button
        onClick={handleGenerate}
        disabled={generating || !config}
        style={{
          width: "100%",
          padding: "13px 20px",
          background: COLORS.black,
          color: COLORS.cream,
          border: "none",
          borderRadius: RADII.sm,
          fontSize: 13,
          fontWeight: 600,
          cursor: generating || !config ? "not-allowed" : "pointer",
          fontFamily: FONTS.body,
          opacity: generating || !config ? 0.7 : 1,
          transition: "opacity 0.15s",
        }}
      >
        {generating
          ? "Generating..."
          : hasExisting
          ? "Update & Copy Link"
          : "Generate & Copy Link"}
      </button>

      {/* Stage update prompt */}
      {showStagePrompt && (
        <div
          style={{
            marginTop: 14,
            padding: "12px 14px",
            background: COLORS.bg,
            border: `1px solid ${COLORS.border}`,
            borderRadius: RADII.sm,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: 12.5,
              color: COLORS.textMuted,
              fontWeight: 500,
            }}
          >
            Move to Proposal Sent?
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => handleStageUpdate(true)}
              disabled={stageUpdating}
              style={{
                padding: "5px 14px",
                fontSize: 12,
                fontWeight: 600,
                color: COLORS.white,
                background: COLORS.black,
                border: "none",
                borderRadius: RADII.sm,
                cursor: "pointer",
                fontFamily: FONTS.body,
              }}
            >
              {stageUpdating ? "..." : "Yes"}
            </button>
            <button
              onClick={() => handleStageUpdate(false)}
              style={{
                padding: "5px 14px",
                fontSize: 12,
                fontWeight: 600,
                color: COLORS.textMuted,
                background: COLORS.white,
                border: `1px solid ${COLORS.border}`,
                borderRadius: RADII.sm,
                cursor: "pointer",
                fontFamily: FONTS.body,
              }}
            >
              Not now
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: COLORS.black,
            color: COLORS.white,
            padding: "10px 20px",
            borderRadius: RADII.pill,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: FONTS.body,
            zIndex: 200,
            animation: "fadeIn 0.15s ease",
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          }}
        >
          {toast}
        </div>
      )}
    </SlideOverPanel>
  );
};

export default ProposalConfigPanel;
