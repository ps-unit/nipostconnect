// client/src/hooks/useNotifications.jsx — Phase 2
import { useState, useEffect, useCallback } from "react";
import api from "../services/api";

export function useNotifications() {
  const [permission, setPermission]     = useState("Notification" in window ? Notification.permission : "denied");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading]           = useState(false);
  const supported = "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;

  useEffect(() => {
    if (!supported) return;
    navigator.serviceWorker.ready.then(async reg => {
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    });
  }, [supported]);

  const urlBase64ToUint8Array = (base64) => {
    const padding = "=".repeat((4 - base64.length % 4) % 4);
    const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = window.atob(b64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
  };

  const subscribe = useCallback(async () => {
    if (!supported) return { success: false, reason: "not_supported" };
    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") return { success: false, reason: "denied" };
      const { data } = await api.get("/notifications/vapid-public-key");
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });
      await api.post("/notifications/subscribe", {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey("p256dh")))),
          auth:   btoa(String.fromCharCode(...new Uint8Array(subscription.getKey("auth")))),
        },
        userAgent: navigator.userAgent,
      });
      setIsSubscribed(true);
      return { success: true };
    } catch (err) {
      console.error("[Push] Subscribe error:", err);
      return { success: false, reason: err.message };
    } finally { setLoading(false); }
  }, [supported]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api.delete("/notifications/unsubscribe", { data: { endpoint: sub.endpoint } });
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
    } finally { setLoading(false); }
  }, []);

  return { permission, isSubscribed, loading, notificationsSupported: supported, subscribe, unsubscribe };
}
