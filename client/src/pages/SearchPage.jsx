
// client/src/pages/SearchPage.jsx — Phase 3
import { useState, useCallback, useRef } from "react";
import { searchAPI } from "../services/api";
import { format } from "date-fns";

const C = {
  bg:"#081832", surface:"#081A35", surfaceAlt:"#0D2244", border:"#1E3A5F",
  gold:"#D4A843", text:"#E8EDF5", muted:"#6B8299", textMid:"#B0BDD0",
  ghost:"#2E4A6B",
};

const CHANNEL_ICONS = { ANNOUNCEMENT:"📢", STATE:"📍", DEPARTMENT:"🏢", SUGGESTION:"💡", EMERGENCY:"🚨", GENERAL:"💬", POST_OFFICE:"🏤" };
const ROLE_BADGE = { SUPER_ADMIN:{bg:"#D4A843",color:"#0A1F44"}, STATE_ADMIN:{bg:"#2563EB",color:"#fff"}, DEPT_ADMIN:{bg:"#7C3AED",color:"#fff"} };
const MSG_TYPE_BAR = { ANNOUNCEMENT:"#D4A843", MEMO:"#7C3AED", SUGGESTION:"#22C55E", POLL:"#2563EB", MESSAGE:"#1E3A5F" };

function highlight(text, query) {
  if (!query || !text) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})`, "gi"));
  return parts.map((p, i) =>
    p.toLowerCase() === query.toLowerCase()
      ? <mark key={i} style={{ background:"rgba(212,168,67,0.35)", color:C.text, borderRadius:2, padding:"0 1px" }}>{p}</mark>
      : p
  );
}

export default function SearchPage({ onSelectChannel }) {
  const [query, setQuery]     = useState("");
  const [tab, setTab]         = useState("messages");
  const [results, setResults] = useState({ messages:[], channels:[], staff:[] });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounce = useRef();

  const doSearch = useCallback(async (q, t) => {
    if (q.trim().length < 2) { setResults({ messages:[], channels:[], staff:[] }); setSearched(false); return; }
    setLoading(true);
    try {
      let data = {};
      if (t === "messages") { const r = await searchAPI.messages(q); data.messages = r.data.messages || []; }
      else if (t === "channels") { const r = await searchAPI.channels(q); data.channels = r.data.channels || []; }
      else if (t === "staff") { const r = await searchAPI.staff(q); data.staff = r.data.staff || []; }
      setResults(prev => ({ ...prev, ...data }));
      setSearched(true);
    } catch {}
    finally { setLoading(false); }
  }, []);

  const handleInput = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => doSearch(q, tab), 350);
  };

  const handleTabChange = (t) => {
    setTab(t);
    if (query.trim().length >= 2) doSearch(query, t);
  };

  const total = results.messages.length + results.channels.length + results.staff.length;

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", background:C.bg, fontFamily:"'DM Sans',sans-serif", height:"100%" }}>
      {/* Search header */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"14px clamp(12px, 3vw, 20px)", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, background:C.surfaceAlt,
          borderRadius:10, border:`1px solid ${C.border}`, padding:"0 16px", maxWidth:640 }}>
          <span style={{ fontSize:18, color:C.muted }}>🔍</span>
          <input value={query} onChange={handleInput} autoFocus
            placeholder="Search messages, channels, staff..."
            style={{ flex:1, background:"none", border:"none", color:C.text, fontSize:15,
              padding:"12px 0", outline:"none", fontFamily:"'DM Sans',sans-serif" }} />
          {query && (
            <button onClick={() => { setQuery(""); setResults({ messages:[], channels:[], staff:[] }); setSearched(false); }}
              style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:18 }}>✕</button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:0, marginTop:12, overflowX:"auto" }}>
          {[
            { id:"messages", label:"Messages",  icon:"💬" },
            { id:"channels", label:"Channels",  icon:"📢" },
            { id:"staff",    label:"Staff",      icon:"👥" },
          ].map(t => (
            <button key={t.id} onClick={() => handleTabChange(t.id)}
              style={{ padding:"6px 16px", border:"none", background:"none", cursor:"pointer",
                fontSize:13, fontWeight:600, fontFamily:"'DM Sans',sans-serif",
                color:tab===t.id?C.gold:C.muted, whiteSpace:"nowrap",
                borderBottom:tab===t.id?`2px solid ${C.gold}`:"2px solid transparent" }}>
              {t.icon} {t.label}
              {searched && results[t.id]?.length > 0 && (
                <span style={{ marginLeft:6, fontSize:11, background:`${C.gold}22`, color:C.gold,
                  padding:"1px 6px", borderRadius:10 }}>
                  {results[t.id].length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div style={{ flex:1, overflowY:"auto", padding:"12px clamp(12px, 3vw, 20px)" }}>

        {/* Empty state */}
        {!query && (
          <div style={{ textAlign:"center", padding:"60px 20px", color:C.ghost }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🔍</div>
            <div style={{ color:C.muted, fontSize:16, fontWeight:600, marginBottom:8 }}>Search NiPOST Connect</div>
            <div style={{ color:C.ghost, fontSize:13 }}>Search across messages, channels, and staff directory</div>
            <div style={{ marginTop:20, display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap" }}>
              {["salary","memo","operations","announcement","kano"].map(s => (
                <button key={s} onClick={() => { setQuery(s); doSearch(s, tab); }}
                  style={{ padding:"5px 14px", borderRadius:20, border:`1px solid ${C.border}`,
                    background:"transparent", color:C.muted, cursor:"pointer", fontSize:12,
                    fontFamily:"'DM Sans',sans-serif" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign:"center", padding:40, color:C.muted, fontSize:13 }}>Searching...</div>
        )}

        {/* No results */}
        {!loading && searched && total === 0 && (
          <div style={{ textAlign:"center", padding:40 }}>
            <div style={{ fontSize:36, marginBottom:10 }}>🕵️</div>
            <div style={{ color:C.muted, fontSize:15, fontWeight:600, marginBottom:6 }}>No results for "{query}"</div>
            <div style={{ color:C.ghost, fontSize:13 }}>Try different keywords or search another category</div>
          </div>
        )}

        {/* Messages */}
        {tab === "messages" && !loading && results.messages.map(msg => (
          <div key={msg.id}
            onClick={() => onSelectChannel?.(msg.channelId)}
            style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`,
              borderLeft:`3px solid ${MSG_TYPE_BAR[msg.type]||C.border}`,
              borderRadius:10, padding:"12px 16px", marginBottom:10, cursor:"pointer" }}
            onMouseEnter={e=>e.currentTarget.style.background="#0F2847"}
            onMouseLeave={e=>e.currentTarget.style.background=C.surfaceAlt}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6, flexWrap:"wrap", gap:6 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ color:C.text, fontWeight:600, fontSize:13 }}>{msg.author?.name || "Unknown"}</span>
                <span style={{ fontSize:10, padding:"1px 7px", borderRadius:10, background:`${MSG_TYPE_BAR[msg.type]}22`, color:MSG_TYPE_BAR[msg.type], fontWeight:700 }}>{msg.type}</span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ color:C.muted, fontSize:11 }}>in <span style={{ color:C.gold }}>#{msg.channel?.name}</span></span>
                <span style={{ color:C.ghost, fontSize:11 }}>{format(new Date(msg.createdAt),"d MMM yyyy")}</span>
              </div>
            </div>
            <div style={{ color:C.textMid, fontSize:13, lineHeight:1.6 }}>
              {highlight(msg.content.slice(0, 200) + (msg.content.length > 200 ? "..." : ""), query)}
            </div>
          </div>
        ))}

        {/* Channels */}
        {tab === "channels" && !loading && results.channels.map(ch => (
          <div key={ch.id}
            onClick={() => onSelectChannel?.(ch.id)}
            style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`,
              borderRadius:10, padding:"12px 16px", marginBottom:10, cursor:"pointer",
              display:"flex", alignItems:"center", gap:14 }}
            onMouseEnter={e=>e.currentTarget.style.background="#0F2847"}
            onMouseLeave={e=>e.currentTarget.style.background=C.surfaceAlt}>
            <span style={{ fontSize:24, flexShrink:0 }}>{CHANNEL_ICONS[ch.type]||"#"}</span>
            <div style={{ flex:1 }}>
              <div style={{ color:C.text, fontWeight:600, fontSize:14 }}>
                #{highlight(ch.name, query)}
              </div>
              {ch.description && <div style={{ color:C.muted, fontSize:12, marginTop:2 }}>{ch.description}</div>}
              <div style={{ color:C.ghost, fontSize:11, marginTop:4 }}>
                {ch.type} · {ch._count?.members || 0} members
                {ch.state && ` · ${ch.state.name}`}
                {ch.department && ` · ${ch.department.name}`}
              </div>
            </div>
            <span style={{ fontSize:11, padding:"3px 10px", borderRadius:10,
              background:`${C.gold}15`, color:C.gold, fontWeight:700, flexShrink:0 }}>
              Join →
            </span>
          </div>
        ))}

        {/* Staff */}
        {tab === "staff" && !loading && results.staff.map(u => {
          const badge = ROLE_BADGE[u.role];
          return (
            <div key={u.id} style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`,
              borderRadius:10, padding:"12px 16px", marginBottom:10,
              display:"flex", alignItems:"center", gap:14 }}
              onMouseEnter={e=>e.currentTarget.style.background="#0F2847"}
              onMouseLeave={e=>e.currentTarget.style.background=C.surfaceAlt}>
              <div style={{ width:40, height:40, borderRadius:"50%", background:"#1A3356",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:14, fontWeight:700, color:C.gold, flexShrink:0 }}>
                {u.name.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                  <span style={{ color:C.text, fontWeight:600, fontSize:14 }}>{highlight(u.name, query)}</span>
                  {badge && <span style={{ fontSize:10, padding:"1px 7px", borderRadius:20, background:badge.bg, color:badge.color, fontWeight:700 }}>{u.role.replace("_"," ")}</span>}
                </div>
                <div style={{ color:C.muted, fontSize:12 }}>
                  {highlight(u.staffId, query)} · {u.state?.name} · {u.department?.name}
                </div>
                {u.postOffice && <div style={{ color:C.ghost, fontSize:11, marginTop:2 }}>{u.postOffice}</div>}
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ color:C.ghost, fontSize:11 }}>
                  {u.lastSeenAt ? `Last seen ${format(new Date(u.lastSeenAt),"d MMM")}` : "Never signed in"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
