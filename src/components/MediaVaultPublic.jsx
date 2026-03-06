import React, { useState, useEffect, useRef, useCallback } from "react";
import { COLORS, FONTS, RADII, SHADOWS, GLOBAL_CSS } from "../tokens";
import { supabase, supabaseConfigured } from "../hooks/useAuth";
import { seedGalleries } from "../data/socialSeed";

// ── Inject global CSS (for animations) ──
if (typeof document !== "undefined" && !document.getElementById("vault-global-css")) {
  const style = document.createElement("style");
  style.id = "vault-global-css";
  style.textContent = `
    ${GLOBAL_CSS}
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 50%, 90% { transform: translateX(-6px); }
      30%, 70% { transform: translateX(6px); }
    }
  `;
  document.head.appendChild(style);
}

// ══════════════════════════════════════
// Brand Logo Component
// ══════════════════════════════════════
const BrandLogo = ({ brand, size = "large" }) => {
  const isKC = brand === "Kirby Collective";
  const fontSize = size === "large" ? 19 : 14;
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontFamily: FONTS.display,
          fontSize,
          fontWeight: 600,
          letterSpacing: "0.02em",
          color: isKC ? COLORS.teal : COLORS.black,
        }}
      >
        {isKC ? "THE KIRBY COLLECTIVE" : "THE GREENWAY BAND"}
      </div>
    </div>
  );
};

// ══════════════════════════════════════
// 404 Page
// ══════════════════════════════════════
const NotFoundPage = () => (
  <div
    style={{
      minHeight: "100vh",
      background: COLORS.cream,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: FONTS.body,
    }}
  >
    <div style={{ textAlign: "center", maxWidth: 400, padding: 24 }}>
      <BrandLogo brand="Greenway" />
      <div
        style={{
          fontFamily: FONTS.display,
          fontSize: 28,
          fontWeight: 600,
          color: COLORS.black,
          marginTop: 40,
          marginBottom: 12,
        }}
      >
        Gallery Not Found
      </div>
      <div
        style={{
          fontFamily: FONTS.body,
          fontSize: 14,
          color: COLORS.textMuted,
          lineHeight: 1.6,
        }}
      >
        This gallery may have been removed or the link may be incorrect
      </div>
    </div>
  </div>
);

// ══════════════════════════════════════
// PIN Entry Screen
// ══════════════════════════════════════
const PinScreen = ({ gallery, onVerified }) => {
  const pinLength = gallery.pin.length;
  const [digits, setDigits] = useState(Array(pinLength).fill(""));
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);
  const inputRefs = useRef([]);

  const handleDigitChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    setError(false);

    if (value && index < pinLength - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto submit when all digits filled
    if (value && index === pinLength - 1) {
      const entered = next.join("");
      if (entered === gallery.pin) {
        onVerified();
      } else {
        setError(true);
        setShaking(true);
        setTimeout(() => {
          setShaking(false);
          setDigits(Array(pinLength).fill(""));
          inputRefs.current[0]?.focus();
        }, 800);
        setTimeout(() => setError(false), 1500);
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, pinLength);
    if (!pasted) return;
    const next = Array(pinLength).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    if (pasted.length === pinLength) {
      if (pasted === gallery.pin) {
        onVerified();
      } else {
        setError(true);
        setShaking(true);
        setTimeout(() => {
          setShaking(false);
          setDigits(Array(pinLength).fill(""));
          inputRefs.current[0]?.focus();
        }, 800);
        setTimeout(() => setError(false), 1500);
      }
    } else {
      inputRefs.current[Math.min(pasted.length, pinLength - 1)]?.focus();
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.cream,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONTS.body,
      }}
    >
      <div
        style={{
          background: COLORS.white,
          boxShadow: SHADOWS.lg,
          borderRadius: RADII.lg,
          padding: 48,
          width: 400,
          maxWidth: "90vw",
          textAlign: "center",
        }}
      >
        <BrandLogo brand={gallery.brand} />

        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: 18,
            fontWeight: 600,
            color: COLORS.black,
            marginTop: 28,
            marginBottom: 6,
          }}
        >
          {gallery.name}
        </div>

        {gallery.description && (
          <div
            style={{
              fontSize: 13,
              color: COLORS.textMuted,
              marginBottom: 32,
            }}
          >
            {gallery.description}
          </div>
        )}

        {!gallery.description && <div style={{ marginBottom: 32 }} />}

        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: COLORS.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 12,
          }}
        >
          Enter PIN
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "center",
            animation: shaking ? "shake 0.3s ease" : "none",
          }}
          onPaste={handlePaste}
        >
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              autoFocus={i === 0}
              style={{
                width: 56,
                height: 56,
                textAlign: "center",
                fontSize: 26,
                fontFamily: FONTS.display,
                fontWeight: 600,
                color: COLORS.black,
                background: COLORS.bg,
                border: `1px solid ${error ? COLORS.red : COLORS.border}`,
                borderRadius: RADII.sm,
                outline: "none",
                transition: "border-color 0.2s",
                caretColor: COLORS.black,
              }}
              onFocus={(e) => {
                if (!error) e.target.style.borderColor = COLORS.black;
              }}
              onBlur={(e) => {
                if (!error) e.target.style.borderColor = COLORS.border;
              }}
            />
          ))}
        </div>

        {error && (
          <div
            style={{
              fontSize: 12,
              color: COLORS.red,
              marginTop: 12,
              animation: "fadeIn 0.2s ease",
            }}
          >
            Incorrect PIN
          </div>
        )}

        <div
          style={{
            fontSize: 11,
            color: COLORS.textLight,
            marginTop: error ? 8 : 20,
          }}
        >
          Enter
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════
// Filter Pill
// ══════════════════════════════════════
const FilterPill = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: "6px 14px",
      borderRadius: RADII.pill,
      border: `1px solid ${active ? COLORS.black : COLORS.border}`,
      background: active ? COLORS.black : COLORS.white,
      color: active ? COLORS.white : COLORS.textMuted,
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer",
      fontFamily: FONTS.body,
      whiteSpace: "nowrap",
      transition: "all 0.15s",
    }}
  >
    {label}
  </button>
);

