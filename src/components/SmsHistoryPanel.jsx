import React, { useState, useEffect, useCallback } from "react";
import { COLORS, FONTS, RADII } from "../tokens";
import SlideOverPanel from "./SlideOverPanel";
import EmptyState from "./EmptyState";

// Status dot colors
const STATUS_DOT = {
  delivered: COLORS.green,
  sent: COLORS.amber,
  failed: COLORS.red,
};

// Format date/time for message card
function formatDateTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " at " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

const SmsHistoryPanel = ({
  open,
  onClose,
  personaName,  // "Adrian AI"
  persona,      // "adrian_ai"
  getSmsMessages,
}) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;

  // Load messages when panel opens
  useEffect(() => {
    if (open && persona) {
      setMessages([]);
      setOffset(0);
      setHasMore(true);
      loadMessages(0, true);
    }
  }, [open, persona]);

  const loadMessages = useCallback(async (fromOffset, reset) => {
    if (!getSmsMessages) return;
    setLoading(true);
    try {
      const data = await getSmsMessages(persona, PAGE_SIZE, fromOffset);
      if (reset) {
        setMessages(data);
      } else {
        setMessages((prev) => [...prev, ...data]);
      }
      setHasMore(data.length === PAGE_SIZE);
      setOffset(fromOffset + data.length);
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setLoading(false);
    }
  }, [getSmsMessages, persona]);

  const handleLoadMore = () => {
    loadMessages(offset, false);
  };

  return (
    <SlideOverPanel
      open={open}
      onClose={onClose}
      title={personaName}
      subtitle="Message History"
    >
      {messages.length === 0 && !loading ? (
        <EmptyState
          icon="mail"
          title="No messages sent yet"
          description="Toggle this persona on and wait for the next scheduled briefing, or click Send Now."
        />
      ) : (
        <div>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                background: COLORS.white,
                border: `1px solid ${COLORS.borderLight}`,
                borderRadius: RADII.sm,
                padding: 16,
                marginBottom: 12,
              }}
            >
              {/* Top row: date + status dot + trigger badge */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, color: COLORS.textLight }}>
                    {formatDateTime(msg.created_at)}
                  </span>
                  {/* Status dot */}
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: STATUS_DOT[msg.status] || COLORS.textLight,
                      flexShrink: 0,
                    }}
                    title={msg.status}
                  />
                </div>
                {/* Trigger badge */}
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "2px 8px",
                    borderRadius: 100,
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.03em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                    color: msg.trigger_type === "manual" ? COLORS.blue : COLORS.textLight,
                    background: msg.trigger_type === "manual" ? COLORS.blueLight : COLORS.bg,
                  }}
                >
                  {msg.trigger_type === "manual" ? "Manual" : "Scheduled"}
                </span>
              </div>

              {/* Message body */}
              <div
                style={{
                  fontSize: 13,
                  color: COLORS.text,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}
              >
                {msg.message_body}
              </div>
            </div>
          ))}

          {/* Load more */}
          {hasMore && (
            <div style={{ textAlign: "center", paddingTop: 4 }}>
              <button
                onClick={handleLoadMore}
                disabled={loading}
                style={{
                  padding: "8px 20px",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: FONTS.body,
                  background: COLORS.white,
                  color: COLORS.black,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: RADII.sm,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Initial loading */}
      {loading && messages.length === 0 && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <div
            style={{
              width: 28,
              height: 28,
              border: `2px solid ${COLORS.border}`,
              borderTopColor: COLORS.black,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto",
            }}
          />
        </div>
      )}
    </SlideOverPanel>
  );
};

export default SmsHistoryPanel;
