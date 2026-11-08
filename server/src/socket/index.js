// NiPOST Connect v2 — Socket.io (Phase 1 + Phase 2 push triggers)
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const onlineUsers = new Map(); // userId → Set<socketId>

module.exports = function initSocket(httpServer) {
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://nipostconnect.netlify.app",
    ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",").map(s => s.trim().replace(/\/$/, "")) : []),
  ];

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        const clean = origin.replace(/\/$/, "");
        if (allowedOrigins.includes(clean) || clean.endsWith(".netlify.app")) {
          return cb(null, true);
        }
        return cb(null, true);
      },
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ── Auth ──────────────────────────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error("No token"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, name: true, role: true, stateId: true, departmentId: true },
      });
      if (!user) return next(new Error("User not found"));
      socket.user = user;
      next();
    } catch (err) { next(new Error("Auth failed")); }
  });

  io.on("connection", async (socket) => {
    const { id: userId, name, role } = socket.user;

    // Multi-tab support
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);

    socket.join(`user:${userId}`);
    io.emit("user:online", { userId });
    socket.emit("users:online", Array.from(onlineUsers.keys()));

    // Unread notification count on connect
    try {
      const unread = await prisma.notification.count({ where: { userId, isRead: false } });
      socket.emit("notifications:unread", { count: unread });
    } catch { }

    // Auto-join channel rooms
    try {
      const memberships = await prisma.channelMember.findMany({
        where: { userId }, select: { channelId: true, isAdmin: true },
      });
      memberships.forEach(({ channelId, isAdmin }) => {
        socket.join(`channel:${channelId}`);
        if (isAdmin) socket.join(`channel:${channelId}:admins`);
      });
      if (role === "SUPER_ADMIN") {
        const all = await prisma.channel.findMany({ select: { id: true } });
        all.forEach(ch => socket.join(`channel:${ch.id}`));
      }
    } catch (err) { console.error("[Socket] Channel join error:", err.message); }

    // ── Client events ─────────────────────────────────────────────────────
    socket.on("typing:start", ({ channelId }) =>
      socket.to(`channel:${channelId}`).emit("user:typing", { userId, name, channelId }));
    socket.on("typing:stop", ({ channelId }) =>
      socket.to(`channel:${channelId}`).emit("user:stopTyping", { userId, channelId }));
    socket.on("dm:typing", ({ receiverId }) =>
      socket.to(`user:${receiverId}`).emit("dm:typing", { senderId: userId, name }));
    socket.on("dm:stopTyping", ({ receiverId }) =>
      socket.to(`user:${receiverId}`).emit("dm:stopTyping", { senderId: userId }));
    socket.on("channel:join", id => socket.join(`channel:${id}`));
    socket.on("channel:leave", id => socket.leave(`channel:${id}`));
    socket.on("messages:read", async ({ channelId }) => {
      try {
        await prisma.channelMember.update({
          where: { userId_channelId: { userId, channelId } },
          data: { lastReadAt: new Date() },
        });
      } catch { }
    });
    socket.on("heartbeat", async () => {
      try { await prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } }); } catch { }
    });
    socket.on("notification:read", async ({ notificationId }) => {
      try {
        await prisma.notification.updateMany({ where: { id: notificationId, userId }, data: { isRead: true } });
        const unread = await prisma.notification.count({ where: { userId, isRead: false } });
        socket.emit("notifications:unread", { count: unread });
      } catch { }
    });
    socket.on("notifications:markAllRead", async () => {
      try {
        await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
        socket.emit("notifications:unread", { count: 0 });
      } catch { }
    });

    // ── Disconnect ────────────────────────────────────────────────────────
    socket.on("disconnect", async () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          io.emit("user:offline", { userId });
        }
      }
      try { await prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } }); } catch { }
      console.log(`[Socket] ${name} disconnected`);
    });
  });

  // ── Phase 2: Push notification triggers (called by routes) ────────────────
  io.triggerMessagePush = async (message, channel) => {
    if (!process.env.VAPID_PUBLIC_KEY) return; // push not configured
    try {
      const { sendToUsers, buildMessagePayload, buildAnnouncementPayload } = require("./src/utils/webpush");
      const onlineIds = Array.from(onlineUsers.keys());
      const offlineMembers = await prisma.channelMember.findMany({
        where: { channelId: message.channelId, isMuted: false, userId: { notIn: [message.authorId, ...onlineIds] } },
        select: { userId: true },
      });
      if (!offlineMembers.length) return;
      const payload = ["ANNOUNCEMENT", "MEMO"].includes(message.type)
        ? buildAnnouncementPayload(message) : buildMessagePayload(message, channel.name);
      const userIds = offlineMembers.map(m => m.userId);
      await sendToUsers(userIds, payload);
      const notifType = message.type === "ANNOUNCEMENT" ? "NEW_ANNOUNCEMENT"
        : message.type === "MEMO" ? "NEW_MEMO" : "NEW_MESSAGE";
      await prisma.notification.createMany({
        data: userIds.map(uid => ({
          userId: uid, title: payload.title, body: payload.body,
          type: notifType, url: payload.data?.url || `/channel/${message.channelId}`, refId: message.id,
        })),
        skipDuplicates: true,
      });
      // Notify online members who aren't in the channel
      onlineIds.filter(id => id !== message.authorId).forEach(uid => {
        io.to(`user:${uid}`).emit("notification:new", {
          title: payload.title, body: payload.body, type: notifType, channelId: message.channelId,
        });
      });
    } catch (err) { console.error("[Push] Error:", err.message); }
  };

  io.triggerDMPush = async (dm) => {
    if (!process.env.VAPID_PUBLIC_KEY) return;
    try {
      const { sendToUser, buildDMPayload } = require("./src/utils/webpush");
      const isOnline = onlineUsers.has(dm.receiverId);
      if (!isOnline) await sendToUser(dm.receiverId, buildDMPayload(dm, dm.sender?.name || "Staff"));
      await prisma.notification.create({
        data: {
          userId: dm.receiverId, title: `💬 ${dm.sender?.name || "Staff"}`,
          body: dm.content.slice(0, 100), type: "DIRECT_MESSAGE", url: `/dm/${dm.senderId}`, refId: dm.id
        },
      });
      const unread = await prisma.notification.count({ where: { userId: dm.receiverId, isRead: false } });
      io.to(`user:${dm.receiverId}`).emit("notifications:unread", { count: unread });
    } catch (err) { console.error("[Push] DM error:", err.message); }
  };

  io.getOnlineUsers = () => Array.from(onlineUsers.keys());
  return io;
};
