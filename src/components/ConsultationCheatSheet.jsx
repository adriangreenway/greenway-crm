import React, { useState, useEffect, useCallback } from "react";
import { COLORS, FONTS, RADII } from "../tokens";
import Icon from "../icons";
import SlideOverPanel from "./SlideOverPanel";
import { callClaude, BASE_SYSTEM_PROMPT, getApiKey, hasApiKey } from "../utils/claudeApi";
import { getLeadName, formatDate } from "../data/seed";
import { formatCurrency } from "../utils/formatters";

// ── Shimmer loading placeholder ──
const ShimmerLine = ({ width = "100%" }) => (
  <div
    style={{
      height: 14,
      width,
      borderRadius: 6,
      background: `linear-gradient(90deg, ${COLORS.bg} 25%, ${COLORS.borderLight} 50%, ${COLORS.bg} 75%)`,
      backgroundSize: "200% 100%",
      animation: "shimmer 1.5s ease infinite",
    }}
  />
);

const ShimmerBlock = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "8px 0" }}>
    <ShimmerLine width="90%" />
    <ShimmerLine width="75%" />
    <ShimmerLine width="85%" />
    <ShimmerLine width="60%" />
  </div>
);

// ── Section header ──
const SectionHeader = ({ title, icon }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 12,
      marginTop: 4,
    }}
  >
    <Icon type={icon} size={14} color={COLORS.textMuted} />
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: COLORS.textMuted,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      {title}
    </span>
  </div>
);

