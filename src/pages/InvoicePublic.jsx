import React, { useState, useEffect, useRef } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getStripe } from "../utils/stripeClient";
import { calculateFees, formatInvoiceCurrency, formatInvoiceDate } from "../utils/invoiceHelpers";

// ── Stripe appearance (dark theme matching design system) ──
const STRIPE_APPEARANCE = {
  theme: 'night',
  variables: {
    colorPrimary: '#F5F2ED',
    colorBackground: '#1A1A18',
    colorText: '#F5F2ED',
    colorDanger: '#C87B7B',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    borderRadius: '4px',
  },
};

// ── Injected CSS ──
const INVOICE_CSS = `
  .gw-invoice * { margin: 0; padding: 0; box-sizing: border-box; }

  .gw-invoice {
    --black: #0A0A09;
    --charcoal: #111110;
    --charcoal-mid: #1A1A18;
    --cream: #F5F2ED;
    --cream-muted: #D4D0C8;
    --cream-dim: #8A867E;
    --cream-faint: #5A5750;
    --border: rgba(245,242,237,0.08);
    --border-light: rgba(245,242,237,0.12);
    --green-bg: #1A2E22;
    --green-text: #7BC89C;
    --green-border: rgba(123,200,156,0.15);
    --red-bg: #2E1A1A;
    --red-text: #C87B7B;
    --red-border: rgba(200,123,123,0.15);
    font-family: 'Plus Jakarta Sans', sans-serif;
    background: var(--black);
    color: var(--cream);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: hidden;
    min-height: 100vh;
  }

  /* Reveal system */
  .gw-invoice .reveal {
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.8s ease, transform 0.8s ease;
  }
  .gw-invoice .reveal.visible {
    opacity: 1;
    transform: translateY(0);
  }
  .gw-invoice .reveal-delay-1 { transition-delay: 0.1s; }
  .gw-invoice .reveal-delay-2 { transition-delay: 0.2s; }
  .gw-invoice .reveal-delay-3 { transition-delay: 0.3s; }
  .gw-invoice .reveal-delay-4 { transition-delay: 0.4s; }
  .gw-invoice .reveal-delay-5 { transition-delay: 0.5s; }

  /* Section content wrapper */
  .gw-invoice .section-content {
    max-width: 680px;
    margin: 0 auto;
    padding: 0 40px;
  }

  /* Section divider */
  .gw-invoice .section-divider {
    width: 100%;
    height: 1px;
    background: var(--border-light);
  }

  /* Section label */
  .gw-invoice .section-label {
    font-size: 9px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--cream-faint);
    margin-bottom: 32px;
  }

  /* ── Header (compact) ── */
  .gw-invoice .invoice-header {
    padding: 80px 40px 60px;
    text-align: center;
  }
  .gw-invoice .cover-rule {
    width: 60px;
    height: 0.5px;
    background: var(--cream-dim);
    margin: 0 auto;
  }
  .gw-invoice .cover-the {
    font-family: 'Bodoni Moda', serif;
    font-size: 12px;
    letter-spacing: 10px;
    text-transform: uppercase;
    color: var(--cream-dim);
    margin-top: 40px;
    text-indent: 10px;
  }
  .gw-invoice .cover-name {
    font-family: 'Bodoni Moda', serif;
    font-size: clamp(28px, 8vw, 42px);
    letter-spacing: 5px;
    text-transform: uppercase;
    color: var(--cream);
    margin: 4px 0;
    font-weight: 400;
    text-indent: 5px;
  }
  .gw-invoice .cover-band {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 11px;
    letter-spacing: 14px;
    text-transform: uppercase;
    color: var(--cream-dim);
    font-weight: 400;
    text-indent: 14px;
  }
  .gw-invoice .invoice-type-label {
    font-size: 9px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--cream-faint);
    margin-top: 24px;
  }

  /* ── Details ── */
  .gw-invoice .details-section { padding: 80px 0; }
  .gw-invoice .details-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    border: 0.5px solid var(--border-light);
    border-radius: 2px;
  }
  .gw-invoice .detail-cell {
    padding: 28px 32px;
    border-bottom: 0.5px solid var(--border);
    border-right: 0.5px solid var(--border);
  }
  .gw-invoice .detail-cell:nth-child(even) { border-right: none; }
  .gw-invoice .detail-cell:nth-last-child(-n+2) { border-bottom: none; }
  .gw-invoice .detail-label {
    font-size: 9px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--cream-faint);
    margin-bottom: 8px;
  }
  .gw-invoice .detail-value {
    font-family: 'Bodoni Moda', serif;
    font-size: 16px;
    color: var(--cream);
    font-weight: 400;
  }
  .gw-invoice .detail-value-amount {
    font-family: 'Bodoni Moda', serif;
    font-size: clamp(22px, 4vw, 28px);
    color: var(--cream);
    font-weight: 400;
  }
  .gw-invoice .due-label {
    margin-top: 20px;
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--cream-dim);
  }

  /* ── Payment section ── */
  .gw-invoice .payment-section { padding: 80px 0; }
  .gw-invoice .method-cards { margin-bottom: 32px; }
  .gw-invoice .method-card {
    background: var(--charcoal);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 16px;
    cursor: pointer;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 8px;
    transition: background 0.2s ease, border-color 0.2s ease;
  }
  .gw-invoice .method-card.selected {
    background: var(--charcoal-mid);
    border-color: var(--cream-faint);
  }
  .gw-invoice .method-indicator {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1px solid var(--cream-faint);
    flex-shrink: 0;
    margin-top: 1px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .gw-invoice .method-card.selected .method-indicator {
    border-color: var(--cream);
  }
  .gw-invoice .method-indicator-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--cream);
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  .gw-invoice .method-card.selected .method-indicator-dot {
    opacity: 1;
  }
  .gw-invoice .method-info { flex: 1; }
  .gw-invoice .method-label {
    font-size: 14px;
    color: var(--cream);
    letter-spacing: 0.5px;
  }
  .gw-invoice .method-savings {
    font-size: 12px;
    color: var(--green-text);
    margin-top: 4px;
  }

  /* Stripe container */
  .gw-invoice .stripe-container { margin-top: 24px; }

  /* Pay button */
  .gw-invoice .pay-button {
    width: 100%;
    background: var(--cream);
    color: var(--black);
    border: none;
    padding: 16px;
    border-radius: 4px;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 1px;
    cursor: pointer;
    margin-top: 24px;
    transition: opacity 0.2s ease;
  }

  /* Zelle area */
  .gw-invoice .zelle-area { margin-top: 24px; }
  .gw-invoice .zelle-info-card {
    background: var(--charcoal);
    border-radius: 4px;
    padding: 24px;
  }
  .gw-invoice .zelle-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 12px 0;
    border-bottom: 0.5px solid var(--border);
  }
  .gw-invoice .zelle-row:last-child { border-bottom: none; }
  .gw-invoice .zelle-row-label {
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--cream-faint);
  }
  .gw-invoice .zelle-row-value {
    font-size: 14px;
    color: var(--cream);
  }
  .gw-invoice .zelle-button {
    width: 100%;
    background: transparent;
    color: var(--cream);
    border: 1px solid var(--cream);
    padding: 16px;
    border-radius: 4px;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 1px;
    cursor: pointer;
    margin-top: 24px;
    transition: opacity 0.2s ease;
  }
  .gw-invoice .zelle-confirmed {
    margin-top: 16px;
    padding: 16px;
    background: var(--green-bg);
    border: 1px solid var(--green-border);
    border-radius: 4px;
    text-align: center;
    font-size: 13px;
    color: var(--green-text);
    line-height: 1.6;
  }

  /* ── Processing ── */
  @keyframes gw-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  .gw-invoice .processing-state {
    padding: 120px 0;
    text-align: center;
  }
  .gw-invoice .spinner {
    width: 32px;
    height: 32px;
    border: 2px solid var(--border-light);
    border-top-color: var(--cream);
    border-radius: 50%;
    animation: gw-spin 0.8s linear infinite;
    margin: 0 auto 24px;
  }
  .gw-invoice .processing-text {
    font-family: 'Bodoni Moda', serif;
    font-size: 18px;
    color: var(--cream);
    margin-bottom: 8px;
  }
  .gw-invoice .processing-subtext {
    font-size: 12px;
    color: var(--cream-dim);
    letter-spacing: 2px;
  }

  /* ── Success ── */
  .gw-invoice .success-section { padding: 80px 0; }
  .gw-invoice .success-card {
    background: var(--green-bg);
    border: 1px solid var(--green-border);
    border-radius: 4px;
    padding: 40px;
    text-align: center;
  }
  .gw-invoice .success-icon {
    width: 48px;
    height: 48px;
    margin: 0 auto 20px;
    display: block;
  }
  .gw-invoice .success-icon circle,
  .gw-invoice .success-icon path {
    fill: none;
    stroke: var(--green-text);
  }
  .gw-invoice .success-label {
    font-size: 9px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--green-text);
    margin-bottom: 12px;
  }
  .gw-invoice .success-amount {
    font-family: 'Bodoni Moda', serif;
    font-size: 32px;
    color: var(--cream);
    font-weight: 400;
  }
  .gw-invoice .success-details {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    border: 0.5px solid var(--border-light);
    border-radius: 2px;
    margin-top: 32px;
  }

  /* ── Failed ── */
  .gw-invoice .failed-section { padding: 80px 0; }
  .gw-invoice .failed-card {
    background: var(--red-bg);
    border: 1px solid var(--red-border);
    border-radius: 4px;
    padding: 40px;
    text-align: center;
  }
  .gw-invoice .failed-icon {
    width: 48px;
    height: 48px;
    margin: 0 auto 20px;
    display: block;
  }
  .gw-invoice .failed-icon circle,
  .gw-invoice .failed-icon path {
    fill: none;
    stroke: var(--red-text);
  }
  .gw-invoice .failed-label {
    font-size: 9px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--red-text);
    margin-bottom: 12px;
  }
  .gw-invoice .failed-message {
    font-size: 14px;
    color: var(--cream-muted);
    line-height: 1.6;
    margin-bottom: 24px;
  }
  .gw-invoice .retry-button {
    background: var(--cream);
    color: var(--black);
    border: none;
    padding: 12px 32px;
    border-radius: 4px;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 1px;
    cursor: pointer;
    margin-bottom: 24px;
  }
  .gw-invoice .failed-contact {
    font-size: 12px;
    color: var(--cream-dim);
    letter-spacing: 2px;
    line-height: 2.2;
  }

  /* ── Footer ── */
  .gw-invoice .invoice-footer {
    padding: 80px 40px 60px;
    text-align: center;
  }
  .gw-invoice .footer-contact {
    margin-bottom: 32px;
  }
  .gw-invoice .footer-contact p {
    font-size: 12px;
    color: var(--cream-dim);
    letter-spacing: 2px;
    line-height: 2.2;
  }
  .gw-invoice .logo-the {
    font-family: 'Bodoni Moda', serif;
    font-size: 10px;
    letter-spacing: 8px;
    text-transform: uppercase;
    color: var(--cream-faint);
    text-indent: 8px;
  }
  .gw-invoice .logo-name {
    font-family: 'Bodoni Moda', serif;
    font-size: 24px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--cream);
    margin: 2px 0;
    font-weight: 400;
    text-indent: 4px;
  }
  .gw-invoice .logo-band {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 8px;
    letter-spacing: 12px;
    text-transform: uppercase;
    color: var(--cream-faint);
    text-indent: 12px;
  }

  /* ── Error page ── */
  .gw-invoice .error-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 60px 32px;
  }
  .gw-invoice .error-brand { margin-bottom: 60px; }
  .gw-invoice .error-message {
    font-family: 'Bodoni Moda', serif;
    font-style: italic;
    font-size: clamp(22px, 5vw, 26px);
    color: var(--cream);
    line-height: 1.5;
    max-width: 400px;
    margin-bottom: 56px;
  }
  .gw-invoice .error-rule {
    width: 40px;
    height: 0.5px;
    background: var(--cream-dim);
    margin: 0 auto 40px;
  }
  .gw-invoice .error-contact p {
    font-size: 12px;
    color: var(--cream-dim);
    letter-spacing: 2px;
    line-height: 2.2;
  }

  /* Links */
  .gw-invoice a { color: var(--cream-muted); text-decoration: none; }
  .gw-invoice a:hover { color: var(--cream); }

  /* Responsive */
  @media (max-width: 640px) {
    .gw-invoice .section-content { padding: 0 24px !important; }
    .gw-invoice .invoice-header { padding: 60px 24px 48px !important; }
    .gw-invoice .details-grid { grid-template-columns: 1fr !important; }
    .gw-invoice .detail-cell { border-right: none !important; }
    .gw-invoice .detail-cell:nth-last-child(-n+2) { border-bottom: 0.5px solid var(--border) !important; }
    .gw-invoice .detail-cell:last-child { border-bottom: none !important; }
    .gw-invoice .success-details { grid-template-columns: 1fr !important; }
    .gw-invoice .success-details .detail-cell { border-right: none !important; }
    .gw-invoice .success-details .detail-cell:nth-last-child(-n+2) { border-bottom: 0.5px solid var(--border) !important; }
    .gw-invoice .success-details .detail-cell:last-child { border-bottom: none !important; }
    .gw-invoice .invoice-footer { padding: 60px 24px 48px !important; }
  }
`;

