import React, { useState, useRef, useEffect } from "react";
import { COLORS, FONTS, RADII } from "../tokens";
import Icon from "../icons";
import PlaceholderCard from "../components/PlaceholderCard";
import GigSheetPanel from "../components/GigSheetPanel";
import MCCueSheet from "../components/MCCueSheet";
import { getLeadName, formatDate } from "../data/seed";

// Status badge for musicians
const StatusBadge = ({ status }) => {
  const isActive = status === "active";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 100,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
        color: isActive ? COLORS.green : COLORS.textLight,
        background: isActive ? COLORS.greenLight : COLORS.bg,
      }}
    >
      {status}
    </span>
  );
};

// Musician row — matches vision mockup
const MusicianRow = ({ m }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "2fr 1.5fr 1fr",
      alignItems: "center",
      padding: "14px 24px",
      borderBottom: `1px solid ${COLORS.borderLight}`,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: COLORS.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 13,
          color: COLORS.textMuted,
          flexShrink: 0,
        }}
      >
        {m.name.charAt(0)}
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.black }}>
        {m.name}
      </div>
    </div>
    <div style={{ fontSize: 13, color: COLORS.textMuted }}>{m.role}</div>
    <div>
      <StatusBadge status={m.status} />
    </div>
  </div>
);

// Gig Sheet functional card with dropdown
const GigSheetCard = ({ bookedLeads, onSelectLead }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", height: "100%" }}>
      <button
        onClick={() => {
          if (bookedLeads.length === 0) return;
          setOpen(!open);
        }}
        style={{
          width: "100%",
          height: "100%",
          background: COLORS.white,
          border: `1px solid ${COLORS.border}`,
          borderRadius: RADII.lg,
          padding: "24px 20px",
          cursor: bookedLeads.length > 0 ? "pointer" : "default",
          textAlign: "left",
          fontFamily: FONTS.body,
          transition: "all 0.15s",
          opacity: bookedLeads.length === 0 ? 0.6 : 1,
        }}
        onMouseEnter={(e) => {
          if (bookedLeads.length > 0) {
            e.currentTarget.style.borderColor = COLORS.black;
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = COLORS.border;
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: COLORS.greenBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon type="file" size={16} color={COLORS.green} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.black }}>
            Gig Sheet Generator
          </span>
        </div>
        <div style={{ fontSize: 12.5, color: COLORS.textMuted, lineHeight: 1.4 }}>
          {bookedLeads.length > 0
            ? `${bookedLeads.length} booked gig${bookedLeads.length !== 1 ? "s" : ""} ready`
            : "No booked gigs yet"}
        </div>
      </button>

      {/* Dropdown */}
      {open && bookedLeads.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: COLORS.white,
            border: `1px solid ${COLORS.border}`,
            borderRadius: RADII.md,
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            zIndex: 20,
            maxHeight: 240,
            overflow: "auto",
            animation: "fadeIn 0.15s ease",
          }}
        >
          <div
            style={{
              padding: "8px 12px",
              fontSize: 11,
              fontWeight: 600,
              color: COLORS.textLight,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              borderBottom: `1px solid ${COLORS.borderLight}`,
            }}
          >
            Select a Booked Lead
          </div>
          {bookedLeads.map((lead) => (
            <button
              key={lead.id}
              onClick={() => {
                onSelectLead(lead);
                setOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "10px 12px",
                background: "none",
                border: "none",
                borderBottom: `1px solid ${COLORS.borderLight}`,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: FONTS.body,
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.bg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.black }}>
                {getLeadName(lead)}
              </div>
              <div style={{ fontSize: 11.5, color: COLORS.textMuted, marginTop: 2 }}>
                {lead.venue} &middot; {formatDate(lead.event_date)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// MC Cue Sheet functional card with dropdown
const CueSheetCard = ({ bookedLeads, onSelectLead }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", height: "100%" }}>
      <button
        onClick={() => {
          if (bookedLeads.length === 0) return;
          setOpen(!open);
        }}
        style={{
          width: "100%",
          height: "100%",
          background: COLORS.white,
          border: `1px solid ${COLORS.border}`,
          borderRadius: RADII.lg,
          padding: "24px 20px",
          cursor: bookedLeads.length > 0 ? "pointer" : "default",
          textAlign: "left",
          fontFamily: FONTS.body,
          transition: "all 0.15s",
          opacity: bookedLeads.length === 0 ? 0.6 : 1,
        }}
        onMouseEnter={(e) => {
          if (bookedLeads.length > 0) {
            e.currentTarget.style.borderColor = COLORS.black;
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = COLORS.border;
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "#1A1A18",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon type="clipboard" size={16} color="#F5F2ED" />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.black }}>
            MC Live Cue Sheet
          </span>
        </div>
        <div style={{ fontSize: 12.5, color: COLORS.textMuted, lineHeight: 1.4 }}>
          {bookedLeads.length > 0
            ? `${bookedLeads.length} booked gig${bookedLeads.length !== 1 ? "s" : ""} ready`
            : "No booked gigs yet"}
        </div>
      </button>

      {open && bookedLeads.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: COLORS.white,
            border: `1px solid ${COLORS.border}`,
            borderRadius: RADII.md,
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            zIndex: 20,
            maxHeight: 240,
            overflow: "auto",
            animation: "fadeIn 0.15s ease",
          }}
        >
          <div
            style={{
              padding: "8px 12px",
              fontSize: 11,
              fontWeight: 600,
              color: COLORS.textLight,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              borderBottom: `1px solid ${COLORS.borderLight}`,
            }}
          >
            Select a Booked Lead
          </div>
          {bookedLeads.map((lead) => (
            <button
              key={lead.id}
              onClick={() => {
                onSelectLead(lead);
                setOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "10px 12px",
                background: "none",
                border: "none",
                borderBottom: `1px solid ${COLORS.borderLight}`,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: FONTS.body,
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.bg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.black }}>
                {getLeadName(lead)}
              </div>
              <div style={{ fontSize: 11.5, color: COLORS.textMuted, marginTop: 2 }}>
                {lead.venue} &middot; {formatDate(lead.event_date)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const BandOps = ({
  musicians,
  leads,
  gigAssignments,
  updateLead,
  addGigAssignment,
  removeGigAssignment,
  onNavigateToSettings,
}) => {
  const activeCount = musicians.filter((m) => m.status === "active").length;
  const [gigSheetLead, setGigSheetLead] = useState(null);
  const [cueSheetLead, setCueSheetLead] = useState(null);

  // Filter to booked leads only
  const bookedLeads = (leads || []).filter((l) => l.stage === "Booked");

  return (
    <div style={{ animation: "fadeUp 0.3s ease", maxWidth: 1200 }}>
      <h1
        style={{
          fontFamily: FONTS.display,
          fontSize: 26,
          fontWeight: 600,
          color: COLORS.black,
          marginBottom: 24,
        }}
      >
        Band Operations
      </h1>

      {/* Musician Roster */}
      <div
        style={{
          background: COLORS.white,
          border: `1px solid ${COLORS.border}`,
          borderRadius: RADII.lg,
          overflow: "hidden",
          marginBottom: 28,
        }}
      >
        <div
          style={{
            padding: "18px 24px",
            borderBottom: `1px solid ${COLORS.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{ fontSize: 14, fontWeight: 700, color: COLORS.black }}
          >
            Musician Roster
          </span>
          <span style={{ fontSize: 12, color: COLORS.textMuted }}>
            {activeCount} active
          </span>
        </div>
        {/* Table header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1.5fr 1fr",
            padding: "10px 24px",
            borderBottom: `1px solid ${COLORS.border}`,
            background: COLORS.bg,
          }}
        >
          {["Name", "Role", "Status"].map((h) => (
            <span
              key={h}
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: COLORS.textLight,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {h}
            </span>
          ))}
        </div>
        {musicians.map((m) => (
          <MusicianRow key={m.id} m={m} />
        ))}
      </div>

      {/* Tool cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16, alignItems: "stretch" }}>
        <GigSheetCard
          bookedLeads={bookedLeads}
          onSelectLead={(lead) => setGigSheetLead(lead)}
        />
        <CueSheetCard
          bookedLeads={bookedLeads}
          onSelectLead={(lead) => setCueSheetLead(lead)}
        />
        <PlaceholderCard
          icon="users"
          title="Band Packager"
          description="Assign musicians to gigs from your roster."
        />
      </div>

      {/* Gig Sheet Panel */}
      {gigSheetLead && (
        <GigSheetPanel
          lead={gigSheetLead}
          onClose={() => setGigSheetLead(null)}
          onUpdateLead={updateLead}
          musicians={musicians}
          gigAssignments={gigAssignments || []}
          addGigAssignment={addGigAssignment}
          removeGigAssignment={removeGigAssignment}
          onNavigateToSettings={onNavigateToSettings}
          onOpenCueSheet={(l) => {
            setGigSheetLead(null);
            setCueSheetLead(l);
          }}
        />
      )}

      {/* MC Cue Sheet */}
      {cueSheetLead && (
        <MCCueSheet
          lead={cueSheetLead}
          onClose={() => setCueSheetLead(null)}
          onUpdateLead={updateLead}
        />
      )}
    </div>
  );
};

export default BandOps;
