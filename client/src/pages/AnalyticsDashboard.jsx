
// client/src/pages/AnalyticsDashboard.jsx — Phase 3
import { useState, useEffect, useCallback } from "react";
import { analyticsAPI } from "../services/api";
import StatsGrid from "../components/analytics/StatsGrid";
import MessageVolumeChart from "../components/analytics/MessageVolumeChart";
import StateEngagementChart from "../components/analytics/StateEngagementChart";
import ActivityFeed from "../components/analytics/ActivityFeed";

const C = {
  bg:"#081832", surface:"#081A35", surfaceAlt:"#0D2244", border:"#1E3A5F",
  gold:"#D4A843", text:"#E8EDF5", muted:"#6B8299", textMid:"#B0BDD0", ghost:"#2E4A6B",
};

const ROLE_BADGE = {
  SUPER_ADMIN:{ bg:"#D4A843", color:"#0A1F44" },
  STATE_ADMIN: { bg:"#2563EB", color:"#fff" },
  DEPT_ADMIN:  { bg:"#7C3AED", color:"#fff" },
  STAFF:       null,
};

export default function AnalyticsDashboard({ onClose }) {
  const [overview, setOverview]           = useState(null);
  const [volumeData, setVolumeData]       = useState([]);
  const [stateData, setStateData]         = useState([]);
  const [deptData, setDeptData]           = useState([]);
  const [topChannels, setTopChannels]     = useState([]);
  const [activeStaff, setActiveStaff]     = useState([]);
  const [activity, setActivity]           = useState([]);
  const [days, setDays]                   = useState(30);
  const [loading, setLoading]             = useState(true);
  const [lastRefresh, setLastRefresh]     = useState(null);
  const [activeTab, setActiveTab]         = useState("overview");

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, vol, state, dept, topCh, staff, act] = await Promise.all([
        analyticsAPI.overview(),
        analyticsAPI.messageVolume(days),
        analyticsAPI.stateEngagement(),
        analyticsAPI.deptEngagement(),
        analyticsAPI.topChannels(10),
        analyticsAPI.activeStaff(10),
        analyticsAPI.recentActivity(),
      ]);
      setOverview(ov.data);
      setVolumeData(vol.data.data);
      setStateData(state.data.data);
      setDeptData(dept.data.data);
      setTopChannels(topCh.data.data);
      setActiveStaff(staff.data.data);
      setActivity(act.data.data);
      setLastRefresh(new Date());
    } catch (err) { console.error("Analytics load error:", err); }
    finally { setLoading(false); }
  }, [days]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(loadAll, 60000);
    return () => clearInterval(interval);
  }, [loadAll]);

  const TABS = ["overview","states","departments","channels","staff"];

  return (
    <div style={{ position:"fixed", inset:0, background:C.bg, zIndex:2000,
      display:"flex", flexDirection:"column", fontFamily:"'DM Sans',sans-serif", overflow:"hidden" }}>

      {/* Header */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`,
        padding:"0 24px", display:"flex", alignItems:"center", gap:16, height:56, flexShrink:0 }}>
        <div style={{ fontSize:22 }}>📊</div>
        <div>
          <div style={{ color:C.text, fontWeight:700, fontSize:16 }}>Analytics Dashboard</div>
          <div style={{ color:C.muted, fontSize:11 }}>
            NiPOST Connect · {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : "Loading..."}
          </div>
        </div>
        <div style={{ display:"flex", gap:8, marginLeft:"auto", alignItems:"center" }}>
          <button onClick={loadAll} disabled={loading}
            style={{ padding:"6px 14px", borderRadius:7, border:`1px solid ${C.border}`,
              background:"transparent", color:loading?C.ghost:C.gold,
              cursor:loading?"default":"pointer", fontSize:12, fontWeight:600,
              fontFamily:"'DM Sans',sans-serif" }}>
            {loading ? "⟳ Refreshing..." : "⟳ Refresh"}
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
        background:C.surface, overflowX:"auto", flexShrink:0 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            style={{ padding:"11px 20px", border:"none", background:"none", cursor:"pointer",
              fontSize:13, fontWeight:600, fontFamily:"'DM Sans',sans-serif",
              color:activeTab===t?C.gold:C.muted, textTransform:"capitalize",
              borderBottom:activeTab===t?`2px solid ${C.gold}`:"2px solid transparent",
              whiteSpace:"nowrap" }}>
            {{ overview:"📊 Overview", states:"📍 States", departments:"🏢 Departments",
               channels:"📢 Channels", staff:"👥 Staff" }[t]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:"auto", padding:24 }}>

        {activeTab === "overview" && (
          <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
            <StatsGrid data={overview} loading={loading} />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
              <MessageVolumeChart data={volumeData} days={days} onDaysChange={setDays} loading={loading} />
              <ActivityFeed data={activity} loading={loading} />
            </div>
          </div>
        )}

        {activeTab === "states" && (
          <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
            <StateEngagementChart data={stateData} loading={loading} />
            <div style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
              <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}` }}>
                <h3 style={{ color:C.text, fontSize:15, fontWeight:700, margin:0 }}>All 37 States + FCT</h3>
              </div>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                  <thead>
                    <tr style={{ background:C.surface }}>
                      {["Rank","State","Code","Staff","Messages","Members"].map(h => (
                        <th key={h} style={{ padding:"10px 16px", textAlign:"left", color:C.muted,
                          fontWeight:700, fontSize:11, letterSpacing:"0.06em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(stateData||[]).map((s, i) => (
                      <tr key={s.id} style={{ borderBottom:`1px solid ${C.border}` }}
                        onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <td style={{ padding:"9px 16px", color:i<3?C.gold:C.ghost, fontWeight:700 }}>#{i+1}</td>
                        <td style={{ padding:"9px 16px", color:C.text, fontWeight:500 }}>{s.name}</td>
                        <td style={{ padding:"9px 16px", color:C.muted, fontFamily:"monospace" }}>{s.code}</td>
                        <td style={{ padding:"9px 16px", color:C.textMid }}>{s.users}</td>
                        <td style={{ padding:"9px 16px" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{ flex:1, height:6, background:C.border, borderRadius:3, overflow:"hidden", maxWidth:80 }}>
                              <div style={{ height:"100%", width:`${Math.round((s.messages/Math.max(...stateData.map(x=>x.messages),1))*100)}%`,
                                background:C.gold, borderRadius:3 }} />
                            </div>
                            <span style={{ color:C.textMid, minWidth:30 }}>{s.messages}</span>
                          </div>
                        </td>
                        <td style={{ padding:"9px 16px", color:C.muted }}>{s.members}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "departments" && (
          <div style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
            <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}` }}>
              <h3 style={{ color:C.text, fontSize:15, fontWeight:700, margin:0 }}>Department Engagement</h3>
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:C.surface }}>
                    {["Department","Staff","Messages","Members","Activity"].map(h => (
                      <th key={h} style={{ padding:"10px 16px", textAlign:"left", color:C.muted, fontWeight:700, fontSize:11, letterSpacing:"0.06em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(deptData||[]).map((d, i) => {
                    const pct = Math.round((d.messages/Math.max(...(deptData||[]).map(x=>x.messages),1))*100);
                    return (
                      <tr key={d.id} style={{ borderBottom:`1px solid ${C.border}` }}
                        onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <td style={{ padding:"10px 16px", color:C.text, fontWeight:600 }}>{d.name}</td>
                        <td style={{ padding:"10px 16px", color:C.textMid }}>{d.users}</td>
                        <td style={{ padding:"10px 16px", color:C.textMid }}>{d.messages}</td>
                        <td style={{ padding:"10px 16px", color:C.textMid }}>{d.members}</td>
                        <td style={{ padding:"10px 16px" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{ flex:1, height:8, background:C.border, borderRadius:4, overflow:"hidden", maxWidth:120 }}>
                              <div style={{ height:"100%", width:`${pct}%`, background:"#7C3AED", borderRadius:4, transition:"width 0.5s" }} />
                            </div>
                            <span style={{ color:C.muted, fontSize:11 }}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "channels" && (
          <div style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
            <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}` }}>
              <h3 style={{ color:C.text, fontSize:15, fontWeight:700, margin:0 }}>Top Channels by Activity</h3>
            </div>
            {(topChannels||[]).map((ch, i) => (
              <div key={ch.id} style={{ display:"flex", alignItems:"center", gap:14,
                padding:"12px 20px", borderBottom:`1px solid ${C.border}` }}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span style={{ color:i<3?C.gold:C.ghost, fontWeight:700, minWidth:24, fontSize:13 }}>#{i+1}</span>
                <div style={{ flex:1 }}>
                  <div style={{ color:C.text, fontWeight:600, fontSize:13 }}>#{ch.name}</div>
                  <div style={{ color:C.muted, fontSize:11 }}>{ch.type} · {ch._count.members} members</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ color:C.gold, fontWeight:700, fontSize:18 }}>{ch._count.messages}</div>
                  <div style={{ color:C.muted, fontSize:11 }}>messages</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "staff" && (
          <div style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
            <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}` }}>
              <h3 style={{ color:C.text, fontSize:15, fontWeight:700, margin:0 }}>Most Active Staff</h3>
              <p style={{ color:C.muted, fontSize:12, margin:"3px 0 0" }}>Ranked by total message count</p>
            </div>
            {(activeStaff||[]).map((u, i) => {
              const badge = ROLE_BADGE[u.role];
              return (
                <div key={u.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 20px",
                  borderBottom:`1px solid ${C.border}` }}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <span style={{ color:i<3?C.gold:C.ghost, fontWeight:700, minWidth:24, fontSize:13 }}>#{i+1}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ color:C.text, fontWeight:600, fontSize:13 }}>{u.name}</span>
                      {badge && <span style={{ fontSize:10, padding:"1px 7px", borderRadius:20, background:badge.bg, color:badge.color, fontWeight:700 }}>{u.role.replace("_"," ")}</span>}
                    </div>
                    <div style={{ color:C.muted, fontSize:11 }}>{u.staffId} · {u.state?.name} · {u.department?.name}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ color:C.gold, fontWeight:700, fontSize:18 }}>{u._count.sentMessages}</div>
                    <div style={{ color:C.muted, fontSize:11 }}>messages</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
