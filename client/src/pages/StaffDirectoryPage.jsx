
// client/src/pages/StaffDirectoryPage.jsx — Phase 7
import { useState, useEffect, useCallback } from "react";
import { usersAPI } from "../services/api";
import api from "../services/api";
import { formatDistanceToNow } from "date-fns";

const C = {
  bg:"#081832", surface:"#081A35", surfaceAlt:"#0D2244", border:"#1E3A5F",
  gold:"#D4A843", text:"#E8EDF5", muted:"#6B8299", textMid:"#B0BDD0", ghost:"#2E4A6B",
  online:"#22C55E",
};

const ROLE_BADGE = {
  SUPER_ADMIN: { bg:"#D4A843", color:"#0A1F44", label:"Super Admin" },
  STATE_ADMIN:  { bg:"#2563EB", color:"#fff",    label:"State Admin"  },
  DEPT_ADMIN:   { bg:"#7C3AED", color:"#fff",    label:"Dept Admin"   },
  STAFF:        { bg:"#1E3A5F", color:"#B0BDD0", label:"Staff"        },
};

function getInitials(name="") { return name.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase(); }
function getAvatarBg(name) {
  const COLORS = ["#C9952A","#1A6B4A","#8B2252","#1A4A8B","#2A5C8B","#8B4513","#2C5F2E"];
  let h=0; for(let i=0;i<name.length;i++) h=name.charCodeAt(i)+((h<<5)-h);
  return COLORS[Math.abs(h)%COLORS.length];
}

