// src/components/shared/LoadingScreen.jsx
import { colors } from "./styles";

export default function LoadingScreen({ message = "Loading NiPOST Connect..." }) {
  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: colors.bg, gap: 16,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ fontSize: 48 }}>📮</div>
      <div style={{ color: colors.gold, fontWeight: 700, fontSize: 18 }}>NiPOST Connect</div>
      <div style={{ color: colors.muted, fontSize: 13 }}>{message}</div>
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
