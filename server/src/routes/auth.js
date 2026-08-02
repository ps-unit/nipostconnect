// server/src/routes/auth.js — v4 (adds 2FA check during login)
const express = require("express");
const bcrypt  = require("bcryptjs");
const jwt     = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");
const { verifyToken, verifyBackupCode } = require("../utils/twofa");

const router  = express.Router();
const prisma  = new PrismaClient();
const ALLOWED = process.env.ALLOWED_EMAIL_DOMAIN || "nglosa.com";

const generateTokens = (userId, role) => ({
  accessToken:  jwt.sign({ userId, role }, process.env.JWT_SECRET,         { expiresIn: process.env.JWT_EXPIRES_IN         || "15m" }),
  refreshToken: jwt.sign({ userId },       process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d"  }),
});

const safeUser = u => ({
  id: u.id, name: u.name, staffId: u.staffId, email: u.email,
  role: u.role, status: u.status, state: u.state, department: u.department,
  postOffice: u.postOffice, avatar: u.avatar, createdAt: u.createdAt,
  twoFAEnabled: u.twoFA?.isEnabled || false,
});

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post("/register", [
  body("name").trim().isLength({ min:2, max:100 }),
  body("staffId").trim().notEmpty(),
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min:8 }),
  body("phone").optional().isMobilePhone(),
  body("stateId").optional().isUUID(),
  body("departmentId").optional().isUUID(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { name, staffId, email, password, phone, stateId, departmentId, postOffice } = req.body;
    if (email.split("@")[1] !== ALLOWED) return res.status(400).json({ error: `Only @${ALLOWED} emails allowed` });

    const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { staffId }] } });
    if (existing) return res.status(409).json({ error: `${existing.email === email ? "Email" : "Staff ID"} already registered` });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: { name, staffId, email, passwordHash, phone: phone||null, postOffice: postOffice||null,
          stateId: stateId||null, departmentId: departmentId||null, status: "PENDING_VERIFICATION", role: "STAFF" },
        include: { state: true, department: true, twoFA: true },
      });
      const gen = await tx.channel.findFirst({ where: { type: "ANNOUNCEMENT" } });
      if (gen) await tx.channelMember.create({ data: { userId: u.id, channelId: gen.id } });
      if (stateId) {
        const sc = await tx.channel.findFirst({ where: { type: "STATE", stateId } });
        if (sc) await tx.channelMember.create({ data: { userId: u.id, channelId: sc.id } });
      }
      if (departmentId) {
        const dc = await tx.channel.findFirst({ where: { type: "DEPARTMENT", departmentId } });
        if (dc) await tx.channelMember.create({ data: { userId: u.id, channelId: dc.id } });
      }
      return u;
    });

    const tokens = generateTokens(user.id, user.role);
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: tokens.refreshToken } });
    res.status(201).json({ message: "Registration successful", user: safeUser(user), ...tokens });
  } catch (err) { next(err); }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post("/login", [
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { email, password, totpToken, backupCode } = req.body;
    const user = await prisma.user.findUnique({
      where: { email },
      include: { state: true, department: true, twoFA: true },
    });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const validPw = await bcrypt.compare(password, user.passwordHash);
    if (!validPw) return res.status(401).json({ error: "Invalid credentials" });
    if (user.status === "SUSPENDED") return res.status(403).json({ error: "Account suspended. Contact HR." });

    // ── 2FA Check ──────────────────────────────────────────────────────────
    if (user.twoFA?.isEnabled) {
      if (!totpToken && !backupCode) {
        // Tell client 2FA is required — don't issue tokens yet
        return res.status(200).json({ requires2FA: true, userId: user.id });
      }
      if (totpToken) {
        const valid = verifyToken(totpToken, user.twoFA.secret);
        if (!valid) return res.status(401).json({ error: "Invalid 2FA code", requires2FA: true });
      } else if (backupCode) {
        const { valid, remaining } = await verifyBackupCode(backupCode, user.twoFA.backupCodes);
        if (!valid) return res.status(401).json({ error: "Invalid backup code", requires2FA: true });
        await prisma.userTwoFA.update({ where: { userId: user.id }, data: { backupCodes: remaining } });
      }
    }
    // ── Issue tokens ────────────────────────────────────────────────────────
    const tokens = generateTokens(user.id, user.role);
    await prisma.user.update({ where: { id: user.id },
      data: { refreshToken: tokens.refreshToken, lastSeenAt: new Date() } });
    res.json({ user: safeUser(user), ...tokens });
  } catch (err) { next(err); }
});

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
router.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: "Refresh token required" });
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || user.refreshToken !== refreshToken) return res.status(401).json({ error: "Invalid refresh token" });
    const tokens = generateTokens(user.id, user.role);
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: tokens.refreshToken } });
    res.json(tokens);
  } catch (err) {
    if (err.name === "TokenExpiredError") return res.status(401).json({ error: "Session expired" });
    next(err);
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post("/logout", authenticate, async (req, res, next) => {
  try {
    await prisma.user.update({ where: { id: req.user.id }, data: { refreshToken: null } });
    res.json({ message: "Logged out" });
  } catch (err) { next(err); }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get("/me", authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { state: true, department: true, twoFA: { select: { isEnabled: true } } },
    });
    res.json({ user: safeUser(user) });
  } catch (err) { next(err); }
});

// ── POST /api/auth/change-password ───────────────────────────────────────────
router.post("/change-password", authenticate, [
  body("currentPassword").notEmpty(),
  body("newPassword").isLength({ min:8 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const valid = await bcrypt.compare(req.body.currentPassword, user.passwordHash);
    if (!valid) return res.status(400).json({ error: "Current password is incorrect" });
    const passwordHash = await bcrypt.hash(req.body.newPassword, 12);
    await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash } });
    res.json({ message: "Password changed successfully" });
  } catch (err) { next(err); }
});

module.exports = router;
