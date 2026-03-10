import React, { useState, useEffect, useRef } from "react";
import {
  formatContractDate,
  formatContractCurrency,
} from "../utils/contractHelpers";

// ── Constants ──
const SUPABASE_URL = "https://xffmrambsjzmbquyqiea.supabase.co";

const getPdfUrl = (pdfPath) =>
  `${SUPABASE_URL}/storage/v1/object/public/contract-pdfs/${pdfPath}`;

// ── Terms 8-15 (verbatim) ──
const TERMS = [
  { num: 8, text: "This contract constitutes a complete and binding agreement between the purchaser and the artist(s)." },
  { num: 9, text: "Cancellation must be submitted in writing to The Greenway Band. In the event that the engagement does not occur, not as a result of the artist\u2019s sole actions, The Greenway Band will nevertheless be paid the full contracted amount." },
  { num: 10, text: "The agreement of the artist to perform is subject to the detention by sickness, accident, civil tumult, strikes, epidemics, acts of God, or conditions beyond their control. In any such event, at the purchaser\u2019s option, either the deposit will be refunded immediately to the purchaser, or The Greenway Band will replace the artist with another suitable performer." },
  { num: 11, text: "The persons signing for purchaser and artist agree to be personally, jointly and severally liable for the terms of this contract." },
  { num: 12, text: "It is understood that the artist is hired as an independent contractor, and as such, is responsible for payment of all his own taxes and insurance." },
  { num: 13, text: "Purchaser allows The Greenway Band to use any media taken at the aforementioned engagement for use in the company\u2019s marketing materials, including but not limited to social media, website, brochures, and digital communications." },
  { num: 14, text: "Purchaser is responsible for providing parking or reimbursing all parking costs for artist and crew for the entire engagement period (load in through load out). Reimbursement is due at the conclusion of the event (end of load out). Overtime still applies if parking or access delays the schedule." },
  { num: 15, text: "Cocktail hour entertainment may be added at a later date at mutually agreed upon pricing." },
];

