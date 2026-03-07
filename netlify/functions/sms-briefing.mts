// Netlify Scheduled Function: Generate and send AI Crew SMS briefings
// Schedule configured in netlify.toml: "0 1,13,14,15 * * *"
// Checks current Central Time and fires appropriate persona briefings
import { createClient } from "@supabase/supabase-js";

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

// ── DST detection ──
// CDT (UTC-5): Second Sunday of March through first Sunday of November
// CST (UTC-6): rest of the year
function getCentralTimeOffset(now: Date): number {
  const year = now.getUTCFullYear();

  // Second Sunday of March
  const mar1 = new Date(Date.UTC(year, 2, 1));
  const marFirstSunday = (7 - mar1.getUTCDay()) % 7;
  const dstStart = new Date(Date.UTC(year, 2, 1 + marFirstSunday + 7, 7, 0)); // 2 AM CT = 7/8 AM UTC

  // First Sunday of November
  const nov1 = new Date(Date.UTC(year, 10, 1));
  const novFirstSunday = (7 - nov1.getUTCDay()) % 7;
  const dstEnd = new Date(Date.UTC(year, 10, 1 + (novFirstSunday === 0 ? 0 : novFirstSunday), 7, 0));

  return now >= dstStart && now < dstEnd ? -5 : -6;
}

function getCentralTime(now: Date) {
  const offset = getCentralTimeOffset(now);
  const ct = new Date(now.getTime() + offset * 60 * 60 * 1000);
  return {
    hour: ct.getUTCHours(),
    day: ct.getUTCDay(), // 0=Sunday
    offset,
  };
}

// ── Persona definitions ──
const PERSONAS = {
  adrian_ai: {
    name: "Adrian AI",
    role: "Chief of Staff",
    matchSchedule: (h: number, d: number) => h === 8, // Daily 8 AM CT
    systemPrompt: `You are Adrian AI, the Chief of Staff for The Greenway Band. You send a daily morning briefing via text message to Adrian Michael, the founder.

Your tone is: concise, direct, no fluff. Like a sharp executive assistant. No greetings, no sign-offs. Just the brief.

Structure your briefing in this order (skip any section with nothing to report):
1. TODAY: Consultations, follow ups due, weddings happening today or this week
2. PIPELINE: Active lead count, any leads that need attention (no response in 3+ days, stage stuck)
3. HEADS UP: Conflicts, upcoming deadlines, anything unusual

Rules:
- Maximum 400 characters total. This is an SMS. Every word must earn its place.
- Use line breaks between sections for readability.
- Use lead names (couple names), not IDs.
- Dollar amounts: no decimals, use commas. "$12,500" not "$12500.00"
- Dates: "Mar 8" not "March 8th, 2026" or "2026-03-08"
- Band configs: "10pc" not "10 piece" or "10-piece" (SMS brevity exception)
- If nothing urgent, say so in one line: "Clean slate today. No fires."
- Never fabricate data. If the pipeline is empty, say so.`,
  },
  content_ai: {
    name: "Content AI",
    role: "Social Media Manager",
    matchSchedule: (h: number, d: number) => h === 9 && d === 1, // Monday 9 AM CT
    systemPrompt: `You are Content AI, the Social Media Manager for The Greenway Band. You send a weekly Monday morning briefing via text message to Adrian Michael.

Your tone is: creative but efficient. Like a social media manager dropping a quick status update.

Structure your briefing:
1. THIS WEEK: Posts scheduled, what's going out and when
2. NEEDS ATTENTION: Posts stuck in draft, posts with no images, reviews waiting for approval
3. VAULT: New gallery activity, upload opportunities

Rules:
- Maximum 400 characters total. This is an SMS.
- Use post titles, not IDs.
- If the content calendar is empty, nudge: "Nothing scheduled this week. Time to queue something up."
- Never fabricate data. Report only what exists in the system.`,
  },
  strategy_ai: {
    name: "Strategy AI",
    role: "Business Consultant",
    matchSchedule: (h: number, d: number) => h === 19 && d === 0, // Sunday 7 PM CT
    systemPrompt: `You are Strategy AI, the Business Consultant for The Greenway Band. You send a weekly Sunday evening briefing via text message to Adrian Michael.

Your tone is: analytical, insightful, strategic. Like a trusted business advisor giving a weekly pulse check.

Structure your briefing:
1. WEEK IN REVIEW: New leads, bookings, losses, notable activity
2. NUMBERS: Conversion rate (booked / total leads), pipeline value, average deal size
3. INSIGHT: One actionable observation. Could be about a source performing well, a planner worth nurturing, a pricing trend, or a lead worth re-engaging.

Rules:
- Maximum 450 characters total. This is an SMS. The strategy insight can be slightly longer than other personas.
- Conversion rate: whole percentages. "42%" not "41.67%"
- Revenue: round to nearest hundred. "$87,500" not "$87,432"
- Compare to previous period when possible (e.g. "up from 3 last week")
- Never fabricate data. If there is insufficient data for an insight, say "Not enough data yet for trend analysis."`,
  },
};

