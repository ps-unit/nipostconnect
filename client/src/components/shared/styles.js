// src/components/shared/styles.js

export const colors = {
  bg:         "#081832",
  surface:    "#081A35",
  surfaceAlt: "#0D2244",
  border:     "#1E3A5F",
  borderDim:  "#0D2244",
  gold:       "#D4A843",
  goldDim:    "rgba(212,168,67,0.15)",
  text:       "#E8EDF5",
  textMid:    "#B0BDD0",
  muted:      "#6B8299",
  mutedDim:   "#4B6280",
  ghost:      "#2E4A6B",
  online:     "#22C55E",
  idle:       "#F59E0B",
  offline:    "#4B6280",
  danger:     "#EF4444",
  dangerDim:  "rgba(239,68,68,0.12)",
  success:    "#22C55E",
  successDim: "rgba(34,197,94,0.1)",
  info:       "#2563EB",
  infoDim:    "rgba(37,99,235,0.12)",
  purple:     "#7C3AED",
  purpleDim:  "rgba(124,58,237,0.12)",
};

export const s = {
  // ── Auth pages ──────────────────────────────────────────────────────────────
  authPage: {
    minHeight: "100dvh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: colors.bg,
    padding: "16px 12px",
    fontFamily: "'DM Sans', sans-serif",
    boxSizing: "border-box",
  },
  authCard: {
    width: "100%",
    maxWidth: 440,
    background: colors.surfaceAlt,
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    padding: "clamp(20px, 5vw, 32px)",
    boxSizing: "border-box",
  },

  // ── Form elements ────────────────────────────────────────────────────────────
  label: {
    display: "block",
    color: colors.muted,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.06em",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: `1px solid ${colors.border}`,
    background: "#081832",
    color: colors.text,
    fontSize: 14,
    marginBottom: 16,
    boxSizing: "border-box",
    fontFamily: "'DM Sans', sans-serif",
    outline: "none",
    transition: "border-color 0.15s",
  },

  // ── Buttons ──────────────────────────────────────────────────────────────────
  primaryButton: {
    padding: "11px 20px",
    borderRadius: 8,
    border: "none",
    background: colors.gold,
    color: "#0A1F44",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    transition: "opacity 0.15s",
  },
  secondaryButton: {
    padding: "11px 20px",
    borderRadius: 8,
    border: `1px solid ${colors.border}`,
    background: "none",
    color: colors.muted,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  dangerButton: {
    padding: "8px 16px",
    borderRadius: 8,
    border: "none",
    background: colors.dangerDim,
    color: "#F87171",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  ghostButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    color: colors.muted,
  },

  // ── Banners ──────────────────────────────────────────────────────────────────
  errorBanner: {
    background: colors.dangerDim,
    border: `1px solid rgba(239,68,68,0.2)`,
    borderRadius: 8,
    padding: "10px 14px",
    color: "#F87171",
    fontSize: 13,
    marginBottom: 16,
  },
  successBanner: {
    background: colors.successDim,
    border: `1px solid rgba(34,197,94,0.2)`,
    borderRadius: 8,
    padding: "10px 14px",
    color: "#86EFAC",
    fontSize: 13,
    marginBottom: 16,
  },
  infoBanner: {
    background: colors.goldDim,
    border: `1px solid rgba(212,168,67,0.2)`,
    borderRadius: 8,
    padding: "10px 14px",
    color: "#E8C96B",
    fontSize: 13,
    marginBottom: 16,
  },

  // ── Cards ────────────────────────────────────────────────────────────────────
  card: {
    background: colors.surfaceAlt,
    border: `1px solid ${colors.border}`,
    borderRadius: 10,
    padding: 16,
  },

  // ── Modal overlay ─────────────────────────────────────────────────────────────
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.75)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "clamp(8px, 2vw, 16px)",
    boxSizing: "border-box",
  },
  modalCard: {
    background: colors.surfaceAlt,
    border: `1px solid ${colors.border}`,
    borderRadius: 14,
    padding: "clamp(16px, 4vw, 28px)",
    width: "100%",
    maxWidth: 560,
    maxHeight: "calc(100dvh - 32px)",
    overflowY: "auto",
    boxSizing: "border-box",
  },
};

// Role badge colours
export const ROLE_BADGE = {
  SUPER_ADMIN: { bg: "#D4A843", color: "#0A1F44", label: "Super Admin" },
  STATE_ADMIN:  { bg: "#2563EB", color: "#fff",    label: "State Admin" },
  DEPT_ADMIN:   { bg: "#7C3AED", color: "#fff",    label: "Dept Admin"  },
  STAFF:        null,
};

// Message type styling
export const MSG_TYPE_META = {
  ANNOUNCEMENT: { bar: "#D4A843", label: "ANNOUNCEMENT", icon: "📢" },
  MEMO:         { bar: "#7C3AED", label: "OFFICIAL MEMO", icon: "📄" },
  SUGGESTION:   { bar: "#22C55E", label: "SUGGESTION",    icon: "💡" },
  POLL:         { bar: "#2563EB", label: "POLL",           icon: "🗳️" },
  MESSAGE:      null,
  SYSTEM:       { bar: "#4B6280", label: "SYSTEM",        icon: "⚙️" },
};

// Channel type icons
export const CHANNEL_ICONS = {
  ANNOUNCEMENT: "📢",
  STATE:        "📍",
  POST_OFFICE:  "🏤",
  DEPARTMENT:   "🏢",
  SUGGESTION:   "💡",
  EMERGENCY:    "🚨",
  GENERAL:      "💬",
};
