import React, { useState, useEffect } from "react";
import { COLORS, FONTS, RADII } from "../tokens";
import SlideOverPanel from "./SlideOverPanel";
import Icon from "../icons";
import { formatCurrency, parseCurrency } from "../utils/formatters";
import { callClaude, getApiKey, hasApiKey } from "../utils/claudeApi";

// ── Package pricing and tier logic ──
const PACKAGE_OPTIONS = [
  { value: "6 Piece Band", config: "6pc", price: 9000 },
  { value: "8 Piece Band", config: "8pc", price: 10750 },
  { value: "10 Piece Band", config: "10pc", price: 12500 },
  { value: "12 Piece Band", config: "12pc", price: 14750 },
  { value: "14 Piece Band", config: "14pc", price: 16875 },
];

const PACKAGE_PRICES = {
  "6 Piece Band": 9000,
  "8 Piece Band": 10750,
  "10 Piece Band": 12500,
  "12 Piece Band": 14750,
  "14 Piece Band": 16875,
};

// Upsell tier: 6→10 (skip 8), 8→10, 10→12, 12→14, 14→null
const UPSELL_TIER = {
  "6 Piece Band": "10 Piece Band",
  "8 Piece Band": "10 Piece Band",
  "10 Piece Band": "12 Piece Band",
  "12 Piece Band": "14 Piece Band",
  "14 Piece Band": null,
};

const nameToConfig = (name) => {
  const num = name?.replace(/\D/g, "");
  return num ? `${num}pc` : "";
};

const configToName = (config) => {
  if (!config) return "";
  const num = String(config).replace(/\D/g, "");
  return num ? `${num} Piece Band` : config;
};

// Format time for display (24hr to 12hr)
const formatTime12 = (time24) => {
  if (!time24) return "";
  const [h, m] = time24.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
};

// ── AI System Prompt (from spec Section 2.3) ──
const AI_CONFIG_SYSTEM_PROMPT = `You are the proposal configuration engine for The Greenway Band, a premium live wedding band in Houston, TX.

Given the lead data below, determine the optimal proposal configuration. Return ONLY valid JSON with no explanation.

RULES:
1. Always include the band size the lead requested as the primary package.
2. Always include one tier up as the upsell package, unless the lead requested 14 piece (max).
3. Never show a smaller band size than what the lead requested, unless their notes explicitly mention flexibility downward.
4. The tier order is: 6, 8, 10, 12, 14. When upselling from 6, skip to 10 (the horn section is the real differentiator).
5. If no band size is specified, recommend based on budget and guest count.
6. Always include cocktail hour options.
7. Generate a venue-specific intro paragraph. The tone is grounded, specific, and confident. Use contractions. Reference the venue by name. Do not use hyphens as dashes. Do not use exclamation points. Do not use generic phrases like "your special day" or "unforgettable evening." Do not mention price. 2 to 3 sentences.

PRICING:
- 6 Piece Band: $9,000
- 8 Piece Band: $10,750
- 10 Piece Band: $12,500
- 12 Piece Band: $14,750
- 14 Piece Band: $16,875
- Cocktail Hour Solo: $1,250
- Cocktail Hour Duo: $1,875
- Cocktail Hour Trio: $2,500

RESPONSE FORMAT:
{
  "primary_package": {
    "name": "10 Piece Band",
    "price": 12500,
    "config": "10pc"
  },
  "upsell_package": {
    "name": "14 Piece Band",
    "price": 16875,
    "config": "14pc"
  },
  "cocktail_options": ["solo", "duo", "trio"],
  "intro_paragraph": "...",
  "reasoning": "Lead requested 10 piece with $20K budget. Showing 14 piece upsell since budget supports it. All cocktail tiers shown."
}

If there should be no upsell (14 piece requested), set upsell_package to null.`;

