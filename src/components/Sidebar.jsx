import React, { useState } from "react";
import { COLORS, FONTS, RADII } from "../tokens";
import Icon from "../icons";

const NAV_ITEMS = [
  { id: "dashboard", icon: "dashboard", label: "Dashboard" },
  { id: "pipeline", icon: "pipeline", label: "Pipeline" },
  { id: "planners", icon: "planners", label: "Planners" },
  { id: "calendar", icon: "calendar", label: "Calendar" },
  { id: "bandops", icon: "music", label: "Band Ops" },
  { id: "content", icon: "grid", label: "Content" },
  { id: "aicrew", icon: "spark", label: "AI Crew" },
  { id: "financials", icon: "dollar", label: "Financials" },
];

// NavItem — icon 18px + label 13.5px, active state with bg + left accent bar
const NavItem = ({ item, active, onClick, collapsed }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: collapsed ? 0 : 12,
        justifyContent: collapsed ? "center" : "flex-start",
        paddingTop: 10, paddingBottom: 10, paddingLeft: collapsed ? 0 : 16, paddingRight: collapsed ? 0 : 16,
        borderRadius: RADII.sm,
        border: "none",
        background: active || hovered ? COLORS.bg : "transparent",
        cursor: "pointer",
        marginBottom: 2,
        fontFamily: FONTS.body,
        position: "relative",
        transition: "background 0.15s",
      }}
      title={collapsed ? item.label : undefined}
    >
      {active && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: "50%",
            transform: "translateY(-50%)",
            width: 3,
            height: 20,
            borderRadius: 2,
            background: COLORS.black,
          }}
        />
      )}
      <Icon
        type={item.icon}
        size={18}
        color={active ? COLORS.black : COLORS.textMuted}
      />
      {!collapsed && (
        <span
          style={{
            fontSize: 13.5,
            fontWeight: active ? 600 : 500,
            color: active ? COLORS.black : COLORS.textMuted,
          }}
        >
          {item.label}
        </span>
      )}
    </button>
  );
};

const Sidebar = ({ activeNav, onNavChange, collapsed = false, onClose }) => {
  const [settingsHovered, setSettingsHovered] = useState(false);

  return (
    <div
      style={{
        width: collapsed ? 64 : 240,
        background: COLORS.white,
        borderRight: `1px solid ${COLORS.border}`,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
        flexShrink: 0,
        transition: "width 0.2s ease",
        overflow: "hidden",
      }}
    >
      {/* Logo — Light Application on Cream from Brand Guide */}
      <div style={{ paddingTop: 20, paddingBottom: 16, paddingLeft: collapsed ? 8 : 18, paddingRight: collapsed ? 8 : 18 }}>
        {collapsed ? (
          <div
            style={{
              fontFamily: FONTS.display,
              fontSize: 16,
              fontWeight: 600,
              color: COLORS.black,
              textAlign: "center",
            }}
          >
            GB
          </div>
        ) : (
          <svg viewBox="0 0 300 130" width="196" xmlns="http://www.w3.org/2000/svg">
            <line x1="100" y1="14" x2="200" y2="14" stroke="#0A0A09" strokeWidth="0.25" opacity="0.2" />
            <text x="150" y="42" textAnchor="middle" fontFamily="'Bodoni Moda', serif" fontSize="10" fill="#8a867e" letterSpacing="8">THE</text>
            <text x="150" y="82" textAnchor="middle" fontFamily="'Bodoni Moda', serif" fontSize="38" fill="#0A0A09" letterSpacing="3">GREENWAY</text>
            <text x="150" y="106" textAnchor="middle" fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="9" fill="#8a867e" letterSpacing="10">BAND</text>
            <line x1="100" y1="124" x2="200" y2="124" stroke="#0A0A09" strokeWidth="0.25" opacity="0.2" />
          </svg>
        )}
      </div>

      {/* Main nav */}
      <nav style={{ paddingTop: 0, paddingBottom: 0, paddingLeft: collapsed ? 8 : 12, paddingRight: collapsed ? 8 : 12, flex: 1 }}>
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            active={activeNav === item.id}
            onClick={() => {
              onNavChange(item.id);
              if (onClose) onClose();
            }}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Divider + Settings */}
      <div
        style={{
          paddingTop: 16,
          paddingBottom: 16,
          paddingLeft: collapsed ? 8 : 12,
          paddingRight: collapsed ? 8 : 12,
          borderTop: `1px solid ${COLORS.borderLight}`,
        }}
      >
        <button
          onClick={() => {
            onNavChange("settings");
            if (onClose) onClose();
          }}
          onMouseEnter={() => setSettingsHovered(true)}
          onMouseLeave={() => setSettingsHovered(false)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: collapsed ? 0 : 12,
            justifyContent: collapsed ? "center" : "flex-start",
            paddingTop: 10, paddingBottom: 10, paddingLeft: collapsed ? 0 : 16, paddingRight: collapsed ? 0 : 16,
            borderRadius: RADII.sm,
            border: "none",
            background:
              activeNav === "settings" || settingsHovered
                ? COLORS.bg
                : "transparent",
            cursor: "pointer",
            fontFamily: FONTS.body,
            position: "relative",
            transition: "background 0.15s",
          }}
          title={collapsed ? "Settings" : undefined}
        >
          {activeNav === "settings" && (
            <div
              style={{
                position: "absolute",
                left: 0,
                top: "50%",
                transform: "translateY(-50%)",
                width: 3,
                height: 20,
                borderRadius: 2,
                background: COLORS.black,
              }}
            />
          )}
          <Icon
            type="settings"
            size={18}
            color={activeNav === "settings" ? COLORS.black : COLORS.textMuted}
          />
          {!collapsed && (
            <span
              style={{
                fontSize: 13.5,
                fontWeight: activeNav === "settings" ? 600 : 500,
                color:
                  activeNav === "settings" ? COLORS.black : COLORS.textMuted,
              }}
            >
              Settings
            </span>
          )}
        </button>
      </div>

      {/* User badge */}
      <div
        style={{
          paddingTop: 16, paddingBottom: 16, paddingLeft: collapsed ? 8 : 18, paddingRight: collapsed ? 8 : 18,
          borderTop: `1px solid ${COLORS.borderLight}`,
          display: "flex",
          alignItems: "center",
          gap: collapsed ? 0 : 12,
          justifyContent: collapsed ? "center" : "flex-start",
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: COLORS.black,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: COLORS.white,
            fontSize: 13,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          AM
        </div>
        {!collapsed && (
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: COLORS.black,
              }}
            >
              Adrian Michael
            </div>
            <div style={{ fontSize: 11, color: COLORS.textMuted }}>Founder</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
