
// client/src/components/analytics/MessageVolumeChart.jsx
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";

const COLORS = { messages:"#2563EB", announcements:"#D4A843", memos:"#7C3AED", polls:"#22C55E" };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#0D2244", border:"1px solid #1E3A5F", borderRadius:8,
      padding:"10px 14px", fontSize:12 }}>
      <div style={{ color:"#E8EDF5", fontWeight:600, marginBottom:6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color:p.color, marginBottom:3 }}>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

export default function MessageVolumeChart({ data, days, onDaysChange, loading }) {
  const formatted = (data||[]).map(d => ({
    ...d,
    label: format(parseISO(d.date), days <= 14 ? "dd MMM" : "MMM dd"),
  }));

  return (
    <div style={{ background:"#0D2244", border:"1px solid #1E3A5F", borderRadius:12, padding:"20px 16px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div>
          <h3 style={{ color:"#E8EDF5", fontSize:16, fontWeight:700, margin:0 }}>Message Volume</h3>
          <p style={{ color:"#6B8299", fontSize:12, margin:"3px 0 0" }}>Daily message activity across all channels</p>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {[7, 14, 30, 90].map(d => (
            <button key={d} onClick={() => onDaysChange(d)}
              style={{ padding:"4px 12px", borderRadius:6, border:"1px solid",
                borderColor: days===d ? "#D4A843" : "#1E3A5F",
                background: days===d ? "rgba(212,168,67,0.1)" : "transparent",
                color: days===d ? "#D4A843" : "#6B8299",
                cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ height:280, display:"flex", alignItems:"center", justifyContent:"center", color:"#4B6280", fontSize:13 }}>
          Loading chart...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={formatted} margin={{ top:5, right:10, left:-20, bottom:0 }}>
            <defs>
              {Object.entries(COLORS).map(([k, c]) => (
                <linearGradient key={k} id={`grad-${k}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={c} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={c} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E3A5F" vertical={false} />
            <XAxis dataKey="label" tick={{ fill:"#4B6280", fontSize:11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill:"#4B6280", fontSize:11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize:12, color:"#6B8299", paddingTop:12 }} />
            <Area type="monotone" dataKey="messages"      stroke={COLORS.messages}      fill={`url(#grad-messages)`}      strokeWidth={2} name="Messages" />
            <Area type="monotone" dataKey="announcements" stroke={COLORS.announcements} fill={`url(#grad-announcements)`} strokeWidth={2} name="Announcements" />
            <Area type="monotone" dataKey="memos"         stroke={COLORS.memos}         fill={`url(#grad-memos)`}         strokeWidth={2} name="Memos" />
            <Area type="monotone" dataKey="polls"         stroke={COLORS.polls}         fill={`url(#grad-polls)`}         strokeWidth={2} name="Polls" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
