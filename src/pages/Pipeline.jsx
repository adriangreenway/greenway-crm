import React, { useState, useMemo, useEffect, useRef } from "react";
import { COLORS, FONTS, RADII, PIPELINE_STAGES, SOURCES, CONFIGS } from "../tokens";
import Icon from "../icons";
import { BrandBadge, StageBadge } from "../components/Badge";
import SlideOverPanel from "../components/SlideOverPanel";
import EmptyState from "../components/EmptyState";
import { getLeadName, formatCurrency, formatDate } from "../data/seed";
import { formatPhone, formatCurrency as fmtCurrency, parseCurrency, formatGuestCount as fmtGuests } from "../utils/formatters";

// Normalize consultation_date to ISO with seconds and Z
const normalizeConsultationDate = (val) => {
  if (!val) return null;
  if (val.endsWith("Z")) return val;
  if (val.length === 16) return val + ":00Z";
  if (val.length === 19) return val + "Z";
  return val;
};

// Toast notification — fixed pill at bottom center
const Toast = ({ message, visible, onDone }) => {
  useEffect(() => {
    if (visible) {
      const t = setTimeout(onDone, 2500);
      return () => clearTimeout(t);
    }
  }, [visible, onDone]);

  if (!visible) return null;

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
        zIndex: 200,
        animation: "fadeIn 0.2s ease",
        whiteSpace: "nowrap",
      }}
    >
      {message}
    </div>
  );
};

// Stage sort priority
const STAGE_ORDER = PIPELINE_STAGES.reduce((acc, s, i) => {
  acc[s] = i;
  return acc;
}, {});

// Truncation helper
const truncStyle = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

// Lead table row — matches vision mockup exactly
const LeadRow = ({ lead, onDraft, onView }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "minmax(0,2fr) minmax(0,1.1fr) minmax(0,1fr) minmax(0,1.2fr) minmax(0,0.7fr) 70px",
      alignItems: "center",
      padding: "14px 20px",
      borderBottom: `1px solid ${COLORS.borderLight}`,
      cursor: "pointer",
      transition: "background 0.1s",
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.bg)}
    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    onClick={() => onView(lead)}
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
      <StageBadge stage={lead.stage} />
    </div>
    <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.black, ...truncStyle }}>
      {formatCurrency(lead.price)}
    </div>
    <div
      style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}
      onClick={(e) => e.stopPropagation()}
    >
      <ActionButton icon="mail" title="Draft email" onClick={() => onDraft(lead)} />
      <ActionButton icon="eye" title="View" onClick={() => onView(lead)} />
    </div>
  </div>
);

// Small action button (mail, eye)
const ActionButton = ({ icon, title, onClick }) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      width: 32,
      height: 32,
      borderRadius: 8,
      border: `1px solid ${COLORS.border}`,
      background: COLORS.white,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.15s",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = COLORS.black;
      const svg = e.currentTarget.querySelector("svg");
      if (svg) svg.style.stroke = COLORS.white;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = COLORS.white;
      const svg = e.currentTarget.querySelector("svg");
      if (svg) svg.style.stroke = COLORS.textMuted;
    }}
  >
    <Icon type={icon} size={14} />
  </button>
);

// Filter pill button
const FilterPill = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: "7px 14px",
      background: active ? COLORS.black : COLORS.white,
      color: active ? COLORS.white : COLORS.textMuted,
      border: `1px solid ${active ? COLORS.black : COLORS.border}`,
      borderRadius: RADII.sm,
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer",
      fontFamily: FONTS.body,
      transition: "all 0.15s",
      whiteSpace: "nowrap",
    }}
  >
    {label}
  </button>
);

// Form field helper
const FormField = ({ label, children }) => (
  <div style={{ marginBottom: 16 }}>
    <label
      style={{
        display: "block",
        fontSize: 11,
        fontWeight: 600,
        color: COLORS.textMuted,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        marginBottom: 6,
      }}
    >
      {label}
    </label>
    {children}
  </div>
);

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  fontSize: 13,
  border: `1px solid ${COLORS.border}`,
  borderRadius: RADII.sm,
  outline: "none",
  fontFamily: FONTS.body,
  color: COLORS.text,
  background: COLORS.bg,
};

