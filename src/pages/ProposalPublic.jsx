import React, { useState, useEffect, useRef } from "react";

// ── Band configurations: grouped roles with counts ──
const BAND_CONFIGS = {
  '6 piece': [
    { role: 'Vocals', count: 2 },
    { role: 'Keys', count: 1 },
    { role: 'Guitar', count: 1 },
    { role: 'Bass', count: 1 },
    { role: 'Drums', count: 1 },
  ],
  '8 piece': [
    { role: 'Vocals', count: 3 },
    { role: 'Keys', count: 1 },
    { role: 'Guitar', count: 1 },
    { role: 'Bass', count: 1 },
    { role: 'Drums', count: 1 },
    { role: 'Horns', count: 1 },
  ],
  '10 piece': [
    { role: 'Vocals', count: 3 },
    { role: 'Keys', count: 1 },
    { role: 'Guitar', count: 1 },
    { role: 'Bass', count: 1 },
    { role: 'Drums', count: 1 },
    { role: 'Horns', count: 3 },
  ],
  '12 piece': [
    { role: 'Vocals', count: 3 },
    { role: 'Keys', count: 1 },
    { role: 'Guitar', count: 2 },
    { role: 'Bass', count: 1 },
    { role: 'Drums', count: 1 },
    { role: 'Horns', count: 3 },
    { role: 'Percussion', count: 1 },
  ],
  '14 piece': [
    { role: 'Vocals', count: 4 },
    { role: 'Keys', count: 1 },
    { role: 'Guitar', count: 2 },
    { role: 'Bass', count: 1 },
    { role: 'Drums', count: 1 },
    { role: 'Horns', count: 4 },
    { role: 'Percussion', count: 1 },
  ],
};

const INCLUDED_SERVICES = [
  "Sound Equipment and Engineer",
  "Lighting Equipment and Engineer",
  "Emcee Services",
  "Personalized First Dance",
  "Song Requests",
];

// ── Helpers ──
const formatDateLong = (dateStr) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const formatPrice = (price) => {
  if (!price) return "";
  return `$${Number(price).toLocaleString()}`;
};

const getConfigKey = (config) => {
  if (!config) return '10 piece';
  const num = parseInt(String(config).replace(/\D/g, ""), 10);
  return [6, 8, 10, 12, 14].includes(num) ? `${num} piece` : '10 piece';
};

const getDisplayName = (key) => {
  if (!key) return "Band";
  const num = String(key).replace(/\D/g, "");
  return num ? `${num} Piece Band` : key;
};

const getPieceNumber = (key) => {
  const num = String(key).replace(/\D/g, "");
  return num ? parseInt(num, 10) : 10;
};

const hasHornSection = (key) => {
  const musicians = BAND_CONFIGS[key];
  if (!musicians) return false;
  const horns = musicians.find((m) => m.role === "Horns");
  return horns && horns.count >= 3;
};

const getPackageSubtitle = (key) =>
  hasHornSection(key)
    ? "Full reception entertainment + MC services + horn section"
    : "Reception entertainment + MC services";

const formatTime = (time) => {
  if (!time) return "";
  if (/[AP]M/i.test(time)) return time;
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  if (isNaN(hour)) return time;
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
};

