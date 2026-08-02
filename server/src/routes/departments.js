// server/src/routes/departments.js — Phase 5
const express = require("express");
const { body, validationResult } = require("express-validator");
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");
const { isAdmin, isSuperAdmin } = require("../middleware/rbac");

const router = express.Router();
const prisma = new PrismaClient();

// ── GET /api/departments — list all ──────────────────────────────────────────
router.get("/", authenticate, async (req, res, next) => {
  try {
    const { includeArchived = "false" } = req.query;
    const departments = await prisma.department.findMany({
      where: includeArchived === "true" ? {} : { isArchived: { not: true } },
      include: {
        _count: { select: { users: true, channels: true } },
        channels: {
          where: { type: "DEPARTMENT" },
          select: { id: true, name: true, slug: true, isArchived: true },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    });
    res.json({ departments });
  } catch (err) { next(err); }
});

// ── GET /api/departments/:id — single department ──────────────────────────────
router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const dept = await prisma.department.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { users: true } },
        users: {
          select: { id:true, name:true, staffId:true, role:true, lastSeenAt:true },
          take: 20,
        },
        channels: {
          where: { type: "DEPARTMENT" },
          select: { id:true, name:true, slug:true, _count:{ select:{ members:true, messages:true } } },
        },
      },
    });
    if (!dept) return res.status(404).json({ error: "Department not found" });
    res.json({ department: dept });
  } catch (err) { next(err); }
});

// ── POST /api/departments — create department (admin+) ────────────────────────
router.post("/", authenticate, isAdmin, [
  body("name").trim().isLength({ min: 2, max: 100 }),
  body("slug").optional().trim().matches(/^[a-z0-9-]+$/),
  body("description").optional().trim().isLength({ max: 300 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { name, description } = req.body;
    const slug = req.body.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    // Check uniqueness
    const existing = await prisma.department.findFirst({
      where: { OR: [{ name }, { slug }] },
    });
    if (existing) {
      return res.status(409).json({ error: "A department with this name or slug already exists" });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create department
      const dept = await tx.department.create({
        data: { name, slug, description: description || null },
      });

      // Auto-create department channel
      const channelSlug = `dept-${slug}`;
      const channel = await tx.channel.create({
        data: {
          name: `${slug}-dept`,
          slug: channelSlug,
          type: "DEPARTMENT",
          description: description || `${name} department channel`,
          departmentId: dept.id,
          createdById: req.user.id,
        },
      });

      // Add creator as channel admin
      await tx.channelMember.create({
        data: { userId: req.user.id, channelId: channel.id, isAdmin: true },
      });

      // Audit log
      await tx.auditLog.create({
        data: { adminId: req.user.id, action: "DEPARTMENT_CREATED",
          target: dept.id, meta: { name, slug } },
      });

      return { dept, channel };
    });

    // Broadcast new channel to all connected clients
    const io = req.app.get("io");
    io?.emit("channel:created", result.channel);

    res.status(201).json({ department: result.dept, channel: result.channel });
  } catch (err) { next(err); }
});

// ── PATCH /api/departments/:id — update department ────────────────────────────
router.patch("/:id", authenticate, isAdmin, [
  body("name").optional().trim().isLength({ min: 2, max: 100 }),
  body("description").optional().trim().isLength({ max: 300 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { name, description } = req.body;

    // Check name uniqueness if changing
    if (name) {
      const existing = await prisma.department.findFirst({
        where: { name, id: { not: req.params.id } },
      });
      if (existing) return res.status(409).json({ error: "Department name already taken" });
    }

    const dept = await prisma.department.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
    });

    // Also update the department channel description
    if (description !== undefined) {
      await prisma.channel.updateMany({
        where: { departmentId: req.params.id, type: "DEPARTMENT" },
        data: { description },
      });
    }

    await prisma.auditLog.create({
      data: { adminId: req.user.id, action: "DEPARTMENT_UPDATED",
        target: dept.id, meta: { name, description } },
    });

    res.json({ department: dept });
  } catch (err) { next(err); }
});

// ── DELETE /api/departments/:id — archive (super admin only) ──────────────────
router.delete("/:id", authenticate, isSuperAdmin, async (req, res, next) => {
  try {
    const dept = await prisma.department.findUnique({ where: { id: req.params.id } });
    if (!dept) return res.status(404).json({ error: "Department not found" });

    await prisma.$transaction(async (tx) => {
      // Archive the department's channel(s)
      await tx.channel.updateMany({
        where: { departmentId: req.params.id },
        data: { isArchived: true },
      });
      // Mark dept archived (add isArchived if not on model yet, or use a flag)
      await tx.auditLog.create({
        data: { adminId: req.user.id, action: "DEPARTMENT_ARCHIVED",
          target: req.params.id, meta: { name: dept.name } },
      });
    });

    res.json({ message: `Department "${dept.name}" archived` });
  } catch (err) { next(err); }
});

// ── POST /api/departments/:id/assign-user — assign user to department ─────────
router.post("/:id/assign-user", authenticate, isAdmin, [
  body("userId").isUUID(),
], async (req, res, next) => {
  try {
    const { userId } = req.body;

    const [dept, user] = await Promise.all([
      prisma.department.findUnique({ where: { id: req.params.id } }),
      prisma.user.findUnique({ where: { id: userId } }),
    ]);
    if (!dept) return res.status(404).json({ error: "Department not found" });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Update user's department
    await prisma.user.update({
      where: { id: userId },
      data: { departmentId: req.params.id },
    });

    // Auto-join department channel
    const deptChannel = await prisma.channel.findFirst({
      where: { departmentId: req.params.id, type: "DEPARTMENT" },
    });
    if (deptChannel) {
      await prisma.channelMember.upsert({
        where: { userId_channelId: { userId, channelId: deptChannel.id } },
        update: {},
        create: { userId, channelId: deptChannel.id },
      });
    }

    await prisma.auditLog.create({
      data: { adminId: req.user.id, action: "USER_ASSIGNED_TO_DEPARTMENT",
        target: req.params.id, meta: { userId, userName: user.name, deptName: dept.name } },
    });

    res.json({ message: `${user.name} assigned to ${dept.name}` });
  } catch (err) { next(err); }
});

module.exports = router;