const selectStyle = {
  ...inputStyle,
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%239E9891' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
  paddingRight: 32,
};

// Lead detail / edit drawer
const LeadDrawer = ({ lead, isNew, onSave, onDelete, onClose }) => {
  const [form, setForm] = useState(
    isNew
      ? {
          partner1_first: "",
          partner1_last: "",
          partner2_first: "",
          partner2_last: "",
          email: "",
          phone: "",
          event_date: "",
          venue: "",
          guest_count: "",
          brand: "Greenway",
          stage: "New Lead",
          source: "Direct",
          source_detail: "",
          config: "",
          price: "",
          consultation_date: "",
          followup_date: "",
          contract_sent_date: "",
          booked_date: "",
          notes: "",
          planner_name: "",
          planner_email: "",
        }
      : {
          ...lead,
          phone: lead.phone ? formatPhone(lead.phone) : "",
          guest_count: lead.guest_count != null ? fmtGuests(lead.guest_count) : "",
          price: lead.price != null ? fmtCurrency(lead.price) : "",
          consultation_date: lead.consultation_date ? lead.consultation_date.slice(0, 16) : "",
        }
  );
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const deleteTimerRef = useRef(null);

  useEffect(() => {
    if (confirmingDelete) {
      deleteTimerRef.current = setTimeout(() => setConfirmingDelete(false), 3000);
      return () => clearTimeout(deleteTimerRef.current);
    }
  }, [confirmingDelete]);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const priceRaw = parseCurrency(form.price);
      const guestRaw = parseInt(String(form.guest_count).replace(/\D/g, ""), 10);
      const data = {
        ...form,
        phone: form.phone ? form.phone.replace(/\D/g, "") : null,
        guest_count: guestRaw && !isNaN(guestRaw) ? guestRaw : null,
        price: priceRaw || null,
        consultation_date: normalizeConsultationDate(form.consultation_date),
        followup_date: form.followup_date || null,
        contract_sent_date: form.contract_sent_date || null,
        booked_date: form.booked_date || null,
        source_detail: form.source_detail || null,
        planner_name: form.planner_name || null,
        planner_email: form.planner_email || null,
        config: form.config || null,
        event_date: form.event_date || null,
      };
      await onSave(data);
      onClose();
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!lead?.id) return;
    setSaving(true);
    try {
      await onDelete(lead.id);
      onClose();
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = () => {
    if (confirmingDelete) {
      handleDelete();
    } else {
      setConfirmingDelete(true);
    }
  };

  const title = isNew
    ? "New Lead"
    : getLeadName(form);
  const subtitle = isNew
    ? "Add a new lead to the pipeline"
    : `${form.venue || "No venue"} \u00B7 ${formatDate(form.event_date)}`;

  return (
    <SlideOverPanel open title={title} subtitle={subtitle} onClose={onClose}>
      <div onClick={() => confirmingDelete && setConfirmingDelete(false)}>
      {/* Couple info */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="Partner 1 First">
          <input
            style={inputStyle}
            value={form.partner1_first}
            onChange={(e) => update("partner1_first", e.target.value)}
          />
        </FormField>
        <FormField label="Partner 1 Last">
          <input
            style={inputStyle}
            value={form.partner1_last}
            onChange={(e) => update("partner1_last", e.target.value)}
          />
        </FormField>
        <FormField label="Partner 2 First">
          <input
            style={inputStyle}
            value={form.partner2_first}
            onChange={(e) => update("partner2_first", e.target.value)}
          />
        </FormField>
        <FormField label="Partner 2 Last">
          <input
            style={inputStyle}
            value={form.partner2_last}
            onChange={(e) => update("partner2_last", e.target.value)}
          />
        </FormField>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="Email">
          <input
            style={inputStyle}
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </FormField>
        <FormField label="Phone">
          <input
            style={inputStyle}
            value={form.phone}
            onChange={(e) => update("phone", formatPhone(e.target.value))}
          />
        </FormField>
      </div>

      {/* Event details */}
      <div
        style={{
          height: 1,
          background: COLORS.borderLight,
          margin: "8px 0 16px",
        }}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="Event Date">
          <input
            style={inputStyle}
            type="date"
            value={form.event_date || ""}
            onChange={(e) => update("event_date", e.target.value)}
          />
        </FormField>
        <FormField label="Guest Count">
          <input
            style={inputStyle}
            type="text"
            value={form.guest_count}
            onChange={(e) => update("guest_count", e.target.value.replace(/[^\d]/g, ""))}
            onBlur={() => update("guest_count", fmtGuests(form.guest_count))}
            onFocus={() => {
              const raw = String(form.guest_count || "").replace(/\D/g, "");
              update("guest_count", raw);
            }}
          />
        </FormField>
      </div>
      <FormField label="Venue">
        <input
          style={inputStyle}
          value={form.venue}
          onChange={(e) => update("venue", e.target.value)}
        />
      </FormField>

      {/* Pipeline */}
      <div
        style={{
          height: 1,
          background: COLORS.borderLight,
          margin: "8px 0 16px",
        }}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="Brand">
          <select
            style={selectStyle}
            value={form.brand}
            onChange={(e) => update("brand", e.target.value)}
          >
            <option value="Greenway">Greenway</option>
            <option value="Kirby Collective">Kirby Collective</option>
          </select>
        </FormField>
        <FormField label="Stage">
          <select
            style={selectStyle}
            value={form.stage}
            onChange={(e) => update("stage", e.target.value)}
          >
            {PIPELINE_STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Source">
          <select
            style={selectStyle}
            value={form.source}
            onChange={(e) => update("source", e.target.value)}
          >
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Source Detail">
          <input
            style={inputStyle}
            value={form.source_detail || ""}
            onChange={(e) => update("source_detail", e.target.value)}
            placeholder="Planner name, agent, etc."
          />
        </FormField>
      </div>

      {/* Dates */}
      <div
        style={{
          height: 1,
          background: COLORS.borderLight,
          margin: "8px 0 16px",
        }}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="Consultation Date">
          <input
            style={inputStyle}
            type="datetime-local"
            value={form.consultation_date || ""}
            onChange={(e) => update("consultation_date", e.target.value)}
          />
        </FormField>
        <FormField label="Follow Up Date">
          <input
            style={inputStyle}
            type="date"
            value={form.followup_date || ""}
            onChange={(e) => update("followup_date", e.target.value)}
          />
        </FormField>
        <FormField label="Contract Sent Date">
          <input
            style={inputStyle}
            type="date"
            value={form.contract_sent_date || ""}
            onChange={(e) => update("contract_sent_date", e.target.value)}
          />
        </FormField>
        <FormField label="Booked Date">
          <input
            style={inputStyle}
            type="date"
            value={form.booked_date || ""}
            onChange={(e) => update("booked_date", e.target.value)}
          />
        </FormField>
      </div>

      {/* Pricing */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="Configuration">
          <select
            style={selectStyle}
            value={form.config || ""}
            onChange={(e) => update("config", e.target.value)}
          >
            <option value="">Select...</option>
            {CONFIGS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Price">
          <input
            style={inputStyle}
            type="text"
            value={form.price}
            onChange={(e) => update("price", e.target.value.replace(/[^\d]/g, ""))}
            onBlur={() => update("price", fmtCurrency(form.price))}
            onFocus={() => {
              const raw = parseCurrency(form.price);
              update("price", raw ? String(raw) : "");
            }}
            placeholder="0"
          />
        </FormField>
      </div>

      {/* Planner */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="Planner Name">
          <input
            style={inputStyle}
            value={form.planner_name || ""}
            onChange={(e) => update("planner_name", e.target.value)}
          />
        </FormField>
        <FormField label="Planner Email">
          <input
            style={inputStyle}
            type="email"
            value={form.planner_email || ""}
            onChange={(e) => update("planner_email", e.target.value)}
          />
        </FormField>
      </div>

      {/* Notes */}
      <FormField label="Notes">
        <textarea
          style={{
            ...inputStyle,
            minHeight: 80,
            resize: "vertical",
          }}
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
        />
      </FormField>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginTop: 8,
          paddingTop: 16,
          borderTop: `1px solid ${COLORS.borderLight}`,
        }}
      >
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 1,
            padding: "12px 20px",
            background: COLORS.black,
            color: COLORS.white,
            border: "none",
            borderRadius: RADII.md,
            fontSize: 13,
            fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer",
            fontFamily: FONTS.body,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Saving..." : isNew ? "Create Lead" : "Save Changes"}
        </button>
        {!isNew && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteClick();
            }}
            disabled={saving}
            style={{
              padding: "12px 20px",
              background: confirmingDelete ? COLORS.red : COLORS.white,
              color: confirmingDelete ? COLORS.white : COLORS.red,
              border: `1px solid ${confirmingDelete ? COLORS.red : COLORS.border}`,
              borderRadius: RADII.md,
              fontSize: 13,
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: FONTS.body,
              transition: "all 0.15s",
            }}
          >
            {confirmingDelete ? "Confirm Delete" : "Delete"}
          </button>
        )}
      </div>
      </div>
    </SlideOverPanel>
  );
};

