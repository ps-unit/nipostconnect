// client/src/components/layout/ChatMain.jsx — v2 (+ file upload + progress bar)
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";
import { messagesAPI, pollsAPI } from "../../services/api";
import api from "../../services/api";
import MessageBubble from "../chat/MessageBubble";
import FileUpload from "../chat/FileUpload";
import ComposeModal from "../modals/ComposeModal";
import { colors, CHANNEL_ICONS } from "../shared/styles";

export default function ChatMain({ channel, dmUserId, onToggleMembers, showMembers }) {
  const { user, isAdmin }           = useAuth();
  const { on, startTyping, stopTyping } = useSocket();

  const [messages, setMessages]           = useState([]);
  const [loading, setLoading]             = useState(false);
  const [hasMore, setHasMore]             = useState(false);
  const [input, setInput]                 = useState("");
  const [composeType, setComposeType]     = useState(null);
  const [typingUsers, setTypingUsers]     = useState([]);
  const [isAnonymous, setIsAnonymous]     = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [uploading, setUploading]         = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const chatEndRef  = useRef();
  const typingTimer = useRef();
  const channelId   = channel?.id;

  // ── Load messages ────────────────────────────────────────────────────────
  const loadMessages = useCallback(() => {
    if (!channelId) return;
    setLoading(true);
    messagesAPI.list(channelId, { limit:50 })
      .then(r => { setMessages(r.data.messages); setHasMore(r.data.hasMore); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [channelId]);

  useEffect(() => { setMessages([]); loadMessages(); }, [channelId]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  // ── Socket listeners ──────────────────────────────────────────────────────
  useEffect(() => on("message:new",     msg => { if(msg.channelId===channelId) setMessages(m=>[...m.filter(x=>x.id!==msg.id),msg]); }), [on, channelId]);
  useEffect(() => on("message:updated", msg => { if(msg.channelId===channelId) setMessages(m=>m.map(x=>x.id===msg.id?msg:x)); }), [on, channelId]);
  useEffect(() => on("message:deleted", ({messageId}) => setMessages(m=>m.map(x=>x.id===messageId?{...x,deletedAt:new Date(),content:"[Message deleted]"}:x))), [on]);
  useEffect(() => on("message:reaction",({messageId,reactions}) => setMessages(m=>m.map(x=>x.id===messageId?{...x,reactions}:x))), [on]);
  useEffect(() => on("message:pinned",  ({messageId,pinned})    => setMessages(m=>m.map(x=>x.id===messageId?{...x,pinned}:x))), [on]);
  useEffect(() => on("message:unpinned",({messageId})           => setMessages(m=>m.map(x=>x.id===messageId?{...x,pinned:null}:x))), [on]);
  useEffect(() => on("poll:voted",({messageId,options,totalVotes,userVotedOptionId}) =>
    setMessages(m=>m.map(x=>x.id!==messageId||!x.poll?x:{...x,poll:{...x.poll,options,_count:{votes:totalVotes},userVotedOptionId}}))
  ), [on]);
  useEffect(() => on("emergency:broadcast", ({message}) =>
    alert(`🚨 EMERGENCY BROADCAST\n\n${message.content}\n\n— ${message.author?.name}`)
  ), [on]);

  // Typing
  useEffect(() => {
    const r1 = on("user:typing", ({userId:uid,name,channelId:cId}) => {
      if(cId!==channelId||uid===user.id) return;
      setTypingUsers(t=>t.find(u=>u.id===uid)?t:[...t,{id:uid,name}]);
      setTimeout(()=>setTypingUsers(t=>t.filter(u=>u.id!==uid)),3000);
    });
    const r2 = on("user:stopTyping", ({userId:uid}) => setTypingUsers(t=>t.filter(u=>u.id!==uid)));
    return () => { r1?.(); r2?.(); };
  }, [on, channelId, user.id]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const loadMore = () => {
    if(!hasMore||!messages.length) return;
    messagesAPI.list(channelId,{limit:50,before:messages[0].id})
      .then(r=>{ setMessages(m=>[...r.data.messages,...m]); setHasMore(r.data.hasMore); });
  };

  const sendMessage = async (e) => {
    e?.preventDefault();
    if(!input.trim()||!channelId) return;
    try {
      await messagesAPI.send(channelId, {
        content:input.trim(), type:"MESSAGE",
        isAnonymous: channel?.type==="SUGGESTION" ? isAnonymous : false,
      });
      setInput(""); stopTyping(channelId);
    } catch(err) { alert(err.response?.data?.error||"Send failed"); }
  };

  const handleKeyDown = e => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();} };
  const handleInputChange = e => {
    setInput(e.target.value);
    clearTimeout(typingTimer.current);
    startTyping(channelId);
    typingTimer.current = setTimeout(()=>stopTyping(channelId),2000);
  };

  const handleFilesSelected = async (files) => {
    setShowFileUpload(false); setUploading(true); setUploadProgress(0);
    const fd = new FormData();
    files.forEach(f=>fd.append("files",f));
    if(input.trim()) fd.append("content",input.trim());
    try {
      await api.post(`/uploads/message/${channelId}`, fd, {
        headers:{"Content-Type":"multipart/form-data"},
        onUploadProgress: e => setUploadProgress(Math.round((e.loaded/e.total)*100)),
      });
      setInput("");
    } catch(err) { alert(err.response?.data?.error||"Upload failed. Check file types/sizes."); }
    finally { setUploading(false); setUploadProgress(0); }
  };

  const handleVote   = async (pollId,optId) => { try{await pollsAPI.vote(pollId,optId);}catch(e){alert(e.response?.data?.error||"Vote failed");} };
  const handleReact  = async (msgId,emoji)  => { try{await messagesAPI.react(msgId,emoji);}catch{} };
  const handlePin    = async (msgId)        => { try{await messagesAPI.pin(msgId);}catch(e){alert(e.response?.data?.error||"Failed");} };
  const handleDelete = async (msgId)        => { if(!window.confirm("Delete this message?")) return; try{await messagesAPI.delete(msgId);}catch(e){alert(e.response?.data?.error||"Failed");} };

  const canPost = channel &&
    ((channel.isMember||user.role==="SUPER_ADMIN") && !channel.isReadOnly) ||
    (channel?.isReadOnly && isAdmin);

  if (!channel && !dmUserId) {
    return (
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
        background:colors.bg, flexDirection:"column", gap:12 }}>
        <div style={{ fontSize:56 }}>📮</div>
        <div style={{ color:colors.gold, fontWeight:700, fontSize:18 }}>NiPOST Connect</div>
        <div style={{ color:colors.muted, fontSize:14 }}>Select a channel to start</div>
      </div>
    );
  }

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, background:colors.bg }}>

      {/* Header */}
      <div style={{ height:52, background:colors.surface, borderBottom:`1px solid ${colors.borderDim}`,
        display:"flex", alignItems:"center", padding:"0 16px", gap:10, flexShrink:0 }}>
        <span style={{ fontSize:18 }}>{channel ? CHANNEL_ICONS[channel.type] : "💬"}</span>
        <div style={{ minWidth:0 }}>
          <div style={{ color:colors.text, fontWeight:600, fontSize:14,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {channel ? `#${channel.name}` : "Direct Message"}
          </div>
          {channel?.description && (
            <div style={{ color:colors.muted, fontSize:11,
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {channel.description}
            </div>
          )}
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
          {isAdmin && channel && [
            {icon:"🗳️", label:"Create Poll",       action:()=>setComposeType("poll")},
            {icon:"📄", label:"Draft Memo",         action:()=>setComposeType("memo")},
            {icon:"📢", label:"Post Announcement",  action:()=>setComposeType("announcement")},
          ].map(b=><IconBtn key={b.label} {...b} />)}
          <IconBtn icon="👥" label="Toggle Members" action={onToggleMembers} active={showMembers} />
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:"auto", padding:"12px 0" }}>
        {hasMore && (
          <div style={{ textAlign:"center", padding:"8px 0" }}>
            <button onClick={loadMore} style={{ background:"none", border:`1px solid ${colors.border}`,
              borderRadius:8, padding:"5px 16px", color:colors.muted, cursor:"pointer", fontSize:12 }}>
              Load earlier messages
            </button>
          </div>
        )}
        {loading && <div style={{ textAlign:"center", padding:40, color:colors.muted, fontSize:13 }}>Loading...</div>}
        {!loading && messages.length===0 && (
          <div style={{ textAlign:"center", padding:60, color:colors.ghost }}>
            <div style={{ fontSize:40, marginBottom:10 }}>💬</div>
            <div style={{ fontSize:16, color:colors.muted, marginBottom:6 }}>Start the conversation</div>
            <div style={{ fontSize:13 }}>Be the first to post in #{channel?.name}</div>
          </div>
        )}
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} currentUserId={user.id} isAdmin={isAdmin}
            onVote={handleVote} onReact={handleReact} onPin={handlePin} onDelete={handleDelete} />
        ))}
        {typingUsers.length>0 && (
          <div style={{ padding:"4px 16px", color:colors.muted, fontSize:12, fontStyle:"italic" }}>
            {typingUsers.map(u=>u.name).join(", ")} {typingUsers.length===1?"is":"are"} typing...
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Compose */}
      <div style={{ padding:"10px 14px 14px", borderTop:`1px solid ${colors.borderDim}`,
        background:colors.surface, flexShrink:0 }}>
        {canPost ? (
          <>
            {/* Phase 2: File upload panel */}
            {showFileUpload && (
              <FileUpload onFilesSelected={handleFilesSelected} onClose={()=>setShowFileUpload(false)} />
            )}

            {/* Phase 2: Upload progress */}
            {uploading && (
              <div style={{ marginBottom:8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:colors.muted, marginBottom:4 }}>
                  <span>Uploading files...</span><span>{uploadProgress}%</span>
                </div>
                <div style={{ height:4, background:colors.border, borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${uploadProgress}%`,
                    background:colors.gold, borderRadius:2, transition:"width 0.2s" }} />
                </div>
              </div>
            )}

            {/* Input bar */}
            <div style={{ display:"flex", gap:8, alignItems:"flex-end", background:"#0D2244",
              borderRadius:10, border:`1px solid ${colors.border}`, padding:"0 12px" }}>
              {/* Phase 2: Attach button */}
              <button onClick={()=>setShowFileUpload(s=>!s)} title="Attach files"
                style={{ background:"none", border:"none", fontSize:18, padding:"12px 4px",
                  color:showFileUpload?colors.gold:colors.muted, cursor:"pointer", flexShrink:0 }}>
                📎
              </button>
              <textarea value={input} onChange={handleInputChange} onKeyDown={handleKeyDown}
                placeholder={`Message #${channel?.name||""}...`} rows={1}
                style={{ flex:1, background:"none", border:"none", color:colors.text, fontSize:14,
                  padding:"12px 0", resize:"none", outline:"none",
                  fontFamily:"'DM Sans',sans-serif", maxHeight:120, overflowY:"auto" }} />
              {channel?.type==="SUGGESTION" && (
                <label style={{ display:"flex", alignItems:"center", gap:4, fontSize:12,
                  color:colors.muted, cursor:"pointer", flexShrink:0 }}>
                  <input type="checkbox" checked={isAnonymous} onChange={e=>setIsAnonymous(e.target.checked)} />
                  Anonymous
                </label>
              )}
              <button onClick={sendMessage} disabled={!input.trim()||uploading}
                style={{ padding:"8px 14px", borderRadius:8, border:"none", marginBottom:4,
                  background:input.trim()&&!uploading?colors.gold:colors.border,
                  color:input.trim()&&!uploading?"#0A1F44":colors.ghost,
                  fontWeight:700, cursor:input.trim()&&!uploading?"pointer":"default",
                  fontSize:16, flexShrink:0 }}>
                ↑
              </button>
            </div>

            {/* Admin quick-compose */}
            {isAdmin && (
              <div style={{ display:"flex", gap:6, marginTop:8 }}>
                {[{l:"📢 Announce",t:"announcement"},{l:"📄 Memo",t:"memo"},{l:"🗳️ Poll",t:"poll"}].map(b => (
                  <button key={b.t} onClick={()=>setComposeType(b.t)}
                    style={{ padding:"4px 10px", borderRadius:6, border:`1px solid ${colors.border}`,
                      background:"transparent", color:colors.muted, cursor:"pointer",
                      fontSize:11, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                    {b.l}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign:"center", color:colors.ghost, fontSize:13, padding:"8px 0" }}>
            {channel?.isMember===false ? "Request access to post in this channel" : "Read-only channel"}
          </div>
        )}
      </div>

      {/* Compose modal */}
      {composeType && channel && (
        <ComposeModal type={composeType} channelId={channel.id}
          onClose={()=>setComposeType(null)} onSent={()=>setComposeType(null)} />
      )}
    </div>
  );
}

function IconBtn({ icon, label, action, active }) {
  return (
    <button onClick={action} title={label}
      style={{ padding:"6px 10px", borderRadius:8,
        border:`1px solid ${active?colors.gold:colors.border}`,
        background:active?"rgba(212,168,67,0.1)":"transparent",
        color:active?colors.gold:colors.muted, cursor:"pointer", fontSize:16 }}
      onMouseEnter={e=>{ e.currentTarget.style.color=colors.gold; e.currentTarget.style.background="rgba(212,168,67,0.08)"; }}
      onMouseLeave={e=>{ e.currentTarget.style.color=active?colors.gold:colors.muted; e.currentTarget.style.background=active?"rgba(212,168,67,0.1)":"transparent"; }}>
      {icon}
    </button>
  );
}