// ── Data queries ──
async function getAdrianAiData(supabase: any) {
  const today = new Date().toISOString().split("T")[0];
  const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [activeLeads, todayConsults, overdueFollowups, thisWeekWeddings, recentActivity] =
    await Promise.all([
      supabase
        .from("leads")
        .select("*")
        .not("stage", "in", '("Booked","Fulfilled","Lost")')
        .order("updated_at", { ascending: false }),
      supabase
        .from("leads")
        .select("*")
        .gte("consultation_date", today)
        .lt("consultation_date", today + "T23:59:59"),
      supabase
        .from("leads")
        .select("*")
        .lt("followup_date", today)
        .not("stage", "in", '("Booked","Fulfilled","Lost")'),
      supabase
        .from("leads")
        .select("*")
        .eq("stage", "Booked")
        .gte("event_date", today)
        .lte("event_date", weekFromNow),
      supabase
        .from("leads")
        .select("*")
        .gte("updated_at", yesterday),
    ]);

  return {
    activeLeads: activeLeads.data || [],
    todayConsults: todayConsults.data || [],
    overdueFollowups: overdueFollowups.data || [],
    thisWeekWeddings: thisWeekWeddings.data || [],
    recentActivity: recentActivity.data || [],
  };
}

async function getContentAiData(supabase: any) {
  const today = new Date().toISOString().split("T")[0];
  const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [thisWeekPosts, reviewPosts, draftNoImage, galleryStats] = await Promise.all([
    supabase
      .from("social_posts")
      .select("*")
      .gte("scheduled_date", today)
      .lte("scheduled_date", weekFromNow)
      .order("scheduled_date"),
    supabase
      .from("social_posts")
      .select("*")
      .eq("status", "review"),
    supabase
      .from("social_posts")
      .select("*")
      .eq("status", "draft")
      .is("image_url", null)
      .is("gallery_photo_id", null),
    supabase
      .from("galleries")
      .select("id, photo_count")
      .eq("is_active", true),
  ]);

  return {
    thisWeekPosts: thisWeekPosts.data || [],
    reviewPosts: reviewPosts.data || [],
    draftNoImage: draftNoImage.data || [],
    galleryStats: galleryStats.data || [],
  };
}

async function getStrategyAiData(supabase: any) {
  const year = new Date().getFullYear();
  const yearStart = `${year}-01-01`;

  const [allLeads, bookedThisYear, lostThisYear, sourceStats, plannerStats] =
    await Promise.all([
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
      supabase
        .from("leads")
        .select("*")
        .eq("stage", "Booked")
        .gte("booked_date", yearStart),
      supabase
        .from("leads")
        .select("*")
        .eq("stage", "Lost")
        .gte("updated_at", yearStart),
      supabase.from("leads").select("source, stage"),
      supabase
        .from("leads")
        .select("planner_name, stage")
        .not("planner_name", "is", null),
    ]);

  return {
    allLeads: allLeads.data || [],
    bookedThisYear: bookedThisYear.data || [],
    lostThisYear: lostThisYear.data || [],
    sourceStats: sourceStats.data || [],
    plannerStats: plannerStats.data || [],
  };
}

// ── Claude API call ──
async function callClaude(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const res = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Claude API error: ${res.status}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || "";
}

