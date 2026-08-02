// src/contexts/SocketContext.jsx
import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [onlineUsers, setOnlineUsers]         = useState(new Set());
  const [connected, setConnected]             = useState(false);
  const listenersRef = useRef({});

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const socket = io(window.location.origin, {
      auth: { token },
      transports: ["websocket"],
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    socket.on("connect",    () => { setConnected(true);  console.log("[Socket] Connected"); });
    socket.on("disconnect", () => { setConnected(false); console.log("[Socket] Disconnected"); });

    socket.on("users:online", (ids) => setOnlineUsers(new Set(ids)));
    socket.on("user:online",  ({ userId }) => setOnlineUsers(s => new Set([...s, userId])));
    socket.on("user:offline", ({ userId }) => setOnlineUsers(s => { const n = new Set(s); n.delete(userId); return n; }));

    // Heartbeat every 30s
    const hb = setInterval(() => { if (socket.connected) socket.emit("heartbeat"); }, 30000);

    return () => {
      clearInterval(hb);
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [user]);

  // ── Emit helpers ─────────────────────────────────────────────────────────
  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  const joinChannel = useCallback((channelId) => {
    socketRef.current?.emit("channel:join", channelId);
  }, []);

  const leaveChannel = useCallback((channelId) => {
    socketRef.current?.emit("channel:leave", channelId);
  }, []);

  const startTyping = useCallback((channelId) => {
    socketRef.current?.emit("typing:start", { channelId });
  }, []);

  const stopTyping = useCallback((channelId) => {
    socketRef.current?.emit("typing:stop", { channelId });
  }, []);

  // ── Subscribe to socket events ────────────────────────────────────────────
  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler);
    return () => socketRef.current?.off(event, handler);
  }, []);

  const isOnline = useCallback((userId) => onlineUsers.has(userId), [onlineUsers]);

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      connected,
      onlineUsers,
      emit, on,
      joinChannel, leaveChannel,
      startTyping, stopTyping,
      isOnline,
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used within SocketProvider");
  return ctx;
};
