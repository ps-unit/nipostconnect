// client/src/components/layout/NavRail.jsx — Responsive version (+ avatarUrl + Search + Org Logo)
import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";
import NotificationBell from "../shared/NotificationBell";
import api from "../../services/api";
import { colors, resolveUploadUrl, getTheme, toggleTheme } from "../shared/styles";

const NAV = [
  { id: "channels",  icon: "🏠", label: "Channels"          },
  { id: "dms",       icon: "💬", label: "DMs"               },
  { id: "discover",  icon: "🧭", label: "Discover"          },
  { id: "directory", icon: "👥", label: "Directory"         },
  { id: "search",    icon: "🔍", label: "Search"            },
];

function getInitials(name = "") {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function UserAvatarCircle({ user, size = 36, highlight = false }) {
  const [imgErr, setImgErr] = useState(false);
  const avatarSrc = resolveUploadUrl(user?.avatarUrl);
  if (avatarSrc && !imgErr) {
    return (
      <img
        src={avatarSrc}
        alt={user?.name || "User"}
        onError={() => setImgErr(true)}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          border: `1.5px solid ${highlight ? colors.gold : colors.border}`,
          display: "block",
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: "#0D2244",
      border: `1px solid ${highlight ? colors.gold : colors.border}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: Math.max(10, Math.round(size * 0.36)),
      fontWeight: 700,
      color: colors.gold,
      flexShrink: 0,
    }}>
      {getInitials(user?.name)}
    </div>
  );
}

export default function NavRail({
  isMobile,
  orgSettings,
  activeView, setActiveView,
  onAdminClick, onAnalyticsClick, onReportsClick,
  onScheduleClick, onBulkMemoClick, onHRMISClick,
  onAIMemoClick, on2FAClick, onSettingsClick, onOrgSettingsClick,
}) {
  const { user, logout, isAdmin, isSuperAdmin } = useAuth();
  const { connected } = useSocket();
  const [showMenu, setShowMenu] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [logoErr, setLogoErr] = useState(false);
  const [theme, setTheme] = useState(() => getTheme());

  const orgLogoSrc = resolveUploadUrl(orgSettings?.logoUrl);
  const orgName = orgSettings?.name || "NiPOST Connect";

  useEffect(() => {
    setLogoErr(false);
  }, [orgLogoSrc]);

  useEffect(() => {
    const onThemeChange = (e) => setTheme(e.detail?.theme || getTheme());
    window.addEventListener("theme:changed", onThemeChange);
    return () => window.removeEventListener("theme:changed", onThemeChange);
  }, []);

  const handleToggleTheme = () => {
    const next = toggleTheme();
    setTheme(next);
    api.patch("/profile/settings", { theme: next }).catch(() => {});
  };

  const handleNavigation = (url) => {
    if (url.startsWith("/channel/")) setActiveView("channels");
    else if (url.startsWith("/dm/")) setActiveView("dms");
    setShowMenu(false);
    setShowAdminMenu(false);
  };

  const adminItems = [
    { icon: "🛡️", label: "Admin Panel",            action: onAdminClick       },
    { icon: "📊", label: "Analytics",               action: onAnalyticsClick   },
    { icon: "📈", label: "Performance Reports",     action: onReportsClick     },
    { icon: "⏰", label: "Schedule Message",        action: onScheduleClick    },
    { icon: "📬", label: "Bulk Memo",               action: onBulkMemoClick    },
    { icon: "🤖", label: "AI Memo Drafting",        action: onAIMemoClick      },
    ...(isSuperAdmin ? [
      { icon: "🏢", label: "Organisation Settings",  action: onOrgSettingsClick },
      { icon: "📥", label: "Import Staff (HRMIS)",   action: onHRMISClick       },
    ] : []),
  ];

  // ── Mobile Bottom Navigation Bar ──────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        <div style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: "calc(56px + var(--safe-bottom, 0px))",
          background: "#050F20",
          borderTop: `1px solid ${colors.borderDim}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          paddingBottom: "var(--safe-bottom, 0px)",
          zIndex: 300,
          boxShadow: "0 -4px 16px rgba(0,0,0,0.4)",
        }}>
          {NAV.map(n => {
            const active = activeView === n.id;
            return (
              <button
                key={n.id}
                onClick={() => { setActiveView(n.id); setShowMenu(false); }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "6px 8px",
                  borderRadius: 8,
                  color: active ? colors.gold : colors.muted,
                  transition: "all 0.15s",
                  minWidth: 48,
                }}
              >
                <span style={{ fontSize: 19, lineHeight: 1 }}>{n.icon}</span>
                <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{n.label}</span>
              </button>
            );
          })}

          {/* More / User Menu Button */}
          <button
            onClick={() => setShowMenu(s => !s)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "6px 8px",
              borderRadius: 8,
              color: showMenu ? colors.gold : colors.muted,
              minWidth: 48,
            }}
          >
            <UserAvatarCircle user={user} size={22} highlight={showMenu} />
            <span style={{ fontSize: 10, fontWeight: showMenu ? 700 : 500 }}>More</span>
          </button>
        </div>

        {/* Mobile Slide-up Menu */}
        {showMenu && (
          <>
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.65)",
                backdropFilter: "blur(4px)",
                zIndex: 400,
              }}
              onClick={() => setShowMenu(false)}
            />
            <div
              className="animate-slide-up"
              style={{
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                background: colors.surface,
                borderTop: `1px solid ${colors.border}`,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: "18px 20px calc(24px + var(--safe-bottom, 0px))",
                zIndex: 500,
                maxHeight: "82vh",
                overflowY: "auto",
                boxShadow: "0 -8px 32px rgba(0,0,0,0.45)",
              }}
            >
              {/* Handlebar */}
              <div style={{ width: 40, height: 4, borderRadius: 2, background: colors.border, margin: "0 auto 16px" }} />

              {/* User profile summary */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 16, borderBottom: `1px solid ${colors.borderDim}` }}>
                <div onClick={() => { onSettingsClick?.(); setShowMenu(false); }} style={{ cursor: "pointer" }}>
                  <UserAvatarCircle user={user} size={46} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: colors.text, fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {user?.name}
                  </div>
                  <div style={{ color: colors.muted, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: connected ? colors.online : colors.idle,
                    }} />
                    {connected ? "Connected" : "Reconnecting..."} · {user?.role?.replace("_", " ")}
                  </div>
                </div>
                <NotificationBell onNavigate={handleNavigation} isMobile={true} />
              </div>

              {/* Action list */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 14 }}>
                <button
                  onClick={handleToggleTheme}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px",
                    borderRadius: 10, background: colors.surfaceAlt, border: `1px solid ${colors.borderDim}`,
                    color: colors.text, fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 18 }}>{theme === "light" ? "☀️" : "🌙"}</span>
                    <span>Appearance: {theme === "light" ? "Day Mode" : "Night Mode"}</span>
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: colors.gold, padding: "3px 8px", borderRadius: 6, background: colors.goldDim }}>
                    Switch to {theme === "light" ? "Night 🌙" : "Day ☀️"}
                  </span>
                </button>

                <button
                  onClick={() => { onSettingsClick?.(); setShowMenu(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                    borderRadius: 10, background: colors.surfaceAlt, border: `1px solid ${colors.borderDim}`,
                    color: colors.text, fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  <span style={{ fontSize: 18 }}>⚙️</span>
                  <span>Profile & App Settings</span>
                </button>

                {isAdmin && (
                  <>
                    <div style={{ color: colors.gold, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", marginTop: 10, marginBottom: 2 }}>
                      ADMINISTRATIVE TOOLS
                    </div>
                    {adminItems.map(item => (
                      <button
                        key={item.label}
                        onClick={() => { item.action?.(); setShowMenu(false); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                          borderRadius: 10, background: "rgba(255,255,255,0.03)", border: `1px solid ${colors.borderDim}`,
                          color: colors.textMid, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                          textAlign: "left",
                        }}
                      >
                        <span style={{ fontSize: 16 }}>{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </>
                )}

                <button
                  onClick={() => { setShowMenu(false); if (window.confirm("Sign out of NiPOST Connect?")) logout(); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                    borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                    color: "#F87171", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                    marginTop: 10,
                  }}
                >
                  <span style={{ fontSize: 18 }}>🚪</span>
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  // ── Desktop / Tablet Vertical NavRail ─────────────────────────────────────
  return (
    <div style={{
      width: 64,
      background: "#050F20",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "12px 0",
      gap: 4,
      borderRight: `1px solid ${colors.borderDim}`,
      flexShrink: 0,
      position: "relative",
      zIndex: 100,
    }}>
      <div
        onClick={() => setActiveView("channels")}
        style={{
          width: 44, height: 44, borderRadius: 12,
          background: orgLogoSrc && !logoErr ? "#0D2244" : (orgSettings?.accentColor || colors.gold),
          border: orgLogoSrc && !logoErr ? `1px solid ${colors.border}` : "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, marginBottom: 8, overflow: "hidden", cursor: "pointer", padding: 3, boxSizing: "border-box",
        }}
        title={orgName}
      >
        {orgLogoSrc && !logoErr ? (
          <img
            src={orgLogoSrc}
            alt={orgName}
            onError={() => setLogoErr(true)}
            style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
          />
        ) : (
          "📮"
        )}
      </div>
      <div style={{ width: 32, height: 1, background: colors.border, margin: "4px 0" }} />

      {NAV.map(n => (
        <NavBtn
          key={n.id}
          icon={n.icon}
          label={n.label}
          active={activeView === n.id}
          onClick={() => { setActiveView(n.id); setShowAdminMenu(false); }}
        />
      ))}

      <div style={{ flex: 1 }} />

      <NavBtn
        icon={theme === "light" ? "☀️" : "🌙"}
        label={theme === "light" ? "Day Mode (Click for Night Mode)" : "Night Mode (Click for Day Mode)"}
        active={false}
        onClick={handleToggleTheme}
      />
      <NotificationBell onNavigate={handleNavigation} isMobile={false} />
      <NavBtn
        icon="⚙️"
        label="Profile & Settings"
        active={false}
        onClick={() => { onSettingsClick?.(); setShowAdminMenu(false); }}
      />

      {isAdmin && (
        <div style={{ position: "relative" }}>
          <NavBtn
            icon="🛡️"
            label="Admin Tools"
            active={showAdminMenu}
            onClick={() => setShowAdminMenu(s => !s)}
          />
          {showAdminMenu && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 400 }} onClick={() => setShowAdminMenu(false)} />
              <div style={{
                position: "absolute", left: "calc(100% + 10px)", bottom: 0,
                background: colors.surfaceAlt, border: `1px solid ${colors.border}`,
                borderRadius: 12, padding: 6, minWidth: 230, zIndex: 500,
                boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
              }}>
                <div style={{ padding: "6px 12px 8px", borderBottom: `1px solid ${colors.border}`, marginBottom: 4 }}>
                  <div style={{ color: colors.gold, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em" }}>ADMIN TOOLS</div>
                </div>
                {adminItems.map(item => (
                  <button
                    key={item.label}
                    onClick={() => { item.action?.(); setShowAdminMenu(false); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, width: "100%",
                      padding: "9px 12px", borderRadius: 7, border: "none", background: "transparent",
                      cursor: "pointer", fontFamily: "'DM Sans',sans-serif", textAlign: "left",
                      color: colors.textMid, fontSize: 13,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <span style={{ fontSize: 16, width: 22, textAlign: "center" }}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div
        title={connected ? "Connected" : "Reconnecting..."}
        style={{
          width: 8, height: 8, borderRadius: "50%",
          background: connected ? colors.online : colors.idle, margin: "4px 0",
        }}
      />

      <div
        onClick={() => { onSettingsClick?.(); }}
        onContextMenu={(e) => { e.preventDefault(); if (window.confirm("Sign out?")) logout(); }}
        title={`${user?.name} — click for Profile & Settings`}
        style={{ cursor: "pointer", marginTop: 4 }}
      >
        <UserAvatarCircle user={user} size={36} />
      </div>
    </div>
  );
}

function NavBtn({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        width: 44, height: 44, borderRadius: 12, border: "none", cursor: "pointer",
        fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center",
        background: active ? colors.goldDim : "transparent",
        outline: active ? `2px solid ${colors.gold}` : "none", transition: "background 0.15s",
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      {icon}
    </button>
  );
}