// ── Format method label for display ──
const formatMethodLabel = (method) => {
  const map = { card: "Card", ach: "Bank Transfer", zelle: "Zelle" };
  return map[method] || "Payment";
};

// ── Checkout form (inside Elements provider, needs Stripe hooks) ──
const CheckoutForm = ({ amount, onProcessing, onSuccess, onFailed }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [ready, setReady] = useState(false);

  const handlePay = async () => {
    if (!stripe || !elements) return;
    onProcessing();

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });

      if (error) {
        onFailed(error.message || "Your payment could not be processed");
      } else if (paymentIntent?.status === "succeeded") {
        const method = paymentIntent.payment_method_types?.includes("us_bank_account")
          ? "Bank Transfer"
          : "Card";
        onSuccess({
          method,
          amount,
          date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        });
      } else {
        // Processing (e.g., ACH confirmation pending)
        onSuccess({
          method: "Bank Transfer",
          amount,
          date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        });
      }
    } catch (err) {
      onFailed(err.message || "Something went wrong");
    }
  };

  return (
    <div className="stripe-container">
      <PaymentElement onReady={() => setReady(true)} />
      <button
        className="pay-button"
        onClick={handlePay}
        disabled={!stripe || !elements || !ready}
        style={{ opacity: (!stripe || !elements || !ready) ? 0.3 : 1 }}
      >
        Pay {formatInvoiceCurrency(amount)}
      </button>
    </div>
  );
};

