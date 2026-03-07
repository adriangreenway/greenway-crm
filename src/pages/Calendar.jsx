import React, { useState, useMemo, useEffect } from "react";
import { COLORS, FONTS, RADII } from "../tokens";
import Icon from "../icons";
import { BrandBadge, StageBadge } from "../components/Badge";
import SlideOverPanel from "../components/SlideOverPanel";
import { getLeadName, formatCurrency, formatDate } from "../data/seed";
import { useCalendarSync } from "../hooks/useCalendarSync";

// Month navigation arrows
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

// Event chip inside day cell (CC events)
const EventChip = ({ event }) => {
  const { lead, type } = event;
  const isKirby = lead.brand === "Kirby Collective";
  const prefix = type === "consultation" ? "\u260E " : type === "followup" ? "\u2709 " : "";
  return (
    <div
      style={{
        padding: "2px 6px",
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: "16px",
        background: isKirby ? COLORS.teal : COLORS.black,
        color: COLORS.white,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        maxWidth: "100%",
      }}
    >
      {prefix}{getLeadName(lead)}
    </div>
  );
};

// Personal event chip (visually secondary)
const PersonalChip = ({ event }) => {
  const label = event.title
    ? event.title.length > 15 ? event.title.slice(0, 15) + "..." : event.title
    : "Personal";
  return (
    <div
      style={{
        padding: "1px 5px",
        borderRadius: 3,
        fontSize: 10,
        fontWeight: 500,
        lineHeight: "15px",
        background: COLORS.bg,
        color: COLORS.textLight,
        border: `1px solid ${COLORS.borderLight}`,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        maxWidth: "100%",
      }}
    >
      {label}
    </div>
  );
};

// Event type labels
const TYPE_LABELS = { wedding: "Wedding", consultation: "Consultation", followup: "Follow Up" };

// Format personal event time
function formatPersonalTime(event) {
  if (event.all_day) return "All day";
  if (!event.start_time) return "";
  try {
    const d = new Date(event.start_time);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

// Day detail drawer — shows all events on a given date
const DayDrawer = ({ date, events, personalEvents, onClose, onOpenLead }) => {
  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const totalCount = events.length + personalEvents.length;
  const weddingEvents = events.filter((e) => e.type === "wedding");
  const hasConflict =
    weddingEvents.length > 1 &&
    weddingEvents.some((e) => e.lead.brand === "Greenway") &&
    weddingEvents.some((e) => e.lead.brand === "Kirby Collective");

  return (
    <SlideOverPanel
      open
      title={dateStr}
      subtitle={
        totalCount === 0
          ? "No events"
          : `${totalCount} event${totalCount > 1 ? "s" : ""}`
      }
      onClose={onClose}
    >
      {hasConflict && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            background: COLORS.redLight,
            borderRadius: RADII.sm,
            marginBottom: 16,
          }}
        >
          <Icon type="clock" size={14} color={COLORS.red} />
          <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.red }}>
            Date conflict: Greenway and Kirby Collective events overlap
          </span>
        </div>
      )}

      {/* CC events */}
      {events.length === 0 && personalEvents.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "40px 0",
          }}
        >
          <Icon type="calendar" size={32} color={COLORS.border} />
          <p
            style={{
              fontSize: 13,
              color: COLORS.textMuted,
              marginTop: 12,
            }}
          >
            No events on this date.
          </p>
        </div>
      )}

      {events.length === 0 && personalEvents.length > 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "24px 0 8px",
          }}
        >
          <p style={{ fontSize: 13, color: COLORS.textLight }}>
            No Greenway events
          </p>
        </div>
      )}

      {events.map((event) => (
        <div
          key={`${event.lead.id}-${event.type}`}
          style={{
            padding: 16,
            background: COLORS.bg,
            borderRadius: RADII.md,
            marginBottom: 12,
            border: `1px solid ${COLORS.borderLight}`,
          }}
        >
          {/* Event type indicator */}
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: COLORS.textLight,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 6,
            }}
          >
            {event.type === "consultation" ? "\u260E " : event.type === "followup" ? "\u2709 " : ""}
            {TYPE_LABELS[event.type]}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 10,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: COLORS.black,
                }}
              >
                {getLeadName(event.lead)}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: COLORS.textMuted,
                  marginTop: 2,
                }}
              >
                {event.lead.venue || "No venue"}
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.black }}>
              {formatCurrency(event.lead.price)}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <BrandBadge brand={event.lead.brand} />
            <StageBadge stage={event.lead.stage} />
          </div>

          {event.lead.config && (
            <div
              style={{
                fontSize: 12,
                color: COLORS.textMuted,
                marginBottom: 12,
              }}
            >
              {event.lead.config}
              {event.lead.guest_count ? ` \u00B7 ${event.lead.guest_count} guests` : ""}
            </div>
          )}

          <button
            onClick={() => onOpenLead(event.lead.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              background: COLORS.white,
              border: `1px solid ${COLORS.border}`,
              borderRadius: RADII.sm,
              fontSize: 12,
              fontWeight: 600,
              color: COLORS.black,
              cursor: "pointer",
              fontFamily: FONTS.body,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = COLORS.bg)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = COLORS.white)
            }
          >
            <Icon type="eye" size={13} color={COLORS.textMuted} />
            View in Pipeline
          </button>
        </div>
      ))}

      {/* Personal Calendar section */}
      {personalEvents.length > 0 && (
        <>
          <div
            style={{
              height: 1,
              background: COLORS.borderLight,
              margin: "16px 0 12px",
            }}
          />
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: COLORS.textLight,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 12,
            }}
          >
            Personal Calendar
          </div>
          {personalEvents.map((pe) => (
            <div
              key={pe.google_event_id || pe.title}
              style={{
                padding: "10px 14px",
                marginBottom: 8,
                borderRadius: RADII.sm,
                border: `1px solid ${COLORS.borderLight}`,
                background: COLORS.white,
              }}
            >
              <div style={{ fontSize: 13, color: COLORS.textMuted, fontWeight: 500 }}>
                {pe.title || "Personal event"}
              </div>
              <div style={{ fontSize: 11, color: COLORS.textLight, marginTop: 2 }}>
                {formatPersonalTime(pe)}
              </div>
            </div>
          ))}
        </>
      )}
    </SlideOverPanel>
  );
};