// Build AI user prompt from lead data (spec Section 2.4)
const buildAiUserPrompt = (lead) => {
  const dateLong = lead.event_date
    ? new Date(lead.event_date + "T00:00:00").toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "not specified";

  return `Lead data:
- Partner 1: ${lead.partner1_first || ""} ${lead.partner1_last || ""}
- Partner 2: ${lead.partner2_first || ""} ${lead.partner2_last || ""}
- Venue: ${lead.venue || "not specified"}
- Event date: ${dateLong}
- Guest count: ${lead.guest_count || "not specified"}
- Budget stated: ${lead.budget_stated || "not specified"}
- Cocktail interest: ${lead.cocktail_interest || "not specified"}
- Band config requested: ${lead.config || "not specified"}
- Event type: ${lead.event_type || "Wedding"}
- Inquiry details: ${lead.inquiry_details || "none"}
- Notes: ${lead.notes || "none"}`;
};

// Intro-only system prompt for regeneration
const INTRO_SYSTEM_PROMPT = `You are writing a proposal introduction for Adrian Michael, founder of The Greenway Band, a premium live wedding band in Houston, TX.

Write a 2 to 3 sentence introduction paragraph for a wedding proposal. The tone is grounded, specific, and confident. It should read like Adrian wrote it, not a copywriter. Use contractions. Reference the venue by name and say something specific about why this band configuration fits the space or the evening.

Do not use hyphens as dashes. Do not use exclamation points. Do not use generic phrases like "your special day" or "unforgettable evening." Do not mention price.

Return ONLY the paragraph text. No quotes, no labels, no formatting.`;

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

