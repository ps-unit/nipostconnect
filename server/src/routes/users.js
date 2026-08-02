// routes/users.js
const express = require("express");
const { body, validationResult } = require("express-validator");
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// ── GET /api/users/directory — staff directory ────────────────────────────────
router.get("/directory", authenticate, async (req, res, next) => {
  try {
    const { search, stateId, departmentId, role } = req.query;

    const users = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { staffId: { contains: search, mode: "insensitive" } },
            { postOffice: { contains: search, mode: "insensitive" } },
          ],
        }),
        ...(stateId && { stateId }),
        ...(departmentId && { departmentId }),
        ...(role && { role }),
      },
      select: {
        id: true, name: true, staffId: true, email: true, role: true,
        postOffice: true, lastSeenAt: true, avatar: true,
        state: { select: { name: true, slug: true } },
        department: { select: { name: true, slug: true } },
      },
      orderBy: { name: "asc" },
      take: 100,
    });

    res.json({ users });
  } catch (err) { next(err); }
});

// ── GET /api/users/:userId — public profile ───────────────────────────────────
router.get("/:userId", authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: {
        id: true, name: true, staffId: true, email: true, role: true,
        status: true, postOffice: true, lastSeenAt: true, avatar: true,
        createdAt: true,
        state: { select: { name: true, slug: true } },
        department: { select: { name: true, slug: true } },
        _count: { select: { sentMessages: true } },
      },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (err) { next(err); }
});

// ── PATCH /api/users/me/profile — update own profile ─────────────────────────
router.patch("/me/profile", authenticate, [
  body("name").optional().trim().isLength({ min: 2, max: 100 }),
  body("phone").optional().isMobilePhone(),
  body("postOffice").optional().trim().isLength({ max: 200 }),
  body("avatar").optional().trim().isLength({ max: 10 }),  // initials/emoji
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { name, phone, postOffice, avatar } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(postOffice !== undefined && { postOffice }),
        ...(avatar !== undefined && { avatar }),
      },
      include: { state: true, department: true },
    });

    res.json({ user });
  } catch (err) { next(err); }
});

// ── GET /api/users/me/channels — channels the current user belongs to ─────────
router.get("/me/channels", authenticate, async (req, res, next) => {
  try {
    const memberships = await prisma.channelMember.findMany({
      where: { userId: req.user.id },
      include: {
        channel: {
          include: {
            state: { select: { name: true, slug: true } },
            department: { select: { name: true, slug: true } },
            _count: { select: { messages: true, members: true } },
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });
    res.json({ channels: memberships.map(m => ({ ...m.channel, membership: { isAdmin: m.isAdmin, isMuted: m.isMuted, lastReadAt: m.lastReadAt } })) });
  } catch (err) { next(err); }
});

// ── GET /api/users/setup/states-departments — for registration form ───────────
router.get("/setup/options", async (req, res, next) => {
  try {
    const [states, departments] = await Promise.all([
      prisma.state.findMany({ orderBy: { name: "asc" } }),
      prisma.department.findMany({ orderBy: { name: "asc" } }),
    ]);
    res.json({ states, departments });
  } catch (err) { next(err); }
});

module.exports = router;