const Pipeline = ({ leads, addLead, updateLead, deleteLead, pendingLeadId, clearPendingLead, pendingAction, clearPendingAction }) => {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [brandFilter, setBrandFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [selectedLead, setSelectedLead] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  // Open a lead from external navigation (e.g., Dashboard click)
  useEffect(() => {
    if (pendingLeadId) {
      const lead = leads.find((l) => l.id === pendingLeadId);
      if (lead) setSelectedLead(lead);
      if (clearPendingLead) clearPendingLead();
    }
  }, [pendingLeadId, leads, clearPendingLead]);

  // Open add-lead drawer from external navigation (e.g., Dashboard "New Lead" button)
  useEffect(() => {
    if (pendingAction === "addLead") {
      setIsAddingNew(true);
      if (clearPendingAction) clearPendingAction();
    }
  }, [pendingAction, clearPendingAction]);

  // Filter and sort leads
  const filteredLeads = useMemo(() => {
    let result = [...leads];

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          getLeadName(l).toLowerCase().includes(q) ||
          (l.venue || "").toLowerCase().includes(q) ||
          (l.email || "").toLowerCase().includes(q)
      );
    }

    // Stage filter
    if (stageFilter !== "All") {
      result = result.filter((l) => l.stage === stageFilter);
    }

    // Brand filter
    if (brandFilter !== "All") {
      result = result.filter((l) => l.brand === brandFilter);
    }

    // Source filter
    if (sourceFilter !== "All") {
      result = result.filter((l) => l.source === sourceFilter);
    }

    // Sort by stage priority, then event date
    result.sort((a, b) => {
      const stageDiff =
        (STAGE_ORDER[a.stage] ?? 99) - (STAGE_ORDER[b.stage] ?? 99);
      if (stageDiff !== 0) return stageDiff;
      return (a.event_date || "").localeCompare(b.event_date || "");
    });

    return result;
  }, [leads, search, stageFilter, brandFilter, sourceFilter]);

  const handleSaveNew = async (data) => {
    await addLead(data);
  };

  const handleSaveEdit = async (data) => {
    if (!selectedLead) return;
    const { id, created_at, updated_at, ...updates } = data;
    await updateLead(selectedLead.id, updates);
  };

  const handleDelete = async (id) => {
    await deleteLead(id);
  };

  return (
    <div style={{ animation: "fadeUp 0.3s ease", minWidth: 0, overflow: "hidden" }}>
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
          }}
        >
          Pipeline
        </h1>
        <button
          onClick={() => setIsAddingNew(true)}
          style={{
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
          }}
        >
          <Icon type="plus" size={15} color={COLORS.white} />
          New Lead
        </button>
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {/* Search */}
        <div
          style={{
            position: "relative",
            flex: "0 0 240px",
            marginRight: 8,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
            }}
          >
            <Icon type="search" size={15} color={COLORS.textLight} />
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads..."
            style={{
              width: "100%",
              padding: "8px 12px 8px 36px",
              fontSize: 13,
              border: `1px solid ${COLORS.border}`,
              borderRadius: RADII.sm,
              outline: "none",
              fontFamily: FONTS.body,
              color: COLORS.text,
              background: COLORS.white,
            }}
          />
        </div>

        {/* Stage filter */}
        {["All", "New Lead", "Proposal Sent", "Consultation Scheduled", "Post Consultation", "Contract Sent", "Booked"].map(
          (s) => (
            <FilterPill
              key={s}
              label={s === "Consultation Scheduled" ? "Consult" : s}
              active={stageFilter === s}
              onClick={() => setStageFilter(s)}
            />
          )
        )}

        <div
          style={{
            width: 1,
            height: 24,
            background: COLORS.border,
            margin: "0 4px",
          }}
        />

        {/* Brand filter */}
        {["All", "Greenway", "Kirby Collective"].map((b) => (
          <FilterPill
            key={`b-${b}`}
            label={b === "Kirby Collective" ? "KC" : b === "All" ? "All Brands" : b}
            active={brandFilter === b}
            onClick={() => setBrandFilter(b)}
          />
        ))}

        <div
          style={{
            width: 1,
            height: 24,
            background: COLORS.border,
            margin: "0 4px",
          }}
        />

        {/* Source filter */}
        {["All", "GCE", "Direct", "Planner", "Website", "Instagram", "Referral"].map((s) => (
          <FilterPill
            key={`s-${s}`}
            label={s === "All" ? "All Sources" : s}
            active={sourceFilter === s}
            onClick={() => setSourceFilter(s)}
          />
        ))}
      </div>

      {/* Lead table */}
      <div
        style={{
          background: COLORS.white,
          border: `1px solid ${COLORS.border}`,
          borderRadius: RADII.lg,
          overflow: "hidden",
        }}
      >
        {/* Table header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,2fr) minmax(0,1.1fr) minmax(0,1fr) minmax(0,1.2fr) minmax(0,0.7fr) 70px",
            padding: "12px 20px",
            borderBottom: `1px solid ${COLORS.border}`,
            background: COLORS.bg,
          }}
        >
          {["Couple", "Event Date", "Brand", "Stage", "Value", ""].map(
            (h) => (
              <span
                key={h || "actions"}
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
            )
          )}
        </div>

        {filteredLeads.length === 0 ? (
          <EmptyState
            icon="pipeline"
            title="No leads found"
            description="Try adjusting your filters or add a new lead."
          />
        ) : (
          filteredLeads.map((lead) => (
            <LeadRow
              key={lead.id}
              lead={lead}
              onDraft={() => setToastVisible(true)}
              onView={(l) => setSelectedLead(l)}
            />
          ))
        )}
      </div>

      {/* Edit drawer */}
      {selectedLead && !isAddingNew && (
        <LeadDrawer
          lead={selectedLead}
          isNew={false}
          onSave={handleSaveEdit}
          onDelete={handleDelete}
          onClose={() => setSelectedLead(null)}
        />
      )}

      {/* Add new drawer */}
      {isAddingNew && (
        <LeadDrawer
          isNew
          onSave={handleSaveNew}
          onDelete={() => {}}
          onClose={() => setIsAddingNew(false)}
        />
      )}

      <Toast
        message="Email drafter coming in Week 2"
        visible={toastVisible}
        onDone={() => setToastVisible(false)}
      />
    </div>
  );
};

export default Pipeline;
