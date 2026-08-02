
// client/src/components/settings/DepartmentsTab.jsx — Phase 5
import { useState, useEffect, useCallback } from "react";
import api from "../../services/api";

const C = {
  surfaceAlt:"#0D2244", border:"#1E3A5F", gold:"#D4A843",
  text:"#E8EDF5", muted:"#6B8299", textMid:"#B0BDD0", ghost:"#2E4A6B",
};
const inp = { width:"100%", padding:"9px 12px", borderRadius:8, border:`1px solid ${C.border}`,
  background:"#081832", color:C.text, fontSize:14, marginBottom:14,
  boxSizing:"border-box", fontFamily:"'DM Sans',sans-serif", outline:"none" };
const lbl = { display:"block", color:C.muted, fontSize:12, fontWeight:600, letterSpacing:"0.06em", marginBottom:6 };

function CreateDeptForm({ onCreated, onCancel }) {
  const [form, setForm] = useState({ name:"", description:"" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handle = async () => {
    if (!form.name.trim()) { setError("Department name required"); return; }
    setLoading(true); setError("");
    try {
      const r = await api.post("/departments", {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
      });
      onCreated(r.data.department, r.data.channel);
    } catch(e) { setError(e.response?.data?.error || "Failed to create"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ background:"#081832", border:`1px solid ${C.gold}33`,
      borderRadius:10, padding:16, marginBottom:16 }}>
      <div style={{ color:C.gold, fontSize:13, fontWeight:700, marginBottom:12 }}>
        + New Department
      </div>
      {error && <div style={{ color:"#F87171", fontSize:12, marginBottom:10 }}>⚠️ {error}</div>}
      <label style={lbl}>Department Name *</label>
      <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}
        placeholder="e.g. Postal Operations, Finance & Audit" style={inp} />
      <label style={lbl}>Description</label>
      <input value={form.description} onChange={e=>setForm({...form,description:e.target.value})}
        placeholder="What does this department do?" style={inp} />
      <div style={{ color:C.ghost, fontSize:11, marginBottom:14 }}>
        A department channel <strong style={{color:C.muted}}>#{"<name>-dept"}</strong> will be created automatically.
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={onCancel}
          style={{ padding:"7px 14px", borderRadius:7, border:`1px solid ${C.border}`,
            background:"none", color:C.muted, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
          Cancel
        </button>
        <button onClick={handle} disabled={loading}
          style={{ padding:"7px 16px", borderRadius:7, border:"none",
            background:loading?C.border:C.gold, color:loading?C.ghost:"#0A1F44",
            fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", opacity:loading?0.7:1 }}>
          {loading ? "Creating..." : "Create Department"}
        </button>
      </div>
    </div>
  );
}

function EditDeptForm({ dept, onSaved, onCancel }) {
  const [form, setForm] = useState({ name: dept.name, description: dept.description || "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handle = async () => {
    if (!form.name.trim()) { setError("Name required"); return; }
    setLoading(true); setError("");
    try {
      const r = await api.patch(`/departments/${dept.id}`, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
      });
      onSaved(r.data.department);
    } catch(e) { setError(e.response?.data?.error || "Update failed"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ background:"#081832", border:`1px solid ${C.border}`, borderRadius:8, padding:12, marginTop:8 }}>
      {error && <div style={{ color:"#F87171", fontSize:12, marginBottom:8 }}>⚠️ {error}</div>}
      <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}
        placeholder="Department name" style={{ ...inp, marginBottom:8 }} />
      <input value={form.description} onChange={e=>setForm({...form,description:e.target.value})}
        placeholder="Description" style={{ ...inp, marginBottom:10 }} />
      <div style={{ display:"flex", gap:6 }}>
        <button onClick={onCancel}
          style={{ padding:"5px 12px", borderRadius:6, border:`1px solid ${C.border}`,
            background:"none", color:C.muted, cursor:"pointer", fontSize:12, fontFamily:"'DM Sans',sans-serif" }}>
          Cancel
        </button>
        <button onClick={handle} disabled={loading}
          style={{ padding:"5px 14px", borderRadius:6, border:"none",
            background:loading?C.border:C.gold, color:loading?C.ghost:"#0A1F44",
            fontWeight:700, cursor:"pointer", fontSize:12, fontFamily:"'DM Sans',sans-serif" }}>
          {loading ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

export default function DepartmentsTab() {
  const [departments, setDepartments] = useState([]);
  const [showCreate, setShowCreate]   = useState(false);
  const [editingId, setEditingId]     = useState(null);
  const [loading, setLoading]         = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [msg, setMsg]                 = useState({ type:"", text:"" });
  const [search, setSearch]           = useState("");

  const showMsg = (type, text) => { setMsg({type,text}); setTimeout(()=>setMsg({type:"",text:""}),4000); };

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/departments?includeArchived=${showArchived}`)
      .then(r => setDepartments(r.data.departments || []))
      .catch(()=>{})
      .finally(()=>setLoading(false));
  }, [showArchived]);

  useEffect(() => { load(); }, [load]);

  const handleCreated = (dept, channel) => {
    setShowCreate(false);
    load();
    showMsg("success", `"${dept.name}" created with channel #${channel.name}`);
  };

  const handleSaved = (updated) => {
    setEditingId(null);
    setDepartments(ds => ds.map(d => d.id === updated.id ? { ...d, ...updated } : d));
    showMsg("success", "Department updated");
  };

  const handleArchive = async (dept) => {
    if (!window.confirm(`Archive "${dept.name}"? Its channel will be hidden. This can be reversed by an admin.`)) return;
    try {
      await api.delete(`/departments/${dept.id}`);
      load();
      showMsg("success", `"${dept.name}" archived`);
    } catch(e) { showMsg("error", e.response?.data?.error || "Failed"); }
  };

  const filtered = departments.filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ color:C.text, fontSize:15, fontWeight:700 }}>Departments</div>
          <div style={{ color:C.muted, fontSize:12 }}>{departments.length} total · Creating a department auto-creates a channel</div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <label style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", fontSize:12, color:C.muted }}>
            <input type="checkbox" checked={showArchived} onChange={e=>setShowArchived(e.target.checked)}
              style={{ accentColor:C.gold }} />
            Show archived
          </label>
          <button onClick={()=>setShowCreate(s=>!s)}
            style={{ padding:"7px 16px", borderRadius:8, border:`1px solid ${C.gold}`,
              background:"rgba(212,168,67,0.08)", color:C.gold, cursor:"pointer",
              fontSize:13, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
            {showCreate ? "✕ Cancel" : "+ New Department"}
          </button>
        </div>
      </div>

      {/* Status */}
      {msg.text && (
        <div style={{ background:msg.type==="success"?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)",
          border:`1px solid ${msg.type==="success"?"rgba(34,197,94,0.25)":"rgba(239,68,68,0.25)"}`,
          borderRadius:8, padding:"9px 14px", fontSize:13, marginBottom:14,
          color:msg.type==="success"?"#86EFAC":"#F87171" }}>
          {msg.type==="success" ? "✅" : "⚠️"} {msg.text}
        </div>
      )}

      {/* Create form */}
      {showCreate && <CreateDeptForm onCreated={handleCreated} onCancel={()=>setShowCreate(false)} />}

      {/* Search */}
      <input value={search} onChange={e=>setSearch(e.target.value)}
        placeholder="Search departments..."
        style={{ ...inp, marginBottom:12 }} />

      {/* List */}
      {loading && <div style={{ color:C.muted, fontSize:13, textAlign:"center", padding:24 }}>Loading...</div>}

      {!loading && filtered.length === 0 && (
        <div style={{ color:C.ghost, fontSize:13, textAlign:"center", padding:32 }}>
          {search ? "No departments match your search" : "No departments yet"}
        </div>
      )}

      {filtered.map(dept => (
        <div key={dept.id} style={{ background:"#081832", border:`1px solid ${C.border}`,
          borderRadius:10, padding:14, marginBottom:10,
          opacity: dept.isArchived ? 0.6 : 1 }}>

          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                <span style={{ color:C.text, fontWeight:700, fontSize:14 }}>{dept.name}</span>
                {dept.isArchived && (
                  <span style={{ fontSize:10, padding:"2px 8px", borderRadius:8,
                    background:"rgba(107,130,153,0.15)", color:C.muted, fontWeight:700 }}>
                    ARCHIVED
                  </span>
                )}
              </div>
              {dept.description && (
                <div style={{ color:C.muted, fontSize:13, marginBottom:6 }}>{dept.description}</div>
              )}
              <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                <span style={{ color:C.ghost, fontSize:12 }}>
                  👥 {dept._count?.users || 0} staff
                </span>
                {dept.channels?.[0] && (
                  <span style={{ color:C.ghost, fontSize:12 }}>
                    📢 #{dept.channels[0].name}
                  </span>
                )}
                <span style={{ color:C.ghost, fontSize:12 }}>
                  💬 {dept._count?.channels || 0} channel{dept._count?.channels !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {!dept.isArchived && (
              <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                <button onClick={()=>setEditingId(editingId===dept.id ? null : dept.id)}
                  style={{ padding:"5px 12px", borderRadius:6, border:`1px solid ${C.border}`,
                    background:"transparent", color:C.muted, cursor:"pointer",
                    fontSize:12, fontFamily:"'DM Sans',sans-serif" }}>
                  ✏️ Edit
                </button>
                <button onClick={()=>handleArchive(dept)}
                  style={{ padding:"5px 12px", borderRadius:6,
                    border:"1px solid rgba(239,68,68,0.3)",
                    background:"rgba(239,68,68,0.08)", color:"#F87171",
                    cursor:"pointer", fontSize:12, fontFamily:"'DM Sans',sans-serif" }}>
                  Archive
                </button>
              </div>
            )}
          </div>

          {editingId === dept.id && (
            <EditDeptForm dept={dept} onSaved={handleSaved} onCancel={()=>setEditingId(null)} />
          )}
        </div>
      ))}
    </div>
  );
}
