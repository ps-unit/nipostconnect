// client/src/hooks/usePWA.jsx — Phase 2
import { useState, useEffect } from "react";

export function usePWA() {
  const [installPrompt, setInstallPrompt]     = useState(null);
  const [isInstalled, setIsInstalled]         = useState(false);
  const [isOffline, setIsOffline]             = useState(!navigator.onLine);
  const [swRegistration, setSwRegistration]   = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" })
      .then(reg => {
        setSwRegistration(reg);
        reg.addEventListener("updatefound", () => {
          const nw = reg.installing;
          nw?.addEventListener("statechange", () => {
            if (nw.state === "installed" && navigator.serviceWorker.controller)
              setUpdateAvailable(true);
          });
        });
      })
      .catch(err => console.warn("[PWA] SW failed:", err.message));

    navigator.serviceWorker.addEventListener("message", e => {
      if (e.data?.type === "NOTIFICATION_CLICK") window.location.href = e.data.url;
    });
  }, []);

  useEffect(() => {
    const handler = e => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    const mq = window.matchMedia("(display-mode: standalone)");
    setIsInstalled(mq.matches || window.navigator.standalone === true);
    const mqlH = e => setIsInstalled(e.matches);
    mq.addEventListener("change", mqlH);
    return () => { window.removeEventListener("beforeinstallprompt", handler); mq.removeEventListener("change", mqlH); };
  }, []);

  useEffect(() => {
    const on  = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const install = async () => {
    if (!installPrompt) return false;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") { setInstallPrompt(null); setIsInstalled(true); }
    return outcome === "accepted";
  };

  const applyUpdate = () => {
    swRegistration?.waiting?.postMessage({ type: "SKIP_WAITING" });
    window.location.reload();
  };

  return { isInstallable: !!installPrompt && !isInstalled, isInstalled, isOffline, updateAvailable, swRegistration, install, applyUpdate };
}
