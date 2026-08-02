
// client/src/components/shared/NotificationBell.jsx — Phase 2
import { useState, useEffect, useRef } from "react";
import { useSocket } from "../../contexts/SocketContext";
import { formatDistanceToNow } from "date-fns";
import api from "../../services/api";
import { colors } from "./styles";

const TYPE_ICONS = {
  NEW_MESSAGE:"💬", NEW_MENTION:"@", NEW_ANNOUNCEMENT:"📢", NEW_MEMO:"📄",
  NEW_POLL:"🗳️", JOIN_REQUEST:"🚪", JOIN_APPROVED:"✅", JOIN_REJECTED:"❌",
  EMERGENCY:"🚨", DIRECT_MESSAGE:"💬",
};

export default function NotificationBell({ onNavigate }) {
  const { on } = useSocket();
  const [open, setOpen]           = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread]       = useState(0);
  const panelRef = useRef();

  useEffect(() => {
    api.get("/notifications?limit=20").then(r=>{ setNotifications(r.data.notifications); setUnread(r.data.unreadCount); }).catch(()=>{});
  }, []);

  useEffect(() => {
    const r1 = on("notifications:unread", ({ count }) => setUnread(count));
    const r2 = on("notification:new",     notif  => { setNotifications(n=>[notif,...n].slice(0,30)); setUnread(c=>c+1); });
    return () => { r1?.(); r2?.(); };
  }, [on]);

  useEffect(() => {
    if (!open) return;
    const h = e => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const markAllRead = async () => {
    await api.patch("/notifications/read-all").catch(()=>{});
    setNotifications(n=>n.map(x=>({...x,isRead:true})));
    setUnread(0);
  };

  const handleClick = async notif => {
    if (!notif.isRead) {
      await api.patch(`/notifications/${notif.id}/read`).catch(()=>{});
      setNotifications(n=>n.map(x=>x.id===notif.id?{...x,isRead:true}:x));
      setUnread(c=>Math.max(0,c-1));
    }
    if (notif.url) onNavigate?.(notif.url);
    setOpen(false);
  };

  return (
    <div ref={panelRef} style={{ position:"relative" }}>
      <button onClick={()=>setOpen(o=>!o)} title="Notifications"
        style={{ width:44,height:44,borderRadius:12,border:"none",cursor:"pointer",fontSize:20,
          display:"flex",alignItems:"center",justifyContent:"center",position:"relative",
          background:open?"rgba(212,168,67,0.15)":"transparent" }}
        onMouseEnter={e=>{ if(!open) e.currentTarget.style.background="rgba(255,255,255,0.06)"; }}
        onMouseLeave={e=>{ if(!open) e.currentTarget.style.background="transparent"; }}>
        🔔
        {unread>0 && (
          <span style={{ position:"absolute",top:6,right:6,background:"#EF4444",color:"#fff",borderRadius:"50%",
            width:16,height:16,fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",
            border:"2px solid #050F20",lineHeight:1 }}>
            {unread>9?"9+":unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position:"absolute",left:8,top:"calc(100% + 8px)",width:340,background:colors.surfaceAlt,
          border:`1px solid ${colors.border}`,borderRadius:12,boxShadow:"0 8px 32px rgba(0,0,0,0.5)",
          zIndex:500,overflow:"hidden",maxHeight:"70vh",display:"flex",flexDirection:"column" }}>
          <div style={{ padding:"12px 14px",borderBottom:`1px solid ${colors.border}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <span style={{ color:colors.text,fontWeight:700,fontSize:14 }}>Notifications</span>
            {unread>0 && <button onClick={markAllRead} style={{ background:"none",border:"none",color:colors.gold,fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>Mark all read</button>}
          </div>
          <div style={{ overflowY:"auto",flex:1 }}>
            {notifications.length===0 && <div style={{ padding:24,textAlign:"center",color:colors.ghost,fontSize:13 }}>No notifications yet</div>}
            {notifications.map(n => (
              <div key={n.id} onClick={()=>handleClick(n)}
                style={{ display:"flex",gap:10,padding:"11px 14px",borderBottom:`1px solid ${colors.borderDim}`,cursor:"pointer",
                  background:n.isRead?"transparent":"rgba(212,168,67,0.05)",transition:"background 0.1s" }}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.04)"}
                onMouseLeave={e=>e.currentTarget.style.background=n.isRead?"transparent":"rgba(212,168,67,0.05)"}>
                <span style={{ fontSize:18,flexShrink:0 }}>{TYPE_ICONS[n.type]||"🔔"}</span>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ color:n.isRead?colors.textMid:colors.text,fontSize:13,fontWeight:n.isRead?400:600,marginBottom:2 }}>{n.title}</div>
                  <div style={{ color:colors.muted,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{n.body}</div>
                  <div style={{ color:colors.ghost,fontSize:11,marginTop:3 }}>{formatDistanceToNow(new Date(n.createdAt),{addSuffix:true})}</div>
                </div>
                {!n.isRead && <div style={{ width:7,height:7,borderRadius:"50%",background:colors.gold,flexShrink:0,marginTop:3 }} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function InstallPrompt({ onInstall, onDismiss }) {
  return (
    <div style={{ position:"fixed",bottom:20,left:"50%",transform:"translateX(-50%)",background:colors.surfaceAlt,
      border:`1px solid ${colors.gold}`,borderRadius:12,padding:"14px 18px",display:"flex",alignItems:"center",
      gap:14,boxShadow:"0 6px 24px rgba(0,0,0,0.5)",zIndex:9999,maxWidth:"min(460px,92vw)",width:"100%" }}>
      <span style={{ fontSize:30,flexShrink:0 }}>📮</span>
      <div style={{ flex:1 }}>
        <div style={{ color:colors.text,fontWeight:700,fontSize:14,marginBottom:2 }}>Install NiPOST Connect</div>
        <div style={{ color:colors.muted,fontSize:12 }}>Add to home screen — works offline too</div>
      </div>
      <div style={{ display:"flex",gap:8,flexShrink:0 }}>
        <button onClick={onDismiss} style={{ padding:"6px 12px",borderRadius:7,border:`1px solid ${colors.border}`,background:"none",color:colors.muted,cursor:"pointer",fontSize:12 }}>Later</button>
        <button onClick={onInstall} style={{ padding:"6px 14px",borderRadius:7,border:"none",background:colors.gold,color:"#0A1F44",fontWeight:700,cursor:"pointer",fontSize:12 }}>Install</button>
      </div>
    </div>
  );
}

export function NotificationPermission({ onEnable, onDismiss }) {
  return (
    <div style={{ position:"fixed",top:12,left:"50%",transform:"translateX(-50%)",background:colors.surfaceAlt,
      border:`1px solid ${colors.border}`,borderRadius:10,padding:"10px 16px",display:"flex",alignItems:"center",
      gap:12,boxShadow:"0 4px 16px rgba(0,0,0,0.4)",zIndex:9999,maxWidth:"min(480px,92vw)",width:"100%" }}>
      <span style={{ fontSize:22,flexShrink:0 }}>🔔</span>
      <div style={{ flex:1,fontSize:13 }}>
        <span style={{ color:colors.text,fontWeight:600 }}>Enable notifications</span>
        <span style={{ color:colors.muted }}> — stay updated on memos, announcements and messages</span>
      </div>
      <div style={{ display:"flex",gap:6,flexShrink:0 }}>
        <button onClick={onDismiss} style={{ padding:"5px 10px",borderRadius:6,border:"none",background:"none",color:colors.muted,cursor:"pointer",fontSize:12 }}>No thanks</button>
        <button onClick={onEnable}  style={{ padding:"5px 12px",borderRadius:6,border:"none",background:colors.gold,color:"#0A1F44",fontWeight:700,cursor:"pointer",fontSize:12 }}>Enable</button>
      </div>
    </div>
  );
}

export function OfflineBanner() {
  return (
    <div style={{ position:"fixed",top:0,left:0,right:0,zIndex:9998,background:"#EF4444",color:"#fff",
      textAlign:"center",padding:"7px 16px",fontSize:13,fontWeight:600 }}>
      📴 You are offline — messages will sync when you reconnect
    </div>
  );
}

export function UpdateBanner({ onUpdate }) {
  return (
    <div style={{ position:"fixed",top:0,left:0,right:0,zIndex:9998,background:"#2563EB",color:"#fff",
      display:"flex",alignItems:"center",justifyContent:"center",padding:"7px 16px",fontSize:13,gap:12 }}>
      🆕 A new version of NiPOST Connect is available
      <button onClick={onUpdate} style={{ background:"#fff",color:"#2563EB",border:"none",borderRadius:5,padding:"3px 12px",fontWeight:700,cursor:"pointer",fontSize:12 }}>Update now</button>
    </div>
  );
}
