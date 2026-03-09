import React, { useState, useEffect } from "react";
import { COLORS, FONTS, RADII, SHADOWS } from "../tokens";
import { formatCurrency, formatDate } from "../data/seed";

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: COLORS.textMuted,
  marginBottom: 4,
};

const valueStyle = {
  fontSize: 14,
  color: COLORS.text,
  marginBottom: 16,
};

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

const CreateContractModal = ({ lead, onClose, onCreate }) => {
  const [timeOfEngagement, setTimeOfEngagement] = useState("");
  const [mealCount, setMealCount] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const clientName = lead.partner2_first
    ? `${lead.partner1_first} ${lead.partner1_last} & ${lead.partner2_first} ${lead.partner2_last}`
    : `${lead.partner1_first} ${lead.partner1_last}`;

  const depositAmount = Math.round((lead.price || 0) / 2);
  const isDisabled = !timeOfEngagement.trim() || !mealCount || parseInt(mealCount) < 1;

  const handleCreate = async () => {
    if (isDisabled) return;
    setCreating(true);
    setError(null);
    try {
      await onCreate({
        lead_id: lead.id,
        time_of_engagement: timeOfEngagement.trim(),
        meal_count: parseInt(mealCount),
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create contract");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(10,10,9,0.3)",
          backdropFilter: "blur(2px)",
          zIndex: 100,
          animation: "fadeIn 0.15s ease",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: COLORS.white,
          borderRadius: RADII.lg,
          maxWidth: 480,
          width: "90%",
          padding: 32,
          boxShadow: SHADOWS.lg,
          zIndex: 101,
          animation: "fadeIn 0.15s ease",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <span style={{ fontFamily: FONTS.body, fontSize: 16, fontWeight: 600, color: COLORS.text }}>
            Create Contract
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 18,
              color: COLORS.textMuted,
              cursor: "pointer",
              padding: 4,
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        {/* Read-only fields */}
        <div style={labelStyle}>Client</div>
        <div style={valueStyle}>{clientName}</div>

        <div style={labelStyle}>Event Date</div>
        <div style={valueStyle}>{formatDate(lead.event_date)}</div>

        <div style={labelStyle}>Venue</div>
        <div style={valueStyle}>{lead.venue || "Not set"}</div>

        <div style={labelStyle}>Contract Price</div>
        <div style={valueStyle}>{formatCurrency(lead.price)}</div>

        <div style={labelStyle}>Deposit (50%)</div>
        <div style={valueStyle}>{formatCurrency(depositAmount)}</div>

        <div style={labelStyle}>Band Configuration</div>
        <div style={valueStyle}>{lead.config || "Not set"}</div>

        {/* Editable fields */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Time of Engagement</label>
          <input
            type="text"
            value={timeOfEngagement}
            onChange={(e) => setTimeOfEngagement(e.target.value)}
            placeholder="6:00 PM to 10:00 PM"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Meal Count</label>
          <input
            type="number"
            value={mealCount}
            onChange={(e) => setMealCount(e.target.value)}
            placeholder="10"
            min={1}
            style={inputStyle}
          />
        </div>

        {/* Info bar */}
        <div
          style={{
            background: COLORS.bg,
            padding: "12px 14px",
            borderRadius: RADII.sm,
            fontSize: 12,
            color: COLORS.textMuted,
            marginBottom: 16,
          }}
        >
          Contract price is locked at creation. Changes to lead price will not update existing contracts.
        </div>

        {/* Error */}
        {error && (
          <div style={{ fontSize: 12, color: COLORS.red, marginBottom: 8 }}>
            {error}
          </div>
        )}

        {/* Create button */}
        <button
          onClick={handleCreate}
          disabled={isDisabled || creating}
          style={{
            width: "100%",
            background: COLORS.black,
            color: COLORS.white,
            padding: 12,
            borderRadius: RADII.sm,
            fontSize: 13,
            fontWeight: 600,
            cursor: isDisabled || creating ? "not-allowed" : "pointer",
            fontFamily: FONTS.body,
            border: "none",
            opacity: isDisabled || creating ? 0.4 : 1,
            transition: "opacity 0.15s",
          }}
        >
          {creating ? "Creating..." : "Create Contract"}
        </button>
      </div>
    </>
  );
};

export default CreateContractModal;
