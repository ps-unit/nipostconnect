// client/src/components/layout/ChatMain.jsx — v3 (+ DMs + file/image upload + avatar live sync + mobile responsive)
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";
import { messagesAPI, pollsAPI, dmsAPI, usersAPI } from "../../services/api";
import api from "../../services/api";
import MessageBubble from "../chat/MessageBubble";
import FileUpload from "../chat/FileUpload";
import ComposeModal from "../modals/ComposeModal";
import { colors, CHANNEL_ICONS, resolveUploadUrl } from "../shared/styles";

export default function ChatMain({
  channel,
  dmUserId,
  orgSettings,
  onToggleMembers,
  showMembers,
  onOpenThread,
  onTogglePinned,
  showPinned,
  onOpenAIMemo,
  isMobile,
  onBack,
  activeView,
}) {
  const { user, isAdmin }               = useAuth();
  const { on, startTyping, stopTyping } = useSocket();
  const [logoErr, setLogoErr]           = useState(false);

  const orgLogoSrc = resolveUploadUrl(orgSettings?.logoUrl);
  const orgName    = orgSettings?.name || "NiPOST Connect";

  useEffect(() => {
    setLogoErr(false);
  }, [orgLogoSrc]);

  const [messages, setMessages]             = useState([]);
  const [dmPartner, setDmPartner]           = useState(null);
  const [loading, setLoading]               = useState(false);
  const [hasMore, setHasMore]               = useState(false);
  const [input, setInput]                   = useState("");
  const [composeType, setComposeType]       = useState(null);
  const [typingUsers, setTypingUsers]       = useState([]);
  const [isAnonymous, setIsAnonymous]       = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [uploading, setUploading]           = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const chatEndRef  = useRef();
  const typingTimer = useRef();
  const channelId   = channel?.id;
  const isDM        = activeView === "dms" && !!dmUserId;

  // ── Load channel or DM messages ──────────────────────────────────────────
  const loadMessages = useCallback(() => {
    if (isDM) {
      setLoading(true);
      Promise.all([
        dmsAPI.messages(dmUserId, { limit: 50 }),
        usersAPI.getUser(dmUserId).catch(() => ({ data: { user: null } })),
      ])
        .then(([msgRes, userRes]) => {
          const normalized = (msgRes.data.messages || []).map(dm => ({
            ...dm,
            type: "MESSAGE",
            author: dm.sender,
          }));
          setMessages(normalized);
          setHasMore(msgRes.data.hasMore || false);
          if (userRes.data?.user) setDmPartner(userRes.data.user);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
      return;
    }

    if (!channelId) return;
    setLoading(true);
    messagesAPI.list(channelId, { limit: 50 })
      .then(r => { setMessages(r.data.messages || []); setHasMore(r.data.hasMore); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [channelId, isDM, dmUserId]);

  useEffect(() => {
    setMessages([]);
    setShowFileUpload(false);
    loadMessages();
  }, [channelId, isDM, dmUserId, loadMessages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Socket listeners ──────────────────────────────────────────────────────
  useEffect(() => on("message:new", msg => {
    if (!isDM && msg.channelId === channelId && !msg.parentId) {
      setMessages(m => [...m.filter(x => x.id !== msg.id), msg]);
    }
  }), [on, channelId, isDM]);

  useEffect(() => on("dm:new", dm => {
    if (isDM && (dm.senderId === dmUserId || dm.receiverId === dmUserId)) {
      const normalized = { ...dm, type: "MESSAGE", author: dm.sender };
      setMessages(m => [...m.filter(x => x.id !== dm.id), normalized]);
    }
  }), [on, isDM, dmUserId]);

  useEffect(() => on("message:updated", msg => {
    if (msg.channelId === channelId) setMessages(m => m.map(x => x.id === msg.id ? msg : x));
  }), [on, channelId]);

  useEffect(() => on("message:deleted", ({ messageId }) =>
    setMessages(m => m.map(x => x.id === messageId ? { ...x, deletedAt: new Date(), content: "[Message deleted]" } : x))
  ), [on]);

  useEffect(() => on("message:reaction", ({ messageId, reactions }) =>
    setMessages(m => m.map(x => x.id === messageId ? { ...x, reactions } : x))
  ), [on]);

  useEffect(() => on("message:pinned", ({ messageId, pinned }) =>
    setMessages(m => m.map(x => x.id === messageId ? { ...x, pinned } : x))
  ), [on]);

  useEffect(() => on("message:unpinned", ({ messageId }) =>
    setMessages(m => m.map(x => x.id === messageId ? { ...x, pinned: null } : x))
  ), [on]);

  useEffect(() => on("poll:voted", ({ messageId, options, totalVotes, userVotedOptionId }) =>
    setMessages(m => m.map(x => x.id !== messageId || !x.poll ? x : {
      ...x,
      poll: { ...x.poll, options, _count: { votes: totalVotes }, userVotedOptionId },
    }))
  ), [on]);

  useEffect(() => on("user:avatar:updated", ({ userId, avatarUrl }) => {
    const resolved = resolveUploadUrl(avatarUrl);
    setMessages(m => m.map(msg =>
      msg.author?.id === userId
        ? { ...msg, author: { ...msg.author, avatarUrl: resolved } }
        : msg
    ));
    if (dmPartner?.id === userId) {
      setDmPartner(p => p ? { ...p, avatarUrl: resolved } : p);
    }
  }), [on, dmPartner?.id]);

  useEffect(() => on("emergency:broadcast", ({ message }) =>
    alert(`🚨 EMERGENCY BROADCAST\n\n${message.content}\n\n— ${message.author?.name}`)
  ), [on]);

  // Typing
  useEffect(() => {
    if (isDM) return;
    const r1 = on("user:typing", ({ userId: uid, name, channelId: cId }) => {
      if (cId !== channelId || uid === user.id) return;
      setTypingUsers(t => t.find(u => u.id === uid) ? t : [...t, { id: uid, name }]);
      setTimeout(() => setTypingUsers(t => t.filter(u => u.id !== uid)), 3000);
    });
    const r2 = on("user:stopTyping", ({ userId: uid }) => setTypingUsers(t => t.filter(u => u.id !== uid)));
    return () => { r1?.(); r2?.(); };
  }, [on, channelId, user.id, isDM]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const loadMore = () => {
    if (!hasMore || !messages.length) return;
    if (isDM) {
      dmsAPI.messages(dmUserId, { limit: 50, before: messages[0].createdAt })
        .then(r => {
          const older = (r.data.messages || []).map(dm => ({ ...dm, type: "MESSAGE", author: dm.sender }));
          setMessages(m => [...older, ...m]);
          setHasMore(r.data.hasMore);
        });
      return;
    }
    messagesAPI.list(channelId, { limit: 50, before: messages[0].id })
      .then(r => { setMessages(m => [...r.data.messages, ...m]); setHasMore(r.data.hasMore); });
  };

  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!input.trim()) return;
    if (isDM) {
      try {
        await dmsAPI.send(dmUserId, input.trim());
        setInput("");
      } catch (err) {
        alert(err.response?.data?.error || "Send failed");
      }
      return;
    }
    if (!channelId) return;
    try {
      await messagesAPI.send(channelId, {
        content: input.trim(), type: "MESSAGE",
        isAnonymous: channel?.type === "SUGGESTION" ? isAnonymous : false,
      });
      setInput(""); stopTyping(channelId);
    } catch (err) { alert(err.response?.data?.error || "Send failed"); }
  };

  const handleKeyDown = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
  const handleInputChange = e => {
    setInput(e.target.value);
    if (!isDM && channelId) {
      clearTimeout(typingTimer.current);
      startTyping(channelId);
      typingTimer.current = setTimeout(() => stopTyping(channelId), 2000);
    }
  };

  const handleFilesSelected = async (files) => {
    if (!channelId) return;
    setShowFileUpload(false); setUploading(true); setUploadProgress(0);
    const fd = new FormData();
    files.forEach(f => fd.append("files", f));
    if (input.trim()) fd.append("content", input.trim());
    try {
      await api.post(`/uploads/message/${channelId}`, fd, {
        onUploadProgress: e => {
          if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      setInput("");
    } catch (err) {
      alert(err.response?.data?.error || "Upload failed. Check file types/sizes.");
    } finally {
      setUploading(false); setUploadProgress(0);
    }
  };

  // Support pasting images directly into the message box in a channel
  const handlePaste = (e) => {
    if (isDM || !channelId) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const f = items[i].getAsFile();
        if (f) imageFiles.push(f);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      handleFilesSelected(imageFiles);
    }
  };

  const handleVote   = async (pollId, optId) => { try { await pollsAPI.vote(pollId, optId); } catch (e) { alert(e.response?.data?.error || "Vote failed"); } };
  const handleReact  = async (msgId, emoji)  => { if (isDM) return; try { await messagesAPI.react(msgId, emoji); } catch {} };
  const handlePin    = async (msgId)         => { if (isDM) return; try { await messagesAPI.pin(msgId); } catch (e) { alert(e.response?.data?.error || "Failed"); } };
  const handleDelete = async (msgId)         => { if (isDM) return; if (!window.confirm("Delete this message?")) return; try { await messagesAPI.delete(msgId); } catch (e) { alert(e.response?.data?.error || "Failed"); } };

  const canPost = isDM || (channel && (
    ((channel.isMember || user.role === "SUPER_ADMIN") && !channel.isReadOnly) ||
    (channel?.isReadOnly && isAdmin)
  ));

  if (!channel && !dmUserId) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        background: colors.bg, flexDirection: "column", gap: 12, padding: 20, textAlign: "center" }}>
        {orgLogoSrc && !logoErr ? (
          <img
            src={orgLogoSrc}
            alt={orgName}
            onError={() => setLogoErr(true)}
            style={{ width: 72, height: 72, objectFit: "contain", display: "block" }}
          />
        ) : (
          <div style={{ fontSize: 56 }}>📮</div>
        )}
        <div style={{ color: colors.gold, fontWeight: 700, fontSize: 18 }}>{orgName}</div>
        <div style={{ color: colors.muted, fontSize: 14 }}>
          {activeView === "dms" ? "Select a conversation from Direct Messages or Staff Directory" : "Select a channel to start"}
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, background: colors.bg }}>

      {/* Header */}
      <div style={{
        height: 52, background: colors.surface, borderBottom: `1px solid ${colors.borderDim}`,
        display: "flex", alignItems: "center", padding: isMobile ? "0 10px" : "0 16px",
        gap: isMobile ? 8 : 10, flexShrink: 0,
      }}>
        {isMobile && onBack && (
          <button
            onClick={onBack}
            aria-label="Back"
            style={{
              background: "none", border: "none", color: colors.gold, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 3, padding: "6px 6px 6px 0",
              fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 18 }}>‹</span>
            <span>{isDM ? "DMs" : "Channels"}</span>
          </button>
        )}

        <span style={{ fontSize: 18, flexShrink: 0 }}>{channel ? CHANNEL_ICONS[channel.type] : "💬"}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            color: colors.text, fontWeight: 700, fontSize: isMobile ? 14 : 15,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {channel ? `#${channel.name}` : (dmPartner?.name || "Direct Message")}
          </div>
          {(channel?.description || dmPartner) && (
            <div style={{
              color: colors.muted, fontSize: 11,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {channel ? channel.description : `${dmPartner?.staffId || ""}${dmPartner?.department?.name ? ` · ${dmPartner.department.name}` : ""}`}
            </div>
          )}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: isMobile ? 4 : 6, alignItems: "center", flexShrink: 0 }}>
          {channel && (
            <IconBtn icon="📌" label="Pinned Messages" action={onTogglePinned} active={showPinned} />
          )}
          {channel && (
            <IconBtn icon="👥" label="Members" action={onToggleMembers} active={showMembers} />
          )}

          {/* Desktop admin quick buttons */}
          {!isMobile && isAdmin && channel && (
            <>
              <IconBtn icon="🤖" label="AI Memo" action={onOpenAIMemo} />
              <IconBtn icon="🗳️" label="Create Poll" action={() => setComposeType("poll")} />
              <IconBtn icon="📄" label="Draft Memo" action={() => setComposeType("memo")} />
              <IconBtn icon="📢" label="Post Announcement" action={() => setComposeType("announcement")} />
            </>
          )}

          {/* Mobile admin dropdown */}
          {isMobile && isAdmin && channel && (
            <div style={{ position: "relative" }}>
              <IconBtn icon="•••" label="More Options" action={() => setShowActionMenu(s => !s)} active={showActionMenu} />
              {showActionMenu && (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 300 }} onClick={() => setShowActionMenu(false)} />
                  <div style={{
                    position: "absolute", top: "calc(100% + 6px)", right: 0,
                    background: colors.surfaceAlt, border: `1px solid ${colors.border}`,
                    borderRadius: 12, padding: 6, minWidth: 190, zIndex: 400,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
                  }}>
                    <button
                      onClick={() => { onOpenAIMemo?.(); setShowActionMenu(false); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, width: "100%",
                        padding: "9px 12px", borderRadius: 8, border: "none", background: "transparent",
                        cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textAlign: "left",
                        color: colors.textMid, fontSize: 13,
                      }}
                    >
                      <span>🤖</span> AI Memo Drafting
                    </button>
                    <button
                      onClick={() => { setComposeType("announcement"); setShowActionMenu(false); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, width: "100%",
                        padding: "9px 12px", borderRadius: 8, border: "none", background: "transparent",
                        cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textAlign: "left",
                        color: colors.textMid, fontSize: 13,
                      }}
                    >
                      <span>📢</span> Post Announcement
                    </button>
                    <button
                      onClick={() => { setComposeType("memo"); setShowActionMenu(false); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, width: "100%",
                        padding: "9px 12px", borderRadius: 8, border: "none", background: "transparent",
                        cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textAlign: "left",
                        color: colors.textMid, fontSize: 13,
                      }}
                    >
                      <span>📄</span> Draft Memo
                    </button>
                    <button
                      onClick={() => { setComposeType("poll"); setShowActionMenu(false); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, width: "100%",
                        padding: "9px 12px", borderRadius: 8, border: "none", background: "transparent",
                        cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textAlign: "left",
                        color: colors.textMid, fontSize: 13,
                      }}
                    >
                      <span>🗳️</span> Create Poll
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
        {hasMore && (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <button onClick={loadMore} style={{ background: "none", border: `1px solid ${colors.border}`,
              borderRadius: 8, padding: "5px 16px", color: colors.muted, cursor: "pointer", fontSize: 12 }}>
              Load earlier messages
            </button>
          </div>
        )}
        {loading && <div style={{ textAlign: "center", padding: 40, color: colors.muted, fontSize: 13 }}>Loading...</div>}
        {!loading && messages.length === 0 && (
          <div style={{ textAlign: "center", padding: 60, color: colors.ghost }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>💬</div>
            <div style={{ fontSize: 16, color: colors.muted, marginBottom: 6 }}>Start the conversation</div>
            <div style={{ fontSize: 13 }}>
              {isDM ? `Send a direct message to ${dmPartner?.name || "this staff member"}` : `Be the first to post in #${channel?.name}`}
            </div>
          </div>
        )}
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} currentUserId={user.id} isAdmin={!isDM && isAdmin}
            onVote={handleVote} onReact={handleReact} onPin={handlePin} onDelete={handleDelete}
            onOpenThread={!isDM ? onOpenThread : undefined} />
        ))}
        {typingUsers.length > 0 && (
          <div style={{ padding: "4px 16px", color: colors.muted, fontSize: 12, fontStyle: "italic" }}>
            {typingUsers.map(u => u.name).join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Compose */}
      <div style={{
        padding: isMobile ? "8px 10px" : "10px 14px 14px",
        borderTop: `1px solid ${colors.borderDim}`,
        background: colors.surface, flexShrink: 0,
      }}>
        {canPost ? (
          <>
            {/* Phase 2: File upload panel */}
            {!isDM && showFileUpload && (
              <FileUpload onFilesSelected={handleFilesSelected} onClose={() => setShowFileUpload(false)} />
            )}

            {/* Phase 2: Upload progress */}
            {uploading && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: colors.muted, marginBottom: 4 }}>
                  <span>Uploading files...</span><span>{uploadProgress}%</span>
                </div>
                <div style={{ height: 4, background: colors.border, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${uploadProgress}%`,
                    background: colors.gold, borderRadius: 2, transition: "width 0.2s" }} />
                </div>
              </div>
            )}

            {/* Input bar */}
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", background: colors.surfaceAlt,
              borderRadius: 10, border: `1px solid ${colors.border}`, padding: "0 10px" }}>
              {/* Phase 2: Attach button (channels) */}
              {!isDM && (
                <button onClick={() => setShowFileUpload(s => !s)} title="Attach images or files"
                  style={{ background: "none", border: "none", fontSize: 18, padding: "10px 4px",
                    color: showFileUpload ? colors.gold : colors.muted, cursor: "pointer", flexShrink: 0 }}>
                  📎
                </button>
              )}
              <textarea
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={isDM ? `Message ${dmPartner?.name || ""}...` : `Message #${channel?.name || ""}...`}
                rows={1}
                style={{ flex: 1, background: "none", border: "none", color: colors.text, fontSize: isMobile ? 16 : 14,
                  padding: "11px 0", resize: "none", outline: "none",
                  fontFamily: "'DM Sans',sans-serif", maxHeight: 120, overflowY: "auto" }}
              />
              {channel?.type === "SUGGESTION" && (
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11,
                  color: colors.muted, cursor: "pointer", flexShrink: 0, marginBottom: 10 }}>
                  <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} />
                  Anon
                </label>
              )}
              <button onClick={sendMessage} disabled={!input.trim() || uploading}
                style={{ padding: "7px 14px", borderRadius: 8, border: "none", marginBottom: 5,
                  background: input.trim() && !uploading ? colors.gold : colors.border,
                  color: input.trim() && !uploading ? "#0A1F44" : colors.ghost,
                  fontWeight: 700, cursor: input.trim() && !uploading ? "pointer" : "default",
                  fontSize: 16, flexShrink: 0 }}>
                ↑
              </button>
            </div>

            {/* Admin quick-compose (desktop only — mobile uses header menu) */}
            {!isMobile && !isDM && isAdmin && (
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                {[{ l: "📢 Announce", t: "announcement" }, { l: "📄 Memo", t: "memo" }, { l: "🗳️ Poll", t: "poll" }].map(b => (
                  <button key={b.t} onClick={() => setComposeType(b.t)}
                    style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${colors.border}`,
                      background: "transparent", color: colors.muted, cursor: "pointer",
                      fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>
                    {b.l}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: "center", color: colors.ghost, fontSize: 13, padding: "8px 0" }}>
            {channel?.isMember === false ? "Request access to post in this channel" : "Read-only channel"}
          </div>
        )}
      </div>

      {/* Compose modal */}
      {composeType && channel && (
        <ComposeModal type={composeType} channelId={channel.id}
          onClose={() => setComposeType(null)} onSent={() => setComposeType(null)} />
      )}
    </div>
  );
}

function IconBtn({ icon, label, action, active }) {
  return (
    <button onClick={action} title={label}
      style={{ padding: "6px 10px", borderRadius: 8,
        border: `1px solid ${active ? colors.gold : colors.border}`,
        background: active ? colors.goldDim : "transparent",
        color: active ? colors.gold : colors.muted, cursor: "pointer", fontSize: 15 }}
      onMouseEnter={e => { e.currentTarget.style.color = colors.gold; e.currentTarget.style.background = "var(--accent-subtle, rgba(212,168,67,0.08))"; }}
      onMouseLeave={e => { e.currentTarget.style.color = active ? colors.gold : colors.muted; e.currentTarget.style.background = active ? colors.goldDim : "transparent"; }}>
      {icon}
    </button>
  );
}
