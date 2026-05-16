import { useState, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, deleteDoc } from "firebase/firestore";

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

// ── CSV Parser ────────────────────────────────────────────────────────────────
function parseDate(d) {
  d = String(d||"").trim().replace(/\s/g,"");
  if (!d) return "";
  const parts = d.split("/");
  if (parts.length === 3) {
    let [m, day, yr] = parts;
    yr = yr.slice(0,4);
    if (yr.length === 2) yr = "20" + yr;
    try { return new Date(m+"/"+day+"/"+yr).toISOString().slice(0,10); } catch {}
  }
  return "";
}

function makeBathSlots() {
  return [
    {label:"Bath 1",   date:"",isFree:false},
    {label:"Bath 2",   date:"",isFree:false},
    {label:"Bath 3",   date:"",isFree:false},
    {label:"FREE Bath",date:"",isFree:true},
  ];
}
function makeGroomSlots() {
  return [
    {label:"Groom 1",date:"",type:"",isFree:false},
    {label:"Groom 2",date:"",type:"",isFree:false},
    {label:"Groom 3",date:"",type:"",isFree:false},
    {label:"Groom 4",date:"",type:"",isFree:false},
    {label:"Groom 5",date:"",type:"",isFree:false},
    {label:"Groom 6",date:"",type:"",isFree:false},
    {label:"Groom 7",date:"",type:"",isFree:false},
    {label:"FREE Groom",date:"",type:"",isFree:true},
  ];
}

