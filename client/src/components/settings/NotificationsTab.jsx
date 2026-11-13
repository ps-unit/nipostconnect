
// client/src/components/settings/NotificationsTab.jsx — Phase 5
import { useState, useEffect } from "react";
import api from "../../services/api";
import { useNotifications } from "../../hooks/useNotifications";
import { colors as C } from "../shared/styles";

function Toggle({ checked, onChange, disabled }) {
  return (
    <div onClick={!disabled ? onChange : undefined}
      style={{ width:44, height:24, borderRadius:12, position:"relative", flexShrink:0,
        background: checked ? C.gold : C.border,
        cursor: disabled ? "not-allowed" : "pointer", transition:"background 0.2s",
        opacity: disabled ? 0.5 : 1 }}>
      <div style={{ position:"absolute", top:3, left: checked ? 23 : 3,
        width:18, height:18, borderRadius:"50%", background:"#fff",
        transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.3)" }} />
    </div>
  );
}

function SettingRow({ label, desc, checked, onChange, disabled }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
      padding:"14px 0", borderBottom:`1px solid ${C.border}` }}>
      <div style={{ flex:1, paddingRight:16 }}>
        <div style={{ color:C.text, fontSize:14, fontWeight:500, marginBottom:3 }}>{label}</div>
        {desc && <div style={{ color:C.muted, fontSize:12 }}>{desc}</div>}
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

export default function NotificationsTab() {
  const { permission, isSubscribed, notificationsSupported, subscribe, unsubscribe } = useNotifications();
  const [settings, setSettings] = useState({
    pushEnabled: true, emailNotifications: false,
    mentionOnly: false, messageGrouping: true,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState({ type:"", text:"" });

  const showMsg = (type, text) => { setMsg({type,text}); setTimeout(()=>setMsg({type:"",text:""}),4000); };

  useEffect(() => {
    api.get("/profile/settings").then(r => setSettings(s => ({ ...s, ...r.data.settings }))).catch(()=>{});
  }, []);

  const update = (key, value) => setSettings(s => ({ ...s, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch("/profile/settings", settings);
      showMsg("success", "Notification preferences saved");
    } catch(e) { showMsg("error", "Failed to save"); }
    finally { setSaving(false); }
  };

  const handlePushToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
      update("pushEnabled", false);
    } else {
      const result = await subscribe();
      update("pushEnabled", result?.success || false);
      if (!result?.success) showMsg("error", "Could not enable push notifications. Please check browser permissions.");
    }
  };

  return (
    <div style={{ maxWidth:560 }}>
      <h3 style={{ color:C.text, fontSize:17, fontWeight:700, margin:"0 0 20px" }}>Notification Preferences</h3>

      {msg.text && (
        <div style={{ background:msg.type==="success"?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)",
          border:`1px solid ${msg.type==="success"?"rgba(34,197,94,0.25)":"rgba(239,68,68,0.25)"}`,
          borderRadius:8, padding:"9px 14px", fontSize:13, marginBottom:16,
          color:msg.type==="success"?"#86EFAC":"#F87171" }}>
          {msg.type==="success" ? "✅" : "⚠️"} {msg.text}
        </div>
      )}

      {/* Push Notifications */}
      <div style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:12, padding:20, marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.muted, letterSpacing:"0.06em", marginBottom:4 }}>PUSH NOTIFICATIONS</div>
        {!notificationsSupported && (
          <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)",
            borderRadius:8, padding:"9px 12px", fontSize:12, color:"#F87171", marginBottom:12 }}>
            ⚠️ Push notifications are not supported in this browser.
          </div>
        )}
        {permission === "denied" && (
          <div style={{ background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.2)",
            borderRadius:8, padding:"9px 12px", fontSize:12, color:"#FCD34D", marginBottom:12 }}>
            🔕 Push notifications are blocked. Enable them in your browser settings.
          </div>
        )}

        <SettingRow label="Enable Push Notifications"
          desc={isSubscribed ? "You will receive alerts even when the app is closed" : "Receive alerts when messages arrive"}
          checked={isSubscribed} onChange={handlePushToggle}
          disabled={!notificationsSupported || permission === "denied"} />
        <SettingRow label="Mentions Only"
          desc="Only notify when you are mentioned or messaged directly"
          checked={settings.mentionOnly}
          onChange={()=>update("mentionOnly", !settings.mentionOnly)}
          disabled={!isSubscribed} />
      </div>

      {/* In-App Notifications */}
      <div style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:12, padding:20, marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.muted, letterSpacing:"0.06em", marginBottom:4 }}>IN-APP BEHAVIOUR</div>
        <SettingRow label="Group Consecutive Messages"
          desc="Group messages from the same person sent within 5 minutes"
          checked={settings.messageGrouping}
          onChange={()=>update("messageGrouping", !settings.messageGrouping)} />
      </div>

      {/* Privacy */}
      <div style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:12, padding:20, marginBottom:20 }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.muted, letterSpacing:"0.06em", marginBottom:4 }}>PRIVACY</div>
        <SettingRow label="Show Last Seen"
          desc="Other staff can see when you were last active"
          checked={settings.showLastSeen}
          onChange={()=>update("showLastSeen", !settings.showLastSeen)} />
        <SettingRow label="Show Online Status"
          desc="Your status dot is visible to other staff"
          checked={settings.showOnlineStatus}
          onChange={()=>update("showOnlineStatus", !settings.showOnlineStatus)} />
      </div>

      <button onClick={handleSave} disabled={saving}
        style={{ padding:"10px 24px", borderRadius:8, border:"none",
          background:saving?C.border:C.gold, color:saving?C.ghost:"#0A1F44",
          fontWeight:700, cursor:saving?"default":"pointer",
          fontFamily:"'DM Sans',sans-serif", fontSize:14, opacity:saving?0.7:1 }}>
        {saving ? "Saving..." : "Save Preferences"}
      </button>
    </div>
  );
}
