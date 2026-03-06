// Email Templates — Single source of truth for all 16 locked email templates
// Template merge fields use {{field_name}} syntax
// AI generated sections use [[AI: description]] syntax

import { formatCurrency } from "../utils/formatters";

// ── Merge Field Resolver ──
// Maps template field names to Supabase lead column values.
// Used ONLY by the Email Drafter when resolving {{field_name}} placeholders.
export function resolveFields(lead) {
  return {
    partner_1_first: lead.partner1_first || "",
    partner_1_last: lead.partner1_last || "",
    partner_2_first: lead.partner2_first || "",
    partner_2_last: lead.partner2_last || "",
    event_date: lead.event_date
      ? new Date(lead.event_date + "T00:00:00").toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "[no date]",
    venue: lead.venue || "[no venue]",
    guest_count: lead.guest_count ? lead.guest_count.toLocaleString() : "",
    piece_count: lead.config ? lead.config.split(" ")[0] : "",
    brand_name:
      lead.brand === "Greenway"
        ? "The Greenway Band"
        : "The Kirby Collective",
    brand_email:
      lead.brand === "Greenway"
        ? "adrian@greenwayband.com"
        : "adrian@kirbycollective.com",
    total_price: lead.price ? formatCurrency(lead.price) : "[no price]",
    proposal_url: `https://proposals.greenwayband.com/${(lead.partner1_last || "proposal").toLowerCase()}`,
    planner_name: lead.planner_name || "",
    source: lead.source || "",
  };
}

// ── Auto Suggest Logic ──
// Returns the best template ID for a given lead based on stage, brand, and source.
export function suggestTemplate(lead) {
  const stage = lead.stage || "";
  const brand = (lead.brand || "").toLowerCase();
  const source = (lead.source || "").toLowerCase();
  const hasDate = !!lead.event_date;

  if (stage === "New Lead") {
    if (!hasDate) return "4.7";
    if (source === "gce" || source === "agent") return "4.9a";
    if (source === "planner") return "4.9b";
    if (brand === "kirby collective") return "4.2";
    return "4.1";
  }
  if (stage === "Proposal Sent") return "4.8";
  if (stage === "Consultation Scheduled") return "4.14";
  if (stage === "Post Consultation") return "4.14";
  if (stage === "Contract Sent") return "4.15";
  if (stage === "Booked") return "4.12";
  return "4.1";
}

// ── Template Categories ──
export const TEMPLATE_CATEGORIES = [
  { id: "inquiry", label: "Inquiry Response" },
  { id: "decline", label: "Decline" },
  { id: "hold", label: "Hold / Competitive" },
  { id: "follow_up", label: "Follow Up" },
  { id: "consultation", label: "Consultation" },
  { id: "agent", label: "Agent / Planner" },
  { id: "logistics", label: "Logistics" },
  { id: "quick", label: "Quick Reply" },
  { id: "outreach", label: "Outreach" },
];

