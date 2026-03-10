import React, { useState, useEffect } from "react";
import { COLORS, FONTS, RADII, SHADOWS } from "../tokens";
import { formatInvoiceCurrency, formatInvoiceDate } from "../utils/invoiceHelpers";

const CreateInvoiceModal = ({ lead, onClose, onCreate }) => {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const deposit = Math.round((lead.price || 0) / 2);
  const balance = (lead.price || 0) - deposit;

  // Balance due date: event_date - 14 days
  const balanceDueLabel = (() => {
    if (!lead.event_date) return "TBD";
    const d = new Date(lead.event_date);
    d.setDate(d.getDate() - 14);
    return "Due " + d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  })();

  const stripeConfigured = !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

  const clientName = lead.partner2_first
    ? `${lead.partner1_first} & ${lead.partner2_first}`
    : lead.partner1_first || "Client";

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      await onCreate(lead.id);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create invoices");
    } finally {
      setCreating(false);
    }
  };

  const labelStyle = {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: COLORS.textMuted,
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
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: COLORS.white,
          borderRadius: RADII.lg,
          maxWidth: 520,
          width: "90%",
          padding: 32,
          boxShadow: SHADOWS.lg,
          zIndex: 101,
          animation: "fadeIn 0.15s ease",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontFamily: FONTS.body, fontSize: 16, fontWeight: 600, color: COLORS.text }}>
            Create Invoices
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

        {/* Lead summary */}
        <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 20 }}>
          {clientName} &middot; {formatInvoiceDate(lead.event_date)} &middot; {lead.venue || "No venue"}
        </div>

        {/* Deposit row */}
        <div style={{ marginBottom: 16 }}>
          <div style={labelStyle}>DEPOSIT</div>
          <div style={{ fontSize: 14, color: COLORS.text, marginTop: 4 }}>
            {formatInvoiceCurrency(deposit)} &middot; Due on signing
          </div>
        </div>

        {/* Balance row */}
        <div style={{ marginBottom: 20 }}>
          <div style={labelStyle}>BALANCE</div>
          <div style={{ fontSize: 14, color: COLORS.text, marginTop: 4 }}>
            {formatInvoiceCurrency(balance)} &middot; {balanceDueLabel}
          </div>
        </div>

        {/* Divider + Total */}
        <div style={{ height: 1, background: COLORS.border, marginBottom: 16 }} />
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>Total</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{formatInvoiceCurrency(lead.price)}</span>
        </div>

        {/* Stripe warning */}
        {!stripeConfigured && (
          <div
            style={{
              background: COLORS.amberLight,
              borderLeft: `3px solid ${COLORS.amber}`,
              padding: 12,
              borderRadius: RADII.sm,
              marginBottom: 16,
              fontSize: 12,
              color: COLORS.amber,
            }}
          >
            Stripe is not connected. Invoices will be created without payment links. Connect Stripe in Settings.
          </div>
        )}

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
          Invoices are created as drafts. Use the Send button to share with clients.
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
          disabled={creating}
          style={{
            width: "100%",
            background: COLORS.black,
            color: COLORS.white,
            padding: 12,
            borderRadius: RADII.sm,
            fontSize: 13,
            fontWeight: 600,
            cursor: creating ? "not-allowed" : "pointer",
            fontFamily: FONTS.body,
            border: "none",
            opacity: creating ? 0.5 : 1,
            transition: "opacity 0.15s",
          }}
        >
          {creating ? "Creating..." : "Create Invoices"}
        </button>
      </div>
    </>
  );
};

export default CreateInvoiceModal;