// ── Injected CSS ──
const CONTRACT_CSS = `
  .gw-contract * { margin: 0; padding: 0; box-sizing: border-box; }

  .gw-contract {
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
  .gw-contract .reveal {
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.8s ease, transform 0.8s ease;
  }
  .gw-contract .reveal.visible {
    opacity: 1;
    transform: translateY(0);
  }
  .gw-contract .reveal-delay-1 { transition-delay: 0.1s; }
  .gw-contract .reveal-delay-2 { transition-delay: 0.2s; }
  .gw-contract .reveal-delay-3 { transition-delay: 0.3s; }
  .gw-contract .reveal-delay-4 { transition-delay: 0.4s; }
  .gw-contract .reveal-delay-5 { transition-delay: 0.5s; }

  /* Section content wrapper */
  .gw-contract .section-content {
    max-width: 680px;
    margin: 0 auto;
    padding: 0 40px;
  }

  /* Section divider */
  .gw-contract .section-divider {
    width: 100%;
    height: 1px;
    background: var(--border-light);
  }

  /* Section label */
  .gw-contract .section-label {
    font-size: 9px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--cream-faint);
    margin-bottom: 32px;
  }

  /* ── Header (compact) ── */
  .gw-contract .contract-header {
    padding: 80px 40px 60px;
    text-align: center;
  }
  .gw-contract .cover-rule {
    width: 60px;
    height: 0.5px;
    background: var(--cream-dim);
    margin: 0 auto;
  }
  .gw-contract .cover-the {
    font-family: 'Bodoni Moda', serif;
    font-size: 12px;
    letter-spacing: 10px;
    text-transform: uppercase;
    color: var(--cream-dim);
    margin-top: 40px;
    text-indent: 10px;
  }
  .gw-contract .cover-name {
    font-family: 'Bodoni Moda', serif;
    font-size: clamp(28px, 8vw, 42px);
    letter-spacing: 5px;
    text-transform: uppercase;
    color: var(--cream);
    margin: 4px 0;
    font-weight: 400;
    text-indent: 5px;
  }
  .gw-contract .cover-band {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 11px;
    letter-spacing: 14px;
    text-transform: uppercase;
    color: var(--cream-dim);
    font-weight: 400;
    text-indent: 14px;
  }
  .gw-contract .contract-type-label {
    font-size: 9px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--cream-faint);
    margin-top: 24px;
  }

  /* ── Signed confirmation card ── */
  .gw-contract .signed-card {
    background: var(--green-bg);
    border: 1px solid var(--green-border);
    border-radius: 4px;
    padding: 40px;
    text-align: center;
    margin-bottom: 0;
  }
  .gw-contract .signed-icon {
    width: 48px;
    height: 48px;
    margin: 0 auto 20px;
    display: block;
  }
  .gw-contract .signed-icon circle,
  .gw-contract .signed-icon path {
    fill: none;
    stroke: var(--green-text);
  }
  .gw-contract .signed-label {
    font-size: 9px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--green-text);
    margin-bottom: 12px;
  }
  .gw-contract .signed-date {
    font-size: 14px;
    color: var(--cream-muted);
  }

  /* ── Event details grid ── */
  .gw-contract .event-section { padding: 80px 0; }
  .gw-contract .event-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1px;
    background: var(--border);
    border: 1px solid var(--border);
    border-radius: 2px;
  }
  .gw-contract .event-cell {
    background: var(--charcoal-mid);
    padding: 24px;
  }
  .gw-contract .event-cell.full-width {
    grid-column: 1 / -1;
  }
  .gw-contract .event-cell-label {
    font-size: 9px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--cream-faint);
    margin-bottom: 8px;
  }
  .gw-contract .event-cell-value {
    font-size: 14px;
    color: var(--cream);
  }

  /* ── Financial terms card ── */
  .gw-contract .financial-section { padding: 80px 0; }
  .gw-contract .financial-card {
    background: var(--charcoal);
    border: 1px solid var(--border-light);
    border-radius: 4px;
    padding: 40px;
    text-align: center;
  }
  .gw-contract .financial-price {
    font-family: 'Bodoni Moda', serif;
    font-size: clamp(28px, 6vw, 36px);
    color: var(--cream);
    font-weight: 400;
    margin-bottom: 24px;
  }
  .gw-contract .financial-divider {
    height: 0.5px;
    background: var(--border-light);
    margin: 0 auto 24px;
    max-width: 200px;
  }
  .gw-contract .financial-rows {
    max-width: 400px;
    margin: 0 auto;
  }
  .gw-contract .financial-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 8px 0;
  }
  .gw-contract .financial-row-label {
    font-size: 13px;
    color: var(--cream-dim);
  }
  .gw-contract .financial-row-value {
    font-size: 13px;
    color: var(--cream);
  }

  /* ── Provisions ── */
  .gw-contract .provisions-section { padding: 80px 0; }
  .gw-contract .provision-text {
    font-size: 14px;
    color: var(--cream-muted);
    line-height: 1.9;
    margin-bottom: 8px;
  }
  .gw-contract .provision-note {
    font-size: 14px;
    color: var(--cream-muted);
    line-height: 1.9;
    margin-top: 20px;
  }

  /* ── Return deadline ── */
  .gw-contract .return-deadline {
    text-align: center;
    font-size: 9px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--cream-faint);
    padding: 40px 0;
  }

  /* ── Terms section ── */
  .gw-contract .terms-section { padding: 80px 0; }
  .gw-contract .terms-content {
    max-width: 600px;
    margin: 0 auto;
  }
  .gw-contract .term {
    font-size: 14px;
    color: var(--cream-muted);
    line-height: 1.9;
    margin-bottom: 28px;
  }
  .gw-contract .term:last-child { margin-bottom: 0; }
  .gw-contract .term-number {
    font-weight: 700;
    color: var(--cream);
  }

  /* ── Signatures section ── */
  .gw-contract .signatures-section { padding: 80px 0; }
  .gw-contract .sig-block { margin-bottom: 0; }
  .gw-contract .sig-block-label {
    font-size: 9px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--cream-faint);
    margin-bottom: 12px;
  }
  .gw-contract .sig-block-name {
    font-size: 14px;
    color: var(--cream);
    margin-bottom: 12px;
  }
  .gw-contract .sig-display {
    font-family: 'Bodoni Moda', serif;
    font-style: italic;
    font-size: 22px;
    color: var(--cream);
    margin-top: 4px;
  }
  .gw-contract .sig-date {
    font-size: 13px;
    color: var(--cream-dim);
    margin-top: 4px;
  }
  .gw-contract .sig-divider {
    height: 0.5px;
    background: var(--border-light);
    margin: 40px 0;
  }

  /* Signing input */
  .gw-contract .sig-input {
    width: 100%;
    padding: 12px 0;
    font-size: 18px;
    font-family: 'Bodoni Moda', serif;
    font-style: italic;
    border: none;
    border-bottom: 2px solid var(--border-light);
    outline: none;
    background: transparent;
    color: var(--cream);
    transition: border-color 0.15s ease;
  }
  .gw-contract .sig-input:focus {
    border-bottom-color: var(--cream);
  }
  .gw-contract .sig-input::placeholder {
    color: var(--cream-faint);
    font-style: italic;
  }

  /* Custom checkbox */
  .gw-contract .consent-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-top: 20px;
    cursor: pointer;
  }
  .gw-contract .custom-checkbox {
    width: 18px;
    height: 18px;
    border: 1px solid var(--border-light);
    border-radius: 4px;
    flex-shrink: 0;
    margin-top: 2px;
    cursor: pointer;
    transition: background 150ms ease, border-color 150ms ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .gw-contract .custom-checkbox.checked {
    background: var(--cream);
    border-color: var(--cream);
  }
  .gw-contract .check-svg {
    width: 12px;
    height: 12px;
  }
  .gw-contract .check-svg path {
    fill: none;
    stroke: var(--black);
  }
  .gw-contract .consent-text {
    font-size: 13px;
    line-height: 1.6;
    color: var(--cream-dim);
  }

  /* Sign + download buttons */
  .gw-contract .sign-button {
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
  .gw-contract .download-button {
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
    margin-top: 32px;
  }

  /* Sign error + legal text */
  .gw-contract .sign-error {
    font-size: 13px;
    color: var(--red-text);
    margin-top: 12px;
  }
  .gw-contract .legal-text {
    font-size: 11px;
    color: var(--cream-faint);
    text-align: center;
    margin-top: 12px;
  }
  .gw-contract .pdf-unavailable {
    font-size: 13px;
    color: var(--cream-faint);
    text-align: center;
    margin-top: 24px;
  }

  /* ── Footer ── */
  .gw-contract .contract-footer {
    padding: 80px 40px 60px;
    text-align: center;
  }
  .gw-contract .footer-contact {
    margin-bottom: 32px;
  }
  .gw-contract .footer-contact p {
    font-size: 12px;
    color: var(--cream-dim);
    letter-spacing: 2px;
    line-height: 2.2;
  }
  .gw-contract .footer-website {
    font-size: 13px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--cream-muted);
    margin-bottom: 32px;
  }
  .gw-contract .logo-the {
    font-family: 'Bodoni Moda', serif;
    font-size: 10px;
    letter-spacing: 8px;
    text-transform: uppercase;
    color: var(--cream-faint);
    text-indent: 8px;
  }
  .gw-contract .logo-name {
    font-family: 'Bodoni Moda', serif;
    font-size: 24px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--cream);
    margin: 2px 0;
    font-weight: 400;
    text-indent: 4px;
  }
  .gw-contract .logo-band {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 8px;
    letter-spacing: 12px;
    text-transform: uppercase;
    color: var(--cream-faint);
    text-indent: 12px;
  }

  /* ── Error / voided page ── */
  .gw-contract .error-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 60px 32px;
  }
  .gw-contract .error-brand { margin-bottom: 60px; }
  .gw-contract .error-message {
    font-family: 'Bodoni Moda', serif;
    font-style: italic;
    font-size: clamp(22px, 5vw, 26px);
    color: var(--cream);
    line-height: 1.5;
    max-width: 400px;
    margin-bottom: 56px;
  }
  .gw-contract .error-sub {
    font-size: 14px;
    color: var(--cream-dim);
    line-height: 1.6;
    margin-bottom: 56px;
    max-width: 400px;
  }
  .gw-contract .error-rule {
    width: 40px;
    height: 0.5px;
    background: var(--cream-dim);
    margin: 0 auto 40px;
  }
  .gw-contract .error-contact p {
    font-size: 12px;
    color: var(--cream-dim);
    letter-spacing: 2px;
    line-height: 2.2;
  }

  /* Links */
  .gw-contract a { color: var(--cream-muted); text-decoration: none; }
  .gw-contract a:hover { color: var(--cream); }

  /* Responsive */
  @media (max-width: 640px) {
    .gw-contract .section-content { padding: 0 24px !important; }
    .gw-contract .contract-header { padding: 60px 24px 48px !important; }
    .gw-contract .event-grid { grid-template-columns: 1fr !important; }
    .gw-contract .event-cell.full-width { grid-column: auto !important; }
    .gw-contract .contract-footer { padding: 60px 24px 48px !important; }
  }
`;

