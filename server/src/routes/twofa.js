// server/src/routes/twofa.js — Phase 4
const express = require("express");
const { body, validationResult } = require("express-validator");
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");
const { generateSecret, verifyToken, generateBackupCodes, verifyBackupCode, isEnforced } = require("../utils/twofa");

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/2fa/status — get current 2FA status for logged-in user
router.get("/status", authenticate, async (req, res, next) => {
  try {
    const twoFA = await prisma.userTwoFA.findUnique({ where: { userId: req.user.id } });
    res.json({
      isEnabled:  twoFA?.isEnabled || false,
      isEnforced: isEnforced(req.user.role),
      backupCodesCount: twoFA?.backupCodes?.length || 0,
      enabledAt: twoFA?.enabledAt || null,
    });
  } catch (err) { next(err); }
});

// POST /api/2fa/setup — generate secret + QR code (user hasn't enabled yet)
router.post("/setup", authenticate, async (req, res, next) => {
  try {
    const existing = await prisma.userTwoFA.findUnique({ where: { userId: req.user.id } });
    if (existing?.isEnabled) return res.status(400).json({ error: "2FA already enabled. Disable first." });

    const { secret, qrDataUrl, otpAuthUrl } = await generateSecret(req.user.email);

    // Store secret (not yet enabled — must verify first)
    await prisma.userTwoFA.upsert({
      where: { userId: req.user.id },
      update: { secret, isEnabled: false },
      create: { userId: req.user.id, secret, isEnabled: false, backupCodes: [] },
    });

    res.json({ secret, qrDataUrl, otpAuthUrl,
      message: "Scan the QR code with Google Authenticator or Authy, then call /verify to enable." });
  } catch (err) { next(err); }
});

// POST /api/2fa/verify — confirm TOTP code and enable 2FA
router.post("/verify", authenticate, [
  body("token").trim().isLength({ min: 6, max: 8 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const record = await prisma.userTwoFA.findUnique({ where: { userId: req.user.id } });
    if (!record) return res.status(400).json({ error: "Run /setup first" });

    const valid = verifyToken(req.body.token, record.secret);
    if (!valid) return res.status(400).json({ error: "Invalid code. Please try again." });

    const { raw, hashed } = await generateBackupCodes();

    await prisma.userTwoFA.update({
      where: { userId: req.user.id },
      data: { isEnabled: true, enabledAt: new Date(), backupCodes: hashed },
    });

    await prisma.auditLog.create({
      data: { adminId: req.user.id, action: "TWO_FA_ENABLED", target: req.user.id },
    });

    res.json({
      message: "2FA enabled successfully",
      backupCodes: raw,
      warning: "Save these backup codes securely. Each can only be used once.",
    });
  } catch (err) { next(err); }
});

// POST /api/2fa/disable
router.post("/disable", authenticate, [
  body("token").trim().notEmpty(),
], async (req, res, next) => {
  try {
    const record = await prisma.userTwoFA.findUnique({ where: { userId: req.user.id } });
    if (!record?.isEnabled) return res.status(400).json({ error: "2FA is not enabled" });

    if (isEnforced(req.user.role)) {
      return res.status(403).json({ error: "2FA is mandatory for your role and cannot be disabled" });
    }

    const valid = verifyToken(req.body.token, record.secret);
    if (!valid) return res.status(400).json({ error: "Invalid TOTP code" });

    await prisma.userTwoFA.update({
      where: { userId: req.user.id },
      data: { isEnabled: false, enabledAt: null, backupCodes: [] },
    });

    await prisma.auditLog.create({
      data: { adminId: req.user.id, action: "TWO_FA_DISABLED", target: req.user.id },
    });

    res.json({ message: "2FA disabled" });
  } catch (err) { next(err); }
});

// POST /api/2fa/regenerate-backup-codes
router.post("/regenerate-backup-codes", authenticate, [
  body("token").trim().isLength({ min: 6, max: 8 }),
], async (req, res, next) => {
  try {
    const record = await prisma.userTwoFA.findUnique({ where: { userId: req.user.id } });
    if (!record?.isEnabled) return res.status(400).json({ error: "2FA not enabled" });

    const valid = verifyToken(req.body.token, record.secret);
    if (!valid) return res.status(400).json({ error: "Invalid code" });

    const { raw, hashed } = await generateBackupCodes();
    await prisma.userTwoFA.update({ where: { userId: req.user.id }, data: { backupCodes: hashed } });

    res.json({ backupCodes: raw, message: "New backup codes generated. Old codes are now invalid." });
  } catch (err) { next(err); }
});

// Admin: force-reset 2FA for a user
router.post("/admin/reset/:userId", authenticate, async (req, res, next) => {
  try {
    if (!["SUPER_ADMIN","STATE_ADMIN"].includes(req.user.role)) {
      return res.status(403).json({ error: "Admin only" });
    }
    await prisma.userTwoFA.deleteMany({ where: { userId: req.params.userId } });
    await prisma.auditLog.create({
      data: { adminId: req.user.id, action: "TWO_FA_RESET", target: req.params.userId },
    });
    res.json({ message: "2FA reset for user. They must re-setup on next login." });
  } catch (err) { next(err); }
});

module.exports = router;