function parseServices(services) {
  let bathSlots  = makeBathSlots();
  let groomSlots = makeGroomSlots();
  const archived = [];
  let bIdx = 0, gIdx = 0;

  for (const svcRaw of services) {
    const s = String(svcRaw).trim().toLowerCase();
    if (!s || s === "service") continue;
    const isFree = s.includes("free");
    const sClean = s.replace(/free\s*/g,"").replace(/\(.*?\)/g,"").trim();
    const m = sClean.match(/^([a-z]+)\s*\*?\s*([\d/]+.*)/);
    let svcType = "", dateRaw = "";
    if (m) { svcType = m[1]; dateRaw = m[2].replace(/\*/g,"").trim(); }
    else { dateRaw = sClean; }
    const parsedDate = parseDate(dateRaw);
    if (!parsedDate) continue;
    const gtype = s.includes("fh") ? "FH" : s.includes("mt") ? "MT" : "";
    const isBath  = svcType === "bb" || (!svcType && s.includes("bb"));
    const isGroom = svcType === "fh" || svcType === "mt" || gtype !== "";

    if (isBath) {
      if (bIdx < 3)      { bathSlots[bIdx].date = parsedDate; bIdx++; }
      else if (bIdx === 3) { bathSlots[3].date = parsedDate; bIdx++; }
      if (bIdx >= 4) {
        archived.push({baths:bathSlots, grooms:[], date:parsedDate});
        bathSlots = makeBathSlots(); bIdx = 0;
      }
    } else if (isGroom) {
      if (gIdx < 7)      { groomSlots[gIdx].date = parsedDate; groomSlots[gIdx].type = gtype; gIdx++; }
      else if (gIdx === 7) { groomSlots[7].date = parsedDate; groomSlots[7].type = gtype; gIdx++; }
      if (gIdx >= 8) {
        archived.push({baths:[], grooms:groomSlots, date:parsedDate});
        groomSlots = makeGroomSlots(); gIdx = 0;
      }
    }
  }
  return {baths:bathSlots, grooms:groomSlots, archivedCycles:archived};
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const rows  = lines.map(line => {
    const cells = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === "\"" && !inQ) { inQ = true; continue; }
      if (ch === "\"" && inQ)  { inQ = false; continue; }
      if (ch === "," && !inQ)   { cells.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    cells.push(cur.trim());
    return cells;
  });

  const clients = [];
  let current = null;
  let clientNum = 0;

  for (let ri = 1; ri < rows.length; ri++) {
    const row = rows[ri];
    if (!row.some(c => c)) continue;
    const clientName = (row[0]||"").trim();
    const phone      = (row[1]||"").trim();
    const membRaw    = (row[2]||"").trim();
    const petName    = (row[3]||"").trim();
    const breed      = (row[4]||"").trim();
    const services   = row.slice(5).filter(s => s.trim());

    let memberSince = "";
    if (membRaw) {
      const exp = parseDate(membRaw);
      if (exp) {
        try {
          const d = new Date(exp);
          d.setFullYear(d.getFullYear() - 1);
          memberSince = d.toISOString().slice(0,10);
        } catch {}
      }
    }

    if (clientName) {
      clientNum++;
      current = {id: clientNum * 1000, name: clientName, phone, memberSince, pets: []};
      clients.push(current);
    }
    if (!current || !petName) continue;
    const petId = current.id + current.pets.length + 1;
    const card  = parseServices(services);
    current.pets.push({id: petId, name: petName, breed, card});
  }
  return clients;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Migrate() {
  const [logs,    setLogs]    = useState([{msg:"Ready. Choose your CSV file to get started.", cls:"info"}]);
  const [clients, setClients] = useState(null);
  const [running, setRunning] = useState(false);
  const [done,    setDone]    = useState(false);
  const fileRef = useRef(null);

  const addLog = (msg, cls="info") => setLogs(prev => [...prev, {msg, cls}]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogs([{msg:"Reading file: " + file.name, cls:"info"}]);
    setClients(null);
    setDone(false);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseCSV(ev.target.result);
        setClients(parsed);
        addLog("Parsed " + parsed.length + " clients successfully!", "ok");
        const totalPets = parsed.reduce((a,c)=>a+c.pets.length,0);
        addLog("Total pets: " + totalPets, "info");
        addLog("Ready to upload. Tap the button below.", "info");
      } catch(err) {
        addLog("Error parsing CSV: " + err.message, "err");
      }
    };
    reader.readAsText(file);
  };

  const upload = async () => {
    if (!clients) return;
    setRunning(true);
    addLog("Connecting to Firebase...");
    try {
      const ref = doc(_db, "vip", "clients");
      addLog("Clearing old data...");
      await deleteDoc(ref);
      addLog("Old data cleared!", "ok");
      addLog("Uploading " + clients.length + " clients...");
      await setDoc(ref, {list: clients});
      addLog("All " + clients.length + " clients uploaded!", "ok");
      addLog("MIGRATION COMPLETE!", "done");
      setDone(true);
    } catch(err) {
      addLog("Error: " + err.message, "err");
      setRunning(false);
    }
  };

  const colors = {info:"#6ababa", ok:"#4edee4", err:"#ff6b6b", done:"#ffd700"};

  return (
    <div style={{minHeight:"100vh",background:"#0a0f0f",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"monospace"}}>
      <img src="/logo.png" alt="SNB" style={{width:80,height:80,objectFit:"contain",marginBottom:16}} />
      <div style={{fontSize:18,fontWeight:900,letterSpacing:3,color:"#4edee4",marginBottom:4}}>SNB MIGRATION TOOL</div>
      <div style={{fontSize:11,color:"#6ababa",letterSpacing:2,marginBottom:24,textAlign:"center"}}>Upload any CSV file to update Firebase</div>

      {/* File picker */}
      {!done && (
        <div style={{marginBottom:16,display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFile}
            style={{display:"none"}} id="csvFile" />
          <label htmlFor="csvFile" style={{
            background:"#061a1a",border:"2px dashed #0cc0df",color:"#4edee4",
            borderRadius:12,padding:"14px 28px",cursor:"pointer",
            fontWeight:800,fontSize:13,letterSpacing:1,fontFamily:"monospace",
            textAlign:"center",
          }}>
            &#128196; CHOOSE CSV FILE
          </label>
          {clients && !running && (
            <button onClick={upload} style={{
              background:"linear-gradient(135deg,#0cc0df,#4edee4)",
              border:"none",color:"#000",borderRadius:12,
              padding:"14px 32px",cursor:"pointer",
              fontWeight:900,fontSize:14,letterSpacing:2,fontFamily:"monospace",
            }}>
              &#128228; UPLOAD {clients.length} CLIENTS TO FIREBASE
            </button>
          )}
          {running && (
            <div style={{color:"#4edee4",fontFamily:"monospace",letterSpacing:2,fontSize:12}}>UPLOADING...</div>
          )}
        </div>
      )}

      {done && (
        <a href="/" style={{
          background:"linear-gradient(135deg,#0cc0df,#4edee4)",
          color:"#000",borderRadius:12,padding:"14px 32px",
          fontWeight:900,fontSize:14,letterSpacing:2,fontFamily:"monospace",
          marginBottom:16,textDecoration:"none",display:"inline-block",
        }}>OPEN VIP TRACKER &#8594;</a>
      )}

      {/* Log */}
      <div style={{background:"#060f0f",border:"1px solid #1a3333",borderRadius:12,padding:16,width:"100%",maxWidth:500,maxHeight:280,overflowY:"auto",marginTop:8}}>
        {logs.map((l,i)=>(
          <div key={i} style={{color:colors[l.cls]||"#6ababa",fontSize:12,lineHeight:1.8}}>
            {l.cls==="done"?"&#127881; ":l.cls==="ok"?"&#10003; ":l.cls==="err"?"&#10060; ":"&#128062; "}{l.msg}
          </div>
        ))}
      </div>

      <div style={{marginTop:20,fontSize:10,color:"#2a4444",textAlign:"center",maxWidth:400,lineHeight:1.6}}>
        CSV format: Client Name, Phone, Membership Expiration, Pet Name, Breed, then service dates (fh, mt, bb + date)
      </div>
    </div>
  );
}
