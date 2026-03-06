import React, { useState, useEffect, useMemo } from "react";
import { COLORS, FONTS, RADII } from "../tokens";
import Icon from "../icons";
import SlideOverPanel from "./SlideOverPanel";
import { getLeadName, formatDate, formatCurrency } from "../data/seed";
import { callClaude, getApiKey, hasApiKey, BASE_SYSTEM_PROMPT } from "../utils/claudeApi";

// ── Styles ──

const sectionTitleStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: COLORS.textLight,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 12,
};

const fieldLabelStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: COLORS.textMuted,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: 4,
};

const fieldValueStyle = {
  fontSize: 13.5,
  fontWeight: 500,
  color: COLORS.black,
};

const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  fontSize: 13,
  border: `1px solid ${COLORS.border}`,
  borderRadius: RADII.sm,
  outline: "none",
  fontFamily: FONTS.body,
  color: COLORS.text,
  background: COLORS.bg,
};

const dividerStyle = {
  height: 1,
  background: COLORS.borderLight,
  margin: "20px 0",
};

// ── Info Row ──

const InfoRow = ({ label, value }) => (
  <div style={{ marginBottom: 10 }}>
    <div style={fieldLabelStyle}>{label}</div>
    <div style={fieldValueStyle}>{value || "\u2014"}</div>
  </div>
);

// ── Editable Field ──

const EditableField = ({ label, value, onChange, type = "text", placeholder }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={fieldLabelStyle}>{label}</div>
    <input
      type={type}
      style={inputStyle}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || ""}
    />
  </div>
);

// ── Musician checkbox row ──

const MusicianCheckRow = ({ musician, checked, onToggle }) => (
  <label
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "8px 0",
      cursor: "pointer",
      fontSize: 13,
      color: COLORS.text,
    }}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={onToggle}
      style={{ accentColor: COLORS.green, width: 16, height: 16 }}
    />
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        background: COLORS.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: 11,
        color: COLORS.textMuted,
        flexShrink: 0,
      }}
    >
      {musician.name.charAt(0)}
    </div>
    <span style={{ fontWeight: 500 }}>{musician.name}</span>
    <span style={{ color: COLORS.textMuted, fontSize: 12 }}>{musician.role}</span>
  </label>
);

// ── Assigned musician row ──

const AssignedRow = ({ musician }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "8px 0",
      borderBottom: `1px solid ${COLORS.borderLight}`,
    }}
  >
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        background: COLORS.greenBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: 11,
        color: COLORS.green,
        flexShrink: 0,
      }}
    >
      {musician.name.charAt(0)}
    </div>
    <span style={{ fontSize: 13, fontWeight: 500, color: COLORS.black }}>
      {musician.name}
    </span>
    <span style={{ fontSize: 12, color: COLORS.textMuted }}>{musician.role}</span>
  </div>
);

// ── Timeline row ──

const TimelineRow = ({ item, index }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "80px 1fr",
      gap: 12,
      padding: "8px 0",
      borderBottom: `1px solid ${COLORS.borderLight}`,
    }}
  >
    <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.black }}>
      {item.time}
    </div>
    <div>
      <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.black }}>
        {item.event}
      </div>
      {item.notes && (
        <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
          {item.notes}
        </div>
      )}
    </div>
  </div>
);

// ── Toast ──

const Toast = ({ message, visible, onDone }) => {
  useEffect(() => {
    if (visible) {
      const t = setTimeout(onDone, 2500);
      return () => clearTimeout(t);
    }
  }, [visible, onDone]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 32,
        left: "50%",
        transform: "translateX(-50%)",
        background: COLORS.black,
        color: COLORS.white,
        padding: "10px 24px",
        borderRadius: RADII.pill,
        fontSize: 13,
        fontWeight: 600,
        fontFamily: FONTS.body,
        zIndex: 200,
        animation: "fadeIn 0.2s ease",
        whiteSpace: "nowrap",
      }}
    >
      {message}
    </div>
  );
};

// ── Main Component ──

