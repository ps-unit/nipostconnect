
// client/src/components/modals/TwoFASetupModal.jsx — Phase 4
import { useState, useEffect } from "react";
import api from "../../services/api";

const C = {
  surfaceAlt:"#0D2244", border:"#1E3A5F", gold:"var(--accent-color, #D4A843)",
  text:"#E8EDF5", muted:"#6B8299", textMid:"#B0BDD0", ghost:"#2E4A6B",
};
const inp = { width:"100%", padding:"11px 14px", borderRadius:8, border:`1px solid ${C.border}`,
  background:"#081832", color:C.text, marginBottom:14,
  boxSizing:"border-box", fontFamily:"'DM Sans',sans-serif", outline:"none",
  textAlign:"center", letterSpacing:"0.2em", fontSize:20 };

const STEPS = ["Setup App","Verify Code","Save Backup Codes"];

export default function TwoFASetupModal({ onClose, onEnabled, mode = "setup" }) {
  const [step, setStep]           = useState(0);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [secret, setSecret]       = useState("");
  const [token, setToken]         = useState("");
  const [backupCodes, setBackupCodes] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [status, setStatus]       = useState(null);

  useEffect(() => {
    api.get("/2fa/status").then(r => setStatus(r.data)).catch(()=>{});
  }, []);

  const handleSetup = async () => {
    setLoading(true); setError("");
    try {
      const r = await api.post("/2fa/setup");
      setQrDataUrl(r.data.qrDataUrl);
      setSecret(r.data.secret);
      setStep(1);
    } catch(e) { setError(e.response?.data?.error || "Setup failed"); }
    finally { setLoading(false); }
  };

  const handleVerify = async () => {
    if (token.replace(/\s/g,"").length < 6) { setError("Enter the 6-digit code from your authenticator app"); return; }
    setLoading(true); setError("");
    try {
      const r = await api.post("/2fa/verify", { token: token.replace(/\s/g,"") });
      setBackupCodes(r.data.backupCodes || []);
      setStep(2);
    } catch(e) { setError(e.response?.data?.error || "Invalid code. Please try again."); }
    finally { setLoading(false); }
  };

  const handleDisable = async () => {
    if (token.replace(/\s/g,"").length < 6) { setError("Enter your current 2FA code to disable"); return; }
    setLoading(true); setError("");
    try {
      await api.post("/2fa/disable", { token: token.replace(/\s/g,"") });
      onEnabled?.(false);
      onClose();
    } catch(e) { setError(e.response?.data?.error || "Failed"); }
    finally { setLoading(false); }
  };

  const handleComplete = () => {
    onEnabled?.(true);
    onClose();
  };

  // ── Disable mode ──────────────────────────────────────────────────────────
  if (mode === "disable") {
    return (
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", display:"flex",
        alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
        <div style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:14,
          width:"min(420px,96vw)", padding:28 }}>
          <h3 style={{ color:"#F87171", margin:"0 0 6px", fontSize:17 }}>🔓 Disable 2FA</h3>
          <p style={{ color:C.muted, fontSize:13, marginBottom:20 }}>
            Enter your current 2FA code to confirm. This will remove the extra security layer from your account.
          </p>
          {error && <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:8, padding:"9px 12px", color:"#F87171", fontSize:13, marginBottom:14 }}>{error}</div>}
          <input value={token} onChange={e=>setToken(e.target.value)} placeholder="000 000"
            maxLength={7} style={inp} />
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <button onClick={onClose} style={{ padding:"9px 18px", borderRadius:8, border:`1px solid ${C.border}`, background:"none", color:C.muted, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Cancel</button>
            <button onClick={handleDisable} disabled={loading}
              style={{ padding:"9px 18px", borderRadius:8, border:"none", background:"#EF4444", color:"#fff", fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", opacity:loading?0.7:1 }}>
              {loading ? "Disabling..." : "Disable 2FA"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", display:"flex",
      alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:14,
        width:"min(480px,96vw)", maxHeight:"92vh", overflow:"hidden", display:"flex", flexDirection:"column" }}>

        {/* Header */}
        <div style={{ padding:"18px 22px", borderBottom:`1px solid ${C.border}`,
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <h3 style={{ color:C.gold, margin:0, fontSize:17 }}>🔐 Two-Factor Authentication</h3>
            <p style={{ color:C.muted, fontSize:12, margin:"3px 0 0" }}>Extra security for your NiPOST Connect account</p>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.muted, fontSize:20, cursor:"pointer" }}>✕</button>
        </div>

        {/* Progress */}
        <div style={{ padding:"14px 22px", borderBottom:`1px solid ${C.border}`, display:"flex", gap:0 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:22, height:22, borderRadius:"50%", display:"flex", alignItems:"center",
                  justifyContent:"center", fontSize:11, fontWeight:700,
                  background:i<step?"#22C55E":i===step?C.gold:"#1E3A5F",
                  color:i<=step?"#0A1F44":"#6B8299" }}>
                  {i<step?"✓":i+1}
                </div>
                <span style={{ fontSize:11, fontWeight:600, color:i===step?C.gold:i<step?"#22C55E":C.ghost }}>{s}</span>
              </div>
              {i<STEPS.length-1 && <div style={{ flex:1, height:2, background:i<step?"#22C55E":"#1E3A5F", margin:"0 8px" }} />}
            </div>
          ))}
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:22 }}>
          {error && <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:8, padding:"9px 12px", color:"#F87171", fontSize:13, marginBottom:14 }}>{error}</div>}

          {/* Step 0: Intro */}
          {step === 0 && (
            <>
              <div style={{ textAlign:"center", padding:"10px 0 20px" }}>
                <div style={{ fontSize:52, marginBottom:12 }}>🔐</div>
                <h4 style={{ color:C.text, fontSize:16, margin:"0 0 8px" }}>Secure your account with 2FA</h4>
                <p style={{ color:C.muted, fontSize:13, lineHeight:1.7, margin:"0 0 20px" }}>
                  Two-factor authentication adds an extra security layer. After enabling, you'll need your password
                  <strong style={{color:C.textMid}}> + a 6-digit code</strong> from your phone to log in.
                </p>
              </div>
              <div style={{ background:"#081832", border:`1px solid ${C.border}`, borderRadius:10, padding:14, marginBottom:20 }}>
                <div style={{ color:C.textMid, fontSize:13, fontWeight:600, marginBottom:10 }}>Compatible apps:</div>
                {["Google Authenticator (iOS & Android)","Microsoft Authenticator","Authy","1Password"].map(a => (
                  <div key={a} style={{ color:C.muted, fontSize:12, padding:"5px 0",
                    borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ color:"#22C55E" }}>✓</span> {a}
                  </div>
                ))}
              </div>
              {status?.isEnforced && (
                <div style={{ background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:8, padding:"9px 12px", fontSize:12, color:"#F87171", marginBottom:14 }}>
                  🔒 2FA is <strong>mandatory</strong> for your role. Please complete setup to continue.
                </div>
              )}
              <button onClick={handleSetup} disabled={loading}
                style={{ width:"100%", padding:"11px", borderRadius:8, border:"none", background:C.gold,
                  color:"#0A1F44", fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:14, opacity:loading?0.7:1 }}>
                {loading ? "Setting up..." : "Begin Setup →"}
              </button>
            </>
          )}

          {/* Step 1: QR Code */}
          {step === 1 && (
            <>
              <p style={{ color:C.muted, fontSize:13, lineHeight:1.7, marginBottom:16 }}>
                <strong style={{color:C.textMid}}>1.</strong> Open your authenticator app and tap <strong style={{color:C.textMid}}>+</strong> or <strong style={{color:C.textMid}}>Scan QR code</strong><br/>
                <strong style={{color:C.textMid}}>2.</strong> Scan the QR code below<br/>
                <strong style={{color:C.textMid}}>3.</strong> Enter the 6-digit code shown in your app
              </p>
              {qrDataUrl && (
                <div style={{ textAlign:"center", marginBottom:16 }}>
                  <img src={qrDataUrl} alt="2FA QR Code" style={{ width:180, height:180, borderRadius:8, border:`1px solid ${C.border}`, background:"#fff", padding:8 }} />
                  <div style={{ marginTop:8, fontSize:11, color:C.ghost }}>Can't scan? Enter manually:</div>
                  <code style={{ fontSize:12, color:C.gold, letterSpacing:"0.1em", wordBreak:"break-all" }}>{secret}</code>
                </div>
              )}
              <label style={{ ...{ display:"block", color:C.muted, fontSize:12, fontWeight:600, letterSpacing:"0.06em", marginBottom:6 } }}>
                Enter the 6-digit code *
              </label>
              <input value={token} onChange={e=>setToken(e.target.value.replace(/[^0-9]/g,"").slice(0,6))}
                placeholder="000 000" maxLength={6} style={inp}
                onKeyDown={e=>e.key==="Enter"&&handleVerify()} />
              <button onClick={handleVerify} disabled={loading}
                style={{ width:"100%", padding:"11px", borderRadius:8, border:"none", background:C.gold,
                  color:"#0A1F44", fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:14, opacity:loading?0.7:1 }}>
                {loading ? "Verifying..." : "Verify & Enable →"}
              </button>
            </>
          )}

          {/* Step 2: Backup codes */}
          {step === 2 && (
            <>
              <div style={{ textAlign:"center", marginBottom:16 }}>
                <div style={{ fontSize:40, marginBottom:8 }}>✅</div>
                <h4 style={{ color:"#22C55E", fontSize:16, margin:"0 0 6px" }}>2FA Enabled Successfully!</h4>
                <p style={{ color:C.muted, fontSize:13 }}>Save these backup codes in a secure location.</p>
              </div>
              <div style={{ background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:8, padding:"10px 12px", fontSize:12, color:"#F87171", marginBottom:14 }}>
                ⚠️ <strong>Important:</strong> Each backup code can only be used once. If you lose your phone, these codes are your only way to access your account. Store them safely offline.
              </div>
              <div style={{ background:"#081832", border:`1px solid ${C.border}`, borderRadius:10, padding:14, marginBottom:16 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  {backupCodes.map((code, i) => (
                    <div key={i} style={{ fontFamily:"monospace", fontSize:14, color:C.gold,
                      background:C.surfaceAlt, padding:"7px 12px", borderRadius:6,
                      letterSpacing:"0.1em", textAlign:"center" }}>
                      {code}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                <button onClick={()=>{ const t=backupCodes.join("\n"); navigator.clipboard?.writeText(t); }}
                  style={{ padding:"9px 18px", borderRadius:8, border:`1px solid ${C.border}`, background:"none",
                    color:C.muted, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                  📋 Copy Codes
                </button>
                <button onClick={handleComplete}
                  style={{ padding:"9px 20px", borderRadius:8, border:"none", background:C.gold,
                    color:"#0A1F44", fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                  I've Saved My Codes ✓
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
