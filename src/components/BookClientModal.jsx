import React, { useState, useEffect } from "react";
import { COLORS, FONTS, RADII, SHADOWS } from "../tokens";
import { formatCurrency, formatDate } from "../data/seed";
import Icon from "../icons";

const BookClientModal = ({ lead, onClose, onSuccess, onOpenEmailDrafter, onUploadGceContract, session }) => {
  const [timeOfEngagement, setTimeOfEngagement] = useState("");
  const [mealCount, setMealCount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [gceFile, setGceFile] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  const isGce = lead.payment_routing === "gce";

  // Escape key listener
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const coupleName = `${lead.partner1_first}${lead.partner2_first ? " & " + lead.partner2_first : ""} ${lead.partner1_last}`;

  const depositAmount = Math.round((lead.price || 0) / 2);
  const balanceAmount = (lead.price || 0) - depositAmount;

  // Balance due date: event_date - 14 days
  const balanceDueDate = (() => {
    if (!lead.event_date) return "TBD";
    const d = new Date(lead.event_date);
    d.setDate(d.getDate() - 14);
    return formatDate(d.toISOString().split("T")[0]);
  })();

  const gceCommission = Math.round((lead.price || 0) * 0.2);
  const gceNet = (lead.price || 0) - gceCommission;

  const handleCopy = async (text, field) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // ── Direct flow handler ──
  const handleDirectBook = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/.netlify/functions/book-client", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          lead_id: lead.id,
          payment_routing: "direct",
          time_of_engagement: timeOfEngagement.trim(),
          meal_count: parseInt(mealCount, 10),
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setSuccess(result);
        onSuccess?.();
      } else if (response.status === 207 && result.partial) {
        setSuccess(result);
        setError(result.error);
        onSuccess?.();
      } else {
        setError(result.error || "Booking failed. Please try again.");
      }
    } catch (err) {
      setError(err.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── GCE flow handler ──
  const handleGceBook = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/.netlify/functions/book-client", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          lead_id: lead.id,
          payment_routing: "gce",
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        if (gceFile && onUploadGceContract) {
          try {
            await onUploadGceContract(lead.id, gceFile);
          } catch (uploadErr) {
            console.error("GCE contract upload failed:", uploadErr);
          }
        }
        setSuccess(result);
        onSuccess?.();
      } else {
        setError(result.error || "Booking failed. Please try again.");
      }
    } catch (err) {
      setError(err.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const labelStyle = {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    color: COLORS.textLight,
    letterSpacing: "0.06em",
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

  const ctaStyle = {
    width: "100%",
    padding: "12px 0",
    background: COLORS.black,
    color: COLORS.white,
    border: "none",
    borderRadius: RADII.sm,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: FONTS.body,
    cursor: loading ? "wait" : "pointer",
    marginTop: 20,
    transition: "opacity 0.15s",
  };

  // ════════════════════════════════════════════
  // DIRECT SUCCESS STATE
  // ════════════════════════════════════════════
  if (success && !isGce) {
    return (
      <>
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10,10,9,0.3)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99,
            animation: "fadeIn 0.2s ease",
          }}
        />
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: COLORS.white,
            borderRadius: RADII.lg,
            boxShadow: SHADOWS.lg,
            width: 520,
            maxWidth: "calc(100vw - 48px)",
            maxHeight: "calc(100vh - 48px)",
            overflow: "auto",
            zIndex: 100,
            animation: "fadeUp 0.25s ease",
          }}
        >
          <div style={{ padding: "32px 24px", textAlign: "center" }}>
            {/* Green checkmark circle */}
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: COLORS.greenLight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto",
              }}
            >
              <span style={{ color: COLORS.green, fontSize: 20, fontWeight: 700 }}>✓</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, marginTop: 16, color: COLORS.text }}>
              Contract & Invoice Created
            </div>

            {/* Partial success warning */}
            {success.partial && error && (
              <div
                style={{
                  background: COLORS.amberLight,
                  borderLeft: `3px solid ${COLORS.amber}`,
                  padding: 12,
                  borderRadius: RADII.sm,
                  marginTop: 16,
                  textAlign: "left",
                  fontSize: 12,
                  color: COLORS.amber,
                }}
              >
                {error}
                <br />
                Use the Contracts and Invoices tabs to complete manually.
              </div>
            )}

            {/* Contract URL row */}
            {success.contract_url && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: COLORS.bg,
                  border: `1px solid ${COLORS.borderLight}`,
                  borderRadius: RADII.sm,
                  padding: "10px 14px",
                  marginTop: 16,
                  textAlign: "left",
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ ...labelStyle, marginBottom: 2 }}>CONTRACT</div>
                  <div
                    style={{
                      fontSize: 12,
                      color: COLORS.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {success.contract_url}
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(success.contract_url, "contract")}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: COLORS.black,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: FONTS.body,
                    marginLeft: 12,
                    whiteSpace: "nowrap",
                  }}
                >
                  {copiedField === "contract" ? "Copied!" : "Copy"}
                </button>
              </div>
            )}

            {/* Deposit invoice URL row */}
            {success.deposit_invoice_url && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: COLORS.bg,
                  border: `1px solid ${COLORS.borderLight}`,
                  borderRadius: RADII.sm,
                  padding: "10px 14px",
                  marginTop: 8,
                  textAlign: "left",
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ ...labelStyle, marginBottom: 2 }}>DEPOSIT INVOICE</div>
                  <div
                    style={{
                      fontSize: 12,
                      color: COLORS.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {success.deposit_invoice_url}
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(success.deposit_invoice_url, "invoice")}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: COLORS.black,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: FONTS.body,
                    marginLeft: 12,
                    whiteSpace: "nowrap",
                  }}
                >
                  {copiedField === "invoice" ? "Copied!" : "Copy"}
                </button>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button
                onClick={() => {
                  onClose();
                  onOpenEmailDrafter?.(lead);
                }}
                style={{
                  flex: 1,
                  padding: 10,
                  background: COLORS.white,
                  color: COLORS.black,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: RADII.sm,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: FONTS.body,
                }}
              >
                Open Email Drafter
              </button>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: 10,
                  background: COLORS.bg,
                  color: COLORS.textMuted,
                  border: "none",
                  borderRadius: RADII.sm,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: FONTS.body,
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ════════════════════════════════════════════
  // GCE SUCCESS STATE
  // ════════════════════════════════════════════
  if (success && isGce) {
    return (
      <>
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10,10,9,0.3)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99,
            animation: "fadeIn 0.2s ease",
          }}
        />
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: COLORS.white,
            borderRadius: RADII.lg,
            boxShadow: SHADOWS.lg,
            width: 520,
            maxWidth: "calc(100vw - 48px)",
            maxHeight: "calc(100vh - 48px)",
            overflow: "auto",
            zIndex: 100,
            animation: "fadeUp 0.25s ease",
          }}
        >
          <div style={{ padding: "32px 24px", textAlign: "center" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: COLORS.greenLight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto",
              }}
            >
              <span style={{ color: COLORS.green, fontSize: 20, fontWeight: 700 }}>✓</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, marginTop: 16, color: COLORS.text }}>
              Booking Confirmed
            </div>
            <div style={{ fontSize: 12, color: COLORS.green, marginTop: 8 }}>
              Booking confirmed and band notified
            </div>
            <button
              onClick={onClose}
              style={{
                width: "100%",
                padding: 10,
                background: COLORS.bg,
                color: COLORS.textMuted,
                border: "none",
                borderRadius: RADII.sm,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: FONTS.body,
                marginTop: 20,
              }}
            >
              Close
            </button>
          </div>
        </div>
      </>
    );
  }

  // ════════════════════════════════════════════
  // FORM STATE (both flows)
  // ════════════════════════════════════════════
  const directDisabled = loading || !timeOfEngagement.trim() || !mealCount;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(10,10,9,0.3)",
          backdropFilter: "blur(2px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 99,
          animation: "fadeIn 0.2s ease",
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
          boxShadow: SHADOWS.lg,
          width: 520,
          maxWidth: "calc(100vw - 48px)",
          maxHeight: "calc(100vh - 48px)",
          overflow: "auto",
          zIndex: 100,
          animation: "fadeUp 0.25s ease",
        }}
      >
        {/* Header */}
        <div style={{ padding: "24px 24px 0 24px", position: "relative" }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.text, fontFamily: FONTS.body }}>
            Book Client
          </div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
            {isGce ? "GCE Booking" : "Direct Booking"}
          </div>
          {/* Close X */}
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "none",
              border: "none",
              fontSize: 18,
              color: COLORS.textLight,
              cursor: "pointer",
              borderRadius: RADII.sm,
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = COLORS.text)}
            onMouseLeave={(e) => (e.currentTarget.style.color = COLORS.textLight)}
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24 }}>
          {/* Error banner */}
          {error && !success?.partial && (
            <div
              style={{
                background: COLORS.redLight,
                borderLeft: `3px solid ${COLORS.red}`,
                padding: 12,
                borderRadius: RADII.sm,
                marginBottom: 16,
                fontSize: 12,
                color: COLORS.red,
              }}
            >
              {error}
            </div>
          )}

          {/* ═══════ DIRECT FLOW ═══════ */}
          {!isGce && (
            <>
              {/* Section 1: Contract Details */}
              <div style={{ ...labelStyle, marginBottom: 12 }}>CONTRACT DETAILS</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px", marginBottom: 16 }}>
                <div>
                  <div style={labelStyle}>COUPLE</div>
                  <div style={{ fontSize: 13, color: COLORS.text, marginTop: 2 }}>{coupleName}</div>
                </div>
                <div>
                  <div style={labelStyle}>EVENT DATE</div>
                  <div style={{ fontSize: 13, color: COLORS.text, marginTop: 2 }}>{formatDate(lead.event_date)}</div>
                </div>
                <div>
                  <div style={labelStyle}>VENUE</div>
                  <div style={{ fontSize: 13, color: COLORS.text, marginTop: 2 }}>{lead.venue}</div>
                </div>
                <div>
                  <div style={labelStyle}>CONFIGURATION</div>
                  <div style={{ fontSize: 13, color: COLORS.text, marginTop: 2 }}>{lead.config}</div>
                </div>
                <div>
                  <div style={labelStyle}>PRICE</div>
                  <div style={{ fontSize: 13, color: COLORS.text, marginTop: 2 }}>{formatCurrency(lead.price)}</div>
                </div>
              </div>

              {/* Editable fields */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ ...labelStyle, marginBottom: 6 }}>TIME OF ENGAGEMENT</div>
                <input
                  type="text"
                  placeholder="6:00 PM to 10:00 PM"
                  value={timeOfEngagement}
                  onChange={(e) => setTimeOfEngagement(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: 0 }}>
                <div style={{ ...labelStyle, marginBottom: 6 }}>MEAL COUNT</div>
                <input
                  type="number"
                  placeholder="10"
                  value={mealCount}
                  onChange={(e) => setMealCount(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Section 2: Invoice Summary */}
              <div
                style={{
                  background: COLORS.bg,
                  border: `1px solid ${COLORS.borderLight}`,
                  borderRadius: RADII.sm,
                  padding: 16,
                  marginTop: 16,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: COLORS.text }}>Deposit (50%)</span>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 13, color: COLORS.text, fontWeight: 600 }}>{formatCurrency(depositAmount)}</span>
                    <div style={{ fontSize: 12, color: COLORS.textMuted }}>Due on signing</div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: COLORS.text }}>Balance (50%)</span>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 13, color: COLORS.text, fontWeight: 600 }}>{formatCurrency(balanceAmount)}</span>
                    <div style={{ fontSize: 12, color: COLORS.textMuted }}>Due {balanceDueDate}</div>
                  </div>
                </div>
                <div style={{ height: 1, background: COLORS.borderLight, margin: "8px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>Total</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{formatCurrency(lead.price)}</span>
                </div>
              </div>

              {/* Section 3: What Happens Next */}
              <div style={{ marginTop: 16, fontSize: 12, color: COLORS.textMuted, lineHeight: 1.6 }}>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.textLight, marginRight: 8 }}>1</span>
                  Contract and deposit invoice are created and marked as sent
                </div>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.textLight, marginRight: 8 }}>2</span>
                  Use Email Drafter to send the links to the client
                </div>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.textLight, marginRight: 8 }}>3</span>
                  When the client signs the contract, Sersh gets a text
                </div>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.textLight, marginRight: 8 }}>4</span>
                  When the client pays the deposit, the lead moves to Booked
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={handleDirectBook}
                disabled={directDisabled}
                style={{
                  ...ctaStyle,
                  opacity: directDisabled ? 0.5 : 1,
                }}
              >
                {loading ? "Processing..." : "Create Contract & Invoice"}
              </button>
            </>
          )}

          {/* ═══════ GCE FLOW ═══════ */}
          {isGce && (
            <>
              {/* Section 1: Gig Details */}
              <div style={{ ...labelStyle, marginBottom: 12 }}>GIG DETAILS</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px", marginBottom: 16 }}>
                <div>
                  <div style={labelStyle}>COUPLE</div>
                  <div style={{ fontSize: 13, color: COLORS.text, marginTop: 2 }}>{coupleName}</div>
                </div>
                <div>
                  <div style={labelStyle}>EVENT DATE</div>
                  <div style={{ fontSize: 13, color: COLORS.text, marginTop: 2 }}>{formatDate(lead.event_date)}</div>
                </div>
                <div>
                  <div style={labelStyle}>VENUE</div>
                  <div style={{ fontSize: 13, color: COLORS.text, marginTop: 2 }}>{lead.venue}</div>
                </div>
                <div>
                  <div style={labelStyle}>CONFIGURATION</div>
                  <div style={{ fontSize: 13, color: COLORS.text, marginTop: 2 }}>{lead.config}</div>
                </div>
              </div>

              {/* Section 2: Financial Summary */}
              <div
                style={{
                  background: COLORS.bg,
                  border: `1px solid ${COLORS.borderLight}`,
                  borderRadius: RADII.sm,
                  padding: 16,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: COLORS.text }}>Gross</span>
                  <span style={{ fontSize: 13, color: COLORS.text, fontWeight: 600 }}>{formatCurrency(lead.price)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: COLORS.text }}>GCE Commission (20%)</span>
                  <span style={{ fontSize: 13, color: COLORS.red, fontWeight: 600 }}>-{formatCurrency(gceCommission)}</span>
                </div>
                <div style={{ height: 1, background: COLORS.borderLight, margin: "8px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>Net to Greenway</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.green }}>{formatCurrency(gceNet)}</span>
                </div>
              </div>

              {/* Section 3: GCE Contract upload */}
              <label
                style={{
                  display: "block",
                  border: `2px dashed ${COLORS.borderLight}`,
                  borderRadius: RADII.sm,
                  padding: 24,
                  textAlign: "center",
                  marginTop: 16,
                  cursor: "pointer",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = COLORS.border)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = COLORS.borderLight)}
              >
                {!gceFile ? (
                  <>
                    <Icon type="file" size={24} color={COLORS.textLight} />
                    <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginTop: 8 }}>
                      Upload GCE contract PDF
                    </div>
                    <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>
                      Optional — you can add this later
                    </div>
                  </>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <span style={{ color: COLORS.green, fontSize: 16 }}>✓</span>
                    <span style={{ fontSize: 13, color: COLORS.text }}>{gceFile.name}</span>
                    <span
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setGceFile(null);
                      }}
                      style={{ fontSize: 12, color: COLORS.red, cursor: "pointer" }}
                    >
                      Remove
                    </span>
                  </div>
                )}
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setGceFile(file);
                    e.target.value = "";
                  }}
                />
              </label>

              {/* CTA */}
              <button
                onClick={handleGceBook}
                disabled={loading}
                style={{
                  ...ctaStyle,
                  opacity: loading ? 0.5 : 1,
                }}
              >
                {loading ? "Confirming..." : "Confirm Booking"}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default BookClientModal;