// ── Component ──
const ContractPublic = ({ slug }) => {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [voided, setVoided] = useState(false);

  // Signing form state
  const [typedName, setTypedName] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState("");
  const [signSuccess, setSignSuccess] = useState(null);

  const containerRef = useRef(null);
  const observerRef = useRef(null);

  // Fetch contract data
  useEffect(() => {
    if (!slug) {
      setError(true);
      setLoading(false);
      return;
    }
    fetch(`/.netlify/functions/contract-data?slug=${encodeURIComponent(slug)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.status === "voided") {
          setVoided(true);
        } else if (data.success && data.slug) {
          setContract(data);
          document.title = `The Greenway Band \u2014 ${data.contract_number}`;
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  // Inject CSS + body override
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = CONTRACT_CSS;
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
    if (loading || error || voided) return;

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
      if (!el.closest(".contract-header")) {
        observerRef.current.observe(el);
      }
    });

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [loading, error, voided, contract, signSuccess]);

  // Sign handler
  const handleSign = async () => {
    setSignError("");
    if (typedName.trim().length < 2 || !consentChecked) return;

    setSigning(true);
    try {
      const res = await fetch("/.netlify/functions/contract-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          typed_name: typedName.trim(),
          consent: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSignSuccess({
          signed_at: data.signed_at,
          pdf_url: data.pdf_url,
        });
      } else {
        setSignError(data.message || "Something went wrong. Please try again.");
      }
    } catch {
      setSignError("Network error. Please check your connection and try again.");
    } finally {
      setSigning(false);
    }
  };

  // ── Loading: solid dark screen ──
  if (loading) {
    return <div className="gw-contract" />;
  }

  // ── 404 ──
  if (error) {
    return (
      <div className="gw-contract">
        <div className="error-page">
          <div className="error-brand">
            <div className="cover-rule" />
            <div className="cover-the">THE</div>
            <div className="cover-name">GREENWAY</div>
            <div className="cover-band">BAND</div>
            <div className="cover-rule" style={{ marginTop: 16 }} />
          </div>
          <div className="error-message">
            This contract is no longer available
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

  // ── Voided ──
  if (voided) {
    return (
      <div className="gw-contract">
        <div className="error-page">
          <div className="error-brand">
            <div className="cover-rule" />
            <div className="cover-the">THE</div>
            <div className="cover-name">GREENWAY</div>
            <div className="cover-band">BAND</div>
            <div className="cover-rule" style={{ marginTop: 16 }} />
          </div>
          <div className="error-message">
            This contract is no longer active
          </div>
          <div className="error-sub">
            If you believe this is an error, please contact us at{" "}
            <a href="mailto:adrian@greenwayband.com">adrian@greenwayband.com</a>
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
  const c = contract;
  const isSigned = c.status === "signed" || !!signSuccess;
  const clientFullName = [c.partner1_first, c.partner1_last].filter(Boolean).join(" ");
  const balance = c.contract_price - c.deposit_amount;

  const finalTypedName = signSuccess ? typedName.trim() : c.typed_name;
  const finalSignedAt = signSuccess?.signed_at || c.signed_at;
  const pdfUrl = signSuccess?.pdf_url || (c.pdf_path ? getPdfUrl(c.pdf_path) : null);

  const isDisabled = signing || typedName.trim().length < 2 || !consentChecked;

  return (
    <div className="gw-contract" ref={containerRef}>

      {/* ═══ HEADER ═══ */}
      <header className="contract-header">
        <div className="cover-rule" />
        <div className="cover-the">THE</div>
        <div className="cover-name">GREENWAY</div>
        <div className="cover-band">BAND</div>
        <div className="cover-rule" style={{ marginTop: 16 }} />
        <div className="contract-type-label">AGREEMENT AND CONTRACT</div>
      </header>

      <div className="section-divider" />

      {/* ═══ SIGNED CONFIRMATION ═══ */}
      {isSigned && (
        <section className="event-section">
          <div className="section-content">
            <div className="signed-card reveal">
              <svg className="signed-icon" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="23" strokeWidth="1" />
                <path d="M15 24L21 30L33 18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="signed-label">CONTRACT SIGNED</div>
              <div className="signed-date">Signed on {formatContractDate(finalSignedAt)}</div>
            </div>
          </div>
        </section>
      )}

      {isSigned && <div className="section-divider" />}

      {/* ═══ EVENT DETAILS (Items 1-5) ═══ */}
      <section className="event-section">
        <div className="section-content">
          <div className="section-label reveal">Event details</div>

          <div className="event-grid reveal reveal-delay-1">
            <div className="event-cell">
              <div className="event-cell-label">Artist</div>
              <div className="event-cell-value">The Greenway Band</div>
            </div>
            <div className="event-cell">
              <div className="event-cell-label">Date</div>
              <div className="event-cell-value">{formatContractDate(c.event_date)}</div>
            </div>
            <div className="event-cell">
              <div className="event-cell-label">Venue</div>
              <div className="event-cell-value">{c.venue}</div>
            </div>
            <div className="event-cell">
              <div className="event-cell-label">Type</div>
              <div className="event-cell-value">Wedding</div>
            </div>
            <div className="event-cell full-width">
              <div className="event-cell-label">Time of Engagement</div>
              <div className="event-cell-value">{c.time_of_engagement}</div>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══ FINANCIAL TERMS (Item 6) ═══ */}
      <section className="financial-section">
        <div className="section-content">
          <div className="section-label reveal">Financial terms</div>

          <div className="financial-card reveal reveal-delay-1">
            <div className="financial-price">{formatContractCurrency(c.contract_price)}</div>
            <div className="financial-divider" />
            <div className="financial-rows">
              <div className="financial-row">
                <span className="financial-row-label">Deposit (50%)</span>
                <span className="financial-row-value">{formatContractCurrency(c.deposit_amount)}</span>
              </div>
              <div className="financial-row">
                <span className="financial-row-label">Balance (50%)</span>
                <span className="financial-row-value">{formatContractCurrency(balance)}</span>
              </div>
              <div className="financial-row">
                <span className="financial-row-label">Overtime</span>
                <span className="financial-row-value">12.5% per half hour</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══ PROVISIONS (Item 7) ═══ */}
      <section className="provisions-section">
        <div className="section-content">
          <div className="section-label reveal">Provisions</div>

          <div className="reveal reveal-delay-1">
            <div className="provision-text">Lighting provided by artist</div>
            <div className="provision-text">Sound provided by artist</div>
            <div className="provision-note">
              Purchaser must provide ({c.meal_count}) hot meals for band and crew. Purchaser must provide an adequate break room for band and crew.
            </div>
          </div>
        </div>
      </section>

      {/* ═══ RETURN DEADLINE ═══ */}
      <div className="return-deadline reveal">
        Contract must be returned within 5 days of issuance
      </div>

      <div className="section-divider" />

      {/* ═══ TERMS AND CONDITIONS (Items 8-15) ═══ */}
      <section className="terms-section">
        <div className="section-content">
          <div className="section-label reveal">Terms and conditions</div>

          <div className="terms-content">
            {TERMS.map((t, i) => (
              <div key={t.num} className={`term reveal${i < 4 ? ` reveal-delay-${i + 1}` : ""}`}>
                <span className="term-number">{t.num}.</span> {t.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══ SIGNATURES ═══ */}
      <section className="signatures-section">
        <div className="section-content">
          <div className="section-label reveal">Signatures</div>

          {/* Client signature block */}
          <div className="sig-block reveal reveal-delay-1">
            <div className="sig-block-label">Client</div>
            <div className="sig-block-name">{clientFullName}</div>

            {isSigned ? (
              <>
                <div className="sig-display">{finalTypedName}</div>
                <div className="sig-date">{formatContractDate(finalSignedAt)}</div>
              </>
            ) : (
              <>
                <input
                  type="text"
                  className="sig-input"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="Type your full legal name"
                  disabled={signing}
                />

                <div
                  className="consent-row"
                  onClick={() => !signing && setConsentChecked(!consentChecked)}
                >
                  <div className={`custom-checkbox${consentChecked ? " checked" : ""}`}>
                    {consentChecked && (
                      <svg className="check-svg" viewBox="0 0 14 14">
                        <path d="M3 7L6 10L11 4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="consent-text">
                    I agree that typing my name above constitutes my electronic signature on this contract, and that I have read and agree to all terms above
                  </span>
                </div>

                {signError && <div className="sign-error">{signError}</div>}

                <button
                  className="sign-button"
                  onClick={handleSign}
                  disabled={isDisabled}
                  style={{ opacity: isDisabled ? 0.3 : 1 }}
                >
                  {signing ? "Signing..." : "Sign Contract"}
                </button>

                <div className="legal-text">
                  Your signature is legally binding under the Electronic Signatures in Global and National Commerce Act (ESIGN Act)
                </div>
              </>
            )}
          </div>

          <div className="sig-divider" />

          {/* Artist signature block */}
          <div className="sig-block reveal reveal-delay-2">
            <div className="sig-block-label">Artist</div>
            <div className="sig-block-name">Adrian Michael</div>
            <div className="sig-display">Adrian Michael</div>
            <div className="sig-date">{formatContractDate(c.sent_at)}</div>
          </div>

          {/* PDF download (signed only) */}
          {isSigned && pdfUrl && (
            <button
              className="download-button"
              onClick={() => window.open(pdfUrl, "_blank")}
            >
              Download Signed Contract (PDF)
            </button>
          )}
          {isSigned && !pdfUrl && (
            <div className="pdf-unavailable">PDF not available</div>
          )}
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══ FOOTER ═══ */}
      <footer className="contract-footer">
        <div className="footer-contact reveal">
          <p>Adrian Michael</p>
          <p><a href="mailto:adrian@greenwayband.com">adrian@greenwayband.com</a></p>
          <p>(281) 467 1226</p>
        </div>
        <div className="footer-website reveal reveal-delay-1">greenwayband.com</div>
        <div className="reveal reveal-delay-2">
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

export default ContractPublic;
