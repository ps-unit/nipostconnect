// src/components/modals/CreateChannelModal.jsx
import { useState, useEffect } from "react";
import { channelsAPI } from "../../services/api";
import { usersAPI } from "../../services/api";
import { s, colors } from "../shared/styles";

export function CreateChannelModal({ onClose, onCreated }) {
  const [form, setForm]     = useState({ name: "", type: "GENERAL", description: "", stateId: "", departmentId: "", isLocked: false, isReadOnly: false });
  const [options, setOptions] = useState({ states: [], departments: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  useEffect(() => {
    usersAPI.setupOptions().then(r => setOptions(r.data)).catch(() => {});
  }, []);

  const f = (field) => ({ value: form[field], onChange: (e) => setForm({ ...form, [field]: e.target.type === "checkbox" ? e.target.checked : e.target.value }) });

  const handleCreate = async () => {
    if (!form.name.trim()) { setError("Channel name required"); return; }
    setLoading(true);
    try {
      await channelsAPI.create({
        name: form.name.trim().toLowerCase().replace(/\s+/g, "-"),
        type: form.type,
        description: form.description || undefined,
        stateId: form.stateId || undefined,
        departmentId: form.departmentId || undefined,
        isLocked: form.isLocked,
        isReadOnly: form.isReadOnly,
      });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create channel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.modalOverlay}>
      <div style={s.modalCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ color: colors.gold, margin: 0, fontSize: 18 }}>Create Channel</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: colors.muted, fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        {error && <div style={s.errorBanner}>{error}</div>}

        <label style={s.label}>Channel Name *</label>
        <input {...f("name")} placeholder="e.g. lagos-operations" style={s.input} />

        <label style={s.label}>Type *</label>
        <select {...f("type")} style={s.input}>
          {["GENERAL","STATE","POST_OFFICE","DEPARTMENT","SUGGESTION","ANNOUNCEMENT"].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {form.type === "STATE" && (
          <>
            <label style={s.label}>State</label>
            <select {...f("stateId")} style={s.input}>
              <option value="">— Select State —</option>
              {options.states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </>
        )}

        {form.type === "DEPARTMENT" && (
          <>
            <label style={s.label}>Department</label>
            <select {...f("departmentId")} style={s.input}>
              <option value="">— Select Department —</option>
              {options.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </>
        )}

        <label style={s.label}>Description</label>
        <input {...f("description")} placeholder="What is this channel for?" style={s.input} />

        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: colors.textMid, cursor: "pointer" }}>
            <input type="checkbox" {...f("isLocked")} /> Require join approval
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: colors.textMid, cursor: "pointer" }}>
            <input type="checkbox" {...f("isReadOnly")} /> Read-only (admins post only)
          </label>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={s.secondaryButton}>Cancel</button>
          <button onClick={handleCreate} disabled={loading} style={{ ...s.primaryButton, opacity: loading ? 0.7 : 1 }}>
            {loading ? "Creating..." : "Create Channel"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateChannelModal;
