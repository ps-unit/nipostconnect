// server/src/routes/search.js — Phase 3
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/search?q=...&type=messages|channels|staff
router.get("/", authenticate, async (req, res, next) => {
  try {
    const { q = "", type = "messages", limit = "20" } = req.query;
    const trimmed = q.trim();
    if (trimmed.length < 2) return res.status(400).json({ error: "Query must be at least 2 characters" });

    const take = Math.min(parseInt(limit), 50);

    // Get channels user is a member of (for message search scoping)
    const memberships = req.user.role === "SUPER_ADMIN"
      ? null
      : (await prisma.channelMember.findMany({ where: { userId: req.user.id }, select: { channelId: true } }))
          .map(m => m.channelId);

    if (type === "messages" || type === "all") {
      const messages = await prisma.message.findMany({
        where: {
          deletedAt: null,
          content: { contains: trimmed, mode: "insensitive" },
          ...(memberships && { channelId: { in: memberships } }),
        },
        include: {
          author: { select: { id: true, name: true, role: true } },
          channel: { select: { id: true, name: true, type: true } },
        },
        orderBy: { createdAt: "desc" },
        take,
      });

      if (type === "messages") return res.json({ messages, query: trimmed });
    }

    if (type === "channels" || type === "all") {
      const allChannels = await prisma.channel.findMany({
        where: {
          isArchived: false,
          OR: [
            { name: { contains: trimmed, mode: "insensitive" } },
            { description: { contains: trimmed, mode: "insensitive" } },
          ],
        },
        include: {
          state: { select: { name: true } },
          department: { select: { name: true } },
          _count: { select: { members: true } },
        },
        take,
      });
      if (type === "channels") return res.json({ channels: allChannels, query: trimmed });
    }

    if (type === "staff" || type === "all") {
      const staff = await prisma.user.findMany({
        where: {
          status: "ACTIVE",
          OR: [
            { name: { contains: trimmed, mode: "insensitive" } },
            { staffId: { contains: trimmed, mode: "insensitive" } },
            { email: { contains: trimmed, mode: "insensitive" } },
            { postOffice: { contains: trimmed, mode: "insensitive" } },
          ],
        },
        select: {
          id: true, name: true, staffId: true, email: true, role: true,
          postOffice: true, lastSeenAt: true, avatar: true, avatarUrl: true,
          state: { select: { name: true } },
          department: { select: { name: true } },
        },
        take,
      });
      if (type === "staff") return res.json({ staff, query: trimmed });
    }

    res.status(400).json({ error: "type must be messages, channels, staff, or all" });
  } catch (err) { next(err); }
});

module.exports = router;
