
// client/src/components/voice/VoiceRoom.jsx — Phase 4
import { useEffect } from "react";
import { useVoice } from "../../hooks/useVoice";
import { useAuth } from "../../contexts/AuthContext";

const C = {
  surfaceAlt:"#0D2244", border:"#1E3A5F", gold:"#D4A843",
  text:"#E8EDF5", muted:"#6B8299", ghost:"#2E4A6B",
  online:"#22C55E", danger:"#EF4444",
};

function getInitials(name="") { return name.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase(); }
function getAvatarBg(name) {
  const C = ["#C9952A","#1A6B4A","#8B2252","#1A4A8B","#2A5C8B","#8B4513","#2C5F2E"];
  let h=0; for(let i=0;i<name.length;i++) h=name.charCodeAt(i)+((h<<5)-h);
  return C[Math.abs(h)%C.length];
}

export default function VoiceRoom({ channelId, channelName, onClose }) {
  const { user } = useAuth();
  const {
    isInRoom, isMuted, participants, speaking, raisedHands, error,
    joinRoom, leaveRoom, toggleMute, raiseHand,
  } = useVoice(channelId);

  const activeParticipants = participants.filter(p => !p.leftAt);

  return (
    <div style={{ background:"#050F20", border:`1px solid ${C.border}`,
      borderRadius:12, padding:16, width:"100%", fontFamily:"'DM Sans',sans-serif" }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:8, height:8, borderRadius:"50%",
            background: isInRoom ? C.online : "#4B6280",
            animation: isInRoom ? "pulse 2s infinite" : "none" }} />
          <span style={{ color:C.text, fontWeight:700, fontSize:14 }}>
            🎙️ #{channelName} Voice
          </span>
          <span style={{ fontSize:11, color:C.muted }}>
            {activeParticipants.length} participant{activeParticipants.length !== 1 ? "s" : ""}
          </span>
        </div>
        <button onClick={onClose} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:16 }}>✕</button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)",
          borderRadius:8, padding:"8px 12px", color:"#F87171", fontSize:12, marginBottom:12 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Participants */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginBottom:14, minHeight:56 }}>
        {activeParticipants.length === 0 ? (
          <div style={{ color:C.ghost, fontSize:12, padding:"8px 0" }}>
            {isInRoom ? "You are alone in the room" : "No one in the voice room yet"}
          </div>
        ) : (
          activeParticipants.map(p => {
            const uid      = p.user?.id || p.userId;
            const name     = p.user?.name || "Staff";
            const isSpeaking = speaking.has(uid);
            const handUp     = raisedHands.has(uid);
            const muted      = p.isMuted || (uid === user.id && isMuted);
            return (
              <div key={uid} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5, width:56 }}>
                <div style={{ position:"relative" }}>
                  <div style={{
                    width:44, height:44, borderRadius:"50%",
                    background: getAvatarBg(name),
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:14, fontWeight:700, color:"#fff",
                    border:`2px solid ${isSpeaking ? C.online : "transparent"}`,
                    boxShadow: isSpeaking ? `0 0 8px ${C.online}88` : "none",
                    transition:"all 0.2s",
                  }}>
                    {getInitials(name)}
                  </div>
                  {muted && (
                    <div style={{ position:"absolute", bottom:-2, right:-2, width:16, height:16,
                      borderRadius:"50%", background:"#EF4444", display:"flex",
                      alignItems:"center", justifyContent:"center", fontSize:9, border:`2px solid #050F20` }}>
                      🔇
                    </div>
                  )}
                  {handUp && (
                    <div style={{ position:"absolute", top:-4, right:-4, fontSize:14 }}>✋</div>
                  )}
                </div>
                <span style={{ color:C.muted, fontSize:10, textAlign:"center",
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:56 }}>
                  {uid === user.id ? "You" : name.split(" ")[0]}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Controls */}
      {isInRoom ? (
        <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
          <VoiceBtn onClick={toggleMute}
            bg={isMuted ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.1)"}
            border={isMuted ? "#EF4444" : "#22C55E"}
            color={isMuted ? "#F87171" : "#22C55E"}
            icon={isMuted ? "🔇" : "🎙️"}
            label={isMuted ? "Unmute" : "Mute"} />
          <VoiceBtn onClick={() => raiseHand(!raisedHands.has(user.id))}
            bg={raisedHands.has(user.id) ? "rgba(212,168,67,0.15)" : "rgba(255,255,255,0.06)"}
            border={raisedHands.has(user.id) ? C.gold : C.border}
            color={raisedHands.has(user.id) ? C.gold : C.muted}
            icon="✋" label="Hand" />
          <VoiceBtn onClick={leaveRoom}
            bg="rgba(239,68,68,0.12)" border="#EF4444" color="#F87171"
            icon="📵" label="Leave" />
        </div>
      ) : (
        <button onClick={joinRoom}
          style={{ width:"100%", padding:"10px", borderRadius:8, border:"none",
            background:C.online, color:"#fff", fontWeight:700, cursor:"pointer",
            fontFamily:"'DM Sans',sans-serif", fontSize:14, display:"flex",
            alignItems:"center", justifyContent:"center", gap:8 }}>
          🎙️ Join Voice Room
        </button>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}

function VoiceBtn({ onClick, bg, border, color, icon, label }) {
  return (
    <button onClick={onClick}
      style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4,
        padding:"8px 16px", borderRadius:9, border:`1px solid ${border}`,
        background:bg, cursor:"pointer", color, fontFamily:"'DM Sans',sans-serif" }}>
      <span style={{ fontSize:18 }}>{icon}</span>
      <span style={{ fontSize:11, fontWeight:600 }}>{label}</span>
    </button>
  );
}
