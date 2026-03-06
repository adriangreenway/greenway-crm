import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { COLORS, FONTS, RADII, SHADOWS } from "../tokens";
import Icon from "../icons";
import {
  emailTemplates,
  resolveFields,
  suggestTemplate,
  getTemplatesByCategory,
  getTemplateById,
  TEMPLATE_CATEGORIES,
} from "../data/emailTemplates";
import { callClaude, BASE_SYSTEM_PROMPT, getApiKey, hasApiKey } from "../utils/claudeApi";
import { getLeadName, formatDate } from "../data/seed";

// ── Toast (local to modal) ──
const ModalToast = ({ message, visible, onDone }) => {
  useEffect(() => {
    if (visible) {
      const t = setTimeout(onDone, 3000);
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
        zIndex: 310,
        animation: "fadeIn 0.2s ease",
        whiteSpace: "nowrap",
      }}
    >
      {message}
    </div>
  );
};

// ── Resolve merge fields in text, highlight missing ones ──
function renderResolvedText(text, resolvedFields) {
  if (!text) return "";
  return text.replace(/\{\{(\w+)\}\}/g, (match, fieldName) => {
    const val = resolvedFields[fieldName];
    if (val === undefined || val === "") return `[missing]`;
    if (val === "[no date]" || val === "[no venue]" || val === "[no price]") return val;
    return val;
  });
}

// ── Check if a body has AI sections ──
function hasAISections(body) {
  return /\[\[AI:/.test(body || "");
}

// ── Split body into segments: text and AI blocks ──
function parseBody(body) {
  if (!body) return [];
  const parts = [];
  const regex = /\[\[AI:\s*(.*?)\]\]/gs;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(body)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: body.slice(lastIndex, match.index) });
    }
    parts.push({ type: "ai", description: match[1].trim(), key: `ai_${parts.length}` });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < body.length) {
    parts.push({ type: "text", content: body.slice(lastIndex) });
  }

  return parts;
}

// ── Variant pill toggle ──
const VariantPills = ({ variants, selected, onSelect }) => {
  const keys = Object.keys(variants);
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
      {keys.map((key) => (
        <button
          key={key}
          onClick={() => onSelect(key)}
          style={{
            padding: "7px 16px",
            background: selected === key ? COLORS.black : COLORS.white,
            color: selected === key ? COLORS.white : COLORS.textMuted,
            border: `1px solid ${selected === key ? COLORS.black : COLORS.border}`,
            borderRadius: RADII.pill,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: FONTS.body,
            transition: "all 0.15s",
          }}
        >
          {variants[key].label}
        </button>
      ))}
    </div>
  );
};

