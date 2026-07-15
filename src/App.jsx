import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

const LOGO_SRC   = "/logo.png";
const MASCOT_SRC = "/mascot.png";

const TEMP_PASSWORD = "snbvip2025";

const firebaseConfig = {
  apiKey: "AIzaSyAOFbMMhWkrDNLKwZHBVNHEZiwzvqhNHmM",
  authDomain: "suds-n-bones.firebaseapp.com",
  projectId: "suds-n-bones",
  storageBucket: "suds-n-bones.firebasestorage.app",
  messagingSenderId: "530550775779",
  appId: "1:530550775779:web:066519b74247e9049c8ad6"
};
const _app = initializeApp(firebaseConfig);
const _db  = getFirestore(_app);
const _ref = doc(_db, "vip", "clients");

async function dbLoad() {
  try { const snap = await getDoc(_ref); return snap.exists() ? (snap.data().list || []) : []; }
  catch(e) { console.error(e); return []; }
}

// Walks the outgoing data and returns dotted/bracket paths (rooted at "clients")
// of every value that is exactly undefined, e.g. "clients[12].pets[1].breed".
function findUndefinedPaths(data, path = "clients") {
  if (data === undefined) return [path];
  if (data === null || typeof data !== "object" || data instanceof Date) return [];
  if (Array.isArray(data)) {
    return data.flatMap((item, i) => findUndefinedPaths(item, `${path}[${i}]`));
  }
  return Object.keys(data).flatMap(key => findUndefinedPaths(data[key], `${path}.${key}`));
}

// Returns a deep copy safe for Firestore: undefined object properties are
// dropped, undefined array elements become null (indexes preserved), and the
// original data is never mutated.
function sanitizeForFirestore(data) {
  if (data === undefined) return null;
  if (data === null || typeof data !== "object" || data instanceof Date) return data;
  if (Array.isArray(data)) return data.map(sanitizeForFirestore);
  const out = {};
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined) out[key] = sanitizeForFirestore(data[key]);
  });
  return out;
}

async function dbSave(data) {
  const undefinedPaths = findUndefinedPaths(data);
  if (undefinedPaths.length > 0) {
    console.warn(
      "Firestore save: undefined value(s) found and will be sanitized before writing:\n" +
      undefinedPaths.map(p => `${p} is undefined`).join("\n")
    );
  }
  const sanitizedData = sanitizeForFirestore(data);
  try { await setDoc(_ref, { list: sanitizedData }); } catch(e) { console.error(e); throw e; }
}

const TYPE_COLORS  = { FH: "#4edee4", MT: "#f0a500" };
const TYPE_PUNCHED = { FH: "#4edee4", MT: "#00e676" };
const TYPE_BG      = { FH: "#0cc0df22", MT: "#00e67222" };
const FREE_COLOR   = "#ff6ec7";
const PAGE_SIZE    = 20;

function makeBathSlots() {
  return [
    { label: "Bath 1",    date: "", isFree: false },
    { label: "Bath 2",    date: "", isFree: false },
    { label: "Bath 3",    date: "", isFree: false },
    { label: "FREE Bath", date: "", isFree: true  },
  ];
}
function makeGroomSlots() {
  return [
    { label: "Groom 1",    date: "", type: "", isFree: false },
    { label: "Groom 2",    date: "", type: "", isFree: false },
    { label: "Groom 3",    date: "", type: "", isFree: false },
    { label: "Groom 4",    date: "", type: "", isFree: false },
    { label: "Groom 5",    date: "", type: "", isFree: false },
    { label: "Groom 6",    date: "", type: "", isFree: false },
    { label: "Groom 7",    date: "", type: "", isFree: false },
    { label: "FREE Groom", date: "", type: "", isFree: true  },
  ];
}
function emptyCard()    { return { baths: makeBathSlots(), grooms: makeGroomSlots(), archivedCycles: [] }; }
function emptyPet(name) { return { id: Date.now() + Math.random(), name: name || "", breed: "", card: emptyCard() }; }
function emptyClient()  { return { id: Date.now(), name: "", phone: "", memberSince: "", pets: [emptyPet()] }; }
const today = () => new Date().toISOString().slice(0, 10);
const fmt   = (s) => (s || "").trim().toLowerCase();
const fmtDateOnly = (s) => { if (!s) return ""; const [y,m,d] = s.split("-"); return (y&&m&&d) ? `${+m}/${+d}/${y}` : s; };

const inp = {
  background: "#061414", border: "1px solid #1a3333", borderRadius: 8,
  color: "#e0fffe", fontSize: 15, padding: "8px 12px", outline: "none",
  width: "100%", boxSizing: "border-box", fontFamily: "system-ui,sans-serif",
};

