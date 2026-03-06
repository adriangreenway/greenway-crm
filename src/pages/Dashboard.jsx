import React from "react";
import { COLORS, FONTS, RADII } from "../tokens";
import Icon from "../icons";
import StatCard from "../components/StatCard";
import Badge, { BrandBadge, StageBadge } from "../components/Badge";
import { STAGE_COLORS } from "../tokens";
import { getLeadName, formatCurrency, formatDate } from "../data/seed";

// Calendar mini — small month view with colored dots
const CalendarMini = ({ leads }) => {
  // Find the next upcoming month with at least one future event
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  let displayYear, displayMonth;

  // Collect all event dates (wedding, consultation, followup)
  const allDates = [];
  leads.forEach((l) => {
    if (l.event_date) allDates.push(l.event_date.split("T")[0]);
    if (l.consultation_date) allDates.push(l.consultation_date.split("T")[0]);
    if (l.followup_date) allDates.push(l.followup_date.split("T")[0]);
  });

  const futureEvents = allDates
    .filter((d) => d >= todayStr)
    .map((d) => new Date(d + "T00:00:00"))
    .sort((a, b) => a - b);

  if (futureEvents.length > 0) {
    displayYear = futureEvents[0].getFullYear();
    displayMonth = futureEvents[0].getMonth();
  } else {
    displayYear = today.getFullYear();
    displayMonth = today.getMonth();
  }

  // Build event map from leads with any date in display month
  const eventMap = {};
  const addEvent = (dateStr, brand) => {
    if (!dateStr) return;
    const justDate = dateStr.split("T")[0];
    const d = new Date(justDate + "T00:00:00");
    if (d.getMonth() !== displayMonth || d.getFullYear() !== displayYear) return;
    const day = d.getDate();
    if (!eventMap[day]) eventMap[day] = [];
    eventMap[day].push(brand);
  };
  leads.forEach((lead) => {
    addEvent(lead.event_date, lead.brand);
    addEvent(lead.consultation_date, lead.brand);
    addEvent(lead.followup_date, lead.brand);
  });

  // Determine dot type per day
  const getDayType = (day) => {
    const brands = eventMap[day];
    if (!brands) return null;
    const hasGreenway = brands.includes("Greenway");
    const hasKirby = brands.includes("Kirby Collective");
    if (hasGreenway && hasKirby) return "conflict";
    if (hasKirby) return "kirby";
    return "greenway";
  };

  const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const startOffset = new Date(displayYear, displayMonth, 1).getDay();
  const monthLabel = new Date(displayYear, displayMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.black }}>
          {monthLabel}
        </span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: COLORS.greenBg,
              border: `2px solid ${COLORS.green}`,
            }}
          />
          <span
            style={{ fontSize: 10, color: COLORS.textMuted, marginRight: 8 }}
          >
            GB
          </span>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: COLORS.tealLight,
              border: `2px solid ${COLORS.teal}`,
            }}
          />
          <span style={{ fontSize: 10, color: COLORS.textMuted }}>KC</span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div
            key={d}
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: COLORS.textLight,
              textAlign: "center",
              padding: "4px 0",
              textTransform: "uppercase",
            }}
          >
            {d}
          </div>
        ))}
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((d) => {
          const ev = getDayType(d);
          return (
            <div
              key={d}
              style={{
                width: "100%",
                aspectRatio: "1",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: ev ? 700 : 500,
                color:
                  ev === "conflict"
                    ? COLORS.red
                    : ev
                      ? COLORS.black
                      : COLORS.textMuted,
                background:
                  ev === "conflict"
                    ? COLORS.redLight
                    : ev === "greenway"
                      ? COLORS.greenBg
                      : ev === "kirby"
                        ? COLORS.tealLight
                        : "transparent",
                cursor: "pointer",
                transition: "background 0.1s",
              }}
            >
              {d}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Truncation helper
const truncStyle = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

// Abbreviated stage names for compact table view
const SHORT_STAGES = {
  "Consultation Scheduled": "Consult",
  "Post Consultation": "Post Consult",
  "Contract Sent": "Contract",
  "Proposal Sent": "Proposal",
};
const ShortStageBadge = ({ stage }) => {
  const s = STAGE_COLORS[stage] || { color: COLORS.textMuted, bg: COLORS.cream };
  return <Badge color={s.color} bg={s.bg}>{SHORT_STAGES[stage] || stage}</Badge>;
};

// Recent leads table row
const RecentLeadRow = ({ lead, onClick }) => (
  <div
    onClick={onClick}
    style={{
      display: "grid",
      gridTemplateColumns: "minmax(0,2fr) minmax(0,1.2fr) minmax(0,1fr) minmax(0,1.2fr) minmax(0,0.8fr)",
      alignItems: "center",
      padding: "14px 24px",
      borderBottom: `1px solid ${COLORS.borderLight}`,
      cursor: "pointer",
      transition: "background 0.1s",
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.bg)}
    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
  >
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.black, ...truncStyle }}>
        {getLeadName(lead)}
      </div>
      <div style={{ fontSize: 11.5, color: COLORS.textMuted, marginTop: 2, ...truncStyle }}>
        {lead.venue}
      </div>
    </div>
    <div style={{ fontSize: 13, color: COLORS.text, ...truncStyle }}>
      {formatDate(lead.event_date)}
    </div>
    <div style={{ minWidth: 0, overflow: "hidden" }}>
      <BrandBadge brand={lead.brand} />
    </div>
    <div style={{ minWidth: 0, overflow: "hidden" }}>
      <ShortStageBadge stage={lead.stage} />
    </div>
    <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.black, ...truncStyle }}>
      {formatCurrency(lead.price)}
    </div>
  </div>
);

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const Dashboard = ({ leads, musicians, onNavigate, onOpenLead, onAddLead }) => {
  // Compute stat values
  const activeLeads = leads.filter(
    (l) => !["Booked", "Fulfilled", "Lost"].includes(l.stage)
  );
  const pipelineValue = activeLeads.reduce(
    (sum, l) => sum + (Number(l.price) || 0),
    0
  );
  const currentYear = new Date().getFullYear();
  const bookedLeads = leads.filter(
    (l) =>
      l.stage === "Booked" &&
      l.event_date &&
      l.event_date.startsWith(String(currentYear))
  );
  const bookedValue = bookedLeads.reduce(
    (sum, l) => sum + (Number(l.price) || 0),
    0
  );
  const newestActive = activeLeads.length > 0
    ? [...activeLeads].sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""))[0]
    : null;
  const avgDeal = activeLeads.length > 0
    ? Math.round(pipelineValue / activeLeads.length)
    : 0;
  const consultationLeads = leads.filter(
    (l) => l.stage === "Consultation Scheduled"
  );
  const nextConsultation = consultationLeads
    .filter((l) => l.consultation_date)
    .sort((a, b) => a.consultation_date.localeCompare(b.consultation_date))[0];

  // Recent leads: 5 most recently updated
  const recentLeads = [...leads]
    .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""))
    .slice(0, 5);

  return (
    <div style={{ animation: "fadeUp 0.3s ease", maxWidth: 1200, margin: "0 auto", minWidth: 0 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: FONTS.display,
              fontSize: 26,
              fontWeight: 600,
              color: COLORS.black,
            }}
          >
            {getGreeting()}, Adrian
          </h1>
          <p
            style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}
          >
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}{" "}
            · {bookedLeads.length + activeLeads.length} leads in pipeline
          </p>
        </div>
        <button
          onClick={() => onAddLead ? onAddLead() : onNavigate("pipeline")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            background: COLORS.black,
            color: COLORS.white,
            border: "none",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: FONTS.body,
          }}
        >
          <Icon type="plus" size={15} color={COLORS.white} />
          New Lead
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 28 }}>
        <StatCard
          label="ACTIVE LEADS"
          value={activeLeads.length}
          sub={newestActive ? `Newest: ${newestActive.partner1_last} / ${newestActive.partner2_last}` : "No active leads"}
          icon="pipeline"
        />
        <StatCard
          label="PIPELINE VALUE"
          value={formatCurrency(pipelineValue)}
          sub={activeLeads.length > 0 ? `Avg: ${formatCurrency(avgDeal)}` : "No active leads"}
          icon="dollar"
        />
        <StatCard
          label={`BOOKED ${currentYear}`}
          value={bookedLeads.length}
          sub={`${formatCurrency(bookedValue)} confirmed`}
          icon="check"
          trend="up"
        />
        <StatCard
          label="CONSULTATIONS"
          value={consultationLeads.length}
          sub={
            nextConsultation
              ? `Next: ${formatDate(nextConsultation.consultation_date?.split("T")[0])}`
              : "None scheduled"
          }
          icon="calendar"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 320px",
          gap: 20,
        }}
      >
        {/* Recent leads table */}
        <div
          style={{
            background: COLORS.white,
            border: `1px solid ${COLORS.border}`,
            borderRadius: RADII.lg,
            overflow: "hidden",
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
            <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.black }}>
              Recent Leads
            </span>
            <button
              onClick={() => onNavigate("pipeline")}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: COLORS.textMuted,
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: FONTS.body,
              }}
            >
              View all
            </button>
          </div>
          {/* Table header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,2fr) minmax(0,1.2fr) minmax(0,1fr) minmax(0,1.2fr) minmax(0,0.8fr)",
              padding: "10px 24px",
              borderBottom: `1px solid ${COLORS.border}`,
              background: COLORS.bg,
            }}
          >
            {["Couple", "Date", "Brand", "Stage", "Value"].map((h) => (
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
          {recentLeads.map((lead) => (
            <RecentLeadRow
              key={lead.id}
              lead={lead}
              onClick={() => onOpenLead(lead.id)}
            />
          ))}
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Mini calendar */}
          <div
            style={{
              background: COLORS.white,
              border: `1px solid ${COLORS.border}`,
              borderRadius: RADII.lg,
              padding: 20,
            }}
          >
            <CalendarMini leads={leads} />
          </div>

          {/* Claude Clues placeholder */}
          <div
            style={{
              background: COLORS.bg,
              border: `1px solid ${COLORS.border}`,
              borderRadius: RADII.lg,
              padding: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <Icon type="spark" size={16} color={COLORS.black} />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: COLORS.black,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Claude Clues
              </span>
            </div>
            <p
              style={{
                fontSize: 13,
                color: COLORS.textMuted,
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              AI pipeline insights will appear here. Coming in Week 2.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
