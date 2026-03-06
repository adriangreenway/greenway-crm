import React, { useState, useEffect, useRef, useCallback } from "react";
import { FONTS } from "../tokens";
import { getLeadName, formatDate } from "../data/seed";

// ── Dark Mode Palette (only component in app with dark UI) ──

const DK = {
  bg: "#0A0A09",
  surface: "#111110",
  surfaceActive: "#1A1A18",
  border: "#2A2A28",
  borderLight: "#1E1E1C",
  cream: "#F5F2ED",
  creamMuted: "#C8C3BC",
  creamDim: "#6B6862",
  accent: "#F5F2ED",
  red: "#E85D5D",
  green: "#4ADE80",
};

// ── Default Cue Template ──

const DEFAULT_CUES = [
  { time: "", event: "Cocktail Hour Music", script: "", song: "Instrumental mix", names: "", notes: "Background level" },
  { time: "", event: "Doors Open / Guests Seated", script: "", song: "", names: "", notes: "" },
  { time: "", event: "Wedding Party Introductions", script: "Ladies and gentlemen, please welcome...", song: "Upbeat intro track", names: "", notes: "Get names from planner" },
  { time: "", event: "Couple Grand Entrance", script: "For the first time as a married couple...", song: "", names: "", notes: "Confirm entrance song with couple" },
  { time: "", event: "First Dance", script: "", song: "", names: "", notes: "Confirm song with couple" },
  { time: "", event: "Parent Dances", script: "", song: "", names: "", notes: "Father/daughter then mother/son" },
  { time: "", event: "Blessing / Toast", script: "", song: "", names: "", notes: "" },
  { time: "", event: "Dinner Service", script: "", song: "Dinner music mix", names: "", notes: "Background level during meal" },
  { time: "", event: "Toasts / Speeches", script: "", song: "", names: "", notes: "Maid of honor, best man" },
  { time: "", event: "Cake Cutting", script: "", song: "", names: "", notes: "" },
  { time: "", event: "Bouquet Toss", script: "", song: "", names: "", notes: "" },
  { time: "", event: "Open Dancing", script: "", song: "", names: "", notes: "" },
  { time: "", event: "Last Dance", script: "", song: "", names: "", notes: "Confirm song" },
  { time: "", event: "Send Off", script: "", song: "", names: "", notes: "" },
];

// ── Build initial cues from lead data ──

const buildInitialCues = (lead) => {
  const saved = lead.cue_sheet_data;
  if (saved && Array.isArray(saved) && saved.length > 0) return saved;

  // If gig_sheet_data has a parsed timeline, use that
  const gsd = lead.gig_sheet_data;
  if (gsd && Array.isArray(gsd.timeline) && gsd.timeline.length > 0) {
    return gsd.timeline.map((t) => ({
      time: t.time || "",
      event: t.event || "",
      script: "",
      song: "",
      names: "",
      notes: t.notes || "",
    }));
  }

  return DEFAULT_CUES.map((c) => ({ ...c }));
};

// ── Inline editable text ──

const InlineEdit = ({ value, onChange, placeholder, style: extraStyle, multiline }) => {
  if (multiline) {
    return (
      <textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={1}
        style={{
          background: "transparent",
          border: "none",
          outline: "none",
          color: DK.cream,
          fontFamily: FONTS.body,
          fontSize: 13,
          padding: "2px 0",
          width: "100%",
          resize: "none",
          ...extraStyle,
        }}
      />
    );
  }
  return (
    <input
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        background: "transparent",
        border: "none",
        outline: "none",
        color: DK.cream,
        fontFamily: FONTS.body,
        fontSize: 13,
        padding: "2px 0",
        width: "100%",
        ...extraStyle,
      }}
    />
  );
};

// ── Cue Row ──

