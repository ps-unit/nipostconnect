
// client/src/components/chat/AttachmentViewer.jsx — Phase 2
import { useState } from "react";
import { colors } from "../shared/styles";

const IMG_TYPES = ["image/jpeg","image/png","image/gif","image/webp"];
const FILE_ICONS = {
  "application/pdf":"📄", "application/msword":"📝",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":"📝",
  "application/vnd.ms-excel":"📊",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":"📊",
  "text/plain":"📃", "text/csv":"📊",
};
const fmt = b => b<1024?`${b} B`:b<1048576?`${(b/1024).toFixed(1)} KB`:`${(b/1048576).toFixed(1)} MB`;

function Lightbox({ src, name, onClose }) {
  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9000,cursor:"zoom-out",padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ position:"relative",maxWidth:"90vw",maxHeight:"90vh" }}>
        <img src={src} alt={name} style={{ maxWidth:"100%",maxHeight:"90vh",borderRadius:8,display:"block" }} />
        <div style={{ position:"absolute",bottom:-32,left:0,right:0,textAlign:"center",color:"rgba(255,255,255,0.6)",fontSize:12 }}>{name}</div>
        <button onClick={onClose} style={{ position:"absolute",top:-12,right:-12,width:28,height:28,borderRadius:"50%",background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
      </div>
    </div>
  );
}

export function AttachmentViewer({ attachments }) {
  const [lightbox, setLightbox] = useState(null);
  if (!attachments?.length) return null;
  const images = attachments.filter(a => IMG_TYPES.includes(a.mimeType));
  const docs   = attachments.filter(a => !IMG_TYPES.includes(a.mimeType));
  return (
    <div style={{ marginTop:8 }}>
      {images.length>0 && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:docs.length?8:0 }}>
          {images.map(att => (
            <div key={att.id} onClick={()=>setLightbox(att)}
              style={{ cursor:"zoom-in",borderRadius:8,overflow:"hidden",border:`1px solid ${colors.border}` }}>
              <img src={att.thumbnailUrl||att.url} alt={att.originalName} loading="lazy"
                style={{ width:images.length===1?"min(320px,100%)":140, height:images.length===1?"auto":140,
                  maxHeight:images.length===1?280:140, objectFit:"cover", display:"block" }} />
            </div>
          ))}
        </div>
      )}
      {docs.map(att => (
        <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer" download={att.originalName}
          style={{ display:"flex",alignItems:"center",gap:10,background:"#0D2244",border:`1px solid ${colors.border}`,
            borderRadius:8,padding:"8px 12px",marginBottom:6,textDecoration:"none",transition:"background 0.15s" }}
          onMouseEnter={e=>e.currentTarget.style.background="#1A3356"}
          onMouseLeave={e=>e.currentTarget.style.background="#0D2244"}>
          <span style={{ fontSize:24,flexShrink:0 }}>{FILE_ICONS[att.mimeType]||"📎"}</span>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ color:colors.text,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:500 }}>{att.originalName}</div>
            <div style={{ color:colors.muted,fontSize:11 }}>{att.mimeType.split("/")[1]?.toUpperCase()} · {fmt(att.size)}</div>
          </div>
          <span style={{ color:colors.gold,fontSize:13,flexShrink:0 }}>⬇ Download</span>
        </a>
      ))}
      {lightbox && <Lightbox src={lightbox.url} name={lightbox.originalName} onClose={()=>setLightbox(null)} />}
    </div>
  );
}

export function ReadReceiptsBar({ readReceipts=[], totalMembers=0 }) {
  const [expanded, setExpanded] = useState(false);
  if (!readReceipts.length) return null;
  const shown    = expanded ? readReceipts : readReceipts.slice(0,5);
  const overflow = readReceipts.length - 5;
  const getInit  = (n="") => n.split(" ").slice(0,2).map(w=>w[0]||"").join("").toUpperCase();
  const getBg    = n => { const C=["#C9952A","#1A6B4A","#8B2252","#1A4A8B","#2A5C8B","#8B4513","#2C5F2E"]; let h=0; for(let i=0;i<n.length;i++) h=n.charCodeAt(i)+((h<<5)-h); return C[Math.abs(h)%C.length]; };
  return (
    <div style={{ display:"flex",alignItems:"center",gap:5,marginTop:6,flexWrap:"wrap" }}>
      <span style={{ fontSize:10,color:colors.mutedDim }}>👁️ {readReceipts.length}{totalMembers?`/${totalMembers}`:""} read</span>
      <div style={{ display:"flex",alignItems:"center" }}>
        {shown.map((r,i) => (
          <div key={r.userId||i} title={r.user?.name||"Staff"}
            style={{ width:18,height:18,borderRadius:"50%",background:getBg(r.user?.name||""),border:`1px solid ${colors.surface}`,
              marginLeft:i===0?0:-5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,fontWeight:700,color:"#fff",
              zIndex:shown.length-i,position:"relative" }}>
            {getInit(r.user?.name||"?")}
          </div>
        ))}
        {!expanded&&overflow>0 && (
          <button onClick={()=>setExpanded(true)}
            style={{ width:18,height:18,borderRadius:"50%",marginLeft:-5,background:colors.border,border:`1px solid ${colors.surface}`,
              color:colors.muted,fontSize:8,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0 }}>
            +{overflow}
          </button>
        )}
      </div>
      {expanded && <button onClick={()=>setExpanded(false)} style={{ background:"none",border:"none",color:colors.muted,fontSize:10,cursor:"pointer",padding:0 }}>show less</button>}
    </div>
  );
}
