// routes/channels.js
const express = require("express");
const { body, validationResult } = require("express-validator");
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");
const { isAdmin, isSuperAdmin, requireChannelAccess } = require("../middleware/rbac");

const router = express.Router();
const prisma = new PrismaClient();

// ── GET /api/channels — list accessible channels ─────────────────────────────
router.get("/", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get channels the user is a member of
    const memberships = await prisma.channelMember.findMany({
      where: { userId },
      select: { channelId: true, lastReadAt: true, isAdmin: true, isMuted: true },
    });
    const memberChannelIds = memberships.map(m => m.channelId);

    // Super admin sees all channels
    const whereClause = userRole === "SUPER_ADMIN"
      ? { isArchived: false }
      : { isArchived: false, id: { in: memberChannelIds } };

    const channels = await prisma.channel.findMany({
      where: whereClause,
      include: {
        state: { select: { id:true, name:true, slug:true } },
        department: { select: { id:true, name:true, slug:true } },
        _count: { select: { members: true, messages: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Attach membership info
    const memberMap = {};
    memberships.forEach(m => { memberMap[m.channelId] = m; });

    const result = channels.map(ch => ({
      ...ch,
      membership: memberMap[ch.id] || null,
    }));

    res.json({ channels: result });
  } catch (err) { next(err); }
});

// ── GET /api/channels/all — all channels (for sidebar, including locked) ─────
router.get("/all", authenticate, async (req, res, next) => {
  try {
    const channels = await prisma.channel.findMany({
      where: { isArchived: false },
      include: {
        state: { select: { id:true, name:true, slug:true } },
        department: { select: { id:true, name:true, slug:true } },
        _count: { select: { members: true } },
      },
      orderBy: { type: "asc" },
    });

    // Mark which ones the user is a member of
    const memberships = await prisma.channelMember.findMany({
      where: { userId: req.user.id },
      select: { channelId: true },
    });
    const joined = new Set(memberships.map(m => m.channelId));

    const result = channels.map(ch => ({
      ...ch,
      isMember: joined.has(ch.id),
    }));

    res.json({ channels: result });
  } catch (err) { next(err); }
});

// ── POST /api/channels — create channel (admin+) ─────────────────────────────
router.post("/", authenticate, isAdmin, [
  body("name").trim().isLength({ min: 2, max: 80 }),
  body("type").isIn(["ANNOUNCEMENT","STATE","POST_OFFICE","DEPARTMENT","SUGGESTION","EMERGENCY","GENERAL"]),
  body("description").optional().trim().isLength({ max: 300 }),
  body("stateId").optional().isUUID(),
  body("departmentId").optional().isUUID(),
  body("isLocked").optional().isBoolean(),
  body("isReadOnly").optional().isBoolean(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { name, type, description, stateId, departmentId, isLocked, isReadOnly } = req.body;

    // Generate slug
    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    // Emergency channels: super admin only
    if (type === "EMERGENCY" && req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Only Super Admin can create emergency channels" });
    }

    const existing = await prisma.channel.findUnique({ where: { slug } });
    if (existing) return res.status(409).json({ error: "A channel with this name already exists" });

    const channel = await prisma.channel.create({
      data: {
        name, slug, type, description: description || null,
        stateId: stateId || null,
        departmentId: departmentId || null,
        isLocked: isLocked ?? false,
        isReadOnly: isReadOnly ?? false,
        createdById: req.user.id,
      },
      include: { state: true, department: true },
    });

    // Creator auto-joins as channel admin
    await prisma.channelMember.create({
      data: { userId: req.user.id, channelId: channel.id, isAdmin: true },
    });

    // Audit log
    await prisma.auditLog.create({
      data: { adminId: req.user.id, action: "CHANNEL_CREATED", target: channel.id, meta: { name, type } },
    });

    const io = req.app.get("io");
    io.emit("channel:created", channel);

    res.status(201).json({ channel });
  } catch (err) { next(err); }
});

// ── GET /api/channels/:channelId ─────────────────────────────────────────────
router.get("/:channelId", authenticate, async (req, res, next) => {
  try {
    const channel = await prisma.channel.findUnique({
      where: { id: req.params.channelId },
      include: {
        state: true, department: true,
        _count: { select: { members: true, messages: true } },
      },
    });
    if (!channel) return res.status(404).json({ error: "Channel not found" });
    res.json({ channel });
  } catch (err) { next(err); }
});

// ── GET /api/channels/:channelId/members ─────────────────────────────────────
router.get("/:channelId/members", authenticate, requireChannelAccess(), async (req, res, next) => {
  try {
    const members = await prisma.channelMember.findMany({
      where: { channelId: req.params.channelId },
      include: {
        user: {
          select: { id:true, name:true, staffId:true, email:true, role:true,
                    status:true, lastSeenAt:true, avatar:true, state:true, department:true },
        },
      },
      orderBy: { joinedAt: "asc" },
    });
    res.json({ members });
  } catch (err) { next(err); }
});

// ── POST /api/channels/:channelId/join-request ───────────────────────────────
router.post("/:channelId/join-request", authenticate, [
  body("reason").optional().trim().isLength({ max: 500 }),
], async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const userId = req.user.id;

    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) return res.status(404).json({ error: "Channel not found" });

    // Already a member?
    const existing = await prisma.channelMember.findUnique({
      where: { userId_channelId: { userId, channelId } },
    });
    if (existing) return res.status(409).json({ error: "Already a member" });

    // Existing pending request?
    const existingReq = await prisma.joinRequest.findUnique({
      where: { userId_channelId: { userId, channelId } },
    });
    if (existingReq) return res.status(409).json({ error: "Join request already pending" });

    const joinRequest = await prisma.joinRequest.create({
      data: { userId, channelId, reason: req.body.reason || null },
      include: { user: { select: { name:true, staffId:true } }, channel: { select: { name:true } } },
    });

    // Notify channel admins via socket
    const io = req.app.get("io");
    io.to(`channel:${channelId}:admins`).emit("joinRequest:new", joinRequest);

    res.status(201).json({ message: "Join request submitted", joinRequest });
  } catch (err) { next(err); }
});

