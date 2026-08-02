
// client/src/components/chat/FileUpload.jsx — Phase 2
import { useState, useRef, useCallback } from "react";
import { colors } from "../shared/styles";

const ALLOWED = {
  "image/jpeg":{"icon":"🖼️","label":"JPEG"}, "image/png":{"icon":"🖼️","label":"PNG"},
  "image/gif":{"icon":"🎞️","label":"GIF"},   "image/webp":{"icon":"🖼️","label":"WEBP"},
  "application/pdf":{"icon":"📄","label":"PDF"},
  "application/msword":{"icon":"📝","label":"DOC"},
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":{"icon":"📝","label":"DOCX"},
  "application/vnd.ms-excel":{"icon":"📊","label":"XLS"},
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":{"icon":"📊","label":"XLSX"},
  "text/plain":{"icon":"📃","label":"TXT"}, "text/csv":{"icon":"📊","label":"CSV"},
};
const MAX_SIZE=10*1024*1024, MAX_FILES=5;
const fmt = b => b<1024?`${b} B`:b<1048576?`${(b/1024).toFixed(1)} KB`:`${(b/1048576).toFixed(1)} MB`;

export default function FileUpload({ onFilesSelected, onClose }) {
  const [files, setFiles]       = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef                = useRef();

  const validate = fl => {
    const valid=[], errors=[];
    Array.from(fl).forEach(f => {
      if (!ALLOWED[f.type])        errors.push(`${f.name}: type not allowed`);
      else if (f.size>MAX_SIZE)    errors.push(`${f.name}: exceeds 10 MB`);
      else if (valid.length>=MAX_FILES) errors.push(`Max ${MAX_FILES} files`);
      else valid.push(f);
    });
    if (errors.length) alert(errors.join("\n"));
    return valid;
  };

  const addFiles = fl => {
    const valid=validate(fl);
    const combined=[...files];
    valid.forEach(f => { if (!combined.find(x=>x.name===f.name&&x.size===f.size)) combined.push(f); });
    setFiles(combined.slice(0,MAX_FILES));
  };

  return (
    <div style={{ background:colors.surfaceAlt, border:`1px solid ${colors.border}`, borderRadius:12, padding:16, marginBottom:8 }}>
      <div
        onDragOver={e=>{e.preventDefault();setDragOver(true);}}
        onDragLeave={()=>setDragOver(false)}
        onDrop={e=>{e.preventDefault();setDragOver(false);addFiles(e.dataTransfer.files);}}
        onClick={()=>inputRef.current?.click()}
        style={{ border:`2px dashed ${dragOver?colors.gold:colors.border}`, borderRadius:10, padding:"20px 16px",
          textAlign:"center", cursor:"pointer", background:dragOver?"rgba(212,168,67,0.05)":"transparent",
          transition:"all 0.15s", marginBottom:files.length?12:0 }}>
        <div style={{ fontSize:28, marginBottom:6 }}>📎</div>
        <div style={{ color:dragOver?colors.gold:colors.textMid, fontSize:14, fontWeight:600 }}>
          {dragOver?"Drop files here":"Click or drag files to attach"}
        </div>
        <div style={{ color:colors.muted, fontSize:12, marginTop:4 }}>Images, PDF, Word, Excel, CSV — max 10MB each, up to 5 files</div>
        <input ref={inputRef} type="file" multiple accept={Object.keys(ALLOWED).join(",")}
          onChange={e=>addFiles(e.target.files)} style={{ display:"none" }} />
      </div>
      {files.length>0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:12 }}>
          {files.map((file,i) => {
            const meta=ALLOWED[file.type];
            const isImg=file.type.startsWith("image/");
            const preview=isImg?URL.createObjectURL(file):null;
            return (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, background:"#081832",
                borderRadius:8, padding:"8px 10px", border:`1px solid ${colors.border}` }}>
                {isImg&&preview
                  ? <img src={preview} alt={file.name} style={{ width:40,height:40,borderRadius:6,objectFit:"cover",flexShrink:0 }} />
                  : <div style={{ width:40,height:40,borderRadius:6,background:colors.surfaceAlt,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0 }}>{meta?.icon||"📎"}</div>}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ color:colors.text, fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{file.name}</div>
                  <div style={{ color:colors.muted, fontSize:11 }}>{meta?.label} · {fmt(file.size)}</div>
                </div>
                <button onClick={()=>setFiles(f=>f.filter((_,j)=>j!==i))}
                  style={{ background:"none",border:"none",color:colors.muted,cursor:"pointer",fontSize:16,padding:"2px 4px",flexShrink:0 }}>✕</button>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
        <button onClick={onClose}
          style={{ padding:"7px 14px",borderRadius:7,border:`1px solid ${colors.border}`,background:"none",color:colors.muted,cursor:"pointer",fontSize:13,fontFamily:"'DM Sans',sans-serif" }}>Cancel</button>
        <button onClick={()=>files.length&&onFilesSelected(files)} disabled={!files.length}
          style={{ padding:"7px 16px",borderRadius:7,border:"none",background:files.length?colors.gold:colors.border,
            color:files.length?"#0A1F44":colors.ghost,cursor:files.length?"pointer":"default",
            fontWeight:700,fontSize:13,fontFamily:"'DM Sans',sans-serif" }}>
          Attach {files.length>0?`(${files.length})`:""}
        </button>
      </div>
    </div>
  );
}
