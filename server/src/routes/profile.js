// server/src/routes/profile.js — Phase 5
// Extended user profile and settings management
const express = require("express");
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");
const { v4: uuidv4 } = require("uuid");
const { body, validationResult } = require("express-validator");
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");

const router  = express.Router();
const prisma  = new PrismaClient();

// Avatar upload
const AVATAR_DIR = path.join(__dirname, "../../../uploads/avatars");
fs.mkdirSync(AVATAR_DIR, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AVATAR_DIR),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar-${req.user.id}-${uuidv4().slice(0,8)}${ext}`);
  },
});
const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB max avatar
  fileFilter: (req, file, cb) => {
    if (["image/jpeg","image/png","image/webp"].includes(file.mimetype))
      cb(null, true);
    else cb(new Error("Only JPG, PNG or WEBP images allowed"), false);
  },
});

// ── GET /api/profile/settings ─────────────────────────────────────────────────
router.get("/settings", authenticate, async (req, res, next) => {
  try {
    const settings = await prisma.userSettings.findUnique({
      where: { userId: req.user.id },
    });
    // Return defaults if no settings record yet
    res.json({ settings: settings || {
      userId: req.user.id,
      pushEnabled: true, emailNotifications: false, mutedChannels: [],
      mentionOnly: false, theme: "dark", messageGrouping: true,
      compactMode: false, showLastSeen: true, showOnlineStatus: true,
    }});
  } catch (err) { next(err); }
});

// ── PATCH /api/profile/settings ───────────────────────────────────────────────
router.patch("/settings", authenticate, [
  body("pushEnabled").optional().isBoolean(),
  body("emailNotifications").optional().isBoolean(),
  body("mentionOnly").optional().isBoolean(),
  body("theme").optional().isIn(["dark","light"]),
  body("messageGrouping").optional().isBoolean(),
  body("compactMode").optional().isBoolean(),
  body("showLastSeen").optional().isBoolean(),
  body("showOnlineStatus").optional().isBoolean(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const {
      pushEnabled, emailNotifications, mentionOnly, theme,
      messageGrouping, compactMode, showLastSeen, showOnlineStatus,
    } = req.body;

    const settings = await prisma.userSettings.upsert({
      where: { userId: req.user.id },
      update: {
        ...(pushEnabled          !== undefined && { pushEnabled: !!pushEnabled }),
        ...(emailNotifications   !== undefined && { emailNotifications: !!emailNotifications }),
        ...(mentionOnly          !== undefined && { mentionOnly: !!mentionOnly }),
        ...(theme                !== undefined && { theme }),
        ...(messageGrouping      !== undefined && { messageGrouping: !!messageGrouping }),
        ...(compactMode          !== undefined && { compactMode: !!compactMode }),
        ...(showLastSeen         !== undefined && { showLastSeen: !!showLastSeen }),
        ...(showOnlineStatus     !== undefined && { showOnlineStatus: !!showOnlineStatus }),
      },
      create: {
        userId: req.user.id,
        ...(pushEnabled          !== undefined && { pushEnabled: !!pushEnabled }),
        ...(emailNotifications   !== undefined && { emailNotifications: !!emailNotifications }),
        ...(mentionOnly          !== undefined && { mentionOnly: !!mentionOnly }),
        ...(theme                && { theme }),
        ...(messageGrouping      !== undefined && { messageGrouping: !!messageGrouping }),
        ...(compactMode          !== undefined && { compactMode: !!compactMode }),
        ...(showLastSeen         !== undefined && { showLastSeen: !!showLastSeen }),
        ...(showOnlineStatus     !== undefined && { showOnlineStatus: !!showOnlineStatus }),
      },
    });
    res.json({ settings });
  } catch (err) { next(err); }
});

// ── POST /api/profile/avatar — upload profile picture ────────────────────────
router.post("/avatar", authenticate,
  avatarUpload.single("avatar"),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const base     = process.env.SERVER_URL || `${req.protocol}://${req.get("host")}`;
      const avatarUrl = `${base}/uploads/avatars/${req.file.filename}`;

      // Delete old avatar
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (user.avatarUrl) {
        const old = path.join(AVATAR_DIR, path.basename(user.avatarUrl));
        fs.unlink(old, () => {});
      }

      const updated = await prisma.user.update({
        where: { id: req.user.id },
        data: { avatarUrl },
        include: { state: true, department: true },
      });

      // Broadcast to connected sockets so avatar updates live
      req.app.get("io")?.emit("user:avatar:updated", { userId: req.user.id, avatarUrl });

      res.json({ avatarUrl, user: updated });
    } catch (err) { next(err); }
  }
);

// ── DELETE /api/profile/avatar — remove avatar ────────────────────────────────
router.delete("/avatar", authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (user.avatarUrl) {
      const old = path.join(AVATAR_DIR, path.basename(user.avatarUrl));
      fs.unlink(old, () => {});
    }
    await prisma.user.update({ where: { id: req.user.id }, data: { avatarUrl: null } });
    res.json({ message: "Avatar removed" });
  } catch (err) { next(err); }
});

// ── PATCH /api/profile/mute-channel — toggle channel mute ────────────────────
router.patch("/mute-channel", authenticate, [
  body("channelId").isUUID(),
  body("muted").isBoolean(),
], async (req, res, next) => {
  try {
    const { channelId, muted } = req.body;
    await prisma.channelMember.updateMany({
      where: { userId: req.user.id, channelId },
      data: { isMuted: !!muted },
    });
    // Also update UserSettings.mutedChannels
    const settings = await prisma.userSettings.findUnique({ where: { userId: req.user.id } });
    const currentMuted = settings?.mutedChannels || [];
    const newMuted = muted
      ? [...new Set([...currentMuted, channelId])]
      : currentMuted.filter(id => id !== channelId);
    await prisma.userSettings.upsert({
      where: { userId: req.user.id },
      update: { mutedChannels: newMuted },
      create: { userId: req.user.id, mutedChannels: newMuted },
    });
    res.json({ message: muted ? "Channel muted" : "Channel unmuted", mutedChannels: newMuted });
  } catch (err) { next(err); }
});

module.exports = router;
