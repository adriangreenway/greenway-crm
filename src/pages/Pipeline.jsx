import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { COLORS, FONTS, RADII, PIPELINE_STAGES, SOURCES, CONFIGS } from "../tokens";
import Icon from "../icons";
import { BrandBadge, StageBadge } from "../components/Badge";
import SlideOverPanel from "../components/SlideOverPanel";
import EmptyState from "../components/EmptyState";
import EmailDrafterModal from "../components/EmailDrafterModal";
import ConsultationCheatSheet from "../components/ConsultationCheatSheet";
import GigSheetPanel from "../components/GigSheetPanel";
import MCCueSheet from "../components/MCCueSheet";
import ProposalConfigPanel from "../components/ProposalConfigPanel";
import ContractCard from "../components/ContractCard";
import CreateContractModal from "../components/CreateContractModal";
import { getLeadName, formatCurrency, formatDate } from "../data/seed";
import { formatPhone, formatCurrency as fmtCurrency, parseCurrency, formatGuestCount as fmtGuests } from "../utils/formatters";
import { calculateLeadScore, getScoreDisplay } from "../utils/leadScoring";
import { callClaude, getApiKey, hasApiKey } from "../utils/claudeApi";
import { getContractUrl } from "../utils/contractHelpers";

// Normalize consultation_date to ISO with seconds and Z
const normalizeConsultationDate = (val) => {
  if (!val) return null;
  if (val.endsWith("Z")) return val;
  if (val.length === 16) return val + ":00Z";
  if (val.length === 19) return val + "Z";
  return val;
};

// Stage sort priority
const STAGE_ORDER = PIPELINE_STAGES.reduce((acc, s, i) => {
  acc[s] = i;
  return acc;
}, {});

// Truncation helper
const truncStyle = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

