
// client/src/components/analytics/StatsGrid.jsx
const colors = {
  bg:"#081832", surface:"#081A35", surfaceAlt:"#0D2244", border:"#1E3A5F",
  gold:"var(--accent-color, #D4A843)", text:"#E8EDF5", muted:"#6B8299", textMid:"#B0BDD0",
};

export default function StatsGrid({ data, loading }) {
  const cards = [
    { label:"Total Staff",       value:data?.totalUsers,          icon:"👥", color:"#D4A843",  sub:`${data?.activeUsers||0} active` },
    { label:"Online Now",        value:data?.onlineSockets,       icon:"🟢", color:"#22C55E",  sub:"live connections" },
    { label:"Total Messages",    value:data?.totalMessages,       icon:"💬", color:"#2563EB",  sub:`${data?.messagesThisWeek||0} this week` },
    { label:"Channels",          value:data?.totalChannels,       icon:"📢", color:"#7C3AED",  sub:"across all states" },
    { label:"Polls Created",     value:data?.totalPolls,          icon:"🗳️", color:"#F59E0B",  sub:"organisation-wide" },
    { label:"Files Shared",      value:data?.totalAttachments,    icon:"📎", color:"#06B6D4",  sub:"images + documents" },
    { label:"Pending Verify",    value:data?.pendingUsers,        icon:"⏳", color:"#EF4444",  sub:"awaiting activation" },
    { label:"New Staff (7d)",    value:data?.newUsersThisWeek,    icon:"✨", color:"#22C55E",  sub:"registered this week" },
  ];

  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14 }}>
      {cards.map((c, i) => (
        <div key={i} style={{
          background:colors.surfaceAlt, border:`1px solid ${colors.border}`,
          borderRadius:12, padding:"16px 18px",
          borderTop:`3px solid ${c.color}`,
          opacity: loading ? 0.5 : 1, transition:"opacity 0.3s",
        }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
            <span style={{ fontSize:24 }}>{c.icon}</span>
            <span style={{ color:c.color, fontSize:11, fontWeight:700, letterSpacing:"0.06em",
              background:`${c.color}18`, padding:"2px 8px", borderRadius:10 }}>
              LIVE
            </span>
          </div>
          <div style={{ color:c.color, fontSize:28, fontWeight:700, marginBottom:4 }}>
            {loading ? "—" : (c.value ?? "—").toLocaleString?.() ?? c.value}
          </div>
          <div style={{ color:colors.text, fontSize:13, fontWeight:600, marginBottom:3 }}>{c.label}</div>
          <div style={{ color:colors.muted, fontSize:11 }}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
