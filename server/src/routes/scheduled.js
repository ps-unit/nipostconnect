// server/src/routes/scheduled.js — Phase 3
const express = require("express");
const { body, validationResult } = require("express-validator");
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");
const { isAdmin } = require("../middleware/rbac");

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/scheduled — list scheduled messages
router.get("/", authenticate, isAdmin, async (req, res, next) => {
  try {
    const { status = "PENDING" } = req.query;
    const messages = await prisma.scheduledMessage.findMany({
      where: { ...(status !== "ALL" && { status }) },
      include: { author: { select: { name: true, staffId: true, role: true } } },
      orderBy: { scheduledAt: "asc" },
    });
    res.json({ messages });
  } catch (err) { next(err); }
});

// POST /api/scheduled — create a scheduled message
router.post("/", authenticate, isAdmin, [
  body("content").trim().isLength({ min: 1, max: 5000 }),
  body("channelId").isUUID(),
  body("scheduledAt").isISO8601(),
  body("type").optional().isIn(["MESSAGE","ANNOUNCEMENT","MEMO"]),
  body("memoRef").optional().trim(),
  body("memoTo").optional().trim(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { content, channelId, scheduledAt, type = "ANNOUNCEMENT", memoRef, memoTo } = req.body;

    const schedAt = new Date(scheduledAt);
    if (schedAt <= new Date()) return res.status(400).json({ error: "Scheduled time must be in the future" });

    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) return res.status(404).json({ error: "Channel not found" });

    const msg = await prisma.scheduledMessage.create({
      data: {
        content, channelId, type, scheduledAt: schedAt,
        memoRef: memoRef || null, memoTo: memoTo || null,
        authorId: req.user.id,
      },
      include: { author: { select: { name: true, staffId: true } } },
    });

    await prisma.auditLog.create({
      data: { adminId: req.user.id, action: "SCHEDULED_MESSAGE_CREATED",
        target: channelId, meta: { scheduledAt, type } },
    });

    res.status(201).json({ message: msg });
  } catch (err) { next(err); }
});

// DELETE /api/scheduled/:id — cancel a scheduled message
router.delete("/:id", authenticate, isAdmin, async (req, res, next) => {
  try {
    const msg = await prisma.scheduledMessage.findUnique({ where: { id: req.params.id } });
    if (!msg) return res.status(404).json({ error: "Not found" });
    if (msg.status !== "PENDING") return res.status(400).json({ error: "Can only cancel PENDING messages" });

    await prisma.scheduledMessage.update({
      where: { id: req.params.id },
      data: { status: "CANCELLED" },
    });

    res.json({ message: "Scheduled message cancelled" });
  } catch (err) { next(err); }
});

module.exports = router;