// ── Main Modal ──
const EmailDrafterModal = ({ lead, onClose, onNavigateToSettings }) => {
  const suggestedId = useMemo(() => suggestTemplate(lead), [lead]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(suggestedId);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [notes, setNotes] = useState("");
  const [generatedSections, setGeneratedSections] = useState({});
  const [generating, setGenerating] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [editableSubject, setEditableSubject] = useState("");
  const [editableBody, setEditableBody] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const bodyRef = useRef(null);

  const resolvedFields = useMemo(() => resolveFields(lead), [lead]);
  const grouped = useMemo(() => getTemplatesByCategory(), []);
  const template = useMemo(() => getTemplateById(selectedTemplateId), [selectedTemplateId]);

  // Determine which body to use (account for variants)
  const activeBody = useMemo(() => {
    if (!template) return "";
    if (template.variants && selectedVariant && template.variants[selectedVariant]) {
      return template.variants[selectedVariant].body;
    }
    return template.body;
  }, [template, selectedVariant]);

  // Set default variant when template changes
  useEffect(() => {
    if (template?.variants) {
      const keys = Object.keys(template.variants);
      setSelectedVariant(keys[0] || null);
    } else {
      setSelectedVariant(null);
    }
    setGeneratedSections({});
    setNotes("");
    setApiError(null);
    setIsEditing(false);
  }, [template]);

  // Compute resolved subject and body whenever dependencies change
  useEffect(() => {
    if (!template) return;
    const subject = renderResolvedText(template.subject, resolvedFields);
    setEditableSubject(subject);

    if (!isEditing) {
      const bodyText = activeBody;
      if (hasAISections(bodyText)) {
        // Build body replacing AI sections with generated text or placeholders
        const parts = parseBody(bodyText);
        let result = "";
        let aiIndex = 0;
        for (const part of parts) {
          if (part.type === "text") {
            result += renderResolvedText(part.content, resolvedFields);
          } else {
            const sectionKeys = template.aiSections || [];
            const sectionKey = sectionKeys[aiIndex] || `ai_section_${aiIndex}`;
            if (generatedSections[sectionKey]) {
              result += generatedSections[sectionKey];
            } else {
              result += `[[AI: ${part.description}]]`;
            }
            aiIndex++;
          }
        }
        setEditableBody(result);
      } else {
        setEditableBody(renderResolvedText(bodyText, resolvedFields));
      }
    }
  }, [template, activeBody, resolvedFields, generatedSections, isEditing]);

  // Escape to close
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Template has AI sections?
  const templateHasAI = template?.aiSections?.length > 0;

  // Get notes placeholder
  const notesPlaceholder = template?.notesPlaceholder || "Add any context or notes for Claude...";

  // ── Generate AI sections ──
  const handleGenerate = useCallback(async () => {
    if (!template) return;

    const apiKey = getApiKey();
    if (!apiKey) return;

    setGenerating(true);
    setApiError(null);

    const systemPrompt = `${BASE_SYSTEM_PROMPT}

You are drafting an email using template ${template.id} (${template.name}).
The merge fields have already been filled. You are only generating the AI sections.
Follow the template structure exactly. Do not add greetings, sign offs, or any text outside the AI section boundaries.`;

    const aiSectionNames = template.aiSections || [];

    const userPrompt = `Lead data:
- Name: ${resolvedFields.partner_1_first} ${resolvedFields.partner_1_last} and ${resolvedFields.partner_2_first} ${resolvedFields.partner_2_last}
- Event date: ${resolvedFields.event_date}
- Venue: ${resolvedFields.venue}
- Guest count: ${resolvedFields.guest_count || "Not provided"}
- Brand: ${resolvedFields.brand_name}
- Configuration: ${resolvedFields.piece_count ? resolvedFields.piece_count + " piece" : "Not specified"}
- Stage: ${lead.stage || "Unknown"}
- Notes: ${lead.notes || "None"}

Adrian's notes for this email:
${notes || "No additional notes provided."}

Generate only the AI sections for this template. Return them as JSON:
{
  "sections": {
    ${aiSectionNames.map((name) => `"${name}": "..."`).join(",\n    ")}
  }
}`;

    try {
      const response = await callClaude({
        systemPrompt,
        userPrompt,
        apiKey,
        maxTokens: 1500,
      });

      // Parse JSON from response
      let sections = {};
      try {
        // Try to find JSON in the response
        const jsonMatch = response.match(/\{[\s\S]*"sections"[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          sections = parsed.sections || {};
        } else {
          // If no JSON structure, treat the whole response as the first section
          if (aiSectionNames.length === 1) {
            sections[aiSectionNames[0]] = response.trim();
          } else {
            // Fallback: use the whole response as the first section
            sections[aiSectionNames[0]] = response.trim();
          }
        }
      } catch {
        // If JSON parsing fails, use raw text for first section
        if (aiSectionNames.length === 1) {
          sections[aiSectionNames[0]] = response.trim();
        } else {
          sections[aiSectionNames[0]] = response.trim();
        }
      }

      setGeneratedSections(sections);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setGenerating(false);
    }
  }, [template, notes, resolvedFields, lead]);

  // ── Copy to clipboard ──
  const handleCopy = useCallback(async () => {
    const fullText = `${editableSubject}\n\n${editableBody}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setToastMessage("Email copied to clipboard");
      setToastVisible(true);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = fullText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setToastMessage("Email copied to clipboard");
      setToastVisible(true);
    }
  }, [editableSubject, editableBody]);

  // ── Check for missing fields (yellow highlight) ──
  const highlightMissing = (text) => {
    if (!text) return null;
    const parts = text.split(/(\[missing\]|\[no date\]|\[no venue\]|\[no price\])/g);
    return parts.map((part, i) => {
      if (part === "[missing]" || part === "[no date]" || part === "[no venue]" || part === "[no price]") {
        return (
          <span
            key={i}
            style={{
              background: COLORS.amberLight,
              color: COLORS.amber,
              padding: "1px 6px",
              borderRadius: 4,
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  // ── Render AI block (purple) ──
  const renderAIBlock = (description, sectionKey) => {
    const generated = generatedSections[sectionKey];

    if (generating) {
      return (
        <div
          key={sectionKey}
          style={{
            background: COLORS.purpleLight,
            border: `1px solid ${COLORS.purple}`,
            borderRadius: RADII.sm,
            padding: "16px 20px",
            margin: "8px 0",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              border: `2px solid ${COLORS.purple}`,
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 13, color: COLORS.purple, fontWeight: 500 }}>
            Generating with Claude...
          </span>
        </div>
      );
    }

    if (generated) {
      return (
        <div
          key={sectionKey}
          style={{
            background: COLORS.purpleLight,
            borderLeft: `3px solid ${COLORS.purple}`,
            borderRadius: `0 ${RADII.sm}px ${RADII.sm}px 0`,
            padding: "12px 16px",
            margin: "8px 0",
            fontSize: 13,
            lineHeight: 1.7,
            color: COLORS.text,
            whiteSpace: "pre-wrap",
          }}
        >
          {generated}
        </div>
      );
    }

    return (
      <div
        key={sectionKey}
        style={{
          background: COLORS.purpleLight,
          border: `1px dashed ${COLORS.purple}`,
          borderRadius: RADII.sm,
          padding: "16px 20px",
          margin: "8px 0",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 12, color: COLORS.purple, fontWeight: 500, marginBottom: 4 }}>
          AI Section
        </div>
        <div style={{ fontSize: 11.5, color: COLORS.textMuted, lineHeight: 1.5 }}>
          {description}
        </div>
      </div>
    );
  };

  // ── Render body preview (with AI blocks inline) ──
  const renderBodyPreview = () => {
    if (!template) return null;

    const bodyText = activeBody;

    // If editing, show textarea
    if (isEditing) {
      return (
        <textarea
          value={editableBody}
          onChange={(e) => setEditableBody(e.target.value)}
          style={{
            width: "100%",
            minHeight: 300,
            padding: "16px 20px",
            fontSize: 13.5,
            lineHeight: 1.8,
            fontFamily: FONTS.body,
            color: COLORS.text,
            border: `1px solid ${COLORS.border}`,
            borderRadius: RADII.sm,
            background: COLORS.white,
            outline: "none",
            resize: "vertical",
          }}
        />
      );
    }

    // If body has AI sections and not all generated yet, show mixed view
    if (hasAISections(bodyText)) {
      const parts = parseBody(bodyText);
      let aiIndex = 0;

      return (
        <div
          style={{
            padding: "16px 20px",
            background: COLORS.bg,
            border: `1px solid ${COLORS.border}`,
            borderRadius: RADII.sm,
            fontSize: 13.5,
            lineHeight: 1.8,
            color: COLORS.text,
          }}
        >
          {parts.map((part, idx) => {
            if (part.type === "text") {
              const resolved = renderResolvedText(part.content, resolvedFields);
              return (
                <span key={idx} style={{ whiteSpace: "pre-wrap" }}>
                  {highlightMissing(resolved)}
                </span>
              );
            } else {
              const sectionKeys = template.aiSections || [];
              const sectionKey = sectionKeys[aiIndex] || `ai_section_${aiIndex}`;
              aiIndex++;
              return renderAIBlock(part.description, sectionKey);
            }
          })}
        </div>
      );
    }

    // Static template — show resolved text
    return (
      <div
        style={{
          padding: "16px 20px",
          background: COLORS.bg,
          border: `1px solid ${COLORS.border}`,
          borderRadius: RADII.sm,
          fontSize: 13.5,
          lineHeight: 1.8,
          color: COLORS.text,
          whiteSpace: "pre-wrap",
          cursor: "text",
        }}
        onClick={() => setIsEditing(true)}
      >
        {highlightMissing(editableBody)}
      </div>
    );
  };

  // ── All AI sections generated? ──
  const allAIGenerated = useMemo(() => {
    if (!templateHasAI || !template?.aiSections) return false;
    return template.aiSections.every((key) => !!generatedSections[key]);
  }, [templateHasAI, template, generatedSections]);

  // ── Can switch to edit mode? ──
  const canEdit = !templateHasAI || allAIGenerated;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: COLORS.white,
        zIndex: 300,
        display: "flex",
        flexDirection: "column",
        fontFamily: FONTS.body,
        animation: "fadeIn 0.2s ease",
      }}
    >
      {/* ── Header bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 32px",
          borderBottom: `1px solid ${COLORS.border}`,
          background: COLORS.white,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: RADII.md,
              background: COLORS.cream,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon type="mail" size={18} color={COLORS.black} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.black }}>
              {getLeadName(lead)}
            </div>
            <div style={{ fontSize: 12, color: COLORS.textMuted }}>
              {lead.venue || "No venue"} · {formatDate(lead.event_date)}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            width: 36,
            height: 36,
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
          title="Close (Esc)"
        >
          <Icon type="close" size={16} color={COLORS.textMuted} />
        </button>
      </div>

      {/* ── Scrollable content ── */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            maxWidth: 720,
            width: "100%",
            padding: "28px 24px 40px",
          }}
        >
          {/* Template selector */}
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 600,
                color: COLORS.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                marginBottom: 8,
              }}
            >
              Email Template
            </label>
            <div style={{ position: "relative" }}>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 40px 10px 14px",
                  fontSize: 13,
                  fontWeight: 500,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: RADII.sm,
                  outline: "none",
                  fontFamily: FONTS.body,
                  color: COLORS.text,
                  background: COLORS.white,
                  appearance: "none",
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%239E9891' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 14px center",
                  cursor: "pointer",
                }}
              >
                {TEMPLATE_CATEGORIES.map((cat) => {
                  const templates = emailTemplates.filter((t) => t.category === cat.id);
                  if (templates.length === 0) return null;
                  return (
                    <optgroup key={cat.id} label={cat.label}>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.id} — {t.name}
                          {t.id === suggestedId ? " ★ Suggested" : ""}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>

            {/* Suggested badge */}
            {selectedTemplateId === suggestedId && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  marginTop: 8,
                  padding: "3px 10px",
                  background: COLORS.purpleLight,
                  color: COLORS.purple,
                  borderRadius: RADII.pill,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                <Icon type="spark" size={12} color={COLORS.purple} />
                Suggested for {lead.stage || "this lead"}
              </div>
            )}
          </div>

          {/* Variant selector */}
          {template?.variants && (
            <VariantPills
              variants={template.variants}
              selected={selectedVariant}
              onSelect={setSelectedVariant}
            />
          )}

          {/* Subject line */}
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
              Subject
            </label>
            <input
              value={editableSubject}
              onChange={(e) => setEditableSubject(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                fontSize: 14,
                fontWeight: 600,
                border: `1px solid ${COLORS.border}`,
                borderRadius: RADII.sm,
                outline: "none",
                fontFamily: FONTS.body,
                color: COLORS.text,
                background: COLORS.white,
              }}
            />
          </div>

          {/* Body preview / edit */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: COLORS.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Body
              </label>
              {canEdit && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  style={{
                    padding: "4px 12px",
                    background: "transparent",
                    color: COLORS.textMuted,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: RADII.sm,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: FONTS.body,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = COLORS.bg;
                    e.currentTarget.style.color = COLORS.text;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = COLORS.textMuted;
                  }}
                >
                  <Icon type="edit" size={12} color={COLORS.textMuted} />
                  Edit
                </button>
              )}
              {isEditing && (
                <button
                  onClick={() => setIsEditing(false)}
                  style={{
                    padding: "4px 12px",
                    background: COLORS.black,
                    color: COLORS.white,
                    border: "none",
                    borderRadius: RADII.sm,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: FONTS.body,
                  }}
                >
                  Done Editing
                </button>
              )}
            </div>

            {renderBodyPreview()}
          </div>

          {/* Notes input (conditional: only for AI templates) */}
          {templateHasAI && (
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
                Your notes for Claude
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={notesPlaceholder}
                style={{
                  width: "100%",
                  minHeight: 100,
                  padding: "12px 14px",
                  fontSize: 13,
                  lineHeight: 1.6,
                  fontFamily: FONTS.body,
                  color: COLORS.text,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: RADII.sm,
                  background: COLORS.bg,
                  outline: "none",
                  resize: "vertical",
                }}
              />
            </div>
          )}

          {/* AI generate button or no API key message */}
          {templateHasAI && (
            <div style={{ marginBottom: 20 }}>
              {!hasApiKey() ? (
                <div
                  style={{
                    padding: "14px 20px",
                    background: COLORS.amberLight,
                    borderRadius: RADII.sm,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Icon type="spark" size={16} color={COLORS.amber} />
                  <span style={{ fontSize: 13, color: COLORS.text, flex: 1 }}>
                    Add your Claude API key in{" "}
                    <button
                      onClick={() => {
                        onClose();
                        if (onNavigateToSettings) onNavigateToSettings();
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: COLORS.purple,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: FONTS.body,
                        fontSize: 13,
                        textDecoration: "underline",
                        padding: 0,
                      }}
                    >
                      Settings
                    </button>{" "}
                    to use AI drafting
                  </span>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      width: "100%",
                      padding: "12px 20px",
                      background: COLORS.purple,
                      color: COLORS.white,
                      border: "none",
                      borderRadius: RADII.sm,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: generating ? "not-allowed" : "pointer",
                      fontFamily: FONTS.body,
                      opacity: generating ? 0.7 : 1,
                      transition: "opacity 0.15s",
                    }}
                  >
                    <Icon type="spark" size={14} color={COLORS.white} />
                    {generating
                      ? "Generating..."
                      : allAIGenerated
                        ? "Regenerate with Claude"
                        : "Draft with Claude"}
                  </button>

                  {apiError && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: "12px 16px",
                        background: COLORS.redLight,
                        borderRadius: RADII.sm,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ fontSize: 12, color: COLORS.red }}>
                        {apiError}
                      </span>
                      <button
                        onClick={handleGenerate}
                        style={{
                          background: COLORS.red,
                          color: COLORS.white,
                          border: "none",
                          borderRadius: RADII.sm,
                          padding: "4px 12px",
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: FONTS.body,
                        }}
                      >
                        Retry
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Collision rules note */}
          {template?.collisionRules && (
            <div
              style={{
                padding: "10px 16px",
                background: COLORS.amberLight,
                borderRadius: RADII.sm,
                fontSize: 11.5,
                color: COLORS.amber,
                fontWeight: 500,
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Icon type="bell" size={14} color={COLORS.amber} />
              {template.collisionRules}
            </div>
          )}

          {/* Edit prompt when AI sections generated */}
          {templateHasAI && allAIGenerated && !isEditing && (
            <div
              style={{
                textAlign: "center",
                marginBottom: 16,
                fontSize: 12,
                color: COLORS.textMuted,
              }}
            >
              Click "Edit" above to make changes before copying
            </div>
          )}
        </div>
      </div>

      {/* ── Footer with copy button ── */}
      <div
        style={{
          padding: "16px 32px",
          borderTop: `1px solid ${COLORS.border}`,
          background: COLORS.white,
          display: "flex",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            maxWidth: 720,
            width: "100%",
            display: "flex",
            gap: 12,
          }}
        >
          <button
            onClick={handleCopy}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "14px 24px",
              background: COLORS.black,
              color: COLORS.white,
              border: "none",
              borderRadius: RADII.md,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: FONTS.body,
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <Icon type="copy" size={16} color={COLORS.white} />
            Copy Email
          </button>
        </div>
      </div>

      <ModalToast
        message={toastMessage}
        visible={toastVisible}
        onDone={() => setToastVisible(false)}
      />
    </div>
  );
};

export default EmailDrafterModal;
