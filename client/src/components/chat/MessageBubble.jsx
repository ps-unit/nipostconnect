// client/src/components/chat/MessageBubble.jsx — v2 (+ attachments + read receipts)
import { useState } from "react";
import { format } from "date-fns";
import { colors, ROLE_BADGE, MSG_TYPE_META } from "../shared/styles";
import { AttachmentViewer, ReadReceiptsBar } from "./AttachmentViewer";

function Avatar({ name="", size=36 }) {
  const initials = name.split(" ").slice(0,2).map(w=>w[0]||"").join("").toUpperCase();
  const C = ["#C9952A","#1A6B4A","#8B2252","#1A4A8B","#5C3A1E","#2A5C8B","#8B4513","#2C5F2E","#5B2A8B"];
  let h=0; for(let i=0;i<name.length;i++) h=name.charCodeAt(i)+((h<<5)-h);
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:C[Math.abs(h)%C.length],
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:size*0.36, fontWeight:700, color:"#fff", flexShrink:0 }}>
      {initials}
    </div>
  );
}

function PollWidget({ poll, onVote }) {
  const total   = poll._count?.votes || 0;
  const voted   = poll.userVotedOptionId;
  const expired = !poll.isActive || new Date() > new Date(poll.deadline);
  return (
    <div style={{ background:"#0D2B50", border:`1px solid ${colors.border}`, borderRadius:10, padding:"14px 16px", marginTop:6 }}>
      <div style={{ fontSize:11, color:"#2563EB", fontWeight:700, letterSpacing:"0.08em", marginBottom:6 }}>
        🗳️ POLL {expired?"· CLOSED":""}
      </div>
      <div style={{ color:colors.text, fontWeight:600, fontSize:14, marginBottom:12 }}>{poll.question}</div>
      {poll.options.map(opt => {
        const count  = opt._count?.votes || 0;
        const pct    = total>0 ? Math.round((count/total)*100) : 0;
        const isVote = voted===opt.id;
        return (
          <div key={opt.id} onClick={()=>!voted&&!expired&&onVote(poll.id,opt.id)}
            style={{ marginBottom:8, cursor:voted||expired?"default":"pointer" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
              <span style={{ color:isVote?colors.gold:colors.textMid, fontSize:13, fontWeight:isVote?600:400 }}>
                {isVote?"✓ ":""}{opt.label}
              </span>
              <span style={{ color:colors.muted, fontSize:12 }}>{pct}% · {count}</span>
            </div>
            <div style={{ height:8, background:"#1A3356", borderRadius:4, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${pct}%`,
                background:isVote?colors.gold:"#2563EB", borderRadius:4, transition:"width 0.4s" }} />
            </div>
          </div>
        );
      })}
      <div style={{ marginTop:10, fontSize:11, color:colors.mutedDim }}>
        {total} votes · {expired?"Closed":`Closes ${format(new Date(poll.deadline),"d MMM yyyy")}`}
        {!voted&&!expired&&<span style={{ color:colors.muted }}> · Click to vote</span>}
      </div>
    </div>
  );
}

const QUICK_EMOJIS = ["👍","👏","✅","❤️","🙏","🚨"];

export default function MessageBubble({ msg, currentUserId, isAdmin, onVote, onReact, onPin, onDelete }) {
  const [showActions, setShowActions]         = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  if (msg.deletedAt) {
    return <div style={{ padding:"4px 16px 4px 66px", color:colors.ghost, fontSize:13, fontStyle:"italic" }}>[Message deleted]</div>;
  }

  const authorName = msg.isAnonymous ? "Anonymous" : (msg.author?.name || "Unknown");
  const badge      = msg.author ? ROLE_BADGE[msg.author.role] : null;
  const meta       = MSG_TYPE_META[msg.type];
  const isPinned   = !!msg.pinned;
  const isOwn      = msg.author?.id === currentUserId;
  const showReceipts = ["MEMO","ANNOUNCEMENT"].includes(msg.type) && msg.readReceipts?.length > 0;

  // Group reactions
  const rxGroups = {};
  (msg.reactions||[]).forEach(r => {
    if (!rxGroups[r.emoji]) rxGroups[r.emoji] = { count:0, users:[], mine:false };
    rxGroups[r.emoji].count++;
    rxGroups[r.emoji].users.push(r.user?.name||"?");
    if (r.userId===currentUserId) rxGroups[r.emoji].mine = true;
  });

  return (
    <div
      onMouseEnter={()=>setShowActions(true)}
      onMouseLeave={()=>{ setShowActions(false); setShowEmojiPicker(false); }}
      style={{ display:"flex", gap:12, padding:"8px 16px",
        borderLeft:meta?`3px solid ${meta.bar}`:"3px solid transparent",
        background:isPinned?"rgba(212,168,67,0.05)":"transparent",
        marginBottom:2, position:"relative", transition:"background 0.1s" }}>

      <Avatar name={authorName} size={38} />

      <div style={{ flex:1, minWidth:0 }}>
        {/* Header row */}
        <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4, flexWrap:"wrap" }}>
          <span style={{ color:colors.text, fontWeight:700, fontSize:14 }}>{authorName}</span>
          {badge && (
            <span style={{ fontSize:10, padding:"2px 7px", borderRadius:20,
              background:badge.bg, color:badge.color, fontWeight:700, letterSpacing:"0.04em" }}>
              {badge.label}
            </span>
          )}
          {meta && (
            <span style={{ fontSize:10, padding:"2px 7px", borderRadius:20,
              background:meta.bar+"22", color:meta.bar, fontWeight:700, letterSpacing:"0.05em" }}>
              {meta.icon} {meta.label}
            </span>
          )}
          {isPinned && <span style={{ fontSize:10, color:colors.gold }}>📌 PINNED</span>}
          {msg.editedAt && <span style={{ fontSize:10, color:colors.muted, fontStyle:"italic" }}>(edited)</span>}
          <span style={{ fontSize:11, color:colors.mutedDim, marginLeft:"auto" }}>
            {format(new Date(msg.createdAt),"h:mm a")}
          </span>
        </div>

        {/* Content */}
        {msg.type==="POLL" ? (
          msg.poll && <PollWidget poll={msg.poll} onVote={onVote} />
        ) : (
          <>
            {msg.type==="MEMO" && msg.memoRef && (
              <div style={{ fontSize:11, color:colors.muted, marginBottom:6, fontFamily:"monospace" }}>
                Ref: {msg.memoRef}{msg.memoTo ? ` · To: ${msg.memoTo}` : ""}
              </div>
            )}
            {msg.content && (
              <div style={{ color:colors.textMid, fontSize:14, lineHeight:1.65,
                whiteSpace:"pre-line", wordBreak:"break-word" }}>
                {msg.content}
              </div>
            )}
          </>
        )}

        {/* Phase 2: Attachments */}
        {msg.attachments?.length > 0 && <AttachmentViewer attachments={msg.attachments} />}

        {/* Reactions */}
        {Object.keys(rxGroups).length > 0 && (
          <div style={{ display:"flex", gap:5, marginTop:8, flexWrap:"wrap" }}>
            {Object.entries(rxGroups).map(([emoji, data]) => (
              <button key={emoji} onClick={()=>onReact(msg.id,emoji)} title={data.users.join(", ")}
                style={{ background:data.mine?"rgba(212,168,67,0.15)":"rgba(255,255,255,0.07)",
                  border:`1px solid ${data.mine?colors.gold:"rgba(255,255,255,0.1)"}`,
                  borderRadius:12, padding:"3px 9px", cursor:"pointer",
                  color:colors.textMid, fontSize:13, display:"flex", alignItems:"center", gap:4 }}>
                {emoji} <span style={{ fontSize:12 }}>{data.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Thread replies */}
        {msg._count?.replies > 0 && (
          <div style={{ marginTop:6, fontSize:12, color:"#2563EB", cursor:"pointer" }}>
            💬 {msg._count.replies} {msg._count.replies===1?"reply":"replies"}
          </div>
        )}

        {/* Phase 2: Read receipts (memos + announcements) */}
        {showReceipts && <ReadReceiptsBar readReceipts={msg.readReceipts} totalMembers={msg._count?.readReceipts} />}
      </div>

      {/* Hover actions */}
      {showActions && (
        <div style={{ position:"absolute", top:4, right:12, display:"flex", gap:4, alignItems:"center",
          background:colors.surfaceAlt, border:`1px solid ${colors.border}`,
          borderRadius:8, padding:"3px 6px", zIndex:10 }}>
          <div style={{ position:"relative" }}>
            <ABtn icon="😊" label="React" onClick={()=>setShowEmojiPicker(s=>!s)} />
            {showEmojiPicker && (
              <div style={{ position:"absolute", bottom:"calc(100% + 4px)", right:0,
                background:colors.surfaceAlt, border:`1px solid ${colors.border}`,
                borderRadius:8, padding:"6px 8px", display:"flex", gap:4, zIndex:20 }}>
                {QUICK_EMOJIS.map(e => (
                  <button key={e} onClick={()=>{ onReact(msg.id,e); setShowEmojiPicker(false); }}
                    style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, borderRadius:4, padding:"2px 3px" }}
                    onMouseEnter={el=>el.currentTarget.style.background="rgba(255,255,255,0.1)"}
                    onMouseLeave={el=>el.currentTarget.style.background="none"}>
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
          {isAdmin && <ABtn icon="📌" label={isPinned?"Unpin":"Pin"} onClick={()=>onPin(msg.id)} />}
          {(isOwn||isAdmin) && <ABtn icon="🗑️" label="Delete" onClick={()=>onDelete(msg.id)} danger />}
        </div>
      )}
    </div>
  );
}

function ABtn({ icon, label, onClick, danger }) {
  return (
    <button onClick={onClick} title={label}
      style={{ background:"none", border:"none", cursor:"pointer", fontSize:14,
        padding:"3px 5px", borderRadius:4, color:danger?"#F87171":colors.muted }}
      onMouseEnter={e=>e.currentTarget.style.background=danger?"rgba(239,68,68,0.1)":"rgba(255,255,255,0.08)"}
      onMouseLeave={e=>e.currentTarget.style.background="none"}>
      {icon}
    </button>
  );
}
