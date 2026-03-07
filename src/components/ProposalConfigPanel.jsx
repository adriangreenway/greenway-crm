import React, { useState, useEffect } from "react";
import { COLORS, FONTS, RADII } from "../tokens";
import SlideOverPanel from "./SlideOverPanel";
import Icon from "../icons";
import { formatCurrency, parseCurrency } from "../utils/formatters";
import { callClaude, getApiKey, hasApiKey } from "../utils/claudeApi";
import { formatDate } from "../data/seed";

// Map config value to display label
const configToLabel = (config) => {
  if (!config) return "";
  const num = config.replace(/\D/g, "");
  return num ? `${num} Piece Band` : config;
};

// Map display label back to config value
const labelToConfig = (label) => {
  if (!label) return "";
  const num = label.replace(/\D/g, "");
  return num ? `${num} piece` : label;
};

// Package options
const PACKAGE_OPTIONS = [
  { value: "6 Piece Band", label: "6 Piece Band" },
  { value: "8 Piece Band", label: "8 Piece Band" },
  { value: "10 Piece Band", label: "10 Piece Band" },
  { value: "12 Piece Band", label: "12 Piece Band" },
  { value: "14 Piece Band", label: "14 Piece Band" },
];

// Format time for display (24hr to 12hr)
const formatTime12 = (time24) => {
  if (!time24) return "";
  const [h, m] = time24.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
};

// System prompt for AI intro
const INTRO_SYSTEM_PROMPT = `You are writing a proposal introduction for Adrian Michael, founder of The Greenway Band, a premium live wedding band in Houston, TX.

Write a 2 to 3 sentence introduction paragraph for a wedding proposal. The tone is grounded, specific, and confident. It should read like Adrian wrote it, not a copywriter. Use contractions. Reference the venue by name and say something specific about why this band configuration fits the space or the evening.

Do not use hyphens as dashes. Do not use exclamation points. Do not use generic phrases like "your special day" or "unforgettable evening." Do not mention price.

Return ONLY the paragraph text. No quotes, no labels, no formatting.`;

// Shared input style
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

const ProposalConfigPanel = ({ lead, onClose, onGenerate, onUpdateLead }) => {
  const hasExisting = !!lead.proposal_slug;
  const existingConfig = lead.proposal_config_override || {};

  const [packageName, setPackageName] = useState(
    existingConfig.package_name || configToLabel(lead.config) || ""
  );
  const [price, setPrice] = useState(
    lead.price != null ? formatCurrency(lead.price) : ""
  );
  const [eventDate, setEventDate] = useState(lead.event_date || "");
  const [venue, setVenue] = useState(lead.venue || "");
  const [cocktailStart, setCocktailStart] = useState(existingConfig.cocktail_start_24 || "");
  const [cocktailEnd, setCocktailEnd] = useState(existingConfig.cocktail_end_24 || "");
  const [receptionStart, setReceptionStart] = useState(existingConfig.reception_start_24 || "19:00");
  const [receptionEnd, setReceptionEnd] = useState(existingConfig.reception_end_24 || "23:00");
  const [introParagraph, setIntroParagraph] = useState(existingConfig.intro_paragraph || "");
  const [generating, setGenerating] = useState(false);
  const [introLoading, setIntroLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showStagePrompt, setShowStagePrompt] = useState(false);
  const [stageUpdating, setStageUpdating] = useState(false);
  const [toast, setToast] = useState(null);

  // Generate AI intro on mount if no existing intro
  useEffect(() => {
    if (!introParagraph && hasApiKey() && venue) {
      generateIntro();
    }
  }, []);

  const generateIntro = async () => {
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
Configuration: ${packageName || "TBD"}
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
      console.error("AI intro generation failed:", err);
    } finally {
      setIntroLoading(false);
    }
  };

  const buildConfigOverride = () => ({
    package_name: packageName,
    cocktail_start: cocktailStart ? formatTime12(cocktailStart) : null,
    cocktail_end: cocktailEnd ? formatTime12(cocktailEnd) : null,
    reception_start: receptionStart ? formatTime12(receptionStart) : null,
    reception_end: receptionEnd ? formatTime12(receptionEnd) : null,
    cocktail_start_24: cocktailStart || null,
    cocktail_end_24: cocktailEnd || null,
    reception_start_24: receptionStart || null,
    reception_end_24: receptionEnd || null,
    intro_paragraph: introParagraph || null,
  });

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const configOverride = buildConfigOverride();
      const priceRaw = parseCurrency(price);

      // Update lead fields (price, venue, event_date) if changed
      const leadUpdates = {};
      if (priceRaw && priceRaw !== lead.price) leadUpdates.price = priceRaw;
      if (venue && venue !== lead.venue) leadUpdates.venue = venue;
      if (eventDate && eventDate !== lead.event_date) leadUpdates.event_date = eventDate;
      const newConfig = labelToConfig(packageName);
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
        setLinkCopied(true);
        setTimeout(() => setToast(null), 2500);
      } else {
        // Generate new proposal
        const result = await onGenerate(lead.id, configOverride);
        if (result?.url) {
          await navigator.clipboard.writeText(result.url);
          setToast("Proposal link copied");
          setLinkCopied(true);
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

      {/* Package Name */}
      <FormField label="Package Name">
        <select
          style={selectStyle}
          value={packageName}
          onChange={(e) => setPackageName(e.target.value)}
        >
          <option value="">Select...</option>
          {PACKAGE_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </FormField>

      {/* Price + Date */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="Price">
          <input
            style={inputStyle}
            type="text"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))}
            onBlur={() => setPrice(formatCurrency(price))}
            onFocus={() => {
              const raw = parseCurrency(price);
              setPrice(raw ? String(raw) : "");
            }}
            placeholder="0"
          />
        </FormField>
        <FormField label="Event Date">
          <input
            style={inputStyle}
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
        </FormField>
      </div>

      {/* Venue */}
      <FormField label="Venue">
        <input
          style={inputStyle}
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
        />
      </FormField>

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: COLORS.borderLight,
          margin: "8px 0 16px",
        }}
      />

      {/* Cocktail Times */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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

      {/* Reception Times */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: COLORS.borderLight,
          margin: "8px 0 16px",
        }}
      />

      {/* Intro Paragraph */}
      <FormField label="Intro Paragraph">
        {!hasApiKey() ? (
          <div
            style={{
              padding: "12px 14px",
              fontSize: 12,
              color: COLORS.textLight,
              background: COLORS.bg,
              border: `1px solid ${COLORS.border}`,
              borderRadius: RADII.sm,
              lineHeight: 1.5,
            }}
          >
            Add your Claude API key in Settings to enable AI generated introductions.
          </div>
        ) : (
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
        )}
      </FormField>

      {/* Regenerate Intro */}
      {hasApiKey() && (
        <button
          onClick={generateIntro}
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

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={generating}
        style={{
          width: "100%",
          padding: "13px 20px",
          background: COLORS.black,
          color: COLORS.cream,
          border: "none",
          borderRadius: RADII.sm,
          fontSize: 13,
          fontWeight: 600,
          cursor: generating ? "not-allowed" : "pointer",
          fontFamily: FONTS.body,
          opacity: generating ? 0.7 : 1,
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
