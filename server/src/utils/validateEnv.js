// server/src/utils/validateEnv.js — Phase 6
// Validates required environment variables on startup

const REQUIRED = [
  "DATABASE_URL",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
];

const RECOMMENDED = [
  { key:"VAPID_PUBLIC_KEY",  feature:"Push notifications" },
  { key:"VAPID_PRIVATE_KEY", feature:"Push notifications" },
  { key:"SMTP_HOST",         feature:"Email (password reset, welcome)" },
  { key:"SMTP_USER",         feature:"Email" },
  { key:"SMTP_PASS",         feature:"Email" },
  { key:"TERMII_API_KEY",    feature:"SMS fallback" },
  { key:"ANTHROPIC_API_KEY", feature:"AI memo drafting" },
  { key:"SENTRY_DSN",        feature:"Error monitoring" },
];

function validateEnv() {
  const missing = REQUIRED.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.error("\n❌ FATAL: Missing required environment variables:");
    missing.forEach(k => console.error(`   → ${k}`));
    console.error("\nCopy .env.example to server/.env and fill in the values.\n");
    process.exit(1);
  }

  // Warn about weak secrets
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn("⚠️  JWT_SECRET is too short. Use at least 64 random characters in production.");
  }
  const looksLikePlaceholder = (v) => !v || /change_in_production|^<.*>$/i.test(v);
  if (process.env.NODE_ENV === "production" &&
      (looksLikePlaceholder(process.env.JWT_SECRET) || looksLikePlaceholder(process.env.JWT_REFRESH_SECRET))) {
    console.error("❌ FATAL: JWT_SECRET / JWT_REFRESH_SECRET look like placeholder values in production. Set strong random secrets.");
    process.exit(1);
  }

  // Log optional feature status
  console.log("\n🟡 NiPOST Connect — Environment Check");
  console.log("   Node.js :", process.version);
  console.log("   Mode    :", process.env.NODE_ENV || "development");
  RECOMMENDED.forEach(({ key, feature }) => {
    const status = process.env[key] ? "✅" : "⚠️  Not configured";
    console.log(`   ${feature.padEnd(28)}: ${status}`);
  });
  console.log();
}

module.exports = { validateEnv };
