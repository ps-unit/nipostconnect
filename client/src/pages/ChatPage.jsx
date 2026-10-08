// client/src/pages/ChatPage.jsx — Responsive version
import { useState, useEffect, useCallback } from "react";
import { useSocket } from "../contexts/SocketContext";
import { useAuth } from "../contexts/AuthContext";
import { channelsAPI } from "../services/api";
import { useResponsive } from "../hooks/useResponsive";

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
import ChannelDiscoveryPage from "./ChannelDiscoveryPage";
import StaffDirectoryPage from "./StaffDirectoryPage";

import AdminPanel from "../components/modals/AdminPanel";
import ScheduleMessageModal from "../components/modals/ScheduleMessageModal";
import BulkMemoModal from "../components/modals/BulkMemoModal";
import HRMISImportModal from "../components/modals/HRMISImportModal";
import AIMemoModal from "../components/modals/AIMemoModal";
import TwoFASetupModal from "../components/modals/TwoFASetupModal";
import OrgSettingsModal from "../components/modals/OrgSettingsModal";

import { colors } from "../components/shared/styles";

export default function ChatPage() {
  const { user } = useAuth();
  const { on, joinChannel } = useSocket();
  const { isMobile, isTablet } = useResponsive();

  const [channels, setChannels]                   = useState([]);
  const [activeChannelId, setActiveChannelId]     = useState(null);
  const [activeView, setActiveView]               = useState("channels");
  const [activeDMUserId, setActiveDMUserId]       = useState(null);
  const [showMembers, setShowMembers]             = useState(false);
  const [unreadMap, setUnreadMap]                 = useState({});

  // Mobile navigation pane state: "sidebar" or "chat"
  const [mobilePane, setMobilePane]               = useState("sidebar");

  // Thread + Pinned panels
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
        if (gen) {
          setActiveChannelId(gen.id);
          joinChannel(gen.id);
        }
      }
    }).catch(console.error);
  }, [activeChannelId, joinChannel]);

  useEffect(() => { loadChannels(); }, []);
  useEffect(() => on("channel:created", ch => setChannels(p => [...p, { ...ch, isMember: false }])), [on]);
  useEffect(() => on("message:new", msg => {
    if (msg.channelId !== activeChannelId && msg.author?.id !== user.id)
      setUnreadMap(m => ({ ...m, [msg.channelId]: (m[msg.channelId] || 0) + 1 }));
  }), [on, activeChannelId, user.id]);

  const selectChannel = (channelId) => {
    setActiveChannelId(channelId);
    joinChannel(channelId);
    setActiveView("channels");
    setMobilePane("chat");
    setUnreadMap(m => ({ ...m, [channelId]: 0 }));
    setThreadMessage(null);
    setShowPinned(false);
  };

  const activeChannel = channels.find(c => c.id === activeChannelId);

  // Close right panels when channel changes
  useEffect(() => { setThreadMessage(null); setShowPinned(false); }, [activeChannelId]);

  const openDM = (userId) => {
    setActiveDMUserId(userId);
    setActiveView("dms");
    setMobilePane("chat");
  };

  // Switch view from NavRail
  const handleNavChange = (v) => {
    setActiveView(v);
    setMobilePane("sidebar");
    setThreadMessage(null);
    setShowPinned(false);
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      height: "100dvh",
      fontFamily: "'DM Sans',sans-serif",
      background: colors.bg,
      color: colors.text,
      overflow: "hidden",
      position: "relative",
    }}>

      {/* Main Layout Area */}
      <div style={{
        display: "flex",
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
        paddingBottom: isMobile ? "calc(56px + var(--safe-bottom, 0px))" : 0,
      }}>
        {/* Desktop / Tablet NavRail on left */}
        {!isMobile && (
          <NavRail
            isMobile={false}
            activeView={activeView}
            setActiveView={handleNavChange}
            onAdminClick={() => setShowAdmin(true)}
            onAnalyticsClick={() => setShowAnalytics(true)}
            onReportsClick={() => setShowReports(true)}
            onScheduleClick={() => setShowSchedule(true)}
            onBulkMemoClick={() => setShowBulkMemo(true)}
            onHRMISClick={() => setShowHRMIS(true)}
            onAIMemoClick={() => setShowAIMemo(true)}
            on2FAClick={() => { setTwoFAMode("setup"); setShow2FA(true); }}
            onSettingsClick={() => setShowSettings(true)}
            onOrgSettingsClick={() => setShowOrgSettings(true)}
          />
        )}

        {/* Sidebars (Channel or DM) */}
        {(!isMobile || mobilePane === "sidebar") && (
          <>
            {activeView === "dms" ? (
              <DMSidebar
                isMobile={isMobile}
                activeDMUserId={activeDMUserId}
                onSelectDM={(id) => { setActiveDMUserId(id); setMobilePane("chat"); }}
              />
            ) : activeView === "channels" ? (
              <ChannelSidebar
                isMobile={isMobile}
                channels={channels}
                activeChannelId={activeChannelId}
                onSelectChannel={selectChannel}
                unreadMap={unreadMap}
                onChannelCreated={loadChannels}
                searchMode={false}
              />
            ) : null}
          </>
        )}

        {/* Pages: Search, Discover, Directory */}
        {activeView === "search" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100%" }}>
            <SearchPage onSelectChannel={id => { selectChannel(id); setActiveView("channels"); setMobilePane("chat"); }} />
          </div>
        )}

        {activeView === "discover" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100%" }}>
            <ChannelDiscoveryPage onSelectChannel={id => { selectChannel(id); setActiveView("channels"); setMobilePane("chat"); }} />
          </div>
        )}

        {activeView === "directory" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100%" }}>
            <StaffDirectoryPage onOpenDM={openDM} />
          </div>
        )}

        {/* Chat Main view */}
        {(activeView === "channels" || activeView === "dms") && (!isMobile || mobilePane === "chat") && (
          <ChatMain
            channel={activeView === "channels" ? activeChannel : null}
            dmUserId={activeView === "dms" ? activeDMUserId : null}
            onToggleMembers={() => setShowMembers(s => !s)}
            showMembers={showMembers}
            onOpenThread={setThreadMessage}
            onTogglePinned={() => setShowPinned(s => !s)}
            showPinned={showPinned}
            onOpenAIMemo={() => setShowAIMemo(true)}
            isMobile={isMobile}
            onBack={() => setMobilePane("sidebar")}
            activeView={activeView}
          />
        )}

        {/* Right panels — Thread, Pinned, Members */}
        {threadMessage && activeChannel && (
          <ThreadPanel
            parentMessage={threadMessage}
            channelId={activeChannelId}
            onClose={() => setThreadMessage(null)}
            isMobile={isMobile || isTablet}
          />
        )}

        {showPinned && activeChannel && !threadMessage && (
          <PinnedMessagesPanel
            channelId={activeChannelId}
            channelName={activeChannel?.name}
            onClose={() => setShowPinned(false)}
            onJumpTo={_msgId => setShowPinned(false)}
            isMobile={isMobile || isTablet}
          />
        )}

        {!threadMessage && !showPinned && showMembers && activeView === "channels" && activeChannel && (
          <MembersPanel
            channelId={activeChannelId}
            onClose={() => setShowMembers(false)}
            isMobile={isMobile || isTablet}
          />
        )}
      </div>

      {/* Mobile NavRail rendered at bottom */}
      {isMobile && (
        <NavRail
          isMobile={true}
          activeView={activeView}
          setActiveView={handleNavChange}
          onAdminClick={() => setShowAdmin(true)}
          onAnalyticsClick={() => setShowAnalytics(true)}
          onReportsClick={() => setShowReports(true)}
          onScheduleClick={() => setShowSchedule(true)}
          onBulkMemoClick={() => setShowBulkMemo(true)}
          onHRMISClick={() => setShowHRMIS(true)}
          onAIMemoClick={() => setShowAIMemo(true)}
          on2FAClick={() => { setTwoFAMode("setup"); setShow2FA(true); }}
          onSettingsClick={() => setShowSettings(true)}
          onOrgSettingsClick={() => setShowOrgSettings(true)}
        />
      )}

      {/* Modals */}
      {showAdmin      && <AdminPanel onClose={() => setShowAdmin(false)} onChannelCreated={loadChannels} />}
      {showAnalytics  && <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />}
      {showReports    && <ReportsPage onClose={() => setShowReports(false)} />}
      {showSchedule   && <ScheduleMessageModal onClose={() => setShowSchedule(false)} defaultChannelId={activeChannelId} />}
      {showBulkMemo   && <BulkMemoModal onClose={() => setShowBulkMemo(false)} />}
      {showHRMIS      && <HRMISImportModal onClose={() => setShowHRMIS(false)} />}
      {showAIMemo     && <AIMemoModal onClose={() => setShowAIMemo(false)} defaultChannelId={activeChannelId} />}
      {show2FA        && <TwoFASetupModal onClose={() => setShow2FA(false)} mode={twoFAMode} />}
      {showSettings   && <SettingsPage onClose={() => setShowSettings(false)} />}
      {showOrgSettings&& <OrgSettingsModal onClose={() => setShowOrgSettings(false)} />}
    </div>
  );
}
