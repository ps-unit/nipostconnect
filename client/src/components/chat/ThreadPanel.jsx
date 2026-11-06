// client/src/components/chat/ThreadPanel.jsx — Phase 7
// Slide-in thread view for replying to a specific message
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";
import { messagesAPI } from "../../services/api";
import { resolveUploadUrl } from "../shared/styles";
import { format } from "date-fns";

const C = {
  bg:"#081832", surface:"#081A35", surfaceAlt:"#0D2244", border:"#1E3A5F",
  gold:"#D4A843", text:"#E8EDF5", muted:"#6B8299", textMid:"#B0BDD0", ghost:"#2E4A6B",
};

function Avatar({ name="", avatarUrl=null, size=32 }) {
  const [imgErr, setImgErr] = useState(false);
  const resolved = resolveUploadUrl(avatarUrl);
  if (resolved && !imgErr) {
    return (
      <img
        src={resolved}
        alt={name}
        onError={() => setImgErr(true)}
        style={{ width:size, height:size, borderRadius:"50%", objectFit:"cover", flexShrink:0, display:"block" }}
      />
    );
  }
  const initials = name.split(" ").slice(0,2).map(w=>w[0]||"").join("").toUpperCase();
  const COLORS = ["#C9952A","#1A6B4A","#8B2252","#1A4A8B","#2A5C8B","#8B4513","#2C5F2E"];
  let h=0; for(let i=0;i<name.length;i++) h=name.charCodeAt(i)+((h<<5)-h);
  return (
    <div style={{ width:size, height:size, borderRadius:"50%",
      background:COLORS[Math.abs(h)%COLORS.length],
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:size*0.36, fontWeight:700, color:"#fff", flexShrink:0 }}>
      {initials}
    </div>
  );
}