// ── PATCH /api/channels/:channelId/join-request/:requestId ───────────────────
router.patch("/:channelId/join-request/:requestId", authenticate, isAdmin, async (req, res, next) => {
  try {
    const { channelId, requestId } = req.params;
    const { action, note } = req.body; // action: "approve" | "reject"

    if (!["approve","reject"].includes(action)) {
      return res.status(400).json({ error: "action must be 'approve' or 'reject'" });
    }

    const joinRequest = await prisma.joinRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });
    if (!joinRequest) return res.status(404).json({ error: "Request not found" });
    if (joinRequest.channelId !== channelId) return res.status(400).json({ error: "Channel mismatch" });

    const status = action === "approve" ? "APPROVED" : "REJECTED";

    await prisma.$transaction(async (tx) => {
      await tx.joinRequest.update({
        where: { id: requestId },
        data: { status, reviewNote: note || null, reviewedById: req.user.id, reviewedAt: new Date() },
      });

      if (action === "approve") {
        await tx.channelMember.create({
          data: { userId: joinRequest.userId, channelId },
        });
      }

      await tx.auditLog.create({
        data: {
          adminId: req.user.id,
          action: `JOIN_REQUEST_${status}`,
          target: channelId,
          meta: { userId: joinRequest.userId, userName: joinRequest.user.name },
        },
      });
    });

    const io = req.app.get("io");
    io.to(`user:${joinRequest.userId}`).emit("joinRequest:decision", { channelId, status });

    res.json({ message: `Request ${status.toLowerCase()}` });
  } catch (err) { next(err); }
});

// ── DELETE /api/channels/:channelId — archive (super admin only) ─────────────
router.delete("/:channelId", authenticate, isSuperAdmin, async (req, res, next) => {
  try {
    const channel = await prisma.channel.update({
      where: { id: req.params.channelId },
      data: { isArchived: true },
    });
    await prisma.auditLog.create({
      data: { adminId: req.user.id, action: "CHANNEL_ARCHIVED", target: channel.id },
    });
    res.json({ message: "Channel archived" });
  } catch (err) { next(err); }
});

module.exports = router;
