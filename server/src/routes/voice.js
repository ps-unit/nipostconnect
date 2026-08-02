// server/src/routes/voice.js — Phase 4
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");
const { requireChannelAccess } = require("../middleware/rbac");

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/voice/:channelId — get active voice room for a channel
router.get("/:channelId", authenticate, async (req, res, next) => {
  try {
    const room = await prisma.voiceRoom.findFirst({
      where: { channelId: req.params.channelId, isActive: true },
      include: {
        participants: {
          where: { leftAt: null },
          include: { user: { select: { id:true, name:true, staffId:true, role:true, avatar:true } } },
        },
      },
    });
    res.json({ room });
  } catch (err) { next(err); }
});

// POST /api/voice/:channelId/start — start a voice room
router.post("/:channelId/start", authenticate, async (req, res, next) => {
  try {
    const { channelId } = req.params;

    // Check channel membership
    const isMember = req.user.role === "SUPER_ADMIN" || await prisma.channelMember.findUnique({
      where: { userId_channelId: { userId: req.user.id, channelId } },
    });
    if (!isMember) return res.status(403).json({ error: "Not a channel member" });

    // Check no active room already
    const existing = await prisma.voiceRoom.findFirst({ where: { channelId, isActive: true } });
    if (existing) return res.status(409).json({ error: "A voice room is already active", room: existing });

    const room = await prisma.voiceRoom.create({
      data: {
        channelId,
        startedById: req.user.id,
        isActive: true,
        participants: {
          create: { userId: req.user.id },
        },
      },
      include: {
        participants: {
          include: { user: { select: { id:true, name:true, staffId:true, role:true } } },
        },
      },
    });

    // Notify channel members
    const io = req.app.get("io");
    io.to(`channel:${channelId}`).emit("voice:room:started", {
      room, startedBy: { id: req.user.id, name: req.user.name },
    });

    res.status(201).json({ room });
  } catch (err) { next(err); }
});

// POST /api/voice/:channelId/join — join an existing voice room
router.post("/:channelId/join", authenticate, async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const room = await prisma.voiceRoom.findFirst({ where: { channelId, isActive: true } });
    if (!room) return res.status(404).json({ error: "No active voice room in this channel" });

    await prisma.voiceParticipant.upsert({
      where: { roomId_userId: { roomId: room.id, userId: req.user.id } },
      update: { leftAt: null, isMuted: false },
      create: { roomId: room.id, userId: req.user.id },
    });

    const io = req.app.get("io");
    io.to(`channel:${channelId}`).emit("voice:user:joined", {
      roomId: room.id, channelId,
      user: { id: req.user.id, name: req.user.name },
    });

    res.json({ message: "Joined voice room", roomId: room.id });
  } catch (err) { next(err); }
});

// POST /api/voice/:channelId/leave — leave voice room
router.post("/:channelId/leave", authenticate, async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const room = await prisma.voiceRoom.findFirst({ where: { channelId, isActive: true } });
    if (!room) return res.json({ message: "No active room" });

    await prisma.voiceParticipant.updateMany({
      where: { roomId: room.id, userId: req.user.id, leftAt: null },
      data: { leftAt: new Date() },
    });

    // Check if room is now empty — if so, close it
    const remaining = await prisma.voiceParticipant.count({ where: { roomId: room.id, leftAt: null } });
    if (remaining === 0) {
      await prisma.voiceRoom.update({ where: { id: room.id }, data: { isActive: false, endedAt: new Date() } });
      req.app.get("io").to(`channel:${channelId}`).emit("voice:room:ended", { roomId: room.id, channelId });
    } else {
      req.app.get("io").to(`channel:${channelId}`).emit("voice:user:left", {
        roomId: room.id, channelId, userId: req.user.id,
      });
    }

    res.json({ message: "Left voice room" });
  } catch (err) { next(err); }
});

// PATCH /api/voice/:channelId/mute — toggle mute
router.patch("/:channelId/mute", authenticate, async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const { isMuted } = req.body;
    const room = await prisma.voiceRoom.findFirst({ where: { channelId, isActive: true } });
    if (!room) return res.status(404).json({ error: "No active room" });

    await prisma.voiceParticipant.updateMany({
      where: { roomId: room.id, userId: req.user.id, leftAt: null },
      data: { isMuted: !!isMuted },
    });

    req.app.get("io").to(`channel:${channelId}`).emit("voice:mute:changed", {
      roomId: room.id, userId: req.user.id, isMuted: !!isMuted,
    });

    res.json({ isMuted: !!isMuted });
  } catch (err) { next(err); }
});

module.exports = router;
