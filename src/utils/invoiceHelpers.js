// Invoice helper utilities for the invoice/payment system

// Fee calculation (Option C — fees baked into pricing)
// Card fee: amount * 0.029 + 0.30
// ACH fee: Math.min(amount * 0.008, 5.00)
// Zelle fee: 0
// ACH savings: card fee - ACH fee
// Zelle savings: card fee
export function calculateFees(amount) {
  const cardFee = Math.round((amount * 0.029 + 0.30) * 100) / 100;
  const achFee = Math.round(Math.min(amount * 0.008, 5.00) * 100) / 100;
  const zelleFee = 0;
  return {
    card: { fee: cardFee, savings: 0 },
    ach: { fee: achFee, savings: Math.round((cardFee - achFee) * 100) / 100 },
    zelle: { fee: zelleFee, savings: Math.round(cardFee * 100) / 100 },
  };
}

// Format currency for display: $12,500
export function formatInvoiceCurrency(dollars) {
  if (!dollars && dollars !== 0) return "";
  return `$${Number(dollars).toLocaleString()}`;
}

// Format currency with cents: $12,500.00
export function formatInvoiceCurrencyFull(dollars) {
  if (!dollars && dollars !== 0) return "";
  return `$${Number(dollars).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Format date: "March 10, 2026"
export function formatInvoiceDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr.includes("T") ? dateStr : dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } catch { return dateStr; }
}

// Get status badge color/bg (matches ContractCard pattern using COLORS tokens for admin UI)
export function getInvoiceStatusBadge(status) {
  const map = {
    draft: { label: "Draft", color: "#6B6560", bg: "#F0EDE8" },
    sent: { label: "Sent", color: "#1A5FB4", bg: "#E8F0FE" },
    viewed: { label: "Viewed", color: "#D4850A", bg: "#FEF3D6" },
    paid: { label: "Paid", color: "#2D6A4F", bg: "#D4E7DC" },
    failed: { label: "Failed", color: "#C1292E", bg: "#FDEAEA" },
    overdue: { label: "Overdue", color: "#C1292E", bg: "#FDEAEA" },
    refunded: { label: "Refunded", color: "#6B6560", bg: "#F0EDE8" },
  };
  return map[status] || map.draft;
}
