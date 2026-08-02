// server/src/routes/reports.js — Phase 4
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");
const { isAdmin } = require("../middleware/rbac");

const router = express.Router();
const prisma = new PrismaClient();
router.use(authenticate, isAdmin);

// GET /api/reports/staff-activity?month=2026-06
router.get("/staff-activity", async (req, res, next) => {
  try {
    const monthStr = req.query.month || new Date().toISOString().slice(0, 7);
    const [year, month] = monthStr.split("-").map(Number);
    const from = new Date(year, month - 1, 1);
    const to   = new Date(year, month, 0, 23, 59, 59);

    const users = await prisma.user.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true, name: true, staffId: true, role: true,
        state: { select: { name: true, code: true } },
        department: { select: { name: true } },
        lastSeenAt: true,
        sentMessages: {
          where: { createdAt: { gte: from, lte: to }, deletedAt: null },
          select: { id: true, type: true },
        },
        pollVotes: {
          where: { votedAt: { gte: from, lte: to } },
          select: { id: true },
        },
        reactions: {
          where: { createdAt: { gte: from, lte: to } },
          select: { id: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const report = users.map(u => ({
      id: u.id, name: u.name, staffId: u.staffId, role: u.role,
      state: u.state?.name, stateCode: u.state?.code,
      department: u.department?.name,
      lastSeenAt: u.lastSeenAt,
      totalMessages: u.sentMessages.length,
      announcements: u.sentMessages.filter(m => m.type === "ANNOUNCEMENT").length,
      memos:         u.sentMessages.filter(m => m.type === "MEMO").length,
      polls:         u.sentMessages.filter(m => m.type === "POLL").length,
      pollVotes:     u.pollVotes.length,
      reactions:     u.reactions.length,
      activityScore: u.sentMessages.length * 3 + u.pollVotes.length * 2 + u.reactions.length,
    })).sort((a, b) => b.activityScore - a.activityScore);

    res.json({ report, period: monthStr, total: report.length });
  } catch (err) { next(err); }
});

// GET /api/reports/state-summary?month=2026-06
router.get("/state-summary", async (req, res, next) => {
  try {
    const monthStr = req.query.month || new Date().toISOString().slice(0, 7);
    const [year, month] = monthStr.split("-").map(Number);
    const from = new Date(year, month - 1, 1);
    const to   = new Date(year, month, 0, 23, 59, 59);

    const states = await prisma.state.findMany({
      select: {
        id: true, name: true, code: true,
        _count: { select: { users: true } },
        channels: {
          where: { type: "STATE" },
          select: {
            messages: {
              where: { createdAt: { gte: from, lte: to }, deletedAt: null },
              select: { id: true, type: true },
            },
            _count: { select: { members: true } },
          },
          take: 1,
        },
        users: {
          where: { status: "ACTIVE", lastSeenAt: { gte: from } },
          select: { id: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const summary = states.map(s => {
      const ch = s.channels[0];
      const msgs = ch?.messages || [];
      return {
        id: s.id, name: s.name, code: s.code,
        totalStaff:  s._count.users,
        activeStaff: s.users.length,
        members:     ch?._count.members || 0,
        totalMessages:   msgs.length,
        announcements:   msgs.filter(m => m.type === "ANNOUNCEMENT").length,
        memos:           msgs.filter(m => m.type === "MEMO").length,
        engagementRate:  s._count.users > 0 ? Math.round((s.users.length / s._count.users) * 100) : 0,
      };
    }).sort((a, b) => b.totalMessages - a.totalMessages);

    res.json({ summary, period: monthStr });
  } catch (err) { next(err); }
});

// GET /api/reports/department-summary?month=2026-06
router.get("/department-summary", async (req, res, next) => {
  try {
    const monthStr = req.query.month || new Date().toISOString().slice(0, 7);
    const [year, month] = monthStr.split("-").map(Number);
    const from = new Date(year, month - 1, 1);
    const to   = new Date(year, month, 0, 23, 59, 59);

    const depts = await prisma.department.findMany({
      select: {
        id: true, name: true,
        _count: { select: { users: true } },
        channels: {
          where: { type: "DEPARTMENT" },
          select: {
            messages: {
              where: { createdAt: { gte: from, lte: to }, deletedAt: null },
              select: { id: true },
            },
          },
          take: 1,
        },
      },
    });

    const summary = depts.map(d => ({
      id: d.id, name: d.name,
      totalStaff: d._count.users,
      messages:   d.channels[0]?.messages.length || 0,
    })).sort((a, b) => b.messages - a.messages);

    res.json({ summary, period: monthStr });
  } catch (err) { next(err); }
});

// GET /api/reports/export/staff-activity?month=2026-06&format=csv
router.get("/export/staff-activity", async (req, res, next) => {
  try {
    const monthStr = req.query.month || new Date().toISOString().slice(0, 7);
    const [year, month] = monthStr.split("-").map(Number);
    const from = new Date(year, month - 1, 1);
    const to   = new Date(year, month, 0, 23, 59, 59);

    const users = await prisma.user.findMany({
      where: { status: "ACTIVE" },
      select: {
        name: true, staffId: true, role: true,
        state: { select: { name: true } },
        department: { select: { name: true } },
        lastSeenAt: true,
        _count: { select: { sentMessages: true, pollVotes: true } },
      },
      orderBy: { name: "asc" },
    });

    const header = "Name,Staff ID,Role,State,Department,Messages,Poll Votes,Last Seen\n";
    const rows = users.map(u =>
      [
        `"${u.name}"`, u.staffId, u.role,
        `"${u.state?.name || ""}"`, `"${u.department?.name || ""}"`,
        u._count.sentMessages, u._count.pollVotes,
        u.lastSeenAt ? u.lastSeenAt.toISOString().slice(0, 10) : "Never",
      ].join(",")
    ).join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=nipost_staff_activity_${monthStr}.csv`);
    res.send(header + rows);
  } catch (err) { next(err); }
});

module.exports = router;
