// server/src/socket/voice.js — Phase 4: WebRTC signaling
// Handles peer-to-peer offer/answer/ICE candidate exchange for voice channels

module.exports = function attachVoiceSignaling(io) {
  io.on("connection", (socket) => {
    const userId = socket.user?.id;
    if (!userId) return;

    // ── WebRTC Signaling ────────────────────────────────────────────────────

    // Relay offer from caller to specific peer
    socket.on("voice:offer", ({ to, offer, channelId }) => {
      io.to(`user:${to}`).emit("voice:offer", {
        from: userId,
        fromName: socket.user.name,
        offer,
        channelId,
      });
    });

    // Relay answer back to caller
    socket.on("voice:answer", ({ to, answer, channelId }) => {
      io.to(`user:${to}`).emit("voice:answer", {
        from: userId,
        answer,
        channelId,
      });
    });

    // Relay ICE candidates
    socket.on("voice:ice-candidate", ({ to, candidate, channelId }) => {
      io.to(`user:${to}`).emit("voice:ice-candidate", {
        from: userId,
        candidate,
        channelId,
      });
    });

    // User raised/lowered hand in voice room
    socket.on("voice:hand-raise", ({ channelId, raised }) => {
      socket.to(`channel:${channelId}`).emit("voice:hand-raise", {
        userId, name: socket.user.name, raised,
      });
    });

    // User toggled speaking indicator
    socket.on("voice:speaking", ({ channelId, speaking }) => {
      socket.to(`channel:${channelId}`).emit("voice:speaking", {
        userId, speaking,
      });
    });
  });
};
