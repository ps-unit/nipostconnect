// src/components/modals/ComposeModal.jsx
import { useState } from "react";
import { messagesAPI, pollsAPI } from "../../services/api";
import { s, colors } from "../shared/styles";

export default function ComposeModal({ type, channelId, onClose, onSent }) {
  const [content, setContent]   = useState("");
  const [memoRef, setMemoRef]   = useState("");
  const [memoTo, setMemoTo]     = useState("All NiPOST Staff");
  const [pollQ, setPollQ]       = useState("");
  const [pollOpts, setPollOpts] = useState(["", "", "", ""]);
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const isPoll = type === "poll";
  const isMemo = type === "memo";
  const isAnn  = type === "announcement";

  const handleSend = async () => {
    setError("");
    setLoading(true);
    try {
      if (isPoll) {
        const opts = pollOpts.filter(o => o.trim());
        if (opts.length < 2) { setError("At least 2 options required"); setLoading(false); return; }
        if (!pollQ.trim())   { setError("Poll question required"); setLoading(false); return; }
        if (!deadline)       { setError("Poll deadline required"); setLoading(false); return; }
        await pollsAPI.create({
          channelId, question: pollQ.trim(),
          options: opts.map(l => ({ label: l })),
          deadline,
        });
      } else {
        if (!content.trim()) { setError("Content required"); setLoading(false); return; }
        await messagesAPI.send(channelId, {
          content: content.trim(),
          type: type.toUpperCase(),
          memoRef: isMemo ? memoRef : undefined,
          memoTo:  isMemo ? memoTo : undefined,
        });
      }
      onSent();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send");
    } finally {
      setLoading(false);
    }
  };

  const titles = { poll: "🗳️ Create Poll", memo: "📄 Official Memo", announcement: "📢 Post Announcement" };

  return (
    <div style={s.modalOverlay}>
      <div style={s.modalCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ color: colors.gold, margin: 0, fontSize: 18 }}>{titles[type]}</h3>
          <button onClick={onClose} style={{ ...s.ghostButton, fontSize: 20, color: colors.muted }}>✕</button>
        </div>

        {error && <div style={s.errorBanner}>{error}</div>}

        {isMemo && (
          <>
            <label style={s.label}>To:</label>
            <input value={memoTo} onChange={e => setMemoTo(e.target.value)} style={s.input} />
            <label style={s.label}>Reference No:</label>
            <input value={memoRef} onChange={e => setMemoRef(e.target.value)} placeholder="e.g. ICT/MEMO/2026/002" style={s.input} />
          </>
        )}

        {isPoll ? (
          <>
            <label style={s.label}>Poll Question *</label>
            <input value={pollQ} onChange={e => setPollQ(e.target.value)} placeholder="What would you like to vote on?" style={s.input} />
            <label style={s.label}>Options (min 2, max 10) *</label>
            {pollOpts.map((o, i) => (
              <input key={i} value={o} onChange={e => { const n = [...pollOpts]; n[i] = e.target.value; setPollOpts(n); }}
                placeholder={`Option ${i + 1}`} style={{ ...s.input, marginBottom: 8 }} />
            ))}
            {pollOpts.length < 10 && (
              <button onClick={() => setPollOpts([...pollOpts, ""])}
                style={{ ...s.secondaryButton, fontSize: 12, padding: "5px 12px", marginBottom: 14 }}>
                + Add Option
              </button>
            )}
            <label style={s.label}>Closing Date *</label>
            <input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} style={s.input} />
          </>
        ) : (
          <>
            <label style={s.label}>{isMemo ? "Memo Body *" : "Message *"}</label>
            <textarea value={content} onChange={e => setContent(e.target.value)}
              rows={isMemo ? 8 : 4}
              placeholder={isMemo ? "Write the memo body..." : "Write your announcement..."}
              style={{ ...s.input, resize: "vertical", fontFamily: "inherit" }}
            />
          </>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={s.secondaryButton}>Cancel</button>
          <button onClick={handleSend} disabled={loading}
            style={{ ...s.primaryButton, opacity: loading ? 0.7 : 1 }}>
            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
