import React, { useState, useMemo, useCallback } from "react";
import { COLORS, FONTS, RADII, SHADOWS } from "../tokens";
import Icon from "../icons";
import { BrandBadge } from "./Badge";
import SlideOverPanel from "./SlideOverPanel";
import EmptyState from "./EmptyState";
import { callClaude, getApiKey, hasApiKey } from "../utils/claudeApi";

// ── Constants ──────────────────────────────────────────────

const POST_TYPE_COLORS = {
  highlight: COLORS.black,
  bts: COLORS.teal,
  testimonial: COLORS.green,
  spotlight: COLORS.purple,
  promo: COLORS.amber,
  other: COLORS.textMuted,
};

const POST_TYPE_LABELS = {
  highlight: "Highlight",
  bts: "Behind the Scenes",
  testimonial: "Testimonial",
  spotlight: "Spotlight",
  promo: "Promo",
  other: "Other",
};

const STATUS_COLORS = {
  draft: COLORS.textLight,
  review: COLORS.amber,
  approved: COLORS.green,
  posted: COLORS.black,
};

const STATUS_LABELS = {
  draft: "Draft",
  review: "In Review",
  approved: "Approved",
  posted: "Posted",
};

const STATUS_ORDER = ["draft", "review", "approved", "posted"];

const EMPTY_POST = {
  title: "",
  caption: "",
  post_type: "highlight",
  platform: "instagram",
  status: "draft",
  scheduled_date: "",
  posted_date: null,
  image_url: null,
  gallery_photo_id: null,
  brand: "Greenway",
  ai_prompt: "",
  notes: "",
};

// ── Shared styles ──────────────────────────────────────────

const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  fontSize: 13,
  border: `1px solid ${COLORS.border}`,
  borderRadius: RADII.sm,
  outline: "none",
  fontFamily: FONTS.body,
  color: COLORS.text,
  background: COLORS.white,
};

const labelStyle = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: COLORS.textMuted,
  marginBottom: 5,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

// ── Small components ───────────────────────────────────────

const NavArrow = ({ direction, onClick }) => (
  <button
    onClick={onClick}
    style={{
      width: 32,
      height: 32,
      borderRadius: RADII.sm,
      border: `1px solid ${COLORS.border}`,
      background: COLORS.white,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "background 0.15s",
      transform: direction === "left" ? "scaleX(-1)" : undefined,
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.bg)}
    onMouseLeave={(e) => (e.currentTarget.style.background = COLORS.white)}
  >
    <Icon type="chevron" size={16} color={COLORS.textMuted} />
  </button>
);

const StatusDot = ({ status, size = 7 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: STATUS_COLORS[status] || COLORS.textLight,
      flexShrink: 0,
    }}
  />
);

const TypeBadge = ({ type }) => (
  <span
    style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: RADII.pill,
      fontSize: 10,
      fontWeight: 600,
      color: COLORS.white,
      background: POST_TYPE_COLORS[type] || COLORS.textMuted,
      lineHeight: "16px",
    }}
  >
    {POST_TYPE_LABELS[type] || type}
  </span>
);

const PostStatusBadge = ({ status }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "2px 8px",
      borderRadius: RADII.pill,
      fontSize: 10,
      fontWeight: 600,
      color: STATUS_COLORS[status] || COLORS.textLight,
      background: COLORS.bg,
      border: `1px solid ${COLORS.borderLight}`,
      lineHeight: "16px",
    }}
  >
    <StatusDot status={status} size={6} />
    {STATUS_LABELS[status] || status}
  </span>
);

const Toast = ({ message }) => (
  <div
    style={{
      position: "fixed",
      bottom: 24,
      right: 24,
      background: COLORS.charcoal,
      color: COLORS.white,
      padding: "10px 20px",
      borderRadius: RADII.md,
      fontSize: 13,
      fontWeight: 500,
      zIndex: 200,
      animation: "fadeUp 0.2s ease",
      display: "flex",
      alignItems: "center",
      gap: 8,
    }}
  >
    <Icon type="check" size={14} color={COLORS.green} />
    {message}
  </div>
);

// ── Calendar Day Cell ──────────────────────────────────────