// ── All 16 Templates ──
export const emailTemplates = [
  // 4.1 — New Inquiry Response (Greenway)
  {
    id: "4.1",
    name: "New Inquiry Response (Greenway)",
    brand: "greenway",
    category: "inquiry",
    approval: "require_approval",
    stageTrigger: ["New Lead"],
    subject: "The Greenway Band | {{event_date}}",
    body: `Hi, {{partner_1_first}}! Thank you for reaching out and congratulations on your engagement!

I'd love to chat more about {{event_date}} at {{venue}} and walk you through what we do. The best way to get a feel for the band is to hop on a quick call. I can walk you through some options, answer any questions, and we can talk through the vision for the night.

In the meantime, I put together a proposal with some more details: {{proposal_url}}

Looking forward to connecting!

Best,
Adrian`,
    mergeFields: [
      "partner_1_first",
      "event_date",
      "venue",
      "proposal_url",
    ],
    aiSections: [],
    collisionRules: null,
    notes: "Delivers proposal link. Pushes toward consultation.",
  },

  // 4.2 — New Inquiry Response (KC)
  {
    id: "4.2",
    name: "New Inquiry Response (KC)",
    brand: "kc",
    category: "inquiry",
    approval: "require_approval",
    stageTrigger: ["New Lead"],
    subject: "The Kirby Collective | {{event_date}}",
    body: `Hi, {{partner_1_first}}! Thank you for reaching out and congratulations on your engagement!

I'd love to chat more about {{event_date}} at {{venue}} and walk you through what we do. The best way to get a feel for the group is to hop on a quick call. I can walk you through some options, answer any questions, and we can talk through the vision for the night.

In the meantime, I put together a proposal with some more details: {{proposal_url}}

Looking forward to connecting!

Best,
Adrian`,
    mergeFields: [
      "partner_1_first",
      "event_date",
      "venue",
      "proposal_url",
    ],
    aiSections: [],
    collisionRules: null,
    notes: "KC version of 4.1. Same structure, KC branding.",
  },

  // 4.3 — Saturday Peak Season (Under 10pc Request)
  {
    id: "4.3",
    name: "Saturday Peak Season (Under 10pc)",
    brand: "greenway",
    category: "inquiry",
    approval: "require_approval",
    stageTrigger: ["New Lead"],
    subject: "The Greenway Band | {{event_date}}",
    variants: {
      a: {
        label: "Saturday (10pc minimum)",
        body: `Hi, {{partner_1_first}}! Thank you for reaching out and congratulations on your engagement!

I'd love to be part of {{event_date}}. For Saturday evenings during peak season, our minimum configuration is a 10 piece band. That's our sweet spot for keeping the energy up all night in a ballroom setting, and it's what most of our couples go with.

I'd love to hop on a quick call and walk you through what that looks like. In the meantime, here's a proposal with more details: {{proposal_url}}

Looking forward to it!

Best,
Adrian`,
      },
      b: {
        label: "Sunday / Friday (standard)",
        body: `Hi, {{partner_1_first}}! Thank you for reaching out and congratulations on your engagement!

I'd love to chat more about {{event_date}} at {{venue}} and walk you through what we do. The best way to get a feel for the band is to hop on a quick call. I can walk you through some options, answer any questions, and we can talk through the vision for the night.

In the meantime, I put together a proposal with some more details: {{proposal_url}}

Looking forward to connecting!

Best,
Adrian`,
      },
      c: {
        label: "Weekday (flexible config)",
        body: `Hi, {{partner_1_first}}! Thank you for reaching out and congratulations on your engagement!

I'd love to chat more about {{event_date}} at {{venue}} and walk you through what we do. Weekday events are great because we have a lot of flexibility with configuration. I can walk you through some options on a quick call.

In the meantime, I put together a proposal with some more details: {{proposal_url}}

Looking forward to connecting!

Best,
Adrian`,
      },
    },
    body: `Hi, {{partner_1_first}}! Thank you for reaching out and congratulations on your engagement!

I'd love to be part of {{event_date}}. For Saturday evenings during peak season, our minimum configuration is a 10 piece band. That's our sweet spot for keeping the energy up all night in a ballroom setting, and it's what most of our couples go with.

I'd love to hop on a quick call and walk you through what that looks like. In the meantime, here's a proposal with more details: {{proposal_url}}

Looking forward to it!

Best,
Adrian`,
    mergeFields: [
      "partner_1_first",
      "event_date",
      "venue",
      "proposal_url",
    ],
    aiSections: [],
    collisionRules: null,
    notes:
      "Variant A: Saturday 10pc minimum. Variant B: Sun/Fri standard. Variant C: Weekday flexible.",
  },

  // 4.4 — Decline (Already Booked)
  {
    id: "4.4",
    name: "Decline (Already Booked)",
    brand: "both",
    category: "decline",
    approval: "require_approval",
    stageTrigger: ["New Lead"],
    subject: "The Greenway Band | {{event_date}}",
    body: `Hi, {{partner_1_first}}! Thank you so much for reaching out. Unfortunately, we're already booked on {{event_date}}.

Congratulations on your engagement, and I hope you find the perfect band for the night!

Best,
Adrian`,
    mergeFields: ["partner_1_first", "event_date"],
    aiSections: [],
    collisionRules: null,
    notes: "Simple decline. Date conflict.",
  },

  // 4.5 — Decline, Route to KC
  {
    id: "4.5",
    name: "Decline, Route to KC",
    brand: "greenway",
    category: "decline",
    approval: "require_approval",
    stageTrigger: ["New Lead"],
    subject: "The Greenway Band | {{event_date}}",
    body: `Hi, {{partner_1_first}}! Thank you so much for reaching out. Unfortunately, we're already booked on {{event_date}}.

That said, I put together a group called The Kirby Collective that might be a great fit for your evening. They're a {{piece_count}} piece band that brings a really warm, connected energy to the room. Think of it as the kind of night where every song feels like it's playing just for you and your guests.

I can send over some more details if you're interested!

Best,
Adrian`,
    mergeFields: ["partner_1_first", "event_date", "piece_count"],
    aiSections: [],
    collisionRules: null,
    notes: "Greenway booked, route to KC.",
  },

  // 4.6 — Date on Hold
  {
    id: "4.6",
    name: "Date on Hold",
    brand: "both",
    category: "hold",
    approval: "require_approval",
    stageTrigger: ["Proposal Sent"],
    subject: "Re: {{brand_name}} | {{event_date}}",
    body: `Hi, {{partner_1_first}}! Just wanted to let you know we're holding {{event_date}} for you. No rush at all on making a decision. Whenever you're ready, just let me know and I can get the contract over to you.

Best,
Adrian`,
    mergeFields: ["partner_1_first", "brand_name", "event_date"],
    aiSections: [],
    collisionRules: null,
    notes: "Gentle hold notification.",
  },

  // 4.6b — Competitive Notification
  {
    id: "4.6b",
    name: "Competitive Notification",
    brand: "both",
    category: "hold",
    approval: "require_approval",
    stageTrigger: ["Proposal Sent"],
    subject: "Re: {{brand_name}} | {{event_date}}",
    body: `Hi, {{partner_1_first}}! Just a quick heads up that we've gotten another inquiry for {{event_date}}. I wanted to give you first priority since we've already been talking. If you'd like to lock in the date, let me know and I can get the contract over to you today.

No pressure at all! Just wanted to keep you in the loop.

Best,
Adrian`,
    mergeFields: ["partner_1_first", "brand_name", "event_date"],
    aiSections: [],
    collisionRules: "If 4.6b fires, skip 4.8 for this lead.",
    notes: "Competitive urgency. Skip 4.8 after this fires.",
  },

  // 4.7 — Inquiry with No Date
  {
    id: "4.7",
    name: "Inquiry with No Date",
    brand: "both",
    category: "inquiry",
    approval: "require_approval",
    stageTrigger: ["New Lead"],
    subject: "{{brand_name}} Inquiry",
    body: `Hi, {{partner_1_first}}! Thank you for reaching out and congratulations on your engagement!

Whenever you have a date in mind, I'd love to check our availability and put together a proposal for you. In the meantime, feel free to check out some of what we do: {{proposal_url}}

Looking forward to connecting!

Best,
Adrian`,
    mergeFields: ["partner_1_first", "brand_name", "proposal_url"],
    aiSections: [],
    collisionRules: null,
    notes: "No date provided by lead.",
  },

  // 4.7b — No Date Follow Up
  {
    id: "4.7b",
    name: "No Date Follow Up",
    brand: "both",
    category: "follow_up",
    approval: "require_approval",
    stageTrigger: ["New Lead"],
    subject: "Re: {{brand_name}} Inquiry",
    body: `Hi, {{partner_1_first}}! Just wanted to follow up and see if you had a date in mind yet. Whenever you're ready, I'd love to check our availability and put together a proposal for you.

Thanks,
Adrian`,
    mergeFields: ["partner_1_first", "brand_name"],
    aiSections: [],
    collisionRules: null,
    notes: "Follow up 5 to 7 days after 4.7.",
  },

  // 4.8 — Follow Up (No Response After Quote)
  {
    id: "4.8",
    name: "Follow Up (No Response After Quote)",
    brand: "both",
    category: "follow_up",
    approval: "require_approval",
    stageTrigger: ["Proposal Sent"],
    subject: "Re: {{brand_name}} | {{event_date}}",
    body: `Hi, {{partner_1_first}}! Just checking in on {{event_date}}. Did you have a chance to look over the proposal?

No rush at all, just wanted to check in.

Thanks,
Adrian`,
    mergeFields: ["partner_1_first", "brand_name", "event_date"],
    aiSections: [],
    collisionRules: "Skip if 4.6b already fired for this lead.",
    notes: "Follow up 5 to 7 days after proposal. Skipped if 4.6b fired.",
  },

  // 4.9a — Agent/GCE Response
  {
    id: "4.9a",
    name: "Agent / GCE Response",
    brand: "greenway",
    category: "agent",
    approval: "require_approval",
    stageTrigger: ["New Lead"],
    subject: "The Greenway Band | {{event_date}}",
    body: `Hi! Thanks for reaching out about {{event_date}}.

Here's what I'm looking at for a {{piece_count}} piece:

Gross: {{total_price}}

Configuration:
Vocals, keys, guitar, bass, drums, trumpet, saxophone, trombone, aux percussion, violin

Let me know if you need anything else!

Best,
Adrian`,
    mergeFields: ["event_date", "piece_count", "total_price"],
    aiSections: [],
    collisionRules: null,
    notes:
      "Terse. Gross pricing only. Bulleted instrument config. No proposal link.",
  },

  // 4.9b — Planner Response
  {
    id: "4.9b",
    name: "Planner Response",
    brand: "greenway",
    category: "agent",
    approval: "require_approval",
    stageTrigger: ["New Lead"],
    subject: "The Greenway Band | {{event_date}}",
    body: `Hi, {{planner_name}}! Thanks for reaching out about {{event_date}} at {{venue}}.

For a {{piece_count}} piece band, here's the pricing breakdown:

Band fee: {{total_price}}

That includes full sound, lighting, MC services, and music during breaks and transitions. I can put together a proposal to forward to your couple if that would be helpful.

I'd love to hop on a quick call to talk through the details if you have a few minutes!

Best,
Adrian`,
    mergeFields: [
      "planner_name",
      "event_date",
      "venue",
      "piece_count",
      "total_price",
    ],
    aiSections: [],
    collisionRules: null,
    notes: "Professional planner response with pricing breakdown.",
  },

  // 4.12 — Logistics FAQ
  {
    id: "4.12",
    name: "Logistics FAQ",
    brand: "both",
    category: "logistics",
    approval: "ai_draft",
    stageTrigger: ["Booked"],
    subject: "Re: {{brand_name}} | {{event_date}}",
    body: `[[AI: Draft response to logistics question based on lead data, gig sheet, and FAQ patterns. Topics: stage space, arrival time, power requirements, dress code, song requests, break schedule. Queue for approval.]]`,
    mergeFields: ["brand_name", "event_date"],
    aiSections: ["logistics_response"],
    collisionRules: null,
    notes:
      "Fully AI drafted. Adrian provides the client question context in notes.",
    notesPlaceholder:
      "What's the client asking about? Paste their question or summarize it...",
  },

  // 4.13 — Quick Reply
  {
    id: "4.13",
    name: "Quick Reply",
    brand: "both",
    category: "quick",
    approval: "ai_draft",
    stageTrigger: [
      "New Lead",
      "Proposal Sent",
      "Consultation Scheduled",
      "Post Consultation",
      "Contract Sent",
      "Booked",
    ],
    subject: "Re: {{brand_name}} | {{event_date}}",
    body: `[[AI: One sentence confirmation or acknowledgment. Examples: "Sounds great, we'll plan on that!" / "Got it, thank you!" / "Perfect, that works for us." Pull from a vocabulary pool. Keep it natural and short.]]`,
    mergeFields: ["brand_name", "event_date"],
    aiSections: ["quick_reply"],
    collisionRules: null,
    notes: "One sentence AI reply.",
    notesPlaceholder: "What are you confirming or acknowledging?",
  },

  // 4.14 — Post Consultation Recap
  {
    id: "4.14",
    name: "Post Consultation Recap",
    brand: "both",
    category: "consultation",
    approval: "ai_draft",
    stageTrigger: ["Consultation Scheduled", "Post Consultation"],
    subject: "{{brand_name}} | {{event_date}}",
    body: `Hi, {{partner_1_first}}! It was great getting to talk with you today. We're really excited about {{event_date}} at {{venue}}.

[[AI: Recap paragraph. 2 to 4 sentences. Summarize what was discussed: specific requests, song choices, timing preferences, vibe descriptions, any decisions made. Written as natural prose, not bullet points. Only include details Adrian provided in his notes.]]

[[AI: Next steps. 1 to 2 sentences. If booking: "I'll get the contract over to you this week." If still deciding: "Once you're ready to move forward, I'll send over the contract and we'll get everything locked in."]] In the meantime, let me know if any other questions come up!

Looking forward to this one.

Best,
Adrian`,
    mergeFields: [
      "partner_1_first",
      "brand_name",
      "event_date",
      "venue",
    ],
    aiSections: ["recap_paragraph", "next_steps"],
    collisionRules: null,
    notes: "AI sections require Adrian to input call notes before generating.",
    notesPlaceholder:
      "What did you discuss on the call? Song requests, vibe, timeline preferences, anything specific...",
  },

  // 4.15 — Post Consultation Follow Up
  {
    id: "4.15",
    name: "Post Consultation Follow Up",
    brand: "both",
    category: "follow_up",
    approval: "require_approval",
    stageTrigger: ["Post Consultation", "Contract Sent"],
    subject: "Re: {{brand_name}} | {{event_date}}",
    variants: {
      A: {
        label: "No contract sent",
        body: `Hi, {{partner_1_first}}! Just wanted to follow up and see if you had any questions about anything we talked about. If you're ready to lock in the date, I can get the contract over to you.

No rush at all! Let me know if there's anything I can help with.

Thanks,
Adrian`,
      },
      B: {
        label: "Contract sent",
        body: `Hi, {{partner_1_first}}! Just wanted to follow up and see if you had any questions about anything we talked about. Did you have a chance to look over the contract?

No rush at all! Let me know if there's anything I can help with.

Thanks,
Adrian`,
      },
    },
    body: `Hi, {{partner_1_first}}! Just wanted to follow up and see if you had any questions about anything we talked about. If you're ready to lock in the date, I can get the contract over to you.

No rush at all! Let me know if there's anything I can help with.

Thanks,
Adrian`,
    mergeFields: ["partner_1_first", "brand_name", "event_date"],
    aiSections: [],
    collisionRules: null,
    notes:
      "Variant A: no contract sent. Variant B: contract sent. 3 to 5 days after recap.",
  },

  // 4.16 — Cold Planner Outreach
  {
    id: "4.16",
    name: "Cold Planner Outreach",
    brand: "greenway",
    category: "outreach",
    approval: "ai_draft",
    stageTrigger: [],
    subject: "{{brand_name}}",
    body: `[[AI: Draft cold outreach to a planner. Input: planner name, company, any context Adrian provides. Tone: professional, warm, not salesy. Mention a recent event or shared venue if Adrian provides it. Keep to 3 to 4 sentences.]]`,
    mergeFields: ["brand_name"],
    aiSections: ["cold_outreach"],
    collisionRules: null,
    notes: "Manual only. Greenway only. AI drafts from Adrian's notes.",
    notesPlaceholder:
      "Planner name, company, any shared venues or context...",
  },
];

// Helper to get a template by ID
export function getTemplateById(id) {
  return emailTemplates.find((t) => t.id === id) || null;
}

// Helper to get templates grouped by category
export function getTemplatesByCategory() {
  const grouped = {};
  for (const cat of TEMPLATE_CATEGORIES) {
    grouped[cat.id] = {
      label: cat.label,
      templates: emailTemplates.filter((t) => t.category === cat.id),
    };
  }
  return grouped;
}
