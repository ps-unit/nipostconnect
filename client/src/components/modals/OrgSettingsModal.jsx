// client/src/components/modals/OrgSettingsModal.jsx — Phase 5 (Responsive + Fixed Logo Upload)
import { useState, useEffect, useRef } from "react";
import api from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { useResponsive } from "../../hooks/useResponsive";
import { resolveUploadUrl } from "../shared/styles";

const C = {
  surfaceAlt:"#0D2244", border:"#1E3A5F", gold:"#D4A843",
  text:"#E8EDF5", muted:"#6B8299", textMid:"#B0BDD0", ghost:"#2E4A6B",
};
const inp = { width:"100%", padding:"9px 12px", borderRadius:8, border:`1px solid ${C.border}`,
  background:"#081832", color:C.text, fontSize:14, marginBottom:14,
  boxSizing:"border-box", fontFamily:"'DM Sans',sans-serif", outline:"none" };
const lbl = { display:"block", color:C.muted, fontSize:12, fontWeight:600, letterSpacing:"0.06em", marginBottom:6 };

const TABS = [
  { id:"branding",  icon:"🎨", label:"Branding"      },
  { id:"contact",   icon:"📞", label:"Contact Info"   },
  { id:"platform",  icon:"⚙️", label:"Platform"       },
];

const ACCENT_PRESETS = [
  { color:"#D4A843", name:"NiPOST Gold"   },
  { color:"#2563EB", name:"Royal Blue"    },
  { color:"#22C55E", name:"Forest Green"  },
  { color:"#7C3AED", name:"Purple"        },
  { color:"#EF4444", name:"Red"           },
  { color:"#06B6D4", name:"Cyan"          },
  { color:"#F59E0B", name:"Amber"         },
  { color:"#EC4899", name:"Pink"          },
];

