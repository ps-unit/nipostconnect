// client/src/hooks/useVoice.jsx — Phase 4: WebRTC voice channel
import { useState, useEffect, useRef, useCallback } from "react";
import { useSocket } from "../contexts/SocketContext";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function useVoice(channelId) {
  const { socket } = useSocket();
  const { user }   = useAuth();

  const [isInRoom, setIsInRoom]         = useState(false);
  const [isMuted, setIsMuted]           = useState(false);
  const [participants, setParticipants] = useState([]);
  const [speaking, setSpeaking]         = useState(new Set());
  const [raisedHands, setRaisedHands]   = useState(new Set());
  const [error, setError]               = useState(null);

  const localStreamRef = useRef(null);
  const peersRef       = useRef({});   // { userId: RTCPeerConnection }
  const audioRefs      = useRef({});   // { userId: HTMLAudioElement }

  // ── Load current room participants ────────────────────────────────────────
  const loadRoom = useCallback(async () => {
    try {
      const r = await api.get(`/voice/${channelId}`);
      if (r.data.room) {
        setParticipants(r.data.room.participants || []);
      }
    } catch {}
  }, [channelId]);

  useEffect(() => {
    if (channelId) loadRoom();
  }, [channelId, loadRoom]);

  // ── Socket event listeners ────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onRoomStarted = ({ room }) => {
      setParticipants(room.participants || []);
    };
    const onUserJoined = ({ user: u }) => {
      setParticipants(p => p.find(x => x.user?.id === u.id) ? p : [...p, { user: u }]);
      if (isInRoom && u.id !== user.id) createOffer(u.id);
    };
    const onUserLeft = ({ userId: uid }) => {
      setParticipants(p => p.filter(x => x.user?.id !== uid));
      closePeer(uid);
    };
    const onRoomEnded = () => {
      setParticipants([]);
      leaveRoom();
    };
    const onOffer = async ({ from, offer }) => {
      if (!isInRoom) return;
      const pc = getOrCreatePeer(from);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("voice:answer", { to: from, answer, channelId });
    };
    const onAnswer = async ({ from, answer }) => {
      const pc = peersRef.current[from];
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    };
    const onIceCandidate = async ({ from, candidate }) => {
      const pc = peersRef.current[from];
      if (pc && candidate) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
      }
    };
    const onSpeaking = ({ userId: uid, speaking: isSpeaking }) => {
      setSpeaking(s => { const n = new Set(s); isSpeaking ? n.add(uid) : n.delete(uid); return n; });
    };
    const onHandRaise = ({ userId: uid, raised }) => {
      setRaisedHands(h => { const n = new Set(h); raised ? n.add(uid) : n.delete(uid); return n; });
    };
    const onMuteChanged = ({ userId: uid, isMuted: m }) => {
      setParticipants(p => p.map(x => x.user?.id === uid ? { ...x, isMuted: m } : x));
    };

    socket.on("voice:room:started",   onRoomStarted);
    socket.on("voice:user:joined",    onUserJoined);
    socket.on("voice:user:left",      onUserLeft);
    socket.on("voice:room:ended",     onRoomEnded);
    socket.on("voice:offer",          onOffer);
    socket.on("voice:answer",         onAnswer);
    socket.on("voice:ice-candidate",  onIceCandidate);
    socket.on("voice:speaking",       onSpeaking);
    socket.on("voice:hand-raise",     onHandRaise);
    socket.on("voice:mute:changed",   onMuteChanged);

    return () => {
      socket.off("voice:room:started",  onRoomStarted);
      socket.off("voice:user:joined",   onUserJoined);
      socket.off("voice:user:left",     onUserLeft);
      socket.off("voice:room:ended",    onRoomEnded);
      socket.off("voice:offer",         onOffer);
      socket.off("voice:answer",        onAnswer);
      socket.off("voice:ice-candidate", onIceCandidate);
      socket.off("voice:speaking",      onSpeaking);
      socket.off("voice:hand-raise",    onHandRaise);
      socket.off("voice:mute:changed",  onMuteChanged);
    };
  }, [socket, isInRoom, channelId]);

  // ── WebRTC Peer management ─────────────────────────────────────────────────
  const getOrCreatePeer = (peerId) => {
    if (peersRef.current[peerId]) return peersRef.current[peerId];
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks
    localStreamRef.current?.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));

    // ICE candidates
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socket?.emit("voice:ice-candidate", { to: peerId, candidate, channelId });
    };

    // Incoming audio
    pc.ontrack = ({ streams }) => {
      const audio = new Audio();
      audio.srcObject = streams[0];
      audio.autoplay = true;
      audioRefs.current[peerId] = audio;
    };

    peersRef.current[peerId] = pc;
    return pc;
  };

  const createOffer = async (peerId) => {
    const pc = getOrCreatePeer(peerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket?.emit("voice:offer", { to: peerId, offer, channelId });
  };

  const closePeer = (peerId) => {
    peersRef.current[peerId]?.close();
    delete peersRef.current[peerId];
    audioRefs.current[peerId]?.pause();
    delete audioRefs.current[peerId];
  };

  // ── Public actions ─────────────────────────────────────────────────────────
  const joinRoom = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      await api.post(`/voice/${channelId}/join`);
      setIsInRoom(true);
      setIsMuted(false);

      // Create offers for existing participants
      const room = (await api.get(`/voice/${channelId}`)).data.room;
      if (room?.participants) {
        setParticipants(room.participants);
        room.participants
          .filter(p => p.user?.id !== user.id && !p.leftAt)
          .forEach(p => createOffer(p.user.id));
      }
    } catch (err) {
      setError(err.message || "Could not access microphone");
    }
  };

  const leaveRoom = useCallback(async () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    Object.keys(peersRef.current).forEach(closePeer);
    peersRef.current = {};
    try { await api.post(`/voice/${channelId}/leave`); } catch {}
    setIsInRoom(false);
    setIsMuted(false);
    setParticipants([]);
  }, [channelId]);

  const toggleMute = useCallback(async () => {
    if (!localStreamRef.current) return;
    const next = !isMuted;
    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !next; });
    setIsMuted(next);
    try { await api.patch(`/voice/${channelId}/mute`, { isMuted: next }); } catch {}
  }, [isMuted, channelId]);

  const raiseHand = useCallback((raised) => {
    socket?.emit("voice:hand-raise", { channelId, raised });
    raised ? setRaisedHands(h => new Set([...h, user.id])) : setRaisedHands(h => { const n = new Set(h); n.delete(user.id); return n; });
  }, [socket, channelId, user.id]);

  return {
    isInRoom, isMuted, participants, speaking, raisedHands, error,
    joinRoom, leaveRoom, toggleMute, raiseHand, loadRoom,
  };
}
