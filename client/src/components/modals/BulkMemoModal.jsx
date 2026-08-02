
// client/src/components/modals/BulkMemoModal.jsx — Phase 3
import { useState, useEffect } from "react";
import { bulkAPI, channelsAPI } from "../../services/api";
import { format } from "date-fns";

const C = {
  surfaceAlt:"#0D2244", border:"#1E3A5F", gold:"#D4A843",
  text:"#E8EDF5", muted:"#6B8299", textMid:"#B0BDD0", ghost:"#2E4A6B",
  success:"#22C55E", danger:"#EF4444",
};
const inp = { width:"100%", padding:"9px 12px", borderRadius:8, border:`1px solid ${C.border}`,
  background:"#081832", color:C.text, fontSize:14, marginBottom:14,
  boxSizing:"border-box", fontFamily:"'DM Sans',sans-serif", outline:"none" };
const lbl = { display:"block", color:C.muted, fontSize:12, fontWeight:600, letterSpacing:"0.06em", marginBottom:6 };

const CHANNEL_TYPE_ICONS = { ANNOUNCEMENT:"📢", STATE:"📍", DEPARTMENT:"🏢", SUGGESTION:"💡", GENERAL:"💬" };

export default function BulkMemoModal({ onClose }) {
  const [tab, setTab]           = useState("compose");
  const [channels, setChannels] = useState([]);
  const [history, setHistory]   = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [filterType, setFilterType] = useState("ALL");
  const [form, setForm] = useState({
    subject:"", content:"", memoRef:"",
  });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [result, setResult]     = useState(null);

  useEffect(() => {
    channelsAPI.listAll().then(r => setChannels(r.data.channels || [])).catch(()=>{});
    loadHistory();
  }, []);

  const loadHistory = () => {
    bulkAPI.list().then(r => setHistory(r.data.memos || [])).catch(()=>{});
  };

  const filteredChannels = channels.filter(ch => {
    if (ch.type === "EMERGENCY") return false;
    if (filterType === "ALL") return true;
    return ch.type === filterType;
  });

  const toggleChannel = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(filteredChannels.map(ch => ch.id)));
  const clearAll  = () => setSelected(new Set());

  const handleSend = async () => {
    if (!form.subject.trim()) { setError("Subject required"); return; }
    if (!form.content.trim()) { setError("Memo content required"); return; }
    if (selected.size === 0)  { setError("Select at least one channel"); return; }
    if (!window.confirm(`Send this memo to ${selected.size} channel${selected.size!==1?"s":""}?`)) return;

    setLoading(true); setError(""); setResult(null);
    try {
      const r = await bulkAPI.create({
        subject: form.subject.trim(),
        content: form.content.trim(),
        memoRef: form.memoRef || undefined,
        channelIds: Array.from(selected),
      });
      setResult(r.data);
      setForm({ subject:"", content:"", memoRef:"" });
      setSelected(new Set());
      loadHistory();
    } catch(e) { setError(e.response?.data?.error || "Dispatch failed"); }
    finally { setLoading(false); }
  };

  const typeOptions = ["ALL","ANNOUNCEMENT","STATE","DEPARTMENT","GENERAL"];

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex",
      alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:14,
        width:"min(720px,96vw)", maxHeight:"92vh", overflow:"hidden", display:"flex", flexDirection:"column" }}>

        {/* Header */}
        <div style={{ padding:"18px 22px", borderBottom:`1px solid ${C.border}`,
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <h3 style={{ color:C.gold, margin:0, fontSize:17 }}>📬 Bulk Memo Dispatch</h3>
            <p style={{ color:C.muted, fontSize:12, margin:"3px 0 0" }}>Send one memo to multiple channels simultaneously</p>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.muted, fontSize:20, cursor:"pointer" }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", borderBottom:`1px solid ${C.border}` }}>
          {[["compose","✍️ Compose"],["history","📋 History"]].map(([id,label]) => (
            <button key={id} onClick={()=>setTab(id)}
              style={{ padding:"10px 18px", border:"none", background:"none", cursor:"pointer",
                fontSize:13, fontWeight:600, fontFamily:"'DM Sans',sans-serif",
                color:tab===id?C.gold:C.muted,
                borderBottom:tab===id?`2px solid ${C.gold}`:"2px solid transparent" }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ flex:1, overflowY:"auto" }}>
          {tab === "compose" && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", height:"100%" }}>

              {/* Left: Memo form */}
              <div style={{ padding:20, borderRight:`1px solid ${C.border}`, overflowY:"auto" }}>
                <h4 style={{ color:C.textMid, fontSize:13, margin:"0 0 14px", fontWeight:700, letterSpacing:"0.06em" }}>MEMO CONTENT</h4>

                {error  && <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:8, padding:"9px 12px", color:"#F87171", fontSize:12, marginBottom:12 }}>{error}</div>}
                {result && (
                  <div style={{ background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.2)", borderRadius:8, padding:"10px 12px", color:"#86EFAC", fontSize:12, marginBottom:12 }}>
                    ✅ {result.message}
                  </div>
                )}

                <label style={lbl}>Subject *</label>
                <input value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}
                  placeholder="e.g. Q2 Staff Welfare Update" style={inp} />

                <label style={lbl}>Reference No.</label>
                <input value={form.memoRef} onChange={e=>setForm({...form,memoRef:e.target.value})}
                  placeholder="e.g. HR/MEMO/2026/015" style={inp} />

                <label style={lbl}>Content *</label>
                <textarea value={form.content} onChange={e=>setForm({...form,content:e.target.value})}
                  rows={10} placeholder="Write the memo body here..."
                  style={{ ...inp, resize:"none", fontFamily:"inherit" }} />

                <div style={{ background:"rgba(212,168,67,0.06)", border:"1px solid rgba(212,168,67,0.15)",
                  borderRadius:8, padding:"9px 12px", fontSize:12, color:C.muted, marginBottom:16 }}>
                  ℹ️ This memo will be posted as an <strong style={{color:C.gold}}>Official Memo</strong> in each selected channel simultaneously.
                </div>

                <button onClick={handleSend} disabled={loading || selected.size===0}
                  style={{ width:"100%", padding:"11px", borderRadius:8, border:"none",
                    background: loading||selected.size===0 ? "#1E3A5F" : C.gold,
                    color: loading||selected.size===0 ? C.ghost : "#0A1F44",
                    fontWeight:700, cursor:loading||selected.size===0?"default":"pointer",
                    fontFamily:"'DM Sans',sans-serif", fontSize:14 }}>
                  {loading ? "Dispatching..." : `📬 Dispatch to ${selected.size} Channel${selected.size!==1?"s":""}`}
                </button>
              </div>

              {/* Right: Channel selector */}
              <div style={{ padding:20, display:"flex", flexDirection:"column", overflow:"hidden" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <h4 style={{ color:C.textMid, fontSize:13, margin:0, fontWeight:700, letterSpacing:"0.06em" }}>
                    SELECT CHANNELS
                    <span style={{ color:C.muted, fontWeight:400, marginLeft:6 }}>({selected.size} selected)</span>
                  </h4>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={selectAll} style={{ fontSize:11, padding:"3px 9px", borderRadius:5, border:`1px solid ${C.border}`, background:"none", color:C.muted, cursor:"pointer" }}>All</button>
                    <button onClick={clearAll}  style={{ fontSize:11, padding:"3px 9px", borderRadius:5, border:`1px solid ${C.border}`, background:"none", color:C.muted, cursor:"pointer" }}>None</button>
                  </div>
                </div>

                {/* Type filter */}
                <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:12 }}>
                  {typeOptions.map(t => (
                    <button key={t} onClick={()=>setFilterType(t)}
                      style={{ fontSize:11, padding:"3px 10px", borderRadius:10, cursor:"pointer",
                        border:`1px solid ${filterType===t?C.gold:C.border}`,
                        background:filterType===t?"rgba(212,168,67,0.1)":"transparent",
                        color:filterType===t?C.gold:C.muted, fontFamily:"'DM Sans',sans-serif" }}>
                      {t === "ALL" ? "All Types" : t}
                    </button>
                  ))}
                </div>

                {/* Channel list */}
                <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:4 }}>
                  {filteredChannels.map(ch => {
                    const isSel = selected.has(ch.id);
                    return (
                      <label key={ch.id}
                        style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px",
                          borderRadius:8, cursor:"pointer", border:`1px solid ${isSel?C.gold:C.border}`,
                          background:isSel?"rgba(212,168,67,0.06)":"transparent" }}>
                        <input type="checkbox" checked={isSel} onChange={()=>toggleChannel(ch.id)}
                          style={{ accentColor:C.gold, width:15, height:15, flexShrink:0 }} />
                        <span style={{ fontSize:15 }}>{CHANNEL_TYPE_ICONS[ch.type]||"#"}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ color:C.text, fontSize:13, fontWeight:isSel?600:400,
                            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            #{ch.name}
                          </div>
                          <div style={{ color:C.ghost, fontSize:10 }}>{ch.type}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === "history" && (
            <div style={{ padding:20 }}>
              {history.length === 0 && (
                <div style={{ textAlign:"center", padding:40, color:C.ghost, fontSize:13 }}>No bulk memos sent yet</div>
              )}
              {history.map(memo => (
                <div key={memo.id} style={{ background:"#081832", border:`1px solid ${C.border}`,
                  borderRadius:10, padding:14, marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
                    <div>
                      <div style={{ color:C.text, fontWeight:600, fontSize:14, marginBottom:4 }}>{memo.subject}</div>
                      {memo.memoRef && <div style={{ color:C.muted, fontSize:11, marginBottom:4 }}>Ref: {memo.memoRef}</div>}
                      <div style={{ color:C.ghost, fontSize:12 }}>
                        by {memo.author?.name} · {format(new Date(memo.createdAt),"d MMM yyyy, h:mm a")}
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <span style={{ fontSize:11, padding:"3px 10px", borderRadius:10, fontWeight:700,
                        background: memo.status==="SENT"?"rgba(34,197,94,0.1)":"rgba(245,158,11,0.1)",
                        color: memo.status==="SENT"?"#22C55E":"#F59E0B" }}>
                        {memo.status}
                      </span>
                      <div style={{ color:C.gold, fontSize:14, fontWeight:700, marginTop:6 }}>
                        {memo.sentCount}/{memo._count?.recipients || "?"} channels
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
