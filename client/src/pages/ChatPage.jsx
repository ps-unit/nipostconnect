
// client/src/pages/ChatPage.jsx — v6+7
// Adds: ChannelDiscovery, StaffDirectory, ThreadPanel, PinnedMessages
import { useState, useEffect, useCallback } from "react";
import { useSocket } from "../contexts/SocketContext";
import { useAuth } from "../contexts/AuthContext";
import { channelsAPI } from "../services/api";

import NavRail from "../components/layout/NavRail";
import ChannelSidebar from "../components/layout/ChannelSidebar";
import ChatMain from "../components/layout/ChatMain";
import MembersPanel from "../components/layout/MembersPanel";
import DMSidebar from "../components/layout/DMSidebar";
import ThreadPanel from "../components/chat/ThreadPanel";
import PinnedMessagesPanel from "../components/chat/PinnedMessagesPanel";

import SearchPage from "./SearchPage";
import AnalyticsDashboard from "./AnalyticsDashboard";
import ReportsPage from "./ReportsPage";
import SettingsPage from "./SettingsPage";
import ChannelDiscoveryPage from "./ChannelDiscoveryPage";   // Phase 7
import StaffDirectoryPage from "./StaffDirectoryPage";       // Phase 7

import AdminPanel from "../components/modals/AdminPanel";
import ScheduleMessageModal from "../components/modals/ScheduleMessageModal";
import BulkMemoModal from "../components/modals/BulkMemoModal";
import HRMISImportModal from "../components/modals/HRMISImportModal";
import AIMemoModal from "../components/modals/AIMemoModal";
import TwoFASetupModal from "../components/modals/TwoFASetupModal";
import OrgSettingsModal from "../components/modals/OrgSettingsModal";

import { colors } from "../components/shared/styles";

