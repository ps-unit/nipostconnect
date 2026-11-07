
// client/src/components/modals/AIMemoModal.jsx — Phase 4
import { useState } from "react";
import api from "../../services/api";
import { channelsAPI } from "../../services/api";

const C = {
  surfaceAlt: "#0D2244", border: "#1E3A5F", gold: "#D4A843",
  text: "#E8EDF5", muted: "#6B8299", textMid: "#B0BDD0", ghost: "#2E4A6B",
};
const inp = {
  width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`,
  background: "#081832", color: C.text, fontSize: 14, marginBottom: 14,
  boxSizing: "border-box", fontFamily: "'DM Sans',sans-serif", outline: "none"
};
const lbl = { display: "block", color: C.muted, fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 6 };

const TONE_OPTIONS = [
  { value: "formal", label: "Formal", desc: "Standard government memo style" },
  { value: "professional", label: "Professional", desc: "Business professional" },
  { value: "urgent", label: "Urgent", desc: "Time-sensitive and action-required" },
  { value: "informational", label: "Informational", desc: "Update or FYI" },
];

export default function AIMemoModal({ onClose, onUseDraft, defaultChannelId }) {
  const [step, setStep] = useState("compose"); // compose | draft | send
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    subject: "", keyPoints: ["", "", ""], tone: "formal",
    audience: "All NiPOST Staff", memoRef: "",
  });
  const [draft, setDraft] = useState("");
  const [refineInstr, setRefineInstr] = useState("");
  const [refining, setRefining] = useState(false);
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(defaultChannelId || "");

  const addKeyPoint = () => setForm(f => ({ ...f, keyPoints: [...f.keyPoints, ""] }));
  const setKP = (i, v) => setForm(f => {
    const kp = [...f.keyPoints]; kp[i] = v; return { ...f, keyPoints: kp };
  });
  const removeKP = (i) => setForm(f => ({ ...f, keyPoints: f.keyPoints.filter((_, j) => j !== i) }));

  const handleGenerate = async () => {
    const validPoints = form.keyPoints.filter(k => k.trim());
    if (!form.subject.trim()) { setError("Subject required"); return; }
    if (validPoints.length < 1) { setError("At least one key point required"); return; }
    setLoading(true); setError("");
    try {
      const r = await api.post("/ai/draft-memo", {
        subject: form.subject, keyPoints: validPoints,
        tone: form.tone, audience: form.audience, memoRef: form.memoRef || undefined,
      });
      setDraft(r.data.draft);
      setStep("draft");
      // Load channels for sending
      channelsAPI.listAll().then(res => setChannels(res.data.channels || [])).catch(() => { });
    } catch (e) { setError(e.response?.data?.error || "AI generation failed. Check your API key."); }
    finally { setLoading(false); }
  };

  const handleRefine = async () => {
    if (!refineInstr.trim()) return;
    setRefining(true);
    try {
      const r = await api.post("/ai/refine-memo", { draft, instruction: refineInstr });
      setDraft(r.data.draft);
      setRefineInstr("");
    } catch (e) { setError(e.response?.data?.error || "Refinement failed"); }
    finally { setRefining(false); }
  };

  const handleUseDraft = () => {
    onUseDraft?.({ content: draft, subject: form.subject, memoRef: form.memoRef, channelId: selectedChannel });
    onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16
    }}>
      <div style={{
        background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 14,
        width: "min(700px,96vw)", maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column"
      }}>

        {/* Header */}
        <div style={{
          padding: "18px 22px", borderBottom: `1px solid ${C.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <div>
            <h3 style={{ color: C.gold, margin: 0, fontSize: 17 }}>🤖 AI Memo Drafting</h3>
            <p style={{ color: C.muted, fontSize: 12, margin: "3px 0 0" }}>
              Powered by Claude · Describe your memo, AI does the writing
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        {/* Progress */}
        <div style={{ display: "flex", borderBottom: `1px solid ${C.border}` }}>
          {[["compose", "📝 Describe"], ["draft", "✨ Review Draft"]].map(([id, label]) => (
            <button key={id} onClick={() => draft && setStep(id)}
              style={{
                padding: "10px 18px", border: "none", background: "none",
                cursor: draft ? "pointer" : "default", fontSize: 13, fontWeight: 600,
                fontFamily: "'DM Sans',sans-serif",
                color: step === id ? C.gold : C.muted,
                borderBottom: step === id ? `2px solid ${C.gold}` : "2px solid transparent"
              }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 22 }}>

          {step === "compose" && (
            <>
              {error && <div style={{
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 8, padding: "9px 12px", color: "#F87171", fontSize: 13, marginBottom: 14
              }}>{error}</div>}

              <label style={lbl}>Memo Subject *</label>
              <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                placeholder="e.g. Extension of Q2 Report Submission Deadline" style={inp} />

              <label style={lbl}>Reference Number</label>
              <input value={form.memoRef} onChange={e => setForm({ ...form, memoRef: e.target.value })}
                placeholder="e.g. OPS/MEMO/2026/021" style={inp} />

              <label style={lbl}>Audience</label>
              <input value={form.audience} onChange={e => setForm({ ...form, audience: e.target.value })} style={inp} />

              <label style={lbl}>Tone</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))", gap: 8, marginBottom: 14 }}>
                {TONE_OPTIONS.map(t => (
                  <label key={t.value}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px",
                      borderRadius: 8, border: `1px solid ${form.tone === t.value ? C.gold : C.border}`,
                      background: form.tone === t.value ? "rgba(212,168,67,0.06)" : "transparent",
                      cursor: "pointer"
                    }}>
                    <input type="radio" name="tone" value={t.value} checked={form.tone === t.value}
                      onChange={() => setForm({ ...form, tone: t.value })} style={{ accentColor: C.gold, marginTop: 2 }} />
                    <div>
                      <div style={{ color: form.tone === t.value ? C.gold : C.textMid, fontSize: 13, fontWeight: 600 }}>{t.label}</div>
                      <div style={{ color: C.ghost, fontSize: 11 }}>{t.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ ...lbl, margin: 0 }}>Key Points * (what the memo must cover)</label>
                <button onClick={addKeyPoint} style={{
                  fontSize: 12, color: C.gold, background: "none",
                  border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif"
                }}>+ Add point</button>
              </div>
              {form.keyPoints.map((kp, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input value={kp} onChange={e => setKP(i, e.target.value)}
                    placeholder={`Key point ${i + 1}...`}
                    style={{ ...inp, marginBottom: 0, flex: 1 }} />
                  {form.keyPoints.length > 1 && (
                    <button onClick={() => removeKP(i)}
                      style={{
                        background: "none", border: `1px solid ${C.border}`, borderRadius: 8,
                        color: C.muted, cursor: "pointer", padding: "0 10px", fontSize: 14
                      }}>✕</button>
                  )}
                </div>
              ))}

              <div style={{
                background: "rgba(212,168,67,0.05)", border: "1px solid rgba(212,168,67,0.15)",
                borderRadius: 8, padding: "10px 12px", fontSize: 12, color: C.muted, margin: "14px 0"
              }}>
                💡 The AI will write a complete, formal NiPOST memo. You can refine it after generation.
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={onClose}
                  style={{
                    padding: "9px 18px", borderRadius: 8, border: `1px solid ${C.border}`,
                    background: "none", color: C.muted, cursor: "pointer", fontFamily: "'DM Sans',sans-serif"
                  }}>
                  Cancel
                </button>
                <button onClick={handleGenerate} disabled={loading}
                  style={{
                    padding: "9px 22px", borderRadius: 8, border: "none",
                    background: loading ? "#1E3A5F" : C.gold,
                    color: loading ? C.ghost : "#0A1F44",
                    fontWeight: 700, cursor: loading ? "default" : "pointer",
                    fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", gap: 8
                  }}>
                  {loading ? "✨ Generating..." : "✨ Generate Memo"}
                </button>
              </div>
            </>
          )}

          {step === "draft" && (
            <>
              {error && <div style={{
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 8, padding: "9px 12px", color: "#F87171", fontSize: 13, marginBottom: 14
              }}>{error}</div>}

              {/* Draft display */}
              <div style={{
                background: "#081832", border: `1px solid ${C.border}`, borderRadius: 10,
                padding: 16, marginBottom: 16, maxHeight: 300, overflowY: "auto"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ color: C.gold, fontSize: 11, fontWeight: 700, letterSpacing: "0.07em" }}>AI DRAFT</span>
                  <button onClick={() => navigator.clipboard?.writeText(draft)}
                    style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 11 }}>
                    📋 Copy
                  </button>
                </div>
                <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={12}
                  style={{ ...inp, marginBottom: 0, resize: "vertical", fontFamily: "inherit", background: "transparent", border: "none", padding: 0 }} />
              </div>

              {/* Refinement */}
              <div style={{ background: "#081A35", border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <label style={lbl}>Refine this draft (tell the AI what to change)</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={refineInstr} onChange={e => setRefineInstr(e.target.value)}
                    placeholder="e.g. Make it shorter · Add a deadline of 30 June · Use more formal language"
                    style={{ ...inp, marginBottom: 0, flex: 1 }}
                    onKeyDown={e => e.key === "Enter" && handleRefine()} />
                  <button onClick={handleRefine} disabled={refining || !refineInstr.trim()}
                    style={{
                      padding: "9px 16px", borderRadius: 8, border: "none",
                      background: refining || !refineInstr.trim() ? "#1E3A5F" : "#7C3AED",
                      color: refining || !refineInstr.trim() ? C.ghost : "#fff",
                      cursor: refining || !refineInstr.trim() ? "default" : "pointer",
                      fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 13, flexShrink: 0
                    }}>
                    {refining ? "..." : "✨ Refine"}
                  </button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                  {["Make it more concise", "Add a clear deadline", "Add compliance warning", "Translate key points to action items"].map(s => (
                    <button key={s} onClick={() => setRefineInstr(s)}
                      style={{
                        fontSize: 11, padding: "3px 10px", borderRadius: 20,
                        border: `1px solid ${C.border}`, background: "transparent",
                        color: C.muted, cursor: "pointer", fontFamily: "'DM Sans',sans-serif"
                      }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Send options */}
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Send to Channel (optional)</label>
                <select value={selectedChannel} onChange={e => setSelectedChannel(e.target.value)} style={inp}>
                  <option value="">— Choose channel to post to —</option>
                  {channels.filter(ch => ch.isMember || true).map(ch => (
                    <option key={ch.id} value={ch.id}>#{ch.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setStep("compose")}
                  style={{
                    padding: "9px 18px", borderRadius: 8, border: `1px solid ${C.border}`,
                    background: "none", color: C.muted, cursor: "pointer", fontFamily: "'DM Sans',sans-serif"
                  }}>
                  ← Edit Inputs
                </button>
                <button onClick={handleUseDraft}
                  style={{
                    padding: "9px 22px", borderRadius: 8, border: "none",
                    background: C.gold, color: "#0A1F44", fontWeight: 700,
                    cursor: "pointer", fontFamily: "'DM Sans',sans-serif"
                  }}>
                  Use This Draft →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
