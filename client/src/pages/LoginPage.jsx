
// client/src/pages/LoginPage.jsx — v6 (adds forgot password link + 2FA step)
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const C = {
  bg:"#081832", surfaceAlt:"#0D2244", border:"#1E3A5F",
  gold:"#D4A843", text:"#E8EDF5", muted:"#6B8299",
};
const inp = { width:"100%", padding:"10px 12px", borderRadius:8,
  border:`1px solid ${C.border}`, background:"#081832", color:C.text,
  fontSize:14, marginBottom:16, boxSizing:"border-box",
  fontFamily:"'DM Sans',sans-serif", outline:"none" };
const btn = { width:"100%", padding:"11px", borderRadius:8, border:"none",
  background:C.gold, color:"#0A1F44", fontWeight:700, fontSize:14,
  cursor:"pointer", fontFamily:"'DM Sans',sans-serif" };

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [step, setStep]       = useState("login");
  const [form, setForm]       = useState({ email:"", password:"" });
  const [totpToken, setTotpToken] = useState("");
  const [useBackup, setUseBackup] = useState(false);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const result = await login(form.email, form.password);
      if (result?.requires2FA) setStep("twofa");
      else navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Invalid credentials");
    } finally { setLoading(false); }
  };

  const handle2FA = async (e) => {
    e.preventDefault();
    const code = totpToken.replace(/\s/g,"");
    if (code.length < 6) { setError("Enter the 6-digit code"); return; }
    setError(""); setLoading(true);
    try {
      const payload = useBackup
        ? { email:form.email, password:form.password, backupCode:code }
        : { email:form.email, password:form.password, totpToken:code };
      await login(payload.email, payload.password, payload);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Invalid code. Try again.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center",
      justifyContent:"center", background:C.bg, padding:20,
      fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ width:"100%", maxWidth:420, background:C.surfaceAlt,
        border:`1px solid ${C.border}`, borderRadius:16, padding:32 }}>

        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontSize:48, marginBottom:10 }}>📮</div>
          <h1 style={{ color:C.gold, fontSize:22, fontWeight:700, margin:"0 0 4px" }}>
            NiPOST Connect
          </h1>
          <p style={{ color:C.muted, fontSize:13, margin:0 }}>
            Nigerian Postal Service · Internal Platform
          </p>
        </div>

        {error && (
          <div style={{ background:"rgba(239,68,68,0.1)",
            border:"1px solid rgba(239,68,68,0.2)", borderRadius:8,
            padding:"10px 14px", color:"#F87171", fontSize:13, marginBottom:16 }}>
            {error}
          </div>
        )}

        {step === "login" && (
          <form onSubmit={handleLogin}>
            <label style={{ display:"block", color:C.muted, fontSize:12,
              fontWeight:600, letterSpacing:"0.06em", marginBottom:6 }}>
              Official Email
            </label>
            <input type="email" value={form.email}
              onChange={e=>setForm({...form,email:e.target.value})}
              placeholder="name@nipost.gov.ng" required style={inp} />

            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <label style={{ color:C.muted, fontSize:12, fontWeight:600, letterSpacing:"0.06em" }}>
                Password
              </label>
              <Link to="/forgot-password"
                style={{ color:C.gold, fontSize:12, textDecoration:"none" }}>
                Forgot password?
              </Link>
            </div>
            <input type="password" value={form.password}
              onChange={e=>setForm({...form,password:e.target.value})}
              placeholder="••••••••" required style={inp} />

            <button type="submit" disabled={loading}
              style={{ ...btn, opacity:loading?0.7:1, marginTop:4 }}>
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>
        )}

        {step === "twofa" && (
          <form onSubmit={handle2FA}>
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <div style={{ fontSize:32, marginBottom:8 }}>🔐</div>
              <h3 style={{ color:C.text, fontSize:16, margin:"0 0 6px" }}>
                Two-Factor Authentication
              </h3>
              <p style={{ color:C.muted, fontSize:13, margin:0 }}>
                {useBackup ? "Enter a backup code" : "Enter the 6-digit code from your authenticator app"}
              </p>
            </div>
            <input
              value={totpToken}
              onChange={e=>setTotpToken(
                useBackup
                  ? e.target.value.toUpperCase()
                  : e.target.value.replace(/[^0-9]/g,"").slice(0,6)
              )}
              placeholder={useBackup ? "XXXXXXXX" : "000 000"}
              maxLength={useBackup ? 8 : 6}
              autoFocus
              style={{ ...inp, textAlign:"center", letterSpacing:"0.2em", fontSize:22, marginBottom:10 }}
            />
            <button type="button" onClick={()=>{ setUseBackup(u=>!u); setTotpToken(""); setError(""); }}
              style={{ background:"none", border:"none", color:C.gold, cursor:"pointer",
                fontSize:12, width:"100%", marginBottom:16, fontFamily:"'DM Sans',sans-serif" }}>
              {useBackup ? "← Use authenticator app" : "Use a backup code instead"}
            </button>
            <button type="submit" disabled={loading}
              style={{ ...btn, opacity:loading?0.7:1 }}>
              {loading ? "Verifying..." : "Verify →"}
            </button>
            <button type="button" onClick={()=>{ setStep("login"); setTotpToken(""); setError(""); }}
              style={{ ...btn, background:"transparent", color:C.muted,
                border:`1px solid ${C.border}`, marginTop:10 }}>
              ← Back to Login
            </button>
          </form>
        )}

        <div style={{ textAlign:"center", marginTop:20, color:C.muted, fontSize:13 }}>
          New staff?{" "}
          <Link to="/register" style={{ color:C.gold, textDecoration:"none", fontWeight:600 }}>
            Register here
          </Link>
        </div>

        <div style={{ marginTop:16, padding:"10px 12px",
          background:"rgba(212,168,67,0.05)",
          border:"1px solid rgba(212,168,67,0.12)",
          borderRadius:8, fontSize:12, color:C.muted }}>
          🔒 Restricted to authorised NiPOST staff only. All access is logged.
        </div>
      </div>
    </div>
  );
}
