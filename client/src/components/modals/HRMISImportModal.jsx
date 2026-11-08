
// client/src/components/modals/HRMISImportModal.jsx — Phase 3
import { useState, useEffect, useRef } from "react";
import { hrmisAPI } from "../../services/api";

const C = {
  surfaceAlt:"#0D2244", border:"#1E3A5F", gold:"var(--accent-color, #D4A843)",
  text:"#E8EDF5", muted:"#6B8299", textMid:"#B0BDD0", ghost:"#2E4A6B",
};
const inp = { width:"100%", padding:"9px 12px", borderRadius:8, border:`1px solid ${C.border}`,
  background:"#081832", color:C.text, fontSize:14, marginBottom:14,
  boxSizing:"border-box", fontFamily:"'DM Sans',sans-serif", outline:"none" };

const STEPS = ["Upload CSV", "Preview & Validate", "Import"];

export default function HRMISImportModal({ onClose }) {
  const [step, setStep]           = useState(0);
  const [file, setFile]           = useState(null);
  const [preview, setPreview]     = useState(null);
  const [history, setHistory]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    hrmisAPI.imports().then(r => setHistory(r.data.imports || [])).catch(()=>{});
  }, []);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.name.endsWith(".csv")) { setError("Only CSV files are supported"); return; }
    setFile(f); setError(""); setPreview(null);
  };

  const handlePreview = async () => {
    if (!file) return;
    setLoading(true); setError("");
    try {
      const fd = new FormData(); fd.append("file", file);
      const r = await hrmisAPI.preview(fd);
      setPreview(r.data);
      setStep(1);
    } catch(e) { setError(e.response?.data?.error || "Failed to parse CSV"); }
    finally { setLoading(false); }
  };

  const handleImport = async () => {
    if (!file || !preview?.valid) return;
    if (!window.confirm(`Import ${preview.valid} staff accounts? This cannot be undone.`)) return;
    setImporting(true); setError("");
    try {
      const fd = new FormData(); fd.append("file", file);
      const r = await hrmisAPI.import(fd);
      setResult(r.data);
      setStep(2);
      hrmisAPI.imports().then(res => setHistory(res.data.imports || [])).catch(()=>{});
    } catch(e) { setError(e.response?.data?.error || "Import failed"); }
    finally { setImporting(false); }
  };

  const downloadTemplate = async () => {
    try {
      const r = await hrmisAPI.template();
      const url = URL.createObjectURL(new Blob([r.data], { type:"text/csv" }));
      const a = document.createElement("a"); a.href = url;
      a.download = "nipost_staff_import_template.csv"; a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  const reset = () => { setStep(0); setFile(null); setPreview(null); setResult(null); setError(""); };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex",
      alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:14,
        width:"min(680px,96vw)", maxHeight:"92vh", overflow:"hidden", display:"flex", flexDirection:"column" }}>

        {/* Header */}
        <div style={{ padding:"18px 22px", borderBottom:`1px solid ${C.border}`,
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <h3 style={{ color:C.gold, margin:0, fontSize:17 }}>📥 HRMIS Staff Import</h3>
            <p style={{ color:C.muted, fontSize:12, margin:"3px 0 0" }}>Bulk-create staff accounts from CSV</p>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => setShowHistory(s=>!s)}
              style={{ padding:"5px 12px", borderRadius:7, border:`1px solid ${C.border}`,
                background:"transparent", color:C.muted, cursor:"pointer", fontSize:12, fontFamily:"'DM Sans',sans-serif" }}>
              📋 History ({history.length})
            </button>
            <button onClick={onClose}
              style={{ background:"none", border:"none", color:C.muted, fontSize:20, cursor:"pointer" }}>✕</button>
          </div>
        </div>

        {/* Progress steps */}
        <div style={{ padding:"14px 22px", borderBottom:`1px solid ${C.border}`, display:"flex", gap:0 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:24, height:24, borderRadius:"50%", display:"flex", alignItems:"center",
                  justifyContent:"center", fontSize:12, fontWeight:700,
                  background: i<step?"#22C55E" : i===step?C.gold:"#1E3A5F",
                  color: i<=step?"#0A1F44":"#6B8299" }}>
                  {i<step ? "✓" : i+1}
                </div>
                <span style={{ fontSize:12, fontWeight:600, color:i===step?C.gold:i<step?"#22C55E":C.ghost }}>{s}</span>
              </div>
              {i < STEPS.length-1 && (
                <div style={{ flex:1, height:2, background:i<step?"#22C55E":"#1E3A5F", margin:"0 10px" }} />
              )}
            </div>
          ))}
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:22 }}>

          {/* History panel */}
          {showHistory && (
            <div style={{ marginBottom:20 }}>
              <h4 style={{ color:C.textMid, fontSize:13, margin:"0 0 12px", fontWeight:700, letterSpacing:"0.06em" }}>IMPORT HISTORY</h4>
              {history.length===0 && <div style={{ color:C.ghost, fontSize:13, textAlign:"center", padding:16 }}>No imports yet</div>}
              {history.map(imp => (
                <div key={imp.id} style={{ background:"#081832", border:`1px solid ${C.border}`,
                  borderRadius:8, padding:"10px 14px", marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ color:C.text, fontSize:13, fontWeight:500 }}>{imp.filename}</div>
                    <div style={{ color:C.muted, fontSize:11, marginTop:2 }}>
                      by {imp.uploadedBy?.name} · {new Date(imp.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:11, padding:"2px 8px", borderRadius:10, marginBottom:4,
                      background:imp.status==="DONE"?"rgba(34,197,94,0.1)":"rgba(245,158,11,0.1)",
                      color:imp.status==="DONE"?"#22C55E":"#F59E0B" }}>
                      {imp.status}
                    </div>
                    <div style={{ color:C.muted, fontSize:11 }}>
                      {imp.imported} imported · {imp.skipped} skipped
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 0: Upload */}
          {step === 0 && (
            <>
              {error && <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)",
                borderRadius:8, padding:"9px 12px", color:"#F87171", fontSize:13, marginBottom:14 }}>{error}</div>}

              <div style={{ background:"rgba(212,168,67,0.05)", border:"1px solid rgba(212,168,67,0.15)",
                borderRadius:10, padding:"14px 16px", marginBottom:20 }}>
                <div style={{ color:C.gold, fontWeight:600, fontSize:13, marginBottom:8 }}>📋 CSV Format Requirements</div>
                <div style={{ color:C.muted, fontSize:12, lineHeight:1.8 }}>
                  Required columns: <strong style={{color:C.textMid}}>name, staffId, email, stateCode, departmentSlug</strong><br/>
                  Optional: <strong style={{color:C.textMid}}>phone, postOffice, role</strong> (default: STAFF)<br/>
                  Email must end in <strong style={{color:C.gold}}>@nipost.gov.ng</strong><br/>
                  Default password: <strong style={{color:C.gold}}>NiPOST@2026!</strong> (staff must change on first login)
                </div>
                <button onClick={downloadTemplate}
                  style={{ marginTop:10, padding:"6px 14px", borderRadius:7, border:`1px solid ${C.gold}`,
                    background:"rgba(212,168,67,0.08)", color:C.gold, cursor:"pointer", fontSize:12,
                    fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                  ⬇ Download Template
                </button>
              </div>

              {/* Drop zone */}
              <div onClick={() => fileRef.current?.click()}
                style={{ border:`2px dashed ${file ? "#22C55E" : C.border}`, borderRadius:12,
                  padding:"32px 20px", textAlign:"center", cursor:"pointer",
                  background: file ? "rgba(34,197,94,0.04)" : "transparent",
                  transition:"all 0.2s", marginBottom:20 }}>
                <div style={{ fontSize:40, marginBottom:10 }}>{file ? "✅" : "📂"}</div>
                <div style={{ color: file ? "#22C55E" : C.textMid, fontSize:14, fontWeight:600, marginBottom:4 }}>
                  {file ? file.name : "Click to select CSV file"}
                </div>
                <div style={{ color:C.muted, fontSize:12 }}>
                  {file ? `${(file.size/1024).toFixed(1)} KB` : "Only .csv files, max 5 MB"}
                </div>
                <input ref={fileRef} type="file" accept=".csv,text/csv"
                  onChange={handleFileChange} style={{ display:"none" }} />
              </div>

              <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                <button onClick={onClose}
                  style={{ padding:"9px 18px", borderRadius:8, border:`1px solid ${C.border}`,
                    background:"none", color:C.muted, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                  Cancel
                </button>
                <button onClick={handlePreview} disabled={!file || loading}
                  style={{ padding:"9px 20px", borderRadius:8, border:"none",
                    background:!file||loading?"#1E3A5F":C.gold,
                    color:!file||loading?C.ghost:"#0A1F44",
                    fontWeight:700, cursor:!file||loading?"default":"pointer",
                    fontFamily:"'DM Sans',sans-serif" }}>
                  {loading ? "Parsing..." : "Preview →"}
                </button>
              </div>
            </>
          )}

          {/* Step 1: Preview */}
          {step === 1 && preview && (
            <>
              {error && <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)",
                borderRadius:8, padding:"9px 12px", color:"#F87171", fontSize:13, marginBottom:14 }}>{error}</div>}

              {/* Summary cards */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:20 }}>
                {[
                  { label:"Total Rows",    value:preview.total,   color:C.gold },
                  { label:"Valid",         value:preview.valid,   color:"#22C55E" },
                  { label:"Invalid",       value:preview.invalid, color:preview.invalid>0?"#EF4444":C.muted },
                ].map(c => (
                  <div key={c.label} style={{ background:"#081832", border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 16px", textAlign:"center" }}>
                    <div style={{ color:c.color, fontSize:26, fontWeight:700 }}>{c.value}</div>
                    <div style={{ color:C.muted, fontSize:12 }}>{c.label}</div>
                  </div>
                ))}
              </div>

              {/* Preview table */}
              <div style={{ background:"#081832", border:`1px solid ${C.border}`, borderRadius:10, overflow:"hidden", marginBottom:20 }}>
                <div style={{ overflowX:"auto", maxHeight:280 }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                    <thead>
                      <tr style={{ background:C.surfaceAlt }}>
                        {["#","Status","Name","Staff ID","Email","State","Dept","Role"].map(h => (
                          <th key={h} style={{ padding:"8px 12px", textAlign:"left", color:C.muted,
                            fontWeight:700, fontSize:11, letterSpacing:"0.05em", whiteSpace:"nowrap",
                            position:"sticky", top:0, background:C.surfaceAlt }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(preview.rows || []).map((row, i) => (
                        <tr key={i} style={{ borderBottom:`1px solid ${C.border}` }}
                          onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          <td style={{ padding:"7px 12px", color:C.ghost, fontFamily:"monospace" }}>{row.rowNum}</td>
                          <td style={{ padding:"7px 12px" }}>
                            {row.valid
                              ? <span style={{ color:"#22C55E", fontSize:11, fontWeight:700 }}>✓ OK</span>
                              : <span title={row.errors.join("; ")} style={{ color:"#F87171", fontSize:11, fontWeight:700, cursor:"help" }}>✕ ERR</span>}
                          </td>
                          <td style={{ padding:"7px 12px", color:C.text }}>{row.name}</td>
                          <td style={{ padding:"7px 12px", color:C.muted, fontFamily:"monospace" }}>{row.staffId}</td>
                          <td style={{ padding:"7px 12px", color:C.muted, fontSize:11 }}>{row.email}</td>
                          <td style={{ padding:"7px 12px", color:C.muted }}>{row.stateName || row.stateCode}</td>
                          <td style={{ padding:"7px 12px", color:C.muted }}>{row.deptName || row.departmentSlug}</td>
                          <td style={{ padding:"7px 12px" }}>
                            <span style={{ fontSize:10, padding:"1px 7px", borderRadius:8, background:"rgba(212,168,67,0.12)", color:C.gold }}>
                              {row.role || "STAFF"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {preview.invalid > 0 && (
                <div style={{ background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.15)",
                  borderRadius:8, padding:"9px 12px", fontSize:12, color:"#F87171", marginBottom:16 }}>
                  ⚠️ {preview.invalid} row{preview.invalid!==1?"s":""} with errors will be skipped.
                  Hover the ✕ ERR badge to see the reason.
                </div>
              )}

              <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                <button onClick={reset}
                  style={{ padding:"9px 18px", borderRadius:8, border:`1px solid ${C.border}`,
                    background:"none", color:C.muted, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                  ← Back
                </button>
                <button onClick={handleImport} disabled={importing || preview.valid===0}
                  style={{ padding:"9px 20px", borderRadius:8, border:"none",
                    background:importing||preview.valid===0?"#1E3A5F":C.gold,
                    color:importing||preview.valid===0?C.ghost:"#0A1F44",
                    fontWeight:700, cursor:importing||preview.valid===0?"default":"pointer",
                    fontFamily:"'DM Sans',sans-serif" }}>
                  {importing ? "Importing..." : `📥 Import ${preview.valid} Staff`}
                </button>
              </div>
            </>
          )}

          {/* Step 2: Result */}
          {step === 2 && result && (
            <div style={{ textAlign:"center", padding:"20px 0" }}>
              <div style={{ fontSize:56, marginBottom:16 }}>✅</div>
              <h3 style={{ color:"#22C55E", fontSize:20, marginBottom:8 }}>Import Complete!</h3>
              <p style={{ color:C.muted, fontSize:14, marginBottom:24 }}>{result.message}</p>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, maxWidth:360, margin:"0 auto 24px" }}>
                {[
                  { label:"Imported",  value:result.imported,  color:"#22C55E" },
                  { label:"Skipped",   value:result.skipped,   color:"#F59E0B" },
                  { label:"With Errors",value:result.errors?.length||0, color:"#EF4444" },
                ].map(c => (
                  <div key={c.label} style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`,
                    borderRadius:10, padding:"12px 10px", textAlign:"center" }}>
                    <div style={{ color:c.color, fontSize:24, fontWeight:700 }}>{c.value}</div>
                    <div style={{ color:C.muted, fontSize:11 }}>{c.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ background:"rgba(212,168,67,0.06)", border:"1px solid rgba(212,168,67,0.15)",
                borderRadius:10, padding:"12px 16px", fontSize:13, color:C.muted, marginBottom:24, textAlign:"left", maxWidth:400, margin:"0 auto 24px" }}>
                <div style={{ color:C.gold, fontWeight:700, marginBottom:6 }}>Default Password</div>
                <code style={{ color:C.text, fontSize:14, letterSpacing:"0.1em" }}>{result.defaultPassword}</code>
                <div style={{ marginTop:6, fontSize:12 }}>
                  All imported staff must change this password on first login. Share via official channels only.
                </div>
              </div>
              <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
                <button onClick={reset}
                  style={{ padding:"9px 20px", borderRadius:8, border:`1px solid ${C.border}`,
                    background:"none", color:C.muted, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                  Import Another File
                </button>
                <button onClick={onClose}
                  style={{ padding:"9px 20px", borderRadius:8, border:"none",
                    background:C.gold, color:"#0A1F44", fontWeight:700, cursor:"pointer",
                    fontFamily:"'DM Sans',sans-serif" }}>
                  Done ✓
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
