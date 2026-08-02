// server/src/utils/scheduler.js — Phase 3
// Cron-based scheduler: checks for due messages every minute
const cron = require("node-cron");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

let io = null;

function initScheduler(ioInstance) {
  io = ioInstance;

  // Run every minute: '* * * * *'
  cron.schedule("* * * * *", async () => {
    try {
      const due = await prisma.scheduledMessage.findMany({
        where: { status: "PENDING", scheduledAt: { lte: new Date() } },
        include: { author: { select: { id: true, name: true, role: true } } },
      });

      if (due.length === 0) return;
      console.log(`[Scheduler] Processing ${due.length} scheduled message(s)`);

      await Promise.allSettled(due.map(async (sm) => {
        try {
          // Create the actual message
          const message = await prisma.message.create({
            data: {
              content: sm.content,
              type: sm.type,
              memoRef: sm.memoRef,
              memoTo: sm.memoTo,
              channelId: sm.channelId,
              authorId: sm.authorId,
            },
            include: {
              author: { select: { id: true, name: true, staffId: true, role: true, avatar: true } },
              attachments: true,
              reactions: true,
              _count: { select: { replies: true } },
            },
          });

          // Broadcast via socket
          io?.to(`channel:${sm.channelId}`).emit("message:new", message);

          // Mark scheduled message as sent
          await prisma.scheduledMessage.update({
            where: { id: sm.id },
            data: { status: "SENT", sentAt: new Date() },
          });

          // Trigger push notifications
          const channel = await prisma.channel.findUnique({ where: { id: sm.channelId } });
          if (io?.triggerMessagePush && channel) {
            await io.triggerMessagePush(message, channel);
          }

          console.log(`[Scheduler] Sent: "${sm.content.slice(0, 50)}..." to channel ${sm.channelId}`);
        } catch (err) {
          console.error(`[Scheduler] Failed for ${sm.id}:`, err.message);
          await prisma.scheduledMessage.update({
            where: { id: sm.id },
            data: { status: "FAILED", failReason: err.message },
          });
        }
      }));
    } catch (err) {
      console.error("[Scheduler] Cron error:", err.message);
    }
  });

  console.log("  Scheduler   : ✅ Running (every minute)");
}

module.exports = { initScheduler };
