
// client/src/App.jsx — v6+7
import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SocketProvider } from "./contexts/SocketContext";
import { usePWA } from "./hooks/usePWA";
import { useNotifications } from "./hooks/useNotifications";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";   // Phase 6
import ResetPasswordPage from "./pages/ResetPasswordPage";     // Phase 6
import ChatPage from "./pages/ChatPage";
import LoadingScreen from "./components/shared/LoadingScreen";
import { InstallPrompt, NotificationPermission, OfflineBanner, UpdateBanner } from "./components/shared/NotificationBell";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user)   return <Navigate to="/login" replace />;
  return children;
}
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user)    return <Navigate to="/" replace />;
  return children;
}

function Shell() {
  const { user } = useAuth();
  const { isInstallable, isOffline, updateAvailable, install, applyUpdate } = usePWA();
  const { permission, notificationsSupported, subscribe } = useNotifications();
  const [installDismissed, setInstallDismissed] = useState(false);
  const [notifDismissed,   setNotifDismissed]   = useState(false);

  return (
    <>
      {isOffline       && <OfflineBanner />}
      {updateAvailable && <UpdateBanner onUpdate={applyUpdate} />}
      {user && notificationsSupported && permission==="default" && !notifDismissed && (
        <NotificationPermission
          onEnable={() => { subscribe(); setNotifDismissed(true); }}
          onDismiss={() => setNotifDismissed(true)}
        />
      )}
      {isInstallable && !installDismissed && (
        <InstallPrompt
          onInstall={() => { install(); setInstallDismissed(true); }}
          onDismiss={() => setInstallDismissed(true)}
        />
      )}
      <Routes>
        <Route path="/login"           element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register"        element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
        <Route path="/reset-password"  element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
        <Route path="/*"               element={
          <ProtectedRoute>
            <SocketProvider><ChatPage /></SocketProvider>
          </ProtectedRoute>
        } />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </AuthProvider>
  );
}
