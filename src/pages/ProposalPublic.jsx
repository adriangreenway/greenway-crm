import React, { useState, useEffect, useRef, useCallback } from "react";

// ── Band configurations: grouped roles with counts (matching gold standard) ──
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
  "Personalized First Dances",
  "Song Requests",
];

const TESTIMONIALS = [
  {
    quote: "From the first song to the last, our guests could not stop dancing. Adrian and his team read the room perfectly and kept the energy going all night.",
    couple: "Jessica & Mark",
    venue: "The Bell Tower on 34th",
  },
  {
    quote: "We still have guests telling us it was the best wedding they have ever been to. The band made it feel like a real party, not just a reception.",
    couple: "Lauren & David",
    venue: "The Astorian",
  },
  {
    quote: "The Greenway Band was the single best investment we made for our wedding. They brought the energy, the talent, and the professionalism we were looking for.",
    couple: "Priya & James",
    venue: "Hotel Granduca",
  },
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

  /* Instrument list */
  .gw-proposal .gw-instrument-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .gw-proposal .gw-instrument-list li {
    font-size: 14px;
    color: var(--cream-muted);
    padding: 10px 0;
    border-bottom: 0.5px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 300;
  }
  .gw-proposal .gw-instrument-list li:last-child {
    border-bottom: none;
  }
  .gw-proposal .gw-instrument-list li .gw-count {
    font-size: 11px;
    color: var(--cream-faint);
    letter-spacing: 1px;
  }

  /* Services list */
  .gw-proposal .gw-services-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .gw-proposal .gw-services-list li {
    font-size: 13px;
    color: var(--cream-muted);
    padding: 10px 0;
    border-bottom: 0.5px solid var(--border);
    font-weight: 300;
  }
  .gw-proposal .gw-services-list li:last-child {
    border-bottom: none;
  }

  /* Option column labels */
  .gw-proposal .gw-option-label {
    font-size: 9px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--cream-faint);
    margin-bottom: 12px;
  }
  .gw-proposal .gw-option-title {
    font-family: 'Bodoni Moda', serif;
    font-size: 22px;
    color: var(--cream);
    font-weight: 400;
    margin-bottom: 4px;
  }
  .gw-proposal .gw-option-subtitle {
    font-size: 11px;
    color: var(--cream-dim);
    letter-spacing: 1px;
    margin-bottom: 32px;
  }
  .gw-proposal .gw-col-label {
    font-size: 9px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--cream-faint);
    margin-bottom: 16px;
  }
  .gw-proposal .gw-price-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 24px 0;
    border-top: 0.5px solid var(--border-light);
    border-bottom: 0.5px solid var(--border-light);
    margin-top: 24px;
  }
  .gw-proposal .gw-price-label {
    font-size: 10px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--cream-dim);
  }
  .gw-proposal .gw-option-price {
    font-family: 'Bodoni Moda', serif;
    font-size: 28px;
    color: var(--cream);
    font-weight: 400;
  }
  .gw-proposal .gw-option-note {
    font-size: 11px;
    color: var(--cream-faint);
    line-height: 1.8;
    margin-top: 16px;
    font-weight: 300;
  }

  /* Responsive */
  @media (max-width: 600px) {
    .gw-proposal .gw-details-grid { grid-template-columns: 1fr !important; }
    .gw-proposal .gw-detail-cell { border-right: none !important; }
    .gw-proposal .gw-cover-names { font-size: 24px !important; }
    .gw-proposal .gw-section-content { padding: 0 24px !important; }
    .gw-proposal .gw-cover { padding: 48px 24px !important; }
    .gw-proposal .gw-price-amount { font-size: 32px !important; }
    .gw-proposal .gw-option-price { font-size: 24px !important; }
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

// ── Reusable Option Column (musicians + services only) ──
const OptionColumn = ({ label, name, configKey }) => {
  const musicians = BAND_CONFIGS[configKey] || BAND_CONFIGS['10 piece'];
  const subtitle = getPackageSubtitle(configKey);

  return (
    <div>
      {label && <div className="gw-option-label">{label}</div>}
      <div className="gw-option-title">{name}</div>
      <div className="gw-option-subtitle">{subtitle}</div>

      {/* Musicians */}
      <div className="gw-col-label">Musicians</div>
      <ul className="gw-instrument-list">
        {musicians.map((m) => (
          <li key={m.role}>
            {m.role}
            <span className="gw-count">{m.count}</span>
          </li>
        ))}
      </ul>

      {/* Included Services */}
      <div className="gw-col-label" style={{ marginTop: 28 }}>Included Services</div>
      <ul className="gw-services-list">
        {INCLUDED_SERVICES.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
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
  const dateLong = formatDateLong(p.event_date);
  const venue = p.venue || "";

  // Template type detection (backward compat: missing = Template A)
  let templateType = co.template_type || "A";
  if (!["A", "B", "C", "D"].includes(templateType)) templateType = "A";

  // Package (handle both old and new schemas)
  const configKey = getConfigKey(co.config || co.primary_package?.config || co.package_name || p.config);
  const packageName = co.package_name || co.primary_package?.name || getDisplayName(configKey);
  const primaryPrice = formatPrice(co.price ?? co.primary_package?.price ?? p.price);

  // Times (handle both 24h and 12h formats)
  const receptionStart = formatTime(co.reception_start || co.reception_start_24 || "19:00");
  const receptionEnd = formatTime(co.reception_end || co.reception_end_24 || "23:00");
  const cocktailStart = formatTime(co.cocktail_start || co.cocktail_start_24 || "");
  const cocktailEnd = formatTime(co.cocktail_end || co.cocktail_end_24 || "");
  const hasCocktailTimes = !!(cocktailStart && cocktailEnd);

  // Option 2 (C/D templates)
  const option2PackageName = co.option2_package_name || "The Greenway Band";
  const option2ConfigKey = co.option2_config ? getConfigKey(co.option2_config) : null;
  const option2Price = co.option2_price != null ? formatPrice(co.option2_price) : "";

  // Validate: C/D need option2 data
  if ((templateType === "C" || templateType === "D") && !option2ConfigKey) {
    console.warn("Template C/D missing option2 data, falling back to Template A");
    templateType = "A";
  }

  const showCocktailTimeline = (templateType === "B" || templateType === "D") && hasCocktailTimes;
  const showOption2 = templateType === "C" || templateType === "D";

  // Intro text (new schema: intro_text, old: intro_paragraph)
  const introText = co.intro_text || co.intro_paragraph
    || "We\u2019d love to be a part of your celebration. Here\u2019s everything you need to know about bringing the band to your event.";

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
            <p style={{ marginBottom: 20 }}>{introText}</p>
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
          style={contentStyle}
        >
          {showOption2 ? (
            /* ── TWO OPTIONS LAYOUT (C/D) ── */
            <>
              <SectionLabel className="reveal">Your options</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                <div className="reveal reveal-delay-1" style={{ paddingBottom: 48 }}>
                  <OptionColumn
                    label="Option 1"
                    name={packageName}
                    configKey={configKey}
                  />
                </div>
                <div
                  style={{
                    width: "100%",
                    height: 1,
                    background: "var(--border-light)",
                  }}
                />
                <div className="reveal reveal-delay-2" style={{ paddingTop: 48 }}>
                  <OptionColumn
                    label="Option 2"
                    name={option2PackageName}
                    configKey={option2ConfigKey}
                  />
                </div>
              </div>
            </>
          ) : (
            /* ── SINGLE PACKAGE LAYOUT (A/B) ── */
            <>
              <SectionLabel className="reveal">Your package</SectionLabel>
              <div className="reveal reveal-delay-1">
                <OptionColumn
                  name={packageName}
                  configKey={configKey}
                />
              </div>
            </>
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
            {showCocktailTimeline && (
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

      <Divider />

      {/* ════════════════════════════════════════ */}
      {/* SECTION 5: INVESTMENT                   */}
      {/* ════════════════════════════════════════ */}
      <section style={{ padding: "80px 0" }}>
        <div className="gw-section-content" style={contentStyle}>
          <SectionLabel className="reveal">Investment</SectionLabel>

          {showOption2 ? (
            <div className="reveal reveal-delay-1">
              <div className="gw-price-row" style={{ marginTop: 0 }}>
                <span className="gw-price-label">Option 1</span>
                <span className="gw-option-price">{primaryPrice}</span>
              </div>
              <div className="gw-price-row" style={{ borderTop: "none", marginTop: 0 }}>
                <span className="gw-price-label">Option 2</span>
                <span className="gw-option-price">{option2Price}</span>
              </div>
            </div>
          ) : (
            <div className="reveal reveal-delay-1">
              <div className="gw-price-row" style={{ marginTop: 0 }}>
                <span className="gw-price-label">Total</span>
                <span className="gw-option-price">{primaryPrice}</span>
              </div>
            </div>
          )}

          <div
            className="reveal reveal-delay-2 gw-option-note"
          >
            Additional instrumentation available upon request. Travel fee may apply for events over 50 miles from Houston.
          </div>
        </div>
      </section>

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
              { label: "Couple", value: p2First ? `${p1First} & ${p2First}` : p1First },
              { label: "Date", value: dateLong },
              { label: "Venue", value: venue },
              { label: "Event Type", value: "Wedding Reception" },
              { label: "Cocktail Hour", value: hasCocktailTimes ? `${cocktailStart} to ${cocktailEnd}` : "Available upon request" },
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
                  borderRight: i % 2 === 0 ? "0.5px solid var(--border)" : "none",
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
      {/* SECTION 6b: TESTIMONIALS                 */}
      {/* ════════════════════════════════════════ */}
      <section style={{ padding: "80px 0" }}>
        <div className="gw-section-content" style={contentStyle}>
          <SectionLabel className="reveal">What couples say</SectionLabel>

          <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className={`reveal reveal-delay-${Math.min(i + 1, 3)}`}
                style={{
                  paddingBottom: i < TESTIMONIALS.length - 1 ? 48 : 0,
                  borderBottom:
                    i < TESTIMONIALS.length - 1
                      ? "0.5px solid var(--border-light)"
                      : "none",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Bodoni Moda', serif",
                    fontStyle: "italic",
                    fontSize: "clamp(16px, 3.5vw, 18px)",
                    color: "var(--cream-muted)",
                    lineHeight: 1.8,
                    fontWeight: 400,
                    marginBottom: 20,
                  }}
                >
                  &ldquo;{t.quote}&rdquo;
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--cream)",
                      fontWeight: 500,
                      letterSpacing: "0.5px",
                    }}
                  >
                    {t.couple}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--cream-faint)",
                      fontWeight: 300,
                    }}
                  >
                    {t.venue}
                  </span>
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
                desc: "Let\u2019s walk through the details together.",
              },
              {
                num: "02",
                title: "Review your contract",
                desc: "We\u2019ll send everything over once we\u2019ve connected.",
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
            Your guests won&rsquo;t stop talking about it.
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
