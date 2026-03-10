import React, { useState, useRef, useEffect } from "react";
import { COLORS, RADII, SHADOWS, FONTS } from "../tokens";

export default function PlannerTypeahead({
  value,
  onChange,
  planners,
  selectedPlannerId,
  onSelectPlanner,
  onClearPlanner,
  onCreatePlanner,
  inputStyle,
}) {
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const blurTimer = useRef(null);
  const inputRef = useRef(null);

  // Filter planners by name/company (min 2 chars)
  const matches =
    value && value.length >= 2
      ? (planners || []).filter((p) => {
          const q = value.toLowerCase();
          return (
            (p.name || "").toLowerCase().includes(q) ||
            (p.company || "").toLowerCase().includes(q)
          );
        })
      : [];

  // Show dropdown when we have matches and input is focused
  useEffect(() => {
    if (matches.length > 0 && value && value.length >= 2) {
      setOpen(true);
      setShowCreate(false);
    } else if (value && value.length >= 2 && matches.length === 0) {
      setOpen(false);
    }
  }, [value, matches.length]);

  const handleBlur = () => {
    blurTimer.current = setTimeout(() => {
      setOpen(false);
      // Show create link if no matches and we have text
      if (value && value.trim().length >= 2 && matches.length === 0 && !selectedPlannerId) {
        setShowCreate(true);
      }
    }, 200);
  };

  const handleFocus = () => {
    clearTimeout(blurTimer.current);
    setShowCreate(false);
    if (matches.length > 0 && value && value.length >= 2) {
      setOpen(true);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
    if (e.key === "Enter" && !open && value && value.trim().length >= 2 && matches.length === 0 && !selectedPlannerId) {
      e.preventDefault();
      setShowCreate(true);
    }
  };

  const handleSelect = (planner) => {
    clearTimeout(blurTimer.current);
    setOpen(false);
    setShowCreate(false);
    onSelectPlanner(planner);
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Input row with linked badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          ref={inputRef}
          style={{ ...inputStyle, flex: 1 }}
          value={value || ""}
          onChange={(e) => {
            onChange(e.target.value);
            setShowCreate(false);
          }}
          onBlur={handleBlur}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder="Search planners..."
        />
        {selectedPlannerId && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              color: COLORS.green,
              background: COLORS.greenLight,
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              borderRadius: RADII.pill,
              padding: "2px 8px",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Linked
            <span
              onClick={(e) => {
                e.stopPropagation();
                onClearPlanner();
              }}
              style={{
                fontSize: 12,
                color: COLORS.textLight,
                cursor: "pointer",
                lineHeight: 1,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = COLORS.red)}
              onMouseLeave={(e) => (e.currentTarget.style.color = COLORS.textLight)}
            >
              ×
            </span>
          </span>
        )}
      </div>

      {/* Dropdown */}
      {open && matches.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            background: COLORS.white,
            border: `1px solid ${COLORS.border}`,
            borderRadius: RADII.sm,
            boxShadow: SHADOWS.md,
            maxHeight: 200,
            overflowY: "auto",
            zIndex: 50,
          }}
        >
          {matches.map((p) => (
            <div
              key={p.id}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(p);
              }}
              style={{
                padding: "10px 12px",
                cursor: "pointer",
                fontSize: 14,
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.bg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</span>
              {p.company && (
                <span style={{ fontSize: 12, color: COLORS.textMuted }}>
                  {" — "}
                  {p.company}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create planner link */}
      {showCreate && value && value.trim().length >= 2 && !selectedPlannerId && (
        <div
          onClick={() => {
            setShowCreate(false);
            onCreatePlanner(value.trim());
          }}
          style={{
            marginTop: 4,
            fontSize: 12,
            color: COLORS.gold,
            cursor: "pointer",
            fontFamily: FONTS.body,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
        >
          Create planner profile for "{value.trim()}"?
        </div>
      )}
    </div>
  );
}