const CueRow = ({ cue, index, isCurrent, isDimmed, onTap, onUpdate, onDelete, onMoveUp, onMoveDown, onAddBelow, confirmingDelete, setConfirmingDelete }) => {
  return (
    <div
      onClick={onTap}
      style={{
        display: "grid",
        gridTemplateColumns: "72px 1fr 40px",
        gap: 0,
        padding: "14px 20px",
        borderBottom: `1px solid ${DK.borderLight}`,
        borderLeft: isCurrent ? `3px solid ${DK.accent}` : "3px solid transparent",
        background: isCurrent ? DK.surfaceActive : "transparent",
        opacity: isDimmed ? 0.35 : 1,
        transition: "all 0.2s ease",
        cursor: "pointer",
        minHeight: 56,
      }}
    >
      {/* Time */}
      <div style={{ paddingRight: 8 }} onClick={(e) => e.stopPropagation()}>
        <InlineEdit
          value={cue.time}
          onChange={(v) => onUpdate("time", v)}
          placeholder="Time"
          style={{ fontSize: 13, fontWeight: 600, color: DK.cream }}
        />
      </div>

      {/* Content */}
      <div style={{ minWidth: 0 }} onClick={(e) => e.stopPropagation()}>
        <InlineEdit
          value={cue.event}
          onChange={(v) => onUpdate("event", v)}
          placeholder="Event name"
          style={{ fontSize: 14, fontWeight: 600, color: DK.cream, marginBottom: 2 }}
        />

        {/* Script */}
        {(cue.script || isCurrent) && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: 11, color: DK.creamDim, flexShrink: 0, marginTop: 3, fontWeight: 600 }}>SAY:</span>
            <InlineEdit
              value={cue.script}
              onChange={(v) => onUpdate("script", v)}
              placeholder="Announcement script..."
              style={{ fontSize: 12.5, color: DK.creamMuted, fontStyle: "italic" }}
            />
          </div>
        )}

        {/* Song */}
        {(cue.song || isCurrent) && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
            <span style={{ fontSize: 13, flexShrink: 0 }}>&#9835;</span>
            <InlineEdit
              value={cue.song}
              onChange={(v) => onUpdate("song", v)}
              placeholder="Song cue..."
              style={{ fontSize: 12.5, color: DK.creamMuted }}
            />
          </div>
        )}

        {/* Names */}
        {(cue.names || isCurrent) && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginTop: 3 }}>
            <span style={{ fontSize: 11, color: DK.creamDim, flexShrink: 0, marginTop: 3, fontWeight: 600 }}>WHO:</span>
            <InlineEdit
              value={cue.names}
              onChange={(v) => onUpdate("names", v)}
              placeholder="Names to announce..."
              style={{ fontSize: 12.5, color: DK.creamMuted }}
            />
          </div>
        )}

        {/* Notes */}
        {(cue.notes || isCurrent) && (
          <div style={{ marginTop: 3 }}>
            <InlineEdit
              value={cue.notes}
              onChange={(v) => onUpdate("notes", v)}
              placeholder="Notes..."
              style={{ fontSize: 12, color: DK.creamDim }}
            />
          </div>
        )}
      </div>

      {/* Actions (only show on current) */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          opacity: isCurrent ? 1 : 0,
          pointerEvents: isCurrent ? "auto" : "none",
          transition: "opacity 0.15s",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <SmallBtn icon="&#9650;" title="Move up" onClick={onMoveUp} />
        <SmallBtn icon="&#9660;" title="Move down" onClick={onMoveDown} />
        <SmallBtn icon="+" title="Add below" onClick={onAddBelow} />
        {confirmingDelete === index ? (
          <SmallBtn icon="&#10005;" title="Confirm delete" onClick={onDelete} style={{ color: DK.red }} />
        ) : (
          <SmallBtn icon="&#8722;" title="Delete" onClick={() => setConfirmingDelete(index)} />
        )}
      </div>
    </div>
  );
};

// Small dark button for cue actions
const SmallBtn = ({ icon, title, onClick, style: extraStyle }) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      width: 24,
      height: 22,
      background: "transparent",
      border: "none",
      color: DK.creamDim,
      fontSize: 12,
      cursor: "pointer",
      fontFamily: FONTS.body,
      padding: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 4,
      transition: "all 0.15s",
      ...extraStyle,
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = DK.border;
      e.currentTarget.style.color = DK.cream;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = "transparent";
      e.currentTarget.style.color = extraStyle?.color || DK.creamDim;
    }}
  >
    {icon}
  </button>
);

// ── Live Clock ──

const LiveClock = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const h = now.getHours();
  const m = now.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  const mm = m < 10 ? `0${m}` : m;

  return (
    <span style={{ fontFamily: FONTS.body, fontSize: 14, color: DK.creamMuted, fontWeight: 500 }}>
      {h12}:{mm} {ampm}
    </span>
  );
};

// ── Main Component ──