function BathSlot({ slot, idx, onChange }) {
  const dateRef = useRef(null);
  const filled  = !!slot.date;
  const isFree  = !!slot.isFree;
  const punch   = () => onChange({ date: dateRef.current?.value || today() });
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:4, padding:"6px 8px", borderRadius:10,
      background: isFree ? (filled ? `linear-gradient(135deg,${FREE_COLOR}cc,${FREE_COLOR}88)` : "#1a3a3a") : (filled ? "#0a2e2e" : "#0a1a1a"),
      border: "1px solid " + (isFree ? (filled ? FREE_COLOR+"88" : FREE_COLOR+"44") : (filled ? "#0cc0df44" : "#0f2626")),
    }}>
      <div style={{width:22,height:22,borderRadius:"50%",flexShrink:0,background:isFree?(filled?"rgba(0,0,0,0.2)":"#0cc0df22"):(filled?"#0cc0df22":"#1a2e2e"),display:"flex",alignItems:"center",justifyContent:"center"}}>
        {filled ? <span style={{fontSize:13,color:"#fff",fontWeight:900}}>&#10003;</span>
          : isFree ? <span style={{fontSize:11,fontWeight:900,color:FREE_COLOR}}>&#9733;</span>
          : <span style={{fontSize:11,color:"#6ababa",fontWeight:800,fontFamily:"monospace"}}>{idx+1}</span>}
      </div>
      <span style={{fontSize:13,fontWeight:isFree?900:700,flex:1,color:isFree?(filled?"#fff":FREE_COLOR):(filled?"#5de7ed":"#8ad8d8"),fontFamily:"monospace",letterSpacing:0.5,textTransform:"uppercase"}}>{slot.label}</span>
      {filled
        ? <span style={{fontSize:11,color:isFree?"#ffffff99":"#5de7edbb",fontFamily:"monospace",fontWeight:700}}>{slot.date}</span>
        : <input ref={dateRef} type="date" defaultValue={today()} style={{background:"transparent",border:"none",color:"#7acaca",fontSize:10,fontFamily:"monospace",outline:"none",width:90,cursor:"pointer",flexShrink:1}} />}
      {!filled
        ? <button onClick={punch} style={{background:isFree?FREE_COLOR:"#0cc0df",border:"none",borderRadius:6,color:"#000",fontSize:9,fontWeight:800,padding:"3px 8px",cursor:"pointer",letterSpacing:1,textTransform:"uppercase",fontFamily:"monospace",flexShrink:0}}>PUNCH</button>
        : <button onClick={()=>onChange({date:""})} style={{background:"transparent",border:"none",color:isFree?"#ffffff55":"#5a9a9a",cursor:"pointer",fontSize:12,padding:"0 2px",flexShrink:0}}>&#10005;</button>}
    </div>
  );
}