// ══════════════════════════════════════
// Lightbox
// ══════════════════════════════════════
const Lightbox = ({ photos, startIndex, onClose }) => {
  const [index, setIndex] = useState(startIndex);
  const touchStartX = useRef(null);

  const photo = photos[index];
  const total = photos.length;

  const goNext = useCallback(() => setIndex((i) => (i + 1) % total), [total]);
  const goPrev = useCallback(() => setIndex((i) => (i - 1 + total) % total), [total]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, goNext, goPrev]);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) {
      if (delta < 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
  };

  const navBtnStyle = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    width: 48,
    height: 48,
    borderRadius: "50%",
    border: "none",
    background: "rgba(255,255,255,0.15)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.15s",
    zIndex: 10,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.95)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 0.2s ease",
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Counter */}
      <div
        style={{
          position: "absolute",
          top: 20,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 12,
          color: "rgba(255,255,255,0.6)",
          fontFamily: FONTS.body,
          zIndex: 10,
        }}
      >
        {index + 1} / {total}
      </div>

      {/* Close */}
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "none",
          background: "rgba(255,255,255,0.15)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.25)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Prev */}
      {total > 1 && (
        <button
          onClick={goPrev}
          style={{ ...navBtnStyle, left: 16 }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.25)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      {/* Next */}
      {total > 1 && (
        <button
          onClick={goNext}
          style={{ ...navBtnStyle, right: 16 }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.25)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      {/* Photo */}
      <img
        key={photo.id}
        src={photo.url}
        alt={photo.caption || "Gallery photo"}
        style={{
          maxWidth: "90vw",
          maxHeight: "85vh",
          objectFit: "contain",
          borderRadius: 4,
          animation: "fadeIn 0.15s ease",
        }}
      />

      {/* Caption */}
      {photo.caption && (
        <div
          style={{
            color: COLORS.white,
            fontSize: 14,
            fontFamily: FONTS.body,
            maxWidth: 600,
            textAlign: "center",
            paddingTop: 16,
            lineHeight: 1.6,
          }}
        >
          {photo.caption}
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════
// Gallery Viewer (after PIN verified)
// ══════════════════════════════════════
const GalleryViewer = ({ gallery, photos }) => {
  const [filter, setFilter] = useState("All");
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);

  // Build filter options from photo tags
  const venues = [...new Set(photos.map((p) => p.venue).filter(Boolean))];
  const configs = [...new Set(photos.map((p) => p.config).filter(Boolean))];
  const hasFilters = venues.length > 0 || configs.length > 0;
  const filterOptions = ["All", ...venues, ...configs];

  // Filter photos
  const filtered = filter === "All"
    ? photos
    : photos.filter((p) => p.venue === filter || p.config === filter);

  const openLightbox = (photoIndex) => {
    // Find the index in the filtered array
    setLightboxIndex(photoIndex);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.white,
        fontFamily: FONTS.body,
      }}
    >
      {/* Header */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 60,
          background: COLORS.white,
          borderBottom: `1px solid ${COLORS.borderLight}`,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
        }}
      >
        <BrandLogo brand={gallery.brand} size="small" />
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: COLORS.black,
            fontFamily: FONTS.body,
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          {gallery.name}
        </div>
        <div
          style={{
            fontSize: 12,
            color: COLORS.textMuted,
          }}
        >
          {photos.length} photo{photos.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Content */}
      <div style={{ paddingTop: 60 }}>
        {/* Filter bar */}
        {hasFilters && (
          <div
            style={{
              padding: "12px 24px",
              display: "flex",
              gap: 8,
              overflowX: "auto",
              borderBottom: `1px solid ${COLORS.borderLight}`,
            }}
          >
            {filterOptions.map((f) => (
              <FilterPill
                key={f}
                label={f}
                active={filter === f}
                onClick={() => setFilter(f)}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {photos.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "120px 24px",
              textAlign: "center",
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke={COLORS.border}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <div
              style={{
                fontFamily: FONTS.display,
                fontSize: 18,
                fontWeight: 600,
                color: COLORS.black,
                marginTop: 20,
                marginBottom: 8,
              }}
            >
              This gallery is being prepared
            </div>
            <div
              style={{
                fontSize: 14,
                color: COLORS.textMuted,
                lineHeight: 1.6,
                maxWidth: 360,
              }}
            >
              Check back soon for photos from your event
            </div>
          </div>
        ) : (
          <>
            {/* Photo grid */}
            <div
              style={{
                padding: 24,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 4,
                }}
              >
                {/* Responsive override via media query class */}
                <style>{`
                  @media (max-width: 480px) {
                    .vault-photo-grid { grid-template-columns: 1fr !important; }
                  }
                  @media (min-width: 481px) and (max-width: 768px) {
                    .vault-photo-grid { grid-template-columns: repeat(2, 1fr) !important; }
                  }
                `}</style>
              </div>
              <div
                className="vault-photo-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 4,
                }}
              >
                {filtered.map((photo, i) => (
                  <div
                    key={photo.id}
                    onClick={() => openLightbox(i)}
                    onMouseEnter={() => setHoveredId(photo.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      borderRadius: 4,
                      overflow: "hidden",
                      cursor: "pointer",
                      transform: hoveredId === photo.id ? "scale(1.02)" : "scale(1)",
                      transition: "transform 0.2s ease",
                    }}
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption || "Gallery photo"}
                      loading="lazy"
                      style={{
                        width: "100%",
                        display: "block",
                        maxHeight: 500,
                        objectFit: "cover",
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: 24,
                textAlign: "center",
                borderTop: `1px solid ${COLORS.borderLight}`,
                marginTop: 24,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: COLORS.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 8,
                }}
              >
                Presented by {gallery.brand === "Kirby Collective" ? "The Kirby Collective" : "The Greenway Band"}
              </div>
              <BrandLogo brand={gallery.brand} size="small" />
            </div>
          </>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={filtered}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
};

// ══════════════════════════════════════
// MediaVaultPublic — main export
// ══════════════════════════════════════
export default function MediaVaultPublic({ slug }) {
  const [gallery, setGallery] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);

  // Load gallery by slug
  useEffect(() => {
    loadGallery();
  }, [slug]);

  const loadGallery = async () => {
    setLoading(true);

    // Check sessionStorage for prior verification
    const storageKey = `vault-${slug}-verified`;
    const wasVerified = sessionStorage.getItem(storageKey) === "true";

    let found = null;

    if (supabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("galleries")
          .select("*")
          .eq("slug", slug)
          .single();

        if (!error && data && data.is_active) {
          found = data;
        }
      } catch {
        // Supabase query failed, will try seed fallback
      }
    }

    // Seed fallback — when Supabase has no matching gallery or is not configured
    if (!found) {
      found = seedGalleries.find((g) => g.slug === slug && g.is_active) || null;
    }

    if (!found) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setGallery(found);

    if (wasVerified) {
      setPinVerified(true);
      if (supabaseConfigured && found.id && !String(found.id).startsWith("demo-")) {
        await loadPhotos(found.id);
      }
    }

    setLoading(false);
  };

  const loadPhotos = async (galleryId) => {
    if (!supabaseConfigured) {
      setPhotos([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("gallery_photos")
        .select("*")
        .eq("gallery_id", galleryId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (!error) setPhotos(data || []);
    } catch {
      setPhotos([]);
    }
  };

  const handlePinVerified = async () => {
    setPinVerified(true);
    sessionStorage.setItem(`vault-${slug}-verified`, "true");

    // Increment view count
    if (supabaseConfigured && gallery) {
      try {
        const { data } = await supabase
          .from("galleries")
          .select("view_count")
          .eq("id", gallery.id)
          .single();
        if (data) {
          await supabase
            .from("galleries")
            .update({ view_count: (data.view_count || 0) + 1 })
            .eq("id", gallery.id);
        }
      } catch {
        // Non critical
      }
      await loadPhotos(gallery.id);
    }
  };

  // Loading spinner
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: COLORS.cream,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONTS.body,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: `3px solid ${COLORS.border}`,
            borderTopColor: COLORS.black,
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
      </div>
    );
  }

  // 404
  if (notFound) {
    return <NotFoundPage />;
  }

  // PIN screen
  if (!pinVerified && gallery) {
    return <PinScreen gallery={gallery} onVerified={handlePinVerified} />;
  }

  // Gallery viewer
  if (pinVerified && gallery) {
    return <GalleryViewer gallery={gallery} photos={photos} />;
  }

  return <NotFoundPage />;
}