// Lead table row — matches vision mockup exactly
const LeadRow = ({ lead, onDraft, onView }) => {
  const score = lead.lead_score ?? calculateLeadScore(lead);
  const scoreInfo = getScoreDisplay(score);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0,2fr) minmax(0,1.1fr) minmax(0,1fr) minmax(0,1.2fr) 100px minmax(0,0.7fr) 70px",
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
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.black }}>{score}</span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: scoreInfo.color,
            background: scoreInfo.bg,
            padding: "2px 7px",
            borderRadius: RADII.pill,
            textTransform: "uppercase",
            letterSpacing: "0.03em",
            whiteSpace: "nowrap",
          }}
        >
          {scoreInfo.label}
        </span>
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
};

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
const LeadDrawer = ({ lead, isNew, onSave, onDelete, onClose, onPrepForCall, onGenerateGigSheet, onOpenProposalConfig, fetchContracts, createContract, sendContract, voidContract, updateLead, onFollowUp }) => {
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
  const [inquiryExpanded, setInquiryExpanded] = useState(false);
  const [pricingSuggestion, setPricingSuggestion] = useState(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState(null);
  const [pricingToast, setPricingToast] = useState(null);
  const [drawerTab, setDrawerTab] = useState("details");
  const [leadContracts, setLeadContracts] = useState([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [showCreateContract, setShowCreateContract] = useState(false);
  const [stagePromptContract, setStagePromptContract] = useState(null);
  const deleteTimerRef = useRef(null);

  // Fetch contracts when Contracts tab is first opened
  useEffect(() => {
    if (drawerTab === "contracts" && lead && !isNew && fetchContracts) {
      setContractsLoading(true);
      fetchContracts(lead.id)
        .then((data) => setLeadContracts(data || []))
        .catch(() => setLeadContracts([]))
        .finally(() => setContractsLoading(false));
    }
  }, [drawerTab, lead, isNew, fetchContracts]);

  useEffect(() => {
    if (confirmingDelete) {
      deleteTimerRef.current = setTimeout(() => setConfirmingDelete(false), 3000);
      return () => clearTimeout(deleteTimerRef.current);
    }
  }, [confirmingDelete]);

  const update = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (["config", "venue", "guest_count", "event_date"].includes(key)) {
      setPricingSuggestion(null);
      setPricingError(null);
    }
  };

  const handleSuggestPrice = async () => {
    const apiKey = getApiKey();
    if (!apiKey || !form.config) return;

    setPricingLoading(true);
    setPricingError(null);
    setPricingSuggestion(null);

    const systemPrompt = `You are a pricing advisor for The Greenway Band, a premium live wedding entertainment company in Houston, TX. Your job is to suggest a fair, competitive price for a specific lead based on the data provided.

Base pricing (Greenway Band):
- 6 piece: $9,000
- 8 piece: $10,750
- 10 piece: $12,500
- 12 piece: $14,750
- 14 piece: $16,875

Kirby Collective pricing range: $8,000 to $12,000 for 6 to 10 piece.

Adjustment factors:
- Peak season months (Oct, Nov, Mar, Apr, May, Jun) may justify 5 to 15 percent above base
- Premium Houston venues (The Houstonian, Hotel Granduca, The Astorian, Hotel ZaZa, The Corinthian, The Bell Tower on 34th, Chateau Polonez) may justify 5 to 10 percent above base
- Guest count 200+ signals larger budget capacity
- If the client stated a budget, respect it: never suggest more than 15 percent above stated budget
- GCE sourced leads have a 20 percent commission. Note the net amount Adrian receives after commission

Respond with ONLY a JSON object. No markdown, no backticks, no preamble:
{
  "suggested_price": 14375,
  "reasoning": "Brief 2 to 4 sentence explanation of why this price makes sense."
}`;

    const guestRaw = String(form.guest_count || "").replace(/\D/g, "");
    const priceRaw = parseCurrency(form.price);

    const userPrompt = `Lead data:
- Brand: ${form.brand}
- Configuration: ${form.config}
- Venue: ${form.venue || "Not specified"}
- Event date: ${form.event_date || "Not specified"}
- Guest count: ${guestRaw || "Not specified"}
- Source: ${form.source || "Not specified"}
- Budget stated: ${form.budget_stated || "Not stated"}
- Current price: ${priceRaw ? fmtCurrency(priceRaw) : "Not set"}
- Planner: ${form.planner_name || "None"}

Suggest a price for this lead.`;

    try {
      const response = await callClaude({
        systemPrompt,
        userPrompt,
        apiKey,
        maxTokens: 800,
      });

      // Strip markdown code fences if present
      const cleaned = response.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.suggested_price && parsed.reasoning) {
        setPricingSuggestion(parsed);
      } else {
        setPricingError("Could not generate suggestion. Try again.");
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        setPricingError("Could not generate suggestion. Try again.");
      } else {
        setPricingError(err.message || "Could not generate suggestion. Try again.");
      }
    } finally {
      setPricingLoading(false);
    }
  };

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

  const refreshContracts = async () => {
    if (lead && fetchContracts) {
      const data = await fetchContracts(lead.id);
      setLeadContracts(data || []);
    }
  };

  const handleContractCreate = async (payload) => {
    await createContract(payload);
    await refreshContracts();
    setPricingToast("Contract created");
    setTimeout(() => setPricingToast(null), 2500);
  };

  const handleContractSend = async (contract, isResend = false) => {
    await sendContract(contract.id);
    await refreshContracts();
    const url = getContractUrl(contract.slug);
    navigator.clipboard.writeText(url);
    if (isResend) {
      setPricingToast("Contract resent. Link copied.");
      setTimeout(() => setPricingToast(null), 2500);
    } else {
      setStagePromptContract(contract);
    }
  };

  const handleStageYes = async () => {
    if (updateLead && lead) {
      await updateLead(lead.id, { stage: "Contract Sent" });
    }
    setPricingToast("Contract sent. Link copied.");
    setTimeout(() => setPricingToast(null), 2500);
    setStagePromptContract(null);
  };

  const handleStageNo = () => {
    setPricingToast("Link copied.");
    setTimeout(() => setPricingToast(null), 2500);
    setStagePromptContract(null);
  };

  const handleContractVoid = async (contract) => {
    await voidContract(contract.id);
    await refreshContracts();
  };

  const handleContractToast = (msg) => {
    setPricingToast(msg);
    setTimeout(() => setPricingToast(null), 2500);
  };

  const nonVoidedContracts = leadContracts.filter((c) => c.status !== "voided");
  const canCreateContract = lead && lead.partner1_first && lead.partner1_last && lead.email && lead.event_date && lead.venue && lead.price;

  const title = isNew
    ? "New Lead"
    : getLeadName(form);
  const subtitle = isNew
    ? "Add a new lead to the pipeline"
    : `${form.venue || "No venue"} \u00B7 ${formatDate(form.event_date)}`;

  return (
    <SlideOverPanel open title={title} subtitle={subtitle} onClose={onClose}>
      <div onClick={() => confirmingDelete && setConfirmingDelete(false)}>
      {/* Lead Score Bar */}
      {!isNew && (() => {
        const score = lead.lead_score ?? calculateLeadScore(lead);
        const scoreInfo = getScoreDisplay(score);
        const updatedAt = lead.lead_score_updated_at;
        const relativeTime = updatedAt ? (() => {
          const diff = Date.now() - new Date(updatedAt).getTime();
          const mins = Math.floor(diff / 60000);
          if (mins < 1) return "just now";
          if (mins < 60) return `${mins}m ago`;
          const hrs = Math.floor(mins / 60);
          if (hrs < 24) return `${hrs}h ago`;
          const days = Math.floor(hrs / 24);
          return `${days}d ago`;
        })() : null;
        return (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: COLORS.black, fontFamily: FONTS.body }}>{score}</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: scoreInfo.color,
                  background: scoreInfo.bg,
                  padding: "3px 10px",
                  borderRadius: RADII.pill,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                }}
              >
                {scoreInfo.label}
              </span>
            </div>
            <div
              style={{
                width: "100%",
                height: 4,
                borderRadius: 2,
                background: COLORS.borderLight,
                overflow: "hidden",
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  width: `${score}%`,
                  height: "100%",
                  borderRadius: 2,
                  background: scoreInfo.color,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            {relativeTime && (
              <div style={{ fontSize: 11, color: COLORS.textLight }}>
                Last calculated {relativeTime}
              </div>
            )}
          </div>
        );
      })()}

      {/* Tab bar (only show for existing leads) */}
      {!isNew && (
        <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${COLORS.border}`, marginBottom: 20 }}>
          {["details", "contracts"].map((tab) => (
            <button
              key={tab}
              onClick={() => setDrawerTab(tab)}
              style={{
                padding: "10px 16px",
                fontSize: 13,
                fontWeight: 600,
                color: drawerTab === tab ? COLORS.black : COLORS.textMuted,
                background: "none",
                border: "none",
                borderBottom: drawerTab === tab ? `2px solid ${COLORS.black}` : "2px solid transparent",
                cursor: "pointer",
                fontFamily: FONTS.body,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {tab === "details" ? "Details" : "Contracts"}
              {tab === "contracts" && nonVoidedContracts.length > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    background: COLORS.bg,
                    color: COLORS.textMuted,
                    padding: "1px 6px",
                    borderRadius: RADII.pill,
                    minWidth: 18,
                    textAlign: "center",
                  }}
                >
                  {nonVoidedContracts.length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Contracts Tab */}
      {!isNew && drawerTab === "contracts" && (
        <div>
          {contractsLoading ? (
            <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted, fontSize: 13 }}>
              Loading contracts...
            </div>
          ) : leadContracts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <Icon type="fileSignature" size={32} color={COLORS.border} />
              <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text, marginTop: 12 }}>
                No contract yet
              </div>
              <div style={{ fontSize: 12.5, color: COLORS.textMuted, marginTop: 4 }}>
                Create a contract to send for signing
              </div>
              <button
                onClick={() => setShowCreateContract(true)}
                disabled={!canCreateContract}
                title={!canCreateContract ? "Complete lead details to create a contract" : undefined}
                style={{
                  marginTop: 16,
                  background: COLORS.black,
                  color: COLORS.white,
                  padding: "10px 20px",
                  borderRadius: RADII.sm,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: canCreateContract ? "pointer" : "not-allowed",
                  fontFamily: FONTS.body,
                  border: "none",
                  opacity: canCreateContract ? 1 : 0.4,
                }}
              >
                Create Contract
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {leadContracts.map((contract) => (
                <div key={contract.id}>
                  <ContractCard
                    contract={contract}
                    lead={lead}
                    onSend={handleContractSend}
                    onVoid={handleContractVoid}
                    onFollowUp={onFollowUp}
                    toast={handleContractToast}
                  />
                  {/* Stage prompt */}
                  {stagePromptContract && stagePromptContract.id === contract.id && (
                    <div
                      style={{
                        background: COLORS.bg,
                        padding: 12,
                        borderRadius: RADII.sm,
                        marginTop: 8,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 13,
                      }}
                    >
                      <span style={{ color: COLORS.text, fontWeight: 500 }}>Move to Contract Sent?</span>
                      <button
                        onClick={handleStageYes}
                        style={{
                          background: COLORS.black,
                          color: COLORS.white,
                          border: "none",
                          borderRadius: RADII.sm,
                          padding: "4px 12px",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: FONTS.body,
                        }}
                      >
                        Yes
                      </button>
                      <button
                        onClick={handleStageNo}
                        style={{
                          background: COLORS.white,
                          color: COLORS.text,
                          border: `1px solid ${COLORS.border}`,
                          borderRadius: RADII.sm,
                          padding: "4px 12px",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: FONTS.body,
                        }}
                      >
                        No
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {/* Create another contract button */}
              <button
                onClick={() => setShowCreateContract(true)}
                disabled={!canCreateContract}
                title={!canCreateContract ? "Complete lead details to create a contract" : undefined}
                style={{
                  background: COLORS.bg,
                  color: COLORS.text,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: RADII.sm,
                  padding: "10px 16px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: canCreateContract ? "pointer" : "not-allowed",
                  fontFamily: FONTS.body,
                  opacity: canCreateContract ? 1 : 0.4,
                }}
              >
                + New Contract
              </button>
            </div>
          )}

          {/* Create Contract Modal */}
          {showCreateContract && (
            <CreateContractModal
              lead={lead}
              onClose={() => setShowCreateContract(false)}
              onCreate={handleContractCreate}
            />
          )}
        </div>
      )}

      {/* Details Tab (default — show for new leads or when Details tab active) */}
      {(isNew || drawerTab === "details") && (
      <>
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

      {/* Suggest Price */}
      {!isNew && (
        <>
          <button
            onClick={handleSuggestPrice}
            disabled={!form.config || !hasApiKey() || pricingLoading}
            title={!form.config ? "Select a configuration first" : !hasApiKey() ? "Add your Claude API key in Settings" : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
              padding: "10px 16px",
              background: pricingLoading ? COLORS.bg : COLORS.white,
              color: (!form.config || !hasApiKey()) ? COLORS.textLight : COLORS.text,
              border: `1px solid ${COLORS.border}`,
              borderRadius: RADII.sm,
              fontSize: 13,
              fontWeight: 600,
              cursor: (!form.config || !hasApiKey() || pricingLoading) ? "not-allowed" : "pointer",
              fontFamily: FONTS.body,
              marginBottom: 16,
              opacity: (!form.config || !hasApiKey()) ? 0.5 : 1,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              if (form.config && hasApiKey() && !pricingLoading) {
                e.currentTarget.style.background = COLORS.bg;
              }
            }}
            onMouseLeave={(e) => {
              if (!pricingLoading) {
                e.currentTarget.style.background = COLORS.white;
              }
            }}
          >
            {pricingLoading ? (
              <>
                <span
                  style={{
                    width: 14,
                    height: 14,
                    border: `2px solid ${COLORS.border}`,
                    borderTopColor: COLORS.text,
                    borderRadius: "50%",
                    animation: "spin 0.6s linear infinite",
                    flexShrink: 0,
                  }}
                />
                Calculating...
              </>
            ) : (
              <>
                <Icon type="spark" size={14} color={(!form.config || !hasApiKey()) ? COLORS.textLight : COLORS.text} />
                Suggest Price
              </>
            )}
          </button>

          {/* Pricing suggestion result */}
          {pricingSuggestion && (
            <div
              style={{
                background: COLORS.white,
                border: `1px solid ${COLORS.border}`,
                borderRadius: RADII.lg,
                padding: 16,
                marginBottom: 16,
                animation: "fadeIn 0.2s ease",
              }}
            >
              <div style={{ marginBottom: 12 }}>
                {(() => {
                  const currentPrice = parseCurrency(form.price);
                  return currentPrice && currentPrice !== pricingSuggestion.suggested_price ? (
                    <div style={{ fontSize: 13, color: COLORS.textMuted }}>
                      Current: {fmtCurrency(currentPrice)} → Suggested:{" "}
                      <span style={{ fontSize: 20, fontWeight: 700, color: COLORS.black }}>
                        {fmtCurrency(pricingSuggestion.suggested_price)}
                      </span>
                    </div>
                  ) : (
                    <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.black }}>
                      {fmtCurrency(pricingSuggestion.suggested_price)}
                    </div>
                  );
                })()}
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: COLORS.textMuted,
                  lineHeight: 1.6,
                  marginBottom: 14,
                }}
              >
                {pricingSuggestion.reasoning}
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button
                  onClick={() => {
                    update("price", fmtCurrency(pricingSuggestion.suggested_price));
                    setPricingToast("Price applied");
                    setTimeout(() => setPricingToast(null), 2500);
                  }}
                  style={{
                    padding: "6px 16px",
                    background: COLORS.black,
                    color: COLORS.white,
                    border: "none",
                    borderRadius: RADII.pill,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: FONTS.body,
                  }}
                >
                  Apply
                </button>
                <button
                  onClick={() => setPricingSuggestion(null)}
                  style={{
                    background: "none",
                    border: "none",
                    color: COLORS.textMuted,
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: FONTS.body,
                    padding: 0,
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Pricing error */}
          {pricingError && !pricingLoading && (
            <div
              style={{
                fontSize: 12.5,
                color: COLORS.red,
                marginBottom: 16,
              }}
            >
              {pricingError}
            </div>
          )}
        </>
      )}

      {/* Proposal */}
      {!isNew && (
        <>
          <div
            style={{
              height: 1,
              background: COLORS.borderLight,
              margin: "8px 0 16px",
            }}
          />
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: COLORS.textLight,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: 12,
            }}
          >
            Proposal
          </div>
          {lead.proposal_slug ? (
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 12,
                  color: COLORS.textMuted,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  marginBottom: 8,
                }}
              >
                {`${window.location.origin}/proposal/${lead.proposal_slug}`}
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const url = `${window.location.origin}/proposal/${lead.proposal_slug}`;
                    await navigator.clipboard.writeText(url);
                    const btn = e.currentTarget;
                    btn.textContent = "Copied";
                    setTimeout(() => { btn.textContent = "Copy Link"; }, 1500);
                  }}
                  style={{
                    padding: "6px 14px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: COLORS.black,
                    background: COLORS.white,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: RADII.sm,
                    cursor: "pointer",
                    fontFamily: FONTS.body,
                    transition: "all 0.15s",
                  }}
                >
                  Copy Link
                </button>
                <a
                  href={`${window.location.origin}/proposal/${lead.proposal_slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: COLORS.textMuted,
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = COLORS.black)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = COLORS.textMuted)}
                >
                  Open
                </a>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenProposalConfig) onOpenProposalConfig(lead);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 12,
                    fontWeight: 600,
                    color: COLORS.textMuted,
                    cursor: "pointer",
                    fontFamily: FONTS.body,
                    padding: 0,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = COLORS.black)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = COLORS.textMuted)}
                >
                  Regenerate
                </button>
              </div>
              {lead.proposal_generated_at && (
                <div style={{ fontSize: 11, color: COLORS.textLight }}>
                  Generated {formatDate(lead.proposal_generated_at)}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenProposalConfig) onOpenProposalConfig(lead);
              }}
              style={{
                width: "100%",
                padding: "11px 20px",
                background: COLORS.black,
                color: COLORS.white,
                border: "none",
                borderRadius: RADII.sm,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: FONTS.body,
                marginBottom: 16,
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Generate Proposal
            </button>
          )}
        </>
      )}

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

      {/* Inquiry Details (collapsible, only for leads from lead router) */}
      {!isNew && (lead.referral_source || lead.inquiry_details || lead.event_type) && (
        <>
          <div
            style={{
              height: 1,
              background: COLORS.borderLight,
              margin: "8px 0 16px",
            }}
          />
          <button
            onClick={() => setInquiryExpanded((prev) => !prev)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px 0",
              marginBottom: inquiryExpanded ? 12 : 8,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: COLORS.textLight,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Inquiry Details
            </span>
            <span
              style={{
                display: "inline-flex",
                transition: "transform 0.2s ease",
                transform: inquiryExpanded ? "rotate(90deg)" : "rotate(0deg)",
              }}
            >
              <Icon type="chevron" size={14} color={COLORS.textLight} />
            </span>
          </button>
          {inquiryExpanded && (
            <div style={{ marginBottom: 8 }}>
              {lead.event_type && (
                <div style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: COLORS.textLight,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      marginBottom: 3,
                    }}
                  >
                    Event Type
                  </div>
                  <div style={{ fontSize: 13, color: COLORS.text }}>{lead.event_type}</div>
                </div>
              )}
              {lead.cocktail_interest && (
                <div style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: COLORS.textLight,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      marginBottom: 3,
                    }}
                  >
                    Cocktail Interest
                  </div>
                  <div style={{ fontSize: 13, color: COLORS.text }}>{lead.cocktail_interest}</div>
                </div>
              )}
              {lead.budget_stated && (
                <div style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: COLORS.textLight,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      marginBottom: 3,
                    }}
                  >
                    Budget Stated
                  </div>
                  <div style={{ fontSize: 13, color: COLORS.text }}>{lead.budget_stated}</div>
                </div>
              )}
              {lead.referral_source && (
                <div style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: COLORS.textLight,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      marginBottom: 3,
                    }}
                  >
                    Referral Source
                  </div>
                  <div style={{ fontSize: 13, color: COLORS.text }}>{lead.referral_source}</div>
                </div>
              )}
              {lead.inquiry_details && (
                <div style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: COLORS.textLight,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      marginBottom: 3,
                    }}
                  >
                    Inquiry Details
                  </div>
                  <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.5 }}>
                    {lead.inquiry_details}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

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

      {/* Prep for Call — only when Consultation Scheduled */}
      {!isNew && form.stage === "Consultation Scheduled" && onPrepForCall && (
        <button
          onClick={() => onPrepForCall(lead)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            width: "100%",
            padding: "11px 20px",
            background: COLORS.purpleLight,
            color: COLORS.purple,
            border: `1px solid ${COLORS.purple}`,
            borderRadius: RADII.md,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: FONTS.body,
            marginBottom: 4,
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = COLORS.purple;
            e.currentTarget.style.color = COLORS.white;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = COLORS.purpleLight;
            e.currentTarget.style.color = COLORS.purple;
          }}
        >
          <Icon type="phone" size={14} color="currentColor" />
          Prep for Call
        </button>
      )}

      {/* Generate Gig Sheet — only when Booked */}
      {!isNew && form.stage === "Booked" && onGenerateGigSheet && (
        <button
          onClick={() => onGenerateGigSheet(lead)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            width: "100%",
            padding: "11px 20px",
            background: COLORS.greenBg,
            color: COLORS.green,
            border: `1px solid ${COLORS.green}`,
            borderRadius: RADII.md,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: FONTS.body,
            marginBottom: 4,
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = COLORS.green;
            e.currentTarget.style.color = COLORS.white;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = COLORS.greenBg;
            e.currentTarget.style.color = COLORS.green;
          }}
        >
          <Icon type="file" size={14} color="currentColor" />
          Generate Gig Sheet
        </button>
      )}

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
      </>
      )}
      </div>

      {/* Price applied toast */}
      {pricingToast && (
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
            zIndex: 200,
            animation: "fadeIn 0.2s ease",
            fontFamily: FONTS.body,
          }}
        >
          {pricingToast}
        </div>
      )}
    </SlideOverPanel>
  );
};

