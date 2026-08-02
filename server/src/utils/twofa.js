// server/src/utils/twofa.js — Phase 4: TOTP (Google Authenticator compatible)
const speakeasy = require("speakeasy");
const QRCode    = require("qrcode");
const bcrypt    = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

const ISSUER = process.env.TWO_FA_ISSUER || "NiPOST Connect";

/**
 * Generate a new TOTP secret + QR code data URL
 */
const generateSecret = async (email) => {
  const secret = speakeasy.generateSecret({
    name: `${ISSUER} (${email})`,
    issuer: ISSUER,
    length: 20,
  });

  const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);
  return { secret: secret.base32, qrDataUrl, otpAuthUrl: secret.otpauth_url };
};

/**
 * Verify a TOTP token against a secret
 */
const verifyToken = (token, secret) => {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token: token.replace(/\s/g, ""),
    window: 1, // allow 30s clock drift
  });
};

/**
 * Generate 10 one-time backup codes
 */
const generateBackupCodes = async () => {
  const raw = Array.from({ length: 10 }, () =>
    uuidv4().replace(/-/g, "").slice(0, 8).toUpperCase()
  );
  const hashed = await Promise.all(raw.map(c => bcrypt.hash(c, 10)));
  return { raw, hashed };
};

/**
 * Verify a backup code against stored hashed codes
 * Returns remaining codes if valid
 */
const verifyBackupCode = async (inputCode, hashedCodes) => {
  const upper = inputCode.replace(/\s/g, "").toUpperCase();
  for (let i = 0; i < hashedCodes.length; i++) {
    const match = await bcrypt.compare(upper, hashedCodes[i]);
    if (match) {
      const remaining = hashedCodes.filter((_, j) => j !== i);
      return { valid: true, remaining };
    }
  }
  return { valid: false, remaining: hashedCodes };
};

/**
 * Roles that require enforced 2FA (from env)
 */
const getEnforcedRoles = () => {
  const raw = process.env.TWO_FA_ENFORCE_ROLES || "";
  return raw.split(",").map(r => r.trim()).filter(Boolean);
};

const isEnforced = (role) => getEnforcedRoles().includes(role);

module.exports = { generateSecret, verifyToken, generateBackupCodes, verifyBackupCode, isEnforced };