// ── Info row ──
const InfoRow = ({ label, value, muted }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "8px 0",
      borderBottom: `1px solid ${COLORS.borderLight}`,
    }}
  >
    <span style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 500 }}>
      {label}
    </span>
    <span
      style={{
        fontSize: 13,
        color: muted ? COLORS.textLight : COLORS.text,
        fontWeight: 500,
        textAlign: "right",
        maxWidth: "60%",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {value || "\u2014"}
    </span>
  </div>
);

const ConsultationCheatSheet = ({ lead, onClose, onUpdateLead, onNavigateToSettings }) => {
  const [talkingPoints, setTalkingPoints] = useState([]);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [pointsError, setPointsError] = useState(null);
  const [editableNotes, setEditableNotes] = useState(lead.notes || "");
  const [notesSaving, setNotesSaving] = useState(false);

  // ── Days in pipeline ──
  const daysInPipeline = lead.created_at
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  // ── Format created_at ──
  const createdFormatted = lead.created_at
    ? new Date(lead.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "\u2014";

  // ── Long date for event ──
  const eventDateLong = lead.event_date
    ? new Date(lead.event_date + "T00:00:00").toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "No date set";

  // ── Piece count from config ──
  const pieceCount = lead.config ? lead.config.split(" ")[0] : "";

  // ── Generate talking points ──
  const generateTalkingPoints = useCallback(async () => {
    const apiKey = getApiKey();
    if (!apiKey) return;

    setLoadingPoints(true);
    setPointsError(null);

    const systemPrompt = `${BASE_SYSTEM_PROMPT}

You are preparing a consultation brief for Adrian before a sales call with a potential wedding client.
Generate 3 to 5 specific, actionable talking points based on the lead data.
Be specific to their details — mention their venue by name, their date, their guest count.
If the guest count suggests a larger configuration, mention it.
If the source is a planner or agent, suggest relationship building angles.
Do not generate generic advice. Every point should reference this specific lead's data.
Return as a JSON array of strings.`;

    const userPrompt = `Lead data:
- Couple: ${lead.partner1_first || ""} ${lead.partner1_last || ""} and ${lead.partner2_first || ""} ${lead.partner2_last || ""}
- Event date: ${eventDateLong}
- Venue: ${lead.venue || "Not specified"}
- Guest count: ${lead.guest_count || "Not specified"}
- Configuration: ${pieceCount ? pieceCount + " piece" : "Not specified"}
- Price quoted: ${lead.price ? formatCurrency(lead.price) : "Not quoted"}
- Brand: ${lead.brand || "Greenway"}
- Source: ${lead.source || "Unknown"}
- Planner: ${lead.planner_name || "No planner listed"}
- Current stage: ${lead.stage || "Unknown"}
- Days in pipeline: ${daysInPipeline}
- Notes: ${lead.notes || "None"}

Generate 3 to 5 specific talking points for this consultation call.`;

    try {
      const response = await callClaude({
        systemPrompt,
        userPrompt,
        apiKey,
        maxTokens: 1000,
      });

      // Parse JSON array from response
      let points = [];
      try {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          points = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback: split by newlines and clean up
          points = response
            .split("\n")
            .filter((line) => line.trim().length > 10)
            .map((line) => line.replace(/^[-•*\d.)\s]+/, "").trim())
            .filter(Boolean)
            .slice(0, 5);
        }
      } catch {
        points = response
          .split("\n")
          .filter((line) => line.trim().length > 10)
          .map((line) => line.replace(/^[-•*\d.)\s]+/, "").trim())
          .filter(Boolean)
          .slice(0, 5);
      }

      setTalkingPoints(points);
    } catch (err) {
      setPointsError(err.message);
    } finally {
      setLoadingPoints(false);
    }
  }, [lead, eventDateLong, pieceCount, daysInPipeline]);

  // Auto-generate on mount if API key exists
  useEffect(() => {
    if (hasApiKey()) {
      generateTalkingPoints();
    }
  }, []);

  // ── Auto save notes on blur ──
  const handleNotesBlur = useCallback(async () => {
    if (editableNotes === (lead.notes || "")) return;
    if (!onUpdateLead) return;
    setNotesSaving(true);
    try {
      await onUpdateLead(lead.id, { notes: editableNotes });
    } catch (err) {
      console.error("Failed to save notes:", err);
    } finally {
      setNotesSaving(false);
    }
  }, [editableNotes, lead.notes, lead.id, onUpdateLead]);

  return (
    <SlideOverPanel
      open
      title="Consultation Brief"
      subtitle={`${getLeadName(lead)} · ${eventDateLong}`}
      onClose={onClose}
    >
      {/* ── Shimmer keyframes ── */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* ── Section 1: At a Glance ── */}
      <SectionHeader title="At a Glance" icon="eye" />
      <div
        style={{
          background: COLORS.bg,
          borderRadius: RADII.sm,
          padding: "4px 16px",
          marginBottom: 20,
        }}
      >
        <InfoRow label="Couple" value={`${lead.partner1_first || ""} and ${lead.partner2_first || ""}`} />
        <InfoRow label="Date" value={eventDateLong} />
        <InfoRow label="Venue" value={lead.venue} />
        <InfoRow
          label="Guest count"
          value={lead.guest_count ? lead.guest_count.toLocaleString() : null}
        />
        <InfoRow
          label="Configuration"
          value={pieceCount ? `${pieceCount} piece` : null}
        />
        <InfoRow
          label="Budget / Quoted"
          value={lead.price ? formatCurrency(lead.price) : null}
        />
        <InfoRow label="Source" value={lead.source} />
        <InfoRow
          label="Planner"
          value={lead.planner_name || "No planner listed"}
          muted={!lead.planner_name}
        />
      </div>

      {/* ── Section 2: Timeline ── */}
      <SectionHeader title="Timeline" icon="clock" />
      <div
        style={{
          background: COLORS.bg,
          borderRadius: RADII.sm,
          padding: "4px 16px",
          marginBottom: 20,
        }}
      >
        <InfoRow label="First inquiry" value={createdFormatted} />
        <InfoRow label="Days in pipeline" value={`${daysInPipeline} days`} />
        <InfoRow label="Current stage" value={lead.stage} />
        <InfoRow
          label="Proposal sent"
          value={
            lead.stage === "New Lead"
              ? "No"
              : "Yes"
          }
        />
        <InfoRow
          label="Previous emails"
          value="Track in future update"
          muted
        />
      </div>

      {/* ── Section 3: AI Talking Points ── */}
      <SectionHeader title="AI Talking Points" icon="spark" />
      <div
        style={{
          background: COLORS.bg,
          borderRadius: RADII.sm,
          padding: 16,
          marginBottom: 20,
        }}
      >
        {!hasApiKey() ? (
          <div
            style={{
              fontSize: 13,
              color: COLORS.textMuted,
              lineHeight: 1.7,
            }}
          >
            Add your Claude API key in{" "}
            <button
              onClick={() => {
                onClose();
                if (onNavigateToSettings) onNavigateToSettings();
              }}
              style={{
                background: "none",
                border: "none",
                color: COLORS.purple,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: FONTS.body,
                fontSize: 13,
                textDecoration: "underline",
                padding: 0,
              }}
            >
              Settings
            </button>{" "}
            to generate talking points
          </div>
        ) : loadingPoints ? (
          <ShimmerBlock />
        ) : pointsError ? (
          <div>
            <div style={{ fontSize: 12, color: COLORS.red, marginBottom: 10 }}>
              {pointsError}
            </div>
            <button
              onClick={generateTalkingPoints}
              style={{
                padding: "6px 14px",
                background: COLORS.purple,
                color: COLORS.white,
                border: "none",
                borderRadius: RADII.sm,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: FONTS.body,
              }}
            >
              Retry
            </button>
          </div>
        ) : talkingPoints.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {talkingPoints.map((point, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: COLORS.purple,
                    marginTop: 6,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.6 }}>
                  {point}
                </span>
              </div>
            ))}
            <button
              onClick={generateTalkingPoints}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                marginTop: 6,
                padding: "8px 16px",
                background: "transparent",
                color: COLORS.textMuted,
                border: `1px solid ${COLORS.border}`,
                borderRadius: RADII.sm,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: FONTS.body,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = COLORS.bg;
                e.currentTarget.style.color = COLORS.text;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = COLORS.textMuted;
              }}
            >
              <Icon type="refresh" size={12} color={COLORS.textMuted} />
              Regenerate
            </button>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: COLORS.textMuted }}>
            No talking points generated yet.
          </div>
        )}
      </div>

      {/* ── Section 4: Notes ── */}
      <SectionHeader title="Notes" icon="edit" />
      <div style={{ position: "relative" }}>
        <textarea
          value={editableNotes}
          onChange={(e) => setEditableNotes(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="Add notes during the call..."
          style={{
            width: "100%",
            minHeight: 120,
            padding: "12px 14px",
            fontSize: 13,
            lineHeight: 1.6,
            fontFamily: FONTS.body,
            color: COLORS.text,
            border: `1px solid ${COLORS.border}`,
            borderRadius: RADII.sm,
            background: COLORS.white,
            outline: "none",
            resize: "vertical",
          }}
        />
        {notesSaving && (
          <span
            style={{
              position: "absolute",
              bottom: 8,
              right: 12,
              fontSize: 11,
              color: COLORS.textLight,
              fontWeight: 500,
            }}
          >
            Saving...
          </span>
        )}
      </div>
    </SlideOverPanel>
  );
};

export default ConsultationCheatSheet;