const GigSheetPanel = ({
  lead,
  onClose,
  onUpdateLead,
  musicians,
  gigAssignments,
  addGigAssignment,
  removeGigAssignment,
  onNavigateToSettings,
  onOpenCueSheet,
}) => {
  // Load saved gig_sheet_data from lead
  const savedData = lead.gig_sheet_data || {};

  const [venueSpecs, setVenueSpecs] = useState({
    address: savedData.address || "",
    load_in_time: savedData.load_in_time || "",
    soundcheck: savedData.soundcheck || "",
    performance_start: savedData.performance_start || "",
    performance_end: savedData.performance_end || "",
    parking: savedData.parking || "",
    power: savedData.power || "",
    stage_dimensions: savedData.stage_dimensions || "",
    meal_time: savedData.meal_time || "",
    venue_notes: savedData.venue_notes || "",
  });

  const [timeline, setTimeline] = useState(savedData.timeline || []);
  const [timelinePaste, setTimelinePaste] = useState("");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  // Get assignments for this lead
  const assignments = gigAssignments.filter((a) => a.lead_id === lead.id);
  const assignedMusicianIds = new Set(assignments.map((a) => a.musician_id));
  const activeMusicians = musicians.filter((m) => m.status === "active");
  const assignedMusicians = activeMusicians.filter((m) => assignedMusicianIds.has(m.id));
  const hasAssignments = assignedMusicians.length > 0;

  // Update venue spec field
  const updateSpec = (key, value) => {
    setVenueSpecs((prev) => ({ ...prev, [key]: value }));
  };

  // Show toast
  const showToast = (msg) => {
    setToastMsg(msg);
    setToastVisible(true);
  };

  // Save all gig sheet data to Supabase
  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        ...venueSpecs,
        timeline,
      };
      await onUpdateLead(lead.id, { gig_sheet_data: data });
      showToast("Gig sheet saved");
    } catch (err) {
      console.error("Save gig sheet failed:", err);
      showToast("Save failed");
    } finally {
      setSaving(false);
    }
  };

  // Toggle musician assignment
  const handleToggleMusician = async (musician) => {
    if (assignedMusicianIds.has(musician.id)) {
      const assignment = assignments.find((a) => a.musician_id === musician.id);
      if (assignment) await removeGigAssignment(assignment.id);
    } else {
      await addGigAssignment({ lead_id: lead.id, musician_id: musician.id });
    }
  };

  // Parse timeline with Claude
  const handleParseTimeline = async () => {
    if (!timelinePaste.trim()) return;

    setParsing(true);
    try {
      const apiKey = getApiKey();
      const systemPrompt = `You are a timeline parser for wedding events. Parse the provided text into a structured timeline. Return ONLY a JSON array of objects with keys: "time", "event", "notes" (notes is optional). Extract times in a consistent short format like "5:00 PM". If no clear time is given for an item, use an empty string. Keep event descriptions concise.`;

      const result = await callClaude({
        systemPrompt,
        userPrompt: `Parse this wedding timeline into structured data:\n\n${timelinePaste}`,
        apiKey,
        maxTokens: 2000,
      });

      // Extract JSON from response
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setTimeline(parsed);
        setTimelinePaste("");
        showToast("Timeline parsed");
      } else {
        showToast("Could not parse timeline");
      }
    } catch (err) {
      console.error("Parse timeline failed:", err);
      showToast(err.message || "Parse failed");
    } finally {
      setParsing(false);
    }
  };

  // Build clipboard text
  const buildClipboardText = () => {
    const name = getLeadName(lead);
    const lines = [];

    lines.push("GIG SHEET");
    lines.push("=".repeat(40));
    lines.push("");

    // Event Details
    lines.push("EVENT DETAILS");
    lines.push("-".repeat(20));
    lines.push(`Couple: ${name}`);
    lines.push(`Date: ${formatDate(lead.event_date)}`);
    lines.push(`Venue: ${lead.venue || "TBD"}`);
    lines.push(`Guests: ${lead.guest_count || "TBD"}`);
    lines.push(`Config: ${lead.config || "TBD"}`);
    lines.push(`Brand: ${lead.brand || "TBD"}`);
    lines.push("");

    // Venue Specs
    lines.push("VENUE SPECS");
    lines.push("-".repeat(20));
    if (venueSpecs.address) lines.push(`Address: ${venueSpecs.address}`);
    if (venueSpecs.load_in_time) lines.push(`Load In: ${venueSpecs.load_in_time}`);
    if (venueSpecs.soundcheck) lines.push(`Soundcheck: ${venueSpecs.soundcheck}`);
    if (venueSpecs.performance_start) lines.push(`Performance Start: ${venueSpecs.performance_start}`);
    if (venueSpecs.performance_end) lines.push(`Performance End: ${venueSpecs.performance_end}`);
    if (venueSpecs.parking) lines.push(`Parking: ${venueSpecs.parking}`);
    if (venueSpecs.power) lines.push(`Power: ${venueSpecs.power}`);
    if (venueSpecs.stage_dimensions) lines.push(`Stage: ${venueSpecs.stage_dimensions}`);
    if (venueSpecs.meal_time) lines.push(`Meal Time: ${venueSpecs.meal_time}`);
    if (venueSpecs.venue_notes) lines.push(`Notes: ${venueSpecs.venue_notes}`);
    lines.push("");

    // Lineup
    if (assignedMusicians.length > 0) {
      lines.push("LINEUP");
      lines.push("-".repeat(20));
      assignedMusicians.forEach((m) => {
        lines.push(`${m.name} - ${m.role}`);
      });
      lines.push("");
    }

    // Timeline
    if (timeline.length > 0) {
      lines.push("TIMELINE");
      lines.push("-".repeat(20));
      timeline.forEach((t) => {
        const line = t.time ? `${t.time}  ${t.event}` : t.event;
        lines.push(line);
        if (t.notes) lines.push(`  ${t.notes}`);
      });
      lines.push("");
    }

    return lines.join("\n");
  };

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildClipboardText());
      showToast("Gig sheet copied");
    } catch {
      showToast("Copy failed");
    }
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  const subtitle = `${lead.venue || "No venue"} \u00B7 ${formatDate(lead.event_date)}`;

  return (
    <>
      <SlideOverPanel
        open
        title={`Gig Sheet: ${getLeadName(lead)}`}
        subtitle={subtitle}
        onClose={onClose}
        width={560}
      >
        {/* ── Event Details ── */}
        <div style={sectionTitleStyle}>Event Details</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
          <InfoRow label="Couple" value={getLeadName(lead)} />
          <InfoRow label="Event Date" value={formatDate(lead.event_date)} />
          <InfoRow label="Venue" value={lead.venue} />
          <InfoRow label="Guest Count" value={lead.guest_count} />
          <InfoRow label="Configuration" value={lead.config} />
          <InfoRow label="Brand" value={lead.brand} />
          <InfoRow label="Price" value={formatCurrency(lead.price)} />
          <InfoRow label="Planner" value={lead.planner_name} />
        </div>

        <div style={dividerStyle} />

        {/* ── Venue Specs ── */}
        <div style={sectionTitleStyle}>Venue Specs</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
          <EditableField
            label="Address"
            value={venueSpecs.address}
            onChange={(v) => updateSpec("address", v)}
          />
          <EditableField
            label="Load In Time"
            value={venueSpecs.load_in_time}
            onChange={(v) => updateSpec("load_in_time", v)}
            placeholder="e.g. 3:00 PM"
          />
          <EditableField
            label="Soundcheck"
            value={venueSpecs.soundcheck}
            onChange={(v) => updateSpec("soundcheck", v)}
            placeholder="e.g. 4:00 PM"
          />
          <EditableField
            label="Performance Start"
            value={venueSpecs.performance_start}
            onChange={(v) => updateSpec("performance_start", v)}
            placeholder="e.g. 7:00 PM"
          />
          <EditableField
            label="Performance End"
            value={venueSpecs.performance_end}
            onChange={(v) => updateSpec("performance_end", v)}
            placeholder="e.g. 11:00 PM"
          />
          <EditableField
            label="Parking"
            value={venueSpecs.parking}
            onChange={(v) => updateSpec("parking", v)}
            placeholder="Parking instructions"
          />
          <EditableField
            label="Power"
            value={venueSpecs.power}
            onChange={(v) => updateSpec("power", v)}
            placeholder="Power access details"
          />
          <EditableField
            label="Stage Dimensions"
            value={venueSpecs.stage_dimensions}
            onChange={(v) => updateSpec("stage_dimensions", v)}
            placeholder='e.g. 20x16 ft'
          />
          <EditableField
            label="Meal Time"
            value={venueSpecs.meal_time}
            onChange={(v) => updateSpec("meal_time", v)}
            placeholder="e.g. 6:30 PM"
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={fieldLabelStyle}>Venue Notes</div>
          <textarea
            style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
            value={venueSpecs.venue_notes || ""}
            onChange={(e) => updateSpec("venue_notes", e.target.value)}
            placeholder="Any additional venue details..."
          />
        </div>

        {/* Save venue specs */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            width: "100%",
            padding: "10px 16px",
            background: COLORS.black,
            color: COLORS.white,
            border: "none",
            borderRadius: RADII.md,
            fontSize: 13,
            fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer",
            fontFamily: FONTS.body,
            opacity: saving ? 0.7 : 1,
            marginBottom: 4,
          }}
        >
          <Icon type="check" size={14} color={COLORS.white} />
          {saving ? "Saving..." : "Save Gig Sheet"}
        </button>

        <div style={dividerStyle} />

        {/* ── Lineup ── */}
        <div style={sectionTitleStyle}>Lineup</div>
        {hasAssignments ? (
          <div style={{ marginBottom: 8 }}>
            {assignedMusicians.map((m) => (
              <AssignedRow key={m.id} musician={m} />
            ))}
          </div>
        ) : (
          <div
            style={{
              fontSize: 13,
              color: COLORS.textMuted,
              marginBottom: 8,
              padding: "8px 0",
            }}
          >
            No musicians assigned. Select from the roster below:
          </div>
        )}

        {/* Always show roster checkboxes so user can add/remove */}
        <div
          style={{
            background: COLORS.bg,
            borderRadius: RADII.md,
            padding: "8px 12px",
            marginBottom: 4,
          }}
        >
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
            Musician Roster
          </div>
          {activeMusicians.map((m) => (
            <MusicianCheckRow
              key={m.id}
              musician={m}
              checked={assignedMusicianIds.has(m.id)}
              onToggle={() => handleToggleMusician(m)}
            />
          ))}
          {activeMusicians.length === 0 && (
            <div style={{ fontSize: 13, color: COLORS.textMuted, padding: "8px 0" }}>
              No active musicians in roster.
            </div>
          )}
        </div>

        <div style={dividerStyle} />

        {/* ── Planner Timeline ── */}
        <div style={sectionTitleStyle}>Planner Timeline</div>

        {timeline.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {timeline.map((item, i) => (
              <TimelineRow key={i} item={item} index={i} />
            ))}
            <button
              onClick={() => setTimeline([])}
              style={{
                marginTop: 8,
                background: "none",
                border: "none",
                fontSize: 12,
                color: COLORS.red,
                cursor: "pointer",
                fontFamily: FONTS.body,
                fontWeight: 600,
                padding: 0,
              }}
            >
              Clear Timeline
            </button>
          </div>
        )}

        <textarea
          style={{
            ...inputStyle,
            minHeight: 100,
            resize: "vertical",
            marginBottom: 8,
          }}
          value={timelinePaste}
          onChange={(e) => setTimelinePaste(e.target.value)}
          placeholder="Paste the planner's timeline here..."
        />

        {hasApiKey() ? (
          <button
            onClick={handleParseTimeline}
            disabled={parsing || !timelinePaste.trim()}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              width: "100%",
              padding: "10px 16px",
              background: COLORS.purpleLight,
              color: COLORS.purple,
              border: `1px solid ${COLORS.purple}`,
              borderRadius: RADII.md,
              fontSize: 13,
              fontWeight: 600,
              cursor: parsing || !timelinePaste.trim() ? "not-allowed" : "pointer",
              fontFamily: FONTS.body,
              opacity: parsing || !timelinePaste.trim() ? 0.6 : 1,
              marginBottom: 4,
            }}
            onMouseEnter={(e) => {
              if (!parsing && timelinePaste.trim()) {
                e.currentTarget.style.background = COLORS.purple;
                e.currentTarget.style.color = COLORS.white;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = COLORS.purpleLight;
              e.currentTarget.style.color = COLORS.purple;
            }}
          >
            <Icon type="ai" size={14} color="currentColor" />
            {parsing ? "Parsing..." : "Parse Timeline"}
          </button>
        ) : (
          <div
            style={{
              fontSize: 12,
              color: COLORS.amber,
              background: COLORS.amberLight,
              borderRadius: RADII.sm,
              padding: "10px 12px",
              marginBottom: 4,
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
                color: COLORS.amber,
                textDecoration: "underline",
                cursor: "pointer",
                fontFamily: FONTS.body,
                fontSize: 12,
                fontWeight: 600,
                padding: 0,
              }}
            >
              Settings
            </button>{" "}
            to parse timelines with AI.
          </div>
        )}

        <div style={dividerStyle} />

        {/* ── Open MC Cue Sheet ── */}
        {onOpenCueSheet && (
          <button
            onClick={() => onOpenCueSheet(lead)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              width: "100%",
              padding: "11px 16px",
              background: COLORS.black,
              color: COLORS.cream,
              border: "none",
              borderRadius: RADII.md,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: FONTS.body,
              marginBottom: 12,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.85";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            <Icon type="clipboard" size={14} color={COLORS.cream} />
            Open MC Cue Sheet
          </button>
        )}

        {/* ── Actions ── */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleCopy}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "11px 16px",
              background: COLORS.white,
              color: COLORS.black,
              border: `1px solid ${COLORS.border}`,
              borderRadius: RADII.md,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: FONTS.body,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = COLORS.black;
              e.currentTarget.style.color = COLORS.white;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = COLORS.white;
              e.currentTarget.style.color = COLORS.black;
            }}
          >
            <Icon type="copy" size={14} color="currentColor" />
            Copy Gig Sheet
          </button>
          <button
            onClick={handlePrint}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "11px 16px",
              background: COLORS.white,
              color: COLORS.black,
              border: `1px solid ${COLORS.border}`,
              borderRadius: RADII.md,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: FONTS.body,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = COLORS.black;
              e.currentTarget.style.color = COLORS.white;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = COLORS.white;
              e.currentTarget.style.color = COLORS.black;
            }}
          >
            <Icon type="file" size={14} color="currentColor" />
            Print
          </button>
        </div>
      </SlideOverPanel>

      <Toast
        message={toastMsg}
        visible={toastVisible}
        onDone={() => setToastVisible(false)}
      />
    </>
  );
};

export default GigSheetPanel;
