// src/pages/RegisterPage.jsx
import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api, { usersAPI } from "../services/api";
import { s, colors, resolveUploadUrl, getCachedOrgSettings, applyOrgBranding } from "../components/shared/styles";

function getInitials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0] || "").join("").toUpperCase() || "📷";
}

export default function RegisterPage() {
  const { register, updateUser } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef();

  const [step, setStep]               = useState(0);
  const [options, setOptions]         = useState({ states: [], departments: [] });
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [avatarFile, setAvatarFile]   = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [orgSettings, setOrgSettings] = useState(() => getCachedOrgSettings());
  const [logoErr, setLogoErr]         = useState(false);
  const [form, setForm] = useState({
    name: "", staffId: "", email: "", password: "", confirmPassword: "",
    phone: "", stateId: "", departmentId: "", postOffice: "",
  });

  useEffect(() => {
    usersAPI.setupOptions()
      .then(r => setOptions(r.data))
      .catch(() => {});
    api.get("/organization")
      .then(r => {
        if (r.data?.settings) {
          setOrgSettings(r.data.settings);
          applyOrgBranding(r.data.settings);
        }
      })
      .catch(() => {});
  }, []);

  const orgLogoSrc = resolveUploadUrl(orgSettings?.logoUrl);
  const orgName    = orgSettings?.name || "NiPOST Connect";

  const f = (field) => ({ value: form[field], onChange: (e) => setForm({ ...form, [field]: e.target.value }) });

  const steps = ["Personal Info", "Assignment", "Credentials", "Review"];

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Profile photo must be under 5 MB");
      return;
    }
    setError("");
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const validateStep = () => {
    if (step === 0) {
      if (!form.name.trim()) return "Full name is required";
      if (!form.staffId.trim()) return "Staff ID is required";
      if (!form.email.includes("@")) return "Valid email required";
      if (!form.email.toLowerCase().endsWith("@nipost.gov.ng")) return "Only @nipost.gov.ng email addresses are permitted";
    }
    if (step === 1) {
      if (!form.stateId) return "State of posting is required";
      if (!form.departmentId) return "Department is required";
    }
    if (step === 2) {
      if (form.password.length < 8) return "Password must be at least 8 characters";
      if (form.password !== form.confirmPassword) return "Passwords do not match";
    }
    return null;
  };

  const next = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError("");
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const { confirmPassword, ...data } = form;
      await register(data);

      // If user selected a profile picture during setup, upload it right after registration
      if (avatarFile) {
        try {
          const fd = new FormData();
          fd.append("avatar", avatarFile);
          const avRes = await api.post("/profile/avatar", fd);
          updateUser({ avatarUrl: resolveUploadUrl(avRes.data.avatarUrl) });
        } catch (uploadErr) {
          console.warn("Avatar upload after registration failed:", uploadErr);
        }
      }

      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || "Registration failed");
      setStep(0);
    } finally {
      setLoading(false);
    }
  };

  const selectedState = options.states.find(st => st.id === form.stateId);
  const selectedDept  = options.departments.find(d => d.id === form.departmentId);

  return (
    <div style={{ ...s.authPage, overflowY: "auto" }}>
      <div style={{ ...s.authCard, maxWidth: 520, margin: "auto" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          {orgLogoSrc && !logoErr ? (
            <img
              src={orgLogoSrc}
              alt={orgName}
              onError={() => setLogoErr(true)}
              style={{ width: 52, height: 52, objectFit: "contain", margin: "0 auto 8px", display: "block" }}
            />
          ) : (
            <div style={{ fontSize: 38, marginBottom: 6 }}>📮</div>
          )}
          <h1 style={{ color: orgSettings?.accentColor || colors.gold, fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Staff Registration</h1>
          <p style={{ color: colors.muted, fontSize: 12 }}>Step {step + 1} of {steps.length} — {steps[step]}</p>
        </div>

        {/* Progress */}
        <div style={{ display: "flex", gap: 6, marginBottom: 22 }}>
          {steps.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? colors.gold : "#1E3A5F", transition: "background 0.3s" }} />
          ))}
        </div>

        {error && <div style={s.errorBanner}>{error}</div>}

        {/* ── Step 0: Personal Info + Profile Photo ── */}
        {step === 0 && (
          <>
            {/* Profile Photo Picker */}
            <div style={{
              display: "flex", alignItems: "center", gap: 16, marginBottom: 18,
              padding: "12px 14px", background: "#081832", border: `1px solid ${colors.border}`, borderRadius: 10,
            }}>
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  width: 64, height: 64, borderRadius: "50%", flexShrink: 0,
                  background: "#0D2244", border: `2px dashed ${avatarPreview ? colors.gold : colors.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", overflow: "hidden", position: "relative",
                }}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profile preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: form.name ? 18 : 22, fontWeight: 700, color: colors.gold }}>
                    {getInitials(form.name)}
                  </span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: colors.text, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  Profile Photo <span style={{ color: colors.muted, fontWeight: 400, fontSize: 11 }}>(optional)</span>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    style={{
                      padding: "5px 12px", borderRadius: 6, border: `1px solid ${colors.border}`,
                      background: "transparent", color: colors.gold, fontSize: 12, fontWeight: 600,
                      cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    📷 {avatarPreview ? "Change Photo" : "Upload Photo"}
                  </button>
                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={() => { setAvatarFile(null); setAvatarPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                      style={{
                        padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)",
                        background: "rgba(239,68,68,0.08)", color: "#F87171", fontSize: 12,
                        cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div style={{ color: colors.ghost, fontSize: 11, marginTop: 4 }}>JPG, PNG or WEBP · max 5 MB</div>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleAvatarSelect}
                style={{ display: "none" }}
              />
            </div>

            <label style={s.label}>Full Name *</label>
            <input {...f("name")} placeholder="e.g. Aminu Ibrahim Musa" style={s.input} />

            <label style={s.label}>Staff ID *</label>
            <input {...f("staffId")} placeholder="e.g. NPS/KN/2024/001" style={s.input} />

            <label style={s.label}>Official Email * (@nipost.gov.ng)</label>
            <input {...f("email")} type="email" placeholder="aminu.musa@nipost.gov.ng" style={s.input} />

            <label style={s.label}>Phone Number</label>
            <input {...f("phone")} type="tel" placeholder="+234 xxx xxx xxxx" style={s.input} />
          </>
        )}

        {/* ── Step 1: Assignment ── */}
        {step === 1 && (
          <>
            <label style={s.label}>State of Posting *</label>
            <select {...f("stateId")} style={s.input}>
              <option value="">— Select State —</option>
              {options.states.map(st => (
                <option key={st.id} value={st.id}>{st.name}</option>
              ))}
            </select>

            <label style={s.label}>Department *</label>
            <select {...f("departmentId")} style={s.input}>
              <option value="">— Select Department —</option>
              {options.departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            <label style={s.label}>Post Office (if applicable)</label>
            <input {...f("postOffice")} placeholder="e.g. Kano Central Post Office" style={s.input} />

            <div style={{ background: "rgba(212,168,67,0.06)", border: "1px solid rgba(212,168,67,0.15)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: colors.muted }}>
              ℹ️ You will be <strong style={{ color: colors.gold }}>automatically added</strong> to your state channel and department channel. Access to additional channels requires admin approval.
            </div>
          </>
        )}

        {/* ── Step 2: Credentials ── */}
        {step === 2 && (
          <>
            <label style={s.label}>Password *</label>
            <input {...f("password")} type="password" placeholder="Minimum 8 characters" style={s.input} />

            <label style={s.label}>Confirm Password *</label>
            <input {...f("confirmPassword")} type="password" placeholder="Re-enter password" style={s.input} />

            <div style={{ background: "#081832", border: "1px solid #1E3A5F", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: colors.muted }}>
              Password requirements:
              <ul style={{ marginTop: 6, paddingLeft: 18, lineHeight: 1.8 }}>
                <li style={{ color: form.password.length >= 8 ? "#22C55E" : colors.muted }}>At least 8 characters</li>
                <li style={{ color: form.password === form.confirmPassword && form.confirmPassword ? "#22C55E" : colors.muted }}>Passwords match</li>
              </ul>
            </div>
          </>
        )}

        {/* ── Step 3: Review ── */}
        {step === 3 && (
          <div>
            {avatarPreview && (
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                <img src={avatarPreview} alt="Profile preview" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: `3px solid ${colors.gold}` }} />
              </div>
            )}
            <div style={{ background: "#081832", border: "1px solid #1E3A5F", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
              {[
                ["Full Name",    form.name],
                ["Staff ID",     form.staffId],
                ["Email",        form.email],
                ["Phone",        form.phone || "—"],
                ["State",        selectedState?.name || "—"],
                ["Department",   selectedDept?.name  || "—"],
                ["Post Office",  form.postOffice || "—"],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 14px", borderBottom: "1px solid #1E3A5F", fontSize: 13 }}>
                  <span style={{ color: colors.muted, flexShrink: 0 }}>{label}</span>
                  <span style={{ color: colors.text, fontWeight: 500, textAlign: "right", wordBreak: "break-word" }}>{value}</span>
                </div>
              ))}
            </div>
            <div style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#86EFAC" }}>
              ✅ You will be auto-added to: <strong>#{selectedState?.slug}-state</strong> and <strong>#{selectedDept?.slug}-dept</strong>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          {step > 0 && (
            <button onClick={() => { setError(""); setStep(s => s - 1); }}
              style={{ ...s.secondaryButton, flex: 1 }}>← Back</button>
          )}
          {step < steps.length - 1 ? (
            <button onClick={next} style={{ ...s.primaryButton, flex: 2 }}>Continue →</button>
          ) : (
            <button onClick={handleSubmit} disabled={loading}
              style={{ ...s.primaryButton, flex: 2, background: loading ? "#6B5A1E" : colors.gold }}>
              {loading ? "Registering..." : "Complete Registration ✓"}
            </button>
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: 16, color: colors.muted, fontSize: 13 }}>
          Already registered?{" "}
          <Link to="/login" style={{ color: colors.gold, textDecoration: "none", fontWeight: 600 }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}
