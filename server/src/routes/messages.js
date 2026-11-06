// routes/messages.js
const express = require("express");
const { body, query, validationResult } = require("express-validator");
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");
const { requireChannelAccess, enforceReadOnly, isAdmin } = require("../middleware/rbac");

const router = express.Router();
const prisma = new PrismaClient();

const MESSAGE_INCLUDE = {
  author: { select: { id:true, name:true, staffId:true, role:true, avatar:true, avatarUrl:true, department:true, state:true } },
  attachments: true,
  reactions: {
    select: { id:true, emoji:true, userId:true, user:{ select:{ name:true } } },
  },
  replies: {
    take: 3,
    include: { author: { select: { id:true, name:true, avatar:true, avatarUrl:true } } },
    orderBy: { createdAt: "asc" },
  },
  poll: {
    include: {
      options: { include: { _count: { select: { votes: true } } }, orderBy: { order: "asc" } },
      _count: { select: { votes: true } },
    },
  },
  pinned: { select: { id:true, pinnedAt:true, pinnedBy: { select:{ name:true } } } },
  _count: { select: { replies: true, readReceipts: true } },
};

// ── GET /api/messages/:channelId ─────────────────────────────────────────────
router.get("/:channelId", authenticate,
  (req, res, next) => { req.params.channelId = req.params.channelId; next(); },
  requireChannelAccess(),
  async (req, res, next) => {
    try {
      const { channelId } = req.params;
      const limit    = Math.min(parseInt(req.query.limit)  || 50, 100);
      const before   = req.query.before; // cursor pagination (message id)
      const type     = req.query.type;   // filter by message type
      const parentId = req.query.parentId;

      const where = {
        channelId,
        deletedAt: null,
        parentId:  parentId || null,
        ...(before && { id: { lt: before } }),
        ...(type   && { type }),
      };

      const messages = await prisma.message.findMany({
        where,
        include: MESSAGE_INCLUDE,
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      // Mark read
      const unread = messages.filter(m => m.authorId !== req.user.id);
      if (unread.length > 0) {
        await prisma.readReceipt.createMany({
          data: unread.map(m => ({ messageId: m.id, userId: req.user.id })),
          skipDuplicates: true,
        });
        await prisma.channelMember.update({
          where: { userId_channelId: { userId: req.user.id, channelId } },
          data: { lastReadAt: new Date() },
        });
      }

      // Attach user's vote for polls
      const pollIds = messages.filter(m => m.poll).map(m => m.poll.id);
      const userVotes = pollIds.length > 0
        ? await prisma.pollVote.findMany({ where: { userId: req.user.id, pollId: { in: pollIds } } })
        : [];
      const voteMap = {};
      userVotes.forEach(v => { voteMap[v.pollId] = v.optionId; });

      const result = messages.reverse().map(m => ({
        ...m,
        poll: m.poll ? { ...m.poll, userVotedOptionId: voteMap[m.poll.id] || null } : null,
      }));

      res.json({ messages: result, hasMore: messages.length === limit });
    } catch (err) { next(err); }
  }
);

// ── GET /api/messages/:channelId/pinned ──────────────────────────────────────
router.get("/:channelId/pinned", authenticate, requireChannelAccess(), async (req, res, next) => {
  try {
    const pinned = await prisma.pinnedMessage.findMany({
      where: { channelId: req.params.channelId },
      include: { message: { include: MESSAGE_INCLUDE } },
      orderBy: { pinnedAt: "desc" },
    });
    res.json({ pinned });
  } catch (err) { next(err); }
});

// ── POST /api/messages/:channelId ────────────────────────────────────────────
router.post("/:channelId", authenticate,
  (req, res, next) => { req.body.channelId = req.params.channelId; next(); },
  requireChannelAccess(),
  enforceReadOnly,
  [
    body("content").trim().isLength({ min: 1, max: 5000 }),
    body("type").optional().isIn(["MESSAGE","ANNOUNCEMENT","MEMO","SUGGESTION"]),
    body("isAnonymous").optional().isBoolean(),
    body("memoRef").optional().trim(),
    body("memoTo").optional().trim(),
    body("parentId").optional().isUUID(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

      const { channelId } = req.params;
      const { content, type = "MESSAGE", isAnonymous, memoRef, memoTo, parentId } = req.body;

      // Only admins can post announcements and memos
      if (["ANNOUNCEMENT","MEMO"].includes(type) && !["SUPER_ADMIN","STATE_ADMIN","DEPT_ADMIN"].includes(req.user.role)) {
        return res.status(403).json({ error: "Only admins can post announcements and memos" });
      }

      const message = await prisma.message.create({
        data: {
          content, type,
          isAnonymous: isAnonymous ?? false,
          memoRef: memoRef || null,
          memoTo: memoTo || null,
          channelId,
          authorId: req.user.id,
          parentId: parentId || null,
        },
        include: MESSAGE_INCLUDE,
      });

      const io = req.app.get("io");
      io.to(`channel:${channelId}`).emit("message:new", message);

      res.status(201).json({ message });
    } catch (err) { next(err); }
  }
);

// ── PATCH /api/messages/:messageId — edit ────────────────────────────────────
router.patch("/:messageId", authenticate, [
  body("content").trim().isLength({ min: 1, max: 5000 }),
], async (req, res, next) => {
  try {
    const msg = await prisma.message.findUnique({ where: { id: req.params.messageId } });
    if (!msg || msg.deletedAt) return res.status(404).json({ error: "Message not found" });

    if (msg.authorId !== req.user.id) {
      return res.status(403).json({ error: "You can only edit your own messages" });
    }

    const updated = await prisma.message.update({
      where: { id: req.params.messageId },
      data: { content: req.body.content, editedAt: new Date() },
      include: MESSAGE_INCLUDE,
    });

    const io = req.app.get("io");
    io.to(`channel:${msg.channelId}`).emit("message:updated", updated);

    res.json({ message: updated });
  } catch (err) { next(err); }
});

// ── DELETE /api/messages/:messageId — soft delete ────────────────────────────
router.delete("/:messageId", authenticate, async (req, res, next) => {
  try {
    const msg = await prisma.message.findUnique({ where: { id: req.params.messageId } });
    if (!msg || msg.deletedAt) return res.status(404).json({ error: "Message not found" });

    const canDelete = msg.authorId === req.user.id ||
      ["SUPER_ADMIN","STATE_ADMIN","DEPT_ADMIN"].includes(req.user.role);
    if (!canDelete) return res.status(403).json({ error: "Cannot delete this message" });

    await prisma.message.update({
      where: { id: req.params.messageId },
      data: { deletedAt: new Date(), content: "[Message deleted]" },
    });

    const io = req.app.get("io");
    io.to(`channel:${msg.channelId}`).emit("message:deleted", { messageId: msg.id, channelId: msg.channelId });

    res.json({ message: "Deleted" });
  } catch (err) { next(err); }
});

// ── POST /api/messages/:messageId/pin ────────────────────────────────────────
router.post("/:messageId/pin", authenticate, isAdmin, async (req, res, next) => {
  try {
    const msg = await prisma.message.findUnique({ where: { id: req.params.messageId } });
    if (!msg) return res.status(404).json({ error: "Message not found" });

    const existing = await prisma.pinnedMessage.findUnique({ where: { messageId: msg.id } });
    if (existing) {
      await prisma.pinnedMessage.delete({ where: { messageId: msg.id } });
      const io = req.app.get("io");
      io.to(`channel:${msg.channelId}`).emit("message:unpinned", { messageId: msg.id });
      return res.json({ message: "Unpinned" });
    }

    const pinned = await prisma.pinnedMessage.create({
      data: { messageId: msg.id, channelId: msg.channelId, pinnedById: req.user.id },
    });

    await prisma.auditLog.create({
      data: { adminId: req.user.id, action: "MESSAGE_PINNED", target: msg.id },
    });

    const io = req.app.get("io");
    io.to(`channel:${msg.channelId}`).emit("message:pinned", { messageId: msg.id, pinned });

    res.json({ message: "Pinned", pinned });
  } catch (err) { next(err); }
});

// ── POST /api/messages/:messageId/react ─────────────────────────────────────
router.post("/:messageId/react", authenticate, [
  body("emoji").trim().isLength({ min:1, max:10 }),
], async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;

    const msg = await prisma.message.findUnique({ where: { id: messageId } });
    if (!msg) return res.status(404).json({ error: "Message not found" });

    const existing = await prisma.reaction.findUnique({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
    });

    if (existing) {
      await prisma.reaction.delete({ where: { messageId_userId_emoji: { messageId, userId, emoji } } });
    } else {
      await prisma.reaction.create({ data: { messageId, userId, emoji } });
    }

    const reactions = await prisma.reaction.findMany({
      where: { messageId },
      select: { emoji:true, userId:true, user:{ select:{ name:true } } },
    });

    const io = req.app.get("io");
    io.to(`channel:${msg.channelId}`).emit("message:reaction", { messageId, reactions });

    res.json({ reactions });
  } catch (err) { next(err); }
});

module.exports = router;
