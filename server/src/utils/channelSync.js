// server/src/utils/channelSync.js
// Synchronizes a user's channel memberships whenever their role, state, or department changes.

async function syncUserChannelMemberships(prisma, user, io = null) {
  if (!user || !user.id) return;

  try {
    if (user.role === "SUPER_ADMIN") {
      const allChannels = await prisma.channel.findMany({
        where: { isArchived: false },
        select: { id: true },
      });

      if (allChannels.length > 0) {
        await prisma.channelMember.createMany({
          data: allChannels.map(ch => ({
            userId: user.id,
            channelId: ch.id,
            isAdmin: true,
          })),
          skipDuplicates: true,
        });

        await prisma.channelMember.updateMany({
          where: { userId: user.id },
          data: { isAdmin: true },
        });

        if (io) {
          allChannels.forEach(ch => {
            io.in(`user:${user.id}`).socketsJoin(`channel:${ch.id}`);
            io.in(`user:${user.id}`).socketsJoin(`channel:${ch.id}:admins`);
          });
        }
      }
      return;
    }

    // For STATE_ADMIN, DEPT_ADMIN, or STAFF:
    // 1. Ensure membership in open national channels
    const openChannels = await prisma.channel.findMany({
      where: {
        isArchived: false,
        isLocked: false,
        type: { in: ["ANNOUNCEMENT", "SUGGESTION", "GENERAL", "EMERGENCY"] },
      },
      select: { id: true },
    });

    if (openChannels.length > 0) {
      await prisma.channelMember.createMany({
        data: openChannels.map(ch => ({
          userId: user.id,
          channelId: ch.id,
          isAdmin: false,
        })),
        skipDuplicates: true,
      });
    }

    // 2. Ensure membership in user's assigned State channel
    if (user.stateId) {
      const stateChannels = await prisma.channel.findMany({
        where: { stateId: user.stateId, isArchived: false },
        select: { id: true },
      });
      const isStateAdmin = user.role === "STATE_ADMIN";
      for (const ch of stateChannels) {
        await prisma.channelMember.upsert({
          where: { userId_channelId: { userId: user.id, channelId: ch.id } },
          update: { isAdmin: isStateAdmin },
          create: { userId: user.id, channelId: ch.id, isAdmin: isStateAdmin },
        });
        if (io) {
          io.in(`user:${user.id}`).socketsJoin(`channel:${ch.id}`);
          if (isStateAdmin) io.in(`user:${user.id}`).socketsJoin(`channel:${ch.id}:admins`);
        }
      }
    }

    // 3. Ensure membership in user's assigned Department channel
    if (user.departmentId) {
      const deptChannels = await prisma.channel.findMany({
        where: { departmentId: user.departmentId, isArchived: false },
        select: { id: true },
      });
      const isDeptAdmin = user.role === "DEPT_ADMIN";
      for (const ch of deptChannels) {
        await prisma.channelMember.upsert({
          where: { userId_channelId: { userId: user.id, channelId: ch.id } },
          update: { isAdmin: isDeptAdmin },
          create: { userId: user.id, channelId: ch.id, isAdmin: isDeptAdmin },
        });
        if (io) {
          io.in(`user:${user.id}`).socketsJoin(`channel:${ch.id}`);
          if (isDeptAdmin) io.in(`user:${user.id}`).socketsJoin(`channel:${ch.id}:admins`);
        }
      }
    }
  } catch (err) {
    console.warn("[channelSync] Failed to sync channel memberships:", err.message);
  }
}

module.exports = { syncUserChannelMemberships };
