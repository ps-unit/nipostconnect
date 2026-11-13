
// client/src/pages/ChannelDiscoveryPage.jsx — Phase 7
import { useState, useEffect } from "react";
import { channelsAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { colors as C } from "../components/shared/styles";

const TYPE_META = {
  ANNOUNCEMENT: { icon:"📢", color:"#D4A843", label:"Announcement" },
  STATE:        { icon:"📍", color:"#2563EB", label:"State" },
  DEPARTMENT:   { icon:"🏢", color:"#7C3AED", label:"Department" },
  SUGGESTION:   { icon:"💡", color:"#22C55E", label:"Suggestion" },
  EMERGENCY:    { icon:"🚨", color:"#EF4444", label:"Emergency" },
  GENERAL:      { icon:"💬", color:"#6B8299", label:"General" },
  POST_OFFICE:  { icon:"🏤", color:"#F59E0B", label:"Post Office" },
};

const FILTER_TYPES = ["ALL", "STATE", "DEPARTMENT", "GENERAL", "ANNOUNCEMENT", "SUGGESTION"];

export default function ChannelDiscoveryPage({ onSelectChannel }) {
  const { user } = useAuth();
  const [channels, setChannels]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [joining, setJoining]       = useState({});
  const [requested, setRequested]   = useState(new Set());

  useEffect(() => {
    channelsAPI.listAll()
      .then(r => setChannels(r.data.channels || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = channels.filter(ch => {
    if (ch.isArchived) return false;
    if (filterType !== "ALL" && ch.type !== filterType) return false;
    if (search && !ch.name.toLowerCase().includes(search.toLowerCase()) &&
        !(ch.description || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const isUserMember = (ch) => Boolean(ch.isMember || user?.role === "SUPER_ADMIN");
  const joined     = filtered.filter(ch => isUserMember(ch));
  const notJoined  = filtered.filter(ch => !isUserMember(ch));

  const handleJoin = async (ch) => {
    if (ch.isLocked) {
      const reason = window.prompt(`Reason for requesting access to #${ch.name} (optional):`);
      if (reason === null) return;
      setJoining(j => ({ ...j, [ch.id]: true }));
      try {
        await channelsAPI.requestJoin(ch.id, reason);
        setRequested(r => new Set([...r, ch.id]));
      } catch (e) { alert(e.response?.data?.error || "Failed to send request"); }
      finally { setJoining(j => ({ ...j, [ch.id]: false })); }
    } else {
      setJoining(j => ({ ...j, [ch.id]: true }));
      try {
        await channelsAPI.requestJoin(ch.id, "");
        setChannels(cs => cs.map(c => c.id === ch.id ? { ...c, isMember: true } : c));
        onSelectChannel?.(ch.id);
      } catch (e) { alert(e.response?.data?.error || "Failed to join"); }
      finally { setJoining(j => ({ ...j, [ch.id]: false })); }
    }
  };

  const ChannelCard = ({ ch }) => {
    const meta    = TYPE_META[ch.type] || TYPE_META.GENERAL;
    const isReq   = requested.has(ch.id);
    const isBusy  = joining[ch.id];
    return (
      <div style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`,
        borderRadius:12, padding:16, display:"flex", gap:14, alignItems:"flex-start",
        borderTop:`2px solid ${meta.color}22` }}>
        <div style={{ width:44, height:44, borderRadius:10, background:`${meta.color}18`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:22, flexShrink:0 }}>
          {meta.icon}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
            <span style={{ color:C.text, fontWeight:700, fontSize:14 }}>#{ch.name}</span>
            <span style={{ fontSize:10, padding:"2px 7px", borderRadius:8,
              background:`${meta.color}18`, color:meta.color, fontWeight:700 }}>
              {meta.label}
            </span>
            {ch.isLocked && (
              <span style={{ fontSize:10, padding:"2px 7px", borderRadius:8,
                background:"rgba(107,130,153,0.15)", color:C.muted, fontWeight:700 }}>
                🔒 Request Only
              </span>
            )}
          </div>
          {ch.description && (
            <div style={{ color:C.muted, fontSize:13, marginBottom:6,
              overflow:"hidden", display:"-webkit-box",
              WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
              {ch.description}
            </div>
          )}
          <div style={{ color:C.ghost, fontSize:11 }}>
            {ch._count?.members ?? "?"} members
            {ch.state && ` · ${ch.state.name}`}
            {ch.department && ` · ${ch.department.name}`}
          </div>
        </div>

        {/* Action button */}
        <div style={{ flexShrink:0 }}>
          {isUserMember(ch) ? (
            <button onClick={() => onSelectChannel?.(ch.id)}
              style={{ padding:"7px 14px", borderRadius:8, border:`1px solid ${C.gold}`,
                background:"rgba(212,168,67,0.08)", color:C.gold,
                cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
              Open →
            </button>
          ) : isReq ? (
            <span style={{ fontSize:12, color:"#F59E0B", fontWeight:600 }}>⏳ Requested</span>
          ) : (
            <button onClick={() => handleJoin(ch)} disabled={isBusy}
              style={{ padding:"7px 14px", borderRadius:8, border:"none",
                background:isBusy?"#1E3A5F":C.online, color:"#fff",
                cursor:isBusy?"default":"pointer", fontSize:12,
                fontWeight:700, fontFamily:"'DM Sans',sans-serif", opacity:isBusy?0.7:1 }}>
              {isBusy ? "..." : ch.isLocked ? "🔒 Request" : "+ Join"}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column",
      background:C.bg, fontFamily:"'DM Sans',sans-serif", overflow:"hidden" }}>

      {/* Header */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`,
        padding:"14px clamp(12px, 3vw, 24px)", flexShrink:0 }}>
        <h2 style={{ color:C.text, fontSize:18, fontWeight:700, margin:"0 0 12px" }}>
          🔍 Discover Channels
        </h2>

        {/* Search + type filter */}
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search channels..."
            style={{ flex:1, minWidth:200, padding:"8px 12px", borderRadius:8,
              border:`1px solid ${C.border}`, background:C.surfaceAlt,
              color:C.text, fontSize:13, fontFamily:"'DM Sans',sans-serif", outline:"none" }} />
          <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4, maxWidth:"100%" }}>
            {FILTER_TYPES.map(t => (
              <button key={t} onClick={() => setFilterType(t)}
                style={{ padding:"6px 12px", borderRadius:7, border:`1px solid ${filterType===t?C.gold:C.border}`,
                  background:filterType===t?"rgba(212,168,67,0.08)":"transparent",
                  color:filterType===t?C.gold:C.muted, whiteSpace:"nowrap",
                  cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                {t === "ALL" ? `All (${channels.filter(c=>!c.isArchived).length})` : TYPE_META[t]?.icon + " " + t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:"auto", padding:"clamp(12px, 3vw, 24px)" }}>
        {loading && <div style={{ textAlign:"center", padding:40, color:C.muted }}>Loading channels...</div>}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign:"center", padding:60, color:C.ghost }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
            <div style={{ color:C.muted, fontSize:15 }}>No channels found</div>
          </div>
        )}

        {/* Channels I've joined */}
        {joined.length > 0 && (
          <div style={{ marginBottom:28 }}>
            <div style={{ color:C.muted, fontSize:11, fontWeight:700,
              letterSpacing:"0.07em", marginBottom:12 }}>
              ✅ JOINED ({joined.length})
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(min(100%, 280px), 1fr))", gap:12 }}>
              {joined.map(ch => <ChannelCard key={ch.id} ch={ch} />)}
            </div>
          </div>
        )}

        {/* Channels I haven't joined */}
        {notJoined.length > 0 && (
          <div>
            <div style={{ color:C.muted, fontSize:11, fontWeight:700,
              letterSpacing:"0.07em", marginBottom:12 }}>
              AVAILABLE TO JOIN ({notJoined.length})
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(min(100%, 280px), 1fr))", gap:12 }}>
              {notJoined.map(ch => <ChannelCard key={ch.id} ch={ch} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