// Single day cell in the calendar grid
const DayCell = ({ day, events, personalEvents, isToday, onClick }) => {
  const weddingEvents = events.filter((e) => e.type === "wedding");
  const hasGreenway = weddingEvents.some((e) => e.lead.brand === "Greenway");
  const hasKirby = weddingEvents.some((e) => e.lead.brand === "Kirby Collective");
  const hasConflict = hasGreenway && hasKirby;
  const hasPersonal = personalEvents.length > 0;

  return (
    <div
      onClick={onClick}
      style={{
        minHeight: 90,
        padding: 6,
        background: isToday ? "#FAFAF7" : COLORS.white,
        border: `1px solid ${isToday ? COLORS.black : COLORS.borderLight}`,
        borderLeft: hasPersonal && !isToday
          ? `2px solid ${COLORS.border}`
          : `1px solid ${isToday ? COLORS.black : COLORS.borderLight}`,
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
      {/* Date number + conflict dot */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 4,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: isToday || events.length > 0 || hasPersonal ? 700 : 500,
            color: isToday ? COLORS.black : events.length > 0 || hasPersonal ? COLORS.black : COLORS.textMuted,
          }}
        >
          {day}
        </span>
        {hasConflict && (
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: COLORS.red,
              flexShrink: 0,
            }}
          />
        )}
      </div>

      {/* Event chips */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        {events.slice(0, 2).map((event) => (
          <EventChip key={`${event.lead.id}-${event.type}`} event={event} />
        ))}
        {events.length > 2 && (
          <span
            style={{
              fontSize: 10,
              color: COLORS.textMuted,
              fontWeight: 600,
              paddingLeft: 2,
            }}
          >
            +{events.length - 2} more
          </span>
        )}
        {/* Personal event chips — only show if room (max 1 visible) */}
        {events.length <= 2 && personalEvents.slice(0, 1).map((pe) => (
          <PersonalChip key={pe.google_event_id || pe.title} event={pe} />
        ))}
        {events.length <= 2 && personalEvents.length > 1 && (
          <span
            style={{
              fontSize: 9,
              color: COLORS.textLight,
              fontWeight: 500,
              paddingLeft: 2,
            }}
          >
            +{personalEvents.length - 1} personal
          </span>
        )}
      </div>
    </div>
  );
};

