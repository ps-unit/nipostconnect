// routes/polls.js
const express = require("express");
const { body, validationResult } = require("express-validator");
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");
const { requireChannelAccess } = require("../middleware/rbac");

const router = express.Router();
const prisma = new PrismaClient();

// ── POST /api/polls — create poll in a channel ────────────────────────────────
router.post("/", authenticate, [
  body("channelId").isUUID(),
  body("question").trim().isLength({ min: 5, max: 500 }),
  body("options").isArray({ min: 2, max: 10 }),
  body("options.*.label").trim().isLength({ min: 1, max: 200 }),
  body("deadline").isISO8601(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { channelId, question, options, deadline } = req.body;

    // Check membership
    const isMember = req.user.role === "SUPER_ADMIN" || await prisma.channelMember.findUnique({
      where: { userId_channelId: { userId: req.user.id, channelId } },
    });
    if (!isMember) return res.status(403).json({ error: "Not a member of this channel" });

    const result = await prisma.$transaction(async (tx) => {
      // Create the message wrapper
      const message = await tx.message.create({
        data: {
          content: question,
          type: "POLL",
          channelId,
          authorId: req.user.id,
        },
      });

      // Create poll
      const poll = await tx.poll.create({
        data: {
          question,
          deadline: new Date(deadline),
          messageId: message.id,
          options: {
            create: options.map((o, i) => ({ label: o.label, order: i })),
          },
        },
        include: {
          options: { orderBy: { order: "asc" } },
          message: {
            include: {
              author: { select: { id:true, name:true, role:true, avatar:true } },
            },
          },
        },
      });

      return { message, poll };
    });

    const io = req.app.get("io");
    io.to(`channel:${channelId}`).emit("message:new", {
      ...result.message,
      poll: result.poll,
      author: result.poll.message.author,
    });

    res.status(201).json({ poll: result.poll });
  } catch (err) { next(err); }
});

// ── POST /api/polls/:pollId/vote ───────────────────────────────────────────────
router.post("/:pollId/vote", authenticate, [
  body("optionId").isUUID(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { pollId } = req.params;
    const { optionId } = req.body;
    const userId = req.user.id;

    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: { options: true, message: true },
    });
    if (!poll) return res.status(404).json({ error: "Poll not found" });
    if (!poll.isActive || new Date() > poll.deadline) {
      return res.status(400).json({ error: "This poll has closed" });
    }

    const validOption = poll.options.find(o => o.id === optionId);
    if (!validOption) return res.status(400).json({ error: "Invalid option" });

    // One vote per user
    const existing = await prisma.pollVote.findUnique({ where: { userId_pollId: { userId, pollId } } });
    if (existing) return res.status(409).json({ error: "You have already voted" });

    await prisma.pollVote.create({ data: { userId, pollId, optionId } });

    // Fetch updated results
    const updatedOptions = await prisma.pollOption.findMany({
      where: { pollId },
      include: { _count: { select: { votes: true } } },
      orderBy: { order: "asc" },
    });
    const totalVotes = updatedOptions.reduce((s, o) => s + o._count.votes, 0);

    const io = req.app.get("io");
    io.to(`channel:${poll.message.channelId}`).emit("poll:voted", {
      pollId, messageId: poll.messageId, options: updatedOptions, totalVotes, userVotedOptionId: optionId,
    });

    res.json({ options: updatedOptions, totalVotes, userVotedOptionId: optionId });
  } catch (err) { next(err); }
});

// ── PATCH /api/polls/:pollId/close — close poll early ────────────────────────
router.patch("/:pollId/close", authenticate, async (req, res, next) => {
  try {
    const poll = await prisma.poll.findUnique({
      where: { id: req.params.pollId },
      include: { message: true },
    });
    if (!poll) return res.status(404).json({ error: "Poll not found" });

    // Only poll creator or admin can close
    const canClose = poll.message.authorId === req.user.id ||
      ["SUPER_ADMIN","STATE_ADMIN","DEPT_ADMIN"].includes(req.user.role);
    if (!canClose) return res.status(403).json({ error: "Cannot close this poll" });

    await prisma.poll.update({ where: { id: poll.id }, data: { isActive: false } });
    res.json({ message: "Poll closed" });
  } catch (err) { next(err); }
});

module.exports = router;