function ReplyBubble({ msg }) {
  const name = msg.isAnonymous ? "Anonymous" : (msg.author?.name || "Unknown");
  const avatarUrl = msg.isAnonymous ? null : msg.author?.avatarUrl;
  return (
    <div style={{ display:"flex", gap:10, padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
      <Avatar name={name} avatarUrl={avatarUrl} size={32} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
          <span style={{ color:C.text, fontWeight:600, fontSize:13 }}>{name}</span>
          <span style={{ color:C.ghost, fontSize:11 }}>
            {format(new Date(msg.createdAt), "d MMM, h:mm a")}
          </span>
          {msg.editedAt && <span style={{ color:C.ghost, fontSize:10, fontStyle:"italic" }}>(edited)</span>}
        </div>
        <div style={{ color:C.textMid, fontSize:13, lineHeight:1.6,
          whiteSpace:"pre-line", wordBreak:"break-word" }}>
          {msg.deletedAt ? <em style={{ color:C.ghost }}>[deleted]</em> : msg.content}
        </div>
      </div>
    </div>
  );
}

export default function ThreadPanel({ parentMessage, channelId, onClose, isMobile }) {
  const { user }   = useAuth();
  const { on }     = useSocket();
  const [replies, setReplies] = useState([]);
  const [input, setInput]     = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef();

  // Load replies
  useEffect(() => {
    if (!parentMessage?.id) return;
    messagesAPI.list(channelId, { parentId: parentMessage.id, limit: 100 })
      .then(r => setReplies(r.data.messages || []))
      .catch(() => {});
  }, [parentMessage?.id, channelId]);

  // Listen for new replies
  useEffect(() => {
    return on("message:new", msg => {
      if (msg.parentId === parentMessage?.id) {
        setReplies(r => [...r.filter(x => x.id !== msg.id), msg]);
      }
    });
  }, [on, parentMessage?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies]);

  const sendReply = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await messagesAPI.send(channelId, {
        content: input.trim(),
        parentId: parentMessage.id,
        type: "MESSAGE",
      });
      setInput("");
    } catch (e) {
      alert(e.response?.data?.error || "Failed to send reply");
    } finally { setSending(false); }
  };

  const handleKeyDown = e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); }
  };

  if (!parentMessage) return null;

  return (
    <div
      className={isMobile ? "animate-slide-right" : ""}
      style={{
        width: isMobile ? "100%" : 360,
        position: isMobile ? "fixed" : "relative",
        inset: isMobile ? 0 : "auto",
        zIndex: isMobile ? 350 : "auto",
        borderLeft: isMobile ? "none" : `1px solid ${C.border}`,
        display: "flex",
        flexDirection: "column",
        background: C.surface,
        flexShrink: 0,
        height: "100%",
        paddingBottom: isMobile ? "calc(56px + var(--safe-bottom, 0px))" : 0,
      }}
    >

      {/* Header */}
      <div style={{
        padding: "14px 16px", borderBottom: `1px solid ${C.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isMobile && (
            <button
              onClick={onClose}
              style={{
                background: "none", border: "none", color: C.gold, cursor: "pointer",
                fontSize: 16, fontWeight: 700, padding: "4px 8px 4px 0",
              }}
            >
              ‹ Back
            </button>
          )}
          <div>
            <div style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>🧵 Thread</div>
            <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>
              {replies.length} {replies.length === 1 ? "reply" : "replies"}
            </div>
          </div>
        </div>
        <button onClick={onClose}
          style={{ background: "none", border: "none", color: C.muted,
            fontSize: 18, cursor: "pointer", padding: "4px 8px" }}>✕</button>
      </div>

      {/* Original message */}
      <div style={{ padding:"12px 16px", background:C.surfaceAlt,
        borderBottom:`1px solid ${C.border}` }}>
        <div style={{ fontSize:11, color:C.ghost, marginBottom:6, fontWeight:600, letterSpacing:"0.05em" }}>
          ORIGINAL MESSAGE
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <Avatar name={parentMessage.author?.name || "?"} avatarUrl={parentMessage.author?.avatarUrl} size={28} />
          <div>
            <div style={{ color:C.text, fontWeight:600, fontSize:13, marginBottom:3 }}>
              {parentMessage.isAnonymous ? "Anonymous" : parentMessage.author?.name}
            </div>
            <div style={{ color:C.textMid, fontSize:13, lineHeight:1.5, whiteSpace:"pre-line" }}>
              {parentMessage.content}
            </div>
          </div>
        </div>
      </div>

      {/* Replies */}
      <div style={{ flex:1, overflowY:"auto", padding:"0 16px" }}>
        {replies.length === 0 ? (
          <div style={{ textAlign:"center", padding:"32px 16px", color:C.ghost, fontSize:13 }}>
            No replies yet. Be the first to reply.
          </div>
        ) : (
          replies.map(r => <ReplyBubble key={r.id} msg={r} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Compose reply */}
      <div style={{
        padding: "10px 12px",
        borderTop: `1px solid ${C.border}`,
      }}>
        <div style={{ display:"flex", gap:8, alignItems:"flex-end",
          background:C.surfaceAlt, borderRadius:10,
          border:`1px solid ${C.border}`, padding:"0 12px" }}>
          <textarea value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Reply in thread..."
            rows={1} style={{ flex:1, background:"none", border:"none",
              color:C.text, fontSize: isMobile ? 16 : 13, padding:"10px 0",
              resize:"none", outline:"none", fontFamily:"'DM Sans',sans-serif",
              maxHeight:100, overflowY:"auto" }} />
          <button onClick={sendReply} disabled={!input.trim() || sending}
            style={{ padding:"6px 12px", borderRadius:7, border:"none", marginBottom:4,
              background:input.trim()&&!sending ? C.gold : C.border,
              color:input.trim()&&!sending ? "#0A1F44" : C.ghost,
              fontWeight:700, cursor:input.trim()&&!sending?"pointer":"default",
              fontSize:14, flexShrink:0 }}>
            ↑
          </button>
        </div>
        <div style={{ fontSize:11, color:C.ghost, marginTop:5 }}>
          ↵ Enter to send · Shift+↵ for new line
        </div>
      </div>
    </div>
  );
}
