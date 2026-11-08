
// client/src/components/settings/SecurityTab.jsx — Phase 5
import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../services/api";

const C = {
  surfaceAlt:"#0D2244", border:"#1E3A5F", gold:"var(--accent-color, #D4A843)",
  text:"#E8EDF5", muted:"#6B8299", textMid:"#B0BDD0", ghost:"#2E4A6B",
};
const inp = { width:"100%", padding:"10px 12px", borderRadius:8, border:`1px solid ${C.border}`,
  background:"#081832", color:C.text, fontSize:14, marginBottom:14,
  boxSizing:"border-box", fontFamily:"'DM Sans',sans-serif", outline:"none" };
const lbl = { display:"block", color:C.muted, fontSize:12, fontWeight:600, letterSpacing:"0.06em", marginBottom:6 };

export default function SecurityTab({ onOpen2FA }) {
  const { user } = useAuth();
  const [pwForm, setPwForm] = useState({ current:"", next:"", confirm:"" });
  const [twoFAStatus, setTwoFAStatus] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [sessions, setSessions] = useState([]);
  const [msg, setMsg]         = useState({ type:"", text:"" });

  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(()=>setMsg({type:"",text:""}),4000); };

  useEffect(() => {
    api.get("/2fa/status").then(r => setTwoFAStatus(r.data)).catch(()=>{});
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) { showMsg("error","New passwords do not match"); return; }
    if (pwForm.next.length < 8) { showMsg("error","Password must be at least 8 characters"); return; }
    setSaving(true);
    try {
      await api.post("/auth/change-password", { currentPassword: pwForm.current, newPassword: pwForm.next });
      setPwForm({ current:"", next:"", confirm:"" });
      showMsg("success","Password changed successfully. You may need to log in again on other devices.");
    } catch(e) { showMsg("error", e.response?.data?.error || "Failed to change password"); }
    finally { setSaving(false); }
  };

  const handleRevokeAll = async () => {
    if (!window.confirm("This will sign you out on all devices. Continue?")) return;
    try {
      await api.post("/auth/logout");
      window.location.href = "/login";
    } catch {}
  };

  const pwStrength = (pw) => {
    let score = 0;
    if (pw.length >= 8)  score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };
  const strength = pwStrength(pwForm.next);
  const strengthColor = strength <= 1 ? "#EF4444" : strength <= 3 ? "#F59E0B" : "#22C55E";
  const strengthLabel = ["","Weak","Fair","Good","Strong","Very Strong"][strength] || "";

  return (
    <div style={{ maxWidth:560 }}>
      <h3 style={{ color:C.text, fontSize:17, fontWeight:700, margin:"0 0 20px" }}>Security Settings</h3>

      {msg.text && (
        <div style={{ background:msg.type==="success"?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)",
          border:`1px solid ${msg.type==="success"?"rgba(34,197,94,0.25)":"rgba(239,68,68,0.25)"}`,
          borderRadius:8, padding:"9px 14px", fontSize:13, marginBottom:16,
          color:msg.type==="success"?"#86EFAC":"#F87171" }}>
          {msg.type==="success" ? "✅" : "⚠️"} {msg.text}
        </div>
      )}

      {/* ── Change Password ── */}
      <div style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:12, padding:20, marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.muted, letterSpacing:"0.06em", marginBottom:16 }}>CHANGE PASSWORD</div>
        <form onSubmit={handleChangePassword}>
          <label style={lbl}>Current Password</label>
          <input type="password" value={pwForm.current}
            onChange={e=>setPwForm({...pwForm,current:e.target.value})}
            placeholder="Enter current password" style={inp} required />

          <label style={lbl}>New Password</label>
          <input type="password" value={pwForm.next}
            onChange={e=>setPwForm({...pwForm,next:e.target.value})}
            placeholder="Minimum 8 characters" style={{ ...inp, marginBottom:6 }} required />

          {/* Strength bar */}
          {pwForm.next && (
            <div style={{ marginBottom:14 }}>
              <div style={{ height:4, background:C.border, borderRadius:2, overflow:"hidden", marginBottom:4 }}>
                <div style={{ height:"100%", width:`${(strength/5)*100}%`, background:strengthColor, borderRadius:2, transition:"all 0.3s" }} />
              </div>
              <div style={{ fontSize:11, color:strengthColor }}>{strengthLabel}</div>
            </div>
          )}

          <label style={lbl}>Confirm New Password</label>
          <input type="password" value={pwForm.confirm}
            onChange={e=>setPwForm({...pwForm,confirm:e.target.value})}
            placeholder="Re-enter new password"
            style={{ ...inp, borderColor: pwForm.confirm && pwForm.next !== pwForm.confirm ? "#EF4444" : C.border }} required />
          {pwForm.confirm && pwForm.next !== pwForm.confirm && (
            <div style={{ color:"#F87171", fontSize:12, marginBottom:10, marginTop:-10 }}>Passwords do not match</div>
          )}

          <button type="submit" disabled={saving}
            style={{ padding:"10px 24px", borderRadius:8, border:"none",
              background:saving?C.border:C.gold, color:saving?C.ghost:"#0A1F44",
              fontWeight:700, cursor:saving?"default":"pointer",
              fontFamily:"'DM Sans',sans-serif", opacity:saving?0.7:1 }}>
            {saving ? "Changing..." : "Change Password"}
          </button>
        </form>
      </div>

      {/* ── Two-Factor Authentication ── */}
      <div style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:12, padding:20, marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:C.muted, letterSpacing:"0.06em", marginBottom:6 }}>TWO-FACTOR AUTHENTICATION (2FA)</div>
            <div style={{ color:C.textMid, fontSize:13, marginBottom:6 }}>
              Add an extra security layer using your authenticator app.
            </div>
            {twoFAStatus && (
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                <span style={{ fontSize:11, padding:"3px 10px", borderRadius:10, fontWeight:700,
                  background: twoFAStatus.isEnabled ? "rgba(34,197,94,0.1)" : "rgba(107,130,153,0.15)",
                  color: twoFAStatus.isEnabled ? "#22C55E" : C.muted }}>
                  {twoFAStatus.isEnabled ? "✓ Enabled" : "Not Enabled"}
                </span>
                {twoFAStatus.isEnforced && (
                  <span style={{ fontSize:11, padding:"3px 10px", borderRadius:10, fontWeight:700,
                    background:"rgba(239,68,68,0.1)", color:"#F87171" }}>
                    Required for your role
                  </span>
                )}
              </div>
            )}
            {twoFAStatus?.isEnabled && (
              <div style={{ color:C.ghost, fontSize:12 }}>
                Backup codes remaining: {twoFAStatus.backupCodesCount}
                {twoFAStatus.backupCodesCount < 3 && (
                  <span style={{ color:"#F59E0B", marginLeft:8 }}>⚠️ Low — regenerate soon</span>
                )}
              </div>
            )}
          </div>
          <button onClick={() => onOpen2FA(twoFAStatus?.isEnabled ? "disable" : "setup")}
            style={{ padding:"8px 16px", borderRadius:8, border:`1px solid ${twoFAStatus?.isEnabled?"rgba(239,68,68,0.3)":C.gold}`,
              background: twoFAStatus?.isEnabled ? "rgba(239,68,68,0.08)" : "rgba(212,168,67,0.08)",
              color: twoFAStatus?.isEnabled ? "#F87171" : C.gold,
              cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"'DM Sans',sans-serif",
              flexShrink:0, marginLeft:16 }}>
            {twoFAStatus?.isEnabled ? "Disable 2FA" : "Enable 2FA"}
          </button>
        </div>
      </div>

      {/* ── Session Management ── */}
      <div style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.muted, letterSpacing:"0.06em", marginBottom:10 }}>SESSION MANAGEMENT</div>
        <div style={{ color:C.textMid, fontSize:13, marginBottom:14 }}>
          If you suspect unauthorised access, revoke all active sessions. You will need to log in again on all devices.
        </div>
        <button onClick={handleRevokeAll}
          style={{ padding:"9px 18px", borderRadius:8, border:"1px solid rgba(239,68,68,0.3)",
            background:"rgba(239,68,68,0.08)", color:"#F87171",
            cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
          🚫 Sign Out All Devices
        </button>
      </div>
    </div>
  );
}
