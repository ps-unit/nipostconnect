// src/components/shared/LoadingScreen.jsx
import { useState, useEffect } from "react";
import api from "../../services/api";
import { colors, resolveUploadUrl, getCachedOrgSettings, applyOrgBranding } from "./styles";

export default function LoadingScreen({ message }) {
  const [orgSettings, setOrgSettings] = useState(() => getCachedOrgSettings());
  const [logoErr, setLogoErr] = useState(false);

  useEffect(() => {
    const onBranding = (e) => {
      if (e.detail) {
        setOrgSettings(e.detail);
        setLogoErr(false);
      }
    };
    window.addEventListener("org:branding", onBranding);
    api.get("/organization")
      .then(r => {
        if (r.data?.settings) {
          setOrgSettings(r.data.settings);
          applyOrgBranding(r.data.settings);
        }
      })
      .catch(() => {});
    return () => window.removeEventListener("org:branding", onBranding);
  }, []);

  const orgLogoSrc = resolveUploadUrl(orgSettings?.logoUrl);
  const orgName    = orgSettings?.name || "NiPOST Connect";
  const displayMsg = message || `Loading ${orgName}...`;

  return (
    <div style={{
      height: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: colors.bg, gap: 16,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {orgLogoSrc && !logoErr ? (
        <img
          src={orgLogoSrc}
          alt={orgName}
          onError={() => setLogoErr(true)}
          style={{ width: 72, height: 72, objectFit: "contain", display: "block" }}
        />
      ) : (
        <div style={{ fontSize: 48 }}>📮</div>
      )}
      <div style={{ color: colors.gold, fontWeight: 700, fontSize: 18 }}>{orgName}</div>
      <div style={{ color: colors.muted, fontSize: 13 }}>{displayMsg}</div>
      <div style={{ width: 160, height: 3, background: "#1E3A5F", borderRadius: 4, overflow: "hidden", marginTop: 4 }}>
        <div style={{
          height: "100%", width: "40%", background: colors.gold, borderRadius: 4,
          animation: "slide 1.2s ease-in-out infinite",
        }} />
      </div>
      <style>{`@keyframes slide { 0%{margin-left:-40%} 100%{margin-left:160%} }`}</style>
    </div>
  );
}
