import React, { useState } from "react";
import { COLORS, FONTS, RADII, SHADOWS } from "../tokens";
import Icon from "../icons";

// Relative time helper
function timeAgo(dateStr) {
  if (!dateStr) return "";
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHrs < 24) return `${diffHrs} hour${diffHrs !== 1 ? "s" : ""} ago`;
  if (diffDays === 1) {
    return `yesterday at ${then.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  }
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " at " + then.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// Toggle switch component
const ToggleSwitch = ({ active, disabled, onToggle }) => (
  <button
    onClick={disabled ? undefined : onToggle}
    disabled={disabled}
    style={{
      width: 40,
      height: 22,
      borderRadius: RADII.pill,
      background: active ? COLORS.black : COLORS.border,
      border: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      position: "relative",
      transition: "background 0.2s ease",
      flexShrink: 0,
      opacity: disabled ? 0.5 : 1,
    }}
    title={disabled ? "Requires Supabase connection" : active ? "Active" : "Paused"}
  >
    <div
      style={{
        width: 16,
        height: 16,
        borderRadius: "50%",
        background: active ? COLORS.white : COLORS.textLight,
        position: "absolute",
        top: 3,
        left: active ? 21 : 3,
        transition: "left 0.2s ease, background 0.2s ease",
      }}
    />
  </button>
);

// Small spinner for Send Now loading
const Spinner = () => (
  <div
    style={{
      width: 14,
      height: 14,
      border: `2px solid rgba(255,255,255,0.3)`,
      borderTopColor: COLORS.white,
      borderRadius: "50%",
      animation: "spin 0.6s linear infinite",
      display: "inline-block",
    }}
  />
);

const AiCrewPersona = ({
  persona,       // "adrian_ai" | "content_ai" | "strategy_ai"
  name,          // "Adrian AI"
  role,          // "Chief of Staff"
  schedule,      // "Daily at 8 AM CT"
  icon,          // "spark" | "grid" | "trending"
  isActive,
  lastMessage,   // { message_body, created_at } or null
  supabaseReady, // false when Supabase not configured
  onToggle,      // (persona, newValue) => void
  onSendNow,     // (persona) => Promise
  onViewHistory, // (persona) => void
}) => {
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null); // "sent" | "error" | null
  const [hovered, setHovered] = useState(false);

  const handleSendNow = async () => {
    if (!supabaseReady || sending) return;
    setSending(true);
    setSendResult(null);
    try {
      await onSendNow(persona);
      setSendResult("sent");
      setTimeout(() => setSendResult(null), 2000);
    } catch {
      setSendResult("error");
      setTimeout(() => setSendResult(null), 3000);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{
        background: COLORS.white,
        border: `1px solid ${COLORS.border}`,
        borderRadius: RADII.xl,
        padding: 28,
        transition: "box-shadow 0.15s ease",
        boxShadow: hovered ? SHADOWS.md : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Icon row + toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: COLORS.bg,
            border: `1px solid ${COLORS.borderLight}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon type={icon} size={26} color={COLORS.black} />
        </div>
        <ToggleSwitch
          active={isActive}
          disabled={!supabaseReady}
          onToggle={() => onToggle(persona, !isActive)}
        />
      </div>

      {/* Name */}
      <div
        style={{
          fontSize: 17,
          fontWeight: 700,
          color: COLORS.black,
          fontFamily: FONTS.body,
          marginBottom: 4,
        }}
      >
        {name}
      </div>

      {/* Role */}
      <div
        style={{
          fontSize: 12,
          color: COLORS.textMuted,
          marginBottom: 2,
        }}
      >
        {role}
      </div>

      {/* Schedule */}
      <div
        style={{
          fontSize: 12,
          color: COLORS.textLight,
        }}
      >
        {schedule}
      </div>

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: COLORS.borderLight,
          margin: "16px 0",
        }}
      />

      {/* Last message preview */}
      <div style={{ minHeight: 62, marginBottom: 16 }}>
        {!supabaseReady ? (
          <div
            style={{
              fontSize: 12.5,
              color: COLORS.textLight,
              fontStyle: "italic",
              lineHeight: 1.6,
            }}
          >
            Connect Supabase to enable AI Crew
          </div>
        ) : lastMessage ? (
          <>
            <div
              style={{
                fontSize: 12.5,
                color: COLORS.textMuted,
                lineHeight: 1.6,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {lastMessage.message_body}
            </div>
            <div
              style={{
                fontSize: 11,
                color: COLORS.textLight,
                marginTop: 6,
              }}
            >
              Sent {timeAgo(lastMessage.created_at)}
            </div>
          </>
        ) : (
          <div
            style={{
              fontSize: 12.5,
              color: COLORS.textLight,
              fontStyle: "italic",
            }}
          >
            No messages yet
          </div>
        )}
      </div>

      {/* Action row */}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={handleSendNow}
          disabled={!supabaseReady || sending}
          style={{
            flex: 1,
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: FONTS.body,
            background: COLORS.black,
            color: COLORS.white,
            border: "none",
            borderRadius: RADII.sm,
            cursor: !supabaseReady || sending ? "not-allowed" : "pointer",
            opacity: !supabaseReady ? 0.4 : 1,
            transition: "opacity 0.15s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            minHeight: 35,
          }}
          onMouseEnter={(e) => {
            if (supabaseReady && !sending) e.currentTarget.style.opacity = "0.9";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = !supabaseReady ? "0.4" : "1";
          }}
          title={!supabaseReady ? "Requires Supabase connection" : ""}
        >
          {sending ? (
            <Spinner />
          ) : sendResult === "sent" ? (
            "Sent!"
          ) : sendResult === "error" ? (
            "Failed"
          ) : (
            "Send Now"
          )}
        </button>
        <button
          onClick={() => onViewHistory(persona)}
          style={{
            flex: 1,
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: FONTS.body,
            background: COLORS.white,
            color: COLORS.black,
            border: `1px solid ${COLORS.border}`,
            borderRadius: RADII.sm,
            cursor: "pointer",
            transition: "background 0.15s",
            minHeight: 35,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.bg)}
          onMouseLeave={(e) => (e.currentTarget.style.background = COLORS.white)}
        >
          View History
        </button>
      </div>
    </div>
  );
};

export default AiCrewPersona;
