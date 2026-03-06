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
    subject: "The Greenway Band — {{event_date}}",
    body: `Hi, {{partner_1_first}}! Thank you for reaching out and congratulations on your engagement! We're available on {{event_date}} and would love to come play at {{venue}}.

I've put together a proposal with everything you need to know about the band, what your night looks like, and pricing. Take a look whenever you get a chance.

🔗 {{proposal_url}}

If you'd like, I'm happy to hop on a quick call to walk through the proposal and hear more about what you have in mind. Here's my calendar: {{consultation_link}}

Looking forward to hearing from you!`,
    signOff: "Best,\nAdrian",
    mergeFields: [
      "partner_1_first",
      "event_date",
      "venue",
      "proposal_url",
      "consultation_link",
    ],
    aiSections: [],
    collisionRules: null,
    aiNotes: "If the bride mentioned specific details in her inquiry (venue feel, party energy, song requests, intimate vs big party), weave one natural reference into the second paragraph. Do not list details back. Example: 'I can already tell this is going to be a great party' or 'It sounds like the music is going to be a big part of your night.'",
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
    subject: "The Kirby Collective — {{event_date}}",
    body: `Hi, {{partner_1_first}}! Thank you for reaching out and congratulations on your engagement! We're available on {{event_date}} and would love to come play at {{venue}}.

I put together a proposal for you with everything you need to know about the band, what your night looks like, and pricing. Take a look whenever you get a chance.

🔗 {{proposal_url}}

If you'd like, I'm happy to hop on a quick call to walk through the proposal and hear more about what you have in mind. Here's my calendar: {{consultation_link}}

Looking forward to hearing from you!`,
    signOff: "Best,\nAdrian",
    mergeFields: [
      "partner_1_first",
      "event_date",
      "venue",
      "proposal_url",
      "consultation_link",
    ],
    aiSections: [],
    collisionRules: null,
    aiNotes: "Same as 4.1. If the inquiry included details, weave one natural reference into the second paragraph. KC specific: never reference Greenway, never mention a parent company, never use the word 'budget.'",
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
    subject: "The Greenway Band — {{event_date}}",
    variants: [
      {
        id: '4.3',
        label: 'Primary (New Client, Saturday <10pc)',
        trigger: 'Saturday, peak season, client requested fewer than 10 pieces',
        subject: 'The Greenway Band — {{event_date}}',
        body: `Hi, {{partner_1_first}}! Thank you for reaching out and congratulations on your engagement! We're available on {{event_date}} and would love to come play at {{venue}}.

For Saturday weddings during peak season, The Greenway Band performs as a 10 piece or larger. It's what gives a Greenway show its full sound and energy, and it's our standard for Saturday events.

I've got a proposal for you showing what the 10 piece looks like. Take a look whenever you get a chance.

🔗 {{proposal_url}}

I also put together a group called The Kirby Collective that could be a great fit for what you're looking for. Amazing musicians and a sound that really fills the room, and they play as a 6 to 8 piece. Happy to send over their info or hop on a quick call to talk through your options.

Looking forward to hearing from you!`,
        signOff: 'Best,\nAdrian',
        aiNotes: 'If the inquiry mentioned specific details (venue, guest count), weave one natural reference into paragraph 1. The KC redirect paragraph should stay as is. Do not personalize the KC description.'
      },
      {
        id: '4.3b',
        label: 'Returning Client or Planner',
        trigger: 'Known planner or returning client asks for fewer than 10 pieces on a Saturday',
        subject: 'Re: {{original_subject}}',
        body: `Hi, {{partner_1_first}}!

Great question. For Saturday weddings during peak season, we keep The Greenway Band at a 10 piece minimum. It's what makes the show feel like a Greenway show.

I put together a group called The Kirby Collective that would be perfect for a 6 or 8 piece on a Saturday. Same caliber of musicians, and they sound great. Want me to send over their info?`,
        signOff: 'Best,\nAdrian',
        aiNotes: 'Peer tone. No congratulations, no proposal link. They already know the band.'
      },
      {
        id: '4.3c',
        label: 'Client Pushback on 10pc Minimum',
        trigger: 'Client received 4.3, pushes back or asks why',
        subject: null,
        body: `Totally understand. The 10 piece is where The Greenway Band really comes alive. The horns, the vocal harmonies, the energy all depend on having the full section. We want every Greenway show to deliver at the level our couples expect, and that's the standard we hold for Saturday events.

I actually put together a group called The Kirby Collective that would be great for this. Same caliber of musicians, and they sound amazing as a 6 to 8 piece. Want me to send over their info?`,
        signOff: null,
        aiNotes: 'Mid thread reply. No greeting, no sign off. If the client\'s pushback mentioned specific reasons (budget, venue size, headcount), acknowledge the specific reason naturally: "Totally understand, and [venue] would sound great with a tighter group." One line max.'
      }
    ],
    body: `Hi, {{partner_1_first}}! Thank you for reaching out and congratulations on your engagement! We're available on {{event_date}} and would love to come play at {{venue}}.

For Saturday weddings during peak season, The Greenway Band performs as a 10 piece or larger. It's what gives a Greenway show its full sound and energy, and it's our standard for Saturday events.

I've got a proposal for you showing what the 10 piece looks like. Take a look whenever you get a chance.

🔗 {{proposal_url}}

I also put together a group called The Kirby Collective that could be a great fit for what you're looking for. Amazing musicians and a sound that really fills the room, and they play as a 6 to 8 piece. Happy to send over their info or hop on a quick call to talk through your options.

Looking forward to hearing from you!`,
    signOff: 'Best,\nAdrian',
    mergeFields: [
      "partner_1_first",
      "event_date",
      "venue",
      "proposal_url",
      "original_subject",
    ],
    aiSections: [],
    collisionRules: null,
    aiNotes: 'If the inquiry mentioned specific details (venue, guest count), weave one natural reference into paragraph 1. The KC redirect paragraph should stay as is. Do not personalize the KC description.',
    notes:
      "Variant 4.3: Primary new client. Variant 4.3b: Returning client/planner. Variant 4.3c: Client pushback.",
  },

  // 4.4 — Decline (Already Booked)
  {
    id: "4.4",
    name: "Decline (Already Booked)",
    brand: "both",
    category: "decline",
    approval: "require_approval",
    stageTrigger: ["New Lead"],
    subject: "Re: Inquiry for {{event_date}}",
    body: `Hi, {{partner_1_first}}! Thank you for reaching out. Unfortunately, we're already booked on {{event_date}}. I appreciate you thinking of us!

If your plans shift and the date changes, just let me know. I'd be happy to check our availability.`,
    signOff: "Best,\nAdrian",
    mergeFields: ["partner_1_first", "event_date"],
    aiSections: [],
    collisionRules: null,
    aiNotes: "Fully automated. No personalization needed. Brand routing: {{brand_email}} routes the from address. Copy is identical for both brands.",
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
    subject: "Re: The Greenway Band — {{event_date}}",
    body: `Hi, {{partner_1_first}}! Thank you for reaching out and congratulations on your engagement!

Unfortunately, we're already booked on {{event_date}}. But I put together a group called The Kirby Collective that might be a great fit. They're a 6 to 10 piece band with amazing musicians and a sound that really fills the room.

If you're interested, I can send over their info. I think you'd really like what they do.`,
    signOff: "Best,\nAdrian",
    mergeFields: ["partner_1_first", "event_date"],
    aiSections: [],
    collisionRules: null,
    aiNotes: "Always sends from Greenway. The Avondale Rule applies: 'I put together' is honest ownership without revealing corporate structure. Never say 'our other band,' 'we also have,' or 'my company.' No KC link or proposal in this email. If client says yes, next touchpoint is Template 4.2 from KC email.",
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
    subject: "Re: {{brand_name}} — {{event_date}}",
    body: `Hi, {{partner_1_first}}! Thank you for reaching out and congratulations on your engagement!

We're available on {{event_date}} and would love to come play at {{venue}}! I should mention that we do have another couple looking at this date as well, but nothing is confirmed yet so it's still open.

I put together a custom proposal for you here: {{proposal_url}}

I'd love to hop on a quick call to chat through everything. You can book a time here: {{consultation_link}}

Looking forward to hearing from you!`,
    signOff: "Best,\nAdrian",
    mergeFields: ["partner_1_first", "brand_name", "event_date", "venue", "proposal_url", "consultation_link"],
    aiSections: [],
    collisionRules: null,
    aiNotes: "AI layer checks pipeline to confirm a hold exists before triggering this template. If the other inquiry has booked or dropped off, route to Template 4.1 instead.",
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
    subject: "Re: {{brand_name}} — {{event_date}}",
    body: `Hi, {{partner_1_first}}! I wanted to give you a heads up on {{event_date}}. Since I sent over your proposal, we've had another couple reach out about the same date.

Nothing is booked yet and the date is still yours if you want it. Just wanted to make sure you had the full picture.

Let me know if you have any questions or if you'd like to hop on a quick call!`,
    signOff: "Best,\nAdrian",
    mergeFields: ["partner_1_first", "brand_name", "event_date"],
    aiSections: [],
    collisionRules: "If 4.6b fires, skip 4.8 for this lead.",
    aiNotes: "This email goes to the EXISTING lead (Lead A), not the new inquiry (Lead B). 48 hour minimum window: if second inquiry arrives within 48 hours of Lead A's proposal, system waits until the 48 hour mark to send. After 48 hours, fires immediately.",
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
    subject: "Re: {{brand_name}} Inquiry",
    body: `Hi, {{partner_1_first}}! Thank you for reaching out and congratulations on your engagement!

I'd love to check our availability for you. Do you have a date in mind? Once I know the date and a few details about your event, I can put together a custom proposal for you.

Looking forward to hearing from you!`,
    signOff: "Best,\nAdrian",
    mergeFields: ["partner_1_first", "brand_name"],
    aiSections: [],
    collisionRules: null,
    aiNotes: "No proposal link, no consultation link, no pricing. This email exists only to get the date. If the inquiry includes details but no date, weave in a warm personal detail: 'The Astorian is such a beautiful space' or 'Sounds like it's going to be an amazing celebration.'",
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
    body: `Hi, {{partner_1_first}}! Just wanted to follow up and see if you had a date in mind yet. Whenever you're ready, I'd love to check our availability and put together a proposal for you.`,
    signOff: "Thanks,\nAdrian",
    mergeFields: ["partner_1_first", "brand_name"],
    aiSections: [],
    collisionRules: null,
    aiNotes: "Fires 5 to 7 days after Template 4.7 with no response. Same thread (Re: subject). Last automated touchpoint in no date flow. If no response, lead goes cold. No further follow ups.",
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
    subject: "Re: {{brand_name}} — {{event_date}}",
    body: `Hi, {{partner_1_first}}! Just checking in on {{event_date}}. Did you have a chance to look over the proposal?

No rush at all, just wanted to check in.`,
    signOff: "Thanks,\nAdrian",
    mergeFields: ["partner_1_first", "brand_name", "event_date"],
    aiSections: [],
    collisionRules: "Skip if 4.6b already fired for this lead.",
    aiNotes: "Fires 5 to 7 days after initial response. Same thread. Proposal callback, not a decision question. If 4.6b (competitive notification) already fired within this window, skip 4.8. Closing is 'Thanks' not 'Best' per writing style profile.",
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
    subject: "Re: {{agent_subject_line}}",
    body: `Hey! Yes, we're available.

{{piece_count}} piece: {{total_price}} gross

Let me know!`,
    signOff: "Best,\nAdrian",
    mergeFields: ["agent_subject_line", "piece_count", "total_price"],
    aiSections: [],
    collisionRules: null,
    aiNotes: "Agent emails always use 'gross' (commission math). No 'Hi, [Name]' greeting for agents. 'Hey!' is the opener. Reply on the agent's subject line. No proposal link, no instrument breakdown, no consultation offer. Include add on pricing lines only for services explicitly requested in the inquiry (cocktail hour, ceremony, continuous play). Always Greenway brand only.",
    notes:
      "Terse. Gross pricing only. No proposal link.",
  },

  // 4.9b — Planner Response
  {
    id: "4.9b",
    name: "Planner Response",
    brand: "greenway",
    category: "agent",
    approval: "require_approval",
    stageTrigger: ["New Lead"],
    subject: "Re: {{brand_name}} — {{event_date}}",
    body: `Hi, {{partner_1_first}}! Thank you for reaching out. We're available on {{event_date}} and would love to come play.

Here is our pricing:

{{config_1_name}} — {{config_1_price}}
{{config_1_instruments}}
MC Services, Professional Sound and Lighting

{{config_2_name}} — {{config_2_price}}
{{config_2_instruments}}
MC Services, Professional Sound and Lighting

I've also put together a proposal page you can share with the couple if it's helpful:

🔗 {{proposal_url}}

Happy to hop on a call with you or with the couple whenever works. Let me know.`,
    signOff: "Best,\nAdrian",
    mergeFields: [
      "partner_1_first",
      "brand_name",
      "event_date",
      "config_1_name",
      "config_1_price",
      "config_1_instruments",
      "config_2_name",
      "config_2_price",
      "config_2_instruments",
      "proposal_url",
    ],
    aiSections: [],
    collisionRules: null,
    aiNotes: "'Hi' for all planners (known or new). No 'gross' label (planners don't take commission). Price at top of each config block. Full instrument breakdown. Proposal link is optional couple forward ('if it's helpful'). If planner mentioned venue, couple name, or specific requests, weave one natural reference in. 'Let me know' with period, not exclamation. Peer tone.",
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
    subject: "Re: {{brand_name}} — {{event_date}}",
    variants: [
      {
        id: '4.15a',
        label: 'Contract Not Yet Sent',
        trigger: '3 to 5 days after recap (4.14), client has not booked, contract not yet sent',
        subject: 'Re: {{brand_name}} — {{event_date}}',
        body: `Hi, {{partner_1_first}}! Just wanted to follow up and see if you had any questions about anything we talked about. If you're ready to move forward, I can get the contract over to you and we'll get everything locked in. No rush at all!`,
        signOff: 'Thanks,\nAdrian',
        aiNotes: 'Fires on same thread as recap (4.14). No duplicate warm opener (recap already did that). Last automated touch post consultation.'
      },
      {
        id: '4.15b',
        label: 'Contract Already Sent',
        trigger: '3 to 5 days after recap (4.14), contract was sent but not signed',
        subject: 'Re: {{brand_name}} — {{event_date}}',
        body: `Hi, {{partner_1_first}}! Just wanted to check in and see if you had a chance to look over the contract. Let me know if you have any questions or if there's anything else I can help with. No rush at all!`,
        signOff: 'Thanks,\nAdrian',
        aiNotes: 'Same thread. Contract callback variant. Collision rule: 4.8 and 4.15 never both fire for the same lead.'
      }
    ],
    body: `Hi, {{partner_1_first}}! Just wanted to follow up and see if you had any questions about anything we talked about. If you're ready to move forward, I can get the contract over to you and we'll get everything locked in. No rush at all!`,
    signOff: "Thanks,\nAdrian",
    mergeFields: ["partner_1_first", "brand_name", "event_date"],
    aiSections: [],
    collisionRules: null,
    aiNotes: 'Fires on same thread as recap (4.14). No duplicate warm opener (recap already did that). Last automated touch post consultation.',
    notes:
      "Variant 4.15a: contract not sent. Variant 4.15b: contract sent. 3 to 5 days after recap.",
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
