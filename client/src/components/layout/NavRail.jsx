
// client/src/components/layout/NavRail.jsx — v6+7
import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";
import NotificationBell from "../shared/NotificationBell";
import { colors } from "../shared/styles";

const NAV = [
  { id:"channels",  icon:"🏠", label:"Channels"          },
  { id:"dms",       icon:"💬", label:"Direct Messages"   },
  { id:"discover",  icon:"🔍", label:"Discover Channels" },
  { id:"directory", icon:"👥", label:"Staff Directory"   },
];

function getInitials(name="") { return name.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase(); }

export default function NavRail({
  activeView, setActiveView,
  onAdminClick, onAnalyticsClick, onReportsClick,
  onScheduleClick, onBulkMemoClick, onHRMISClick,
  onAIMemoClick, on2FAClick, onSettingsClick, onOrgSettingsClick,
}) {
  const { user, logout, isAdmin, isSuperAdmin } = useAuth();
  const { connected } = useSocket();
  const [showMenu, setShowMenu] = useState(false);

  const handleNavigation = (url) => {
    if (url.startsWith("/channel/")) setActiveView("channels");
    else if (url.startsWith("/dm/")) setActiveView("dms");
    setShowMenu(false);
  };

  const adminItems = [
    { icon:"🛡️", label:"Admin Panel",           action:onAdminClick      },
    { icon:"📊", label:"Analytics",              action:onAnalyticsClick  },
    { icon:"📈", label:"Performance Reports",    action:onReportsClick    },
    { icon:"⏰", label:"Schedule Message",       action:onScheduleClick   },
    { icon:"📬", label:"Bulk Memo",              action:onBulkMemoClick   },
    { icon:"🤖", label:"AI Memo Drafting",       action:onAIMemoClick     },
    ...(isSuperAdmin ? [
      { icon:"🏢", label:"Organisation Settings", action:onOrgSettingsClick },
      { icon:"📥", label:"Import Staff (HRMIS)",  action:onHRMISClick      },
    ] : []),
  ];

  return (
    <div style={{ width:64, background:"#050F20", display:"flex", flexDirection:"column",
      alignItems:"center", padding:"12px 0", gap:4,
      borderRight:`1px solid ${colors.borderDim}`, flexShrink:0, position:"relative", zIndex:100 }}>

      <div style={{ width:44, height:44, borderRadius:14, background:colors.gold,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:22, marginBottom:8 }} title="NiPOST Connect">
        📮
      </div>
      <div style={{ width:32, height:1, background:colors.border, margin:"4px 0" }} />

      {NAV.map(n => (
        <NavBtn key={n.id} icon={n.icon} label={n.label}
          active={activeView===n.id}
          onClick={()=>{ setActiveView(n.id); setShowMenu(false); }} />
      ))}

      <div style={{ flex:1 }} />

      <NotificationBell onNavigate={handleNavigation} />
      <NavBtn icon="⚙️" label="Settings" active={false}
        onClick={()=>{ onSettingsClick?.(); setShowMenu(false); }} />

      {isAdmin && (
        <div style={{ position:"relative" }}>
          <NavBtn icon="🛡️" label="Admin Tools" active={showMenu} onClick={()=>setShowMenu(s=>!s)} />
          {showMenu && (
            <>
              <div style={{ position:"fixed", inset:0, zIndex:400 }} onClick={()=>setShowMenu(false)} />
              <div style={{ position:"absolute", left:"calc(100% + 10px)", bottom:0,
                background:"#0D2244", border:`1px solid ${colors.border}`,
                borderRadius:12, padding:6, minWidth:230, zIndex:500,
                boxShadow:"0 8px 32px rgba(0,0,0,0.6)" }}>
                <div style={{ padding:"6px 12px 8px", borderBottom:`1px solid ${colors.border}`, marginBottom:4 }}>
                  <div style={{ color:colors.gold, fontSize:11, fontWeight:700, letterSpacing:"0.06em" }}>ADMIN TOOLS</div>
                </div>
                {adminItems.map(item => (
                  <button key={item.label} onClick={()=>{ item.action?.(); setShowMenu(false); }}
                    style={{ display:"flex", alignItems:"center", gap:10, width:"100%",
                      padding:"9px 12px", borderRadius:7, border:"none", background:"transparent",
                      cursor:"pointer", fontFamily:"'DM Sans',sans-serif", textAlign:"left",
                      color:colors.textMid, fontSize:13 }}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.07)"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <span style={{ fontSize:16, width:22, textAlign:"center" }}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div title={connected?"Connected":"Reconnecting..."} style={{
        width:8, height:8, borderRadius:"50%",
        background:connected?colors.online:colors.idle, margin:"4px 0" }} />

      <div onClick={()=>{ if(window.confirm("Sign out?")) logout(); }}
        title={`${user?.name} — click to sign out`}
        style={{ width:36, height:36, borderRadius:"50%", background:"#0D2244",
          border:`1px solid ${colors.border}`, display:"flex", alignItems:"center",
          justifyContent:"center", cursor:"pointer", fontSize:13,
          fontWeight:700, color:colors.gold, marginTop:4 }}>
        {getInitials(user?.name)}
      </div>
    </div>
  );
}

function NavBtn({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} title={label} style={{
      width:44, height:44, borderRadius:12, border:"none", cursor:"pointer",
      fontSize:20, display:"flex", alignItems:"center", justifyContent:"center",
      background:active?"rgba(212,168,67,0.15)":"transparent",
      outline:active?`2px solid ${colors.gold}`:"none", transition:"background 0.15s",
    }}
    onMouseEnter={e=>{ if(!active) e.currentTarget.style.background="rgba(255,255,255,0.07)"; }}
    onMouseLeave={e=>{ if(!active) e.currentTarget.style.background="transparent"; }}>
      {icon}
    </button>
  );
}