const Pipeline = ({ leads, addLead, updateLead, deleteLead, generateProposal, pendingLeadId, clearPendingLead, pendingAction, clearPendingAction, onNavigateToSettings, musicians, gigAssignments, addGigAssignment, removeGigAssignment, fetchContracts, createContract, sendContract, voidContract }) => {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [brandFilter, setBrandFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [selectedLead, setSelectedLead] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [emailDraftLead, setEmailDraftLead] = useState(null);
  const [cheatSheetLead, setCheatSheetLead] = useState(null);
  const [gigSheetLead, setGigSheetLead] = useState(null);
  const [cueSheetLead, setCueSheetLead] = useState(null);
  const [proposalConfigLead, setProposalConfigLead] = useState(null);
  // Score sort: null = default, "desc" = highest first, "asc" = lowest first
  const [scoreSort, setScoreSort] = useState(null);

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

    // Sort: score sort overrides default when active
    if (scoreSort) {
      result.sort((a, b) => {
        const aScore = a.lead_score ?? calculateLeadScore(a);
        const bScore = b.lead_score ?? calculateLeadScore(b);
        return scoreSort === "desc" ? bScore - aScore : aScore - bScore;
      });
    } else {
      // Default: stage priority, then event date
      result.sort((a, b) => {
        const stageDiff =
          (STAGE_ORDER[a.stage] ?? 99) - (STAGE_ORDER[b.stage] ?? 99);
        if (stageDiff !== 0) return stageDiff;
        return (a.event_date || "").localeCompare(b.event_date || "");
      });
    }

    return result;
  }, [leads, search, stageFilter, brandFilter, sourceFilter, scoreSort]);

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
            gridTemplateColumns: "minmax(0,2fr) minmax(0,1.1fr) minmax(0,1fr) minmax(0,1.2fr) 100px minmax(0,0.7fr) 70px",
            padding: "12px 20px",
            borderBottom: `1px solid ${COLORS.border}`,
            background: COLORS.bg,
          }}
        >
          {["Couple", "Event Date", "Brand", "Stage", "Score", "Value", ""].map(
            (h) =>
              h === "Score" ? (
                <span
                  key="Score"
                  onClick={() =>
                    setScoreSort((prev) =>
                      prev === null ? "desc" : prev === "desc" ? "asc" : null
                    )
                  }
                  style={{
                    fontSize: 11,
                    fontWeight: scoreSort ? 700 : 600,
                    color: scoreSort ? COLORS.black : COLORS.textLight,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    cursor: "pointer",
                    userSelect: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  Score
                  {scoreSort && (
                    <span style={{ fontSize: 9, lineHeight: 1 }}>
                      {scoreSort === "desc" ? "\u25BC" : "\u25B2"}
                    </span>
                  )}
                </span>
              ) : (
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
              onDraft={(l) => setEmailDraftLead(l)}
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
          onPrepForCall={(l) => {
            setSelectedLead(null);
            setCheatSheetLead(l);
          }}
          onGenerateGigSheet={(l) => {
            setSelectedLead(null);
            setGigSheetLead(l);
          }}
          onOpenProposalConfig={(l) => {
            setSelectedLead(null);
            setProposalConfigLead(l);
          }}
          fetchContracts={fetchContracts}
          createContract={createContract}
          sendContract={sendContract}
          voidContract={voidContract}
          updateLead={updateLead}
          onFollowUp={(l) => {
            setSelectedLead(null);
            setEmailDraftLead(l);
          }}
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

      {/* Email Drafter Modal */}
      {emailDraftLead && (
        <EmailDrafterModal
          lead={emailDraftLead}
          onClose={() => setEmailDraftLead(null)}
          onNavigateToSettings={onNavigateToSettings}
        />
      )}

      {/* Consultation Cheat Sheet */}
      {cheatSheetLead && (
        <ConsultationCheatSheet
          lead={cheatSheetLead}
          onClose={() => setCheatSheetLead(null)}
          onUpdateLead={updateLead}
          onNavigateToSettings={onNavigateToSettings}
        />
      )}

      {/* Gig Sheet Panel */}
      {gigSheetLead && (
        <GigSheetPanel
          lead={gigSheetLead}
          onClose={() => setGigSheetLead(null)}
          onUpdateLead={updateLead}
          musicians={musicians || []}
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

      {/* Proposal Config Panel */}
      {proposalConfigLead && (
        <ProposalConfigPanel
          lead={proposalConfigLead}
          onClose={() => setProposalConfigLead(null)}
          onGenerate={generateProposal}
          onUpdateLead={updateLead}
        />
      )}
    </div>
  );
};

export default Pipeline;