const SocialDayCell = ({ day, posts, isToday, onClick }) => (
  <div
    onClick={onClick}
    style={{
      minHeight: 80,
      padding: 5,
      background: isToday ? COLORS.bg : COLORS.white,
      border: `1px solid ${isToday ? COLORS.black : COLORS.borderLight}`,
      borderRadius: RADII.sm,
      cursor: "pointer",
      transition: "background 0.1s",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}
    onMouseEnter={(e) => {
      if (!isToday) e.currentTarget.style.background = COLORS.bg;
    }}
    onMouseLeave={(e) => {
      if (!isToday) e.currentTarget.style.background = COLORS.white;
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 3,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: isToday || posts.length > 0 ? 700 : 500,
          color:
            isToday
              ? COLORS.black
              : posts.length > 0
                ? COLORS.black
                : COLORS.textMuted,
        }}
      >
        {day}
      </span>
      {posts.some((p) => p.status === "review") && (
        <StatusDot status="review" size={6} />
      )}
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
      {posts.slice(0, 2).map((post) => (
        <div
          key={post.id}
          style={{
            padding: "1px 5px",
            borderRadius: 3,
            fontSize: 9,
            fontWeight: 600,
            lineHeight: "14px",
            background: POST_TYPE_COLORS[post.post_type] || COLORS.textMuted,
            color: COLORS.white,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {post.title || "Untitled"}
        </div>
      ))}
      {posts.length > 2 && (
        <span
          style={{
            fontSize: 9,
            color: COLORS.textMuted,
            fontWeight: 600,
            paddingLeft: 2,
          }}
        >
          +{posts.length - 2} more
        </span>
      )}
    </div>
  </div>
);

// ── Calendar View ──────────────────────────────────────────

const CalendarView = ({ posts, onEditPost, onNewPost }) => {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const postMap = useMemo(() => {
    const map = {};
    posts.forEach((post) => {
      if (!post.scheduled_date) return;
      const d = new Date(post.scheduled_date + "T00:00:00");
      if (d.getFullYear() !== viewYear || d.getMonth() !== viewMonth) return;
      const day = d.getDate();
      if (!map[day]) map[day] = [];
      map[day].push(post);
    });
    return map;
  }, [posts, viewYear, viewMonth]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startOffset = new Date(viewYear, viewMonth, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const isCurrentMonth =
    viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const goToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  const handleDayClick = (day) => {
    const dayPosts = postMap[day] || [];
    if (dayPosts.length >= 1) {
      onEditPost(dayPosts[0]);
    } else {
      const pad = (n) => String(n).padStart(2, "0");
      onNewPost(`${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`);
    }
  };

  return (
    <div
      style={{
        background: COLORS.white,
        border: `1px solid ${COLORS.border}`,
        borderRadius: RADII.lg,
        overflow: "hidden",
      }}
    >
      {/* Month navigation */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px",
          borderBottom: `1px solid ${COLORS.border}`,
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <NavArrow direction="left" onClick={prevMonth} />
          <NavArrow direction="right" onClick={nextMonth} />
          <span
            style={{
              fontFamily: FONTS.display,
              fontSize: 17,
              fontWeight: 600,
              color: COLORS.black,
              marginLeft: 8,
            }}
          >
            {monthLabel}
          </span>
        </div>
        {!isCurrentMonth && (
          <button
            onClick={goToToday}
            style={{
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 600,
              color: COLORS.textMuted,
              background: COLORS.bg,
              border: `1px solid ${COLORS.border}`,
              borderRadius: RADII.sm,
              cursor: "pointer",
              fontFamily: FONTS.body,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = COLORS.borderLight)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = COLORS.bg)
            }
          >
            Today
          </button>
        )}
      </div>

      {/* Weekday headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          padding: "8px 14px 6px",
          background: COLORS.bg,
          borderBottom: `1px solid ${COLORS.borderLight}`,
        }}
      >
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: COLORS.textLight,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              textAlign: "center",
              padding: "3px 0",
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 0,
          padding: 10,
          paddingTop: 6,
        }}
      >
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`pad-${i}`} style={{ minHeight: 80 }} />
        ))}
        {days.map((day) => {
          const isToday = isCurrentMonth && day === today.getDate();
          return (
            <SocialDayCell
              key={day}
              day={day}
              posts={postMap[day] || []}
              isToday={isToday}
              onClick={() => handleDayClick(day)}
            />
          );
        })}
      </div>
    </div>
  );
};

// ── Post Card (Queue / Drafts) ─────────────────────────────

const PostCard = ({ post, onEdit, onStatusChange }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const dateStr = post.scheduled_date
    ? new Date(post.scheduled_date + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "No date";

  return (
    <div
      style={{
        background: COLORS.white,
        border: `1px solid ${COLORS.borderLight}`,
        borderRadius: RADII.md,
        padding: 12,
        cursor: "pointer",
        transition: "box-shadow 0.15s",
        borderLeft: `3px solid ${POST_TYPE_COLORS[post.post_type] || COLORS.textMuted}`,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = SHADOWS.sm)}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
    >
      <div onClick={() => onEdit(post)} style={{ marginBottom: 8 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: COLORS.black,
            marginBottom: 4,
            lineHeight: 1.3,
          }}
        >
          {post.title || "Untitled Post"}
        </div>
        {post.caption && (
          <div
            style={{
              fontSize: 11,
              color: COLORS.textMuted,
              lineHeight: 1.4,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {post.caption}
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: 6,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 8,
        }}
      >
        <TypeBadge type={post.post_type} />
        <BrandBadge brand={post.brand} />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Icon type="calendar" size={11} color={COLORS.textMuted} />
          <span style={{ fontSize: 11, color: COLORS.textMuted }}>{dateStr}</span>
        </div>

        <div style={{ position: "relative" }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            style={{
              background: "none",
              border: `1px solid ${COLORS.border}`,
              borderRadius: RADII.sm,
              padding: "3px 8px",
              fontSize: 10,
              fontWeight: 600,
              color: COLORS.textMuted,
              cursor: "pointer",
              fontFamily: FONTS.body,
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.bg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            Move to...
          </button>

          {menuOpen && (
            <>
              <div
                style={{ position: "fixed", inset: 0, zIndex: 19 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                }}
              />
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "100%",
                  marginTop: 4,
                  background: COLORS.white,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: RADII.sm,
                  boxShadow: SHADOWS.md,
                  zIndex: 20,
                  minWidth: 120,
                  overflow: "hidden",
                }}
              >
                {STATUS_ORDER.filter((s) => s !== post.status).map((status) => (
                  <button
                    key={status}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStatusChange(post.id, status);
                      setMenuOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      width: "100%",
                      padding: "8px 12px",
                      background: "none",
                      border: "none",
                      fontSize: 12,
                      fontWeight: 500,
                      color: COLORS.text,
                      cursor: "pointer",
                      fontFamily: FONTS.body,
                      textAlign: "left",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = COLORS.bg)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "none")
                    }
                  >
                    <StatusDot status={status} size={6} />
                    {STATUS_LABELS[status]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Queue View (Kanban) ────────────────────────────────────

const QueueView = ({ posts, onEditPost, onStatusChange }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 16,
      minHeight: 400,
    }}
  >
    {STATUS_ORDER.map((status) => {
      const columnPosts = posts.filter((p) => p.status === status);
      return (
        <div key={status}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
              padding: "0 4px",
            }}
          >
            <StatusDot status={status} size={8} />
            <span
              style={{ fontSize: 12, fontWeight: 600, color: COLORS.black }}
            >
              {STATUS_LABELS[status]}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: COLORS.textMuted,
                background: COLORS.bg,
                borderRadius: RADII.pill,
                padding: "1px 8px",
              }}
            >
              {columnPosts.length}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              background: COLORS.bg,
              borderRadius: RADII.md,
              padding: 8,
              minHeight: 200,
              border: `1px solid ${COLORS.borderLight}`,
            }}
          >
            {columnPosts.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "24px 8px",
                  color: COLORS.textLight,
                  fontSize: 12,
                }}
              >
                No posts
              </div>
            )}
            {columnPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onEdit={onEditPost}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        </div>
      );
    })}
  </div>
);

// ── Drafts View ────────────────────────────────────────────

const DraftsView = ({ posts, onEditPost }) => {
  const drafts = posts.filter((p) => p.status === "draft" || p.status === "review");

  if (drafts.length === 0) {
    return (
      <EmptyState
        icon="file"
        title="No Drafts or Reviews"
        description="Create a new post to get started."
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {drafts.map((post) => {
        const dateStr = post.scheduled_date
          ? new Date(post.scheduled_date + "T00:00:00").toLocaleDateString(
              "en-US",
              { month: "short", day: "numeric", year: "numeric" }
            )
          : "No date";

        return (
          <div
            key={post.id}
            onClick={() => onEditPost(post)}
            style={{
              background: COLORS.white,
              border: `1px solid ${COLORS.border}`,
              borderRadius: RADII.md,
              padding: "14px 18px",
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = COLORS.bg)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = COLORS.white)
            }
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flex: 1,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: 4,
                  height: 32,
                  borderRadius: 2,
                  background:
                    POST_TYPE_COLORS[post.post_type] || COLORS.textMuted,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: COLORS.black,
                    marginBottom: 3,
                  }}
                >
                  {post.title || "Untitled Post"}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <TypeBadge type={post.post_type} />
                  <BrandBadge brand={post.brand} />
                  <span
                    style={{ fontSize: 11, color: COLORS.textMuted }}
                  >
                    {dateStr}
                  </span>
                </div>
              </div>
            </div>
            <Icon type="chevron" size={14} color={COLORS.textMuted} />
          </div>
        );
      })}
    </div>
  );
};

// ── Post Editor Panel ──────────────────────────────────────

const PostEditorPanel = ({
  post,
  isNew,
  onClose,
  onSave,
  onDelete,
  galleries,
  fetchGalleryPhotos,
}) => {
  const [form, setForm] = useState({ ...EMPTY_POST, ...post });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // AI drafter state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [aiError, setAiError] = useState(null);
  const [aiPrompt, setAiPrompt] = useState("");

  // Image picker state
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [selectedGalleryId, setSelectedGalleryId] = useState(null);
  const [galleryPhotos, setGalleryPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  const update = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleGallerySelect = async (galleryId) => {
    setSelectedGalleryId(galleryId);
    if (!galleryId) {
      setGalleryPhotos([]);
      return;
    }
    setLoadingPhotos(true);
    try {
      const photos = await fetchGalleryPhotos(galleryId);
      setGalleryPhotos(photos);
    } catch {
      setGalleryPhotos([]);
    }
    setLoadingPhotos(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form, isNew);
    } catch (err) {
      console.error("Save failed:", err);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(post.id);
    } catch (err) {
      console.error("Delete failed:", err);
    }
    setDeleting(false);
  };

  const handleGenerateCaption = async () => {
    if (!hasApiKey()) {
      setAiError("Add your Claude API key in Settings first.");
      return;
    }
    setAiLoading(true);
    setAiError(null);
    setAiResult("");

    const brandName =
      form.brand === "Kirby Collective"
        ? "Kirby Collective"
        : "The Greenway Band";

    const systemPrompt = `You are writing an Instagram caption for ${brandName}, a premium live wedding entertainment company in Houston, TX.

Voice rules:
- Warm, authentic, inviting tone
- Reference specific venues and couples when available
- No hyphens as dashes (use spaces: "10 piece" not "10-piece")
- Keep captions concise (under 150 words for Instagram)
- Include 3 to 5 relevant hashtags at the end
- No corporate speak or ad copy
- No emojis in the caption body. Hashtags at the end only.
- Sound like a real person who loves live music and celebrations`;

    const details = [
      form.title && `Post title: ${form.title}`,
      form.notes && `Notes: ${form.notes}`,
      form.post_type && `Post type: ${POST_TYPE_LABELS[form.post_type]}`,
      aiPrompt && `Additional direction: ${aiPrompt}`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const result = await callClaude({
        systemPrompt,
        userPrompt: `Write an Instagram caption for this post:\n${details}`,
        apiKey: getApiKey(),
        maxTokens: 500,
      });
      setAiResult(result);
    } catch (err) {
      setAiError(err.message);
    }
    setAiLoading(false);
  };

  const applyAiCaption = () => {
    update("caption", aiResult);
    setAiResult("");
  };

  return (
    <SlideOverPanel
      open
      onClose={onClose}
      title={isNew ? "New Post" : "Edit Post"}
      subtitle={isNew ? "Create a social media post" : form.title}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Title */}
        <div>
          <label style={labelStyle}>Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="Post title..."
            style={inputStyle}
          />
        </div>

        {/* Type + Platform + Brand */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 12,
          }}
        >
          <div>
            <label style={labelStyle}>Type</label>
            <select
              value={form.post_type}
              onChange={(e) => update("post_type", e.target.value)}
              style={inputStyle}
            >
              {Object.entries(POST_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Platform</label>
            <select
              value={form.platform}
              onChange={(e) => update("platform", e.target.value)}
              style={inputStyle}
            >
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="tiktok">TikTok</option>
              <option value="twitter">Twitter / X</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Brand</label>
            <select
              value={form.brand}
              onChange={(e) => update("brand", e.target.value)}
              style={inputStyle}
            >
              <option value="Greenway">Greenway</option>
              <option value="Kirby Collective">Kirby Collective</option>
            </select>
          </div>
        </div>

        {/* Status + Date */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <div>
            <label style={labelStyle}>Status</label>
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
              style={inputStyle}
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Scheduled Date</label>
            <input
              type="date"
              value={form.scheduled_date || ""}
              onChange={(e) => update("scheduled_date", e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Caption */}
        <div>
          <label style={labelStyle}>Caption</label>
          <textarea
            value={form.caption}
            onChange={(e) => update("caption", e.target.value)}
            placeholder="Write your caption..."
            rows={5}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
          />
        </div>

        {/* AI Caption Drafter */}
        <div
          style={{
            background: COLORS.bg,
            border: `1px solid ${COLORS.borderLight}`,
            borderRadius: RADII.md,
            padding: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 12,
            }}
          >
            <Icon type="spark" size={14} color={COLORS.black} />
            <span
              style={{ fontSize: 12, fontWeight: 600, color: COLORS.black }}
            >
              AI Caption Drafter
            </span>
          </div>

          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Add direction (optional): e.g., 'focus on the venue ambiance'"
            style={{ ...inputStyle, marginBottom: 8 }}
          />

          <button
            onClick={handleGenerateCaption}
            disabled={aiLoading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              background: COLORS.black,
              color: COLORS.white,
              border: "none",
              borderRadius: RADII.sm,
              fontSize: 12,
              fontWeight: 600,
              cursor: aiLoading ? "not-allowed" : "pointer",
              fontFamily: FONTS.body,
              opacity: aiLoading ? 0.7 : 1,
            }}
          >
            <Icon type="spark" size={12} color={COLORS.white} />
            {aiLoading ? "Generating..." : "Generate Caption"}
          </button>

          {aiError && (
            <div style={{ fontSize: 12, color: COLORS.red, marginTop: 8 }}>
              {aiError}
            </div>
          )}

          {aiResult && (
            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  background: COLORS.white,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: RADII.sm,
                  padding: 12,
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: COLORS.text,
                  whiteSpace: "pre-wrap",
                }}
              >
                {aiResult}
              </div>
              <button
                onClick={applyAiCaption}
                style={{
                  marginTop: 8,
                  padding: "6px 14px",
                  background: COLORS.green,
                  color: COLORS.white,
                  border: "none",
                  borderRadius: RADII.sm,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: FONTS.body,
                }}
              >
                Use This Caption
              </button>
            </div>
          )}
        </div>

        {/* Image Picker from Vault */}
        <div>
          <label style={labelStyle}>Image</label>
          {form.image_url ? (
            <div style={{ position: "relative" }}>
              <img
                src={form.image_url}
                alt=""
                style={{
                  width: "100%",
                  height: 180,
                  objectFit: "cover",
                  borderRadius: RADII.sm,
                  border: `1px solid ${COLORS.border}`,
                }}
              />
              <button
                onClick={() => {
                  update("image_url", null);
                  update("gallery_photo_id", null);
                }}
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.6)",
                  border: "none",
                  color: COLORS.white,
                  fontSize: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowImagePicker(!showImagePicker)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 16px",
                  background: COLORS.white,
                  border: `1px dashed ${COLORS.border}`,
                  borderRadius: RADII.sm,
                  fontSize: 12,
                  fontWeight: 600,
                  color: COLORS.textMuted,
                  cursor: "pointer",
                  fontFamily: FONTS.body,
                  width: "100%",
                  justifyContent: "center",
                }}
              >
                <Icon type="image" size={14} color={COLORS.textMuted} />
                {showImagePicker ? "Close Picker" : "Pick from Vault"}
              </button>

              <div style={{ marginTop: 8 }}>
                <input
                  type="text"
                  placeholder="Paste image URL..."
                  style={inputStyle}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const val = e.target.value.trim();
                      if (val) {
                        update("image_url", val);
                        update("gallery_photo_id", null);
                        e.target.value = "";
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const val = e.target.value.trim();
                    if (val) {
                      update("image_url", val);
                      update("gallery_photo_id", null);
                      e.target.value = "";
                    }
                  }}
                />
              </div>

              {showImagePicker && (
                <div
                  style={{
                    marginTop: 8,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: RADII.sm,
                    padding: 12,
                    background: COLORS.bg,
                  }}
                >
                  <select
                    value={selectedGalleryId || ""}
                    onChange={(e) =>
                      handleGallerySelect(e.target.value || null)
                    }
                    style={{ ...inputStyle, marginBottom: 8 }}
                  >
                    <option value="">Select a gallery...</option>
                    {(galleries || []).map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>

                  {loadingPhotos && (
                    <div
                      style={{
                        textAlign: "center",
                        padding: 16,
                        color: COLORS.textMuted,
                        fontSize: 12,
                      }}
                    >
                      Loading photos...
                    </div>
                  )}

                  {!loadingPhotos && galleryPhotos.length > 0 && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: 6,
                        maxHeight: 200,
                        overflow: "auto",
                      }}
                    >
                      {galleryPhotos.map((photo) => (
                        <div
                          key={photo.id}
                          onClick={() => {
                            update("image_url", photo.url);
                            update("gallery_photo_id", photo.id);
                            setShowImagePicker(false);
                          }}
                          style={{
                            aspectRatio: "1",
                            borderRadius: 4,
                            overflow: "hidden",
                            cursor: "pointer",
                            border: "2px solid transparent",
                            transition: "border-color 0.15s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.borderColor = COLORS.black)
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.borderColor = "transparent")
                          }
                        >
                          <img
                            src={photo.url}
                            alt=""
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {!loadingPhotos &&
                    selectedGalleryId &&
                    galleryPhotos.length === 0 && (
                      <div
                        style={{
                          textAlign: "center",
                          padding: 16,
                          color: COLORS.textMuted,
                          fontSize: 12,
                        }}
                      >
                        No photos in this gallery
                      </div>
                    )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Notes */}
        <div>
          <label style={labelStyle}>Notes</label>
          <textarea
            value={form.notes || ""}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Internal notes..."
            rows={3}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
          />
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: 10,
            paddingTop: 8,
            borderTop: `1px solid ${COLORS.borderLight}`,
          }}
        >
          <button
            onClick={handleSave}
            disabled={saving || !form.title}
            style={{
              flex: 1,
              padding: "10px 16px",
              background: COLORS.black,
              color: COLORS.white,
              border: "none",
              borderRadius: RADII.sm,
              fontSize: 13,
              fontWeight: 600,
              cursor: saving || !form.title ? "not-allowed" : "pointer",
              fontFamily: FONTS.body,
              opacity: saving || !form.title ? 0.6 : 1,
            }}
          >
            {saving ? "Saving..." : isNew ? "Create Post" : "Save Changes"}
          </button>
          {!isNew && (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                padding: "10px 16px",
                background: COLORS.white,
                color: COLORS.red,
                border: `1px solid ${COLORS.border}`,
                borderRadius: RADII.sm,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: FONTS.body,
              }}
            >
              Delete
            </button>
          )}
        </div>

        {/* Delete confirmation */}
        {confirmDelete && (
          <div
            style={{
              background: COLORS.redLight,
              border: `1px solid ${COLORS.red}`,
              borderRadius: RADII.sm,
              padding: 14,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{ fontSize: 12, fontWeight: 600, color: COLORS.red }}
            >
              Delete this post?
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  padding: "6px 12px",
                  background: COLORS.white,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: RADII.sm,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: FONTS.body,
                  color: COLORS.text,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  padding: "6px 12px",
                  background: COLORS.red,
                  color: COLORS.white,
                  border: "none",
                  borderRadius: RADII.sm,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: deleting ? "not-allowed" : "pointer",
                  fontFamily: FONTS.body,
                }}
              >
                {deleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        )}
      </div>
    </SlideOverPanel>
  );
};

// ── Main Component ─────────────────────────────────────────

const SocialContentStudio = ({
  socialPosts = [],
  createSocialPost,
  updateSocialPost,
  deleteSocialPost,
  galleries = [],
  fetchGalleryPhotos,
}) => {
  const [activeTab, setActiveTab] = useState("calendar");
  const [editingPost, setEditingPost] = useState(null);
  const [isNewPost, setIsNewPost] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleEditPost = useCallback((post) => {
    setEditingPost(post);
    setIsNewPost(false);
  }, []);

  const handleNewPost = useCallback((prefilledDate) => {
    setEditingPost({
      ...EMPTY_POST,
      scheduled_date: prefilledDate || "",
    });
    setIsNewPost(true);
  }, []);

  const handleSave = useCallback(
    async (formData, isNew) => {
      if (isNew) {
        const { id, created_at, updated_at, ...cleanData } = formData;
        await createSocialPost(cleanData);
        showToast("Post created");
      } else {
        await updateSocialPost(formData.id, formData);
        showToast("Post updated");
      }
      setEditingPost(null);
    },
    [createSocialPost, updateSocialPost]
  );

  const handleDelete = useCallback(
    async (id) => {
      await deleteSocialPost(id);
      setEditingPost(null);
      showToast("Post deleted");
    },
    [deleteSocialPost]
  );

  const handleStatusChange = useCallback(
    async (id, newStatus) => {
      await updateSocialPost(id, { status: newStatus });
      showToast(`Moved to ${STATUS_LABELS[newStatus]}`);
    },
    [updateSocialPost]
  );

  const tabs = [
    { id: "calendar", label: "Calendar" },
    { id: "queue", label: "Queue" },
    { id: "drafts", label: "Drafts" },
  ];

  return (
    <div>
      {/* Tab bar + New Post button */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 20,
            borderBottom: `1px solid ${COLORS.borderLight}`,
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "8px 0 10px",
                fontSize: 13,
                fontWeight: 600,
                color:
                  activeTab === tab.id ? COLORS.black : COLORS.textMuted,
                background: "none",
                border: "none",
                borderBottom:
                  activeTab === tab.id
                    ? `2px solid ${COLORS.black}`
                    : "2px solid transparent",
                cursor: "pointer",
                fontFamily: FONTS.body,
                transition: "color 0.15s",
                marginBottom: -1,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => handleNewPost("")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 18px",
            background: COLORS.black,
            color: COLORS.white,
            border: "none",
            borderRadius: RADII.pill,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: FONTS.body,
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <Icon type="plus" size={14} color={COLORS.white} />
          New Post
        </button>
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: 14,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        {Object.entries(POST_TYPE_LABELS).map(([key, label]) => (
          <div
            key={key}
            style={{ display: "flex", gap: 5, alignItems: "center" }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: POST_TYPE_COLORS[key],
              }}
            />
            <span
              style={{
                fontSize: 11,
                color: COLORS.textMuted,
                fontWeight: 600,
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* View content */}
      {activeTab === "calendar" && (
        <CalendarView
          posts={socialPosts}
          onEditPost={handleEditPost}
          onNewPost={handleNewPost}
        />
      )}
      {activeTab === "queue" && (
        <QueueView
          posts={socialPosts}
          onEditPost={handleEditPost}
          onStatusChange={handleStatusChange}
        />
      )}
      {activeTab === "drafts" && (
        <DraftsView posts={socialPosts} onEditPost={handleEditPost} />
      )}

      {/* Post editor panel */}
      {editingPost && (
        <PostEditorPanel
          post={editingPost}
          isNew={isNewPost}
          onClose={() => setEditingPost(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          galleries={galleries}
          fetchGalleryPhotos={fetchGalleryPhotos}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} />}
    </div>
  );
};

export default SocialContentStudio;
