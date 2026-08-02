
// client/src/components/analytics/ActivityFeed.jsx
import { formatDistanceToNow } from "date-fns";

const ACTION_META = {
  CHANNEL_CREATED:        { icon:"📢", color:"#22C55E", label:"Channel created" },
  CHANNEL_ARCHIVED:       { icon:"📦", color:"#F59E0B", label:"Channel archived" },
  JOIN_REQUEST_APPROVED:  { icon:"✅", color:"#22C55E", label:"Join approved" },
  JOIN_REQUEST_REJECTED:  { icon:"❌", color:"#EF4444", label:"Join rejected" },
  USER_UPDATED:           { icon:"👤", color:"#D4A843", label:"User updated" },
  MESSAGE_PINNED:         { icon:"📌", color:"#2563EB", label:"Message pinned" },
  EMERGENCY_BROADCAST:    { icon:"🚨", color:"#EF4444", label:"Emergency broadcast" },
  BULK_MEMO_SENT:         { icon:"📬", color:"#7C3AED", label:"Bulk memo sent" },
  SCHEDULED_MESSAGE_CREATED:{ icon:"⏰", color:"#06B6D4", label:"Message scheduled" },
  STAFF_IMPORT_COMPLETED: { icon:"📥", color:"#22C55E", label:"Staff import done" },
};

export default function ActivityFeed({ data, loading }) {
  return (
    <div style={{ background:"#0D2244", border:"1px solid #1E3A5F", borderRadius:12, padding:"20px 16px" }}>
      <div style={{ marginBottom:16 }}>
        <h3 style={{ color:"#E8EDF5", fontSize:16, fontWeight:700, margin:0 }}>Recent Admin Activity</h3>
        <p style={{ color:"#6B8299", fontSize:12, margin:"3px 0 0" }}>Last 20 audit events</p>
      </div>

      {loading ? (
        <div style={{ color:"#4B6280", fontSize:13, textAlign:"center", padding:24 }}>Loading...</div>
      ) : (data||[]).length === 0 ? (
        <div style={{ color:"#4B6280", fontSize:13, textAlign:"center", padding:24 }}>No activity yet</div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
          {(data||[]).map((log, i) => {
            const meta = ACTION_META[log.action] || { icon:"⚙️", color:"#6B8299", label:log.action };
            return (
              <div key={log.id} style={{
                display:"flex", gap:12, alignItems:"flex-start",
                padding:"10px 0",
                borderBottom: i < data.length-1 ? "1px solid #1A3356" : "none",
              }}>
                <div style={{ width:32, height:32, borderRadius:"50%", background:`${meta.color}18`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:14, flexShrink:0, marginTop:1 }}>
                  {meta.icon}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                    <span style={{ color:"#B0BDD0", fontSize:13, fontWeight:500 }}>
                      {meta.label}
                    </span>
                    <span style={{ color:"#4B6280", fontSize:11, flexShrink:0 }}>
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix:true })}
                    </span>
                  </div>
                  <div style={{ color:"#4B6280", fontSize:12, marginTop:2 }}>
                    by <span style={{ color:"#6B8299" }}>{log.admin?.name}</span>
                    {log.target && <span> · {log.target.slice(0,20)}</span>}
                  </div>
                </div>
                <span style={{ fontSize:10, padding:"2px 8px", borderRadius:10, fontWeight:700, flexShrink:0,
                  background:`${meta.color}15`, color:meta.color, whiteSpace:"nowrap" }}>
                  {log.action.split("_")[0]}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
