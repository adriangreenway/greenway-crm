import React, { useState, useEffect, useRef, useCallback } from "react";

// ── Band configurations: grouped roles with counts (matching Blick PDF / locked template) ──
const BAND_CONFIGS = {
  '6pc': [
    { role: 'Lead Vocals', count: 1 },
    { role: 'Keys', count: 1 },
    { role: 'Guitar', count: 1 },
    { role: 'Bass', count: 1 },
    { role: 'Drums', count: 1 },
    { role: 'Tracks / Production', count: 1 },
  ],
  '8pc': [
    { role: 'Male Vocals', count: 1 },
    { role: 'Female Vocals', count: 1 },
    { role: 'Keys', count: 1 },
    { role: 'Guitar', count: 1 },
    { role: 'Bass', count: 1 },
    { role: 'Drums', count: 1 },
    { role: 'Saxophone', count: 1 },
    { role: 'Tracks / Production', count: 1 },
  ],
  '10pc': [
    { role: 'Male Vocals', count: 1 },
    { role: 'Female Vocals', count: 2 },
    { role: 'Keys', count: 1 },
    { role: 'Guitar', count: 1 },
    { role: 'Bass', count: 1 },
    { role: 'Drums', count: 1 },
    { role: 'Horns', count: 3 },
  ],
  '12pc': [
    { role: 'Male Vocals', count: 1 },
    { role: 'Female Vocals', count: 2 },
    { role: 'Keys', count: 1 },
    { role: 'Guitar', count: 2 },
    { role: 'Bass', count: 1 },
    { role: 'Drums', count: 1 },
    { role: 'Percussion', count: 1 },
    { role: 'Horns', count: 3 },
  ],
  '14pc': [
    { role: 'Male Vocals', count: 2 },
    { role: 'Female Vocals', count: 2 },
    { role: 'Keys', count: 1 },
    { role: 'Guitar', count: 1 },
    { role: 'Bass', count: 1 },
    { role: 'Drums', count: 1 },
    { role: 'Percussion', count: 1 },
    { role: 'Horns', count: 5 },
  ],
};

const INCLUDED_SERVICES = [
  "Sound Equipment and Engineer",
  "Lighting Equipment and Engineer",
  "Emcee Services",
  "Personalized First Dances",
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
  if (!config) return '10pc';
  const num = parseInt(String(config).replace(/\D/g, ""), 10);
  return [6, 8, 10, 12, 14].includes(num) ? `${num}pc` : '10pc';
};

const getPackageName = (config, override) => {
  if (override?.package_name) return override.package_name;
  if (!config) return "Band";
  const num = config.replace(/\D/g, "");
  return num ? `${num} Piece Band` : config;
};

// ── Injected CSS (matches template exactly) ──
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
    --border-med: rgba(245,242,237,0.18);
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

  /* Scroll indicator */
  @keyframes gwScrollPulse {
    0%, 100% { opacity: 1; transform: translateX(-50%) translateY(0); }
    50% { opacity: 0.5; transform: translateX(-50%) translateY(4px); }
  }

  /* Skeleton pulse */
  @keyframes gwPulse {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.15; }
  }

  /* Dual package layout */
  .gw-proposal .gw-package-dual {
    display: grid;
    grid-template-columns: 1fr 1px 1fr;
    gap: 0;
    align-items: start;
  }
  .gw-proposal .gw-package-dual .gw-package-divider {
    background: var(--border-light);
    align-self: stretch;
    margin: 0 32px;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .gw-proposal .gw-package-dual {
      grid-template-columns: 1fr;
    }
    .gw-proposal .gw-package-dual .gw-package-divider {
      height: 1px;
      width: 100%;
      margin: 48px 0;
    }
  }
  @media (max-width: 600px) {
    .gw-proposal .gw-package-inner { grid-template-columns: 1fr !important; }
    .gw-proposal .gw-details-grid { grid-template-columns: 1fr !important; }
    .gw-proposal .gw-detail-cell { border-right: none !important; }
    .gw-proposal .gw-cover-names { font-size: 24px !important; }
    .gw-proposal .gw-section-content { padding: 0 24px !important; }
    .gw-proposal .gw-cover { padding: 48px 24px !important; }
    .gw-proposal .gw-price-amount { font-size: 32px !important; }
    .gw-proposal .gw-package-title { font-size: 24px !important; }
    .gw-proposal .gw-greeting { font-size: 22px !important; }
    .gw-proposal .gw-includes-grid { grid-template-columns: 1fr !important; }
  }

  .gw-proposal a { color: var(--cream-muted); text-decoration: none; }
  .gw-proposal a:hover { color: var(--cream); }