// ── Twilio SMS send ──
async function sendSms(body: string): Promise<{ sid: string; status: string }> {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, ADRIAN_PHONE_NUMBER } =
    process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER || !ADRIAN_PHONE_NUMBER) {
    throw new Error("Twilio not configured");
  }

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

  const res = await fetch(twilioUrl, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: ADRIAN_PHONE_NUMBER,
      From: TWILIO_PHONE_NUMBER,
      Body: body,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Twilio send failed");
  return { sid: data.sid, status: data.status };
}

// ── Format data for Claude prompt ──
function formatAdrianPrompt(data: any): string {
  const lines: string[] = [];
  lines.push(`Date: ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}`);
  lines.push(`Active pipeline leads: ${data.activeLeads.length}`);

  if (data.todayConsults.length) {
    lines.push(`Today's consultations: ${data.todayConsults.map((l: any) => `${l.partner1_first || ""} ${l.partner1_last || ""} & ${l.partner2_first || ""}`).join(", ")}`);
  }
  if (data.overdueFollowups.length) {
    lines.push(`Overdue follow ups: ${data.overdueFollowups.map((l: any) => `${l.partner1_first || ""} ${l.partner1_last || ""} (${l.stage})`).join(", ")}`);
  }
  if (data.thisWeekWeddings.length) {
    lines.push(`This week's weddings: ${data.thisWeekWeddings.map((l: any) => `${l.partner1_last || ""}/${l.partner2_last || ""} at ${l.venue || "TBD"} on ${l.event_date}`).join(", ")}`);
  }
  if (data.recentActivity.length) {
    lines.push(`Leads updated in last 24h: ${data.recentActivity.length}`);
  }

  return lines.join("\n");
}

function formatContentPrompt(data: any): string {
  const lines: string[] = [];
  lines.push(`Posts scheduled this week: ${data.thisWeekPosts.length}`);
  if (data.thisWeekPosts.length) {
    data.thisWeekPosts.forEach((p: any) => {
      lines.push(`  - "${p.title || "Untitled"}" on ${p.scheduled_date || "unscheduled"} (${p.status})`);
    });
  }
  lines.push(`Posts awaiting review: ${data.reviewPosts.length}`);
  lines.push(`Drafts without images: ${data.draftNoImage.length}`);
  lines.push(`Active galleries: ${data.galleryStats.length}, Total photos: ${data.galleryStats.reduce((sum: number, g: any) => sum + (g.photo_count || 0), 0)}`);
  return lines.join("\n");
}

function formatStrategyPrompt(data: any): string {
  const lines: string[] = [];
  const total = data.allLeads.length;
  const booked = data.allLeads.filter((l: any) => l.stage === "Booked").length;
  const convRate = total > 0 ? Math.round((booked / total) * 100) : 0;
  const bookedRevenue = data.bookedThisYear.reduce((sum: number, l: any) => sum + (parseFloat(l.price) || 0), 0);
  const roundedRevenue = Math.round(bookedRevenue / 100) * 100;

  lines.push(`Total leads: ${total}`);
  lines.push(`Booked: ${booked} (${convRate}% conversion)`);
  lines.push(`Revenue this year (booked): $${roundedRevenue.toLocaleString()}`);
  lines.push(`Lost this year: ${data.lostThisYear.length}`);
  lines.push(`Booked this year: ${data.bookedThisYear.length}`);

  // Source breakdown
  const sources: Record<string, { total: number; booked: number }> = {};
  data.sourceStats.forEach((l: any) => {
    const s = l.source || "Unknown";
    if (!sources[s]) sources[s] = { total: 0, booked: 0 };
    sources[s].total++;
    if (l.stage === "Booked") sources[s].booked++;
  });
  lines.push(`Source breakdown: ${Object.entries(sources).map(([k, v]) => `${k}: ${v.total} leads, ${v.booked} booked`).join("; ")}`);

  // Planner breakdown
  const planners: Record<string, { total: number; booked: number }> = {};
  data.plannerStats.forEach((l: any) => {
    const p = l.planner_name;
    if (!planners[p]) planners[p] = { total: 0, booked: 0 };
    planners[p].total++;
    if (l.stage === "Booked") planners[p].booked++;
  });
  if (Object.keys(planners).length) {
    lines.push(`Planner referrals: ${Object.entries(planners).map(([k, v]) => `${k}: ${v.total} leads, ${v.booked} booked`).join("; ")}`);
  }

  return lines.join("\n");
}

