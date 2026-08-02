
// client/src/pages/ReportsPage.jsx — Phase 4
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";

// inline API definition (add to api.js as well)
import api from "../services/api";
export const reportsAPI2 = {
  staffActivity:(month)=>api.get(`/reports/staff-activity?month=${month}`),
  stateSummary:(month)=>api.get(`/reports/state-summary?month=${month}`),
  deptSummary:(month)=>api.get(`/reports/department-summary?month=${month}`),
  exportCSV:(month)=>{ window.open(`/api/reports/export/staff-activity?month=${month}`,"_blank"); },
};

const C = {
  bg:"#081832", surface:"#081A35", surfaceAlt:"#0D2244", border:"#1E3A5F",
  gold:"#D4A843", text:"#E8EDF5", muted:"#6B8299", textMid:"#B0BDD0", ghost:"#2E4A6B",
};
const ROLE_BADGE = { SUPER_ADMIN:{bg:"#D4A843",color:"#0A1F44"}, STATE_ADMIN:{bg:"#2563EB",color:"#fff"}, DEPT_ADMIN:{bg:"#7C3AED",color:"#fff"} };

export default function ReportsPage({ onClose }) {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const [month, setMonth]         = useState(defaultMonth);
  const [tab, setTab]             = useState("staff");
  const [staffData, setStaffData] = useState([]);
  const [stateData, setStateData] = useState([]);
  const [deptData, setDeptData]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sr, str, dr] = await Promise.all([
        reportsAPI2.staffActivity(month),
        reportsAPI2.stateSummary(month),
        reportsAPI2.deptSummary(month),
      ]);
      setStaffData(sr.data.report || []);
      setStateData(str.data.summary || []);
      setDeptData(dr.data.summary || []);
    } catch(e) { console.error("Reports error:", e); }
    finally { setLoading(false); }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const filteredStaff = staffData.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.staffId.includes(search) || u.state?.toLowerCase().includes(search.toLowerCase())
  );

  const TABS = [
    { id:"staff",  label:"👥 Staff Activity" },
    { id:"states", label:"📍 State Summary"  },
    { id:"depts",  label:"🏢 Departments"    },
  ];

  return (
    <div style={{ position:"fixed", inset:0, background:C.bg, zIndex:2000,
      display:"flex", flexDirection:"column", fontFamily:"'DM Sans',sans-serif", overflow:"hidden" }}>

      {/* Header */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`,
        padding:"0 24px", display:"flex", alignItems:"center", gap:16, height:56, flexShrink:0 }}>
        <div style={{ fontSize:22 }}>📈</div>
        <div>
          <div style={{ color:C.text, fontWeight:700, fontSize:16 }}>Performance Reports</div>
          <div style={{ color:C.muted, fontSize:11 }}>Monthly staff & state activity</div>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
          <input type="month" value={month} onChange={e=>setMonth(e.target.value)}
            style={{ padding:"5px 10px", borderRadius:7, border:`1px solid ${C.border}`,
              background:C.surfaceAlt, color:C.text, fontSize:13, cursor:"pointer",
              fontFamily:"'DM Sans',sans-serif", outline:"none" }} />
          <button onClick={()=>reportsAPI2.exportCSV(month)}
            style={{ padding:"6px 14px", borderRadius:7, border:`1px solid ${C.border}`,
              background:"transparent", color:C.gold, cursor:"pointer", fontSize:12,
              fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
            ⬇ Export CSV
          </button>
          <button onClick={onClose}
            style={{ padding:"6px 14px", borderRadius:7, border:`1px solid ${C.border}`,
              background:"transparent", color:C.muted, cursor:"pointer", fontSize:12,
              fontFamily:"'DM Sans',sans-serif" }}>
            ✕ Close
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`,
        background:C.surface, flexShrink:0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ padding:"11px 20px", border:"none", background:"none", cursor:"pointer",
              fontSize:13, fontWeight:600, fontFamily:"'DM Sans',sans-serif",
              color:tab===t.id?C.gold:C.muted,
              borderBottom:tab===t.id?`2px solid ${C.gold}`:"2px solid transparent" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:"auto", padding:24 }}>

        {loading && <div style={{ textAlign:"center", padding:40, color:C.muted, fontSize:13 }}>Loading report...</div>}

        {/* Staff Activity */}
        {tab === "staff" && !loading && (
          <>
            {/* Summary bar */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
              {[
                { label:"Total Staff",  value:staffData.length,                           color:C.gold },
                { label:"Active",       value:staffData.filter(u=>u.totalMessages>0).length, color:"#22C55E" },
                { label:"Inactive",     value:staffData.filter(u=>u.totalMessages===0).length, color:"#EF4444" },
                { label:"Total Messages",value:staffData.reduce((s,u)=>s+u.totalMessages,0),  color:"#2563EB" },
              ].map(c => (
                <div key={c.label} style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`,
                  borderRadius:10, padding:"12px 16px", borderTop:`3px solid ${c.color}` }}>
                  <div style={{ color:c.color, fontSize:22, fontWeight:700 }}>{c.value?.toLocaleString()}</div>
                  <div style={{ color:C.muted, fontSize:12 }}>{c.label}</div>
                </div>
              ))}
            </div>

            {/* Search */}
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search by name, staff ID, or state..."
              style={{ width:"100%", padding:"9px 12px", borderRadius:8, border:`1px solid ${C.border}`,
                background:C.surfaceAlt, color:C.text, fontSize:13, marginBottom:16,
                boxSizing:"border-box", fontFamily:"'DM Sans',sans-serif", outline:"none" }} />

            {/* Table */}
            <div style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                  <thead>
                    <tr style={{ background:C.surface }}>
                      {["Rank","Name","Staff ID","State","Dept","Messages","Polls","Score","Last Seen"].map(h => (
                        <th key={h} style={{ padding:"10px 14px", textAlign:"left",
                          color:C.muted, fontWeight:700, fontSize:11, letterSpacing:"0.05em",
                          whiteSpace:"nowrap", position:"sticky", top:0, background:C.surface }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStaff.slice(0,100).map((u, i) => {
                      const badge = ROLE_BADGE[u.role];
                      return (
                        <tr key={u.id} style={{ borderBottom:`1px solid ${C.border}` }}
                          onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          <td style={{ padding:"9px 14px", color:i<3?C.gold:C.ghost, fontWeight:700 }}>#{i+1}</td>
                          <td style={{ padding:"9px 14px" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <span style={{ color:C.text, fontWeight:500 }}>{u.name}</span>
                              {badge && <span style={{ fontSize:9, padding:"1px 5px", borderRadius:8, background:badge.bg, color:badge.color, fontWeight:700 }}>{u.role.split("_")[0]}</span>}
                            </div>
                          </td>
                          <td style={{ padding:"9px 14px", color:C.muted, fontFamily:"monospace", fontSize:11 }}>{u.staffId}</td>
                          <td style={{ padding:"9px 14px", color:C.muted }}>{u.stateCode}</td>
                          <td style={{ padding:"9px 14px", color:C.muted, fontSize:11 }}>{u.department?.slice(0,12)}</td>
                          <td style={{ padding:"9px 14px" }}>
                            <span style={{ color: u.totalMessages>0?C.textMid:C.ghost }}>{u.totalMessages}</span>
                          </td>
                          <td style={{ padding:"9px 14px", color:C.muted }}>{u.pollVotes}</td>
                          <td style={{ padding:"9px 14px" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                              <div style={{ width:40, height:6, background:C.border, borderRadius:3, overflow:"hidden" }}>
                                <div style={{ height:"100%", borderRadius:3,
                                  width:`${Math.min(100,Math.round((u.activityScore/Math.max(...filteredStaff.map(x=>x.activityScore),1))*100))}%`,
                                  background:u.activityScore>0?C.gold:"#1E3A5F" }} />
                              </div>
                              <span style={{ color:C.muted, fontSize:11 }}>{u.activityScore}</span>
                            </div>
                          </td>
                          <td style={{ padding:"9px 14px", color:C.ghost, fontSize:11 }}>
                            {u.lastSeenAt ? format(new Date(u.lastSeenAt),"d MMM") : "Never"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* State Summary */}
        {tab === "states" && !loading && (
          <div style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:C.surface }}>
                    {["Rank","State","Code","Total Staff","Active Staff","Messages","Engagement %"].map(h => (
                      <th key={h} style={{ padding:"10px 16px", textAlign:"left", color:C.muted, fontWeight:700, fontSize:11, letterSpacing:"0.05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stateData.map((s, i) => (
                    <tr key={s.id} style={{ borderBottom:`1px solid ${C.border}` }}
                      onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{ padding:"9px 16px", color:i<3?C.gold:C.ghost, fontWeight:700 }}>#{i+1}</td>
                      <td style={{ padding:"9px 16px", color:C.text, fontWeight:500 }}>{s.name}</td>
                      <td style={{ padding:"9px 16px", color:C.muted, fontFamily:"monospace" }}>{s.code}</td>
                      <td style={{ padding:"9px 16px", color:C.textMid }}>{s.totalStaff}</td>
                      <td style={{ padding:"9px 16px", color:"#22C55E" }}>{s.activeStaff}</td>
                      <td style={{ padding:"9px 16px", color:C.gold, fontWeight:600 }}>{s.totalMessages}</td>
                      <td style={{ padding:"9px 16px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ width:60, height:8, background:C.border, borderRadius:4, overflow:"hidden" }}>
                            <div style={{ height:"100%", width:`${s.engagementRate}%`, background:s.engagementRate>70?"#22C55E":s.engagementRate>40?C.gold:"#EF4444", borderRadius:4 }} />
                          </div>
                          <span style={{ color:C.muted, fontSize:11 }}>{s.engagementRate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Department Summary */}
        {tab === "depts" && !loading && (
          <div style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:C.surface }}>
                    {["Rank","Department","Total Staff","Messages This Month"].map(h => (
                      <th key={h} style={{ padding:"10px 16px", textAlign:"left", color:C.muted, fontWeight:700, fontSize:11, letterSpacing:"0.05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deptData.map((d, i) => (
                    <tr key={d.id} style={{ borderBottom:`1px solid ${C.border}` }}
                      onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{ padding:"9px 16px", color:i<3?C.gold:C.ghost, fontWeight:700 }}>#{i+1}</td>
                      <td style={{ padding:"9px 16px", color:C.text, fontWeight:500 }}>{d.name}</td>
                      <td style={{ padding:"9px 16px", color:C.textMid }}>{d.totalStaff}</td>
                      <td style={{ padding:"9px 16px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ width:80, height:8, background:C.border, borderRadius:4, overflow:"hidden" }}>
                            <div style={{ height:"100%", borderRadius:4,
                              width:`${Math.round((d.messages/Math.max(...deptData.map(x=>x.messages),1))*100)}%`,
                              background:"#7C3AED" }} />
                          </div>
                          <span style={{ color:C.gold, fontWeight:700 }}>{d.messages}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
