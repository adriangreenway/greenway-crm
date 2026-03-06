// Shared formatting utilities for form inputs

// Format phone as (XXX) XXX-XXXX as user types. Max 10 digits.
export const formatPhone = (value) => {
  const digits = (value || "").replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

// Format currency on blur: "$14,375". No decimals.
export const formatCurrency = (value) => {
  const str = String(value || "").replace(/\D/g, "");
  if (str === "") return "";
  const num = parseInt(str, 10);
  return `$${num.toLocaleString()}`;
};

// Parse formatted currency to integer: "$14,375" → 14375
export const parseCurrency = (formatted) => {
  const str = String(formatted || "").replace(/\D/g, "");
  if (str === "") return 0;
  return parseInt(str, 10);
};

// Format guest count on blur: 1000+ gets commas, e.g. "1,500"
export const formatGuestCount = (value) => {
  const str = String(value || "").replace(/\D/g, "");
  if (str === "") return "";
  const num = parseInt(str, 10);
  return num.toLocaleString();
};
