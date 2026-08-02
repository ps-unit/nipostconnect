// server/src/routes/notifications.js — Phase 2
const express = require("express");
const { body, validationResult } = require("express-validator");
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

router.get("/vapid-public-key", (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return res.status(503).json({ error: "Push notifications not configured" });
  res.json({ publicKey: key });
});

router.post("/subscribe", authenticate, [
  body("endpoint").notEmpty().isURL(),
  body("keys.p256dh").notEmpty(),
  body("keys.auth").notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
    const { endpoint, keys, userAgent } = req.body;
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh: keys.p256dh, auth: keys.auth, userAgent: userAgent || null },
      create: { userId: req.user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent: userAgent || null },
    });
    res.json({ message: "Subscribed" });
  } catch (err) { next(err); }
});

router.delete("/unsubscribe", authenticate, [body("endpoint").notEmpty()], async (req, res, next) => {
  try {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: req.body.endpoint, userId: req.user.id } });
    res.json({ message: "Unsubscribed" });
  } catch (err) { next(err); }
});

router.get("/", authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: "desc" }, skip, take: parseInt(limit) }),
      prisma.notification.count({ where: { userId: req.user.id, isRead: false } }),
    ]);
    res.json({ notifications, unreadCount });
  } catch (err) { next(err); }
});

router.patch("/read-all", authenticate, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user.id, isRead: false }, data: { isRead: true } });
    res.json({ message: "All marked as read" });
  } catch (err) { next(err); }
});

router.patch("/:id/read", authenticate, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({ where: { id: req.params.id, userId: req.user.id }, data: { isRead: true } });
    res.json({ message: "Marked as read" });
  } catch (err) { next(err); }
});

router.delete("/:id", authenticate, async (req, res, next) => {
  try {
    await prisma.notification.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
    res.json({ message: "Deleted" });
  } catch (err) { next(err); }
});

module.exports = router;
