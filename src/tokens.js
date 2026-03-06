// Design tokens — pulled directly from vision mockups
// These are the only colors, fonts, and spacing values allowed.

export const COLORS = {
  // Backgrounds
  white: "#FFFFFF",
  cream: "#F5F2ED",
  bg: "#FAFAF9",

  // Borders
  border: "#E8E5E0",
  borderLight: "#F0EDE8",

  // Text
  text: "#0A0A09",
  textMuted: "#6B6560",
  textLight: "#9E9891",

  // Brand
  black: "#0A0A09",
  charcoal: "#111110",

  // Status colors
  green: "#2D6A4F",
  greenLight: "#D4E7DC",
  greenBg: "#F0F7F2",
  red: "#C1292E",
  redLight: "#FDEAEA",
  amber: "#D4850A",
  amberLight: "#FEF3D6",
  blue: "#1A5FB4",
  blueLight: "#E8F0FE",

  // Brand accent (KC only)
  teal: "#2A6B6B",
  tealLight: "#E8F5F5",

  // Accent
  gold: "#D4A574",

  // Additional
  purple: "#7C3AED",
  purpleLight: "#F3ECFF",
};

export const FONTS = {
  display: "'Bodoni Moda', serif",
  body: "'Plus Jakarta Sans', sans-serif",
};

export const RADII = {
  sm: 8,
  md: 10,
  lg: 14,
  xl: 16,
  pill: 100,
};

export const SHADOWS = {
  sm: "0 1px 3px rgba(0,0,0,0.04)",
  md: "0 4px 12px rgba(0,0,0,0.04)",
  lg: "0 8px 24px rgba(0,0,0,0.06)",
  panel: "-8px 0 30px rgba(0,0,0,0.06)",
};

// Stage badge color map
export const STAGE_COLORS = {
  "New Lead": { color: COLORS.blue, bg: COLORS.blueLight },
  "Proposal Sent": { color: COLORS.amber, bg: COLORS.amberLight },
  "Consultation Scheduled": { color: COLORS.purple, bg: COLORS.purpleLight },
  "Post Consultation": { color: COLORS.amber, bg: COLORS.amberLight },
  "Contract Sent": { color: COLORS.amber, bg: COLORS.amberLight },
  "Booked": { color: COLORS.green, bg: COLORS.greenLight },
  "Fulfilled": { color: COLORS.textLight, bg: COLORS.bg },
  "Lost": { color: COLORS.red, bg: COLORS.redLight },
};

// Brand badge color map
export const BRAND_COLORS = {
  "Greenway": { color: COLORS.black, bg: COLORS.cream },
  "Kirby Collective": { color: COLORS.teal, bg: COLORS.tealLight },
};

// Pipeline stages in order
export const PIPELINE_STAGES = [
  "New Lead",
  "Proposal Sent",
  "Consultation Scheduled",
  "Post Consultation",
  "Contract Sent",
  "Booked",
  "Fulfilled",
  "Lost",
];

// Sources
export const SOURCES = ["GCE", "Direct", "Planner", "Website", "Instagram", "Referral"];

// Band configurations
export const CONFIGS = ["6 piece", "8 piece", "10 piece", "12 piece", "14 piece"];

// Global CSS (injected via style tag)
export const GLOBAL_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${COLORS.bg}; font-family: ${FONTS.body}; color: ${COLORS.text}; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 10px; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }

  @keyframes slideInLeft {
    from { transform: translateX(-100%); }
    to { transform: translateX(0); }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
