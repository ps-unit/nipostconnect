
// client/src/pages/ResetPasswordPage.jsx — Phase 6
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import api from "../services/api";

const C = { bg:"#081832", surfaceAlt:"#0D2244", border:"#1E3A5F", gold:"#D4A843", text:"#E8EDF5", muted:"#6B8299" };
const inp = { width:"100%", padding:"10px 12px", borderRadius:8, border:`1px solid ${C.border}`,
  background:"#081832", color:C.text, fontSize:14, marginBottom:14,
  boxSizing:"border-box", fontFamily:"'DM Sans',sans-serif", outline:"none" };

export default function ResetPasswordPage() {
  const [params]    = useSearchParams();
  const navigate    = useNavigate();
  const token       = params.get("token") || "";
  const [form, setForm] = useState({ password:"", confirm:"" });
  const [valid, setValid]   = useState(null); // null=checking, true, false
  const [loading, setLoading] = useState(false);
  const [done, setDone]     = useState(false);
  const [error, setError]   = useState("");

  useEffect(() => {
    if (!token) { setValid(false); return; }
    api.get(`/auth/verify-reset-token?token=${token}`)
      .then(r => setValid(r.data.valid))
      .catch(() => setValid(false));
  }, [token]);

  const strength = pw => {
    let s=0;
    if(pw.length>=8) s++;
    if(pw.length>=12) s++;
    if(/[A-Z]/.test(pw)) s++;
    if(/[0-9]/.test(pw)) s++;
    if(/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };
  const str = strength(form.password);
  const strColor = str<=1?"#EF4444":str<=3?"#F59E0B":"#22C55E";
  const strLabel = ["","Weak","Fair","Good","Strong","Very Strong"][str]||"";

  const handle = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError("Passwords do not match"); return; }
    if (form.password.length < 8) { setError("Minimum 8 characters"); return; }
    setLoading(true); setError("");
    try {
      await api.post("/auth/reset-password", { token, newPassword: form.password });
      setDone(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch(err) { setError(err.response?.data?.error || "Reset failed. The link may have expired."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:C.bg, padding:20, fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ width:"100%", maxWidth:400, background:C.surfaceAlt,
        border:`1px solid ${C.border}`, borderRadius:16, padding:32 }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:40, marginBottom:10 }}>🔐</div>
          <h2 style={{ color:C.gold, fontSize:20, fontWeight:700, margin:"0 0 6px" }}>New Password</h2>
        </div>

        {valid === null && <div style={{ textAlign:"center", color:C.muted, fontSize:13 }}>Verifying link...</div>}

        {valid === false && (
          <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)",
            borderRadius:10, padding:20, textAlign:"center" }}>
            <div style={{ fontSize:32, marginBottom:10 }}>❌</div>
            <div style={{ color:"#F87171", fontWeight:600, marginBottom:8 }}>Link invalid or expired</div>
            <div style={{ color:C.muted, fontSize:13, marginBottom:16 }}>
              Password reset links expire after 30 minutes. Please request a new one.
            </div>
            <Link to="/forgot-password"
              style={{ display:"inline-block", padding:"9px 18px", borderRadius:8, background:C.gold,
                color:"#0A1F44", fontWeight:700, textDecoration:"none", fontSize:14 }}>
              Request New Link
            </Link>
          </div>
        )}

        {valid === true && !done && (
          <form onSubmit={handle}>
            {error && (
              <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)",
                borderRadius:8, padding:"9px 12px", color:"#F87171", fontSize:13, marginBottom:14 }}>
                {error}
              </div>
            )}
            <label style={{ display:"block", color:C.muted, fontSize:12, fontWeight:600, letterSpacing:"0.06em", marginBottom:6 }}>
              New Password
            </label>
            <input type="password" value={form.password}
              onChange={e=>setForm({...form,password:e.target.value})}
              placeholder="Minimum 8 characters" style={{ ...inp, marginBottom:6 }} required />
            {form.password && (
              <div style={{ marginBottom:14 }}>
                <div style={{ height:4, background:C.border, borderRadius:2, overflow:"hidden", marginBottom:4 }}>
                  <div style={{ height:"100%", width:`${(str/5)*100}%`, background:strColor, borderRadius:2 }} />
                </div>
                <div style={{ fontSize:11, color:strColor }}>{strLabel}</div>
              </div>
            )}
            <label style={{ display:"block", color:C.muted, fontSize:12, fontWeight:600, letterSpacing:"0.06em", marginBottom:6 }}>
              Confirm Password
            </label>
            <input type="password" value={form.confirm}
              onChange={e=>setForm({...form,confirm:e.target.value})}
              placeholder="Re-enter new password"
              style={{ ...inp, borderColor:form.confirm&&form.password!==form.confirm?"#EF4444":C.border }} required />
            <button type="submit" disabled={loading}
              style={{ width:"100%", padding:"11px", borderRadius:8, border:"none",
                background:loading?"#1E3A5F":C.gold, color:loading?"#4B6280":"#0A1F44",
                fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:14 }}>
              {loading ? "Resetting..." : "Set New Password"}
            </button>
          </form>
        )}

        {done && (
          <div style={{ background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.2)",
            borderRadius:10, padding:20, textAlign:"center" }}>
            <div style={{ fontSize:32, marginBottom:8 }}>✅</div>
            <div style={{ color:"#86EFAC", fontWeight:600 }}>Password reset successfully!</div>
            <div style={{ color:C.muted, fontSize:13, marginTop:8 }}>Redirecting to login...</div>
          </div>
        )}
      </div>
    </div>
  );
}
