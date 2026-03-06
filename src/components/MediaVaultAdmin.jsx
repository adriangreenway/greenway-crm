import React, { useState, useEffect, useRef, useCallback } from "react";
import { COLORS, FONTS, RADII, SHADOWS } from "../tokens";
import { BrandBadge, StatusBadge } from "./Badge";
import EmptyState from "./EmptyState";
import Icon from "../icons";
import { supabaseConfigured } from "../hooks/useAuth";

// ── Shared styles ──
const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  fontSize: 14,
  border: `1px solid ${COLORS.border}`,
  borderRadius: RADII.sm,
  outline: "none",
  fontFamily: FONTS.body,
  color: COLORS.text,
  background: COLORS.bg,
  transition: "border-color 0.15s",
};

const selectStyle = {
  ...inputStyle,
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236B6560' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
  paddingRight: 36,
};

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: COLORS.textMuted,
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const pillBtnStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 24px",
  background: COLORS.black,
  color: COLORS.white,
  border: "none",
  borderRadius: RADII.pill,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: FONTS.body,
};

// ── Toast notification ──
const Toast = ({ message, onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 2000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 32,
        left: "50%",
        transform: "translateX(-50%)",
        background: COLORS.black,
        color: COLORS.white,
        padding: "10px 24px",
        borderRadius: RADII.pill,
        fontSize: 13,
        fontWeight: 600,
        fontFamily: FONTS.body,
        zIndex: 9999,
        boxShadow: SHADOWS.lg,
        animation: "fadeUp 0.2s ease",
      }}
    >
      {message}
    </div>
  );
};

// ── Slug generator ──
function generateSlug(name) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const suffix = Math.random().toString(36).substr(2, 4);
  return `${base}-${suffix}`;
}

