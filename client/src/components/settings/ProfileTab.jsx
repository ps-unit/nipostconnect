// client/src/components/settings/ProfileTab.jsx — Phase 5 (Responsive + Fixed Avatar Upload)
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../services/api";
import { resolveUploadUrl } from "../shared/styles";

const C = {
  surface: "#081A35", surfaceAlt: "#0D2244", border: "#1E3A5F", gold: "#D4A843",
  text: "#E8EDF5", muted: "#6B8299", textMid: "#B0BDD0", ghost: "#2E4A6B",
  success: "#22C55E", danger: "#EF4444",
};
const inp = {
  width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`,
  background: "#081832", color: C.text, fontSize: 14, marginBottom: 14,
  boxSizing: "border-box", fontFamily: "'DM Sans',sans-serif", outline: "none"
};
const lbl = { display: "block", color: C.muted, fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 6 };

function getInitials(name = "") { return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase(); }
function getAvatarBg(name = "") {
  const COLORS = ["#C9952A", "#1A6B4A", "#8B2252", "#1A4A8B", "#2A5C8B", "#8B4513", "#2C5F2E"];
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}

const ROLE_LABELS = { SUPER_ADMIN: "Super Admin", STATE_ADMIN: "State Admin", DEPT_ADMIN: "Dept Admin", STAFF: "Staff" };
const ROLE_COLORS = { SUPER_ADMIN: C.gold, STATE_ADMIN: "#2563EB", DEPT_ADMIN: "#7C3AED", STAFF: C.muted };

export default function ProfileTab() {
  const { user, updateUser } = useAuth();
  const fileRef = useRef();
  const [form, setForm] = useState({
    name: user?.name || "", phone: user?.phone || "", postOffice: user?.postOffice || "",
  });
  const [avatarPreview, setAvatarPreview] = useState(resolveUploadUrl(user?.avatarUrl) || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [imgError, setImgError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  useEffect(() => {
    if (user) {
      setForm(prev => ({
        name: prev.name || user.name || "",
        phone: prev.phone || user.phone || "",
        postOffice: prev.postOffice || user.postOffice || "",
      }));
      if (!avatarFile) {
        setAvatarPreview(resolveUploadUrl(user.avatarUrl) || null);
        setImgError(false);
      }
    }
  }, [user, avatarFile]);

  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg({ type: "", text: "" }), 4000); };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showMsg("error", "Avatar must be under 5 MB"); return; }
    setAvatarFile(file);
    setImgError(false);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("avatar", avatarFile);
      const r = await api.post("/profile/avatar", fd);
      const resolved = resolveUploadUrl(r.data.avatarUrl);
      updateUser({ ...(r.data.user || {}), avatarUrl: resolved });
      setAvatarPreview(resolved);
      setAvatarFile(null);
      setImgError(false);
      showMsg("success", "Profile picture updated");
    } catch (e) {
      showMsg("error", e.response?.data?.error || "Upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!window.confirm("Remove your profile picture?")) return;
    try {
      await api.delete("/profile/avatar");
      setAvatarPreview(null);
      setAvatarFile(null);
      setImgError(false);
      updateUser({ avatarUrl: null });
      if (fileRef.current) fileRef.current.value = "";
      showMsg("success", "Profile picture removed");
    } catch (e) {
      showMsg("error", e.response?.data?.error || "Failed to remove photo");
    }
  };

  const handleSaveProfile = async () => {
    if (!form.name.trim()) { showMsg("error", "Name cannot be empty"); return; }
    setSaving(true);
    try {
      let updatedAvatarUrl = user?.avatarUrl;
      if (avatarFile) {
        const fd = new FormData();
        fd.append("avatar", avatarFile);
        const avRes = await api.post("/profile/avatar", fd);
        updatedAvatarUrl = resolveUploadUrl(avRes.data.avatarUrl);
        setAvatarPreview(updatedAvatarUrl);
        setAvatarFile(null);
        setImgError(false);
      }

      const r = await api.patch("/users/me/profile", {
        name: form.name.trim(),
        phone: form.phone.trim(),
        postOffice: form.postOffice.trim(),
      });
      updateUser({ ...r.data.user, avatarUrl: updatedAvatarUrl ?? resolveUploadUrl(r.data.user?.avatarUrl) });
      showMsg("success", "Profile saved successfully");
    } catch (e) {
      showMsg("error", e.response?.data?.error || e.response?.data?.errors?.[0]?.msg || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, width: "100%" }}>
      <h3 style={{ color: C.text, fontSize: 17, fontWeight: 700, margin: "0 0 20px" }}>Profile Information</h3>

      {/* Status banner */}
      {msg.text && (
        <div style={{
          background: msg.type === "success" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
          border: `1px solid ${msg.type === "success" ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
          borderRadius: 8, padding: "9px 14px", fontSize: 13,
          color: msg.type === "success" ? "#86EFAC" : "#F87171", marginBottom: 16
        }}>
          {msg.type === "success" ? "✅" : "⚠️"} {msg.text}
        </div>
      )}

      {/* ── Avatar section ── */}
      <div style={{
        background: C.surfaceAlt, border: `1px solid ${C.border}`,
        borderRadius: 12, padding: "clamp(14px, 3vw, 20px)", marginBottom: 20
      }}>
        <div style={{
          fontSize: 13, fontWeight: 700, color: C.muted,
          letterSpacing: "0.06em", marginBottom: 14
        }}>PROFILE PICTURE</div>

        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          {/* Avatar preview */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            {avatarPreview && !imgError ? (
              <img src={avatarPreview} alt="Avatar"
                onError={() => setImgError(true)}
                style={{
                  width: 80, height: 80, borderRadius: "50%", objectFit: "cover",
                  border: `3px solid ${C.gold}`, display: "block"
                }} />
            ) : (
              <div style={{
                width: 80, height: 80, borderRadius: "50%",
                background: getAvatarBg(user?.name || ""),
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 26, fontWeight: 700, color: "#fff",
                border: `3px solid ${C.border}`
              }}>
                {getInitials(user?.name || "")}
              </div>
            )}
            {/* Camera overlay */}
            <div onClick={() => fileRef.current?.click()}
              style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center",
                justifyContent: "center", opacity: 0, cursor: "pointer", fontSize: 22,
                transition: "opacity 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "1"}
              onMouseLeave={e => e.currentTarget.style.opacity = "0"}>
              📷
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ color: C.text, fontWeight: 600, marginBottom: 4 }}>{user?.name}</div>
            <div style={{ fontSize: 12, color: ROLE_COLORS[user?.role] || C.muted, marginBottom: 10 }}>
              {ROLE_LABELS[user?.role]} · {user?.staffId}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={() => fileRef.current?.click()}
                style={{
                  padding: "7px 14px", borderRadius: 7, border: `1px solid ${C.border}`,
                  background: "transparent", color: C.textMid, cursor: "pointer", fontSize: 12,
                  fontFamily: "'DM Sans',sans-serif"
                }}>
                📷 {avatarPreview && !imgError ? "Change Photo" : "Upload Photo"}
              </button>
              {avatarFile && (
                <button type="button" onClick={handleAvatarUpload} disabled={uploadingAvatar}
                  style={{
                    padding: "7px 14px", borderRadius: 7, border: "none",
                    background: C.gold, color: "#0A1F44", fontWeight: 700, cursor: "pointer",
                    fontSize: 12, fontFamily: "'DM Sans',sans-serif", opacity: uploadingAvatar ? 0.7 : 1
                  }}>
                  {uploadingAvatar ? "Uploading..." : "✓ Save Photo"}
                </button>
              )}
              {avatarFile && (
                <button type="button" onClick={() => {
                  setAvatarFile(null);
                  setAvatarPreview(resolveUploadUrl(user?.avatarUrl) || null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                  style={{
                    padding: "7px 12px", borderRadius: 7, border: `1px solid ${C.border}`,
                    background: "transparent", color: C.muted, cursor: "pointer",
                    fontSize: 12, fontFamily: "'DM Sans',sans-serif"
                  }}>
                  Cancel
                </button>
              )}
              {(avatarPreview && !imgError && !avatarFile) && (
                <button type="button" onClick={handleRemoveAvatar}
                  style={{
                    padding: "7px 14px", borderRadius: 7, border: "1px solid rgba(239,68,68,0.3)",
                    background: "rgba(239,68,68,0.08)", color: "#F87171", cursor: "pointer",
                    fontSize: 12, fontFamily: "'DM Sans',sans-serif"
                  }}>
                  Remove
                </button>
              )}
            </div>
            <div style={{ color: C.ghost, fontSize: 11, marginTop: 6 }}>JPG, PNG, GIF or WEBP · max 5 MB</div>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleAvatarChange} style={{ display: "none" }} />
      </div>

      {/* ── Personal details ── */}
      <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 12, padding: "clamp(14px, 3vw, 20px)", marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, letterSpacing: "0.06em", marginBottom: 16 }}>PERSONAL DETAILS</div>

        <label style={lbl}>Full Name *</label>
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inp} />

        <label style={lbl}>Phone Number</label>
        <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
          placeholder="+234 xxx xxx xxxx" style={inp} />

        <label style={lbl}>Post Office / Location</label>
        <input value={form.postOffice} onChange={e => setForm({ ...form, postOffice: e.target.value })}
          placeholder="e.g. Kano Central Post Office" style={inp} />

        {/* Read-only fields */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 10, marginBottom: 4 }}>
          {[
            { label: "Email", value: user?.email },
            { label: "Staff ID", value: user?.staffId },
            { label: "State", value: user?.state?.name || "—" },
            { label: "Department", value: user?.department?.name || "—" },
          ].map(f => (
            <div key={f.label} style={{ background: "#081832", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", minWidth: 0 }}>
              <div style={{ color: C.ghost, fontSize: 11, marginBottom: 3 }}>{f.label}</div>
              <div style={{ color: C.textMid, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.value}</div>
            </div>
          ))}
        </div>
        <div style={{ color: C.ghost, fontSize: 11, marginBottom: 16, marginTop: 8 }}>
          Email, Staff ID, State and Department can only be changed by an administrator.
        </div>

        <button onClick={handleSaveProfile} disabled={saving}
          style={{
            width: "100%", maxWidth: 220, padding: "10px 24px", borderRadius: 8, border: "none",
            background: saving ? C.border : C.gold, color: saving ? C.ghost : "#0A1F44",
            fontWeight: 700, cursor: saving ? "default" : "pointer",
            fontFamily: "'DM Sans',sans-serif", fontSize: 14, opacity: saving ? 0.7 : 1
          }}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
