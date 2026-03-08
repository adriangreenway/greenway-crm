import React, { useState, useEffect } from "react";
import { COLORS, FONTS, RADII } from "../tokens";
import SlideOverPanel from "./SlideOverPanel";
import Icon from "../icons";
import { formatCurrency, parseCurrency } from "../utils/formatters";

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

// Upsell tier: 6→10, 8→10, 10→14, 12→14, 14→null
const UPSELL_TIER = {
  "6 Piece Band": "10 Piece Band",
  "8 Piece Band": "10 Piece Band",
  "10 Piece Band": "14 Piece Band",
  "12 Piece Band": "14 Piece Band",
  "14 Piece Band": null,
};

// ── Intro Templates ──
const INTRO_TEMPLATES = [
  {
    id: 'standard',
    label: 'Standard',
    text: "We're looking forward to being part of your evening at {{VENUE}}. A {{CONFIG}} gives you the full range \u2014 vocalists, rhythm section, and enough energy to keep the room moving from start to finish.",
  },
  {
    id: 'horns',
    label: 'Horn Section Highlight',
    text: "{{VENUE}} is the kind of room where a full band can really open up. The {{CONFIG}} brings a horn section that fills the space without overpowering it, and vocalists who know how to read a crowd.",
  },
  {
    id: 'intimate',
    label: 'Smaller Configuration',
    text: "We love playing rooms like {{VENUE}}. A {{CONFIG}} keeps things tight and focused \u2014 every musician on that stage is pulling their weight, and the energy stays right where your guests are.",
  },
  {
    id: 'custom',
    label: 'Custom',
    text: '',
  },
];

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

// Resolve merge fields in a template
const resolveTemplate = (templateText, venue, packageName) => {
  if (!templateText) return "";
  const configDisplay = packageName
    ? packageName.toLowerCase().replace(" band", " band")
    : "band";
  return templateText
    .replace(/\{\{VENUE\}\}/g, venue || "your venue")
    .replace(/\{\{CONFIG\}\}/g, configDisplay);
};