// ── Confirmation Modal ──
const ConfirmModal = ({ title, message, confirmLabel, onConfirm, onCancel, danger }) => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(10,10,9,0.4)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9000,
      animation: "fadeIn 0.15s ease",
    }}
    onClick={onCancel}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        background: COLORS.white,
        borderRadius: RADII.xl,
        padding: "32px 28px 24px",
        width: 400,
        maxWidth: "90vw",
        boxShadow: SHADOWS.lg,
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: COLORS.black,
          fontFamily: FONTS.body,
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 13,
          color: COLORS.textMuted,
          lineHeight: 1.6,
          marginBottom: 24,
        }}
      >
        {message}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          onClick={onCancel}
          style={{
            padding: "10px 20px",
            background: COLORS.white,
            color: COLORS.text,
            border: `1px solid ${COLORS.border}`,
            borderRadius: RADII.sm,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: FONTS.body,
          }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          style={{
            padding: "10px 20px",
            background: danger ? COLORS.red : COLORS.black,
            color: COLORS.white,
            border: "none",
            borderRadius: RADII.sm,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: FONTS.body,
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

// ── Photo Detail Editor (inline) ──
const PhotoDetailEditor = ({ photo, onSave, onClose }) => {
  const [form, setForm] = useState({
    caption: photo.caption || "",
    venue: photo.venue || "",
    config: photo.config || "",
    event_type: photo.event_type || "",
  });

  const handleBlur = (field) => {
    if (form[field] !== (photo[field] || "")) {
      onSave(photo.id, { [field]: form[field] || null });
    }
  };

  return (
    <div
      style={{
        background: COLORS.bg,
        border: `1px solid ${COLORS.border}`,
        borderRadius: RADII.sm,
        padding: 16,
        marginTop: 8,
        animation: "fadeUp 0.15s ease",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Caption</label>
          <input
            style={inputStyle}
            value={form.caption}
            onChange={(e) => setForm((p) => ({ ...p, caption: e.target.value }))}
            onBlur={() => handleBlur("caption")}
            placeholder="Photo caption"
          />
        </div>
        <div>
          <label style={labelStyle}>Venue</label>
          <input
            style={inputStyle}
            value={form.venue}
            onChange={(e) => setForm((p) => ({ ...p, venue: e.target.value }))}
            onBlur={() => handleBlur("venue")}
            placeholder="Venue name"
          />
        </div>
        <div>
          <label style={labelStyle}>Config</label>
          <select
            style={selectStyle}
            value={form.config}
            onChange={(e) => {
              setForm((p) => ({ ...p, config: e.target.value }));
              onSave(photo.id, { config: e.target.value || null });
            }}
          >
            <option value="">Select config</option>
            <option value="6 piece">6 piece</option>
            <option value="8 piece">8 piece</option>
            <option value="10 piece">10 piece</option>
            <option value="12 piece">12 piece</option>
            <option value="14 piece">14 piece</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Event Type</label>
          <select
            style={selectStyle}
            value={form.event_type}
            onChange={(e) => {
              setForm((p) => ({ ...p, event_type: e.target.value }));
              onSave(photo.id, { event_type: e.target.value || null });
            }}
          >
            <option value="">Select type</option>
            <option value="wedding">Wedding</option>
            <option value="corporate">Corporate</option>
            <option value="showcase">Showcase</option>
          </select>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
        <button
          onClick={onClose}
          style={{
            padding: "6px 16px",
            background: COLORS.white,
            color: COLORS.textMuted,
            border: `1px solid ${COLORS.border}`,
            borderRadius: RADII.sm,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: FONTS.body,
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════
// MediaVaultAdmin — main export
// ══════════════════════════════════════════
export default function MediaVaultAdmin({
  galleries,
  createGallery,
  updateGallery,
  deleteGallery,
  fetchGalleryPhotos,
  uploadGalleryPhoto,
  updateGalleryPhoto,
  deleteGalleryPhoto,
  deleteGalleryPhotos,
}) {
  // ── View state ──
  const [view, setView] = useState("list"); // "list" | "detail"
  const [selectedGallery, setSelectedGallery] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);

  // ── New gallery form ──
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newBrand, setNewBrand] = useState("Greenway");
  const [newDesc, setNewDesc] = useState("");

  // ── Detail state ──
  const [photos, setPhotos] = useState([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState(new Set());
  const [editingPhotoId, setEditingPhotoId] = useState(null);
  const [hoveredPhotoId, setHoveredPhotoId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  const showToast = useCallback((msg) => setToast(msg), []);

  // ── Load photos when entering detail view ──
  useEffect(() => {
    if (view === "detail" && selectedGallery) {
      loadPhotos(selectedGallery.id);
    }
  }, [view, selectedGallery?.id]);

  const loadPhotos = async (galleryId) => {
    setPhotosLoading(true);
    try {
      const data = await fetchGalleryPhotos(galleryId);
      setPhotos(data || []);
    } catch {
      setPhotos([]);
    } finally {
      setPhotosLoading(false);
    }
  };

  // ── Gallery CRUD ──
  const handleCreateGallery = async () => {
    if (!newName.trim() || !newPin.trim()) return;
    if (newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin)) {
      showToast("PIN must be 4 to 6 digits");
      return;
    }
    try {
      const slug = generateSlug(newName);
      await createGallery({
        name: newName.trim(),
        slug,
        pin: newPin,
        brand: newBrand,
        description: newDesc.trim() || null,
        is_active: true,
      });
      setShowNewForm(false);
      setNewName("");
      setNewPin("");
      setNewBrand("Greenway");
      setNewDesc("");
      showToast("Gallery created");
    } catch (err) {
      showToast("Error: " + err.message);
    }
  };

  const handleFieldSave = async (field, value) => {
    if (!selectedGallery) return;
    try {
      const updated = await updateGallery(selectedGallery.id, { [field]: value });
      setSelectedGallery((prev) => ({ ...prev, ...updated, [field]: value }));
      showToast("Saved");
    } catch (err) {
      showToast("Error: " + err.message);
    }
  };

  const handleDeleteGallery = () => {
    const photoCount = photos.length;
    setConfirmModal({
      title: "Delete this gallery?",
      message: `This will also delete all ${photoCount} photo${photoCount !== 1 ? "s" : ""}. This cannot be undone.`,
      confirmLabel: "Delete Gallery",
      danger: true,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await deleteGallery(selectedGallery.id);
          setView("list");
          setSelectedGallery(null);
          setPhotos([]);
          showToast("Gallery deleted");
        } catch (err) {
          showToast("Error: " + err.message);
        }
      },
    });
  };

  // ── Photo operations ──
  const handleFiles = async (files) => {
    if (!supabaseConfigured) {
      showToast("Connect Supabase to upload photos");
      return;
    }
    const validFiles = Array.from(files).filter((f) => {
      if (f.size > 10 * 1024 * 1024) {
        showToast(`${f.name} exceeds 10MB limit`);
        return false;
      }
      if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
        showToast(`${f.name}: unsupported format`);
        return false;
      }
      return true;
    });

    if (!validFiles.length) return;
    setUploading(true);
    setUploadProgress({ done: 0, total: validFiles.length });

    const uploaded = [];
    for (let i = 0; i < validFiles.length; i++) {
      try {
        const photo = await uploadGalleryPhoto(selectedGallery.id, validFiles[i]);
        uploaded.push(photo);
        setUploadProgress({ done: i + 1, total: validFiles.length });
      } catch (err) {
        showToast(`Upload failed: ${err.message}`);
      }
    }

    setUploading(false);
    if (uploaded.length) {
      setPhotos((prev) => [...prev, ...uploaded]);
      showToast(`${uploaded.length} photo${uploaded.length > 1 ? "s" : ""} uploaded`);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleSetCover = async (photo) => {
    try {
      await updateGallery(selectedGallery.id, { cover_photo_id: photo.id });
      setSelectedGallery((prev) => ({ ...prev, cover_photo_id: photo.id }));
      showToast("Cover photo set");
    } catch (err) {
      showToast("Error: " + err.message);
    }
  };

  const handlePhotoMetaSave = async (photoId, updates) => {
    try {
      const updated = await updateGalleryPhoto(photoId, updates);
      setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, ...updated } : p)));
      showToast("Saved");
    } catch (err) {
      showToast("Error: " + err.message);
    }
  };

  const handleDeletePhoto = (photo) => {
    setConfirmModal({
      title: "Delete photo?",
      message: "This photo will be permanently removed.",
      confirmLabel: "Delete",
      danger: true,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await deleteGalleryPhoto(photo.id, photo.storage_path, selectedGallery.id);
          setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
          if (selectedGallery.cover_photo_id === photo.id) {
            setSelectedGallery((prev) => ({ ...prev, cover_photo_id: null }));
          }
          showToast("Photo deleted");
        } catch (err) {
          showToast("Error: " + err.message);
        }
      },
    });
  };

  const handleBatchDelete = () => {
    const count = selectedPhotos.size;
    setConfirmModal({
      title: `Delete ${count} photo${count > 1 ? "s" : ""}?`,
      message: "These photos will be permanently removed.",
      confirmLabel: `Delete ${count} Photo${count > 1 ? "s" : ""}`,
      danger: true,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const toDelete = photos
            .filter((p) => selectedPhotos.has(p.id))
            .map((p) => ({ id: p.id, storagePath: p.storage_path }));
          await deleteGalleryPhotos(toDelete, selectedGallery.id);
          setPhotos((prev) => prev.filter((p) => !selectedPhotos.has(p.id)));
          setSelectedPhotos(new Set());
          showToast(`${count} photo${count > 1 ? "s" : ""} deleted`);
        } catch (err) {
          showToast("Error: " + err.message);
        }
      },
    });
  };

  const togglePhotoSelect = (photoId) => {
    setSelectedPhotos((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => showToast("Link copied"));
  };

  const getPublicUrl = (slug) => {
    const base = window.location.origin;
    return `${base}/vault/${slug}`;
  };

  // ── Cover photo URL helper ──
  const getCoverUrl = (gallery) => {
    if (!gallery.cover_photo_id) return null;
    // Photos are only loaded in detail view; for list we don't have them
    // so return null (placeholder shown)
    return null;
  };

  // ══════════════════════════════════════
  // RENDER: Gallery Detail View
  // ══════════════════════════════════════
  if (view === "detail" && selectedGallery) {
    const g = selectedGallery;
    return (
      <div style={{ animation: "fadeUp 0.3s ease" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <button
            onClick={() => {
              setView("list");
              setSelectedGallery(null);
              setPhotos([]);
              setSelectedPhotos(new Set());
              setEditingPhotoId(null);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: RADII.sm,
              border: `1px solid ${COLORS.border}`,
              background: COLORS.white,
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.bg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = COLORS.white)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: COLORS.black,
              fontFamily: FONTS.body,
              margin: 0,
            }}
          >
            {g.name}
          </h2>
        </div>

        {/* Settings Section */}
        <div
          style={{
            background: COLORS.white,
            border: `1px solid ${COLORS.border}`,
            borderRadius: RADII.lg,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: COLORS.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 16,
            }}
          >
            Gallery Settings
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Name */}
            <div>
              <label style={labelStyle}>Gallery Name</label>
              <input
                style={inputStyle}
                defaultValue={g.name}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== g.name) handleFieldSave("name", v);
                }}
              />
            </div>

            {/* PIN */}
            <div>
              <label style={labelStyle}>PIN</label>
              <input
                style={inputStyle}
                defaultValue={g.pin}
                maxLength={6}
                pattern="[0-9]*"
                inputMode="numeric"
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== g.pin && /^\d{4,6}$/.test(v)) handleFieldSave("pin", v);
                  else if (v && !/^\d{4,6}$/.test(v)) showToast("PIN must be 4 to 6 digits");
                }}
              />
            </div>

            {/* Brand */}
            <div>
              <label style={labelStyle}>Brand</label>
              <select
                style={selectStyle}
                defaultValue={g.brand}
                onChange={(e) => handleFieldSave("brand", e.target.value)}
              >
                <option value="Greenway">Greenway</option>
                <option value="Kirby Collective">Kirby Collective</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label style={labelStyle}>Description</label>
              <input
                style={inputStyle}
                defaultValue={g.description || ""}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v !== (g.description || "")) handleFieldSave("description", v || null);
                }}
                placeholder="Short description"
              />
            </div>

            {/* Active toggle */}
            <div>
              <label style={labelStyle}>Status</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 4 }}>
                <button
                  onClick={() => handleFieldSave("is_active", !g.is_active)}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    border: "none",
                    cursor: "pointer",
                    background: g.is_active ? COLORS.green : COLORS.border,
                    position: "relative",
                    transition: "background 0.2s",
                  }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      background: COLORS.white,
                      position: "absolute",
                      top: 3,
                      left: g.is_active ? 23 : 3,
                      transition: "left 0.2s",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                    }}
                  />
                </button>
                <span style={{ fontSize: 13, color: COLORS.textMuted }}>
                  {g.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            {/* Slug (read only + copy) */}
            <div>
              <label style={labelStyle}>Share Link</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  style={{ ...inputStyle, flex: 1, color: COLORS.textMuted, fontSize: 12 }}
                  value={getPublicUrl(g.slug)}
                  readOnly
                />
                <button
                  onClick={() => copyToClipboard(getPublicUrl(g.slug))}
                  style={{
                    padding: "8px 14px",
                    background: COLORS.white,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: RADII.sm,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    color: COLORS.textMuted,
                    fontFamily: FONTS.body,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.bg)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = COLORS.white)}
                >
                  <Icon type="copy" size={14} color={COLORS.textMuted} />
                  Copy
                </button>
              </div>
            </div>
          </div>

          {/* Delete */}
          <div style={{ marginTop: 24, borderTop: `1px solid ${COLORS.borderLight}`, paddingTop: 20 }}>
            <button
              onClick={handleDeleteGallery}
              style={{
                padding: "10px 20px",
                background: COLORS.white,
                color: COLORS.red,
                border: `1px solid ${COLORS.border}`,
                borderRadius: RADII.sm,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: FONTS.body,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.redLight)}
              onMouseLeave={(e) => (e.currentTarget.style.background = COLORS.white)}
            >
              Delete Gallery
            </button>
          </div>
        </div>

        {/* Photo Section */}
        <div
          style={{
            background: COLORS.white,
            border: `1px solid ${COLORS.border}`,
            borderRadius: RADII.lg,
            padding: 24,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: COLORS.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 16,
            }}
          >
            Photos ({photos.length})
          </div>

          {/* Upload progress */}
          {uploading && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 8 }}>
                Uploading {uploadProgress.done} of {uploadProgress.total}...
              </div>
              <div
                style={{
                  height: 4,
                  background: COLORS.bg,
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${(uploadProgress.done / uploadProgress.total) * 100}%`,
                    background: COLORS.black,
                    borderRadius: 2,
                    transition: "width 0.3s",
                  }}
                />
              </div>
            </div>
          )}

          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? COLORS.black : COLORS.border}`,
              borderRadius: RADII.lg,
              padding: 40,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              marginBottom: 20,
              transition: "border-color 0.15s, background 0.15s",
              background: dragging ? COLORS.bg : "transparent",
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke={COLORS.textMuted}
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="16 16 12 12 8 16" />
              <line x1="12" y1="12" x2="12" y2="21" />
              <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
            </svg>
            <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 12 }}>
              Drop photos here or click to upload
            </div>
            <div style={{ fontSize: 11, color: COLORS.textLight, marginTop: 4 }}>
              JPG, PNG, WebP up to 10MB
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp"
              style={{ display: "none" }}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {/* Photo grid */}
          {photosLoading ? (
            <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted, fontSize: 13 }}>
              Loading photos...
            </div>
          ) : photos.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <Icon type="image" size={32} color={COLORS.border} />
              <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 12 }}>
                No photos yet
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 8,
              }}
            >
              {photos.map((photo) => {
                const isSelected = selectedPhotos.has(photo.id);
                const isHovered = hoveredPhotoId === photo.id;
                const isCover = selectedGallery.cover_photo_id === photo.id;

                return (
                  <div key={photo.id}>
                    <div
                      style={{
                        position: "relative",
                        aspectRatio: "1/1",
                        borderRadius: 8,
                        overflow: "hidden",
                        cursor: "pointer",
                        border: isSelected ? `3px solid ${COLORS.black}` : "3px solid transparent",
                        transition: "border-color 0.15s",
                      }}
                      onClick={() => togglePhotoSelect(photo.id)}
                      onMouseEnter={() => setHoveredPhotoId(photo.id)}
                      onMouseLeave={() => setHoveredPhotoId(null)}
                    >
                      <img
                        src={photo.url}
                        alt={photo.caption || "Gallery photo"}
                        loading="lazy"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />

                      {/* Hover overlay */}
                      {isHovered && (
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            background: "rgba(0,0,0,0.4)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                          }}
                        >
                          {/* Star / Cover */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetCover(photo);
                            }}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              border: "none",
                              background: "rgba(255,255,255,0.2)",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "background 0.15s",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = "rgba(255,255,255,0.35)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "rgba(255,255,255,0.2)")
                            }
                            title="Set as cover"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill={isCover ? COLORS.gold : "none"}
                              stroke={isCover ? COLORS.gold : COLORS.white}
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          </button>

                          {/* Edit */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPhotoId(editingPhotoId === photo.id ? null : photo.id);
                            }}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              border: "none",
                              background: "rgba(255,255,255,0.2)",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "background 0.15s",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = "rgba(255,255,255,0.35)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "rgba(255,255,255,0.2)")
                            }
                            title="Edit details"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#fff"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>

                          {/* Trash */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePhoto(photo);
                            }}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              border: "none",
                              background: "rgba(255,255,255,0.2)",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "background 0.15s",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = "rgba(255,255,255,0.35)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "rgba(255,255,255,0.2)")
                            }
                            title="Delete"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#fff"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                            </svg>
                          </button>
                        </div>
                      )}

                      {/* Cover badge */}
                      {isCover && !isHovered && (
                        <div
                          style={{
                            position: "absolute",
                            top: 6,
                            left: 6,
                            background: "rgba(0,0,0,0.6)",
                            color: COLORS.white,
                            fontSize: 9,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            padding: "3px 8px",
                            borderRadius: 4,
                          }}
                        >
                          Cover
                        </div>
                      )}
                    </div>

                    {/* Photo detail editor */}
                    {editingPhotoId === photo.id && (
                      <PhotoDetailEditor
                        photo={photo}
                        onSave={handlePhotoMetaSave}
                        onClose={() => setEditingPhotoId(null)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Batch operations bar */}
        {selectedPhotos.size > 0 && (
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              background: COLORS.white,
              borderTop: `1px solid ${COLORS.border}`,
              padding: "12px 28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              zIndex: 100,
              boxShadow: "0 -4px 12px rgba(0,0,0,0.06)",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>
              {selectedPhotos.size} selected
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setSelectedPhotos(new Set())}
                style={{
                  padding: "8px 16px",
                  background: COLORS.white,
                  color: COLORS.textMuted,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: RADII.sm,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: FONTS.body,
                }}
              >
                Deselect All
              </button>
              <button
                onClick={handleBatchDelete}
                style={{
                  padding: "8px 16px",
                  background: COLORS.red,
                  color: COLORS.white,
                  border: "none",
                  borderRadius: RADII.sm,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: FONTS.body,
                }}
              >
                Delete Selected
              </button>
            </div>
          </div>
        )}

        {/* Modals */}
        {confirmModal && (
          <ConfirmModal
            title={confirmModal.title}
            message={confirmModal.message}
            confirmLabel={confirmModal.confirmLabel}
            danger={confirmModal.danger}
            onConfirm={confirmModal.onConfirm}
            onCancel={() => setConfirmModal(null)}
          />
        )}
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </div>
    );
  }

  // ══════════════════════════════════════
  // RENDER: Gallery List View (default)
  // ══════════════════════════════════════
  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: COLORS.black,
            fontFamily: FONTS.body,
          }}
        >
          Media Vault
        </span>
        <button onClick={() => setShowNewForm(true)} style={pillBtnStyle}>
          <Icon type="plus" size={15} color={COLORS.white} />
          New Gallery
        </button>
      </div>

      {/* New Gallery Form */}
      {showNewForm && (
        <div
          style={{
            background: COLORS.white,
            border: `1px solid ${COLORS.border}`,
            borderRadius: RADII.lg,
            padding: 20,
            marginBottom: 16,
            animation: "fadeUp 0.15s ease",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: COLORS.black,
              marginBottom: 16,
            }}
          >
            Create Gallery
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Gallery Name</label>
              <input
                style={inputStyle}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. The Bell Tower on 34th"
                autoFocus
              />
            </div>
            <div>
              <label style={labelStyle}>PIN (4 to 6 digits)</label>
              <input
                style={inputStyle}
                value={newPin}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setNewPin(v);
                }}
                placeholder="1234"
                inputMode="numeric"
                maxLength={6}
              />
            </div>
            <div>
              <label style={labelStyle}>Brand</label>
              <select
                style={selectStyle}
                value={newBrand}
                onChange={(e) => setNewBrand(e.target.value)}
              >
                <option value="Greenway">Greenway</option>
                <option value="Kirby Collective">Kirby Collective</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <input
                style={inputStyle}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Lauren and James — October 2025"
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
            <button
              onClick={() => {
                setShowNewForm(false);
                setNewName("");
                setNewPin("");
                setNewDesc("");
              }}
              style={{
                padding: "8px 20px",
                background: COLORS.white,
                color: COLORS.textMuted,
                border: `1px solid ${COLORS.border}`,
                borderRadius: RADII.sm,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: FONTS.body,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateGallery}
              disabled={!newName.trim() || !newPin.trim()}
              style={{
                padding: "8px 20px",
                background: !newName.trim() || !newPin.trim() ? COLORS.border : COLORS.black,
                color: COLORS.white,
                border: "none",
                borderRadius: RADII.sm,
                fontSize: 13,
                fontWeight: 600,
                cursor: !newName.trim() || !newPin.trim() ? "not-allowed" : "pointer",
                fontFamily: FONTS.body,
              }}
            >
              Create Gallery
            </button>
          </div>
        </div>
      )}

      {/* Gallery list */}
      {galleries.length === 0 ? (
        <EmptyState
          icon="image"
          title="No galleries yet"
          description="Create your first gallery to start sharing photos with planners and couples"
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {galleries.map((gallery) => (
            <div
              key={gallery.id}
              onClick={() => {
                setSelectedGallery(gallery);
                setView("detail");
              }}
              style={{
                background: COLORS.white,
                border: `1px solid ${COLORS.border}`,
                borderRadius: RADII.lg,
                padding: 20,
                display: "flex",
                alignItems: "center",
                gap: 16,
                cursor: "pointer",
                transition: "box-shadow 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = SHADOWS.sm;
                e.currentTarget.style.borderColor = COLORS.borderLight;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.borderColor = COLORS.border;
              }}
            >
              {/* Cover thumbnail */}
              <div
                style={{
                  width: 80,
                  height: 60,
                  borderRadius: 8,
                  background: COLORS.bg,
                  overflow: "hidden",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon type="image" size={22} color={COLORS.border} />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: COLORS.black,
                    marginBottom: 4,
                  }}
                >
                  {gallery.name}
                </div>
                {gallery.description && (
                  <div
                    style={{
                      fontSize: 12,
                      color: COLORS.textMuted,
                      marginBottom: 4,
                    }}
                  >
                    {gallery.description}
                  </div>
                )}
                <div style={{ fontSize: 11, color: COLORS.textLight }}>
                  {gallery.photo_count ?? 0} photos · {gallery.view_count ?? 0} views
                </div>
              </div>

              {/* Right side: badges + copy */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <BrandBadge brand={gallery.brand} />
                <StatusBadge status={gallery.is_active ? "active" : "inactive"} />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(getPublicUrl(gallery.slug));
                  }}
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
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.bg)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = COLORS.white)}
                  title="Copy link"
                >
                  <Icon type="link" size={14} color={COLORS.textMuted} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          danger={confirmModal.danger}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