// ── Injected CSS ──
const PROPOSAL_CSS = `
  .gw-proposal * { margin: 0; padding: 0; box-sizing: border-box; }

  .gw-proposal {
    --black: #0A0A09;
    --charcoal: #111110;
    --charcoal-mid: #1A1A18;
    --cream: #F5F2ED;
    --cream-muted: #D4D0C8;
    --cream-dim: #8A867E;
    --cream-faint: #5A5750;
    --border: rgba(245,242,237,0.08);
    --border-light: rgba(245,242,237,0.12);
    font-family: 'Plus Jakarta Sans', sans-serif;
    background: var(--black);
    color: var(--cream);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: hidden;
    min-height: 100vh;
  }

  /* Reveal system */
  .gw-proposal .reveal {
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.8s ease, transform 0.8s ease;
  }
  .gw-proposal .reveal.visible {
    opacity: 1;
    transform: translateY(0);
  }
  .gw-proposal .reveal-delay-1 { transition-delay: 0.1s; }
  .gw-proposal .reveal-delay-2 { transition-delay: 0.2s; }
  .gw-proposal .reveal-delay-3 { transition-delay: 0.3s; }
  .gw-proposal .reveal-delay-4 { transition-delay: 0.4s; }
  .gw-proposal .reveal-delay-5 { transition-delay: 0.5s; }

  /* Section content wrapper */
  .gw-proposal .section-content {
    max-width: 680px;
    margin: 0 auto;
    padding: 0 40px;
  }

  /* Section divider */
  .gw-proposal .section-divider {
    width: 100%;
    height: 1px;
    background: var(--border-light);
  }

  /* Section label */
  .gw-proposal .section-label {
    font-size: 9px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--cream-faint);
    margin-bottom: 32px;
  }

  /* Cover */
  .gw-proposal .cover {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 80px 40px;
    position: relative;
  }
  .gw-proposal .cover-rule {
    width: 60px;
    height: 0.5px;
    background: var(--cream-dim);
    margin: 0 auto;
  }
  .gw-proposal .cover-the {
    font-family: 'Bodoni Moda', serif;
    font-size: 12px;
    letter-spacing: 10px;
    text-transform: uppercase;
    color: var(--cream-dim);
    margin-top: 40px;
    text-indent: 10px;
  }
  .gw-proposal .cover-name {
    font-family: 'Bodoni Moda', serif;
    font-size: clamp(28px, 8vw, 42px);
    letter-spacing: 5px;
    text-transform: uppercase;
    color: var(--cream);
    margin: 4px 0;
    font-weight: 400;
    text-indent: 5px;
  }
  .gw-proposal .cover-band {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 11px;
    letter-spacing: 14px;
    text-transform: uppercase;
    color: var(--cream-dim);
    font-weight: 400;
    text-indent: 14px;
  }
  .gw-proposal .cover-descriptor {
    font-family: 'Bodoni Moda', serif;
    font-style: italic;
    font-size: 14px;
    color: var(--cream-dim);
    margin-top: 24px;
    letter-spacing: 1.5px;
  }
  .gw-proposal .cover-couple {
    margin-top: 80px;
    text-align: center;
  }
  .gw-proposal .cover-prepared {
    font-size: 9px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--cream-faint);
    margin-bottom: 16px;
  }
  .gw-proposal .cover-couple-names {
    font-family: 'Bodoni Moda', serif;
    font-size: clamp(22px, 6vw, 28px);
    color: var(--cream);
    font-weight: 400;
    letter-spacing: 1px;
  }
  .gw-proposal .cover-couple-names em {
    font-style: italic;
    font-weight: 400;
    color: var(--cream-muted);
    font-size: 0.78em;
  }
  .gw-proposal .cover-details {
    margin-top: 24px;
    font-size: 12px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--cream-dim);
    line-height: 2;
  }
  .gw-proposal .cover-footer {
    position: absolute;
    bottom: 48px;
    left: 0;
    right: 0;
    text-align: center;
  }
  .gw-proposal .cover-footer p {
    font-size: 9px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--cream-faint);
    opacity: 0.6;
  }

  /* Intro */
  .gw-proposal .intro { padding: 80px 0; }
  .gw-proposal .intro-greeting {
    font-family: 'Bodoni Moda', serif;
    font-size: clamp(24px, 5vw, 32px);
    color: var(--cream);
    font-weight: 400;
    line-height: 1.3;
    margin-bottom: 40px;
  }
  .gw-proposal .intro-body {
    font-size: 14px;
    line-height: 1.9;
    color: var(--cream-muted);
    max-width: 540px;
  }
  .gw-proposal .intro-body p { margin-bottom: 20px; }
  .gw-proposal .intro-body p:last-child { margin-bottom: 0; }
  .gw-proposal .intro-signature {
    margin-top: 48px;
    padding-top: 32px;
    border-top: 0.5px solid var(--border-light);
  }
  .gw-proposal .intro-signature .sig-name {
    font-family: 'Bodoni Moda', serif;
    font-size: 16px;
    color: var(--cream);
    margin-bottom: 4px;
  }
  .gw-proposal .intro-signature .sig-title {
    font-size: 11px;
    color: var(--cream-dim);
    letter-spacing: 2px;
    text-transform: uppercase;
  }

  /* Package / Options */
  .gw-proposal .package-section { padding: 80px 0; }
  .gw-proposal .package-section .section-content { max-width: 840px; }
  .gw-proposal .package-title {
    font-family: 'Bodoni Moda', serif;
    font-size: clamp(24px, 5vw, 28px);
    color: var(--cream);
    font-weight: 400;
    margin-bottom: 8px;
  }
  .gw-proposal .package-subtitle {
    font-size: 12px;
    color: var(--cream-dim);
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 48px;
  }
  .gw-proposal .options-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 48px;
  }
  .gw-proposal .options-grid > div {
    display: flex;
    flex-direction: column;
  }
  .gw-proposal .options-grid .price-block { margin-top: auto; }
  .gw-proposal .option-label {
    font-size: 9px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--cream-faint);
    margin-bottom: 12px;
  }
  .gw-proposal .option-title {
    font-family: 'Bodoni Moda', serif;
    font-size: 22px;
    color: var(--cream);
    font-weight: 400;
    margin-bottom: 4px;
  }
  .gw-proposal .option-subtitle {
    font-size: 11px;
    color: var(--cream-dim);
    letter-spacing: 1px;
    margin-bottom: 32px;
  }
  .gw-proposal .pkg-section-label {
    font-size: 9px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--cream-faint);
    margin-bottom: 20px;
  }
  .gw-proposal .instrument-list { list-style: none; }
  .gw-proposal .instrument-list li {
    font-size: 14px;
    color: var(--cream-muted);
    padding: 10px 0;
    border-bottom: 0.5px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .gw-proposal .instrument-list li:last-child { border-bottom: none; }
  .gw-proposal .instrument-list li .count {
    font-size: 11px;
    color: var(--cream-faint);
    letter-spacing: 1px;
  }
  .gw-proposal .services-list { list-style: none; }
  .gw-proposal .services-list li {
    font-size: 13px;
    color: var(--cream-muted);
    padding: 8px 0;
    border-bottom: 0.5px solid var(--border);
  }
  .gw-proposal .services-list li:last-child { border-bottom: none; }
  .gw-proposal .price-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 32px 0;
    border-top: 0.5px solid var(--border-light);
    border-bottom: 0.5px solid var(--border-light);
    margin-top: 24px;
  }
  .gw-proposal .price-label {
    font-size: 11px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--cream-dim);
  }
  .gw-proposal .price-amount {
    font-family: 'Bodoni Moda', serif;
    font-size: clamp(28px, 5vw, 36px);
    color: var(--cream);
    font-weight: 400;
  }
  .gw-proposal .package-note {
    font-size: 11px;
    color: var(--cream-faint);
    line-height: 1.8;
    margin-top: 24px;
  }

  /* Single-package two-column grid (A/B) */
  .gw-proposal .single-pkg-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
  }

  /* Event Details */
  .gw-proposal .details-section { padding: 80px 0; }
  .gw-proposal .details-title {
    font-family: 'Bodoni Moda', serif;
    font-size: clamp(24px, 5vw, 28px);
    color: var(--cream);
    font-weight: 400;
    margin-bottom: 48px;
  }
  .gw-proposal .details-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    border: 0.5px solid var(--border-light);
    border-radius: 2px;
    margin-bottom: 48px;
  }
  .gw-proposal .detail-cell {
    padding: 28px 32px;
    border-bottom: 0.5px solid var(--border);
    border-right: 0.5px solid var(--border);
  }
  .gw-proposal .detail-cell:nth-child(even) { border-right: none; }
  .gw-proposal .detail-cell:nth-last-child(-n+2) { border-bottom: none; }
  .gw-proposal .detail-label {
    font-size: 9px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--cream-faint);
    margin-bottom: 8px;
  }
  .gw-proposal .detail-value {
    font-family: 'Bodoni Moda', serif;
    font-size: 16px;
    color: var(--cream);
    font-weight: 400;
  }

  /* Cocktail Hour Add-On */
  .gw-proposal .addon-section {
    margin-top: 8px;
    padding-top: 40px;
    border-top: 0.5px solid var(--border-light);
  }
  .gw-proposal .addon-title {
    font-family: 'Bodoni Moda', serif;
    font-size: 20px;
    color: var(--cream);
    font-weight: 400;
    margin-bottom: 8px;
  }
  .gw-proposal .addon-desc {
    font-size: 13px;
    color: var(--cream-dim);
    line-height: 1.7;
    margin-bottom: 28px;
    max-width: 480px;
  }
  .gw-proposal .addon-options {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 20px;
  }
  .gw-proposal .addon-card {
    padding: 24px;
    border: 0.5px solid var(--border-light);
    border-radius: 2px;
    text-align: center;
  }
  .gw-proposal .addon-card .addon-type {
    font-size: 10px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--cream-dim);
    margin-bottom: 12px;
  }
  .gw-proposal .addon-card .addon-price {
    font-family: 'Bodoni Moda', serif;
    font-size: 22px;
    color: var(--cream);
  }

  /* Testimonials */
  .gw-proposal .testimonials-section { padding: 80px 0; }
  .gw-proposal .testimonial-block { margin-bottom: 48px; }
  .gw-proposal .testimonial-block:last-of-type { margin-bottom: 0; }
  .gw-proposal .testimonial-quote-mark {
    font-family: 'Bodoni Moda', serif;
    font-size: 64px;
    color: var(--cream-faint);
    line-height: 0.5;
    margin-bottom: 16px;
    opacity: 0.4;
  }
  .gw-proposal .testimonial-text {
    font-family: 'Bodoni Moda', serif;
    font-size: clamp(16px, 3.5vw, 18px);
    font-style: italic;
    color: var(--cream);
    line-height: 1.7;
    max-width: 520px;
    margin-bottom: 20px;
  }
  .gw-proposal .testimonial-stars {
    color: var(--cream-dim);
    font-size: 12px;
    letter-spacing: 4px;
    margin-bottom: 4px;
  }
  .gw-proposal .testimonial-attr {
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--cream-dim);
  }
  .gw-proposal .testimonial-divider {
    width: 40px;
    height: 0.5px;
    background: var(--border-light);
    margin: 40px 0;
  }

  /* Next Steps */
  .gw-proposal .steps-section { padding: 80px 0; }
  .gw-proposal .step-block {
    padding-bottom: 36px;
    border-bottom: 0.5px solid var(--border-light);
    margin-bottom: 36px;
  }
  .gw-proposal .step-block:last-of-type {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }
  .gw-proposal .step-number {
    font-size: 9px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--cream-faint);
    margin-bottom: 12px;
  }
  .gw-proposal .step-title {
    font-family: 'Bodoni Moda', serif;
    font-size: 20px;
    color: var(--cream);
    font-weight: 400;
    margin-bottom: 8px;
  }
  .gw-proposal .step-desc {
    font-size: 13px;
    color: var(--cream-dim);
    line-height: 1.6;
  }
  .gw-proposal .steps-contact {
    margin-top: 48px;
    padding-top: 32px;
    border-top: 0.5px solid var(--border-light);
    text-align: center;
  }
  .gw-proposal .steps-contact p {
    font-size: 12px;
    color: var(--cream-dim);
    letter-spacing: 2px;
    line-height: 2.4;
  }

  /* Closing */
  .gw-proposal .closing {
    padding: 100px 40px 80px;
    text-align: center;
  }
  .gw-proposal .closing-phrase {
    font-family: 'Bodoni Moda', serif;
    font-style: italic;
    font-size: clamp(22px, 5vw, 26px);
    color: var(--cream);
    line-height: 1.5;
    max-width: 400px;
    margin: 0 auto 56px;
  }
  .gw-proposal .closing-rule {
    width: 40px;
    height: 0.5px;
    background: var(--cream-dim);
    margin: 0 auto 40px;
  }
  .gw-proposal .closing-contact { margin-bottom: 12px; }
  .gw-proposal .closing-contact p {
    font-size: 12px;
    color: var(--cream-dim);
    letter-spacing: 2px;
    line-height: 2.2;
  }
  .gw-proposal .closing-website {
    font-size: 13px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--cream-muted);
    margin-top: 24px;
  }
  .gw-proposal .closing-logo { margin-top: 64px; }
  .gw-proposal .closing-logo .logo-the {
    font-family: 'Bodoni Moda', serif;
    font-size: 10px;
    letter-spacing: 8px;
    text-transform: uppercase;
    color: var(--cream-faint);
    text-indent: 8px;
  }
  .gw-proposal .closing-logo .logo-name {
    font-family: 'Bodoni Moda', serif;
    font-size: 24px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--cream);
    margin: 2px 0;
    font-weight: 400;
    text-indent: 4px;
  }
  .gw-proposal .closing-logo .logo-band {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 8px;
    letter-spacing: 12px;
    text-transform: uppercase;
    color: var(--cream-faint);
    text-indent: 12px;
  }
  .gw-proposal .closing-validity {
    margin-top: 48px;
    font-size: 9px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--cream-faint);
  }

  /* Links */
  .gw-proposal a { color: var(--cream-muted); text-decoration: none; }
  .gw-proposal a:hover { color: var(--cream); }

  /* Responsive */
  @media (max-width: 640px) {
    .gw-proposal .section-content { padding: 0 24px !important; }
    .gw-proposal .cover { padding: 60px 24px !important; }
    .gw-proposal .options-grid { grid-template-columns: 1fr !important; gap: 56px !important; }
    .gw-proposal .single-pkg-grid { grid-template-columns: 1fr !important; }
    .gw-proposal .details-grid { grid-template-columns: 1fr !important; }
    .gw-proposal .detail-cell { border-right: none !important; }
    .gw-proposal .detail-cell:nth-last-child(-n+2) { border-bottom: 0.5px solid var(--border) !important; }
    .gw-proposal .detail-cell:last-child { border-bottom: none !important; }
    .gw-proposal .addon-options { grid-template-columns: 1fr !important; gap: 12px !important; }
    .gw-proposal .closing { padding: 80px 24px 60px !important; }
  }
`;

