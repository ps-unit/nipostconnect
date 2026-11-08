// client/src/pages/SettingsPage.jsx — Phase 5 (Responsive)
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useResponsive } from "../hooks/useResponsive";
import ProfileTab from "../components/settings/ProfileTab";
import SecurityTab from "../components/settings/SecurityTab";
import NotificationsTab from "../components/settings/NotificationsTab";
import TwoFASetupModal from "../components/modals/TwoFASetupModal";

const C = {
  bg:"#081832", surface:"#081A35", surfaceAlt:"#0D2244", border:"#1E3A5F",
  gold:"var(--accent-color, #D4A843)", text:"#E8EDF5", muted:"#6B8299", textMid:"#B0BDD0", ghost:"#2E4A6B",
};

const TABS = [
  { id:"profile",       icon:"👤", label:"Profile"       },
  { id:"security",      icon:"🔐", label:"Security"      },
  { id:"notifications", icon:"🔔", label:"Notifications" },
];

export default function SettingsPage({ onClose }) {
  const { user } = useAuth();
  const { isMobile } = useResponsive();
  const [tab, setTab]       = useState("profile");
  const [show2FA, setShow2FA] = useState(false);
  const [twoFAMode, setTwoFAMode] = useState("setup");

  const open2FA = (mode) => { setTwoFAMode(mode); setShow2FA(true); };

  return (
    <div style={{ position:"fixed", inset:0, background:C.bg, zIndex:2000,
      display:"flex", flexDirection:"column", fontFamily:"'DM Sans',sans-serif" }}>

      {/* Header */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`,
        padding:isMobile ? "0 14px" : "0 24px", display:"flex", alignItems:"center", gap:12, height:56, flexShrink:0 }}>
        <span style={{ fontSize:20 }}>⚙️</span>
        <div style={{ minWidth:0, flex:1 }}>
          <div style={{ color:C.text, fontWeight:700, fontSize:16 }}>Settings</div>
          <div style={{ color:C.muted, fontSize:11, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {user?.name} · {user?.email}
          </div>
        </div>
        <button onClick={onClose}
          style={{ marginLeft:"auto", padding:"6px 14px", borderRadius:7,
            border:`1px solid ${C.border}`, background:"transparent",
            color:C.muted, cursor:"pointer", fontSize:12, fontFamily:"'DM Sans',sans-serif", flexShrink:0 }}>
          ✕ Close
        </button>
      </div>

      {/* Mobile horizontal tab bar */}
      {isMobile && (
        <div style={{ display:"flex", background:C.surface, borderBottom:`1px solid ${C.border}`, overflowX:"auto", flexShrink:0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                padding:"11px 12px", border:"none", background:"none", cursor:"pointer",
                borderBottom:tab===t.id?`2px solid ${C.gold}`:"2px solid transparent",
                color:tab===t.id?C.gold:C.muted, fontSize:13, fontWeight:tab===t.id?700:500,
                whiteSpace:"nowrap", fontFamily:"'DM Sans',sans-serif" }}>
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      )}

      <div style={{ display:"flex", flex:1, overflow:"hidden", flexDirection:isMobile?"column":"row" }}>

        {/* Desktop Sidebar */}
        {!isMobile && (
          <div style={{ width:220, background:C.surface, borderRight:`1px solid ${C.border}`,
            padding:"16px 8px", flexShrink:0, overflowY:"auto" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{ width:"100%", display:"flex", alignItems:"center", gap:12,
                  padding:"10px 14px", borderRadius:9, border:"none",
                  background:tab===t.id?"rgba(212,168,67,0.1)":"transparent",
                  cursor:"pointer", textAlign:"left", marginBottom:4,
                  fontFamily:"'DM Sans',sans-serif" }}>
                <span style={{ fontSize:18 }}>{t.icon}</span>
                <span style={{ color:tab===t.id?C.gold:C.textMid, fontSize:14,
                  fontWeight:tab===t.id?600:400 }}>{t.label}</span>
              </button>
            ))}

            <div style={{ height:1, background:C.border, margin:"12px 6px" }} />

            {/* Quick info */}
            <div style={{ padding:"10px 14px" }}>
              <div style={{ color:C.ghost, fontSize:11, fontWeight:700, letterSpacing:"0.07em", marginBottom:8 }}>ACCOUNT INFO</div>
              {[
                { label:"Role",       value:user?.role?.replace("_"," ") },
                { label:"Staff ID",   value:user?.staffId },
                { label:"State",      value:user?.state?.name || "—" },
                { label:"Department", value:user?.department?.name || "—" },
              ].map(f => (
                <div key={f.label} style={{ marginBottom:8 }}>
                  <div style={{ color:C.ghost, fontSize:10 }}>{f.label}</div>
                  <div style={{ color:C.muted, fontSize:12 }}>{f.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div style={{ flex:1, overflowY:"auto", padding:isMobile ? "16px 14px calc(28px + var(--safe-bottom, 0px))" : 28 }}>
          {tab === "profile"       && <ProfileTab />}
          {tab === "security"      && <SecurityTab onOpen2FA={open2FA} />}
          {tab === "notifications" && <NotificationsTab />}
        </div>
      </div>

      {show2FA && (
        <TwoFASetupModal mode={twoFAMode} onClose={()=>setShow2FA(false)}
          onEnabled={(v)=>console.log("2FA toggled:", v)} />
      )}
    </div>
  );
}
