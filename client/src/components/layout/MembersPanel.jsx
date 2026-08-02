// src/components/layout/MembersPanel.jsx
import { useState, useEffect } from "react";
import { channelsAPI } from "../../services/api";
import { useSocket } from "../../contexts/SocketContext";
import { colors, ROLE_BADGE } from "../shared/styles";

function Avatar({ name = "", size = 28 }) {
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

export default function MembersPanel({ channelId }) {
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
    <div style={{ width: 220, background: colors.surface, borderLeft: `1px solid ${colors.borderDim}`, padding: "14px 10px", overflowY: "auto", flexShrink: 0 }}>
      <div style={{ color: colors.muted, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10 }}>
        MEMBERS — {members.length}
      </div>
      {Object.keys(grouped).sort((a, b) => roleOrder[a] - roleOrder[b]).map(role => (
        <div key={role} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: colors.ghost, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 5 }}>
            {role.replace("_", " ")} — {grouped[role].length}
          </div>
          {grouped[role].map(m => {
            const online = isOnline(m.user.id);
            const badge  = ROLE_BADGE[m.user.role];
            return (
              <div key={m.id}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 6px", borderRadius: 6, cursor: "pointer", marginBottom: 2 }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div style={{ position: "relative" }}>
                  <Avatar name={m.user.name} size={28} />
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