export default function OrgSettingsModal({ onClose }) {
  const { isSuperAdmin } = useAuth();
  const { isMobile } = useResponsive();
  const logoRef = useRef();
  const [tab, setTab]         = useState("branding");
  const [settings, setSettings] = useState(null);
  const [form, setForm]       = useState({});
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile]       = useState(null);
  const [saving, setSaving]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg]         = useState({ type:"", text:"" });

  const showMsg = (type, text) => { setMsg({type,text}); setTimeout(()=>setMsg({type:"",text:""}),4000); };

  useEffect(() => {
    api.get("/organization").then(r => {
      setSettings(r.data.settings);
      setForm(r.data.settings);
      setLogoPreview(resolveUploadUrl(r.data.settings.logoUrl) || null);
    }).catch(()=>{});
  }, []);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      if (logoFile) {
        const fd = new FormData();
        fd.append("logo", logoFile);
        const lr = await api.post("/organization/logo", fd);
        setLogoPreview(resolveUploadUrl(lr.data.logoUrl));
        setLogoFile(null);
      }
      const r = await api.patch("/organization", {
        name: form.name, slogan: form.slogan,
        accentColor: form.accentColor,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        address: form.address,
        website: form.website,
        welcomeMessage: form.welcomeMessage,
        maxFileSize: form.maxFileSize,
        maintenanceMode: form.maintenanceMode,
      });
      setSettings(r.data.settings);
      showMsg("success", "Organisation settings saved");
    } catch(e) { showMsg("error", e.response?.data?.error || "Save failed"); }
    finally { setSaving(false); }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showMsg("error","Logo must be under 2 MB"); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("logo", logoFile);
      const r = await api.post("/organization/logo", fd);
      const resolved = resolveUploadUrl(r.data.logoUrl);
      setLogoPreview(resolved);
      setLogoFile(null);
      setSettings(s => ({ ...s, logoUrl: resolved }));
      showMsg("success", "Logo updated");
    } catch(e) { showMsg("error", e.response?.data?.error || "Upload failed"); }
    finally { setUploading(false); }
  };

  const handleRemoveLogo = async () => {
    if (!window.confirm("Remove the organisation logo?")) return;
    try {
      await api.delete("/organization/logo");
      setLogoPreview(null); setLogoFile(null);
      setSettings(s => ({ ...s, logoUrl: null }));
      showMsg("success", "Logo removed");
    } catch {}
  };

  if (!settings) {
    return (
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex",
        alignItems:"center", justifyContent:"center", zIndex:1000 }}>
        <div style={{ color:C.muted, fontSize:14 }}>Loading settings...</div>
      </div>
    );
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", display:"flex",
      alignItems:"center", justifyContent:"center", zIndex:1000, padding:"clamp(8px, 2vw, 16px)" }}>
      <div style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:14,
        width:"min(760px,96vw)", maxHeight:"92dvh", overflow:"hidden",
        display:"flex", flexDirection:"column" }}>

        {/* Header */}
        <div style={{ padding:"14px clamp(14px, 3vw, 22px)", borderBottom:`1px solid ${C.border}`,
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <h3 style={{ color:C.gold, margin:0, fontSize:17 }}>🏢 Organisation Settings</h3>
            <p style={{ color:C.muted, fontSize:12, margin:"3px 0 0" }}>
              Branding, contact info and platform configuration
            </p>
          </div>
          <button onClick={onClose}
            style={{ background:"none", border:"none", color:C.muted, fontSize:20, cursor:"pointer", padding:"4px 8px" }}>✕</button>
        </div>

        {/* Status */}
        {msg.text && (
          <div style={{ margin:"12px clamp(14px, 3vw, 22px) 0", padding:"9px 14px", fontSize:13,
            background:msg.type==="success"?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)",
            border:`1px solid ${msg.type==="success"?"rgba(34,197,94,0.25)":"rgba(239,68,68,0.25)"}`,
            borderRadius:8, color:msg.type==="success"?"#86EFAC":"#F87171" }}>
            {msg.type==="success" ? "✅" : "⚠️"} {msg.text}
          </div>
        )}

        {/* Mobile horizontal tabs */}
        {isMobile && (
          <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, overflowX:"auto", flexShrink:0 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                  padding:"10px 12px", border:"none", background:"none", cursor:"pointer",
                  borderBottom:tab===t.id?`2px solid ${C.gold}`:"2px solid transparent",
                  color:tab===t.id?C.gold:C.muted, fontSize:13, fontWeight:tab===t.id?600:400,
                  whiteSpace:"nowrap", fontFamily:"'DM Sans',sans-serif" }}>
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        )}

        <div style={{ display:"flex", flex:1, overflow:"hidden", flexDirection:isMobile?"column":"row" }}>

          {/* Desktop Sidebar tabs */}
          {!isMobile && (
            <div style={{ width:180, borderRight:`1px solid ${C.border}`, padding:"12px 8px",
              flexShrink:0 }}>
              {TABS.map(t => (
                <button key={t.id} onClick={()=>setTab(t.id)}
                  style={{ width:"100%", display:"flex", alignItems:"center", gap:10,
                    padding:"9px 12px", borderRadius:8, border:"none",
                    background:tab===t.id?"rgba(212,168,67,0.1)":"transparent",
                    cursor:"pointer", textAlign:"left", marginBottom:4,
                    fontFamily:"'DM Sans',sans-serif" }}>
                  <span style={{ fontSize:16 }}>{t.icon}</span>
                  <span style={{ color:tab===t.id?C.gold:C.textMid, fontSize:13,
                    fontWeight:tab===t.id?600:400 }}>{t.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Tab content */}
          <div style={{ flex:1, overflowY:"auto", padding:"clamp(14px, 3vw, 22px)" }}>

            {/* ── Branding ── */}
            {tab === "branding" && (
              <>
                {/* Logo section */}
                <div style={{ background:"#081832", border:`1px solid ${C.border}`, borderRadius:12, padding:18, marginBottom:16 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:C.muted, letterSpacing:"0.07em", marginBottom:14 }}>ORGANISATION LOGO</div>
                  <div style={{ display:"flex", alignItems:"center", gap:20, flexWrap:"wrap" }}>
                    <div onClick={()=>logoRef.current?.click()}
                      style={{ width:88, height:88, borderRadius:12, background:"#0D2244",
                        border:`2px dashed ${logoPreview?C.gold:C.border}`,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        cursor:"pointer", overflow:"hidden", flexShrink:0 }}>
                      {logoPreview
                        ? <img src={logoPreview} alt="Logo" style={{ width:"100%", height:"100%", objectFit:"contain" }} />
                        : <span style={{ fontSize:32, color:C.ghost }}>📮</span>}
                    </div>
                    <div style={{ flex:1, minWidth:180 }}>
                      <div style={{ color:C.textMid, fontSize:13, fontWeight:600, marginBottom:6 }}>
                        {form.name}
                      </div>
                      <div style={{ color:C.muted, fontSize:12, marginBottom:12 }}>PNG, JPG, SVG or WEBP · max 2 MB<br/>Recommended: 256×256 px or larger</div>
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                        <button onClick={()=>logoRef.current?.click()}
                          style={{ padding:"6px 14px", borderRadius:7, border:`1px solid ${C.border}`,
                            background:"transparent", color:C.textMid, cursor:"pointer",
                            fontSize:12, fontFamily:"'DM Sans',sans-serif" }}>
                          Choose File
                        </button>
                        {logoFile && (
                          <button onClick={handleLogoUpload} disabled={uploading}
                            style={{ padding:"6px 14px", borderRadius:7, border:"none",
                              background:C.gold, color:"#0A1F44", fontWeight:700,
                              cursor:"pointer", fontSize:12, fontFamily:"'DM Sans',sans-serif",
                              opacity:uploading?0.7:1 }}>
                            {uploading ? "Uploading..." : "Upload Logo"}
                          </button>
                        )}
                        {logoPreview && !logoFile && (
                          <button onClick={handleRemoveLogo}
                            style={{ padding:"6px 14px", borderRadius:7,
                              border:"1px solid rgba(239,68,68,0.3)",
                              background:"rgba(239,68,68,0.08)", color:"#F87171",
                              cursor:"pointer", fontSize:12, fontFamily:"'DM Sans',sans-serif" }}>
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={handleLogoChange} style={{ display:"none" }} />
                </div>

                {/* Platform name + slogan */}
                <div style={{ background:"#081832", border:`1px solid ${C.border}`, borderRadius:12, padding:18, marginBottom:16 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:C.muted, letterSpacing:"0.07em", marginBottom:14 }}>PLATFORM IDENTITY</div>
                  <label style={lbl}>Platform Name</label>
                  <input value={form.name||""} onChange={e=>set("name",e.target.value)} style={inp} />
                  <label style={lbl}>Slogan / Tagline</label>
                  <input value={form.slogan||""} onChange={e=>set("slogan",e.target.value)}
                    placeholder="e.g. Connecting Nigeria's Postal Family" style={inp} />
                  <label style={lbl}>Welcome Message for New Staff</label>
                  <textarea value={form.welcomeMessage||""} onChange={e=>set("welcomeMessage",e.target.value)}
                    rows={3} style={{ ...inp, resize:"vertical", fontFamily:"inherit" }}
                    placeholder="Shown to staff on first login..." />
                </div>

                {/* Accent color */}
                <div style={{ background:"#081832", border:`1px solid ${C.border}`, borderRadius:12, padding:18, marginBottom:16 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:C.muted, letterSpacing:"0.07em", marginBottom:14 }}>ACCENT COLOUR</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginBottom:14 }}>
                    {ACCENT_PRESETS.map(p => (
                      <button key={p.color} onClick={()=>set("accentColor",p.color)} title={p.name}
                        style={{ width:36, height:36, borderRadius:"50%", background:p.color, border:"none",
                          cursor:"pointer", outline: form.accentColor===p.color ? `3px solid #fff` : "none",
                          outlineOffset:2, transition:"outline 0.15s" }} />
                    ))}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                    <label style={{ ...lbl, margin:0 }}>Custom hex:</label>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:28, height:28, borderRadius:6, background:form.accentColor||C.gold,
                        border:`1px solid ${C.border}`, flexShrink:0 }} />
                      <input value={form.accentColor||""} onChange={e=>set("accentColor",e.target.value)}
                        placeholder="#D4A843" style={{ ...inp, marginBottom:0, width:110 }} />
                    </div>
                  </div>
                  <div style={{ marginTop:12, padding:"10px 14px", background:C.surfaceAlt,
                    borderRadius:8, fontSize:12, color:C.muted }}>
                    Preview: <span style={{ color:form.accentColor||C.gold, fontWeight:700 }}>■ {form.name||"NiPOST Connect"}</span>
                  </div>
                </div>
              </>
            )}

            {/* ── Contact Info ── */}
            {tab === "contact" && (
              <div style={{ background:"#081832", border:`1px solid ${C.border}`, borderRadius:12, padding:18 }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.muted, letterSpacing:"0.07em", marginBottom:14 }}>CONTACT DETAILS</div>
                <label style={lbl}>Official Email</label>
                <input value={form.contactEmail||""} onChange={e=>set("contactEmail",e.target.value)}
                  type="email" style={inp} />
                <label style={lbl}>Phone Number</label>
                <input value={form.contactPhone||""} onChange={e=>set("contactPhone",e.target.value)} style={inp} />
                <label style={lbl}>Physical Address</label>
                <textarea value={form.address||""} onChange={e=>set("address",e.target.value)}
                  rows={3} style={{ ...inp, resize:"vertical", fontFamily:"inherit" }} />
                <label style={lbl}>Website</label>
                <input value={form.website||""} onChange={e=>set("website",e.target.value)}
                  placeholder="https://www.nipost.gov.ng" style={inp} />
              </div>
            )}

            {/* ── Platform Config ── */}
            {tab === "platform" && (
              <>
                <div style={{ background:"#081832", border:`1px solid ${C.border}`, borderRadius:12, padding:18, marginBottom:16 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:C.muted, letterSpacing:"0.07em", marginBottom:14 }}>FILE UPLOAD LIMITS</div>
                  <label style={lbl}>Max File Size (MB)</label>
                  <input type="number" min={1} max={100}
                    value={form.maxFileSize||10} onChange={e=>set("maxFileSize",parseInt(e.target.value))} style={inp} />
                  <label style={lbl}>Allowed Email Domain</label>
                  <input value={form.allowedDomain||"nipost.gov.ng"}
                    onChange={e=>set("allowedDomain",e.target.value)} style={inp} />
                  <div style={{ color:C.ghost, fontSize:12, marginTop:-10, marginBottom:14 }}>
                    Only email addresses ending in this domain can register.
                  </div>
                </div>

                <div style={{ background:"#081832", border:`1px solid rgba(239,68,68,0.2)`, borderRadius:12, padding:18 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#F87171", letterSpacing:"0.07em", marginBottom:10 }}>⚠️ MAINTENANCE MODE</div>
                  <div style={{ color:C.muted, fontSize:13, marginBottom:14 }}>
                    When enabled, only Super Admins can access the platform. All other staff see a maintenance notice.
                  </div>
                  <label style={{ display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}>
                    <div onClick={()=>set("maintenanceMode",!form.maintenanceMode)}
                      style={{ width:44, height:24, borderRadius:12, position:"relative",
                        background:form.maintenanceMode?"#EF4444":C.border,
                        cursor:"pointer", transition:"background 0.2s", flexShrink:0 }}>
                      <div style={{ position:"absolute", top:3,
                        left:form.maintenanceMode?23:3, width:18, height:18,
                        borderRadius:"50%", background:"#fff", transition:"left 0.2s" }} />
                    </div>
                    <span style={{ color:form.maintenanceMode?"#F87171":C.muted, fontSize:14, fontWeight:600 }}>
                      {form.maintenanceMode ? "Maintenance mode is ON" : "Maintenance mode is OFF"}
                    </span>
                  </label>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:"14px clamp(14px, 3vw, 22px)", borderTop:`1px solid ${C.border}`,
          display:"flex", justifyContent:"flex-end", gap:10 }}>
          <button onClick={onClose}
            style={{ padding:"9px 18px", borderRadius:8, border:`1px solid ${C.border}`,
              background:"none", color:C.muted, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding:"9px 22px", borderRadius:8, border:"none",
              background:saving?C.border:C.gold, color:saving?C.ghost:"#0A1F44",
              fontWeight:700, cursor:saving?"default":"pointer",
              fontFamily:"'DM Sans',sans-serif", opacity:saving?0.7:1 }}>
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
