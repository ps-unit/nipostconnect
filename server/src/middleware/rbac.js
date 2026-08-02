// middleware/rbac.js — Role-Based Access Control
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const ROLE_HIERARCHY = { SUPER_ADMIN: 4, STATE_ADMIN: 3, DEPT_ADMIN: 2, STAFF: 1 };

// Require minimum role level
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Unauthenticated" });
  const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
  const requiredLevel = Math.max(...roles.map(r => ROLE_HIERARCHY[r] || 0));
  if (userLevel < requiredLevel) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  next();
};

const isSuperAdmin  = requireRole("SUPER_ADMIN");
const isStateAdmin  = requireRole("STATE_ADMIN");
const isDeptAdmin   = requireRole("DEPT_ADMIN");
const isAdmin       = requireRole("STATE_ADMIN", "DEPT_ADMIN", "SUPER_ADMIN");

// Check channel membership & optionally channel-level admin
const requireChannelAccess = (adminOnly = false) => async (req, res, next) => {
  try {
    const channelId = req.params.channelId || req.body.channelId;
    const userId = req.user.id;

    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) return res.status(404).json({ error: "Channel not found" });

    // Super admin bypasses all channel checks
    if (req.user.role === "SUPER_ADMIN") {
      req.channel = channel;
      return next();
    }

    const membership = await prisma.channelMember.findUnique({
      where: { userId_channelId: { userId, channelId } },
    });

    if (!membership) {
      return res.status(403).json({ error: "You are not a member of this channel", code: "NOT_MEMBER" });
    }

    if (adminOnly && !membership.isAdmin) {
      return res.status(403).json({ error: "Channel admin role required" });
    }

    req.channel = channel;
    req.membership = membership;
    next();
  } catch (err) {
    next(err);
  }
};

// Enforce read-only channel: only admins can post
const enforceReadOnly = async (req, res, next) => {
  if (!req.channel) return next();
  if (!req.channel.isReadOnly) return next();

  const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
  if (userLevel < ROLE_HIERARCHY.DEPT_ADMIN) {
    return res.status(403).json({ error: "This channel is read-only. Only admins can post." });
  }
  next();
};

module.exports = { requireRole, isSuperAdmin, isStateAdmin, isDeptAdmin, isAdmin, requireChannelAccess, enforceReadOnly };
