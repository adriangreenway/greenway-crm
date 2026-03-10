import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { COLORS, FONTS, RADII, SHADOWS } from "../tokens";
import Icon from "../icons";
import { StageBadge } from "../components/Badge";
import SlideOverPanel from "../components/SlideOverPanel";
import EmptyState from "../components/EmptyState";
import { formatCurrency, formatDate } from "../data/seed";
import { formatPhone } from "../utils/formatters";
import { computePlannerNudges } from "../utils/plannerNudges";

// ── Tier config ──
const TIER_COLORS = {
  new: COLORS.textLight,
  warm: COLORS.gold,
  strong: COLORS.green,
  vip: COLORS.blue,
};
const TIER_BG = {
  new: COLORS.bg,
  warm: COLORS.amberLight,
  strong: COLORS.greenLight,
  vip: COLORS.blueLight,
};
const TIER_OPTIONS = ["new", "warm", "strong", "vip"];
const FILTER_PILLS = ["All", "New", "Warm", "Strong", "VIP"];

// ── Helpers ──
function formatRelativeTime(dateString) {
  if (!dateString) return null;
  const now = new Date();
  const d = new Date(dateString);
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.round(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.round(diffDays / 30)} months ago`;
  return `${Math.round(diffDays / 365)} years ago`;
}

function computeReferralStats(planner, leads) {
  const linked = leads.filter((l) => l.planner_id === planner.id);
  const booked = linked.filter((l) => ["Booked", "Fulfilled"].includes(l.stage));
  const pipeline = linked.filter(
    (l) => !["Lost", "Fulfilled", "Booked"].includes(l.stage)
  );
  const totalRevenue = booked.reduce((sum, l) => sum + (l.price || 0), 0);
  const pipelineValue = pipeline.reduce((sum, l) => sum + (l.price || 0), 0);
  return {
    totalReferrals: linked.length,
    bookedReferrals: booked.length,
    conversionRate:
      linked.length > 0
        ? Math.round((booked.length / linked.length) * 100)
        : null,
    totalRevenue,
    averageDealSize:
      booked.length > 0 ? Math.round(totalRevenue / booked.length) : null,
    pipelineValue,
    lastReferralDate:
      linked.length > 0
        ? linked.sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
          )[0].created_at
        : null,
  };
}

function fmtCurrency(amount) {
  if (amount == null || amount === 0) return "—";
  return `$${Number(amount).toLocaleString()}`;
}

// ── Tier Badge ──
const TierBadge = ({ tier }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "3px 10px",
      borderRadius: RADII.pill,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.03em",
      textTransform: "uppercase",
      whiteSpace: "nowrap",
      color: TIER_COLORS[tier] || COLORS.textLight,
      background: TIER_BG[tier] || COLORS.bg,
    }}
  >
    {tier}
  </span>
);

// ── Tier Dot ──
const TierDot = ({ tier }) => (
  <span
    style={{
      display: "inline-block",
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: TIER_COLORS[tier] || COLORS.textLight,
      flexShrink: 0,
    }}
  />
);

// ── Toast ──
function useToast() {
  const [toast, setToast] = useState(null);
  const show = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);
  const Toast = toast ? (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        background: COLORS.black,
        color: COLORS.white,
        padding: "10px 24px",
        borderRadius: RADII.pill,
        fontSize: 13,
        fontWeight: 600,
        fontFamily: FONTS.body,
        zIndex: 200,
        animation: "fadeUp 0.25s ease",
        boxShadow: SHADOWS.lg,
      }}
    >
      {toast}
    </div>
  ) : null;
  return { show, Toast };
}

// ── Main Page ──
export default function Planners({
  planners,
  leads,
  fetchPlanners,
  createPlanner,
  updatePlanner,
  deletePlanner,
  searchPlanners,
  onOpenLead,
  pendingPlannerId,
  clearPendingPlanner,
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("All");
  const [sortField, setSortField] = useState("revenue");
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedPlanner, setSelectedPlanner] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [nudgesExpanded, setNudgesExpanded] = useState(true);
  const [nudgesShowAll, setNudgesShowAll] = useState(false);
  const { show: showToast, Toast } = useToast();

  // Compute nudges
  const nudges = useMemo(() => computePlannerNudges(planners, leads), [planners, leads]);

  // Auto-open planner drawer from cross-navigation
  useEffect(() => {
    if (pendingPlannerId) {
      const planner = (planners || []).find((p) => p.id === pendingPlannerId);
      if (planner) setSelectedPlanner(planner);
      if (clearPendingPlanner) clearPendingPlanner();
    }
  }, [pendingPlannerId, planners, clearPendingPlanner]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  // Filtered + sorted planners
  const filteredPlanners = useMemo(() => {
    let list = planners || [];

    // Tier filter
    if (tierFilter !== "All") {
      list = list.filter(
        (p) => p.tier?.toLowerCase() === tierFilter.toLowerCase()
      );
    }

    // Search filter
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.company?.toLowerCase().includes(q) ||
          p.venues?.some((v) => v.toLowerCase().includes(q))
      );
    }

    // Compute stats for sorting
    const withStats = list.map((p) => ({
      ...p,
      _stats: computeReferralStats(p, leads || []),
    }));

    // Sort
    withStats.sort((a, b) => {
      let av, bv;
      switch (sortField) {
        case "revenue":
          av = a._stats.totalRevenue;
          bv = b._stats.totalRevenue;
          break;
        case "referrals":
          av = a._stats.totalReferrals;
          bv = b._stats.totalReferrals;
          break;
        case "lastReferral":
          av = a._stats.lastReferralDate
            ? new Date(a._stats.lastReferralDate).getTime()
            : 0;
          bv = b._stats.lastReferralDate
            ? new Date(b._stats.lastReferralDate).getTime()
            : 0;
          break;
        case "lastOutreach":
          av = a.last_outreach_date
            ? new Date(a.last_outreach_date).getTime()
            : 0;
          bv = b.last_outreach_date
            ? new Date(b.last_outreach_date).getTime()
            : 0;
          break;
        case "tier": {
          const order = { vip: 4, strong: 3, warm: 2, new: 1 };
          av = order[a.tier] || 0;
          bv = order[b.tier] || 0;
          break;
        }
        default:
          av = a._stats.totalRevenue;
          bv = b._stats.totalRevenue;
      }
      return sortAsc ? av - bv : bv - av;
    });

    return withStats;
  }, [planners, leads, tierFilter, debouncedSearch, sortField, sortAsc]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const all = planners || [];
    const allLeads = leads || [];
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const activeThisYear = all.filter((p) =>
      allLeads.some(
        (l) =>
          l.planner_id === p.id &&
          new Date(l.created_at) >= oneYearAgo
      )
    ).length;

    const linkedLeads = allLeads.filter((l) =>
      all.some((p) => p.id === l.planner_id)
    );
    const bookedLinked = linkedLeads.filter((l) =>
      ["Booked", "Fulfilled"].includes(l.stage)
    );
    const totalRevenue = bookedLinked.reduce(
      (sum, l) => sum + (l.price || 0),
      0
    );
    const conversionRate =
      linkedLeads.length > 0
        ? Math.round((bookedLinked.length / linkedLeads.length) * 100)
        : 0;

    return {
      total: all.length,
      activeThisYear,
      totalRevenue,
      conversionRate,
    };
  }, [planners, leads]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleNewPlanner = async (data) => {
    try {
      const created = await createPlanner(data);
      setShowNewModal(false);
      setSelectedPlanner(created);
      showToast("Planner created");
    } catch (err) {
      console.error("Create planner error:", err);
      showToast("Failed to create planner");
    }
  };

  const handleUpdatePlanner = async (id, data) => {
    try {
      const updated = await updatePlanner(id, data);
      setSelectedPlanner(updated);
      showToast("Planner updated");
    } catch (err) {
      console.error("Update planner error:", err);
      showToast("Failed to update planner");
    }
  };

  const handleDeletePlanner = async (planner) => {
    const linkedCount = (leads || []).filter(
      (l) => l.planner_id === planner.id
    ).length;
    const ok = window.confirm(
      `Delete ${planner.name}? This will unlink ${linkedCount} leads from this planner. The leads themselves won't be deleted.`
    );
    if (!ok) return;
    try {
      await deletePlanner(planner.id);
      setSelectedPlanner(null);
      showToast("Planner deleted");
    } catch (err) {
      console.error("Delete planner error:", err);
      showToast("Failed to delete planner");
    }
  };

  // Column header helper
  const SortHeader = ({ field, label, width, align }) => (
    <th
      onClick={() => handleSort(field)}
      style={{
        width,
        textAlign: align || "left",
        padding: "10px 12px",
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        color: COLORS.textLight,
        letterSpacing: "0.04em",
        cursor: "pointer",
        userSelect: "none",
        background: COLORS.bg,
        borderBottom: `1px solid ${COLORS.border}`,
        fontFamily: FONTS.body,
      }}
    >
      {label}
      {sortField === field && (
        <span style={{ marginLeft: 4, fontSize: 10 }}>
          {sortAsc ? "▲" : "▼"}
        </span>
      )}
    </th>
  );

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h1
          style={{
            fontFamily: FONTS.display,
            fontSize: 26,
            fontWeight: 600,
            color: COLORS.black,
            margin: 0,
          }}
        >
          Planners
        </h1>
        <button
          onClick={() => setShowNewModal(true)}
          style={{
            background: COLORS.black,
            color: COLORS.white,
            border: "none",
            borderRadius: RADII.pill,
            padding: "10px 20px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: FONTS.body,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Icon type="plus" size={14} color={COLORS.white} />
          New Planner
        </button>
      </div>

      {/* Search + Tier filter row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        {/* Search */}
        <div style={{ position: "relative" }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search planners..."
            style={{
              width: 240,
              padding: "8px 12px 8px 32px",
              fontSize: 13,
              border: `1px solid ${COLORS.border}`,
              borderRadius: RADII.sm,
              background: COLORS.bg,
              outline: "none",
              fontFamily: FONTS.body,
              color: COLORS.text,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
            }}
          >
            <Icon type="search" size={15} color={COLORS.textLight} />
          </div>
        </div>

        {/* Tier pills */}
        <div style={{ display: "flex", gap: 6 }}>
          {FILTER_PILLS.map((pill) => {
            const active = tierFilter === pill;
            return (
              <button
                key={pill}
                onClick={() => setTierFilter(pill)}
                style={{
                  padding: "6px 16px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: RADII.sm,
                  border: active ? "none" : `1px solid ${COLORS.border}`,
                  background: active ? COLORS.black : COLORS.bg,
                  color: active ? COLORS.white : COLORS.text,
                  cursor: "pointer",
                  fontFamily: FONTS.body,
                }}
              >
                {pill}
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary stats bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          marginBottom: 20,
          padding: "12px 0",
        }}
      >
        {[
          { value: summaryStats.total, label: "Total Planners" },
          { value: summaryStats.activeThisYear, label: "Active This Year" },
          {
            value: fmtCurrency(summaryStats.totalRevenue),
            label: "Referred Revenue",
          },
          { value: `${summaryStats.conversionRate}%`, label: "Avg Conversion" },
        ].map((stat, i) => (
          <React.Fragment key={stat.label}>
            {i > 0 && (
              <div
                style={{
                  width: 1,
                  height: 28,
                  background: COLORS.border,
                  margin: "0 20px",
                }}
              />
            )}
            <div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: COLORS.text,
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: COLORS.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  fontWeight: 500,
                }}
              >
                {stat.label}
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Relationship Nudges */}
      {nudges.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={() => setNudgesExpanded((prev) => !prev)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px 0",
              marginBottom: nudgesExpanded ? 10 : 0,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                textTransform: "uppercase",
                color: COLORS.textMuted,
                letterSpacing: "0.04em",
              }}
            >
              Relationship Nudges
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: COLORS.gold,
                background: COLORS.amberLight,
                borderRadius: RADII.pill,
                padding: "2px 8px",
                minWidth: 18,
                textAlign: "center",
              }}
            >
              {nudges.length}
            </span>
            <span
              style={{
                display: "inline-flex",
                transition: "transform 0.2s ease",
                transform: nudgesExpanded ? "rotate(90deg)" : "rotate(0deg)",
              }}
            >
              <Icon type="chevron" size={14} color={COLORS.textMuted} />
            </span>
          </button>
          {nudgesExpanded && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(nudgesShowAll ? nudges : nudges.slice(0, 5)).map((nudge, i) => (
                <div
                  key={`${nudge.planner.id}-${nudge.type}-${i}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: COLORS.white,
                    border: `1px solid ${COLORS.borderLight}`,
                    borderLeft: `3px solid ${COLORS.gold}`,
                    borderRadius: RADII.sm,
                    padding: "14px 16px",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>
                      {nudge.planner.name}
                    </div>
                    <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 2 }}>
                      {nudge.text}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (nudge.actionLabel === "Open Profile") {
                        const planner = (planners || []).find((p) => p.id === nudge.planner.id);
                        if (planner) setSelectedPlanner(planner);
                      } else {
                        showToast("Open this planner's profile, then navigate to Pipeline to draft an email with their context.");
                      }
                    }}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      background: COLORS.black,
                      color: COLORS.white,
                      border: "none",
                      borderRadius: RADII.sm,
                      padding: "6px 14px",
                      cursor: "pointer",
                      fontFamily: FONTS.body,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    {nudge.actionLabel}
                  </button>
                </div>
              ))}
              {!nudgesShowAll && nudges.length > 5 && (
                <div
                  onClick={() => setNudgesShowAll(true)}
                  style={{
                    fontSize: 12,
                    color: COLORS.gold,
                    cursor: "pointer",
                    paddingLeft: 4,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                >
                  Show all {nudges.length}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Planner Table */}
      {filteredPlanners.length === 0 ? (
        <div
          style={{
            background: COLORS.white,
            border: `1px solid ${COLORS.border}`,
            borderRadius: RADII.lg,
          }}
        >
          <EmptyState
            icon="planners"
            title="No planners yet"
            description="Add your first planner to start tracking relationships."
          />
          <div style={{ textAlign: "center", paddingBottom: 32 }}>
            <button
              onClick={() => setShowNewModal(true)}
              style={{
                background: COLORS.black,
                color: COLORS.white,
                border: "none",
                borderRadius: RADII.pill,
                padding: "10px 20px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: FONTS.body,
              }}
            >
              + New Planner
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            background: COLORS.white,
            border: `1px solid ${COLORS.border}`,
            borderRadius: RADII.lg,
            overflow: "hidden",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: FONTS.body,
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    width: "25%",
                    textAlign: "left",
                    padding: "10px 12px",
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    color: COLORS.textLight,
                    letterSpacing: "0.04em",
                    background: COLORS.bg,
                    borderBottom: `1px solid ${COLORS.border}`,
                    fontFamily: FONTS.body,
                  }}
                >
                  Name
                </th>
                <SortHeader field="referrals" label="Referrals" width="12%" />
                <SortHeader field="revenue" label="Revenue" width="15%" />
                <SortHeader
                  field="lastReferral"
                  label="Last Referral"
                  width="15%"
                />
                <SortHeader
                  field="lastOutreach"
                  label="Last Outreach"
                  width="15%"
                />
                <SortHeader
                  field="tier"
                  label="Tier"
                  width="10%"
                />
                <th
                  style={{
                    width: "8%",
                    textAlign: "center",
                    padding: "10px 12px",
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    color: COLORS.textLight,
                    letterSpacing: "0.04em",
                    background: COLORS.bg,
                    borderBottom: `1px solid ${COLORS.border}`,
                    fontFamily: FONTS.body,
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPlanners.map((p) => (
                <PlannerRow
                  key={p.id}
                  planner={p}
                  stats={p._stats}
                  onClick={() => setSelectedPlanner(p)}
                  onMail={() =>
                    showToast(
                      "Open this planner's profile, then navigate to Pipeline to draft an email with their context."
                    )
                  }
                  onView={() => setSelectedPlanner(p)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Drawer */}
      {selectedPlanner && (
        <PlannerDrawer
          planner={selectedPlanner}
          leads={leads}
          onClose={() => setSelectedPlanner(null)}
          onSave={handleUpdatePlanner}
          onDelete={handleDeletePlanner}
          onOpenLead={onOpenLead}
          showToast={showToast}
        />
      )}

      {/* New Planner Modal */}
      {showNewModal && (
        <NewPlannerModal
          onClose={() => setShowNewModal(false)}
          onCreate={handleNewPlanner}
        />
      )}

      {Toast}
    </div>
  );
}

// ── Planner Table Row ──
function PlannerRow({ planner, stats, onClick, onMail, onView }) {
  const [hovered, setHovered] = useState(false);

  return (
    <tr
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: "pointer",
        background: hovered ? COLORS.bg : "transparent",
        transition: "background 0.15s",
        borderBottom: `1px solid ${COLORS.borderLight}`,
      }}
    >
      {/* Name + Company */}
      <td style={{ padding: "12px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <TierDot tier={planner.tier} />
          <div>
            <div
              style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}
            >
              {planner.name}
            </div>
            {planner.company && (
              <div
                style={{
                  fontSize: 12,
                  color: COLORS.textMuted,
                  marginTop: 1,
                }}
              >
                {planner.company}
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Referrals */}
      <td style={{ padding: "12px 12px", fontSize: 13, color: COLORS.text }}>
        {stats.totalReferrals > 0
          ? `${stats.bookedReferrals} booked / ${stats.totalReferrals} total`
          : "—"}
      </td>

      {/* Revenue */}
      <td style={{ padding: "12px 12px", fontSize: 13, color: COLORS.text }}>
        {stats.totalRevenue > 0 ? fmtCurrency(stats.totalRevenue) : "—"}
      </td>

      {/* Last Referral */}
      <td style={{ padding: "12px 12px", fontSize: 13, color: COLORS.text }}>
        {formatRelativeTime(stats.lastReferralDate) || "—"}
      </td>

      {/* Last Outreach */}
      <td style={{ padding: "12px 12px", fontSize: 13 }}>
        {planner.last_outreach_date ? (
          formatRelativeTime(planner.last_outreach_date)
        ) : (
          <span style={{ color: COLORS.gold }}>Never</span>
        )}
      </td>

      {/* Tier */}
      <td style={{ padding: "12px 12px" }}>
        <TierBadge tier={planner.tier} />
      </td>

      {/* Actions */}
      <td
        style={{
          padding: "12px 12px",
          textAlign: "center",
        }}
      >
        <div
          style={{ display: "flex", gap: 8, justifyContent: "center" }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onMail}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              borderRadius: 4,
              display: "flex",
            }}
            title="Send email"
          >
            <Icon type="mail" size={16} color={COLORS.textMuted} />
          </button>
          <button
            onClick={onView}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              borderRadius: 4,
              display: "flex",
            }}
            title="View details"
          >
            <Icon type="eye" size={16} color={COLORS.textMuted} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Planner Detail Drawer ──
function PlannerDrawer({
  planner,
  leads,
  onClose,
  onSave,
  onDelete,
  onOpenLead,
  showToast,
}) {
  const [form, setForm] = useState({});
  const [venueInput, setVenueInput] = useState("");

  // Reset form when planner changes
  useEffect(() => {
    setForm({
      name: planner.name || "",
      company: planner.company || "",
      email: planner.email || "",
      phone: planner.phone ? formatPhone(planner.phone) : "",
      instagram: planner.instagram || "",
      website: planner.website || "",
      venues: planner.venues || [],
      tier: planner.tier || "new",
      first_contact_date: planner.first_contact_date || "",
      last_outreach_date: planner.last_outreach_date || "",
      next_outreach_date: planner.next_outreach_date || "",
      notes: planner.notes || "",
    });
    setVenueInput("");
  }, [planner.id]);

  const stats = useMemo(
    () => computeReferralStats(planner, leads || []),
    [planner, leads]
  );

  const linkedLeads = useMemo(
    () =>
      (leads || [])
        .filter((l) => l.planner_id === planner.id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [planner.id, leads]
  );

  const handleField = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handlePhoneChange = (value) => handleField("phone", formatPhone(value));

  const handleInstagramChange = (value) =>
    handleField("instagram", value.replace(/^@/, ""));

  const addVenue = () => {
    const v = venueInput.trim();
    if (
      !v ||
      form.venues.some((x) => x.toLowerCase() === v.toLowerCase())
    )
      return;
    handleField("venues", [...form.venues, v]);
    setVenueInput("");
  };

  const removeVenue = (idx) =>
    handleField(
      "venues",
      form.venues.filter((_, i) => i !== idx)
    );

  const handleSave = () => {
    const data = {
      ...form,
      phone: form.phone.replace(/\D/g, ""),
    };
    onSave(planner.id, data);
  };

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
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: 4,
  };

  return (
    <SlideOverPanel
      open
      onClose={onClose}
      title={planner.name}
      subtitle={planner.company || "Independent Planner"}
    >
      {/* Tier badge in header area */}
      <div style={{ marginBottom: 20, marginTop: -4 }}>
        <TierBadge tier={planner.tier} />
      </div>

      {/* Section 1: Profile */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Name</label>
          <input
            value={form.name}
            onChange={(e) => handleField("name", e.target.value)}
            style={inputStyle}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <label style={labelStyle}>Company</label>
            <input
              value={form.company}
              onChange={(e) => handleField("company", e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleField("email", e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <label style={labelStyle}>Phone</label>
            <input
              value={form.phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              style={inputStyle}
              placeholder="(XXX) XXX-XXXX"
            />
          </div>
          <div>
            <label style={labelStyle}>Instagram</label>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 13,
                  color: COLORS.textMuted,
                  pointerEvents: "none",
                }}
              >
                @
              </span>
              <input
                value={form.instagram}
                onChange={(e) => handleInstagramChange(e.target.value)}
                style={{ ...inputStyle, paddingLeft: 24 }}
              />
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Website</label>
          <input
            value={form.website}
            onChange={(e) => handleField("website", e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Venues tag list */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Venues</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
            {(form.venues || []).map((v, i) => (
              <span
                key={i}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 10px",
                  background: COLORS.bg,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: RADII.sm,
                  fontSize: 12,
                  color: COLORS.text,
                }}
              >
                {v}
                <button
                  onClick={() => removeVenue(i)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    fontSize: 14,
                    color: COLORS.textMuted,
                    lineHeight: 1,
                    display: "flex",
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <input
            value={venueInput}
            onChange={(e) => setVenueInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addVenue();
              }
            }}
            placeholder="Type venue name + Enter"
            style={inputStyle}
          />
        </div>

        {/* Tier select */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Tier</label>
          <select
            value={form.tier}
            onChange={(e) => handleField("tier", e.target.value)}
            style={{
              ...inputStyle,
              cursor: "pointer",
            }}
          >
            {TIER_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Dates */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <label style={labelStyle}>First Contact Date</label>
            <input
              type="date"
              value={form.first_contact_date}
              onChange={(e) =>
                handleField("first_contact_date", e.target.value)
              }
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Last Outreach Date</label>
            <input
              type="date"
              value={form.last_outreach_date}
              onChange={(e) =>
                handleField("last_outreach_date", e.target.value)
              }
              style={inputStyle}
            />
            <button
              onClick={() => {
                const today = new Date().toISOString().split("T")[0];
                handleField("last_outreach_date", today);
                onSave(planner.id, { ...form, last_outreach_date: today, phone: form.phone.replace(/\D/g, "") });
                showToast("Outreach date updated");
              }}
              style={{
                marginTop: 6,
                fontSize: 12,
                fontWeight: 600,
                background: COLORS.white,
                color: COLORS.text,
                border: `1px solid ${COLORS.border}`,
                borderRadius: RADII.sm,
                padding: "4px 12px",
                cursor: "pointer",
                fontFamily: FONTS.body,
              }}
            >
              Mark as Contacted
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Next Outreach Date</label>
          <input
            type="date"
            value={form.next_outreach_date}
            onChange={(e) =>
              handleField("next_outreach_date", e.target.value)
            }
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => handleField("notes", e.target.value)}
            style={{
              ...inputStyle,
              minHeight: 80,
              resize: "vertical",
            }}
          />
        </div>
      </div>

      {/* Section 2: Referral Stats Card */}
      <div
        style={{
          background: "rgba(245, 242, 237, 0.5)",
          border: `1px solid ${COLORS.borderLight}`,
          borderRadius: RADII.lg,
          padding: 20,
          marginBottom: 24,
        }}
      >
        {stats.totalReferrals === 0 ? (
          <div
            style={{
              fontSize: 13,
              color: COLORS.textMuted,
              textAlign: "center",
              padding: "12px 0",
            }}
          >
            No referrals linked yet. Tag this planner on leads in the Pipeline
            to start tracking.
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginBottom: 16,
              }}
            >
              {[
                {
                  value: stats.totalReferrals,
                  label: "Total Referrals",
                },
                { value: stats.bookedReferrals, label: "Booked" },
                {
                  value:
                    stats.conversionRate != null
                      ? `${stats.conversionRate}%`
                      : "—",
                  label: "Conversion Rate",
                },
                {
                  value: fmtCurrency(stats.totalRevenue),
                  label: "Total Revenue",
                },
              ].map((s) => (
                <div key={s.label}>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: COLORS.text,
                    }}
                  >
                    {s.value}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: COLORS.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                fontSize: 13,
                color: COLORS.textMuted,
                display: "flex",
                gap: 20,
              }}
            >
              <span>
                Avg Deal Size:{" "}
                {stats.averageDealSize
                  ? fmtCurrency(stats.averageDealSize)
                  : "—"}
              </span>
              <span>
                Pipeline Value: {fmtCurrency(stats.pipelineValue)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Section 3: Linked Leads */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            textTransform: "uppercase",
            color: COLORS.textMuted,
            letterSpacing: "0.04em",
            marginBottom: 10,
          }}
        >
          Linked Leads
        </div>
        {linkedLeads.length === 0 ? (
          <div style={{ fontSize: 13, color: COLORS.textMuted }}>
            No leads linked to this planner yet.
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 0,
            }}
          >
            {linkedLeads.map((l) => (
              <LinkedLeadRow
                key={l.id}
                lead={l}
                onClick={() => onOpenLead(l.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Section 4: Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          onClick={handleSave}
          style={{
            width: "100%",
            padding: "10px",
            background: COLORS.black,
            color: COLORS.white,
            border: "none",
            borderRadius: RADII.sm,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: FONTS.body,
          }}
        >
          Save Changes
        </button>
        <button
          onClick={() => onDelete(planner)}
          style={{
            width: "100%",
            padding: "10px",
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
          Delete Planner
        </button>
      </div>
    </SlideOverPanel>
  );
}

// ── Linked Lead Row ──
function LinkedLeadRow({ lead, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 10px",
        borderRadius: RADII.sm,
        cursor: "pointer",
        background: hovered ? COLORS.bg : "transparent",
        transition: "background 0.15s",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>
          {lead.partner1_first} & {lead.partner2_first}
        </div>
        <div
          style={{
            fontSize: 12,
            color: COLORS.textMuted,
            display: "flex",
            gap: 8,
            marginTop: 2,
          }}
        >
          {lead.venue && <span>{lead.venue}</span>}
          {lead.event_date && <span>{formatDate(lead.event_date)}</span>}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexShrink: 0,
        }}
      >
        <StageBadge stage={lead.stage} />
        <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>
          {formatCurrency(lead.price)}
        </span>
      </div>
    </div>
  );
}

// ── New Planner Modal ──
function NewPlannerModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    instagram: "",
    website: "",
    tier: "new",
    first_contact_date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const nameRef = useRef(null);

  useEffect(() => {
    nameRef.current?.focus();
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleField = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const data = {
      ...form,
      phone: form.phone.replace(/\D/g, "") || undefined,
      instagram: form.instagram || undefined,
      website: form.website || undefined,
      company: form.company || undefined,
      email: form.email || undefined,
      notes: form.notes || undefined,
    };
    // Clean out undefined values
    Object.keys(data).forEach((k) => {
      if (data[k] === undefined) delete data[k];
    });
    onCreate(data);
  };

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
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: 4,
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(10, 10, 9, 0.3)",
          backdropFilter: "blur(2px)",
          zIndex: 110,
          animation: "fadeIn 0.2s ease",
        }}
      />
      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 480,
          maxWidth: "90vw",
          maxHeight: "85vh",
          overflow: "auto",
          background: COLORS.white,
          borderRadius: RADII.lg,
          boxShadow: SHADOWS.lg,
          padding: 28,
          zIndex: 111,
          fontFamily: FONTS.body,
          animation: "fadeUp 0.25s ease",
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: COLORS.black,
            marginBottom: 20,
          }}
        >
          New Planner
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={labelStyle}>Name *</label>
              <input
                ref={nameRef}
                value={form.name}
                onChange={(e) => handleField("name", e.target.value)}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Company</label>
              <input
                value={form.company}
                onChange={(e) => handleField("company", e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleField("email", e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input
                value={form.phone}
                onChange={(e) =>
                  handleField("phone", formatPhone(e.target.value))
                }
                style={inputStyle}
                placeholder="(XXX) XXX-XXXX"
              />
            </div>
            <div>
              <label style={labelStyle}>Instagram</label>
              <input
                value={form.instagram}
                onChange={(e) =>
                  handleField("instagram", e.target.value.replace(/^@/, ""))
                }
                style={inputStyle}
                placeholder="handle (no @)"
              />
            </div>
            <div>
              <label style={labelStyle}>Website</label>
              <input
                value={form.website}
                onChange={(e) => handleField("website", e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Tier</label>
              <select
                value={form.tier}
                onChange={(e) => handleField("tier", e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                {TIER_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>First Contact Date</label>
              <input
                type="date"
                value={form.first_contact_date}
                onChange={(e) =>
                  handleField("first_contact_date", e.target.value)
                }
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => handleField("notes", e.target.value)}
                style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!form.name.trim()}
            style={{
              width: "100%",
              padding: "10px",
              background: form.name.trim() ? COLORS.black : COLORS.border,
              color: COLORS.white,
              border: "none",
              borderRadius: RADII.sm,
              fontSize: 13,
              fontWeight: 600,
              cursor: form.name.trim() ? "pointer" : "not-allowed",
              fontFamily: FONTS.body,
              marginTop: 16,
            }}
          >
            Create Planner
          </button>
        </form>
      </div>
    </>
  );
}
