// Contract helper utilities for the e-signature system

/**
 * Format a contract number (pass-through — already formatted as CON-YYYY-NNN)
 */
export function formatContractNumber(number) {
  return number;
}

/**
 * Get status badge styling for a contract status.
 * Returns { label, color, bgColor } using COLORS token keys.
 */
export function getContractStatusBadge(status) {
  const badges = {
    draft: { label: "Draft", color: "textLight", bgColor: "bg" },
    sent: { label: "Sent", color: "amber", bgColor: "amberLight" },
    viewed: { label: "Viewed", color: "amber", bgColor: "amberLight" },
    signed: { label: "Signed", color: "green", bgColor: "greenLight" },
    voided: { label: "Voided", color: "red", bgColor: "redLight" },
  };
  return badges[status] || badges.draft;
}

/**
 * Format ISO date string to full legal format: "March 15, 2026"
 */
export function formatContractDate(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Format integer dollars to "$14,375" (dollar sign, commas, no decimals)
 */
export function formatContractCurrency(amount) {
  if (amount == null) return "";
  return "$" + Number(amount).toLocaleString("en-US");
}

/**
 * Get the full public URL for a contract by slug.
 * Uses window.location.origin if available, falls back to SITE_URL env var.
 */
export function getContractUrl(slug) {
  const origin =
    typeof window !== "undefined" && window.location
      ? window.location.origin
      : import.meta.env?.VITE_SITE_URL || "https://greenway.netlify.app";
  return `${origin}/contract/${slug}`;
}

/**
 * Returns true if sentAt is more than 5 days ago (stale nudge).
 */
export function isContractStale(sentAt) {
  if (!sentAt) return false;
  return Date.now() - new Date(sentAt).getTime() > 5 * 24 * 60 * 60 * 1000;
}

/**
 * Returns the integer number of days since sentAt.
 */
export function getDaysSinceSent(sentAt) {
  if (!sentAt) return 0;
  return Math.floor(
    (Date.now() - new Date(sentAt).getTime()) / (24 * 60 * 60 * 1000)
  );
}

/**
 * Generate the next contract number in CON-YYYY-NNN format.
 * Filters existing contracts for the current year, finds max NNN, increments.
 */
export function generateContractNumber(existingContracts) {
  const year = new Date().getFullYear();
  const prefix = `CON-${year}-`;
  const currentYearNumbers = (existingContracts || [])
    .filter((c) => c.contract_number && c.contract_number.startsWith(prefix))
    .map((c) => parseInt(c.contract_number.replace(prefix, ""), 10))
    .filter((n) => !isNaN(n));

  const maxNum = currentYearNumbers.length > 0 ? Math.max(...currentYearNumbers) : 0;
  const next = String(maxNum + 1).padStart(3, "0");
  return `${prefix}${next}`;
}