`;

// ── Logo Group Component ──
const LogoGroup = ({ small }) => (
  <div style={{ textAlign: "center" }}>
    <div
      style={{
        width: small ? 36 : 48,
        height: 0.5,
        background: "var(--cream-dim)",
        margin: "0 auto",
      }}
    />
    <div
      style={{
        fontFamily: "'Bodoni Moda', serif",
        fontSize: small ? 9 : 11,
        letterSpacing: small ? "8px" : "10px",
        textTransform: "uppercase",
        color: "var(--cream-dim)",
        marginTop: small ? 14 : 28,
        textIndent: small ? "8px" : "10px",
      }}
    >
      THE
    </div>
    <div
      style={{
        fontFamily: "'Bodoni Moda', serif",
        fontSize: small ? 20 : "clamp(28px, 8vw, 42px)",
        letterSpacing: small ? "4px" : "5px",
        textTransform: "uppercase",
        color: "var(--cream)",
        fontWeight: 400,
        margin: small ? "2px 0" : "4px 0",
        textIndent: small ? "4px" : "5px",
      }}
    >
      GREENWAY
    </div>
    <div
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: small ? 7 : 10,
        letterSpacing: small ? "12px" : "14px",
        textTransform: "uppercase",
        color: small ? "var(--cream-faint)" : "var(--cream-dim)",
        fontWeight: 400,
        textIndent: small ? "12px" : "14px",
      }}
    >
      BAND
    </div>
    <div
      style={{
        width: small ? 36 : 48,
        height: 0.5,
        background: "var(--cream-dim)",
        margin: small ? "12px auto 0" : "16px auto 0",
      }}
    />
  </div>
);

// ── Section Divider ──
const Divider = () => (
  <div style={{ width: "100%", height: 1, background: "var(--border-light)" }} />
);

// ── Section Label ──
const SectionLabel = ({ children, className }) => (
  <div
    className={className}
    style={{
      fontSize: 9,
      letterSpacing: "4px",
      textTransform: "uppercase",
      color: "var(--cream-faint)",
      marginBottom: 32,
    }}
  >
    {children}
  </div>
);

// ── Reusable Package Content (used in single and dual layouts) ──
const PackageContent = ({ name, configKey, receptionStart, receptionEnd, price, className }) => {
  const musicians = BAND_CONFIGS[configKey] || BAND_CONFIGS['10pc'];

  return (
    <div className={className}>
      {/* Package title */}
      <div
        className="gw-package-title"
        style={{
          fontFamily: "'Bodoni Moda', serif",
          fontSize: "clamp(24px, 5vw, 28px)",
          color: "var(--cream)",
          fontWeight: 400,
          marginBottom: 6,
        }}
      >
        {name}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "var(--cream-dim)",
          letterSpacing: "2px",
          textTransform: "uppercase",
          marginBottom: 48,
        }}
      >
        Full reception entertainment + MC services
      </div>

      {/* Two-column inner grid: Musicians | Services + Performance Window */}
      <div
        className="gw-package-inner"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 48,
        }}
      >
        {/* Left column: Musicians */}
        <div>
          <div
            style={{
              fontSize: 9,
              letterSpacing: "4px",
              textTransform: "uppercase",
              color: "var(--cream-faint)",
              marginBottom: 20,
            }}
          >
            Musicians
          </div>
          {musicians.map((m) => (
            <div
              key={m.role}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                fontSize: 13,
                color: "var(--cream)",
                padding: "10px 0",
                borderBottom: "0.5px solid var(--border)",
                fontWeight: 300,
              }}
            >
              <span>{m.role}</span>
              <span>{m.count}</span>
            </div>
          ))}
        </div>

        {/* Right column: Services + Performance Window */}
        <div>
          <div
            style={{
              fontSize: 9,
              letterSpacing: "4px",
              textTransform: "uppercase",
              color: "var(--cream-faint)",
              marginBottom: 20,
            }}
          >
            Included Services
          </div>
          {INCLUDED_SERVICES.map((s) => (
            <div
              key={s}
              style={{
                fontSize: 13,
                color: "var(--cream-muted)",
                padding: "10px 0",
                borderBottom: "0.5px solid var(--border)",
                fontWeight: 300,
              }}
            >
              {s}
            </div>
          ))}

          {/* Performance Window */}
          <div style={{ marginTop: 28 }}>
            <div
              style={{
                fontSize: 9,
                letterSpacing: "4px",
                textTransform: "uppercase",
                color: "var(--cream-faint)",
                marginBottom: 20,
              }}
            >
              Performance Window
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--cream-muted)",
                padding: "10px 0",
                borderBottom: "0.5px solid var(--border)",
                fontWeight: 300,
              }}
            >
              Reception: {receptionStart} to {receptionEnd}
            </div>
          </div>
        </div>
      </div>

      {/* Optional price (used in dual layout, Phase 3) */}
      {price && (
        <div
          style={{
            marginTop: 48,
            paddingTop: 28,
            borderTop: "0.5px solid var(--border-med)",
          }}
        >
          <div
            style={{
              fontSize: 9,
              letterSpacing: "4px",
              textTransform: "uppercase",
              color: "var(--cream-faint)",
              marginBottom: 12,
            }}
          >
            Investment
          </div>
          <div
            className="gw-price-amount"
            style={{
              fontFamily: "'Bodoni Moda', serif",
              fontSize: "clamp(28px, 7vw, 36px)",
              color: "var(--cream)",
              fontWeight: 400,
            }}
          >
            {price}
          </div>
        </div>
      )}
    </div>
  );
};

// ── ProposalPublic ──
const ProposalPublic = ({ slug }) => {
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const containerRef = useRef(null);
  const scrollHintRef = useRef(null);
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

    // Override body bg for this page
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

  // Intersection Observer for reveals
  useEffect(() => {
    if (loading || error) return;

    // Small delay to let DOM render
    const timer = setTimeout(() => {
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
        observerRef.current.observe(el);
      });

      // Cover elements visible immediately
      container.querySelectorAll(".gw-cover .reveal").forEach((el) => {
        setTimeout(() => el.classList.add("visible"), 200);
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [loading, error, proposal]);

  // Hide scroll hint on first scroll
  useEffect(() => {
    if (loading || error) return;
    let scrolled = false;
    const handleScroll = () => {
      if (!scrolled) {
        scrolled = true;
        const hint = scrollHintRef.current;
        if (hint) {
          hint.style.transition = "opacity 0.6s ease";
          hint.style.opacity = "0";
          setTimeout(() => {
            if (hint) hint.style.display = "none";
          }, 600);
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading, error]);

  // ── Loading State ──
  if (loading) {
    return (
      <div className="gw-proposal">
        <div
          className="gw-cover"
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
          <div style={{ marginBottom: 80 }}>
            <LogoGroup />
          </div>
          <div>
            <div
              style={{
                width: 160,
                height: 14,
                background: "var(--cream-faint)",
                borderRadius: 4,
                margin: "0 auto 12px",
                animation: "gwPulse 1.8s ease-in-out infinite",
              }}
            />
            <div
              style={{
                width: 220,
                height: 28,
                background: "var(--cream-faint)",
                borderRadius: 4,
                margin: "0 auto 16px",
                animation: "gwPulse 1.8s ease-in-out infinite 0.2s",
              }}
            />
            <div
              style={{
                width: 140,
                height: 12,
                background: "var(--cream-faint)",
                borderRadius: 4,
                margin: "0 auto",
                animation: "gwPulse 1.8s ease-in-out infinite 0.4s",
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Error State (branded 404) ──
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
            <LogoGroup />
          </div>
          <div
            style={{
              fontFamily: "'Bodoni Moda', serif",
              fontSize: "clamp(20px, 5vw, 26px)",
              color: "var(--cream)",
              fontWeight: 400,
              lineHeight: 1.4,
              maxWidth: 400,
              marginBottom: 40,
            }}
          >
            This proposal is no longer available.
          </div>
          <div
            style={{
              width: 36,
              height: 0.5,
              background: "var(--cream-dim)",
              margin: "0 auto 32px",
            }}
          />
          <div style={{ fontSize: 12, color: "var(--cream-dim)", letterSpacing: "1.5px", lineHeight: 2.4 }}>
            <p>Adrian Michael</p>
            <p>
              <a href="mailto:adrian@greenwayband.com">adrian@greenwayband.com</a>
            </p>
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
  const p1Full = `${p.partner1_first || ""} ${p.partner1_last || ""}`.trim();
  const p2Full = `${p.partner2_first || ""} ${p.partner2_last || ""}`.trim();
  const dateLong = formatDateLong(p.event_date);
  const venue = p.venue || "";
  const packageName = getPackageName(p.config, co);
  const configKey = getConfigKey(co?.package_name || p.config);
  const price = formatPrice(p.price);

  // Dual package support (new schema)
  const hasUpsell = !!co.upsell_package;
  const upsellName = co.upsell_package?.name || "";
  const upsellConfigKey = co.upsell_package?.config ? getConfigKey(co.upsell_package.config) : "10pc";
  const upsellPrice = co.upsell_package?.price ? formatPrice(co.upsell_package.price) : "";
  const primaryPrice = co.primary_package?.price ? formatPrice(co.primary_package.price) : price;
  const hasCocktail = !!(co.cocktail_start && co.cocktail_end);
  const cocktailStart = co.cocktail_start || "";
  const cocktailEnd = co.cocktail_end || "";
  const receptionStart = co.reception_start || "7:00 PM";
  const receptionEnd = co.reception_end || "11:00 PM";
  const introParagraph = co.intro_paragraph || "We're looking forward to bringing your evening to life.";

  const contentStyle = {
    maxWidth: 640,
    margin: "0 auto",
    padding: "0 32px",
  };

  return (
    <div className="gw-proposal" ref={containerRef}>
      {/* ════════════════════════════════════════ */}
      {/* SECTION 1: COVER                        */}
      {/* ════════════════════════════════════════ */}
      <section
        className="gw-cover"
        style={{
          minHeight: "100vh",
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          padding: "60px 32px",
          position: "relative",
        }}
      >
        <div className="reveal" style={{ marginBottom: 80 }}>
          <LogoGroup />
          <div
            style={{
              fontFamily: "'Bodoni Moda', serif",
              fontStyle: "italic",
              fontSize: 13,
              color: "var(--cream-dim)",
              marginTop: 20,
              letterSpacing: "1.5px",
            }}
          >
            The sound of a great night.
          </div>
        </div>

        <div className="reveal reveal-delay-2" style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 9,
              letterSpacing: "4px",
              textTransform: "uppercase",
              color: "var(--cream-faint)",
              marginBottom: 16,
            }}
          >
            Prepared for
          </div>
          <div
            className="gw-cover-names"
            style={{
              fontFamily: "'Bodoni Moda', serif",
              fontSize: "clamp(24px, 6vw, 32px)",
              color: "var(--cream)",
              fontWeight: 400,
              letterSpacing: "1px",
            }}
          >
            {p1First}{" "}
            <em
              style={{
                fontStyle: "italic",
                fontWeight: 400,
                color: "var(--cream-muted)",
                fontSize: "0.75em",
              }}
            >
              &amp;
            </em>{" "}
            {p2First}
          </div>
          <div
            style={{
              marginTop: 20,
              fontSize: 11,
              letterSpacing: "3px",
              textTransform: "uppercase",
              color: "var(--cream-dim)",
              lineHeight: 2.2,
            }}
          >
            {dateLong}
            <br />
            {venue}
          </div>
        </div>

        {/* Scroll hint */}
        <div
          ref={scrollHintRef}
          style={{
            position: "absolute",
            bottom: 80,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            animation: "gwScrollPulse 2.5s ease-in-out infinite",
          }}
        >
          <span
            style={{
              fontSize: 8,
              letterSpacing: "3px",
              textTransform: "uppercase",
              color: "var(--cream-faint)",
              opacity: 0.4,
            }}
          >
            Scroll
          </span>
          <div
            style={{
              width: 0.5,
              height: 24,
              background: "linear-gradient(to bottom, var(--cream-faint), transparent)",
              opacity: 0.3,
            }}
          />
        </div>

        {/* Cover footer */}
        <div
          style={{
            position: "absolute",
            bottom: 36,
            left: 0,
            right: 0,
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: 9,
              letterSpacing: "2px",
              textTransform: "uppercase",
              color: "var(--cream-faint)",
              opacity: 0.5,
            }}
          >
            greenwayband.com &nbsp;&middot;&nbsp; adrian@greenwayband.com
          </p>
        </div>
      </section>

      <Divider />

      {/* ════════════════════════════════════════ */}
      {/* SECTION 2: YOUR EVENING (Intro)         */}
      {/* ════════════════════════════════════════ */}
      <section style={{ padding: "80px 0" }}>
        <div className="gw-section-content" style={contentStyle}>
          <SectionLabel className="reveal">A note for you</SectionLabel>
          <div
            className="reveal reveal-delay-1 gw-greeting"
            style={{
              fontFamily: "'Bodoni Moda', serif",
              fontSize: "clamp(24px, 5vw, 32px)",
              color: "var(--cream)",
              fontWeight: 400,
              lineHeight: 1.35,
              marginBottom: 40,
            }}
          >
            {p1First} and {p2First},
            <br />
            congratulations.
          </div>

          <div
            className="reveal reveal-delay-2"
            style={{
              fontSize: 14,
              lineHeight: 1.9,
              color: "var(--cream-muted)",
              fontWeight: 300,
            }}
          >
            <p style={{ marginBottom: 20 }}>
              We know how much thought goes into every detail of your wedding, from the venue to the flowers to the food. The band is no different. It sets the tone for the entire night, and we take that seriously.
            </p>
            <p style={{ marginBottom: 20 }}>{introParagraph}</p>
            <p style={{ marginBottom: 20 }}>
              From your cocktail hour through the last song of the night, our job is simple: make it feel like yours. Every transition, every song choice, every moment on the mic is tailored to you and your guests. We read the room and respond in real time, and that is what separates a great band from a playlist.
            </p>
            <p>We would love to be part of your night.</p>
          </div>

          <div
            className="reveal reveal-delay-3"
            style={{
              marginTop: 48,
              paddingTop: 28,
              borderTop: "0.5px solid var(--border-light)",
            }}
          >
            <div
              style={{
                fontFamily: "'Bodoni Moda', serif",
                fontSize: 15,
                color: "var(--cream)",
                marginBottom: 4,
              }}
            >
              Adrian Michael
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--cream-dim)",
                letterSpacing: "2px",
                textTransform: "uppercase",
              }}
            >
              The Greenway Band
            </div>
          </div>
        </div>
      </section>

      <Divider />

      {/* ════════════════════════════════════════ */}
      {/* SECTION 3: YOUR BAND (Package)          */}
      {/* ════════════════════════════════════════ */}
      <section style={{ padding: "80px 0" }}>
        <div
          className="gw-section-content"
          style={{
            maxWidth: hasUpsell ? 900 : 640,
            margin: "0 auto",
            padding: "0 32px",
          }}
        >
          <SectionLabel className="reveal">Your band</SectionLabel>

          {hasUpsell ? (
            /* ── DUAL PACKAGE LAYOUT ── */
            <div className="reveal reveal-delay-1 gw-package-dual">
              <PackageContent
                name={packageName}
                configKey={configKey}
                receptionStart={receptionStart}
                receptionEnd={receptionEnd}
                price={primaryPrice}
              />
              <div className="gw-package-divider" />
              <PackageContent
                name={upsellName}
                configKey={upsellConfigKey}
                receptionStart={receptionStart}
                receptionEnd={receptionEnd}
                price={upsellPrice}
              />
            </div>
          ) : (
            /* ── SINGLE PACKAGE LAYOUT ── */
            <div className="reveal reveal-delay-1">
              <PackageContent
                name={packageName}
                configKey={configKey}
                receptionStart={receptionStart}
                receptionEnd={receptionEnd}
              />
            </div>
          )}
        </div>
      </section>

      <Divider />

      {/* ════════════════════════════════════════ */}
      {/* SECTION 4: THE EVENING (Timeline)       */}
      {/* ════════════════════════════════════════ */}
      <section style={{ padding: "80px 0" }}>
        <div className="gw-section-content" style={contentStyle}>
          <SectionLabel className="reveal">The evening</SectionLabel>
          <div
            className="reveal reveal-delay-1"
            style={{
              fontFamily: "'Bodoni Moda', serif",
              fontSize: "clamp(24px, 5vw, 28px)",
              color: "var(--cream)",
              fontWeight: 400,
              marginBottom: 8,
            }}
          >
            {dateLong}
          </div>
          <div
            className="reveal reveal-delay-1"
            style={{
              fontSize: 13,
              color: "var(--cream-dim)",
              letterSpacing: "2px",
              textTransform: "uppercase",
              marginBottom: 48,
            }}
          >
            {venue}
          </div>

          <div className="reveal reveal-delay-2" style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            {hasCocktail && (
              <div
                style={{
                  paddingBottom: 32,
                  borderBottom: "0.5px solid var(--border-light)",
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    letterSpacing: "4px",
                    textTransform: "uppercase",
                    color: "var(--cream-faint)",
                    marginBottom: 12,
                  }}
                >
                  Cocktail Hour
                </div>
                <div
                  style={{
                    fontFamily: "'Bodoni Moda', serif",
                    fontSize: 18,
                    color: "var(--cream)",
                    fontWeight: 400,
                  }}
                >
                  {cocktailStart} to {cocktailEnd}
                </div>
              </div>
            )}
            <div>
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: "4px",
                  textTransform: "uppercase",
                  color: "var(--cream-faint)",
                  marginBottom: 12,
                }}
              >
                Reception
              </div>
              <div
                style={{
                  fontFamily: "'Bodoni Moda', serif",
                  fontSize: 18,
                  color: "var(--cream)",
                  fontWeight: 400,
                }}
              >
                {receptionStart} to {receptionEnd}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════ */}
      {/* SECTION 5: INVESTMENT (single layout only) */}
      {/* In dual layout, price is shown per package */}
      {/* ════════════════════════════════════════ */}
      {!hasUpsell && (
        <>
          <Divider />
          <section style={{ padding: "80px 0" }}>
            <div className="gw-section-content" style={contentStyle}>
              <SectionLabel className="reveal">Investment</SectionLabel>

              {/* Price row */}
              <div
                className="reveal reveal-delay-1"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  padding: "28px 0",
                  borderTop: "0.5px solid var(--border-med)",
                  borderBottom: "0.5px solid var(--border-med)",
                  marginBottom: 40,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: "3px",
                    textTransform: "uppercase",
                    color: "var(--cream-dim)",
                  }}
                >
                  Total Investment
                </div>
                <div
                  className="gw-price-amount"
                  style={{
                    fontFamily: "'Bodoni Moda', serif",
                    fontSize: "clamp(28px, 7vw, 40px)",
                    color: "var(--cream)",
                    fontWeight: 400,
                  }}
                >
                  {price}
                </div>
              </div>

              {/* All inclusive */}
              <div
                className="reveal reveal-delay-2"
                style={{
                  fontSize: 13,
                  color: "var(--cream-muted)",
                  marginBottom: 32,
                  fontWeight: 300,
                }}
              >
                All inclusive
              </div>

              {/* Includes grid */}
              <div
                className="reveal reveal-delay-2 gw-includes-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 40,
                }}
              >
                {[
                  "Full PA and sound system",
                  "Stage lighting package",
                  "MC and emcee services",
                  "Music during breaks and transitions",
                  "Setup and breakdown",
                  ...(hasCocktail ? ["Sound for cocktail hour"] : []),
                ].map((item) => (
                  <div
                    key={item}
                    style={{
                      fontSize: 13,
                      color: "var(--cream-muted)",
                      padding: "12px 0",
                      borderBottom: "0.5px solid var(--border)",
                      fontWeight: 300,
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>

              {/* Payment terms */}
              <div
                className="reveal reveal-delay-3"
                style={{
                  fontSize: 11,
                  color: "var(--cream-faint)",
                  lineHeight: 2,
                  fontWeight: 300,
                }}
              >
                <p>50% deposit to reserve your date</p>
                <p>Balance due 30 days before event</p>
              </div>

              {/* Note */}
              <div
                className="reveal reveal-delay-4"
                style={{
                  fontSize: 11,
                  color: "var(--cream-faint)",
                  lineHeight: 1.8,
                  marginTop: 28,
                  fontWeight: 300,
                }}
              >
                Additional instrumentation available upon request. Travel fee may apply for events over 50 miles from Houston.
              </div>
            </div>
          </section>
        </>
      )}

      <Divider />

      {/* ════════════════════════════════════════ */}
      {/* SECTION 6: EVENT DETAILS                */}
      {/* ════════════════════════════════════════ */}
      <section style={{ padding: "80px 0" }}>
        <div className="gw-section-content" style={contentStyle}>
          <SectionLabel className="reveal">Event details</SectionLabel>
          <div
            className="reveal reveal-delay-1"
            style={{
              fontFamily: "'Bodoni Moda', serif",
              fontSize: "clamp(24px, 5vw, 28px)",
              color: "var(--cream)",
              fontWeight: 400,
              marginBottom: 40,
            }}
          >
            Your Evening
          </div>

          <div
            className="reveal reveal-delay-2 gw-details-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 0,
              border: "0.5px solid var(--border-light)",
              marginBottom: 48,
            }}
          >
            {[
              { label: "Couple", value: p2Full ? `${p1Full} & ${p2Full}` : p1Full },
              { label: "Date", value: dateLong },
              { label: "Venue", value: venue },
              { label: "Event Type", value: "Wedding Reception" },
              ...(hasCocktail
                ? [{ label: "Cocktail Hour", value: `${cocktailStart} to ${cocktailEnd}` }]
                : []),
              { label: "Reception", value: `${receptionStart} to ${receptionEnd}` },
              { label: "Configuration", value: packageName },
              { label: "Services", value: "Entertainment + MC" },
            ].map((cell, i) => (
              <div
                key={cell.label}
                className="gw-detail-cell"
                style={{
                  padding: "24px 28px",
                  borderBottom: "0.5px solid var(--border)",
                  borderRight: "0.5px solid var(--border)",
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    letterSpacing: "3px",
                    textTransform: "uppercase",
                    color: "var(--cream-faint)",
                    marginBottom: 8,
                  }}
                >
                  {cell.label}
                </div>
                <div
                  style={{
                    fontFamily: "'Bodoni Moda', serif",
                    fontSize: 15,
                    color: "var(--cream)",
                    fontWeight: 400,
                  }}
                >
                  {cell.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* ════════════════════════════════════════ */}
      {/* SECTION 7: NEXT STEPS                   */}
      {/* ════════════════════════════════════════ */}
      <section style={{ padding: "80px 0" }}>
        <div className="gw-section-content" style={contentStyle}>
          <SectionLabel className="reveal">Next steps</SectionLabel>

          <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
            {[
              {
                num: "01",
                title: "Schedule a call",
                desc: "Let's walk through the details together.",
              },
              {
                num: "02",
                title: "Review your contract",
                desc: "We'll send everything over once we've connected.",
              },
              {
                num: "03",
                title: "Reserve your date",
                desc: "A 50% deposit locks in your evening.",
              },
            ].map((step, i) => (
              <div
                key={step.num}
                className={`reveal reveal-delay-${i + 1}`}
                style={{
                  paddingBottom: 36,
                  borderBottom: i < 2 ? "0.5px solid var(--border-light)" : "none",
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    letterSpacing: "3px",
                    textTransform: "uppercase",
                    color: "var(--cream-faint)",
                    marginBottom: 12,
                  }}
                >
                  Step {step.num}
                </div>
                <div
                  style={{
                    fontFamily: "'Bodoni Moda', serif",
                    fontSize: 20,
                    color: "var(--cream)",
                    fontWeight: 400,
                    marginBottom: 8,
                  }}
                >
                  {step.title}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--cream-dim)",
                    fontWeight: 300,
                    lineHeight: 1.6,
                  }}
                >
                  {step.desc}
                </div>
              </div>
            ))}
          </div>

          {/* Contact */}
          <div
            className="reveal reveal-delay-4"
            style={{
              marginTop: 48,
              paddingTop: 32,
              borderTop: "0.5px solid var(--border-light)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "var(--cream-dim)",
                letterSpacing: "1.5px",
                lineHeight: 2.4,
              }}
            >
              <p>
                <a href="mailto:adrian@greenwayband.com">adrian@greenwayband.com</a>
              </p>
              <p>(281) 467 1226</p>
            </div>
          </div>
        </div>
      </section>

      <Divider />

      {/* ════════════════════════════════════════ */}
      {/* SECTION 8: FOOTER                       */}
      {/* ════════════════════════════════════════ */}
      <section style={{ padding: "100px 0 80px", textAlign: "center" }}>
        <div className="gw-section-content" style={contentStyle}>
          <div
            className="reveal"
            style={{
              fontFamily: "'Bodoni Moda', serif",
              fontStyle: "italic",
              fontSize: "clamp(22px, 5vw, 26px)",
              color: "var(--cream)",
              lineHeight: 1.5,
              maxWidth: 360,
              margin: "0 auto 48px",
            }}
          >
            Your guests won't stop talking about it.
          </div>

          <div
            className="reveal reveal-delay-1"
            style={{
              width: 36,
              height: 0.5,
              background: "var(--cream-dim)",
              margin: "0 auto 36px",
            }}
          />

          <div
            className="reveal reveal-delay-2"
            style={{
              fontSize: 12,
              color: "var(--cream-dim)",
              letterSpacing: "1.5px",
              lineHeight: 2.4,
            }}
          >
            <p>Adrian Michael</p>
            <p>
              <a href="mailto:adrian@greenwayband.com">adrian@greenwayband.com</a>
            </p>
            <p>(281) 467 1226</p>
          </div>

          <div
            className="reveal reveal-delay-3"
            style={{
              fontSize: 12,
              letterSpacing: "3px",
              textTransform: "uppercase",
              color: "var(--cream-muted)",
              marginTop: 20,
            }}
          >
            greenwayband.com
          </div>

          {/* Closing logo */}
          <div className="reveal reveal-delay-4" style={{ marginTop: 64 }}>
            <LogoGroup small />
          </div>

          <div
            className="reveal reveal-delay-5"
            style={{
              marginTop: 48,
              fontSize: 9,
              letterSpacing: "2px",
              textTransform: "uppercase",
              color: "var(--cream-faint)",
              opacity: 0.5,
            }}
          >
            This proposal is valid for 30 days from date of receipt.
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProposalPublic;
