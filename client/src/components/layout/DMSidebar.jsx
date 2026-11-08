// src/components/layout/DMSidebar.jsx
import { useState, useEffect } from "react";
import { dmsAPI } from "../../services/api";
import { useSocket } from "../../contexts/SocketContext";
import { colors, resolveUploadUrl } from "../shared/styles";

function Avatar({ name = "", avatarUrl = null, size = 32 }) {
  const [imgErr, setImgErr] = useState(false);
  const resolved = resolveUploadUrl(avatarUrl);
  if (resolved && !imgErr) {
    return (
      <img
        src={resolved}
        alt={name}
        onError={() => setImgErr(true)}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, display: "block" }}
      />
    );
  }
  const initials = name.split(" ").slice(0, 2).map(w => w[0] || "").join("").toUpperCase();
  const COLORS = ["#C9952A","#1A6B4A","#8B2252","#1A4A8B","#5C3A1E","#2A5C8B","#8B4513","#2C5F2E"];
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: COLORS[Math.abs(h) % COLORS.length], display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.36, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
      {initials}
    </div>
  );
}

export default function DMSidebar({ activeDMUserId, onSelectDM, isMobile }) {
  const { isOnline, on } = useSocket();
  const [convos, setConvos] = useState([]);

  useEffect(() => {
    dmsAPI.conversations()
      .then(r => setConvos(r.data.conversations))
      .catch(() => {});
  }, []);

  useEffect(() => {
    return on("dm:new", () => {
      dmsAPI.conversations().then(r => setConvos(r.data.conversations)).catch(() => {});
    });
  }, [on]);

  return (
    <div style={{
      width: isMobile ? "100%" : 240,
      background: colors.surface,
      borderRight: isMobile ? "none" : `1px solid ${colors.borderDim}`,
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      height: "100%",
    }}>
      <div style={{ padding: "14px 12px 10px", borderBottom: `1px solid ${colors.borderDim}` }}>
        <div style={{ color: colors.text, fontWeight: 700, fontSize: 15 }}>Direct Messages</div>
        <div style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>{convos.length} conversation{convos.length !== 1 ? "s" : ""}</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px" }}>
        {convos.length === 0 && (
          <div style={{ textAlign: "center", padding: 32, color: colors.ghost, fontSize: 13 }}>No conversations yet</div>
        )}
        {convos.map(c => {
          const active = activeDMUserId === c.partner.id;
          const online = isOnline(c.partner.id);
          return (
            <button key={c.partner.id} onClick={() => onSelectDM(c.partner.id)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px", borderRadius: 8, border: "none", background: active ? colors.goldDim : "transparent", cursor: "pointer", marginBottom: 2, textAlign: "left" }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
              <div style={{ position: "relative" }}>
                <Avatar name={c.partner.name} avatarUrl={c.partner.avatarUrl} size={36} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: online ? "#22C55E" : colors.ghost, border: `2px solid ${colors.surface}`, position: "absolute", bottom: -1, right: -1 }} />
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ color: active ? colors.text : colors.textMid, fontSize: 13, fontWeight: active ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.partner.name}
                </div>
                <div style={{ color: colors.ghost, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.lastMessage?.content?.slice(0, 40) || ""}
                </div>
              </div>
              {c.unreadCount > 0 && (
                <span style={{ fontSize: 10, background: colors.gold, color: "#0A1F44", borderRadius: 10, padding: "1px 6px", fontWeight: 700, flexShrink: 0 }}>
                  {c.unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