const MCCueSheet = ({ lead, onClose, onUpdateLead }) => {
  const [cues, setCues] = useState(() => buildInitialCues(lead));
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [confirmingDelete, setConfirmingDelete] = useState(-1);
  const saveTimerRef = useRef(null);

  // Clear confirming delete on click elsewhere
  useEffect(() => {
    if (confirmingDelete >= 0) {
      const t = setTimeout(() => setConfirmingDelete(-1), 3000);
      return () => clearTimeout(t);
    }
  }, [confirmingDelete]);

  // Escape to close
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Debounced save
  const scheduleSave = useCallback(
    (updatedCues) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        try {
          await onUpdateLead(lead.id, { cue_sheet_data: updatedCues });
        } catch (err) {
          console.error("Auto-save cue sheet failed:", err);
        }
      }, 1000);
    },
    [lead.id, onUpdateLead]
  );

  // Cleanup save timer
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Update a field on a cue
  const updateCue = (index, field, value) => {
    setCues((prev) => {
      const next = prev.map((c, i) => (i === index ? { ...c, [field]: value } : c));
      scheduleSave(next);
      return next;
    });
  };

  // Tap to advance
  const handleTap = (index) => {
    setCurrentIndex(index);
    setConfirmingDelete(-1);
  };

  // Reset
  const handleReset = () => {
    setCurrentIndex(-1);
  };

  // Add cue below
  const addCueBelow = (index) => {
    setCues((prev) => {
      const newCue = { time: "", event: "", script: "", song: "", names: "", notes: "" };
      const next = [...prev.slice(0, index + 1), newCue, ...prev.slice(index + 1)];
      scheduleSave(next);
      return next;
    });
    setCurrentIndex(index + 1);
  };

  // Delete cue
  const deleteCue = (index) => {
    setCues((prev) => {
      const next = prev.filter((_, i) => i !== index);
      scheduleSave(next);
      return next;
    });
    setConfirmingDelete(-1);
    if (currentIndex >= index) {
      setCurrentIndex((prev) => Math.max(-1, prev - 1));
    }
  };

  // Move cue up
  const moveCueUp = (index) => {
    if (index <= 0) return;
    setCues((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      scheduleSave(next);
      return next;
    });
    setCurrentIndex(index - 1);
  };

  // Move cue down
  const moveCueDown = (index) => {
    setCues((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      scheduleSave(next);
      return next;
    });
    setCurrentIndex(index + 1);
  };

  const coupleName = getLeadName(lead);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: DK.bg,
        color: DK.cream,
        fontFamily: FONTS.body,
        display: "flex",
        flexDirection: "column",
        animation: "fadeIn 0.25s ease",
      }}
    >
      {/* ── Header Bar (fixed top) ── */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          borderBottom: `1px solid ${DK.border}`,
          background: DK.surface,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: FONTS.display,
              fontSize: 22,
              fontWeight: 600,
              color: DK.cream,
              letterSpacing: "0.01em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {coupleName}
          </div>
          <div
            style={{
              fontSize: 13,
              color: DK.creamMuted,
              marginTop: 2,
            }}
          >
            {formatDate(lead.event_date)} &middot; {lead.venue || "No venue"}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
          <LiveClock />

          <button
            onClick={handleReset}
            style={{
              padding: "7px 14px",
              background: "transparent",
              color: DK.creamMuted,
              border: `1px solid ${DK.border}`,
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: FONTS.body,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = DK.border;
              e.currentTarget.style.color = DK.cream;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = DK.creamMuted;
            }}
          >
            Reset
          </button>

          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              background: "transparent",
              border: `1px solid ${DK.border}`,
              borderRadius: 8,
              color: DK.creamMuted,
              fontSize: 18,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = DK.border;
              e.currentTarget.style.color = DK.cream;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = DK.creamMuted;
            }}
          >
            &#10005;
          </button>
        </div>
      </div>

      {/* ── Column Headers ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "72px 1fr 40px",
          padding: "8px 20px",
          borderBottom: `1px solid ${DK.border}`,
          background: DK.surface,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 600, color: DK.creamDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Time
        </span>
        <span style={{ fontSize: 10, fontWeight: 600, color: DK.creamDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Cue
        </span>
        <span />
      </div>

      {/* ── Cue List (scrollable) ── */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {cues.map((cue, i) => (
          <CueRow
            key={i}
            cue={cue}
            index={i}
            isCurrent={i === currentIndex}
            isDimmed={currentIndex >= 0 && i < currentIndex}
            onTap={() => handleTap(i)}
            onUpdate={(field, value) => updateCue(i, field, value)}
            onDelete={() => deleteCue(i)}
            onMoveUp={() => moveCueUp(i)}
            onMoveDown={() => moveCueDown(i)}
            onAddBelow={() => addCueBelow(i)}
            confirmingDelete={confirmingDelete}
            setConfirmingDelete={setConfirmingDelete}
          />
        ))}

        {/* Add cue at bottom */}
        <div style={{ padding: "12px 20px" }}>
          <button
            onClick={() => addCueBelow(cues.length - 1)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: `1px dashed ${DK.border}`,
              borderRadius: 8,
              padding: "10px 16px",
              color: DK.creamDim,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: FONTS.body,
              width: "100%",
              justifyContent: "center",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = DK.creamMuted;
              e.currentTarget.style.color = DK.cream;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = DK.border;
              e.currentTarget.style.color = DK.creamDim;
            }}
          >
            + Add Cue
          </button>
        </div>
      </div>

      {/* ── Footer status ── */}
      <div
        style={{
          flexShrink: 0,
          padding: "10px 24px",
          borderTop: `1px solid ${DK.border}`,
          background: DK.surface,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 12, color: DK.creamDim }}>
          {cues.length} cues {currentIndex >= 0 ? `\u00B7 Cue ${currentIndex + 1} of ${cues.length}` : ""}
        </span>
        <span style={{ fontSize: 11, color: DK.creamDim }}>
          Auto saves on edit
        </span>
      </div>
    </div>
  );
};

export default MCCueSheet;
