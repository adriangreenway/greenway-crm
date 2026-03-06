// Shared Claude API helper
// All AI features (Email Drafter, Cheat Sheet, Claude Clues, Gig Sheet timeline parser)
// call this single function.

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

// Base system prompt shared by all tools
export const BASE_SYSTEM_PROMPT = `You are drafting communication for Adrian Michael, founder of The Greenway Band, a premium live wedding entertainment company in Houston, TX.

Voice rules:
- Use contractions naturally
- Reference specific venues and dates when available
- No hyphens as dashes (use spaces: "10 piece" not "10-piece")
- No staccato fragments or ad copy
- No excessive exclamation points (one per email max, in the greeting)
- No "per our conversation" or corporate speak
- Sound like a real person who genuinely enjoys what he does
- Sign off: "Best," or "Thanks," then "Adrian"`;

export async function callClaude({ systemPrompt, userPrompt, apiKey, maxTokens = 1500 }) {
  if (!apiKey) {
    throw new Error("Claude API key not configured. Go to Settings to add your key.");
  }

  const response = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error?.error?.message || `API error: ${response.status}`
    );
  }

  const data = await response.json();
  return data.content?.[0]?.text || "";
}

// Helper to get the stored API key
export function getApiKey() {
  return localStorage.getItem("claude_api_key") || "";
}

// Helper to check if API key is configured
export function hasApiKey() {
  return !!localStorage.getItem("claude_api_key");
}