const Calendar = ({ leads, onOpenLead }) => {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [personalEvents, setPersonalEvents] = useState([]);

  const { isConnected, pullEvents } = useCalendarSync();

  // Pull personal events when month changes or on mount (if connected)
  useEffect(() => {
    if (!isConnected) {
      setPersonalEvents([]);
      return;
    }

    const monthStart = new Date(viewYear, viewMonth, 1).toISOString();
    const monthEnd = new Date(viewYear, viewMonth + 1, 1).toISOString();

    pullEvents(monthStart, monthEnd)
      .then((events) => setPersonalEvents(events || []))
      .catch((err) => {
        console.warn("Calendar sync pull failed:", err);
        setPersonalEvents([]);
      });
  }, [isConnected, viewYear, viewMonth, pullEvents]);

  // Build CC event map for the displayed month
  const eventMap = useMemo(() => {
    const map = {};
    const addEntry = (dateStr, lead, type) => {
      if (!dateStr) return;
      const justDate = dateStr.split("T")[0];
      const d = new Date(justDate + "T00:00:00");
      if (d.getFullYear() !== viewYear || d.getMonth() !== viewMonth) return;
      const day = d.getDate();
      if (!map[day]) map[day] = [];
      map[day].push({ lead, type });
    };
    leads.forEach((lead) => {
      addEntry(lead.event_date, lead, "wedding");
      addEntry(lead.consultation_date, lead, "consultation");
      addEntry(lead.followup_date, lead, "followup");
    });
    return map;
  }, [leads, viewYear, viewMonth]);

  // Build personal event map keyed by day number
  const personalEventMap = useMemo(() => {
    const map = {};
    personalEvents.forEach((pe) => {
      if (!pe.start_time) return;
      const dateStr = pe.all_day ? pe.start_time : pe.start_time.split("T")[0];
      const d = new Date(dateStr + (dateStr.includes("T") ? "" : "T00:00:00"));
      if (d.getFullYear() !== viewYear || d.getMonth() !== viewMonth) return;
      const day = d.getDate();
      if (!map[day]) map[day] = [];
      map[day].push(pe);
    });
    return map;
  }, [personalEvents, viewYear, viewMonth]);

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

  // Events for selected date drawer
  const selectedEvents = selectedDate ? eventMap[selectedDate.getDate()] || [] : [];
  const selectedPersonalEvents = selectedDate ? personalEventMap[selectedDate.getDate()] || [] : [];

  // B8: Close drawer before navigating to pipeline
  const handleOpenLeadFromDrawer = (leadId) => {
    setSelectedDate(null);
    onOpenLead(leadId);
  };

  return (
    <div style={{ animation: "fadeUp 0.3s ease", maxWidth: 1100 }}>
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
            Calendar
          </h1>
          <p style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>
            Wedding dates, consultations, and follow up deadlines.
          </p>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: COLORS.black,
              }}
            />
            <span style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 600 }}>
              Greenway
            </span>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: COLORS.teal,
              }}
            />
            <span style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 600 }}>
              Kirby Collective
            </span>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: COLORS.red,
              }}
            />
            <span style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 600 }}>
              Conflict
            </span>
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span style={{ fontSize: 12 }}>{"\u260E"}</span>
            <span style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 600 }}>
              Consultation
            </span>
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span style={{ fontSize: 12 }}>{"\u2709"}</span>
            <span style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 600 }}>
              Follow Up
            </span>
          </div>
        </div>
      </div>

      {/* Calendar card */}
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
            padding: "18px 24px",
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <NavArrow direction="left" onClick={prevMonth} />
            <NavArrow direction="right" onClick={nextMonth} />
            <span
              style={{
                fontFamily: FONTS.display,
                fontSize: 18,
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
            padding: "10px 16px 8px",
            background: COLORS.bg,
            borderBottom: `1px solid ${COLORS.borderLight}`,
          }}
        >
          {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(
            (d) => (
              <div
                key={d}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: COLORS.textLight,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  textAlign: "center",
                  padding: "4px 0",
                }}
              >
                {d.slice(0, 3)}
              </div>
            )
          )}
        </div>

        {/* Day grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 0,
            padding: 12,
            paddingTop: 8,
          }}
        >
          {/* Empty offset cells */}
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`pad-${i}`} style={{ minHeight: 90 }} />
          ))}

          {/* Day cells */}
          {days.map((day) => {
            const isToday =
              isCurrentMonth && day === today.getDate();
            const events = eventMap[day] || [];
            const dayPersonal = personalEventMap[day] || [];
            return (
              <DayCell
                key={day}
                day={day}
                events={events}
                personalEvents={dayPersonal}
                isToday={isToday}
                onClick={() =>
                  setSelectedDate(new Date(viewYear, viewMonth, day))
                }
              />
            );
          })}
        </div>
      </div>

      {/* Day detail drawer */}
      {selectedDate && (
        <DayDrawer
          date={selectedDate}
          events={selectedEvents}
          personalEvents={selectedPersonalEvents}
          onClose={() => setSelectedDate(null)}
          onOpenLead={handleOpenLeadFromDrawer}
        />
      )}
    </div>
  );
};

export default Calendar;
