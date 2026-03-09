import React from "react";
import { COLORS, FONTS, RADII } from "../tokens";
import {
  formatContractCurrency,
  formatContractDate,
  getContractStatusBadge,
  getContractUrl,
  isContractStale,
  getDaysSinceSent,
} from "../utils/contractHelpers";
import { formatDate } from "../data/seed";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";

const ContractCard = ({ contract, lead, onSend, onVoid, onFollowUp, onCopyLink, onStagePrompt, toast }) => {
  const badge = getContractStatusBadge(contract.status);
  const stale =
    (contract.status === "sent" || contract.status === "viewed") &&
    isContractStale(contract.sent_at);

  const handleCopyLink = () => {
    const url = getContractUrl(contract.slug);
    navigator.clipboard.writeText(url).then(() => {
      if (toast) toast("Link copied.");
    });
  };

  const handleSend = async () => {
    try {
      await onSend(contract);
    } catch (err) {
      console.error("Send failed:", err);
    }
  };

  const handleResend = async () => {
    try {
      await onSend(contract, true);
    } catch (err) {
      console.error("Resend failed:", err);
    }
  };

  const handleVoid = () => {
    if (window.confirm("Void this contract? This cannot be undone.")) {
      onVoid(contract);
    }
  };

  const handleViewPage = () => {
    window.open(getContractUrl(contract.slug), "_blank");
  };

  const handleDownloadPdf = () => {
    if (contract.pdf_path) {
      const url = `${SUPABASE_URL}/storage/v1/object/public/contract-pdfs/${contract.pdf_path}`;
      window.open(url, "_blank");
    }
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

  return (
    <div
      style={{
        background: COLORS.white,
        border: `1px solid ${COLORS.border}`,
        borderRadius: RADII.lg,
        padding: 20,
        opacity: contract.status === "voided" ? 0.5 : 1,
        borderTop: contract.status === "signed" ? `3px solid ${COLORS.green}` : undefined,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span
          style={{
            fontFamily: FONTS.body,
            fontSize: 14,
            fontWeight: 600,
            color: COLORS.text,
            textDecoration: contract.status === "voided" ? "line-through" : "none",
          }}
        >
          {contract.contract_number}
        </span>
        <span
          style={{
            padding: "3px 10px",
            borderRadius: 100,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.03em",
            textTransform: "uppercase",
            color: COLORS[badge.color],
            background: COLORS[badge.bgColor],
          }}
        >
          {badge.label}
        </span>
      </div>

      {/* Detail row */}
      <div style={{ fontSize: 12.5, color: COLORS.textMuted, marginTop: 8 }}>
        {formatContractCurrency(contract.contract_price)}
        {" \u00B7 "}
        {formatDate(lead?.event_date)}
      </div>

      {/* Stale nudge */}
      {stale && (
        <div
          style={{
            background: COLORS.amberLight,
            padding: "10px 14px",
            borderRadius: RADII.sm,
            marginTop: 10,
          }}
        >
          <div style={{ fontSize: 12, color: COLORS.amber, fontWeight: 600 }}>
            Sent {getDaysSinceSent(contract.sent_at)} days ago
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
            <span
              onClick={() => onFollowUp && onFollowUp(lead)}
              style={{ fontSize: 12, fontWeight: 600, color: COLORS.amber, cursor: "pointer" }}
            >
              Follow Up
            </span>
            <span
              onClick={handleVoid}
              style={{ fontSize: 12, fontWeight: 600, color: COLORS.red, cursor: "pointer" }}
            >
              Void
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      {contract.status !== "voided" && (
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {contract.status === "draft" && (
            <>
              <button
                onClick={handleSend}
                style={{ ...btnBase, background: COLORS.black, color: COLORS.white, border: `1px solid ${COLORS.black}` }}
              >
                Send
              </button>
              <button onClick={handleVoid} style={{ ...btnBase, color: COLORS.red }}>
                Void
              </button>
              <button onClick={handleCopyLink} style={btnBase}>
                Copy Link
              </button>
            </>
          )}

          {contract.status === "sent" && (
            <>
              <button onClick={handleResend} style={btnBase}>
                Resend
              </button>
              <button onClick={handleCopyLink} style={btnBase}>
                Copy Link
              </button>
              <button onClick={handleViewPage} style={btnBase}>
                View Page
              </button>
              <button onClick={handleVoid} style={{ ...btnBase, color: COLORS.red }}>
                Void
              </button>
            </>
          )}

          {contract.status === "viewed" && (
            <>
              <button onClick={handleCopyLink} style={btnBase}>
                Copy Link
              </button>
              <button onClick={handleViewPage} style={btnBase}>
                View Page
              </button>
              <button onClick={handleVoid} style={{ ...btnBase, color: COLORS.red }}>
                Void
              </button>
            </>
          )}

          {contract.status === "signed" && (
            <>
              <button onClick={handleDownloadPdf} style={btnBase}>
                Download PDF
              </button>
              <button onClick={handleViewPage} style={btnBase}>
                View Page
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ContractCard;
