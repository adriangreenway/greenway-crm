// Lead Scoring — deterministic weighted algorithm
// No AI, no randomness. Same inputs always produce the same score.
// Range: 0 to 100, stored as integer.

import { COLORS } from "../tokens";

// ── Score weights ──
export const SCORE_WEIGHTS = {
  stage: 25,
  eventDate: 10,
  venue: 10,
  source: 15,
  config: 5,
  price: 5,
  guestCount: 10,
  planner: 5,
  budget: 5,
  recency: 10,
};

// Stage point values
const STAGE_SCORES = {
  "New Lead": 5,
  "Proposal Sent": 10,
  "Consultation Scheduled": 15,
  "Post Consultation": 20,
  "Contract Sent": 25,
  "Booked": 25,
  "Fulfilled": 25,
  "Lost": 0,
};

// Source quality rankings
const SOURCE_SCORES = {
  GCE: 15,
  Planner: 13,
  Referral: 11,
  Direct: 9,
  Website: 7,
  Instagram: 5,
};

/**
 * Calculate a deterministic lead score from 0 to 100.
 * Pure function. No side effects. No API calls.
 */
export function calculateLeadScore(lead) {
  if (!lead) return 0;

  // Lost leads always score 0
  if (lead.stage === "Lost") return 0;

  let score = 0;

  // Stage progression (max 25)
  score += STAGE_SCORES[lead.stage] ?? 0;

  // Has event date (max 10)
  if (lead.event_date) score += 10;

  // Has venue (max 10)
  if (lead.venue && lead.venue.trim()) score += 10;

  // Source quality (max 15)
  score += SOURCE_SCORES[lead.source] ?? 3;

  // Has config selected (max 5)
  if (lead.config && lead.config.trim()) score += 5;

  // Has price set (max 5)
  if (lead.price && Number(lead.price) > 0) score += 5;

  // Guest count signal (max 10)
  const guests = lead.guest_count ? Number(lead.guest_count) : 0;
  if (guests >= 200) score += 10;
  else if (guests >= 150) score += 8;
  else if (guests >= 100) score += 6;
  else if (guests >= 50) score += 4;
  else if (guests >= 1) score += 2;

  // Has planner (max 5)
  if (lead.planner_name && lead.planner_name.trim()) score += 5;

  // Budget stated (max 5)
  if (lead.budget_stated && lead.budget_stated.trim()) score += 5;

  // Recency (max 10)
  if (lead.created_at) {
    const now = new Date();
    const created = new Date(lead.created_at);
    const daysSinceCreated = Math.floor((now - created) / (1000 * 60 * 60 * 24));
    if (daysSinceCreated <= 7) score += 10;
    else if (daysSinceCreated <= 14) score += 8;
    else if (daysSinceCreated <= 30) score += 6;
    else if (daysSinceCreated <= 60) score += 4;
    else if (daysSinceCreated <= 90) score += 2;
  }

  // Clamp to 0 to 100
  return Math.max(0, Math.min(100, score));
}

/**
 * Get display properties for a score value.
 * Returns { label, color, bg } using design tokens.
 */
export function getScoreDisplay(score) {
  if (score >= 80) return { label: "Hot", color: COLORS.red, bg: COLORS.redLight };
  if (score >= 60) return { label: "Warm", color: COLORS.amber, bg: COLORS.amberLight };
  if (score >= 40) return { label: "Moderate", color: COLORS.blue, bg: COLORS.blueLight };
  if (score >= 20) return { label: "Cool", color: COLORS.textLight, bg: COLORS.bg };
  return { label: "Cold", color: COLORS.textLight, bg: COLORS.bg };
}
