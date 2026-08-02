// server/src/routes/bulk.js — Phase 3
const express = require("express");
const { body, validationResult } = require("express-validator");
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");
const { isAdmin } = require("../middleware/rbac");

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/bulk — list bulk memos
router.get("/", authenticate, isAdmin, async (req, res, next) => {
  try {
    const memos = await prisma.bulkMemo.findMany({
      include: {
        author: { select: { name: true, staffId: true } },
        _count: { select: { recipients: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ memos });
  } catch (err) { next(err); }
});

// POST /api/bulk — create and dispatch a bulk memo
router.post("/", authenticate, isAdmin, [
  body("subject").trim().isLength({ min: 3, max: 200 }),
  body("content").trim().isLength({ min: 10, max: 10000 }),
  body("memoRef").optional().trim(),
  body("channelIds").isArray({ min: 1 }),
  body("channelIds.*").isUUID(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { subject, content, memoRef, channelIds } = req.body;

    // Validate channels exist
    const channels = await prisma.channel.findMany({
      where: { id: { in: channelIds }, isArchived: false },
      select: { id: true, name: true },
    });
    if (channels.length === 0) return res.status(400).json({ error: "No valid channels found" });

    // Create bulk memo + recipients in transaction
    const bulkMemo = await prisma.$transaction(async (tx) => {
      const memo = await tx.bulkMemo.create({
        data: {
          subject, content, memoRef: memoRef || null,
          status: "SENDING", authorId: req.user.id,
          recipients: {
            create: channels.map(ch => ({ channelId: ch.id })),
          },
        },
        include: { recipients: { include: { channel: { select: { id: true, name: true } } } } },
      });
      return memo;
    });

    // Dispatch memo to each channel asynchronously
    const io = req.app.get("io");
    let sentCount = 0;

    await Promise.allSettled(
      bulkMemo.recipients.map(async (recipient) => {
        try {
          const message = await prisma.message.create({
            data: {
              content: `**${subject}**

${content}`,
              type: "MEMO",
              memoRef: memoRef || `BULK/${bulkMemo.id.slice(0, 8).toUpperCase()}`,
              memoTo: "All Channel Members",
              channelId: recipient.channelId,
              authorId: req.user.id,
            },
            include: {
              author: { select: { id: true, name: true, role: true } },
              attachments: true, reactions: true,
            },
          });

          await prisma.bulkMemoRecipient.update({
            where: { bulkMemoId_channelId: { bulkMemoId: bulkMemo.id, channelId: recipient.channelId } },
            data: { sentAt: new Date(), messageId: message.id },
          });

          io?.to(`channel:${recipient.channelId}`).emit("message:new", message);
          sentCount++;
        } catch (err) {
          console.error(`[BulkMemo] Failed to send to ${recipient.channel.name}:`, err.message);
        }
      })
    );

    await prisma.bulkMemo.update({
      where: { id: bulkMemo.id },
      data: { status: "SENT", sentAt: new Date(), sentCount },
    });

    await prisma.auditLog.create({
      data: { adminId: req.user.id, action: "BULK_MEMO_SENT",
        meta: { subject, channelCount: channels.length, sentCount } },
    });

    res.status(201).json({
      message: `Bulk memo dispatched to ${sentCount} of ${channels.length} channels`,
      bulkMemoId: bulkMemo.id, sentCount,
    });
  } catch (err) { next(err); }
});

// GET /api/bulk/:id — bulk memo details
router.get("/:id", authenticate, isAdmin, async (req, res, next) => {
  try {
    const memo = await prisma.bulkMemo.findUnique({
      where: { id: req.params.id },
      include: {
        author: { select: { name: true, staffId: true } },
        recipients: {
          include: { channel: { select: { id: true, name: true, type: true } } },
          orderBy: { channel: { name: "asc" } },
        },
      },
    });
    if (!memo) return res.status(404).json({ error: "Not found" });
    res.json({ memo });
  } catch (err) { next(err); }
});

module.exports = router;
