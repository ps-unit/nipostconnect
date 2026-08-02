// server/src/routes/analytics.js — Phase 3
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");
const { isAdmin } = require("../middleware/rbac");

const router = express.Router();
const prisma = new PrismaClient();

// All analytics routes require admin
router.use(authenticate, isAdmin);

// GET /api/analytics/overview
router.get("/overview", async (req, res, next) => {
  try {
    const now = new Date();
    const day7  = new Date(now - 7  * 86400000);
    const day30 = new Date(now - 30 * 86400000);

    const [totalUsers, activeUsers, pendingUsers, totalMessages, totalChannels,
           messagesThisWeek, newUsersThisWeek, totalPolls, totalAttachments,
           onlineSockets] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: "ACTIVE" } }),
      prisma.user.count({ where: { status: "PENDING_VERIFICATION" } }),
      prisma.message.count({ where: { deletedAt: null } }),
      prisma.channel.count({ where: { isArchived: false } }),
      prisma.message.count({ where: { createdAt: { gte: day7 }, deletedAt: null } }),
      prisma.user.count({ where: { createdAt: { gte: day7 } } }),
      prisma.poll.count(),
      prisma.attachment.count(),
      Promise.resolve(req.app.get("io")?.getOnlineUsers()?.length || 0),
    ]);

    res.json({
      totalUsers, activeUsers, pendingUsers, totalMessages, totalChannels,
      messagesThisWeek, newUsersThisWeek, totalPolls, totalAttachments, onlineSockets,
    });
  } catch (err) { next(err); }
});

// GET /api/analytics/message-volume?days=30
// Returns daily message counts for charting
router.get("/message-volume", async (req, res, next) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 90);
    const since = new Date(Date.now() - days * 86400000);

    const messages = await prisma.message.findMany({
      where: { createdAt: { gte: since }, deletedAt: null },
      select: { createdAt: true, type: true },
      orderBy: { createdAt: "asc" },
    });

    // Bucket by day
    const byDay = {};
    messages.forEach(m => {
      const day = m.createdAt.toISOString().slice(0, 10);
      if (!byDay[day]) byDay[day] = { date: day, total: 0, announcements: 0, memos: 0, polls: 0, messages: 0 };
      byDay[day].total++;
      if (m.type === "ANNOUNCEMENT") byDay[day].announcements++;
      else if (m.type === "MEMO")     byDay[day].memos++;
      else if (m.type === "POLL")     byDay[day].polls++;
      else                            byDay[day].messages++;
    });

    // Fill missing days with zeros
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      result.push(byDay[d] || { date: d, total: 0, announcements: 0, memos: 0, polls: 0, messages: 0 });
    }

    res.json({ data: result, days });
  } catch (err) { next(err); }
});

// GET /api/analytics/state-engagement
// Messages + users per state
router.get("/state-engagement", async (req, res, next) => {
  try {
    const states = await prisma.state.findMany({
      select: {
        id: true, name: true, code: true,
        _count: { select: { users: true } },
        channels: {
          where: { type: "STATE" },
          select: { _count: { select: { messages: true, members: true } } },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    });

    const result = states.map(s => ({
      id: s.id, name: s.name, code: s.code,
      users:    s._count.users,
      messages: s.channels[0]?._count.messages || 0,
      members:  s.channels[0]?._count.members  || 0,
    })).sort((a, b) => b.messages - a.messages);

    res.json({ data: result });
  } catch (err) { next(err); }
});

// GET /api/analytics/department-engagement
router.get("/department-engagement", async (req, res, next) => {
  try {
    const depts = await prisma.department.findMany({
      select: {
        id: true, name: true,
        _count: { select: { users: true } },
        channels: {
          where: { type: "DEPARTMENT" },
          select: { _count: { select: { messages: true, members: true } } },
          take: 1,
        },
      },
    });

    const result = depts.map(d => ({
      id: d.id, name: d.name,
      users:    d._count.users,
      messages: d.channels[0]?._count.messages || 0,
      members:  d.channels[0]?._count.members  || 0,
    })).sort((a, b) => b.messages - a.messages);

    res.json({ data: result });
  } catch (err) { next(err); }
});

// GET /api/analytics/top-channels?limit=10
router.get("/top-channels", async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 30);
    const channels = await prisma.channel.findMany({
      where: { isArchived: false },
      select: {
        id: true, name: true, type: true,
        _count: { select: { messages: true, members: true } },
      },
      orderBy: { messages: { _count: "desc" } },
      take: limit,
    });
    res.json({ data: channels });
  } catch (err) { next(err); }
});

// GET /api/analytics/active-staff?limit=10
// Most active staff by message count
router.get("/active-staff", async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 30);
    const staff = await prisma.user.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true, name: true, staffId: true, role: true, lastSeenAt: true,
        state: { select: { name: true } },
        department: { select: { name: true } },
        _count: { select: { sentMessages: true } },
      },
      orderBy: { sentMessages: { _count: "desc" } },
      take: limit,
    });
    res.json({ data: staff });
  } catch (err) { next(err); }
});

// GET /api/analytics/recent-activity
// Last 20 audit events
router.get("/recent-activity", async (req, res, next) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: { admin: { select: { name: true, staffId: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    res.json({ data: logs });
  } catch (err) { next(err); }
});

// GET /api/analytics/poll-participation
router.get("/poll-participation", async (req, res, next) => {
  try {
    const polls = await prisma.poll.findMany({
      include: {
        _count: { select: { votes: true } },
        message: { select: { content: true, createdAt: true, channel: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    res.json({ data: polls });
  } catch (err) { next(err); }
});

module.exports = router;