// Determine which template ID to auto-select based on config
const getDefaultTemplateId = (packageName) => {
  const num = parseInt(String(packageName || "").replace(/\D/g, ""), 10);
  if (num >= 10) return 'horns';
  return 'standard';
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
  const [selectedTemplate, setSelectedTemplate] = useState("standard");
  const [generating, setGenerating] = useState(false);
  const [showStagePrompt, setShowStagePrompt] = useState(false);
  const [stageUpdating, setStageUpdating] = useState(false);
  const [toast, setToast] = useState(null);

  // ── Initialize from existing config ──
  useEffect(() => {
    let initPackage = "";

    if (hasNewSchema) {
      const ec = existingConfig;
      initPackage = ec.primary_package.name;
      setPrimaryPackage(initPackage);
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

      if (ec.intro_paragraph) {
        setIntroParagraph(ec.intro_paragraph);
        setSelectedTemplate("custom");
      } else {
        const defaultId = getDefaultTemplateId(initPackage);
        setSelectedTemplate(defaultId);
        const tpl = INTRO_TEMPLATES.find((t) => t.id === defaultId);
        if (tpl) {
          setIntroParagraph(resolveTemplate(tpl.text, lead.venue || "", initPackage));
        }
      }
    } else if (existingConfig.package_name) {
      initPackage = existingConfig.package_name;
      setPrimaryPackage(initPackage);
      setPrimaryPrice(lead.price != null ? formatCurrency(lead.price) : "");
      setCocktailStart(existingConfig.cocktail_start_24 || "");
      setCocktailEnd(existingConfig.cocktail_end_24 || "");
      setReceptionStart(existingConfig.reception_start_24 || "19:00");
      setReceptionEnd(existingConfig.reception_end_24 || "23:00");

      if (existingConfig.intro_paragraph) {
        setIntroParagraph(existingConfig.intro_paragraph);
        setSelectedTemplate("custom");
      } else {
        const defaultId = getDefaultTemplateId(initPackage);
        setSelectedTemplate(defaultId);
        const tpl = INTRO_TEMPLATES.find((t) => t.id === defaultId);
        if (tpl) {
          setIntroParagraph(resolveTemplate(tpl.text, lead.venue || "", initPackage));
        }
      }
    } else {
      // No existing config — pre-fill from lead data
      const leadConfig = lead.config;
      if (leadConfig) {
        initPackage = configToName(leadConfig);
        setPrimaryPackage(initPackage);
        if (PACKAGE_PRICES[initPackage]) {
          setPrimaryPrice(formatCurrency(PACKAGE_PRICES[initPackage]));
        }
      }
      if (lead.price != null) {
        setPrimaryPrice(formatCurrency(lead.price));
      }

      const defaultId = getDefaultTemplateId(initPackage);
      setSelectedTemplate(defaultId);
      const tpl = INTRO_TEMPLATES.find((t) => t.id === defaultId);
      if (tpl) {
        setIntroParagraph(resolveTemplate(tpl.text, lead.venue || "", initPackage));
      }
    }
  }, []);

  // ── Template selection handler ──
  const handleTemplateSelect = (templateId) => {
    setSelectedTemplate(templateId);
    if (templateId === "custom") return;
    const tpl = INTRO_TEMPLATES.find((t) => t.id === templateId);
    if (tpl) {
      setIntroParagraph(resolveTemplate(tpl.text, venue, primaryPackage));
    }
  };

  // ── Live-update intro when venue or package changes (if a non-custom template is active) ──
  useEffect(() => {
    if (selectedTemplate === "custom") return;
    const tpl = INTRO_TEMPLATES.find((t) => t.id === selectedTemplate);
    if (tpl) {
      setIntroParagraph(resolveTemplate(tpl.text, venue, primaryPackage));
    }
  }, [venue, primaryPackage, selectedTemplate]);

  // ── Package cascading ──
  const handlePrimaryChange = (name) => {
    setPrimaryPackage(name);
    setPrimaryPrice(
      PACKAGE_PRICES[name] ? formatCurrency(PACKAGE_PRICES[name]) : ""
    );

    const upsell = UPSELL_TIER[name];
    if (upsell) {
      if (showUpsell) {
        setUpsellPackage(upsell);
        setUpsellPrice(formatCurrency(PACKAGE_PRICES[upsell]));
      }
    } else {
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
      upsell_config:
        showUpsell && upsellPackage
          ? upsellPackage.replace(/\D/g, "") + " piece"
          : null,
      cocktail_options: showCocktail ? ["solo", "duo", "trio"] : [],
      show_cocktail: showCocktail,
      intro_paragraph: introParagraph || null,

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

  const is14Piece = primaryPackage === "14 Piece Band";

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

      {/* ── INTRO TEMPLATE SELECTOR ── */}
      <FormField label="Intro Template">
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginBottom: 10,
          }}
        >
          {INTRO_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => handleTemplateSelect(tpl.id)}
              style={{
                padding: "5px 12px",
                fontSize: 11,
                fontWeight: selectedTemplate === tpl.id ? 600 : 500,
                fontFamily: FONTS.body,
                color:
                  selectedTemplate === tpl.id ? COLORS.white : COLORS.textMuted,
                background:
                  selectedTemplate === tpl.id ? COLORS.black : COLORS.bg,
                border: `1px solid ${
                  selectedTemplate === tpl.id
                    ? COLORS.black
                    : COLORS.border
                }`,
                borderRadius: RADII.pill,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {tpl.label}
            </button>
          ))}
        </div>
      </FormField>

      {/* ── INTRO PARAGRAPH ── */}
      <FormField label="Intro Paragraph">
        <textarea
          style={{
            ...inputStyle,
            minHeight: 100,
            resize: "vertical",
            lineHeight: 1.6,
          }}
          value={introParagraph}
          onChange={(e) => {
            setIntroParagraph(e.target.value);
            if (selectedTemplate !== "custom") {
              setSelectedTemplate("custom");
            }
          }}
          placeholder="Write a venue-specific intro paragraph..."
        />
      </FormField>

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
