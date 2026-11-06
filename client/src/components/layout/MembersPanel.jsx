// src/components/layout/MembersPanel.jsx
import { useState, useEffect } from "react";
import { channelsAPI } from "../../services/api";
import { useSocket } from "../../contexts/SocketContext";
import { colors, ROLE_BADGE, resolveUploadUrl } from "../shared/styles";

function Avatar({ name = "", avatarUrl = null, size = 28 }) {
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
  const bg = COLORS[Math.abs(h) % COLORS.length];
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.36, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
      {initials}
    </div>
  );
}

export default function MembersPanel({ channelId, onClose, isMobile }) {
  const { isOnline } = useSocket();
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (!channelId) return;
    channelsAPI.members(channelId)
      .then(r => setMembers(r.data.members))
      .catch(() => {});
  }, [channelId]);

  const roleOrder = { SUPER_ADMIN: 0, STATE_ADMIN: 1, DEPT_ADMIN: 2, STAFF: 3 };
  const grouped = {};
  members.forEach(m => {
    const r = m.user.role;
    if (!grouped[r]) grouped[r] = [];
    grouped[r].push(m);
  });

  return (
    <div
      className={isMobile ? "animate-slide-right" : ""}
      style={{
        width: isMobile ? "100%" : 220,
        position: isMobile ? "fixed" : "relative",
        inset: isMobile ? 0 : "auto",
        zIndex: isMobile ? 350 : "auto",
        background: colors.surface,
        borderLeft: isMobile ? "none" : `1px solid ${colors.borderDim}`,
        padding: isMobile ? "16px 14px calc(70px + var(--safe-bottom, 0px))" : "14px 10px",
        overflowY: "auto",
        flexShrink: 0,
        height: "100%",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {isMobile && onClose && (
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", color: colors.gold, cursor: "pointer", fontSize: 14, fontWeight: 700, padding: "2px 6px 2px 0" }}
            >
              ‹ Back
            </button>
          )}
          <div style={{ color: colors.muted, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em" }}>
            MEMBERS — {members.length}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: colors.muted, cursor: "pointer", fontSize: 16, padding: "2px 6px" }}
          >
            ✕
          </button>
        )}
      </div>
      {Object.keys(grouped).sort((a, b) => roleOrder[a] - roleOrder[b]).map(role => (
        <div key={role} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: colors.ghost, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 5 }}>
            {role.replace("_", " ")} — {grouped[role].length}
          </div>
          {grouped[role].map(m => {
            const online = isOnline(m.user.id);
            return (
              <div key={m.id}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 6px", borderRadius: 6, cursor: "pointer", marginBottom: 2 }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div style={{ position: "relative" }}>
                  <Avatar name={m.user.name} avatarUrl={m.user.avatarUrl} size={28} />
                  <div style={{ width: 9, height: 9, borderRadius: "50%", background: online ? "#22C55E" : "#4B6280", border: `2px solid ${colors.surface}`, position: "absolute", bottom: -1, right: -1 }} />
                </div>
                <div style={{ overflow: "hidden", minWidth: 0 }}>
                  <div style={{ color: online ? colors.textMid : colors.ghost, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.user.name}</div>
                  <div style={{ color: colors.ghost, fontSize: 10 }}>{m.user.department?.name || m.user.state?.name || ""}</div>
                </div>
                {m.isAdmin && <span style={{ fontSize: 9, background: "rgba(212,168,67,0.15)", color: colors.gold, borderRadius: 4, padding: "1px 4px", marginLeft: "auto", flexShrink: 0 }}>MOD</span>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
