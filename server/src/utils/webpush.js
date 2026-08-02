// server/src/utils/webpush.js — Phase 2
const webpush = require("web-push");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:ict@nglosa.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const sendToUser = async (userId, payload) => {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (!subs.length) return;
  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
    )
  );
  const toDelete = [];
  results.forEach((r, i) => {
    if (r.status === "rejected" && [410, 404].includes(r.reason?.statusCode))
      toDelete.push(subs[i].id);
  });
  if (toDelete.length)
    await prisma.pushSubscription.deleteMany({ where: { id: { in: toDelete } } });
};

const sendToUsers = async (userIds, payload) => {
  await Promise.allSettled(userIds.map(id => sendToUser(id, payload)));
};

const createNotification = async ({ userId, title, body, type, url, refId, icon }) => {
  return prisma.notification.create({
    data: { userId, title, body, type, url: url || null, refId: refId || null, icon: icon || null },
  });
};

const buildMessagePayload = (message, channelName) => ({
  title: `#${channelName}`,
  body: message.isAnonymous
    ? `Anonymous: ${message.content.slice(0, 100)}`
    : `${message.author?.name || "Staff"}: ${message.content.slice(0, 100)}`,
  icon: "/icons/icon-192.png",
  badge: "/icons/badge-72.png",
  tag: `channel-${message.channelId}`,
  renotify: false,
  data: { url: `/channel/${message.channelId}`, channelId: message.channelId, messageId: message.id },
});

const buildDMPayload = (dm, senderName) => ({
  title: `💬 ${senderName}`,
  body: dm.content.slice(0, 120),
  icon: "/icons/icon-192.png",
  badge: "/icons/badge-72.png",
  tag: `dm-${dm.senderId}`,
  renotify: true,
  data: { url: `/dm/${dm.senderId}`, dmId: dm.id },
});

const buildAnnouncementPayload = (message) => ({
  title: message.type === "MEMO" ? "📄 New Official Memo" : "📢 New Announcement",
  body: message.content.slice(0, 120),
  icon: "/icons/icon-192.png",
  badge: "/icons/badge-72.png",
  tag: `announcement-${message.id}`,
  requireInteraction: true,
  data: { url: `/channel/${message.channelId}`, channelId: message.channelId, messageId: message.id },
});

const buildJoinDecisionPayload = (channelName, approved) => ({
  title: approved ? "✅ Access Granted" : "❌ Access Denied",
  body: approved
    ? `You have been approved to join #${channelName}`
    : `Your request to join #${channelName} was not approved`,
  icon: "/icons/icon-192.png",
  data: { url: "/", channelName },
});

module.exports = {
  sendToUser, sendToUsers, createNotification,
  buildMessagePayload, buildDMPayload, buildAnnouncementPayload, buildJoinDecisionPayload,
};
