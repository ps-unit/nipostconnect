
// client/src/pages/ForgotPasswordPage.jsx — Phase 6
import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const C = { bg:"#081832", surfaceAlt:"#0D2244", border:"#1E3A5F", gold:"var(--accent-color, #D4A843)", text:"#E8EDF5", muted:"#6B8299" };
const inp = { width:"100%", padding:"10px 12px", borderRadius:8, border:`1px solid ${C.border}`,
  background:"#081832", color:C.text, fontSize:14, marginBottom:16,
  boxSizing:"border-box", fontFamily:"'DM Sans',sans-serif", outline:"none" };

export default function ForgotPasswordPage() {
  const [email, setEmail]   = useState("");
  const [sent, setSent]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch(err) { setError(err.response?.data?.error || "Request failed. Please try again."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:C.bg, padding:20, fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ width:"100%", maxWidth:400, background:C.surfaceAlt,
        border:`1px solid ${C.border}`, borderRadius:16, padding:32 }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:40, marginBottom:10 }}>🔑</div>
          <h2 style={{ color:C.gold, fontSize:20, fontWeight:700, margin:"0 0 6px" }}>Reset Password</h2>
          <p style={{ color:C.muted, fontSize:13, margin:0 }}>
            Enter your NiPOST email address and we'll send a reset link.
          </p>
        </div>

        {sent ? (
          <div style={{ background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.2)",
            borderRadius:10, padding:20, textAlign:"center" }}>
            <div style={{ fontSize:32, marginBottom:10 }}>📧</div>
            <div style={{ color:"#86EFAC", fontWeight:600, marginBottom:8 }}>Check your email</div>
            <div style={{ color:C.muted, fontSize:13 }}>
              If an account exists for <strong style={{color:C.text}}>{email}</strong>,
              a password reset link has been sent. Check your inbox and spam folder.
            </div>
            <div style={{ marginTop:16, fontSize:12, color:C.muted }}>Link expires in 30 minutes.</div>
          </div>
        ) : (
          <form onSubmit={handle}>
            {error && (
              <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)",
                borderRadius:8, padding:"9px 12px", color:"#F87171", fontSize:13, marginBottom:14 }}>
                {error}
              </div>
            )}
            <label style={{ display:"block", color:C.muted, fontSize:12, fontWeight:600,
              letterSpacing:"0.06em", marginBottom:6 }}>Official Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="name@nipost.gov.ng" required style={inp} />
            <button type="submit" disabled={loading}
              style={{ width:"100%", padding:"11px", borderRadius:8, border:"none",
                background:loading?"#1E3A5F":C.gold, color:loading?"#4B6280":"#0A1F44",
                fontWeight:700, cursor:loading?"default":"pointer",
                fontFamily:"'DM Sans',sans-serif", fontSize:14 }}>
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}

        <div style={{ textAlign:"center", marginTop:20 }}>
          <Link to="/login" style={{ color:C.gold, textDecoration:"none", fontSize:13 }}>
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