function StaffCard({ user, onMessage, onlineUsers }) {
  const badge    = ROLE_BADGE[user.role] || ROLE_BADGE.STAFF;
  const isOnline = onlineUsers.has(user.id);
  return (
    <div style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`,
      borderRadius:12, padding:16, display:"flex", gap:14, alignItems:"flex-start" }}>

      {/* Avatar */}
      <div style={{ position:"relative", flexShrink:0 }}>
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.name}
            style={{ width:52, height:52, borderRadius:"50%", objectFit:"cover" }} />
        ) : (
          <div style={{ width:52, height:52, borderRadius:"50%",
            background:getAvatarBg(user.name),
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:18, fontWeight:700, color:"#fff" }}>
            {getInitials(user.name)}
          </div>
        )}
        <div style={{ position:"absolute", bottom:0, right:0,
          width:13, height:13, borderRadius:"50%",
          background:isOnline ? C.online : "#4B6280",
          border:`2px solid ${C.surfaceAlt}` }} />
      </div>

      {/* Info */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
          <span style={{ color:C.text, fontWeight:700, fontSize:14 }}>{user.name}</span>
          <span style={{ fontSize:10, padding:"2px 7px", borderRadius:8,
            background:badge.bg, color:badge.color, fontWeight:700 }}>
            {badge.label}
          </span>
        </div>

        <div style={{ color:C.muted, fontSize:12, marginBottom:3, fontFamily:"monospace" }}>
          {user.staffId}
        </div>

        <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:6 }}>
          {user.state && (
            <span style={{ color:C.ghost, fontSize:12 }}>📍 {user.state.name}</span>
          )}
          {user.department && (
            <span style={{ color:C.ghost, fontSize:12 }}>🏢 {user.department.name}</span>
          )}
          {user.postOffice && (
            <span style={{ color:C.ghost, fontSize:12 }}>🏤 {user.postOffice}</span>
          )}
        </div>

        {user.lastSeenAt && (
          <div style={{ color:isOnline ? C.online : C.ghost, fontSize:11 }}>
            {isOnline ? "● Online now" : `Last seen ${formatDistanceToNow(new Date(user.lastSeenAt), { addSuffix: true })}`}
          </div>
        )}
      </div>

      {/* DM button */}
      <button onClick={() => onMessage(user)}
        style={{ padding:"6px 14px", borderRadius:8, border:`1px solid ${C.border}`,
          background:"transparent", color:C.textMid, cursor:"pointer",
          fontSize:12, fontWeight:600, fontFamily:"'DM Sans',sans-serif",
          flexShrink:0, whiteSpace:"nowrap" }}>
        💬 Message
      </button>
    </div>
  );
}

export default function StaffDirectoryPage({ onOpenDM }) {
  const [users, setUsers]         = useState([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [page, setPage]           = useState(1);
  const [hasMore, setHasMore]     = useState(false);

  // Filters
  const [search, setSearch]       = useState("");
  const [states, setStates]       = useState([]);
  const [depts, setDepts]         = useState([]);
  const [filterState, setFilterState] = useState("");
  const [filterDept, setFilterDept]   = useState("");
  const [filterRole, setFilterRole]   = useState("");
  const [filterOnline, setFilterOnline] = useState(false);

  const LIMIT = 24;

  // Load setup data (states + depts for filters)
  useEffect(() => {
    Promise.all([
      api.get("/users/setup/options"),
    ]).then(([opts]) => {
      setStates(opts.data.states || []);
      setDepts(opts.data.departments || []);
    }).catch(() => {});
  }, []);

  const load = useCallback(async (pageNum = 1, append = false) => {
    setLoading(true);
    try {
      const params = {
        search: search || undefined,
        stateId: filterState || undefined,
        departmentId: filterDept || undefined,
        role: filterRole || undefined,
        limit: LIMIT,
        offset: (pageNum - 1) * LIMIT,
      };
      const r = await usersAPI.directory(params);
      const newUsers = r.data.users || [];
      setUsers(prev => append ? [...prev, ...newUsers] : newUsers);
      setTotal(r.data.total || 0);
      setHasMore(r.data.hasMore || false);
      setPage(pageNum);
    } catch {}
    finally { setLoading(false); }
  }, [search, filterState, filterDept, filterRole]);

  useEffect(() => { load(1, false); }, [load]);

  // Get online users from socket context
  useEffect(() => {
    const sock = window.__nipostSocket;
    if (sock) {
      sock.emit("users:whoIsOnline");
      sock.on("users:online", ids => setOnlineUsers(new Set(ids)));
    }
  }, []);

  const filtered = filterOnline
    ? users.filter(u => onlineUsers.has(u.id))
    : users;

  const handleMessage = (user) => { onOpenDM?.(user.id); };

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column",
      background:C.bg, fontFamily:"'DM Sans',sans-serif", overflow:"hidden" }}>

      {/* Header */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`,
        padding:"14px clamp(12px, 3vw, 24px)", flexShrink:0 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <h2 style={{ color:C.text, fontSize:18, fontWeight:700, margin:0 }}>
            👥 Staff Directory
          </h2>
          <span style={{ color:C.muted, fontSize:13 }}>{total.toLocaleString()} staff</span>
        </div>

        {/* Search */}
        <input value={search} onChange={e=>{ setSearch(e.target.value); }}
          placeholder="Search by name, staff ID, email, or post office..."
          style={{ width:"100%", padding:"9px 12px", borderRadius:8,
            border:`1px solid ${C.border}`, background:C.surfaceAlt,
            color:C.text, fontSize:13, fontFamily:"'DM Sans',sans-serif",
            outline:"none", marginBottom:12, boxSizing:"border-box" }} />

        {/* Filters */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
          <select value={filterState} onChange={e=>setFilterState(e.target.value)}
            style={{ padding:"6px 10px", borderRadius:7, border:`1px solid ${C.border}`,
              background:C.surfaceAlt, color:filterState?C.text:C.muted,
              fontSize:12, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
            <option value="">All States</option>
            {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <select value={filterDept} onChange={e=>setFilterDept(e.target.value)}
            style={{ padding:"6px 10px", borderRadius:7, border:`1px solid ${C.border}`,
              background:C.surfaceAlt, color:filterDept?C.text:C.muted,
              fontSize:12, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
            <option value="">All Departments</option>
            {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>

          <select value={filterRole} onChange={e=>setFilterRole(e.target.value)}
            style={{ padding:"6px 10px", borderRadius:7, border:`1px solid ${C.border}`,
              background:C.surfaceAlt, color:filterRole?C.text:C.muted,
              fontSize:12, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
            <option value="">All Roles</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="STATE_ADMIN">State Admin</option>
            <option value="DEPT_ADMIN">Dept Admin</option>
            <option value="STAFF">Staff</option>
          </select>

          <label style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer",
            fontSize:12, color:filterOnline?C.online:C.muted, fontWeight:600 }}>
            <input type="checkbox" checked={filterOnline}
              onChange={e=>setFilterOnline(e.target.checked)}
              style={{ accentColor:C.online }} />
            Online only ({onlineUsers.size})
          </label>

          {(filterState||filterDept||filterRole||filterOnline||search) && (
            <button onClick={()=>{ setFilterState(""); setFilterDept(""); setFilterRole(""); setFilterOnline(false); setSearch(""); }}
              style={{ padding:"5px 12px", borderRadius:7, border:`1px solid ${C.border}`,
                background:"transparent", color:C.muted, cursor:"pointer",
                fontSize:12, fontFamily:"'DM Sans',sans-serif" }}>
              ✕ Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex:1, overflowY:"auto", padding:"clamp(12px, 3vw, 24px)" }}>
        {loading && page === 1 && (
          <div style={{ textAlign:"center", padding:40, color:C.muted, fontSize:13 }}>Loading staff...</div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign:"center", padding:60, color:C.ghost }}>
            <div style={{ fontSize:40, marginBottom:12 }}>👤</div>
            <div style={{ color:C.muted, fontSize:15 }}>No staff found</div>
            <div style={{ fontSize:13, marginTop:6 }}>Try adjusting your filters</div>
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(min(100%, 280px), 1fr))", gap:12 }}>
          {filtered.map(u => (
            <StaffCard key={u.id} user={u} onMessage={handleMessage} onlineUsers={onlineUsers} />
          ))}
        </div>

        {/* Load more */}
        {hasMore && !loading && (
          <div style={{ textAlign:"center", marginTop:24 }}>
            <button onClick={() => load(page + 1, true)}
              style={{ padding:"9px 24px", borderRadius:8, border:`1px solid ${C.border}`,
                background:"transparent", color:C.muted, cursor:"pointer",
                fontFamily:"'DM Sans',sans-serif", fontSize:13 }}>
              Load more staff
            </button>
          </div>
        )}
        {loading && page > 1 && (
          <div style={{ textAlign:"center", padding:20, color:C.muted, fontSize:13 }}>
            Loading...
          </div>
        )}
      </div>
    </div>
  );
}
