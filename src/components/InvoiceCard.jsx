import React, { useState } from "react";
import { COLORS, FONTS, RADII } from "../tokens";
import { formatInvoiceCurrency, formatInvoiceDate, getInvoiceStatusBadge } from "../utils/invoiceHelpers";

const InvoiceCard = ({ invoice, depositPaid, onSend, onMarkPaid, onRefresh }) => {
  const [confirming, setConfirming] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const badge = getInvoiceStatusBadge(invoice.status);
  const isBalance = invoice.type === "balance";
  const dimmed = isBalance && !depositPaid && invoice.status !== "paid";

  const handleSend = async () => {
    setActionLoading(true);
    try {
      await onSend(invoice.id);
      onRefresh?.();
    } catch (err) {
      console.error("Send failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    setActionLoading(true);
    try {
      await onMarkPaid(invoice.id);
      onRefresh?.();
    } catch (err) {
      console.error("Mark paid failed:", err);
    } finally {
      setActionLoading(false);
      setConfirming(false);
    }
  };

  const handleViewClientPage = () => {
    const origin = window.location.origin;
    window.open(`${origin}/invoice/${invoice.slug}`, "_blank");
  };

  const btnBase = {
    background: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: RADII.sm,
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: FONTS.body,
    color: COLORS.text,
    transition: "background 0.15s",
  };

  // Paid status — green confirmation bar
  if (invoice.status === "paid") {
    return (
      <div
        style={{
          background: COLORS.white,
          border: `1px solid ${COLORS.border}`,
          borderRadius: RADII.lg,
          padding: 16,
          borderTop: `3px solid ${COLORS.green}`,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: COLORS.text }}>
              {invoice.type}
            </span>
            <span
              style={{
                padding: "3px 10px",
                borderRadius: 100,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.03em",
                textTransform: "uppercase",
                color: badge.color,
                background: badge.bg,
              }}
            >
              {badge.label}
            </span>
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>
            {formatInvoiceCurrency(invoice.amount)}
          </span>
        </div>
        <div style={{ fontSize: 12, color: COLORS.textLight, marginTop: 4 }}>{invoice.invoice_number}</div>
        {invoice.due_label && (
          <div style={{ fontSize: 12, color: COLORS.textLight, marginTop: 2 }}>{invoice.due_label}</div>
        )}
        {/* Paid bar */}
        <div
          style={{
            background: COLORS.greenLight,
            color: COLORS.green,
            padding: "10px 14px",
            borderRadius: RADII.sm,
            marginTop: 12,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Paid via {invoice.payment_method || "card"} on {formatInvoiceDate(invoice.paid_at)}
        </div>
      </div>
    );
  }

  // Refunded status — gray bar
  if (invoice.status === "refunded") {
    return (
      <div
        style={{
          background: COLORS.white,
          border: `1px solid ${COLORS.border}`,
          borderRadius: RADII.lg,
          padding: 16,
          opacity: 0.6,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: COLORS.text }}>
              {invoice.type}
            </span>
            <span
              style={{
                padding: "3px 10px",
                borderRadius: 100,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.03em",
                textTransform: "uppercase",
                color: badge.color,
                background: badge.bg,
              }}
            >
              {badge.label}
            </span>
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>
            {formatInvoiceCurrency(invoice.amount)}
          </span>
        </div>
        <div style={{ fontSize: 12, color: COLORS.textLight, marginTop: 4 }}>{invoice.invoice_number}</div>
        <div
          style={{
            background: COLORS.bg,
            color: COLORS.textMuted,
            padding: "10px 14px",
            borderRadius: RADII.sm,
            marginTop: 12,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Refunded
        </div>
      </div>
    );
  }

  // All other statuses
  return (
    <div
      style={{
        background: COLORS.white,
        border: `1px solid ${COLORS.border}`,
        borderRadius: RADII.lg,
        padding: 16,
        opacity: dimmed ? 0.4 : 1,
        position: "relative",
      }}
      title={dimmed ? "Deposit must be paid first" : undefined}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: COLORS.text }}>
            {invoice.type}
          </span>
          <span
            style={{
              padding: "3px 10px",
              borderRadius: 100,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              color: badge.color,
              background: badge.bg,
            }}
          >
            {badge.label}
          </span>
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>
          {formatInvoiceCurrency(invoice.amount)}
        </span>
      </div>
      <div style={{ fontSize: 12, color: COLORS.textLight, marginTop: 4 }}>{invoice.invoice_number}</div>
      {invoice.due_label && (
        <div style={{ fontSize: 12, color: COLORS.textLight, marginTop: 2 }}>{invoice.due_label}</div>
      )}

      {/* Inline confirmation for Mark as Paid */}
      {confirming && (
        <div
          style={{
            background: COLORS.amberLight,
            padding: "10px 14px",
            borderRadius: RADII.sm,
            marginTop: 12,
            fontSize: 12,
            color: COLORS.amber,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Mark as paid via Zelle? This cannot be undone.</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleMarkPaid}
              disabled={actionLoading}
              style={{ ...btnBase, background: COLORS.black, color: COLORS.white, border: `1px solid ${COLORS.black}`, opacity: actionLoading ? 0.5 : 1 }}
            >
              {actionLoading ? "Saving..." : "Confirm"}
            </button>
            <button onClick={() => setConfirming(false)} style={btnBase}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action buttons (hidden when dimmed or confirming) */}
      {!dimmed && !confirming && (
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {invoice.status === "draft" && (
            <button
              onClick={handleSend}
              disabled={actionLoading}
              style={{ ...btnBase, background: COLORS.black, color: COLORS.white, border: `1px solid ${COLORS.black}`, opacity: actionLoading ? 0.5 : 1 }}
            >
              {actionLoading ? "Sending..." : "Send"}
            </button>
          )}

          {(invoice.status === "sent" || invoice.status === "viewed") && (
            <>
              <button onClick={handleViewClientPage} style={btnBase}>
                View Client Page
              </button>
              <button onClick={handleSend} disabled={actionLoading} style={btnBase}>
                {actionLoading ? "Sending..." : "Resend"}
              </button>
              <button onClick={() => setConfirming(true)} style={btnBase}>
                Mark as Paid (Zelle)
              </button>
            </>
          )}

          {(invoice.status === "failed" || invoice.status === "overdue") && (
            <>
              <button onClick={handleViewClientPage} style={btnBase}>
                View Client Page
              </button>
              <button onClick={handleSend} disabled={actionLoading} style={btnBase}>
                {actionLoading ? "Sending..." : "Resend"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default InvoiceCard;
