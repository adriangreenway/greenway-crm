import React, { useState, useEffect, useRef, useCallback } from "react";
import { COLORS, FONTS, RADII } from "../tokens";
import Icon from "../icons";
import { callClaude, BASE_SYSTEM_PROMPT, getApiKey, hasApiKey } from "../utils/claudeApi";

// ── Insight type to icon mapping ──
const INSIGHT_ICONS = {
  follow_up: "clock",
  hot_lead: "zap",
  conflict: "bell",
  revenue: "dollar",
  consultation: "calendar",
};

// ── Shimmer loading placeholder ──
const ShimmerLine = ({ width = "100%", delay = 0 }) => (
  <div
    style={{
      height: 12,
      width,
      borderRadius: 6,
      background: `linear-gradient(90deg, ${COLORS.borderLight} 25%, ${COLORS.bg} 50%, ${COLORS.borderLight} 75%)`,
      backgroundSize: "200% 100%",
      animation: `shimmer 1.5s ease ${delay}s infinite`,
    }}
  />
);

const ShimmerInsight = ({ delay = 0 }) => (
  <div style={{ display: "flex", gap: 10, padding: "8px 0" }}>
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        background: COLORS.borderLight,
        flexShrink: 0,
      }}
    />
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
      <ShimmerLine width="85%" delay={delay} />
      <ShimmerLine width="65%" delay={delay + 0.1} />
    </div>
  </div>
);

const ClaudeClues = ({ leads, onOpenLead }) => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const hasGenerated = useRef(false);

  const generateInsights = useCallback(async () => {
    const apiKey = getApiKey();
    if (!apiKey) return;

    setLoading(true);
    setError(null);

    const today = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const systemPrompt = `${BASE_SYSTEM_PROMPT}

You are analyzing Adrian's wedding band pipeline to surface actionable insights.
Focus on: leads going stale (no stage change in 5+ days), upcoming consultations in next 7 days, date conflicts between brands, high value leads that need attention, conversion rate patterns.
Return as JSON array of objects: { "type": "follow_up" | "hot_lead" | "conflict" | "revenue" | "consultation", "insight": "...", "action": "...", "leadId": "uuid or null" }
Generate 3 to 5 insights. Be specific — use names and dates, not generic advice.`;

    // Build a lean version of leads data
    const leadsData = leads.map((l) => ({
      id: l.id,
      name: `${l.partner1_first || ""} ${l.partner1_last || ""}`.trim(),
      partner2: `${l.partner2_first || ""} ${l.partner2_last || ""}`.trim(),
      stage: l.stage,
      brand: l.brand,
      venue: l.venue,
      event_date: l.event_date,
      price: l.price,
      source: l.source,
      consultation_date: l.consultation_date,
      followup_date: l.followup_date,
      created_at: l.created_at,
      updated_at: l.updated_at,
      guest_count: l.guest_count,
      config: l.config,
      lead_score: l.lead_score,
    }));

    const userPrompt = `Current pipeline data (all leads):
${JSON.stringify(leadsData, null, 2)}

Today's date: ${today}

Analyze and return insights.`;

    try {
      const response = await callClaude({
        systemPrompt,
        userPrompt,
        apiKey,
        maxTokens: 1200,
      });

      // Parse JSON array from response
      let parsed = [];
      try {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      } catch {
        // Fallback: try to extract insights from text
        parsed = [];
      }

      // Validate structure
      const validated = parsed
        .filter((item) => item.insight && item.action)
        .map((item) => ({
          type: item.type || "follow_up",
          insight: item.insight,
          action: item.action,
          leadId: item.leadId || null,
        }))
        .slice(0, 5);

      setInsights(validated.length > 0 ? validated : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [leads]);

  // Generate on mount (only once), if API key exists and leads available
  useEffect(() => {
    if (!hasGenerated.current && hasApiKey() && leads.length > 0) {
      hasGenerated.current = true;
      generateInsights();
    }
  }, [leads, generateInsights]);

  // ── No API key state ──
  if (!hasApiKey()) {
    return (
      <div
        style={{
          background: COLORS.bg,
          border: `1px solid ${COLORS.border}`,
          borderRadius: RADII.lg,
          padding: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <Icon type="spark" size={16} color={COLORS.black} />
          <span
            style={{
              fontFamily: FONTS.display,
              fontSize: 13,
              fontWeight: 700,
              color: COLORS.black,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Claude Clues
          </span>
        </div>
        <p
          style={{
            fontSize: 13,
            color: COLORS.textMuted,
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          AI pipeline insights will appear here. Add your Claude API key in Settings to activate.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: COLORS.bg,
        border: `1px solid ${COLORS.border}`,
        borderRadius: RADII.lg,
        padding: 20,
      }}
    >
      {/* Shimmer keyframes */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon type="spark" size={16} color={COLORS.black} />
          <span
            style={{
              fontFamily: FONTS.display,
              fontSize: 13,
              fontWeight: 700,
              color: COLORS.black,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Claude Clues
          </span>
        </div>
        {insights && !loading && (
          <button
            onClick={() => {
              hasGenerated.current = false;
              generateInsights();
            }}
            title="Refresh insights"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              borderRadius: RADII.sm,
              display: "flex",
              alignItems: "center",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.borderLight)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            <Icon type="refresh" size={13} color={COLORS.textMuted} />
          </button>
        )}
      </div>

      {/* Loading shimmer */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <ShimmerInsight delay={0} />
          <ShimmerInsight delay={0.15} />
          <ShimmerInsight delay={0.3} />
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div>
          <div style={{ fontSize: 12, color: COLORS.red, marginBottom: 8 }}>
            {error}
          </div>
          <button
            onClick={generateInsights}
            style={{
              padding: "5px 12px",
              background: COLORS.purple,
              color: COLORS.white,
              border: "none",
              borderRadius: RADII.sm,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: FONTS.body,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Insights */}
      {insights && !loading && !error && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {insights.length === 0 ? (
            <p
              style={{
                fontSize: 13,
                color: COLORS.textMuted,
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              No insights right now. Add more leads to get AI powered pipeline analysis.
            </p>
          ) : (
            insights.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "10px 0",
                  borderBottom:
                    i < insights.length - 1
                      ? `1px solid ${COLORS.borderLight}`
                      : "none",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: COLORS.white,
                    border: `1px solid ${COLORS.borderLight}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon
                    type={INSIGHT_ICONS[item.type] || "spark"}
                    size={13}
                    color={COLORS.textMuted}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12.5,
                      color: COLORS.text,
                      fontWeight: 500,
                      lineHeight: 1.5,
                    }}
                  >
                    {item.insight}
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: COLORS.textMuted,
                      lineHeight: 1.5,
                      marginTop: 2,
                    }}
                  >
                    {item.action}
                    {item.leadId && onOpenLead && (
                      <>
                        {" "}
                        <button
                          onClick={() => onOpenLead(item.leadId)}
                          style={{
                            background: "none",
                            border: "none",
                            color: COLORS.purple,
                            fontWeight: 600,
                            cursor: "pointer",
                            fontFamily: FONTS.body,
                            fontSize: 11.5,
                            padding: 0,
                            textDecoration: "underline",
                          }}
                        >
                          View
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ClaudeClues;
