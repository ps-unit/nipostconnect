// server/src/routes/passwordreset.js — Phase 6
const express = require("express");
const crypto  = require("crypto");
const bcrypt  = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const { PrismaClient } = require("@prisma/client");
const { sendPasswordReset } = require("../utils/email");

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/auth/forgot-password
router.post("/forgot-password", [
  body("email").isEmail().normalizeEmail(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    // Always return 200 to prevent email enumeration
    const user = await prisma.user.findUnique({ where: { email: req.body.email } });
    if (!user) return res.json({ message: "If that email exists, a reset link has been sent." });

    // Generate a secure token (32 bytes hex = 64 chars)
    const resetToken  = crypto.randomBytes(32).toString("hex");
    const resetExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Store hashed token
    const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
    await prisma.passwordResetToken.upsert({
      where: { userId: user.id },
      update: { tokenHash, expiresAt: resetExpiry },
      create: { userId: user.id, tokenHash, expiresAt: resetExpiry },
    });

    await sendPasswordReset({ name: user.name, email: user.email, resetToken });

    res.json({ message: "If that email exists, a reset link has been sent." });
  } catch (err) { next(err); }
});

// POST /api/auth/reset-password
router.post("/reset-password", [
  body("token").trim().isLength({ min: 64, max: 64 }),
  body("newPassword").isLength({ min: 8 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { token, newPassword } = req.body;
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const record = await prisma.passwordResetToken.findFirst({
      where: { tokenHash, expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    if (!record) {
      return res.status(400).json({ error: "Invalid or expired reset link. Please request a new one." });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash, refreshToken: null }, // invalidate all sessions
      }),
      prisma.passwordResetToken.delete({ where: { id: record.id } }),
    ]);

    res.json({ message: "Password reset successfully. You can now log in with your new password." });
  } catch (err) { next(err); }
});

// GET /api/auth/verify-reset-token?token=...
router.get("/verify-reset-token", async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token || token.length !== 64) return res.json({ valid: false });

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const record = await prisma.passwordResetToken.findFirst({
      where: { tokenHash, expiresAt: { gt: new Date() } },
    });

    res.json({ valid: !!record, expiresAt: record?.expiresAt });
  } catch (err) { next(err); }
});

module.exports = router;
