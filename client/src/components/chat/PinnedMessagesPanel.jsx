
// client/src/components/chat/PinnedMessagesPanel.jsx — Phase 7
import { useState, useEffect } from "react";
import { channelsAPI } from "../../services/api";
import { format } from "date-fns";

const C = {
  surface:"#081A35", surfaceAlt:"#0D2244", border:"#1E3A5F",
  gold:"#D4A843", text:"#E8EDF5", muted:"#6B8299", textMid:"#B0BDD0", ghost:"#2E4A6B",
};
const MSG_TYPE_BAR = {
  ANNOUNCEMENT:"#D4A843", MEMO:"#7C3AED", MESSAGE:"#1E3A5F",
  SUGGESTION:"#22C55E", POLL:"#2563EB",
};

export default function PinnedMessagesPanel({ channelId, channelName, onClose, onJumpTo, isMobile }) {
  const [pinned, setPinned] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!channelId) return;
    setLoading(true);
    channelsAPI.pinned(channelId)
      .then(r => setPinned(r.data.pinned || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [channelId]);

  return (
    <div
      className={isMobile ? "animate-slide-right" : ""}
      style={{
        width: isMobile ? "100%" : 340,
        position: isMobile ? "fixed" : "relative",
        inset: isMobile ? 0 : "auto",
        zIndex: isMobile ? 350 : "auto",
        borderLeft: isMobile ? "none" : `1px solid ${C.border}`,
        display: "flex",
        flexDirection: "column",
        background: C.surface,
        flexShrink: 0,
        height: "100%",
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
            <div style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>📌 Pinned Messages</div>
            <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>
              #{channelName} · {pinned.length} pinned
            </div>
          </div>
        </div>
        <button onClick={onClose}
          style={{ background: "none", border: "none", color: C.muted, fontSize: 18, cursor: "pointer", padding: "4px 8px" }}>✕</button>
      </div>

      {/* List */}
      <div style={{ flex:1, overflowY:"auto" }}>
        {loading && (
          <div style={{ textAlign:"center", padding:32, color:C.muted, fontSize:13 }}>Loading...</div>
        )}
        {!loading && pinned.length === 0 && (
          <div style={{ textAlign:"center", padding:"40px 20px", color:C.ghost }}>
            <div style={{ fontSize:36, marginBottom:10 }}>📌</div>
            <div style={{ fontSize:14, color:C.muted, marginBottom:6 }}>No pinned messages</div>
            <div style={{ fontSize:12 }}>
              Pin important messages by hovering and clicking 📌
            </div>
          </div>
        )}
        {pinned.map((p, i) => {
          const msg  = p.message;
          const bar  = MSG_TYPE_BAR[msg?.type] || C.border;
          const name = msg?.isAnonymous ? "Anonymous" : (msg?.author?.name || "Unknown");
          return (
            <div key={p.id}
              onClick={() => onJumpTo?.(msg.id)}
              style={{ padding:"12px 16px",
                borderBottom:`1px solid ${C.border}`,
                borderLeft:`3px solid ${bar}`,
                cursor:"pointer", transition:"background 0.1s" }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.03)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>

              {/* Pin meta */}
              <div style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", marginBottom:6 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:11, padding:"2px 7px", borderRadius:8,
                    background:`${bar}22`, color:bar, fontWeight:700 }}>
                    {msg?.type}
                  </span>
                  <span style={{ color:C.ghost, fontSize:11 }}>
                    Pinned by {p.pinnedBy?.name}
                  </span>
                </div>
                <span style={{ color:C.ghost, fontSize:10 }}>
                  {format(new Date(p.pinnedAt), "d MMM")}
                </span>
              </div>

              {/* Author */}
              <div style={{ color:C.text, fontWeight:600, fontSize:13, marginBottom:4 }}>
                {name}
                <span style={{ color:C.ghost, fontWeight:400, fontSize:11, marginLeft:8 }}>
                  {format(new Date(msg?.createdAt || p.pinnedAt), "d MMM, h:mm a")}
                </span>
              </div>

              {/* Content */}
              <div style={{ color:C.textMid, fontSize:13, lineHeight:1.5,
                overflow:"hidden", display:"-webkit-box",
                WebkitLineClamp:3, WebkitBoxOrient:"vertical" }}>
                {msg?.content}
              </div>

              {/* Jump link */}
              <div style={{ marginTop:8, fontSize:11, color:C.gold }}>
                Jump to message →
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
