
// client/src/components/modals/AdminPanel.jsx — v5 (adds Departments tab)
import { useState, useEffect, useCallback } from "react";
import { adminAPI } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { s, colors, ROLE_BADGE } from "../shared/styles";
import { format } from "date-fns";
import DepartmentsTab from "../settings/DepartmentsTab";

const TABS = [
  { id:"overview",     label:"Overview",       icon:"📊" },
  { id:"departments",  label:"Departments",    icon:"🏢" },
  { id:"requests",     label:"Join Requests",  icon:"🚪" },
  { id:"users",        label:"Staff",          icon:"👥" },
  { id:"roles",        label:"Roles",          icon:"🛡️" },
  { id:"broadcast",    label:"Emergency",      icon:"🚨" },
  { id:"log",          label:"Audit Log",      icon:"📋" },
];

export default function AdminPanel({ onClose, onChannelCreated, onDeptCreated }) {
  const { isSuperAdmin } = useAuth();
  const [tab, setTab] = useState("overview");
  const visibleTabs = isSuperAdmin ? TABS : TABS.filter(t => !["broadcast"].includes(t.id));

  return (
    <div style={s.modalOverlay}>
      <div style={{ background:colors.surfaceAlt, border:`1px solid ${colors.border}`, borderRadius:16,
        width:"min(860px, 96vw)", maxHeight:"calc(100dvh - 24px)", overflow:"hidden", display:"flex", flexDirection:"column" }}>

        {/* Header */}
        <div style={{ padding:"14px clamp(14px, 3vw, 24px)", borderBottom:`1px solid ${colors.border}`,
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <h3 style={{ color:colors.gold, margin:0, fontSize:18 }}>🛡️ Admin Panel</h3>
          <button onClick={onClose}
            style={{ background:"none", border:"none", color:colors.muted, fontSize:20, cursor:"pointer", padding:"4px 8px" }}>✕</button>
        </div>

        {/* Tab bar */}
        <div style={{ display:"flex", borderBottom:`1px solid ${colors.border}`, overflowX:"auto", flexShrink: 0 }}>
          {visibleTabs.map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{ padding:"11px 16px", border:"none", background:"none", cursor:"pointer",
                fontSize:13, fontWeight:600, fontFamily:"'DM Sans',sans-serif",
                color:tab===t.id?colors.gold:colors.muted, whiteSpace:"nowrap",
                borderBottom:tab===t.id?`2px solid ${colors.gold}`:"2px solid transparent" }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex:1, overflowY:"auto", padding:"clamp(12px, 3vw, 24px)" }}>
          {tab==="overview"    && <OverviewTab />}
          {tab==="departments" && <DepartmentsTab onCreated={onDeptCreated} />}
          {tab==="requests"    && <RequestsTab />}
          {tab==="users"       && <UsersTab />}
          {tab==="roles"       && <RolesTab />}
          {tab==="broadcast"   && <BroadcastTab />}
          {tab==="log"         && <AuditLogTab />}
        </div>
      </div>
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────
function OverviewTab() {
  const [stats, setStats] = useState(null);
  useEffect(()=>{ adminAPI.stats().then(r=>setStats(r.data)).catch(()=>{}); },[]);
  if (!stats) return <div style={{ color:colors.muted, fontSize:13 }}>Loading stats...</div>;
  const cards = [
    { label:"Total Staff",   value:stats.overview.totalUsers,           icon:"👥", color:colors.gold },
    { label:"Active",        value:stats.overview.activeUsers,          icon:"✅", color:"#22C55E" },
    { label:"Pending",       value:stats.overview.pendingVerifications, icon:"⏳", color:"#F59E0B" },
    { label:"Channels",      value:stats.overview.totalChannels,        icon:"📢", color:"#2563EB" },
    { label:"Messages",      value:stats.overview.totalMessages,        icon:"💬", color:"#7C3AED" },
    { label:"Join Requests", value:stats.overview.pendingRequests,      icon:"🚪", color:"#EF4444" },
  ];
  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(min(100%, 130px), 1fr))", gap:12, marginBottom:20 }}>
        {cards.map(c => (
          <div key={c.label} style={{ background:"#081A35", border:`1px solid ${colors.border}`, borderRadius:10, padding:"14px 16px" }}>
            <div style={{ fontSize:22, marginBottom:6 }}>{c.icon}</div>
            <div style={{ color:c.color, fontWeight:700, fontSize:22 }}>{c.value?.toLocaleString?.()}</div>
            <div style={{ color:colors.muted, fontSize:12, marginTop:3 }}>{c.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap:12 }}>
        <div style={{ background:"#081A35", border:`1px solid ${colors.border}`, borderRadius:10, padding:14 }}>
          <div style={{ color:colors.muted, fontSize:11, fontWeight:700, letterSpacing:"0.07em", marginBottom:10 }}>THIS WEEK</div>
          {[["New Staff",stats.thisWeek?.newUsers||0],["Messages",stats.thisWeek?.messages||0]].map(([k,v])=>(
            <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`1px solid ${colors.borderDim}`, fontSize:13 }}>
              <span style={{ color:colors.muted }}>{k}</span>
              <span style={{ color:colors.text, fontWeight:600 }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ background:"#081A35", border:`1px solid ${colors.border}`, borderRadius:10, padding:14 }}>
          <div style={{ color:colors.muted, fontSize:11, fontWeight:700, letterSpacing:"0.07em", marginBottom:10 }}>TOP STATES</div>
          {(stats.byState||[]).filter(s=>s._count.users>0).sort((a,b)=>b._count.users-a._count.users).slice(0,5).map(s=>(
            <div key={s.name} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`1px solid ${colors.borderDim}`, fontSize:13 }}>
              <span style={{ color:colors.muted }}>{s.name}</span>
              <span style={{ color:colors.gold, fontWeight:600 }}>{s._count.users}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Join Requests ─────────────────────────────────────────────────────────────
function RequestsTab() {
  const [requests,setRequests]=useState([]);
  const [filter,setFilter]=useState("PENDING");
  const [loading,setLoading]=useState(false);
  const load=useCallback(()=>{ adminAPI.joinRequests(filter).then(r=>setRequests(r.data.requests||[])).catch(()=>{}); },[filter]);
  useEffect(()=>{load();},[load]);
  const handle=async(req,action)=>{
    const note=action==="reject"?window.prompt("Reason (optional):"):undefined;
    if(note===null)return;
    setLoading(true);
    try{await fetch(`/api/channels/${req.channelId}/join-request/${req.id}`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${localStorage.getItem("accessToken")}`},body:JSON.stringify({action,note})});load();}catch{}
    setLoading(false);
  };
  return (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {["PENDING","APPROVED","REJECTED"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            style={{ padding:"5px 12px", borderRadius:6, border:`1px solid ${filter===f?colors.gold:colors.border}`,
              background:filter===f?"rgba(212,168,67,0.1)":"transparent",color:filter===f?colors.gold:colors.muted,cursor:"pointer",fontSize:12,fontWeight:600 }}>
            {f}
          </button>
        ))}
      </div>
      {requests.length===0&&<div style={{textAlign:"center",padding:32,color:colors.ghost,fontSize:13}}>No {filter.toLowerCase()} requests</div>}
      {requests.map(r=>(
        <div key={r.id} style={{ background:"#081A35", border:`1px solid ${colors.border}`, borderRadius:10, padding:14, marginBottom:10 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
            <div>
              <div style={{ color:colors.text, fontWeight:600, marginBottom:3 }}>{r.user.name} <span style={{ color:colors.muted, fontWeight:400, fontSize:12 }}>({r.user.staffId})</span></div>
              <div style={{ color:colors.muted, fontSize:12 }}>{r.user.state?.name||"—"} · {r.user.department?.name||"—"}</div>
              <div style={{ fontSize:12, marginTop:2 }}>Requesting: <span style={{ color:colors.gold }}>#{r.channel.name}</span></div>
              {r.reason&&<div style={{ color:colors.muted, fontSize:12, marginTop:3, fontStyle:"italic" }}>"{r.reason}"</div>}
            </div>
            {filter==="PENDING"&&(
              <div style={{ display:"flex", gap:8 }}>
                <button disabled={loading} onClick={()=>handle(r,"approve")} style={{ padding:"6px 14px", borderRadius:6, border:"none", background:"rgba(34,197,94,0.15)", color:"#22C55E", cursor:"pointer", fontSize:13, fontWeight:600 }}>✓ Approve</button>
                <button disabled={loading} onClick={()=>handle(r,"reject")}  style={{ padding:"6px 14px", borderRadius:6, border:"none", background:"rgba(239,68,68,0.12)", color:"#F87171", cursor:"pointer", fontSize:13, fontWeight:600 }}>✕ Reject</button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Staff ─────────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users,setUsers]=useState([]);
  const [search,setSearch]=useState("");
  const [total,setTotal]=useState(0);
  const load=useCallback(()=>{ adminAPI.users({search,limit:30}).then(r=>{setUsers(r.data.users||[]);setTotal(r.data.total||0);}).catch(()=>{}); },[search]);
  useEffect(()=>{const t=setTimeout(load,300);return()=>clearTimeout(t);},[load]);
  const updateRole=async(id,role)=>{try{await adminAPI.updateUser(id,{role});load();}catch(e){alert(e.response?.data?.error||"Failed");}};
  const updateStatus=async(id,status)=>{if(!window.confirm(`Set status to ${status}?`))return;try{await adminAPI.updateUser(id,{status});load();}catch(e){alert(e.response?.data?.error||"Failed");}};
  return (
    <div>
      <div style={{ display:"flex", gap:10, marginBottom:14, alignItems:"center" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, email or staff ID..."
          style={{ ...s.input, flex:1, marginBottom:0 }} />
        <span style={{ color:colors.muted, fontSize:12, flexShrink:0 }}>{total} total</span>
      </div>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${colors.border}` }}>
              {["Staff ID","Name","State","Dept","Role","Status","Actions"].map(h=>(
                <th key={h} style={{ padding:"8px 10px", textAlign:"left", color:colors.muted, fontWeight:700, fontSize:11, letterSpacing:"0.06em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u=>{
              const badge=ROLE_BADGE[u.role];
              return(
                <tr key={u.id} style={{ borderBottom:`1px solid ${colors.borderDim}` }}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{ padding:"9px 10px", color:colors.muted, fontFamily:"monospace", fontSize:11 }}>{u.staffId}</td>
                  <td style={{ padding:"9px 10px", color:colors.text, fontWeight:500 }}>{u.name}</td>
                  <td style={{ padding:"9px 10px", color:colors.muted }}>{u.state?.name||"—"}</td>
                  <td style={{ padding:"9px 10px", color:colors.muted }}>{u.department?.name||"—"}</td>
                  <td style={{ padding:"9px 10px" }}>
                    <select value={u.role} onChange={e=>updateRole(u.id,e.target.value)}
                      style={{ background:badge?badge.bg:colors.borderDim, color:badge?badge.color:colors.muted,
                        border:"none", borderRadius:6, padding:"3px 7px", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                      {["STAFF","DEPT_ADMIN","STATE_ADMIN","SUPER_ADMIN"].map(r=>(
                        <option key={r} value={r}>{r.replace("_"," ")}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding:"9px 10px" }}>
                    <span style={{ fontSize:11, padding:"3px 8px", borderRadius:10, fontWeight:600,
                      background:u.status==="ACTIVE"?"rgba(34,197,94,0.1)":u.status==="SUSPENDED"?"rgba(239,68,68,0.1)":"rgba(245,158,11,0.1)",
                      color:u.status==="ACTIVE"?"#22C55E":u.status==="SUSPENDED"?"#F87171":"#F59E0B" }}>
                      {u.status}
                    </span>
                  </td>
                  <td style={{ padding:"9px 10px" }}>
                    <div style={{ display:"flex", gap:5 }}>
                      {u.status!=="ACTIVE"&&<button onClick={()=>updateStatus(u.id,"ACTIVE")} style={{ fontSize:11, padding:"3px 8px", borderRadius:5, border:"none", background:"rgba(34,197,94,0.1)", color:"#22C55E", cursor:"pointer" }}>Activate</button>}
                      {u.status!=="SUSPENDED"&&<button onClick={()=>updateStatus(u.id,"SUSPENDED")} style={{ fontSize:11, padding:"3px 8px", borderRadius:5, border:"none", background:"rgba(239,68,68,0.1)", color:"#F87171", cursor:"pointer" }}>Suspend</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Roles ─────────────────────────────────────────────────────────────────────
function RolesTab() {
  const roles=[
    {role:"SUPER_ADMIN",badge:ROLE_BADGE.SUPER_ADMIN,desc:"Full platform control.",
     perms:["All permissions","Emergency broadcast","Org settings","Manage departments","Assign any role","Archive channels"]},
    {role:"STATE_ADMIN",badge:ROLE_BADGE.STATE_ADMIN,desc:"Manages assigned state.",
     perms:["Create/archive state channels","Approve join requests","Pin messages","Suspend state staff"]},
    {role:"DEPT_ADMIN",badge:ROLE_BADGE.DEPT_ADMIN,desc:"Manages assigned department.",
     perms:["Post official memos","Create polls","Moderate dept channel","Approve join requests in dept"]},
    {role:"STAFF",badge:null,desc:"All verified NiPOST staff.",
     perms:["View public channels","Post in joined channels","Submit suggestions","Vote on polls","Send DMs"]},
  ];
  return(
    <div>
      {roles.map(r=>(
        <div key={r.role} style={{ background:"#081A35", border:`1px solid ${r.badge?r.badge.bg+"33":colors.border}`, borderRadius:10, padding:16, marginBottom:12 }}>
          <div style={{ marginBottom:8 }}>
            {r.badge?<span style={{ fontSize:11, padding:"3px 10px", borderRadius:12, background:r.badge.bg, color:r.badge.color, fontWeight:700 }}>{r.role.replace("_"," ")}</span>
              :<span style={{ fontSize:11, padding:"3px 10px", borderRadius:12, background:colors.border, color:colors.text, fontWeight:700 }}>STAFF</span>}
          </div>
          <p style={{ color:colors.muted, fontSize:13, margin:"0 0 10px" }}>{r.desc}</p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {r.perms.map(p=>(
              <span key={p} style={{ fontSize:11, padding:"3px 9px", borderRadius:12, background:"rgba(255,255,255,0.06)", color:colors.textMid }}>✓ {p}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Emergency Broadcast ───────────────────────────────────────────────────────
function BroadcastTab() {
  const [content,setContent]=useState("");
  const [loading,setLoading]=useState(false);
  const [sent,setSent]=useState(false);
  const send=async()=>{
    if(!content.trim())return;
    if(!window.confirm("Send emergency alert to ALL staff?"))return;
    setLoading(true);
    try{await adminAPI.emergencyBroadcast(content.trim());setSent(true);setContent("");}
    catch(e){alert(e.response?.data?.error||"Failed");}
    finally{setLoading(false);}
  };
  return(
    <div>
      <div style={{ background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:10, padding:"12px 16px", marginBottom:16 }}>
        <div style={{ color:"#F87171", fontWeight:700, marginBottom:4 }}>🚨 Emergency Broadcast</div>
        <div style={{ color:colors.muted, fontSize:13 }}>Delivers instantly to all online staff as a pop-up alert. Super Admin only.</div>
      </div>
      {sent&&<div style={{ background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.2)", borderRadius:8, padding:"9px 12px", color:"#86EFAC", fontSize:13, marginBottom:14 }}>✅ Broadcast sent to all staff.</div>}
      <label style={s.label}>Message *</label>
      <textarea value={content} onChange={e=>{setContent(e.target.value);setSent(false);}} rows={5}
        placeholder="Emergency message..." style={{ ...s.input, resize:"vertical", fontFamily:"inherit" }} />
      <button onClick={send} disabled={loading||!content.trim()}
        style={{ ...s.primaryButton, background:"#EF4444", color:"#fff", opacity:loading||!content.trim()?0.5:1 }}>
        {loading?"Sending...":"🚨 Send Emergency Broadcast"}
      </button>
    </div>
  );
}

// ── Audit Log ─────────────────────────────────────────────────────────────────
function AuditLogTab() {
  const [logs,setLogs]=useState([]);
  useEffect(()=>{ adminAPI.auditLog({limit:100}).then(r=>setLogs(r.data.logs||[])).catch(()=>{}); },[]);
  const AC={ CHANNEL_CREATED:"#22C55E", DEPARTMENT_CREATED:"#22C55E", DEPARTMENT_UPDATED:"#D4A843",
    JOIN_REQUEST_APPROVED:"#22C55E", JOIN_REQUEST_REJECTED:"#EF4444",
    USER_UPDATED:"#D4A843", MESSAGE_PINNED:"#2563EB", EMERGENCY_BROADCAST:"#EF4444",
    BULK_MEMO_SENT:"#7C3AED", ORG_SETTINGS_UPDATED:"#D4A843", ORG_LOGO_UPDATED:"#06B6D4",
    TWO_FA_ENABLED:"#22C55E", TWO_FA_DISABLED:"#EF4444" };
  return(
    <div>
      <p style={{ color:colors.muted, fontSize:13, marginTop:0, marginBottom:14 }}>Immutable audit trail — {logs.length} entries</p>
      <div style={{ borderRadius:8, overflow:"hidden", border:`1px solid ${colors.border}` }}>
        {logs.length===0&&<div style={{ padding:24, textAlign:"center", color:colors.ghost, fontSize:13 }}>No audit entries yet</div>}
        {logs.map((l,i)=>{
          const c=AC[l.action]||colors.muted;
          return(
            <div key={l.id} style={{ display:"flex", gap:12, padding:"10px 14px",
              borderBottom:i<logs.length-1?`1px solid ${colors.borderDim}`:"none", alignItems:"flex-start" }}>
              <span style={{ color:colors.ghost, fontSize:11, minWidth:90, flexShrink:0, fontFamily:"monospace" }}>
                {format(new Date(l.createdAt),"dd/MM HH:mm")}
              </span>
              <div style={{ flex:1 }}>
                <div style={{ color:colors.textMid, fontSize:13 }}>{l.action.replace(/_/g," ")}</div>
                {l.target&&<div style={{ color:colors.ghost, fontSize:11 }}>Target: {l.target.slice(0,24)}</div>}
                <div style={{ color:colors.ghost, fontSize:11 }}>by {l.admin?.name}</div>
              </div>
              <span style={{ fontSize:10, padding:"2px 8px", borderRadius:10, background:c+"15", color:c, fontWeight:700, flexShrink:0, whiteSpace:"nowrap" }}>
                {l.action.split("_")[0]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