// ── Compute next send time ──
function computeNextSend(persona: string): string {
  const now = new Date();
  const offset = getCentralTimeOffset(now);

  if (persona === "adrian_ai") {
    // Tomorrow 8 AM CT
    const next = new Date(now);
    next.setUTCDate(next.getUTCDate() + 1);
    next.setUTCHours(8 - offset, 0, 0, 0);
    return next.toISOString();
  }
  if (persona === "content_ai") {
    // Next Monday 9 AM CT
    const next = new Date(now);
    const daysUntilMonday = ((1 - next.getUTCDay() + 7) % 7) || 7;
    next.setUTCDate(next.getUTCDate() + daysUntilMonday);
    next.setUTCHours(9 - offset, 0, 0, 0);
    return next.toISOString();
  }
  if (persona === "strategy_ai") {
    // Next Sunday 7 PM CT
    const next = new Date(now);
    const daysUntilSunday = ((0 - next.getUTCDay() + 7) % 7) || 7;
    next.setUTCDate(next.getUTCDate() + daysUntilSunday);
    next.setUTCHours(19 - offset, 0, 0, 0);
    return next.toISOString();
  }
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

// ── Main handler ──
export default async (req: Request) => {
  console.log("sms-briefing triggered at", new Date().toISOString());

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date();
  const { hour, day } = getCentralTime(now);
  console.log(`Current Central Time: hour=${hour}, day=${day} (0=Sun)`);

  const results: any[] = [];

  for (const [personaKey, persona] of Object.entries(PERSONAS)) {
    if (!persona.matchSchedule(hour, day)) {
      console.log(`${persona.name}: not scheduled this hour, skipping`);
      continue;
    }

    console.log(`${persona.name}: schedule matched, checking if active...`);

    // Check if persona is active
    const { data: settings } = await supabase
      .from("sms_settings")
      .select("*")
      .eq("persona", personaKey)
      .single();

    if (!settings?.is_active) {
      console.log(`${persona.name}: inactive, skipping`);
      continue;
    }

    try {
      // Get data for this persona
      let data: any;
      let userPrompt: string;

      if (personaKey === "adrian_ai") {
        data = await getAdrianAiData(supabase);
        userPrompt = formatAdrianPrompt(data);
      } else if (personaKey === "content_ai") {
        data = await getContentAiData(supabase);
        userPrompt = formatContentPrompt(data);
      } else {
        data = await getStrategyAiData(supabase);
        userPrompt = formatStrategyPrompt(data);
      }

      console.log(`${persona.name}: generating briefing...`);

      // Generate briefing via Claude
      const briefing = await callClaude(
        persona.systemPrompt,
        `Here is the current data. Generate the briefing SMS now.\n\n${userPrompt}`
      );

      console.log(`${persona.name}: briefing generated (${briefing.length} chars)`);

      // Send SMS
      const { sid, status } = await sendSms(briefing);
      console.log(`${persona.name}: SMS sent, SID=${sid}`);

      // Generate summary (first line or first 80 chars)
      const summary = briefing.split("\n")[0].substring(0, 80);

      // Log to sms_messages
      await supabase.from("sms_messages").insert({
        persona: personaKey,
        message_body: briefing,
        message_summary: summary,
        twilio_sid: sid,
        status: "sent",
        trigger_type: "scheduled",
        pipeline_snapshot: data,
      });

      // Update sms_settings
      await supabase
        .from("sms_settings")
        .update({
          last_sent_at: new Date().toISOString(),
          next_send_at: computeNextSend(personaKey),
        })
        .eq("persona", personaKey);

      results.push({ persona: personaKey, success: true, sid });
    } catch (err: any) {
      console.error(`${persona.name} error:`, err.message);

      // Log failed message
      await supabase.from("sms_messages").insert({
        persona: personaKey,
        message_body: `[FAILED] ${err.message}`,
        status: "failed",
        trigger_type: "scheduled",
      });

      results.push({ persona: personaKey, success: false, error: err.message });
    }
  }

  return Response.json({ results, timestamp: now.toISOString() });
};
