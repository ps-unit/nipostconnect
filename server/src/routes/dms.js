// routes/dms.js
const express = require("express");
const { body, validationResult } = require("express-validator");
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// ── GET /api/dms/conversations ────────────────────────────────────────────────
router.get("/conversations", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get all unique conversation partners
    const sent = await prisma.directMessage.findMany({
      where: { senderId: userId, deletedAt: null },
      distinct: ["receiverId"],
      orderBy: { createdAt: "desc" },
      include: { receiver: { select: { id:true, name:true, avatar:true, role:true, lastSeenAt:true, state:{ select:{name:true} }, department:{ select:{name:true} } } } },
    });

    const received = await prisma.directMessage.findMany({
      where: { receiverId: userId, deletedAt: null },
      distinct: ["senderId"],
      orderBy: { createdAt: "desc" },
      include: { sender: { select: { id:true, name:true, avatar:true, role:true, lastSeenAt:true, state:{ select:{name:true} }, department:{ select:{name:true} } } } },
    });

    // Merge and deduplicate
    const partnerMap = {};
    sent.forEach(m => { partnerMap[m.receiverId] = m.receiver; });
    received.forEach(m => { if (!partnerMap[m.senderId]) partnerMap[m.senderId] = m.sender; });

    // Get unread counts
    const conversations = await Promise.all(
      Object.entries(partnerMap).map(async ([partnerId, partner]) => {
        const unreadCount = await prisma.directMessage.count({
          where: { senderId: partnerId, receiverId: userId, readAt: null },
        });
        const lastMessage = await prisma.directMessage.findFirst({
          where: {
            OR: [
              { senderId: userId, receiverId: partnerId },
              { senderId: partnerId, receiverId: userId },
            ],
            deletedAt: null,
          },
          orderBy: { createdAt: "desc" },
        });
        return { partner, unreadCount, lastMessage };
      })
    );

    conversations.sort((a, b) =>
      new Date(b.lastMessage?.createdAt || 0) - new Date(a.lastMessage?.createdAt || 0)
    );

    res.json({ conversations });
  } catch (err) { next(err); }
});

// ── GET /api/dms/:userId ──────────────────────────────────────────────────────
router.get("/:userId", authenticate, async (req, res, next) => {
  try {
    const currentUser = req.user.id;
    const partnerId = req.params.userId;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const before = req.query.before;

    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: currentUser, receiverId: partnerId },
          { senderId: partnerId, receiverId: currentUser },
        ],
        deletedAt: null,
        ...(before && { createdAt: { lt: new Date(before) } }),
      },
      include: {
        sender: { select: { id:true, name:true, avatar:true, role:true } },
        receiver: { select: { id:true, name:true, avatar:true, role:true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Mark received messages as read
    await prisma.directMessage.updateMany({
      where: { senderId: partnerId, receiverId: currentUser, readAt: null },
      data: { readAt: new Date() },
    });

    const io = req.app.get("io");
    io.to(`user:${partnerId}`).emit("dm:read", { readBy: currentUser });

    res.json({ messages: messages.reverse(), hasMore: messages.length === limit });
  } catch (err) { next(err); }
});

// ── POST /api/dms/:userId ─────────────────────────────────────────────────────
router.post("/:userId", authenticate, [
  body("content").trim().isLength({ min: 1, max: 5000 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const senderId = req.user.id;
    const receiverId = req.params.userId;

    if (senderId === receiverId) return res.status(400).json({ error: "Cannot message yourself" });

    const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
    if (!receiver) return res.status(404).json({ error: "User not found" });

    const dm = await prisma.directMessage.create({
      data: { content: req.body.content, senderId, receiverId },
      include: {
        sender: { select: { id:true, name:true, avatar:true, role:true } },
      },
    });

    const io = req.app.get("io");
    io.to(`user:${receiverId}`).emit("dm:new", dm);
    io.to(`user:${senderId}`).emit("dm:new", dm);

    res.status(201).json({ dm });
  } catch (err) { next(err); }
});

module.exports = router;
