// src/components/layout/ChannelSidebar.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { channelsAPI } from "../../services/api";
import { colors, CHANNEL_ICONS, resolveUploadUrl } from "../shared/styles";
import CreateChannelModal from "../modals/CreateChannelModal";

const SECTION_ORDER = ["ANNOUNCEMENT","EMERGENCY","SUGGESTION","GENERAL","STATE","POST_OFFICE","DEPARTMENT"];
const SECTION_LABELS = {
  ANNOUNCEMENT: { label: "NATIONAL",      icon: "🇳🇬" },
  EMERGENCY:    { label: "EMERGENCY",     icon: "🚨" },
  SUGGESTION:   { label: "OPEN CHANNELS", icon: "💬" },
  GENERAL:      { label: "OPEN CHANNELS", icon: "💬" },
  STATE:        { label: "STATE CHANNELS", icon: "📍" },
  POST_OFFICE:  { label: "POST OFFICES",  icon: "🏤" },
  DEPARTMENT:   { label: "DEPARTMENTS",   icon: "🏢" },
};

export default function ChannelSidebar({ channels, activeChannelId, onSelectChannel, unreadMap, onChannelCreated, searchMode, isMobile, orgSettings }) {
  const { isAdmin, user } = useAuth();
  const [search, setSearch]     = useState("");
  const [expanded, setExpanded] = useState({ ANNOUNCEMENT: true, EMERGENCY: true, SUGGESTION: true, GENERAL: true, STATE: true, DEPARTMENT: true, POST_OFFICE: false });
  const [showCreate, setShowCreate] = useState(false);
  const [joining, setJoining]   = useState(null);
  const [logoErr, setLogoErr]   = useState(false);

  const orgLogoSrc = resolveUploadUrl(orgSettings?.logoUrl);
  const orgName    = orgSettings?.name || "NiPOST Connect";
  const orgSlogan  = orgSettings?.slogan || "Nigerian Postal Service";

  useEffect(() => {
    setLogoErr(false);
  }, [orgLogoSrc]);

  const toggle = (key) => setExpanded(e => ({ ...e, [key]: !e[key] }));

  const handleJoinRequest = async (channel) => {
    const reason = window.prompt(`Request access to #${channel.name}\n\nEnter a reason (optional):`);
    if (reason === null) return;
    setJoining(channel.id);
    try {
      await channelsAPI.requestJoin(channel.id, reason);
      alert("✅ Join request submitted. An admin will review it.");
    } catch (err) {
      alert(err.response?.data?.error || "Request failed");
    } finally {
      setJoining(null);
    }
  };

  // Group channels
  const filtered = search
    ? channels.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase()))
    : channels;

  const grouped = {};
  SECTION_ORDER.forEach(t => { grouped[t] = []; });
  filtered.forEach(ch => {
    const key = ch.type;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(ch);
  });

  // Merge SUGGESTION and GENERAL into one section visually
  const renderSection = (type, chs) => {
    if (!chs.length) return null;
    const meta = SECTION_LABELS[type];
    const isExpanded = expanded[type] !== false;
    return (
      <div key={type} style={{ marginBottom: 6 }}>
        <button onClick={() => toggle(type)}
          style={{
            width: "100%", background: "none", border: "none",
            display: "flex", alignItems: "center", gap: 6,
            padding: "4px 10px 4px 12px", cursor: "pointer",
            color: colors.mutedDim, fontSize: 11, fontWeight: 700,
            letterSpacing: "0.07em", textAlign: "left",
          }}>
          <span style={{ fontSize: 10, transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.2s", display: "inline-block" }}>▶</span>
          {meta.icon} {meta.label}
          <span style={{ marginLeft: "auto", fontSize: 10, color: colors.ghost }}>{chs.length}</span>
        </button>

        {isExpanded && chs.map(ch => {
          const active  = ch.id === activeChannelId;
          const isMember = ch.isMember || user?.role === "SUPER_ADMIN";
          const unread  = unreadMap[ch.id] || 0;

          return (
            <button key={ch.id}
              onClick={() => isMember ? onSelectChannel(ch.id) : handleJoinRequest(ch)}
              disabled={joining === ch.id}
              style={{
                width: "100%", background: active ? colors.goldDim : "transparent",
                border: "none", display: "flex", alignItems: "center",
                gap: 8, padding: isMobile ? "9px 14px 9px 20px" : "6px 12px 6px 22px",
                cursor: "pointer", textAlign: "left", borderRadius: 0,
                borderLeft: active ? `3px solid ${colors.gold}` : "3px solid transparent",
                opacity: joining === ch.id ? 0.5 : 1,
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = active ? colors.goldDim : "transparent"; }}
            >
              <span style={{ fontSize: 13 }}>{CHANNEL_ICONS[ch.type] || "#"}</span>
              <span style={{
                color: active ? colors.text : isMember ? colors.textMid : colors.ghost,
                fontSize: 13, fontWeight: active ? 600 : 400,
                flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {ch.name}
              </span>
              {!isMember && <span style={{ fontSize: 10, color: colors.ghost }}>🔒</span>}
              {isMember && unread > 0 && !active && (
                <span style={{ fontSize: 10, background: colors.gold, color: "#0A1F44", borderRadius: 10, padding: "1px 6px", fontWeight: 700, minWidth: 18, textAlign: "center" }}>
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{
      width: isMobile ? "100%" : 240,
      background: colors.surface,
      display: "flex",
      flexDirection: "column",
      borderRight: isMobile ? "none" : `1px solid ${colors.borderDim}`,
      flexShrink: 0,
      height: "100%",
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 12px 10px",
        borderBottom: `1px solid ${colors.borderDim}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        {orgLogoSrc && !logoErr && (
          <img
            src={orgLogoSrc}
            alt={orgName}
            onError={() => setLogoErr(true)}
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              objectFit: "contain",
              background: "#081832",
              border: `1px solid ${colors.borderDim}`,
              padding: 2,
              flexShrink: 0,
              boxSizing: "border-box",
            }}
          />
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ color: colors.text, fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {orgName}
          </div>
          <div style={{ color: colors.muted, fontSize: 11, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {orgSlogan}
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: "8px 10px" }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search channels..."
          style={{
            width: "100%", padding: "7px 10px", borderRadius: 8,
            border: `1px solid ${colors.border}`, background: colors.inputBg,
            color: colors.text, fontSize: 12, outline: "none",
            fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box",
          }}
        />
      </div>

      {/* Channel list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
        {SECTION_ORDER
          .filter((t,i,a) => {
            // Merge GENERAL into SUGGESTION section visually to avoid duplicate label
            if (t === "GENERAL") return false;
            return true;
          })
          .map(type => {
            const chs = type === "SUGGESTION"
              ? [...(grouped.SUGGESTION || []), ...(grouped.GENERAL || [])]
              : grouped[type] || [];
            return renderSection(type, chs);
          })
        }
      </div>

      {/* Footer: create channel */}
      {isAdmin && (
        <div style={{ padding: "8px 12px", borderTop: `1px solid ${colors.borderDim}` }}>
          <button onClick={() => setShowCreate(true)}
            style={{
              width: "100%", padding: "8px", borderRadius: 8,
              border: `1px dashed var(--accent-border, rgba(212,168,67,0.3))`,
              background: "var(--accent-subtle, rgba(212,168,67,0.04))", color: colors.gold,
              cursor: "pointer", fontSize: 12, fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
            }}>
            + Create Channel
          </button>
        </div>
      )}

      {showCreate && (
        <CreateChannelModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); onChannelCreated(); }}
        />
      )}
    </div>
  );
}