const ToggleSwitch = ({ checked, onChange, disabled }) => (
  <button
    onClick={() => !disabled && onChange(!checked)}
    disabled={disabled}
    style={{
      width: 36,
      height: 20,
      borderRadius: 10,
      border: "none",
      background: checked ? COLORS.black : COLORS.border,
      position: "relative",
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "background 0.2s",
      opacity: disabled ? 0.5 : 1,
      flexShrink: 0,
    }}
  >
    <div
      style={{
        width: 16,
        height: 16,
        borderRadius: 8,
        background: COLORS.white,
        position: "absolute",
        top: 2,
        left: checked ? 18 : 2,
        transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
      }}
    />
  </button>
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

const ProposalConfigPanel = ({ lead, onClose, onGenerate, onUpdateLead }) => {
  const hasExisting = !!lead.proposal_slug;
  const existingConfig = lead.proposal_config_override || {};
  const hasNewSchema = !!existingConfig.primary_package;

  // ── State ──
  const [aiLoading, setAiLoading] = useState(false);
  const [primaryPackage, setPrimaryPackage] = useState("");
  const [primaryPrice, setPrimaryPrice] = useState("");
  const [showUpsell, setShowUpsell] = useState(false);
  const [upsellPackage, setUpsellPackage] = useState("");
  const [upsellPrice, setUpsellPrice] = useState("");
  const [eventDate, setEventDate] = useState(lead.event_date || "");
  const [venue, setVenue] = useState(lead.venue || "");
  const [cocktailStart, setCocktailStart] = useState("");
  const [cocktailEnd, setCocktailEnd] = useState("");
  const [receptionStart, setReceptionStart] = useState("19:00");
  const [receptionEnd, setReceptionEnd] = useState("23:00");
  const [showCocktail, setShowCocktail] = useState(true);
  const [introParagraph, setIntroParagraph] = useState("");
  const [aiReasoning, setAiReasoning] = useState("");
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const [introLoading, setIntroLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showStagePrompt, setShowStagePrompt] = useState(false);
  const [stageUpdating, setStageUpdating] = useState(false);
  const [toast, setToast] = useState(null);

  // ── Initialize from existing config or fire AI ──
  useEffect(() => {
    if (hasNewSchema) {
      // Populate from new schema
      const ec = existingConfig;
      setPrimaryPackage(ec.primary_package.name);
      setPrimaryPrice(formatCurrency(ec.primary_package.price));
      if (ec.upsell_package) {
        setShowUpsell(true);
        setUpsellPackage(ec.upsell_package.name);
        setUpsellPrice(formatCurrency(ec.upsell_package.price));
      }
      setCocktailStart(ec.cocktail_start_24 || "");
      setCocktailEnd(ec.cocktail_end_24 || "");
      setReceptionStart(ec.reception_start_24 || "19:00");
      setReceptionEnd(ec.reception_end_24 || "23:00");
      setShowCocktail(ec.show_cocktail !== false);
      setIntroParagraph(ec.intro_paragraph || "");
      setAiReasoning(ec.ai_reasoning || "");
    } else if (existingConfig.package_name) {
      // Populate from old schema
      setPrimaryPackage(existingConfig.package_name);
      setPrimaryPrice(lead.price != null ? formatCurrency(lead.price) : "");
      setCocktailStart(existingConfig.cocktail_start_24 || "");
      setCocktailEnd(existingConfig.cocktail_end_24 || "");
      setReceptionStart(existingConfig.reception_start_24 || "19:00");
      setReceptionEnd(existingConfig.reception_end_24 || "23:00");
      setIntroParagraph(existingConfig.intro_paragraph || "");
    } else {
      // No existing config — pre-fill from lead data, then fire AI
      const leadConfig = lead.config;
      if (leadConfig) {
        const name = configToName(leadConfig);
        setPrimaryPackage(name);
        if (PACKAGE_PRICES[name]) {
          setPrimaryPrice(formatCurrency(PACKAGE_PRICES[name]));
        }
      }
      if (lead.price != null) {
        setPrimaryPrice(formatCurrency(lead.price));
      }

      if (hasApiKey()) {
        runAiConfig();
      }
    }
  }, []);

  // ── AI Config Call ──
  const runAiConfig = async () => {
    setAiLoading(true);
    try {
      const result = await callClaude({
        systemPrompt: AI_CONFIG_SYSTEM_PROMPT,
        userPrompt: buildAiUserPrompt(lead),
        apiKey: getApiKey(),
        maxTokens: 1000,
      });

      // Parse JSON from response (handle potential markdown code blocks)
      let json;
      try {
        const cleaned = result
          .replace(/```json?\n?/g, "")
          .replace(/```/g, "")
          .trim();
        json = JSON.parse(cleaned);
      } catch (parseErr) {
        console.error("AI config JSON parse failed:", parseErr, result);
        return;
      }

      // Populate fields from AI response
      if (json.primary_package) {
        setPrimaryPackage(json.primary_package.name);
        setPrimaryPrice(formatCurrency(json.primary_package.price));
      }
      if (json.upsell_package) {
        setShowUpsell(true);
        setUpsellPackage(json.upsell_package.name);
        setUpsellPrice(formatCurrency(json.upsell_package.price));
      } else {
        setShowUpsell(false);
        setUpsellPackage("");
        setUpsellPrice("");
      }
      if (json.cocktail_options) {
        setShowCocktail(true);
      }
      if (json.intro_paragraph) {
        setIntroParagraph(json.intro_paragraph);
      }
      if (json.reasoning) {
        setAiReasoning(json.reasoning);
      }
    } catch (err) {
      console.error("AI config call failed:", err);
    } finally {
      setAiLoading(false);
    }
  };

  // ── Regenerate intro only ──
  const regenerateIntro = async () => {
    if (!hasApiKey()) return;
    setIntroLoading(true);
    try {
      const dateLong = eventDate
        ? new Date(eventDate + "T00:00:00").toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })
        : "";
      const userPrompt = `Venue: ${venue || "TBD"}
Configuration: ${primaryPackage || "TBD"}
Guest count: ${lead.guest_count || "TBD"}
Event date: ${dateLong || "TBD"}`;

      const result = await callClaude({
        systemPrompt: INTRO_SYSTEM_PROMPT,
        userPrompt,
        apiKey: getApiKey(),
        maxTokens: 500,
      });
      setIntroParagraph(result);
    } catch (err) {
      console.error("AI intro regeneration failed:", err);
    } finally {
      setIntroLoading(false);
    }
  };

  // ── Package cascading ──
  const handlePrimaryChange = (name) => {
    setPrimaryPackage(name);
    setPrimaryPrice(
      PACKAGE_PRICES[name] ? formatCurrency(PACKAGE_PRICES[name]) : ""
    );

    // Auto-adjust upsell
    const upsell = UPSELL_TIER[name];
    if (upsell) {
      if (showUpsell) {
        setUpsellPackage(upsell);
        setUpsellPrice(formatCurrency(PACKAGE_PRICES[upsell]));
      }
    } else {
      // 14 piece — no upsell available
      setShowUpsell(false);
      setUpsellPackage("");
      setUpsellPrice("");
    }
  };

  const handleUpsellToggle = (on) => {
    setShowUpsell(on);
    if (on && !upsellPackage) {
      const upsell = UPSELL_TIER[primaryPackage];
      if (upsell) {
        setUpsellPackage(upsell);
        setUpsellPrice(formatCurrency(PACKAGE_PRICES[upsell]));
      }
    }
  };

  const handleUpsellChange = (name) => {
    setUpsellPackage(name);
    setUpsellPrice(
      PACKAGE_PRICES[name] ? formatCurrency(PACKAGE_PRICES[name]) : ""
    );
  };

  // ── Build config override (new schema + backward compat) ──
  const buildConfigOverride = () => {
    const primaryPriceRaw = parseCurrency(primaryPrice);
    const upsellPriceRaw = parseCurrency(upsellPrice);

    return {
      // New schema
      primary_package: {
        name: primaryPackage,
        price: primaryPriceRaw,
        config: nameToConfig(primaryPackage),
      },
      upsell_package:
        showUpsell && upsellPackage
          ? {
              name: upsellPackage,
              price: upsellPriceRaw,
              config: nameToConfig(upsellPackage),
            }
          : null,
      cocktail_options: showCocktail ? ["solo", "duo", "trio"] : [],
      show_cocktail: showCocktail,
      intro_paragraph: introParagraph || null,
      ai_reasoning: aiReasoning || null,

      // Backward compat fields (for existing ProposalPublic)
      package_name: primaryPackage,
      cocktail_start: cocktailStart ? formatTime12(cocktailStart) : null,
      cocktail_end: cocktailEnd ? formatTime12(cocktailEnd) : null,
      reception_start: receptionStart ? formatTime12(receptionStart) : null,
      reception_end: receptionEnd ? formatTime12(receptionEnd) : null,
      cocktail_start_24: cocktailStart || null,
      cocktail_end_24: cocktailEnd || null,
      reception_start_24: receptionStart || null,
      reception_end_24: receptionEnd || null,
    };
  };

  // ── Generate handler ──
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const configOverride = buildConfigOverride();
      const primaryPriceRaw = parseCurrency(primaryPrice);

      // Update lead fields if changed
      const leadUpdates = {};
      if (primaryPriceRaw && primaryPriceRaw !== lead.price)
        leadUpdates.price = primaryPriceRaw;
      if (venue && venue !== lead.venue) leadUpdates.venue = venue;
      if (eventDate && eventDate !== lead.event_date)
        leadUpdates.event_date = eventDate;
      const newConfig = primaryPackage
        ? primaryPackage.replace(/\D/g, "") + " piece"
        : "";
      if (newConfig && newConfig !== lead.config) leadUpdates.config = newConfig;

      if (Object.keys(leadUpdates).length > 0) {
        await onUpdateLead(lead.id, leadUpdates);
      }

      if (hasExisting) {
        // Update existing proposal config
        await onUpdateLead(lead.id, {
          proposal_config_override: configOverride,
        });
        const url = `${window.location.origin}/proposal/${lead.proposal_slug}`;
        await navigator.clipboard.writeText(url);
        setToast("Proposal link copied");
        setTimeout(() => setToast(null), 2500);
      } else {
        // Generate new proposal
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
      setToast("Failed to generate proposal");
      setTimeout(() => setToast(null), 2500);
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

  const is14Piece = primaryPackage === "14 Piece Band";

  return (
    <SlideOverPanel
      open
      title="Generate Proposal"
      subtitle={`${lead.partner1_first || ""}${lead.partner2_first ? ` & ${lead.partner2_first}` : ""} | ${lead.venue || "No venue"}`}
      onClose={onClose}
    >
      {/* AI Loading State */}
      {aiLoading && (
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: `2px solid ${COLORS.borderLight}`,
              borderTopColor: COLORS.black,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: COLORS.text,
              fontFamily: FONTS.body,
              marginBottom: 4,
            }}
          >
            Building proposal...
          </div>
          <div
            style={{
              fontSize: 12,
              color: COLORS.textLight,
              fontFamily: FONTS.body,
            }}
          >
            AI is analyzing lead data
          </div>
        </div>
      )}

      {/* Main form (hidden while AI loading) */}
      {!aiLoading && (
        <>
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

          {/* Re-analyze with AI button */}
          {hasApiKey() && (
            <button
              onClick={runAiConfig}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "none",
                border: `1px solid ${COLORS.border}`,
                borderRadius: RADII.sm,
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 600,
                color: COLORS.textMuted,
                cursor: "pointer",
                fontFamily: FONTS.body,
                marginBottom: 20,
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = COLORS.textLight)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = COLORS.border)
              }
            >
              <Icon type="spark" size={13} color={COLORS.textMuted} />
              Re-analyze with AI
            </button>
          )}

          {/* No API key notice */}
          {!hasApiKey() && (
            <div
              style={{
                padding: "12px 14px",
                fontSize: 12,
                color: COLORS.textLight,
                background: COLORS.bg,
                border: `1px solid ${COLORS.border}`,
                borderRadius: RADII.sm,
                lineHeight: 1.5,
                marginBottom: 20,
              }}
            >
              Add your Claude API key in Settings to enable AI auto-configuration.
            </div>
          )}

          {/* ── PRIMARY PACKAGE ── */}
          <FormField label="Primary Package">
            <select
              style={selectStyle}
              value={primaryPackage}
              onChange={(e) => handlePrimaryChange(e.target.value)}
            >
              <option value="">Select...</option>
              {PACKAGE_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.value}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Primary Price">
            <input
              style={inputStyle}
              type="text"
              value={primaryPrice}
              onChange={(e) =>
                setPrimaryPrice(e.target.value.replace(/[^\d]/g, ""))
              }
              onBlur={() => setPrimaryPrice(formatCurrency(primaryPrice))}
              onFocus={() => {
                const raw = parseCurrency(primaryPrice);
                setPrimaryPrice(raw ? String(raw) : "");
              }}
              placeholder="$0"
            />
          </FormField>

          {/* ── UPSELL TOGGLE + PACKAGE ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: showUpsell ? 16 : 20,
            }}
          >
            <label
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: is14Piece ? COLORS.textLight : COLORS.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Show Upsell Package
            </label>
            <ToggleSwitch
              checked={showUpsell}
              onChange={handleUpsellToggle}
              disabled={is14Piece}
            />
          </div>

          {showUpsell && (
            <>
              <FormField label="Upsell Package">
                <select
                  style={selectStyle}
                  value={upsellPackage}
                  onChange={(e) => handleUpsellChange(e.target.value)}
                >
                  <option value="">Select...</option>
                  {PACKAGE_OPTIONS.filter(
                    (p) => p.value !== primaryPackage
                  ).map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.value}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Upsell Price">
                <input
                  style={inputStyle}
                  type="text"
                  value={upsellPrice}
                  onChange={(e) =>
                    setUpsellPrice(e.target.value.replace(/[^\d]/g, ""))
                  }
                  onBlur={() => setUpsellPrice(formatCurrency(upsellPrice))}
                  onFocus={() => {
                    const raw = parseCurrency(upsellPrice);
                    setUpsellPrice(raw ? String(raw) : "");
                  }}
                  placeholder="$0"
                />
              </FormField>
            </>
          )}

          <SectionDivider />

          {/* ── EVENT DATE + VENUE ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <FormField label="Event Date">
              <input
                style={inputStyle}
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </FormField>
            <FormField label="Venue">
              <input
                style={inputStyle}
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
              />
            </FormField>
          </div>

          {/* ── COCKTAIL TIMES ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <FormField label="Cocktail Hour Start">
              <input
                style={inputStyle}
                type="time"
                value={cocktailStart}
                onChange={(e) => setCocktailStart(e.target.value)}
              />
            </FormField>
            <FormField label="Cocktail Hour End">
              <input
                style={inputStyle}
                type="time"
                value={cocktailEnd}
                onChange={(e) => setCocktailEnd(e.target.value)}
              />
            </FormField>
          </div>

          {/* ── RECEPTION TIMES ── */}
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

          <SectionDivider />

          {/* ── COCKTAIL OPTIONS TOGGLE ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <label
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: COLORS.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Show Cocktail Options
            </label>
            <ToggleSwitch checked={showCocktail} onChange={setShowCocktail} />
          </div>

          <SectionDivider />

          {/* ── INTRO PARAGRAPH ── */}
          <FormField label="Intro Paragraph">
            <textarea
              style={{
                ...inputStyle,
                minHeight: 100,
                resize: "vertical",
                lineHeight: 1.6,
                opacity: introLoading ? 0.6 : 1,
              }}
              value={introLoading ? "Generating..." : introParagraph}
              onChange={(e) => setIntroParagraph(e.target.value)}
              disabled={introLoading}
              placeholder="AI generated intro will appear here..."
            />
          </FormField>

          {/* Regenerate Intro */}
          {hasApiKey() && (
            <button
              onClick={regenerateIntro}
              disabled={introLoading}
              style={{
                background: "none",
                border: "none",
                fontSize: 12,
                fontWeight: 600,
                color: introLoading ? COLORS.textLight : COLORS.textMuted,
                cursor: introLoading ? "not-allowed" : "pointer",
                fontFamily: FONTS.body,
                padding: 0,
                marginTop: -8,
                marginBottom: 20,
              }}
            >
              {introLoading ? "Generating..." : "Regenerate Intro"}
            </button>
          )}

          {/* ── AI REASONING (collapsed) ── */}
          {aiReasoning && (
            <div style={{ marginBottom: 20 }}>
              <button
                onClick={() => setReasoningOpen(!reasoningOpen)}
                style={{
                  background: "none",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  color: COLORS.textLight,
                  cursor: "pointer",
                  fontFamily: FONTS.body,
                  padding: 0,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    transform: reasoningOpen
                      ? "rotate(90deg)"
                      : "rotate(0deg)",
                    transition: "transform 0.15s",
                    fontSize: 10,
                  }}
                >
                  ▶
                </span>
                AI Reasoning
              </button>
              {reasoningOpen && (
                <div
                  style={{
                    marginTop: 8,
                    padding: "10px 14px",
                    background: COLORS.bg,
                    border: `1px solid ${COLORS.borderLight}`,
                    borderRadius: RADII.sm,
                    fontSize: 12,
                    color: COLORS.textLight,
                    lineHeight: 1.6,
                    fontFamily: FONTS.body,
                  }}
                >
                  {aiReasoning}
                </div>
              )}
            </div>
          )}

          {/* ── GENERATE BUTTON ── */}
          <button
            onClick={handleGenerate}
            disabled={generating || !primaryPackage}
            style={{
              width: "100%",
              padding: "13px 20px",
              background: COLORS.black,
              color: COLORS.cream,
              border: "none",
              borderRadius: RADII.sm,
              fontSize: 13,
              fontWeight: 600,
              cursor:
                generating || !primaryPackage ? "not-allowed" : "pointer",
              fontFamily: FONTS.body,
              opacity: generating || !primaryPackage ? 0.7 : 1,
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
        </>
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