function GroomSlot({ slot, idx, onChange, freeType }) {
  const dateRef  = useRef(null);
  const [selType,setSelType] = useState("FH");
  const filled   = !!slot.date;
  const isFree   = !!slot.isFree;
  const tc       = filled ? (TYPE_PUNCHED[slot.type]||TYPE_PUNCHED[freeType]||"#4edee4") : (TYPE_COLORS[slot.type]||"#4edee4");
  const tb       = filled ? (TYPE_BG[slot.type]||"#00e67222") : "#0a1a1a";
  const punch    = () => onChange({ date: dateRef.current?.value||today(), type: isFree?freeType:selType });
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:4, padding:"6px 8px", borderRadius:10,
      background: isFree?(filled?`linear-gradient(135deg,${FREE_COLOR}cc,${FREE_COLOR}88)`:"#1a3a3a"):(filled?tb:"#0a1a1a"),
      border: "1px solid "+(isFree?(filled?FREE_COLOR+"88":FREE_COLOR+"44"):(filled?tc+"55":"#0f2626")),
    }}>
      <div style={{width:22,height:22,borderRadius:"50%",flexShrink:0,background:filled?tc+"33":"#1a2e2e",display:"flex",alignItems:"center",justifyContent:"center"}}>
        {filled ? <span style={{fontSize:13,color:isFree?"#fff":tc,fontWeight:900}}>&#10003;</span>
          : isFree ? <span style={{fontSize:11,fontWeight:900,color:FREE_COLOR}}>&#9733;</span>
          : <span style={{fontSize:11,color:"#6ababa",fontWeight:800,fontFamily:"monospace"}}>{idx+1}</span>}
      </div>
      <span style={{fontSize:13,fontWeight:isFree?900:700,flex:1,minWidth:0,color:isFree?(filled?"#fff":FREE_COLOR):(filled?tc:"#8ad8d8"),fontFamily:"monospace",letterSpacing:0.5,textTransform:"uppercase",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
        {isFree?("FREE "+(freeType||"Groom")):slot.label}
        {filled&&slot.type&&!isFree&&<span style={{marginLeft:5,fontSize:9,background:tc+"33",color:tc,borderRadius:4,padding:"1px 5px",fontWeight:800}}>{slot.type}</span>}
      </span>
      {!filled&&!isFree&&(
        <select value={selType} onChange={e=>setSelType(e.target.value)} style={{background:"#111",border:"2px solid "+TYPE_COLORS[selType],borderRadius:6,color:TYPE_COLORS[selType],fontSize:12,fontWeight:900,padding:"3px 6px",outline:"none",cursor:"pointer",fontFamily:"monospace",flexShrink:0,minWidth:52}}>
          <option value="FH">FH</option>
          <option value="MT">MT</option>
        </select>)}
      {filled
        ? <span style={{fontSize:10,color:isFree?"#ffffff99":tc+"bb",fontFamily:"monospace",flexShrink:0,fontWeight:700}}>{slot.date}</span>
        : <input ref={dateRef} type="date" defaultValue={today()} style={{background:"transparent",border:"none",color:"#7acaca",fontSize:10,fontFamily:"monospace",outline:"none",width:88,cursor:"pointer",flexShrink:1}} />}
      {!filled
        ? <button onClick={punch} style={{background:isFree?FREE_COLOR:"#0cc0df",border:"none",borderRadius:6,color:"#000",fontSize:9,fontWeight:800,padding:"4px 8px",cursor:"pointer",letterSpacing:1,textTransform:"uppercase",fontFamily:"monospace",flexShrink:0}}>PUNCH</button>
        : <button onClick={()=>onChange({date:"",type:""})} style={{background:"transparent",border:"none",color:isFree?"#ffffff55":"#5a9a9a",cursor:"pointer",fontSize:12,padding:"0 2px",flexShrink:0}}>&#10005;</button>}
    </div>
  );
}

function PetCard({ pet, onUpdate, onRemove, isOnly }) {
  const [editName,setEditName] = useState(!pet.name);
  const [tmpName,setTmpName]   = useState(pet.name);
  const [showArc,setShowArc]   = useState(false);
  const bF   = pet.card.baths.filter(s=>s.date).length;
  const gF   = pet.card.grooms.filter(s=>s.date).length;
  const bFr  = pet.card.baths[3]?.date;
  const gFr  = pet.card.grooms[7]?.date;
  const fgt  = pet.card.grooms[6]?.type||"";
  const bPct = Math.round((Math.min(bF,3)/3)*100);
  const gPct = Math.round((Math.min(gF,7)/7)*100);
  const arcs = pet.card.archivedCycles||[];
 const done = bFr || gFr;
  const punchB = (i,v) => { const b=pet.card.baths.map((s,j)=>j===i?{...s,...v}:s); onUpdate({...pet,card:{...pet.card,baths:b}}); };
  const punchG = (i,v) => { const g=pet.card.grooms.map((s,j)=>j===i?{...s,...v}:s); onUpdate({...pet,card:{...pet.card,grooms:g}}); };
  const reset = () => {
  const arc = {
    baths: bFr ? pet.card.baths : [],
    grooms: gFr ? pet.card.grooms : [],
    archivedCycles: undefined,
    date: new Date().toISOString()
  };

  onUpdate({
    ...pet,
    card: {
      baths: bFr ? makeBathSlots() : pet.card.baths,
      grooms: gFr ? makeGroomSlots() : pet.card.grooms,
      archivedCycles: [...arcs, arc]
    }
  });
};
  return (
    <div style={{background:"#0e1a1a",border:"1px solid "+(done?"#4edee4":"#1a3333"),borderRadius:16,overflow:"hidden",marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:6,padding:"10px 12px",background:"linear-gradient(135deg,#0a2020,#061818)",borderBottom:"1px solid #1a3333"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{width:30,height:30,borderRadius:"50%",background:"#0cc0df22",border:"1px solid #0cc0df44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>&#128062;</span>
          {editName
            ? <input autoFocus value={tmpName} onChange={e=>setTmpName(e.target.value)} onBlur={()=>{onUpdate({...pet,name:tmpName});setEditName(false);}} onKeyDown={e=>e.key==="Enter"&&e.target.blur()} placeholder="Pet name..." style={{background:"#061414",border:"1px solid #0cc0df",borderRadius:6,color:"#fff",fontSize:15,fontWeight:700,padding:"3px 10px",outline:"none",fontFamily:"system-ui,sans-serif"}} />
            : <div>
                <span onClick={()=>setEditName(true)} style={{fontSize:16,fontWeight:800,color:"#fff",cursor:"pointer",fontFamily:"system-ui,sans-serif",borderBottom:"1px dashed #2a5555"}}>{pet.name||"TAP TO NAME PET"}</span>
                {pet.breed&&<span style={{marginLeft:8,fontSize:12,color:"#6ababa",fontFamily:"monospace"}}>{pet.breed}</span>}
              </div>}
          {bFr&&<span>&#128704;&#10024;</span>}
          {gFr&&<span>&#9986;&#65039;&#10024;</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {arcs.length>0&&<button onClick={()=>setShowArc(!showArc)} style={{background:"transparent",border:"1px solid #2a5555",color:"#6ababa",borderRadius:6,padding:"2px 8px",cursor:"pointer",fontSize:10,fontFamily:"monospace",letterSpacing:1}}>{arcs.length} CYCLE{arcs.length>1?"S":""}</button>}
          {done&&<button onClick={reset} style={{background:"linear-gradient(135deg,#0cc0df,#4edee4)",border:"none",color:"#000",borderRadius:6,padding:"3px 10px",cursor:"pointer",fontSize:10,fontWeight:800,fontFamily:"monospace",letterSpacing:1}}>NEW CYCLE</button>}
          <span style={{fontSize:12,color:"#6ababa",fontFamily:"monospace"}}>&#128704;{bF}/4 &#183; &#9986;{gF}/8</span>
          {!isOnly&&<button onClick={() => { if (window.confirm("Are you sure you want to remove this pet? This cannot be undone.")) onRemove(); }} style={{background:"transparent",border:"none",color:"#4a8a8a",cursor:"pointer",fontSize:15}}>&#10005;</button>}
        </div>
      </div>
      {showArc&&arcs.length>0&&(
        <div style={{padding:"8px 16px",background:"#060f0f",borderBottom:"1px solid #0f2020"}}>
          {arcs.map((cy,ci)=>(
            <div key={ci} style={{fontSize:12,color:"#5a9a9a",fontFamily:"monospace",padding:"3px 0"}}>
              <span style={{color:"#6ababa",fontWeight:700}}>Cycle {ci+1}:</span> {(cy.baths||[]).filter(s=>s.date).length} baths &#183; {(cy.grooms||[]).filter(s=>s.date).length} grooms &#183; {cy.date?new Date(cy.date).toLocaleDateString():""}
            </div>))}
        </div>)}
      <div style={{padding:"8px 16px 0",display:"flex",gap:12}}>
        {[{label:"Bath",pct:bPct,free:bFr},{label:"Groom",pct:gPct,free:gFr}].map(({label,pct,free})=>(
          <div key={label} style={{flex:1}}>
            <div style={{fontSize:11,color:"#6ababa",fontFamily:"monospace",marginBottom:3,letterSpacing:1}}>{label.toUpperCase()} {pct}%</div>
            <div style={{height:4,background:"#0a1e1e",borderRadius:4,overflow:"hidden"}}>
              <div style={{height:"100%",width:pct+"%",background:free?"linear-gradient(90deg,#0cc0df,#4edee4)":"linear-gradient(90deg,#0cc0df88,#4edee488)",borderRadius:4,transition:"width 0.4s ease"}} />
            </div>
          </div>))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))"}}>
        <div style={{padding:"10px 12px",borderRight:"1px solid #0f2626"}}>
          <div style={{fontSize:13,letterSpacing:2,color:"#0cc0df",fontWeight:900,marginBottom:6,fontFamily:"monospace"}}>&#128704; BATH / BB</div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {pet.card.baths.map((slot,i)=><BathSlot key={i} slot={slot} idx={i} onChange={v=>punchB(i,v)} />)}
          </div>
        </div>
        <div style={{padding:"10px 12px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <div style={{fontSize:13,letterSpacing:2,color:"#0cc0df",fontWeight:900,fontFamily:"monospace"}}>&#9986;&#65039; GROOM</div>
            {[["FH","#4edee4"],["MT","#00e676"]].map(([k,c])=>(
              <span key={k} style={{fontSize:10,fontWeight:800,color:c,background:c+"22",borderRadius:4,padding:"1px 5px",fontFamily:"monospace"}}>{k}</span>))}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {pet.card.grooms.map((slot,i)=><GroomSlot key={i} slot={slot} idx={i} onChange={v=>punchG(i,v)} freeType={fgt} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function ClientDetail({ client, onUpdate, onBack, onDelete }) {
  const [c,setC]               = useState(client);
  const [confirmDel,setConfirmDel] = useState(false);
  const [delInput,setDelInput] = useState("");
  const push      = u => { setC(u); onUpdate(u); };
  const updatePet = p => push({...c,pets:c.pets.map(x=>x.id===p.id?p:x)});
  const removePet = id => push({...c,pets:c.pets.filter(p=>p.id!==id)});
  const addPet    = () => push({...c,pets:[...c.pets,emptyPet()]});
  const total     = c.pets.reduce((a,p)=>a+p.card.baths.filter(s=>s.date).length+p.card.grooms.filter(s=>s.date).length,0);
  const ms        = c.memberSince||c.membership||"";
  return (
    <div style={{maxWidth:820,margin:"0 auto",minWidth:0}}>
      <button onClick={onBack} style={{background:"transparent",border:"none",color:"#0cc0df",cursor:"pointer",fontSize:12,marginBottom:18,display:"flex",alignItems:"center",gap:6,fontFamily:"monospace",letterSpacing:2,padding:0}}>&#8592; ALL CLIENTS</button>
      <div style={{background:"linear-gradient(135deg,#071a1a,#040f0f)",border:"1px solid #1a3333",borderRadius:16,padding:"16px 20px",marginBottom:18}}>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end",justifyContent:"space-between"}}>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",flex:1,minWidth:0}}>
            <div style={{flex:1,minWidth:140}}>
              <label style={{fontSize:11,color:"#6ababa",display:"block",marginBottom:4,fontFamily:"monospace",letterSpacing:1.5}}>CLIENT NAME</label>
              <input value={c.name} onChange={e=>push({...c,name:e.target.value})} placeholder="Full Name" style={inp} />
            </div>
            <div style={{flex:1,minWidth:120}}>
              <label style={{fontSize:11,color:"#6ababa",display:"block",marginBottom:4,fontFamily:"monospace",letterSpacing:1.5}}>PHONE</label>
              <input value={c.phone} onChange={e=>push({...c,phone:e.target.value})} placeholder="(555) 000-0000" style={inp} />
            </div>
            <div style={{minWidth:140}}>
              <label style={{fontSize:11,color:"#6ababa",display:"block",marginBottom:4,fontFamily:"monospace",letterSpacing:1.5}}>MEMBER SINCE</label>
              <input type="date" value={ms} onChange={e=>push({...c,memberSince:e.target.value})} style={{...inp,color:"#e0fffe"}} />
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <span style={{fontSize:13,color:"#0cc0df",fontFamily:"monospace"}}>{total} punches</span>
            {!confirmDel
              ? <button onClick={()=>setConfirmDel(true)} style={{background:"#1a0808",border:"1px solid #3a1515",color:"#c05050",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:11,fontFamily:"monospace",letterSpacing:1}}>ARCHIVE</button>
              : <div style={{display:"flex",alignItems:"center",gap:8,background:"#1a0808",border:"1px solid #3a1515",borderRadius:8,padding:"6px 12px"}}>
                  <span style={{fontSize:11,color:"#ff6b6b",fontFamily:"monospace"}}>Type DELETE:</span>
                  <input autoFocus value={delInput} onChange={e=>setDelInput(e.target.value)} style={{background:"transparent",border:"none",borderBottom:"1px solid #c05050",color:"#ff6b6b",fontSize:12,fontFamily:"monospace",outline:"none",width:70}} />
                  <button onClick={()=>{if(delInput==="DELETE")onDelete();}} disabled={delInput!=="DELETE"} style={{background:delInput==="DELETE"?"#c05050":"#2a1010",border:"none",borderRadius:6,color:"#fff",fontSize:11,fontWeight:800,padding:"3px 8px",cursor:delInput==="DELETE"?"pointer":"not-allowed",fontFamily:"monospace"}}>&#10003;</button>
                  <button onClick={()=>{setConfirmDel(false);setDelInput("");}} style={{background:"transparent",border:"none",color:"#555",cursor:"pointer",fontSize:14}}>&#10005;</button>
                </div>}
          </div>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:10,background:"linear-gradient(135deg,#061a1a,#030f0f)",border:"1px solid #0cc0df44",borderRadius:30,padding:"6px 16px"}}>
          <img src={LOGO_SRC} alt="SNB" style={{width:28,height:28,objectFit:"contain"}} />
          <span style={{fontSize:14,fontWeight:900,letterSpacing:3,color:"#4edee4",fontFamily:"monospace"}}>VIP PUNCH CARD</span>
        </div>
        <button onClick={addPet} style={{background:"#061a1a",border:"1px solid #0cc0df44",color:"#4edee4",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:12,fontFamily:"monospace",letterSpacing:1}}>+ ADD PET</button>
      </div>
      {c.pets.map(pet=>(
        <PetCard key={pet.id} pet={pet}
          onUpdate={p=>{const u={...c,pets:c.pets.map(x=>x.id===p.id?p:x)};setC(u);onUpdate(u);}}
          onRemove={()=>removePet(pet.id)} isOnly={c.pets.length===1} />))}
    </div>
  );
}

export default function App() {
  const [clients,       setClients]        = useState([]);
  const [selected,      setSelected]       = useState(null);
  const [search,        setSearch]         = useState("");
  const [loading,       setLoading]        = useState(true);
  const [adding,        setAdding]         = useState(false);
  const [newName,       setNewName]        = useState("");
  const [newPhone,      setNewPhone]       = useState("");
  const [newMemberSince,setNewMemberSince] = useState("");
  const [page,          setPage]           = useState(0);
  const [activeLetter,  setActiveLetter]   = useState("ALL");

  const [authed, setAuthed] = useState(() => sessionStorage.getItem("snb_authed") === "1");
const [pwInput, setPwInput] = useState("");

  useEffect(()=>{dbLoad().then(d=>{setClients(d);setLoading(false);});}, []);

  const persist = async u => {
    setClients(u);
    try { await dbSave(u); }
    catch(e) { console.error(e); alert("Failed to save changes. Please check your connection and try again."); }
  };

  const addClient = () => {
    if (!newName.trim()) return;
    const c = {...emptyClient(),name:newName.trim(),phone:newPhone.trim(),memberSince:newMemberSince};
    persist([c,...clients]); setAdding(false); setNewName(""); setNewPhone(""); setNewMemberSince(""); setSelected(c);
  };

  const updateClient = u => {
    persist(clients.map(c=>c.id===u.id?u:c));
    if (selected?.id===u.id) setSelected(u);
  };

  const deleteClient = id => {
    persist(clients.map(c=>c.id===id?{...c,deleted:true,deletedAt:new Date().toISOString()}:c));
    setSelected(null);
  };

  const exportCSV = () => {
    const nl  = String.fromCharCode(10);
    const q   = String.fromCharCode(34);
    const esc = v => q+String(v||"").split(q).join(q+q)+q;
    const hdr = ["Client Name","Phone","Member Since","Pet Name","Breed","Cycle","Baths","Bath 1","Bath 2","Bath 3","Free Bath","Grooms","Groom 1","Groom 2","Groom 3","Groom 4","Groom 5","Groom 6","Groom 7","Free Groom","Status"];
    const lines = [hdr.map(esc).join(",")];
    clients.filter(c=>!c.deleted).forEach(c=>{
      (c.pets||[]).forEach(p=>{
        const card=p.card||{};
        const arcs=card.archivedCycles||[];
        const tot=arcs.length+1;
        const mkRow=(bs,gs,lbl)=>{
          const pb=(bs||[]).filter(s=>!s.isFree);
          const pg=(gs||[]).filter(s=>!s.isFree);
          const fb=(bs||[]).find(s=>s.isFree);
          const fg=(gs||[]).find(s=>s.isFree);
          const st=fb?.date||fg?.date?"FREE READY":lbl.includes("completed")?"Completed":"Active";
          return [c.name,c.phone,c.memberSince||"",p.name,p.breed,lbl,pb.length,pb[0]?.date||"",pb[1]?.date||"",pb[2]?.date||"",fb?.date||"",pg.length,pg[0]?.date||"",pg[1]?.date||"",pg[2]?.date||"",pg[3]?.date||"",pg[4]?.date||"",pg[5]?.date||"",pg[6]?.date||"",fg?.date||"",st].map(esc).join(",");
        };
        arcs.forEach((cy,i)=>lines.push(mkRow(cy.baths,cy.grooms,"Cycle "+(i+1)+" of "+tot+" (completed)")));
        lines.push(mkRow(card.baths,card.grooms,"Cycle "+tot+" of "+tot+" (current)"));
      });
    });
    const blob=new Blob([lines.join(nl)],{type:"text/csv"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download="suds-n-bones-"+new Date().toISOString().slice(0,10)+".csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSearch = v => { setSearch(v); setPage(0); };
  const handleLetter = v => { setActiveLetter(v); setPage(0); setSearch(""); };

  const active   = clients.filter(c=>!c.deleted);
  const archived = clients.filter(c=>c.deleted);

  const filtered = active.filter(c=>
    (activeLetter==="ALL"||(c.name||"").toUpperCase().startsWith(activeLetter)) &&
    (fmt(c.name).includes(fmt(search))||fmt(c.phone).includes(fmt(search))||
     c.pets.some(p=>fmt(p.name).includes(fmt(search))||fmt(p.breed).includes(fmt(search))))
  );

  const totalPages  = Math.ceil(filtered.length/PAGE_SIZE)||1;
  const pageClients = filtered.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);
  const letters     = ["ALL",..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")].filter(l=>
    l==="ALL"||active.some(c=>(c.name||"").toUpperCase().startsWith(l))
  );

if (!authed) {
  const check = () => {
    if (pwInput === TEMP_PASSWORD) {
      sessionStorage.setItem("snb_authed", "1");
      setAuthed(true);
    } else {
      alert("Incorrect password.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f0f", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
      <img src={LOGO_SRC} alt="SNB" style={{ width: 100, height: 100, objectFit: "contain" }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <input type="password" placeholder="Enter password" autoFocus value={pwInput} onChange={e => setPwInput(e.target.value)}
          style={{ background: "#061414", border: "1px solid #0cc0df", borderRadius: 8, color: "#fff", fontSize: 14, padding: "10px 16px", outline: "none", fontFamily: "monospace", width: 220, textAlign: "center" }}
          onKeyDown={e => e.key === "Enter" && check()} />
        <button onClick={check}
          style={{ background: "linear-gradient(135deg,#0cc0df,#4edee4)", border: "none", color: "#000", borderRadius: 8, padding: "8px 24px", cursor: "pointer", fontSize: 12, fontWeight: 800, fontFamily: "monospace", letterSpacing: 2 }}>
          ENTER
        </button>
      </div>
    </div>
  );
}
  
  if (loading) return (
    <div style={{minHeight:"100vh",background:"#0a0f0f",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20}}>
      <img src={LOGO_SRC} alt="SNB" style={{width:130,height:130,objectFit:"contain"}} />
      <span style={{color:"#0cc0df",fontFamily:"monospace",letterSpacing:4,fontSize:12}}>LOADING...</span>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#0a0f0f",color:"#fff"}}>
      <div style={{background:"#000",borderBottom:"2px solid #0cc0df",padding:"0 14px",display:"flex",alignItems:"center",justifyContent:"space-between",height:64,position:"sticky",top:0,zIndex:20}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <img src={LOGO_SRC} alt="SNB" style={{width:44,height:44,objectFit:"contain"}} />
          <div>
            <div style={{fontSize:19,fontWeight:900,letterSpacing:1,fontFamily:"monospace",background:"linear-gradient(90deg,#4edee4,#0cc0df)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1.1}}>SUDS N&#39; BONES</div>
            <div style={{fontSize:9,color:"#6ababa",fontFamily:"monospace",letterSpacing:3}}>GROOMING PARLOR &#183; VIP TRACKER</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={exportCSV} style={{background:"transparent",border:"1px solid #0cc0df44",color:"#4edee4",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:11,fontFamily:"monospace",letterSpacing:1,fontWeight:800,whiteSpace:"nowrap"}}>&#11015; EXPORT</button>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:20,fontWeight:800,color:"#4edee4",fontFamily:"monospace"}}>{active.length}</div>
            <div style={{fontSize:9,color:"#6ababa",fontFamily:"monospace",letterSpacing:1}}>CLIENTS</div>
          </div>
          <img src={MASCOT_SRC} alt="mascot" style={{height:46,width:"auto",objectFit:"contain"}} />
        </div>
      </div>

      <div style={{padding:"16px",maxWidth:860,margin:"0 auto"}}>
        {selected ? (
          <ClientDetail client={selected} onUpdate={updateClient} onBack={()=>setSelected(null)} onDelete={()=>deleteClient(selected.id)} />
        ) : (
          <>
            <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
              <div style={{flex:1,position:"relative"}}>
                <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:14,color:"#6ababa"}}>&#128269;</span>
                <input value={search} onChange={e=>handleSearch(e.target.value)} placeholder="Search by client, phone, pet name, or breed..." style={{...inp,paddingLeft:36,fontSize:14,background:"#060f0f"}} />
              </div>
              <button onClick={()=>setAdding(true)} style={{background:"linear-gradient(135deg,#0cc0df,#4edee4)",border:"none",color:"#000",borderRadius:10,padding:"0 18px",cursor:"pointer",fontWeight:900,fontSize:14,letterSpacing:1,fontFamily:"monospace",whiteSpace:"nowrap"}}>+ NEW CLIENT</button>
            </div>

            {adding&&(
              <div style={{background:"#060f0f",border:"1px solid #0cc0df33",borderRadius:14,padding:"14px 18px",marginBottom:14,display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
                <div style={{flex:1,minWidth:130}}>
                  <label style={{fontSize:11,color:"#6ababa",display:"block",marginBottom:4,fontFamily:"monospace",letterSpacing:1.5}}>CLIENT NAME *</label>
                  <input autoFocus value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addClient()} placeholder="Full Name" style={inp} />
                </div>
                <div style={{flex:1,minWidth:110}}>
                  <label style={{fontSize:11,color:"#6ababa",display:"block",marginBottom:4,fontFamily:"monospace",letterSpacing:1.5}}>PHONE</label>
                  <input value={newPhone} onChange={e=>setNewPhone(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addClient()} placeholder="(555) 000-0000" style={inp} />
                </div>
                <div style={{minWidth:140}}>
                  <label style={{fontSize:11,color:"#6ababa",display:"block",marginBottom:4,fontFamily:"monospace",letterSpacing:1.5}}>MEMBER SINCE</label>
                  <input type="date" value={newMemberSince} onChange={e=>setNewMemberSince(e.target.value)} style={inp} />
                </div>
                <button onClick={addClient} style={{background:"linear-gradient(135deg,#0cc0df,#4edee4)",border:"none",color:"#000",borderRadius:10,padding:"9px 18px",cursor:"pointer",fontWeight:900,fontFamily:"monospace",letterSpacing:1}}>ADD &#8594;</button>
                <button onClick={()=>setAdding(false)} style={{background:"transparent",border:"1px solid #2a5555",color:"#5a9a9a",borderRadius:10,padding:"9px 14px",cursor:"pointer",fontSize:13}}>&#10005;</button>
              </div>)}

            <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:12}}>
              {letters.map(l=>(
                <button key={l} onClick={()=>handleLetter(l)} style={{
                  background:activeLetter===l?"linear-gradient(135deg,#0cc0df,#4edee4)":"#060f0f",
                  border:"1px solid "+(activeLetter===l?"#0cc0df":"#1a3333"),
                  color:activeLetter===l?"#000":"#6ababa",
                  borderRadius:6,padding:l==="ALL"?"4px 10px":"4px 7px",
                  cursor:"pointer",fontSize:l==="ALL"?10:12,
                  fontWeight:800,fontFamily:"monospace",minWidth:l==="ALL"?40:28,
                  transition:"all 0.15s",
                }}>{l}</button>))}
            </div>

            {filtered.length>0&&(
              <div style={{fontSize:11,color:"#3a6060",fontFamily:"monospace",marginBottom:10,letterSpacing:1}}>
                SHOWING {page*PAGE_SIZE+1}&#8211;{Math.min((page+1)*PAGE_SIZE,filtered.length)} OF {filtered.length} CLIENT{filtered.length!==1?"S":""}
                {activeLetter!=="ALL"?" · "+activeLetter:""}
              </div>)}

            {filtered.length===0 ? (
              <div style={{textAlign:"center",paddingTop:60}}>
                <img src={MASCOT_SRC} alt="mascot" style={{width:110,height:"auto",objectFit:"contain",opacity:0.4}} />
                <div style={{marginTop:16,color:"#3a7070",fontFamily:"monospace",letterSpacing:3,fontSize:12}}>
                  {search||activeLetter!=="ALL"?"NO RESULTS FOUND":"NO CLIENTS YET"}
                </div>
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {pageClients.map(c=>{
                  const punches=c.pets.reduce((a,p)=>a+p.card.baths.filter(s=>s.date).length+p.card.grooms.filter(s=>s.date).length,0);
                  const hasFree=c.pets.some(p=>p.card.baths[3]?.date||p.card.grooms[7]?.date);
                  const ms=c.memberSince||c.membership||"";
                  return (
                    <div key={c.id} onClick={()=>setSelected(c)}
                      style={{background:"#070f0f",border:"1px solid "+(hasFree?"#0cc0df55":"#0f2020"),borderRadius:12,padding:"12px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:12,transition:"all 0.15s"}}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor="#0cc0df88";e.currentTarget.style.background="#0a1818";}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor=hasFree?"#0cc0df55":"#0f2020";e.currentTarget.style.background="#070f0f";}}>
                      <div style={{width:38,height:38,borderRadius:"50%",background:"linear-gradient(135deg,#0cc0df22,#4edee411)",border:"1px solid #0cc0df33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0,fontWeight:700,color:"#4edee4"}}>
                        {c.name?.[0]?.toUpperCase()||"?"}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                          <span style={{fontSize:16,fontWeight:800,color:"#fff"}}>{c.name||<span style={{color:"#4a8a8a"}}>Unnamed</span>}</span>
                          {hasFree&&<span style={{fontSize:9,fontWeight:800,background:"linear-gradient(90deg,#0cc0df,#4edee4)",color:"#000",borderRadius:20,padding:"2px 8px",fontFamily:"monospace"}}>FREE SERVICE &#9733;</span>}
                        </div>
                        <div style={{fontSize:13,color:"#5a9a9a",fontFamily:"monospace",marginTop:2}}>
                          {c.phone||"No phone"} &#183; {c.pets.length} pet{c.pets.length!==1?"s":""}{c.pets.some(p=>p.name)?": "+c.pets.map(p=>p.name||"?").join(", "):""}
                          {ms&&<span style={{marginLeft:6,color:"#3a7070"}}>&#183; since {fmtDateOnly(ms)}</span>}
                        </div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        <div style={{fontSize:20,fontWeight:900,fontFamily:"monospace",color:punches>0?"#0cc0df":"#2a5555"}}>{punches}</div>
                        <div style={{fontSize:10,color:"#4a8a8a",fontFamily:"monospace",letterSpacing:1}}>PUNCHES</div>
                      </div>
                      <span style={{color:"#2a5555",fontSize:16}}>&#8250;</span>
                    </div>);})}
              </div>)}

            {totalPages>1&&(
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginTop:16,flexWrap:"wrap"}}>
                <button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0} style={{background:page===0?"#060f0f":"#061a1a",border:"1px solid #1a3333",color:page===0?"#2a4444":"#4edee4",borderRadius:8,padding:"8px 16px",cursor:page===0?"not-allowed":"pointer",fontSize:12,fontFamily:"monospace",fontWeight:800,letterSpacing:1}}>&#8592; PREV</button>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center"}}>
                  {Array.from({length:totalPages},(_,i)=>(
                    <button key={i} onClick={()=>setPage(i)} style={{background:page===i?"linear-gradient(135deg,#0cc0df,#4edee4)":"#060f0f",border:"1px solid "+(page===i?"#0cc0df":"#1a3333"),color:page===i?"#000":"#6ababa",borderRadius:6,padding:"6px 10px",cursor:"pointer",fontSize:11,fontFamily:"monospace",fontWeight:800,minWidth:32}}>{i+1}</button>))}
                </div>
                <button onClick={()=>setPage(p=>Math.min(totalPages-1,p+1))} disabled={page===totalPages-1} style={{background:page===totalPages-1?"#060f0f":"#061a1a",border:"1px solid #1a3333",color:page===totalPages-1?"#2a4444":"#4edee4",borderRadius:8,padding:"8px 16px",cursor:page===totalPages-1?"not-allowed":"pointer",fontSize:12,fontFamily:"monospace",fontWeight:800,letterSpacing:1}}>NEXT &#8594;</button>
              </div>)}

            {archived.length>0&&!search&&activeLetter==="ALL"&&(
              <div style={{marginTop:24}}>
                <div style={{fontSize:10,letterSpacing:2,color:"#3a5555",fontFamily:"monospace",marginBottom:10}}>&#128193; ARCHIVED ({archived.length}) &#8212; tap to restore</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {archived.map(c=>(
                    <div key={c.id} style={{background:"#060c0c",border:"1px solid #0f1e1e",borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,opacity:0.6}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:14,fontWeight:700,color:"#4a7a7a"}}>{c.name}</div>
                        <div style={{fontSize:11,color:"#2a4a4a",fontFamily:"monospace"}}>{c.phone} &#183; archived {c.deletedAt?new Date(c.deletedAt).toLocaleDateString():""}</div>
                      </div>
                      <button onClick={()=>persist(clients.map(x=>x.id===c.id?{...x,deleted:false,deletedAt:null}:x))} style={{background:"#061a1a",border:"1px solid #0cc0df44",color:"#4edee4",borderRadius:8,padding:"5px 12px",cursor:"pointer",fontSize:10,fontFamily:"monospace",letterSpacing:1,flexShrink:0}}>RESTORE</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <div style={{textAlign:"center",padding:"20px 0 30px",borderTop:"1px solid #080f0f",marginTop:20}}>
        <img src={LOGO_SRC} alt="SNB" style={{width:38,height:38,objectFit:"contain"}} />
        <div style={{fontSize:9,color:"#3a7070",fontFamily:"monospace",letterSpacing:2,marginTop:6}}>SUDS N&#39; BONES &#183; VIP LOYALTY SYSTEM</div>
      </div>
    </div>
  );
}