// ── InvoicePublic ──
const InvoicePublic = ({ slug }) => {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [pageState, setPageState] = useState("form");
  const [failedMessage, setFailedMessage] = useState("");
  const [zelleConfirmed, setZelleConfirmed] = useState(false);
  const [successDetails, setSuccessDetails] = useState(null);
  const containerRef = useRef(null);
  const observerRef = useRef(null);

  // Fetch invoice data
  useEffect(() => {
    if (!slug) {
      setError(true);
      setLoading(false);
      return;
    }
    fetch(`/.netlify/functions/invoice-data?slug=${encodeURIComponent(slug)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setInvoice(data);
          document.title = `The Greenway Band \u2014 Invoice ${data.invoice_number || ""}`;
          if (data.status === "paid") {
            setPageState("success");
            setSuccessDetails({
              method: formatMethodLabel(data.payment_method),
              amount: data.amount,
              date: formatInvoiceDate(data.paid_at),
              invoiceNumber: data.invoice_number,
            });
          }
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  // Inject CSS
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = INVOICE_CSS;
    document.head.appendChild(style);

    const prevBg = document.body.style.background;
    const prevOverflow = document.body.style.overflowX;
    document.body.style.background = "#0A0A09";
    document.body.style.overflowX = "hidden";

    return () => {
      document.head.removeChild(style);
      document.body.style.background = prevBg;
      document.body.style.overflowX = prevOverflow;
    };
  }, []);

  // Intersection Observer for reveals (header renders immediately)
  useEffect(() => {
    if (loading || error) return;

    const container = containerRef.current;
    if (!container) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    container.querySelectorAll(".reveal").forEach((el) => {
      if (!el.closest(".invoice-header")) {
        observerRef.current.observe(el);
      }
    });

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [loading, error, invoice, pageState]);

  // ── Loading: solid dark screen ──
  if (loading) {
    return <div className="gw-invoice" />;
  }

  // ── 404: branded error page ──
  if (error || !invoice) {
    return (
      <div className="gw-invoice">
        <div className="error-page">
          <div className="error-brand">
            <div className="cover-rule" />
            <div className="cover-the">THE</div>
            <div className="cover-name">GREENWAY</div>
            <div className="cover-band">BAND</div>
            <div className="cover-rule" style={{ marginTop: 16 }} />
          </div>
          <div className="error-message">
            This invoice is no longer available
          </div>
          <div className="error-rule" />
          <div className="error-contact">
            <p>Adrian Michael</p>
            <p><a href="mailto:adrian@greenwayband.com">adrian@greenwayband.com</a></p>
            <p>(281) 467 1226</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Data extraction ──
  const fees = invoice.fees || calculateFees(invoice.amount);
  const coupleNames = invoice.partner2_first
    ? `${invoice.partner1_first} & ${invoice.partner2_first}`
    : invoice.partner1_first;
  const eventDate = formatInvoiceDate(invoice.event_date);
  const dueText = invoice.due_label || (invoice.due_date ? `Due ${formatInvoiceDate(invoice.due_date)}` : "");

  // Handlers
  const handleProcessing = () => setPageState("processing");
  const handleSuccess = (details) => {
    setSuccessDetails({ ...details, invoiceNumber: invoice.invoice_number });
    setPageState("success");
  };
  const handleFailed = (message) => {
    setFailedMessage(message);
    setPageState("failed");
  };
  const handleRetry = () => {
    setFailedMessage("");
    setPageState("form");
  };

  return (
    <div className="gw-invoice" ref={containerRef}>

      {/* ═══ HEADER ═══ */}
      <header className="invoice-header">
        <div className="cover-rule" />
        <div className="cover-the">THE</div>
        <div className="cover-name">GREENWAY</div>
        <div className="cover-band">BAND</div>
        <div className="cover-rule" style={{ marginTop: 16 }} />
        <div className="invoice-type-label">INVOICE</div>
      </header>

      <div className="section-divider" />

      {/* ═══ INVOICE DETAILS ═══ */}
      <section className="details-section">
        <div className="section-content">
          <div className="section-label reveal">Invoice details</div>

          <div className="details-grid reveal reveal-delay-1">
            <div className="detail-cell">
              <div className="detail-label">Couple</div>
              <div className="detail-value">{coupleNames}</div>
            </div>
            <div className="detail-cell">
              <div className="detail-label">Date</div>
              <div className="detail-value">{eventDate}</div>
            </div>
            <div className="detail-cell">
              <div className="detail-label">Venue</div>
              <div className="detail-value">{invoice.venue}</div>
            </div>
            <div className="detail-cell">
              <div className="detail-label">Amount</div>
              <div className="detail-value-amount">{formatInvoiceCurrency(invoice.amount)}</div>
            </div>
          </div>

          {dueText && (
            <div className="due-label reveal reveal-delay-2">{dueText}</div>
          )}
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══ PAYMENT FORM ═══ */}
      {pageState === "form" && (
        <section className="payment-section">
          <div className="section-content">
            <div className="section-label reveal">Payment</div>

            {/* Method selection cards */}
            <div className="method-cards reveal reveal-delay-1">
              <div
                className={`method-card${paymentMethod === "card" ? " selected" : ""}`}
                onClick={() => setPaymentMethod("card")}
              >
                <div className="method-indicator">
                  <div className="method-indicator-dot" />
                </div>
                <div className="method-info">
                  <div className="method-label">Credit or Debit Card</div>
                </div>
              </div>

              <div
                className={`method-card${paymentMethod === "ach" ? " selected" : ""}`}
                onClick={() => setPaymentMethod("ach")}
              >
                <div className="method-indicator">
                  <div className="method-indicator-dot" />
                </div>
                <div className="method-info">
                  <div className="method-label">Bank Transfer (ACH)</div>
                  {fees.ach.savings > 0 && (
                    <div className="method-savings">Save {formatInvoiceCurrency(Math.round(fees.ach.savings))}</div>
                  )}
                </div>
              </div>

              <div
                className={`method-card${paymentMethod === "zelle" ? " selected" : ""}`}
                onClick={() => setPaymentMethod("zelle")}
              >
                <div className="method-indicator">
                  <div className="method-indicator-dot" />
                </div>
                <div className="method-info">
                  <div className="method-label">Zelle</div>
                  {fees.zelle.savings > 0 && (
                    <div className="method-savings">Save {formatInvoiceCurrency(Math.round(fees.zelle.savings))}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Stripe payment area (card or ACH) */}
            {paymentMethod !== "zelle" && invoice.stripe_client_secret && (
              <div className="reveal reveal-delay-2">
                <Elements
                  stripe={getStripe()}
                  options={{ clientSecret: invoice.stripe_client_secret, appearance: STRIPE_APPEARANCE }}
                >
                  <CheckoutForm
                    amount={invoice.amount}
                    onProcessing={handleProcessing}
                    onSuccess={handleSuccess}
                    onFailed={handleFailed}
                  />
                </Elements>
              </div>
            )}

            {/* Zelle area */}
            {paymentMethod === "zelle" && (
              <div className="reveal reveal-delay-2">
                <div className="zelle-area">
                  <div className="zelle-info-card">
                    <div className="zelle-row">
                      <span className="zelle-row-label">Send to</span>
                      <span className="zelle-row-value">adrian@greenwayband.com</span>
                    </div>
                    <div className="zelle-row">
                      <span className="zelle-row-label">Amount</span>
                      <span className="zelle-row-value">{formatInvoiceCurrency(invoice.amount)}</span>
                    </div>
                    <div className="zelle-row">
                      <span className="zelle-row-label">Reference</span>
                      <span className="zelle-row-value">{invoice.invoice_number}</span>
                    </div>
                  </div>

                  {!zelleConfirmed ? (
                    <button
                      className="zelle-button"
                      onClick={() => setZelleConfirmed(true)}
                    >
                      I&rsquo;ve Sent My Zelle Payment
                    </button>
                  ) : (
                    <div className="zelle-confirmed">
                      Thank you! We&rsquo;ll confirm your payment within 24 hours
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══ PROCESSING ═══ */}
      {pageState === "processing" && (
        <div className="processing-state">
          <div className="spinner" />
          <div className="processing-text">Processing your payment</div>
          <div className="processing-subtext">Please do not close this page</div>
        </div>
      )}

      {/* ═══ SUCCESS ═══ */}
      {pageState === "success" && (
        <section className="success-section">
          <div className="section-content">
            <div className="success-card reveal">
              <svg className="success-icon" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="23" strokeWidth="1" />
                <path d="M15 24L21 30L33 18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="success-label">PAYMENT RECEIVED</div>
              <div className="success-amount">{formatInvoiceCurrency(successDetails?.amount || invoice.amount)}</div>
            </div>

            {successDetails && (
              <div className="success-details reveal reveal-delay-1">
                <div className="detail-cell">
                  <div className="detail-label">Method</div>
                  <div className="detail-value">{successDetails.method}</div>
                </div>
                <div className="detail-cell">
                  <div className="detail-label">Amount</div>
                  <div className="detail-value">{formatInvoiceCurrency(successDetails.amount)}</div>
                </div>
                <div className="detail-cell">
                  <div className="detail-label">Date</div>
                  <div className="detail-value">{successDetails.date}</div>
                </div>
                <div className="detail-cell">
                  <div className="detail-label">Invoice</div>
                  <div className="detail-value">{successDetails.invoiceNumber}</div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══ FAILED ═══ */}
      {pageState === "failed" && (
        <section className="failed-section">
          <div className="section-content">
            <div className="failed-card">
              <svg className="failed-icon" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="23" strokeWidth="1" />
                <path d="M18 18L30 30M30 18L18 30" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <div className="failed-label">PAYMENT FAILED</div>
              <div className="failed-message">{failedMessage}</div>
              <button className="retry-button" onClick={handleRetry}>
                Try Again
              </button>
              <div className="failed-contact">
                <p>Need help? Contact us</p>
                <p><a href="mailto:adrian@greenwayband.com">adrian@greenwayband.com</a></p>
                <p>(281) 467 1226</p>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="section-divider" />

      {/* ═══ FOOTER ═══ */}
      <footer className="invoice-footer">
        <div className="footer-contact reveal">
          <p>Adrian Michael</p>
          <p><a href="mailto:adrian@greenwayband.com">adrian@greenwayband.com</a></p>
          <p>(281) 467 1226</p>
        </div>
        <div className="reveal reveal-delay-1">
          <div className="cover-rule" style={{ marginBottom: 16 }} />
          <div className="logo-the">THE</div>
          <div className="logo-name">GREENWAY</div>
          <div className="logo-band">BAND</div>
          <div className="cover-rule" style={{ marginTop: 12 }} />
        </div>
      </footer>

    </div>
  );
};

export default InvoicePublic;