// ── ProposalPublic ──
const ProposalPublic = ({ slug }) => {
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const containerRef = useRef(null);
  const observerRef = useRef(null);

  // Fetch proposal data
  useEffect(() => {
    if (!slug) {
      setError(true);
      setLoading(false);
      return;
    }
    fetch(`/.netlify/functions/proposal-data?slug=${encodeURIComponent(slug)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.proposal) {
          setProposal(data.proposal);
          document.title = `The Greenway Band \u2014 ${data.proposal.partner1_first || ""}${data.proposal.partner2_first ? ` & ${data.proposal.partner2_first}` : ""}`;
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
    style.textContent = PROPOSAL_CSS;
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

  // Intersection Observer for reveals (sections below the cover only)
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

    // Only observe reveal elements OUTSIDE the cover section
    container.querySelectorAll(".reveal").forEach((el) => {
      if (!el.closest(".cover")) {
        observerRef.current.observe(el);
      }
    });

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [loading, error, proposal]);

  // ── Loading State: solid black screen, nothing visible ──
  if (loading) {
    return <div className="gw-proposal" />;
  }

  // ── Error State ──
  if (error || !proposal) {
    return (
      <div className="gw-proposal">
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            padding: "60px 32px",
          }}
        >
          <div style={{ marginBottom: 60 }}>
            <div className="cover-rule" />
            <div className="cover-the">THE</div>
            <div className="cover-name">GREENWAY</div>
            <div className="cover-band">BAND</div>
            <div className="cover-rule" style={{ marginTop: 16 }} />
          </div>
          <div className="closing-phrase">
            This proposal is no longer available.
          </div>
          <div className="closing-rule" />
          <div className="closing-contact">
            <p>Adrian Michael</p>
            <p><a href="mailto:adrian@greenwayband.com">adrian@greenwayband.com</a></p>
            <p>(281) 467 1226</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Extract data ──
  const p = proposal;
  const co = p.config_override || {};
  const p1First = p.partner1_first || "";
  const p2First = p.partner2_first || "";
  const dateLong = formatDateLong(p.event_date);
  const venue = p.venue || "";

  let templateType = co.template_type || "A";
  if (!["A", "B", "C", "D"].includes(templateType)) templateType = "A";

  const configKey = getConfigKey(co.config || co.primary_package?.config || co.package_name || p.config);
  const packageName = co.package_name || co.primary_package?.name || getDisplayName(configKey);
  const primaryPrice = formatPrice(co.price || co.primary_package?.price || p.price);

  const receptionStart = formatTime(co.reception_start || co.reception_start_24 || "19:00");
  const receptionEnd = formatTime(co.reception_end || co.reception_end_24 || "23:00");
  const cocktailStart = formatTime(co.cocktail_start || co.cocktail_start_24 || "");
  const cocktailEnd = formatTime(co.cocktail_end || co.cocktail_end_24 || "");
  const hasCocktailTimes = !!(cocktailStart && cocktailEnd);

  const option2PackageName = co.option2_package_name || "The Greenway Band";
  const option2ConfigKey = co.option2_config ? getConfigKey(co.option2_config) : null;
  const option2Price = co.option2_price != null ? formatPrice(co.option2_price) : "";

  if ((templateType === "C" || templateType === "D") && !option2ConfigKey) {
    templateType = "A";
  }

  const showCocktail = templateType === "B" || templateType === "D";
  const showOption2 = templateType === "C" || templateType === "D";

  const introText = co.intro_text || co.intro_paragraph || "";

  const musicians1 = BAND_CONFIGS[configKey] || BAND_CONFIGS['10 piece'];
  const musicians2 = option2ConfigKey ? (BAND_CONFIGS[option2ConfigKey] || BAND_CONFIGS['10 piece']) : null;

  // Configuration label for event details
  const getConfigLabel = () => {
    if (showOption2 && option2ConfigKey) {
      const num1 = getPieceNumber(configKey);
      const num2 = getPieceNumber(option2ConfigKey);
      const low = Math.min(num1, num2);
      const high = Math.max(num1, num2);
      const horn = hasHornSection(configKey) || hasHornSection(option2ConfigKey);
      return `${low} to ${high} Piece${horn ? " with Horn Section" : ""}`;
    }
    return packageName;
  };

  // Render musician list
  const renderMusicians = (musicians) => (
    <ul className="instrument-list">
      {musicians.map((m) => (
        <li key={m.role}>
          {m.role}
          <span className="count">{m.count}</span>
        </li>
      ))}
    </ul>
  );

  // Render services list
  const renderServices = () => (
    <ul className="services-list">
      {INCLUDED_SERVICES.map((s) => (
        <li key={s}>{s}</li>
      ))}
    </ul>
  );

  // Render performance window
  const renderPerformanceWindow = () => (
    <>
      <div className="pkg-section-label" style={{ marginTop: 32 }}>Performance Window</div>
      <ul className="services-list">
        <li>Reception: {receptionStart} to {receptionEnd}</li>
      </ul>
    </>
  );

  // Render price block
  const renderPriceBlock = (price) => (
    <>
      <div className="price-row">
        <span className="price-label">Investment</span>
        <span className="price-amount">{price}</span>
      </div>
      <div className="package-note">
        Additional instrumentation available upon request. Travel fee may apply for events over 50 miles from Houston.
      </div>
    </>
  );

  return (
    <div className="gw-proposal" ref={containerRef}>

      {/* ═══ COVER ═══ */}
      <section className="cover">
        <div>
          <div className="cover-rule" />
          <div className="cover-the">THE</div>
          <div className="cover-name">GREENWAY</div>
          <div className="cover-band">BAND</div>
          <div className="cover-rule" style={{ marginTop: 16 }} />
          <div className="cover-descriptor">The sound of a great night.</div>
        </div>

        <div className="cover-couple">
          <div className="cover-prepared">Prepared for</div>
          <div className="cover-couple-names">
            {p1First} <em>&amp;</em> {p2First}
          </div>
          <div className="cover-details">
            {dateLong}<br />
            {venue}
          </div>
        </div>

        <div className="cover-footer">
          <p>greenwayband.com &nbsp;&middot;&nbsp; adrian@greenwayband.com</p>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══ INTRO ═══ */}
      <section className="intro">
        <div className="section-content">
          <div className="section-label reveal">A note for you</div>
          <div className="intro-greeting reveal reveal-delay-1">
            {p1First} and {p2First},<br />
            congratulations.
          </div>

          <div className="intro-body reveal reveal-delay-2">
            <p>We know how much thought goes into every detail of your wedding. The venue, the flowers, the food. The band is no different. It sets the tone for the entire night, and we take that seriously.</p>
            {introText && <p>{introText}</p>}
            <p>From your cocktail hour through the last song of the night, our job is simple: make it feel like yours. Every transition, every song choice, every moment on the mic is tailored to you and your guests. We read the room and respond in real time. That is what separates a great band from a playlist.</p>
            <p>We would love to be part of your night.</p>
          </div>

          <div className="intro-signature reveal reveal-delay-3">
            <div className="sig-name">Adrian Michael</div>
            <div className="sig-title">The Greenway Band</div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══ PACKAGE / OPTIONS ═══ */}
      <section className="package-section">
        <div className="section-content">
          {showOption2 ? (
            <>
              {/* ── TWO OPTIONS (C/D) ── */}
              <div className="section-label reveal">Your options</div>
              <div className="package-title reveal reveal-delay-1">Two Ways to Fill the Room</div>
              <div className="package-subtitle reveal reveal-delay-1">Choose the configuration that fits your vision</div>

              <div className="options-grid reveal reveal-delay-2">
                {/* Option A */}
                <div>
                  <div className="option-label">Option A</div>
                  <div className="option-title">{packageName}</div>
                  <div className="option-subtitle">{getPackageSubtitle(configKey)}</div>

                  <div className="pkg-section-label">Musicians</div>
                  {renderMusicians(musicians1)}

                  <div className="price-block">
                    <div className="pkg-section-label" style={{ marginTop: 32 }}>Included Services</div>
                    {renderServices()}
                    {renderPerformanceWindow()}
                    {renderPriceBlock(primaryPrice)}
                  </div>
                </div>

                {/* Option B */}
                <div>
                  <div className="option-label">Option B</div>
                  <div className="option-title">{option2PackageName}</div>
                  <div className="option-subtitle">{getPackageSubtitle(option2ConfigKey)}</div>

                  <div className="pkg-section-label">Musicians</div>
                  {renderMusicians(musicians2)}

                  <div className="price-block">
                    <div className="pkg-section-label" style={{ marginTop: 32 }}>Included Services</div>
                    {renderServices()}
                    {renderPerformanceWindow()}
                    {renderPriceBlock(option2Price)}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* ── SINGLE PACKAGE (A/B) ── */}
              <div className="section-label reveal">Your package</div>
              <div className="package-title reveal reveal-delay-1">{packageName}</div>
              <div className="package-subtitle reveal reveal-delay-1">{getPackageSubtitle(configKey)}</div>

              <div className="single-pkg-grid reveal reveal-delay-2">
                <div>
                  <div className="pkg-section-label">Musicians</div>
                  {renderMusicians(musicians1)}
                </div>
                <div>
                  <div className="pkg-section-label">Included Services</div>
                  {renderServices()}

                  {renderPerformanceWindow()}
                </div>
              </div>

              <div className="reveal reveal-delay-3">
                {renderPriceBlock(primaryPrice)}
              </div>
            </>
          )}
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══ EVENT DETAILS + COCKTAIL HOUR ═══ */}
      <section className="details-section">
        <div className="section-content">
          <div className="section-label reveal">Event details</div>
          <div className="details-title reveal reveal-delay-1">Your Evening</div>

          <div className="details-grid reveal reveal-delay-2">
            {[
              { label: "Couple", value: p2First ? `${p1First} & ${p2First}` : p1First },
              { label: "Date", value: dateLong },
              { label: "Venue", value: venue },
              { label: "Event Type", value: "Wedding Reception" },
              { label: "Cocktail Hour", value: hasCocktailTimes ? `${cocktailStart} to ${cocktailEnd}` : "Available upon request" },
              { label: "Reception", value: `${receptionStart} to ${receptionEnd}` },
              { label: "Configuration", value: getConfigLabel() },
              { label: "Services", value: "Entertainment + MC" },
            ].map((cell) => (
              <div key={cell.label} className="detail-cell">
                <div className="detail-label">{cell.label}</div>
                <div className="detail-value">{cell.value}</div>
              </div>
            ))}
          </div>

          {/* Cocktail Hour Add-On (B/D only) */}
          {showCocktail && (
            <div className="addon-section reveal reveal-delay-3">
              <div className="addon-title">Cocktail Hour</div>
              <div className="addon-desc">
                Live music during cocktails sets the tone before the reception begins. We offer acoustic arrangements tailored to the mood you want.
              </div>
              <div className="addon-options">
                <div className="addon-card">
                  <div className="addon-type">Solo</div>
                  <div className="addon-price">$1,250</div>
                </div>
                <div className="addon-card">
                  <div className="addon-type">Duo</div>
                  <div className="addon-price">$1,875</div>
                </div>
                <div className="addon-card">
                  <div className="addon-type">Trio</div>
                  <div className="addon-price">$2,500</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══ TESTIMONIALS ═══ */}
      <section className="testimonials-section">
        <div className="section-content">
          <div className="section-label reveal">What couples say</div>

          <div className="testimonial-block reveal reveal-delay-1">
            <div className="testimonial-quote-mark">&ldquo;</div>
            <div className="testimonial-text">
              Our wedding guests danced the night away like I've never seen before.
            </div>
            <div className="testimonial-stars">★ ★ ★ ★ ★</div>
            <div className="testimonial-attr">Emma B. &nbsp;&middot;&nbsp; WeddingWire</div>
          </div>

          <div className="testimonial-divider" />

          <div className="testimonial-block reveal reveal-delay-2">
            <div className="testimonial-quote-mark">&ldquo;</div>
            <div className="testimonial-text">
              You and the Greenway Band were a hit at the wedding at the Grand Galvez. From start to finish, the songs, the sound, and the look of the band were all just amazing. You left our guests wanting more.
            </div>
            <div className="testimonial-stars">★ ★ ★ ★ ★</div>
            <div className="testimonial-attr">Allison &nbsp;&middot;&nbsp; WeddingWire</div>
          </div>

          <div className="testimonial-divider" />

          <div className="testimonial-block reveal reveal-delay-3">
            <div className="testimonial-quote-mark">&ldquo;</div>
            <div className="testimonial-text">
              Every guest was on their feet by the second song. We still have people texting us about the band three months later.
            </div>
            <div className="testimonial-stars">★ ★ ★ ★ ★</div>
            <div className="testimonial-attr">Sarah &amp; James H. &nbsp;&middot;&nbsp; WeddingWire</div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══ NEXT STEPS ═══ */}
      <section className="steps-section">
        <div className="section-content">
          <div className="section-label reveal">Next steps</div>

          <div className="step-block reveal reveal-delay-1">
            <div className="step-number">Step 01</div>
            <div className="step-title">Schedule a call</div>
            <div className="step-desc">Let&rsquo;s walk through the details together.</div>
          </div>

          <div className="step-block reveal reveal-delay-2">
            <div className="step-number">Step 02</div>
            <div className="step-title">Review your contract</div>
            <div className="step-desc">We&rsquo;ll send everything over once we&rsquo;ve connected.</div>
          </div>

          <div className="step-block reveal reveal-delay-3">
            <div className="step-number">Step 03</div>
            <div className="step-title">Reserve your date</div>
            <div className="step-desc">A 50% deposit locks in your evening.</div>
          </div>

          <div className="steps-contact reveal reveal-delay-4">
            <p>adrian@greenwayband.com</p>
            <p>(281) 467 1226</p>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══ CLOSING ═══ */}
      <section className="closing">
        <div className="closing-phrase reveal">Your guests won&rsquo;t stop talking about it.</div>
        <div className="closing-rule reveal reveal-delay-1" />
        <div className="closing-contact reveal reveal-delay-2">
          <p>Adrian Michael</p>
          <p><a href="mailto:adrian@greenwayband.com">adrian@greenwayband.com</a></p>
          <p>(281) 467 1226</p>
        </div>
        <div className="closing-website reveal reveal-delay-3">greenwayband.com</div>

        <div className="closing-logo reveal reveal-delay-4">
          <div className="cover-rule" style={{ marginBottom: 16 }} />
          <div className="logo-the">THE</div>
          <div className="logo-name">GREENWAY</div>
          <div className="logo-band">BAND</div>
          <div className="cover-rule" style={{ marginTop: 12 }} />
        </div>

        <div className="closing-validity reveal reveal-delay-5">
          This proposal is valid for 30 days from date of receipt.
        </div>
      </section>
    </div>
  );
};

export default ProposalPublic;