export default function ChatPage() {
  const { user }   = useAuth();
  const { on, joinChannel } = useSocket();

  const [channels, setChannels]                   = useState([]);
  const [activeChannelId, setActiveChannelId]     = useState(null);
  const [activeView, setActiveView]               = useState("channels");
  const [activeDMUserId, setActiveDMUserId]       = useState(null);
  const [showMembers, setShowMembers]             = useState(true);
  const [unreadMap, setUnreadMap]                 = useState({});

  // Phase 7: thread + pinned panels
  const [threadMessage, setThreadMessage]         = useState(null);
  const [showPinned, setShowPinned]               = useState(false);

  // Modals
  const [showAdmin,       setShowAdmin]       = useState(false);
  const [showAnalytics,   setShowAnalytics]   = useState(false);
  const [showReports,     setShowReports]     = useState(false);
  const [showSchedule,    setShowSchedule]    = useState(false);
  const [showBulkMemo,    setShowBulkMemo]    = useState(false);
  const [showHRMIS,       setShowHRMIS]       = useState(false);
  const [showAIMemo,      setShowAIMemo]      = useState(false);
  const [show2FA,         setShow2FA]         = useState(false);
  const [twoFAMode,       setTwoFAMode]       = useState("setup");
  const [showSettings,    setShowSettings]    = useState(false);
  const [showOrgSettings, setShowOrgSettings] = useState(false);

  const loadChannels = useCallback(() => {
    channelsAPI.listAll().then(r => {
      setChannels(r.data.channels);
      if (!activeChannelId) {
        const gen = r.data.channels.find(c => c.slug === "general-announcements");
        if (gen) { setActiveChannelId(gen.id); joinChannel(gen.id); }
      }
    }).catch(console.error);
  }, [activeChannelId, joinChannel]);

  useEffect(() => { loadChannels(); }, []);
  useEffect(() => on("channel:created", ch => setChannels(p => [...p, {...ch, isMember:false}])), [on]);
  useEffect(() => on("message:new", msg => {
    if (msg.channelId !== activeChannelId && msg.author?.id !== user.id)
      setUnreadMap(m => ({ ...m, [msg.channelId]: (m[msg.channelId]||0)+1 }));
  }), [on, activeChannelId, user.id]);

  const selectChannel = (channelId) => {
    setActiveChannelId(channelId);
    joinChannel(channelId);
    setActiveView("channels");
    setUnreadMap(m => ({ ...m, [channelId]: 0 }));
    setThreadMessage(null);
    setShowPinned(false);
  };

  const activeChannel = channels.find(c => c.id === activeChannelId);

  // Close right panels when channel changes
  useEffect(() => { setThreadMessage(null); setShowPinned(false); }, [activeChannelId]);

  const openDM = (userId) => { setActiveDMUserId(userId); setActiveView("dms"); };

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"'DM Sans',sans-serif",
      background:colors.bg, color:colors.text, overflow:"hidden" }}>

      <NavRail
        activeView={activeView}
        setActiveView={v => { setActiveView(v); setThreadMessage(null); setShowPinned(false); }}
        onAdminClick={()=>setShowAdmin(true)}
        onAnalyticsClick={()=>setShowAnalytics(true)}
        onReportsClick={()=>setShowReports(true)}
        onScheduleClick={()=>setShowSchedule(true)}
        onBulkMemoClick={()=>setShowBulkMemo(true)}
        onHRMISClick={()=>setShowHRMIS(true)}
        onAIMemoClick={()=>setShowAIMemo(true)}
        on2FAClick={()=>{ setTwoFAMode("setup"); setShow2FA(true); }}
        onSettingsClick={()=>setShowSettings(true)}
        onOrgSettingsClick={()=>setShowOrgSettings(true)}
      />

      {/* Left sidebar */}
      {activeView === "dms" ? (
        <DMSidebar activeDMUserId={activeDMUserId} onSelectDM={setActiveDMUserId} />
      ) : (
        <ChannelSidebar
          channels={channels}
          activeChannelId={activeChannelId}
          onSelectChannel={selectChannel}
          unreadMap={unreadMap}
          onChannelCreated={loadChannels}
          searchMode={activeView === "search"}
        />
      )}

      {/* Main content area */}
      {activeView === "search"    && <SearchPage onSelectChannel={id=>{selectChannel(id);setActiveView("channels");}} />}
      {activeView === "discover"  && <ChannelDiscoveryPage onSelectChannel={id=>{selectChannel(id);setActiveView("channels");}} />}
      {activeView === "directory" && <StaffDirectoryPage onOpenDM={openDM} />}
      {(activeView === "channels" || activeView === "dms") && (
        <ChatMain
          channel={activeChannel}
          dmUserId={activeView === "dms" ? activeDMUserId : null}
          onToggleMembers={() => setShowMembers(s=>!s)}
          showMembers={showMembers}
          onOpenThread={setThreadMessage}
          onTogglePinned={() => setShowPinned(s=>!s)}
          showPinned={showPinned}
          onOpenAIMemo={() => setShowAIMemo(true)}
        />
      )}

      {/* Right panels — thread takes priority over members */}
      {threadMessage && activeChannel && (
        <ThreadPanel
          parentMessage={threadMessage}
          channelId={activeChannelId}
          onClose={() => setThreadMessage(null)}
        />
      )}
      {showPinned && activeChannel && !threadMessage && (
        <PinnedMessagesPanel
          channelId={activeChannelId}
          channelName={activeChannel?.name}
          onClose={() => setShowPinned(false)}
          onJumpTo={msgId => { setShowPinned(false); }}
        />
      )}
      {!threadMessage && !showPinned && showMembers && activeView === "channels" && activeChannel && (
        <MembersPanel channelId={activeChannelId} />
      )}

      {/* Modals */}
      {showAdmin      && <AdminPanel onClose={()=>setShowAdmin(false)} onChannelCreated={loadChannels} />}
      {showAnalytics  && <AnalyticsDashboard onClose={()=>setShowAnalytics(false)} />}
      {showReports    && <ReportsPage onClose={()=>setShowReports(false)} />}
      {showSchedule   && <ScheduleMessageModal onClose={()=>setShowSchedule(false)} defaultChannelId={activeChannelId} />}
      {showBulkMemo   && <BulkMemoModal onClose={()=>setShowBulkMemo(false)} />}
      {showHRMIS      && <HRMISImportModal onClose={()=>setShowHRMIS(false)} />}
      {showAIMemo     && <AIMemoModal onClose={()=>setShowAIMemo(false)} defaultChannelId={activeChannelId} />}
      {show2FA        && <TwoFASetupModal onClose={()=>setShow2FA(false)} mode={twoFAMode} />}
      {showSettings   && <SettingsPage onClose={()=>setShowSettings(false)} />}
      {showOrgSettings&& <OrgSettingsModal onClose={()=>setShowOrgSettings(false)} />}
    </div>
  );
}
