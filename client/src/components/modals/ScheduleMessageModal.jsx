
// client/src/components/modals/ScheduleMessageModal.jsx — Phase 3
import { useState, useEffect } from "react";
import { scheduledAPI, channelsAPI } from "../../services/api";
import { format } from "date-fns";

const C = {
  surfaceAlt:"#0D2244", border:"#1E3A5F", gold:"var(--accent-color, #D4A843)",
  text:"#E8EDF5", muted:"#6B8299", textMid:"#B0BDD0", ghost:"#2E4A6B",
};

const s = {
  input:{ width:"100%", padding:"9px 12px", borderRadius:8, border:`1px solid ${C.border}`,
    background:"#081832", color:C.text, fontSize:14, marginBottom:14,
    boxSizing:"border-box", fontFamily:"'DM Sans',sans-serif", outline:"none" },
  label:{ display:"block", color:C.muted, fontSize:12, fontWeight:600,
    letterSpacing:"0.06em", marginBottom:6 },
};

export default function ScheduleMessageModal({ onClose, defaultChannelId }) {
  const [tab, setTab]             = useState("create");
  const [channels, setChannels]   = useState([]);
  const [scheduled, setScheduled] = useState([]);
  const [form, setForm] = useState({
    content:"", type:"ANNOUNCEMENT", channelId: defaultChannelId||"",
    scheduledAt:"", memoRef:"", memoTo:"All NiPOST Staff",
  });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");

  useEffect(() => {
    channelsAPI.listAll().then(r => setChannels(r.data.channels || [])).catch(()=>{});
    loadScheduled();
  }, []);

  const loadScheduled = () => {
    scheduledAPI.list("ALL").then(r => setScheduled(r.data.messages || [])).catch(()=>{});
  };

  const handleCreate = async () => {
    if (!form.content.trim()) { setError("Message content required"); return; }
    if (!form.channelId)      { setError("Please select a channel"); return; }
    if (!form.scheduledAt)    { setError("Schedule date/time required"); return; }
    if (new Date(form.scheduledAt) <= new Date()) { setError("Scheduled time must be in the future"); return; }

    setLoading(true); setError(""); setSuccess("");
    try {
      await scheduledAPI.create({
        content: form.content.trim(),
        type: form.type,
        channelId: form.channelId,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        memoRef: form.type==="MEMO" ? form.memoRef : undefined,
        memoTo:  form.type==="MEMO" ? form.memoTo  : undefined,
      });
      setSuccess("Message scheduled successfully!");
      setForm(f => ({ ...f, content:"", scheduledAt:"", memoRef:"" }));
      loadScheduled();
    } catch(e) { setError(e.response?.data?.error || "Failed to schedule"); }
    finally { setLoading(false); }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this scheduled message?")) return;
    try { await scheduledAPI.cancel(id); loadScheduled(); }
    catch(e) { alert(e.response?.data?.error || "Failed"); }
  };

  const STATUS_COLORS = { PENDING:"#F59E0B", SENT:"#22C55E", FAILED:"#EF4444", CANCELLED:"#6B8299" };
  const now = new Date(); now.setMinutes(now.getMinutes() + 5);
  const minDateTime = now.toISOString().slice(0,16);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex",
      alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:14,
        width:"min(600px,95vw)", maxHeight:"90vh", overflow:"hidden", display:"flex", flexDirection:"column" }}>

        {/* Header */}
        <div style={{ padding:"18px 22px", borderBottom:`1px solid ${C.border}`,
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <h3 style={{ color:C.gold, margin:0, fontSize:17 }}>⏰ Scheduled Messages</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.muted, fontSize:20, cursor:"pointer" }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", borderBottom:`1px solid ${C.border}` }}>
          {[["create","+ Schedule New"],["list","Scheduled Queue"]].map(([id,label]) => (
            <button key={id} onClick={()=>setTab(id)}
              style={{ padding:"10px 18px", border:"none", background:"none", cursor:"pointer",
                fontSize:13, fontWeight:600, fontFamily:"'DM Sans',sans-serif",
                color:tab===id?C.gold:C.muted,
                borderBottom:tab===id?`2px solid ${C.gold}`:"2px solid transparent" }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:22 }}>

          {tab === "create" && (
            <>
              {error   && <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:8, padding:"9px 14px", color:"#F87171", fontSize:13, marginBottom:14 }}>{error}</div>}
              {success && <div style={{ background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.2)", borderRadius:8, padding:"9px 14px", color:"#86EFAC", fontSize:13, marginBottom:14 }}>{success}</div>}

              <label style={s.label}>Channel *</label>
              <select value={form.channelId} onChange={e=>setForm({...form,channelId:e.target.value})} style={s.input}>
                <option value="">— Select Channel —</option>
                {channels.filter(ch=>ch.isMember||true).map(ch => (
                  <option key={ch.id} value={ch.id}>#{ch.name} ({ch.type})</option>
                ))}
              </select>

              <label style={s.label}>Message Type *</label>
              <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} style={s.input}>
                <option value="ANNOUNCEMENT">📢 Announcement</option>
                <option value="MEMO">📄 Official Memo</option>
                <option value="MESSAGE">💬 Regular Message</option>
              </select>

              {form.type === "MEMO" && (
                <>
                  <label style={s.label}>Memo Reference</label>
                  <input value={form.memoRef} onChange={e=>setForm({...form,memoRef:e.target.value})}
                    placeholder="e.g. HR/MEMO/2026/012" style={s.input} />
                  <label style={s.label}>To:</label>
                  <input value={form.memoTo} onChange={e=>setForm({...form,memoTo:e.target.value})} style={s.input} />
                </>
              )}

              <label style={s.label}>Message Content *</label>
              <textarea value={form.content} onChange={e=>setForm({...form,content:e.target.value})}
                rows={5} placeholder="Write your message here..."
                style={{ ...s.input, resize:"vertical", fontFamily:"inherit" }} />

              <label style={s.label}>Schedule Date & Time *</label>
              <input type="datetime-local" value={form.scheduledAt} min={minDateTime}
                onChange={e=>setForm({...form,scheduledAt:e.target.value})} style={s.input} />

              {form.scheduledAt && (
                <div style={{ background:"rgba(212,168,67,0.06)", border:"1px solid rgba(212,168,67,0.15)",
                  borderRadius:8, padding:"9px 12px", fontSize:12, color:C.muted, marginBottom:14 }}>
                  ⏰ Will be sent on <strong style={{ color:C.gold }}>
                    {format(new Date(form.scheduledAt), "EEEE d MMMM yyyy 'at' h:mm a")}
                  </strong>
                </div>
              )}

              <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                <button onClick={onClose}
                  style={{ padding:"9px 18px", borderRadius:8, border:`1px solid ${C.border}`,
                    background:"none", color:C.muted, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                  Cancel
                </button>
                <button onClick={handleCreate} disabled={loading}
                  style={{ padding:"9px 20px", borderRadius:8, border:"none",
                    background:C.gold, color:"#0A1F44", fontWeight:700, cursor:"pointer",
                    fontFamily:"'DM Sans',sans-serif", opacity:loading?0.7:1 }}>
                  {loading ? "Scheduling..." : "⏰ Schedule Message"}
                </button>
              </div>
            </>
          )}

          {tab === "list" && (
            <>
              {scheduled.length === 0 && (
                <div style={{ textAlign:"center", padding:32, color:C.ghost, fontSize:13 }}>No scheduled messages</div>
              )}
              {scheduled.map(msg => (
                <div key={msg.id} style={{ background:"#081832", border:`1px solid ${C.border}`,
                  borderRadius:10, padding:14, marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10, flexWrap:"wrap" }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                        <span style={{ fontSize:10, padding:"2px 8px", borderRadius:10, fontWeight:700,
                          background:`${STATUS_COLORS[msg.status]}18`, color:STATUS_COLORS[msg.status] }}>
                          {msg.status}
                        </span>
                        <span style={{ fontSize:11, color:C.muted }}>{msg.type}</span>
                      </div>
                      <div style={{ color:C.textMid, fontSize:13, marginBottom:6 }}>
                        {msg.content.slice(0, 100)}{msg.content.length > 100 ? "..." : ""}
                      </div>
                      <div style={{ color:C.ghost, fontSize:12 }}>
                        ⏰ {format(new Date(msg.scheduledAt), "d MMM yyyy, h:mm a")}
                        {msg.sentAt && <span style={{ marginLeft:8, color:"#22C55E" }}>✓ Sent {format(new Date(msg.sentAt), "d MMM, h:mm a")}</span>}
                      </div>
                      <div style={{ color:C.ghost, fontSize:11, marginTop:3 }}>by {msg.author?.name}</div>
                    </div>
                    {msg.status === "PENDING" && (
                      <button onClick={() => handleCancel(msg.id)}
                        style={{ padding:"5px 12px", borderRadius:6, border:"none",
                          background:"rgba(239,68,68,0.12)", color:"#F87171",
                          cursor:"pointer", fontSize:12, fontWeight:600, flexShrink:0 }}>
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
