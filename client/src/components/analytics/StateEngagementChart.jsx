
// client/src/components/analytics/StateEngagementChart.jsx
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#0D2244", border:"1px solid #1E3A5F", borderRadius:8, padding:"10px 14px", fontSize:12 }}>
      <div style={{ color:"#E8EDF5", fontWeight:700, marginBottom:6 }}>{label}</div>
      <div style={{ color:"#D4A843", marginBottom:3 }}>Messages: <strong>{payload[0]?.value}</strong></div>
      <div style={{ color:"#2563EB" }}>Staff: <strong>{payload[1]?.value}</strong></div>
    </div>
  );
};

export default function StateEngagementChart({ data, loading }) {
  const top15 = (data || []).slice(0, 15);
  const maxVal = Math.max(...top15.map(d => d.messages), 1);

  return (
    <div style={{ background:"#0D2244", border:"1px solid #1E3A5F", borderRadius:12, padding:"20px 16px" }}>
      <div style={{ marginBottom:20 }}>
        <h3 style={{ color:"#E8EDF5", fontSize:16, fontWeight:700, margin:0 }}>State Engagement</h3>
        <p style={{ color:"#6B8299", fontSize:12, margin:"3px 0 0" }}>Top 15 states by message activity</p>
      </div>

      {loading ? (
        <div style={{ height:300, display:"flex", alignItems:"center", justifyContent:"center", color:"#4B6280", fontSize:13 }}>
          Loading...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={top15} margin={{ top:5, right:10, left:-20, bottom:40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E3A5F" horizontal={true} vertical={false} />
            <XAxis dataKey="code" tick={{ fill:"#4B6280", fontSize:10 }} angle={-45} textAnchor="end"
              axisLine={false} tickLine={false} interval={0} />
            <YAxis tick={{ fill:"#4B6280", fontSize:11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill:"rgba(255,255,255,0.03)" }} />
            <Bar dataKey="messages" name="Messages" radius={[4,4,0,0]}>
              {top15.map((_, i) => (
                <Cell key={i} fill={i === 0 ? "#D4A843" : i < 3 ? "#2563EB" : "#1E3A5F"} />
              ))}
            </Bar>
            <Bar dataKey="users" name="Staff" radius={[4,4,0,0]} fill="#7C3AED33" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
