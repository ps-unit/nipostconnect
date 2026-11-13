// routes/admin.js
const express = require("express");
const { body, validationResult } = require("express-validator");
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");
const { isAdmin, isSuperAdmin } = require("../middleware/rbac");
const { syncUserChannelMemberships } = require("../utils/channelSync");

const router = express.Router();
const prisma = new PrismaClient();

// All admin routes require authentication + admin role
router.use(authenticate, isAdmin);

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
router.get("/stats", async (req, res, next) => {
  try {
    const [totalUsers, activeUsers, totalChannels, totalMessages, pendingRequests, pendingVerifications] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: "ACTIVE" } }),
      prisma.channel.count({ where: { isArchived: false } }),
      prisma.message.count({ where: { deletedAt: null } }),
      prisma.joinRequest.count({ where: { status: "PENDING" } }),
      prisma.user.count({ where: { status: "PENDING_VERIFICATION" } }),
    ]);

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newUsersThisWeek = await prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } });
    const messagesThisWeek = await prisma.message.count({ where: { createdAt: { gte: sevenDaysAgo }, deletedAt: null } });

    // State-wise user distribution
    const stateStats = await prisma.state.findMany({
      select: { name: true, _count: { select: { users: true } } },
      orderBy: { name: "asc" },
    });

    res.json({
      overview: { totalUsers, activeUsers, totalChannels, totalMessages, pendingRequests, pendingVerifications },
      thisWeek: { newUsers: newUsersThisWeek, messages: messagesThisWeek },
      byState: stateStats,
    });
  } catch (err) { next(err); }
});

// ── GET /api/admin/users ──────────────────────────────────────────────────────
router.get("/users", async (req, res, next) => {
  try {
    const { search, role, status, stateId, departmentId, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { staffId: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(role && { role }),
      ...(status && { status }),
      ...(stateId && { stateId }),
      ...(departmentId && { departmentId }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id:true, name:true, staffId:true, email:true, role:true, status:true,
          postOffice:true, lastSeenAt:true, createdAt:true,
          state:{ select:{ name:true } }, department:{ select:{ name:true } },
        },
        orderBy: { createdAt: "desc" },
        skip, take: parseInt(limit),
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { next(err); }
});

// ── PATCH /api/admin/users/:userId ─────────────────────────────────────────────
router.patch("/users/:userId", async (req, res, next) => {
  try {
    const { role, status, stateId, departmentId } = req.body;

    if (role && !["SUPER_ADMIN", "STATE_ADMIN", "DEPT_ADMIN", "STAFF"].includes(role)) {
      return res.status(400).json({ error: "Invalid role specified" });
    }

    const user = await prisma.user.update({
      where: { id: req.params.userId },
      data: {
        ...(role && { role }),
        ...(status && { status }),
        ...(stateId !== undefined && { stateId: stateId || null }),
        ...(departmentId !== undefined && { departmentId: departmentId || null }),
      },
      include: { state: true, department: true },
    });

    const io = req.app.get("io");
    await syncUserChannelMemberships(prisma, user, io);

    await prisma.auditLog.create({
      data: {
        adminId: req.user.id,
        action: "USER_UPDATED",
        target: user.id,
        meta: { role, status, stateId, departmentId },
      },
    });

    if (io) {
      io.to(`user:${user.id}`).emit("user:updated", {
        id: user.id,
        role: user.role,
        status: user.status,
        stateId: user.stateId,
        departmentId: user.departmentId,
        state: user.state,
        department: user.department,
      });
    }

    res.json({ user });
  } catch (err) { next(err); }
});

// ── GET /api/admin/join-requests ───────────────────────────────────────────────
router.get("/join-requests", async (req, res, next) => {
  try {
    const { status = "PENDING" } = req.query;

    const requests = await prisma.joinRequest.findMany({
      where: { status },
      include: {
        user: { select: { id:true, name:true, staffId:true, email:true, state:{ select:{name:true} }, department:{ select:{name:true} } } },
        channel: { select: { id:true, name:true, type:true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ requests });
  } catch (err) { next(err); }
});

// ── GET /api/admin/audit-log ───────────────────────────────────────────────────
router.get("/audit-log", async (req, res, next) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const logs = await prisma.auditLog.findMany({
      include: {
        admin: { select: { name:true, staffId:true, role:true } },
      },
      orderBy: { createdAt: "desc" },
      skip, take: parseInt(limit),
    });

    res.json({ logs });
  } catch (err) { next(err); }
});

// ── POST /api/admin/emergency-broadcast — super admin only ────────────────────
router.post("/emergency-broadcast", isSuperAdmin, [
  body("content").trim().isLength({ min: 10, max: 2000 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const emergencyChannel = await prisma.channel.findFirst({ where: { type: "EMERGENCY" } });
    if (!emergencyChannel) return res.status(500).json({ error: "Emergency channel not configured" });

    const message = await prisma.message.create({
      data: {
        content: req.body.content,
        type: "ANNOUNCEMENT",
        channelId: emergencyChannel.id,
        authorId: req.user.id,
      },
      include: {
        author: { select: { name:true, role:true } },
      },
    });

    await prisma.auditLog.create({
      data: { adminId: req.user.id, action: "EMERGENCY_BROADCAST", meta: { content: req.body.content } },
    });

    // Broadcast to ALL connected sockets
    const io = req.app.get("io");
    io.emit("emergency:broadcast", { message, timestamp: new Date() });

    res.status(201).json({ message: "Emergency broadcast sent", data: message });
  } catch (err) { next(err); }
});

// ── GET /api/admin/states-departments — setup data ───────────────────────────
router.get("/setup-data", async (req, res, next) => {
  try {
    const [states, departments] = await Promise.all([
      prisma.state.findMany({ orderBy: { name: "asc" } }),
      prisma.department.findMany({ orderBy: { name: "asc" } }),
    ]);
    res.json({ states, departments });
  } catch (err) { next(err); }
});

module.exports = router;
