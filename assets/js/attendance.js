lucide.createIcons();
let emsData={};
let currentUser=null;

const preventClose = (e) => { 
  e.preventDefault(); 
  e.returnValue = 'Proses sedang berjalan, jangan tutup halaman ini!'; 
};

setInterval(()=>{
  const now = new Date(
   new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
  );
  document.getElementById("clock-time").innerText=
    now.toLocaleTimeString("id-ID",{hour12:false});
  document.getElementById("clock-date").innerText=
    now.toLocaleDateString("id-ID",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
},1000);

function setStatus(type,text){
  const el=document.getElementById("status");
  el.className="status-box";
  el.innerText=text;

  if(type==="on") el.classList.add("badge-on");
  else if(type==="loading") el.classList.add("badge-loading","loading");
  else el.classList.add("badge-off");
}

function setDutyBtn(state,text){
  const btn=document.getElementById("duty-btn");
  btn.dataset.state=state;
  btn.className="duty-btn";

  if(state==="start"){
    btn.classList.add("state-start");
    btn.disabled=false;
    btn.innerText=text || "START DUTY";
  } else if(state==="finish"){
    btn.classList.add("state-finish");
    btn.disabled=false;
    btn.innerText=text || "FINISH DUTY";
  } else if(state==="processing"){
    btn.classList.add(btn.dataset.prevState==="finish" ? "state-finish" : "state-start");
    btn.disabled=true;
    btn.innerText=text || "PROCESSING...";
  }
}

function handleDutyClick(){
  const btn=document.getElementById("duty-btn");
  if(btn.dataset.state==="finish"){
    finishDuty();
  } else {
    startDuty();
  }
}

async function loadEMS(){
  const cached = localStorage.getItem(CACHE_KEY_EMS);

  if(cached){
    let parsed = null;
    try {
      parsed = JSON.parse(cached);
    } catch(e){
      console.warn("Cache EMS rusak, dihapus");
      localStorage.removeItem(CACHE_KEY_EMS);
    }

    if(parsed && parsed.data && Array.isArray(parsed.data) && parsed.data.length){
      buildEMSData(parsed.data);

      if(isCacheValid(parsed.time)){
        refreshEMSFromServer();
        return;
      }
    }
  }

  await refreshEMSFromServer();
}

async function refreshEMSFromServer(){
  try {
    const res = await fetch(SCRIPT_URL + "?action=getEMS");
    const data = await res.json();
    const safeData = Array.isArray(data) ? data : [];

    localStorage.setItem(CACHE_KEY_EMS, JSON.stringify({
      data: safeData,
      time: Date.now()
    }));

    buildEMSData(safeData);
  } catch(err){
    console.error("EMS gagal sinkronisasi dari server:", err);
    const fallback = localStorage.getItem(CACHE_KEY_EMS);
    if(fallback && Object.keys(emsData).length === 0){
      try {
        const parsed = JSON.parse(fallback);
        buildEMSData(parsed.data || []);
      } catch(e){
        buildEMSData([]);
      }
    }
  }
}

function buildEMSData(emsList){
  emsData = {};

  emsList
    .filter(u => u && u.nama && u.nama.trim().toUpperCase() !== "NAMA")
    .forEach(u=>{
      const namaTrimmed = u.nama.trim();
      emsData[namaTrimmed] = u;
    });

  applySessionIdentity();
}

async function applySessionIdentity(){
  if (!window.__guardSession) return;
  const session = await window.__guardSession;
  if (!session || !session.nama) return;

  const nama = session.nama.trim();

  if(!emsData[nama]){
    document.getElementById("nama").innerText = nama + " (data EMS tidak ditemukan)";
    setStatus("off","DATA EMS TIDAK DITEMUKAN");
    return;
  }

  currentUser = nama;
  document.getElementById("nama").innerText = nama;
  document.getElementById("jabatan").innerText = emsData[nama].jabatan || "";
  document.getElementById("divisi").innerText = emsData[nama].divisi || "";

  checkSession(nama);
}

async function checkSession(nama){
  try {
    const res=await fetch(SCRIPT_URL+"?action=getActiveSession&nama="+encodeURIComponent(nama));
    const data=await res.json();

    if(data.active){
      setStatus("on","ON DUTY ACTIVE");
      startTimer(data.startTime);
      setDutyBtn("finish");
    }else{
      setStatus("off","OFF DUTY");
      setDutyBtn("start");
    }
  } catch(e) {
    console.error("Gagal memeriksa sesi aktif:", e);
  }
}

let timer;
function startTimer(start){
  clearInterval(timer);

  timer=setInterval(()=>{
    const now = new Date(
	 new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
	);
	const diff = new Date(now).getTime() - new Date(start).getTime();

    const totalSeconds=Math.floor(diff/1000);

    const hours=Math.floor(totalSeconds/3600);
    const minutes=Math.floor((totalSeconds%3600)/60);
    const seconds=totalSeconds%60;

    const format =
      String(hours).padStart(2,"0") + ":" +
      String(minutes).padStart(2,"0") + ":" +
      String(seconds).padStart(2,"0");

    setStatus("on",`ON DUTY • ${format}`);
  },1000);
}

async function startDuty(){
  if(!currentUser) return;

  const btn=document.getElementById("duty-btn");
  btn.dataset.prevState="start";
  setDutyBtn("processing","PROCESSING...");

  window.addEventListener('beforeunload', preventClose);
  setStatus("loading","MEMERIKSA DATA...");

  let freshData;
  try {
    const checkRes = await fetch(SCRIPT_URL + "?action=getEMS");
    const checkList = await checkRes.json();
    const safeCheckList = Array.isArray(checkList) ? checkList : [];

    const found = safeCheckList.find(
      u => u && u.nama && u.nama.trim() === currentUser
    );

    if(!found){
      setStatus("off","Silahkan refresh halaman terlebih dahulu");
      setDutyBtn("start");
      window.removeEventListener('beforeunload', preventClose);
      return;
    }

    freshData = found;

    localStorage.setItem(CACHE_KEY_EMS, JSON.stringify({
      data: safeCheckList,
      time: Date.now()
    }));

    const updatedEmsData = {};
    safeCheckList
      .filter(u => u && u.nama && u.nama.trim().toUpperCase() !== "NAMA")
      .forEach(u => {
        updatedEmsData[u.nama.trim()] = u;
      });
    emsData = updatedEmsData;

  } catch(err){
    console.error("Gagal memeriksa data EMS terbaru:", err);
    setStatus("off","Silahkan refresh halaman terlebih dahulu");
    setDutyBtn("start");
    window.removeEventListener('beforeunload', preventClose);
    return;
  }

  setStatus("loading","STARTING...");

  try {
    const res = await fetch(
      SCRIPT_URL +
      "?action=startDuty" +
      "&nama=" + encodeURIComponent(currentUser) +
      "&jabatan=" + encodeURIComponent(freshData.jabatan || "") +
      "&divisi=" + encodeURIComponent(freshData.divisi || "")
    );

    const result = await res.json();

    if(!result.success){
      setStatus("off", result.message || "FAILED START DUTY");
      setDutyBtn("start");
      return;
    }

    await checkSession(currentUser);

  } catch (err) {
    console.error(err);
    setStatus("off","NETWORK ERROR / API FAILED");
    setDutyBtn("start");
  } finally {
    window.removeEventListener('beforeunload', preventClose);
  }
}

async function finishDuty(){
  if(!currentUser) return;

  const btn=document.getElementById("duty-btn");
  btn.dataset.prevState="finish";
  setDutyBtn("processing","PROCESSING...");

  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  const preventClose = (e) => { e.preventDefault(); e.returnValue = ''; };
  window.addEventListener('beforeunload', preventClose);

  setStatus("loading", "FINISHING...");

  try {
    const res = await fetch(SCRIPT_URL + "?action=finishDuty&nama=" + encodeURIComponent(currentUser));
    const data = await res.json();
    
    setStatus("off", data.message || "DUTY FINISHED");
    setDutyBtn("start");

  } catch(e) {
    console.error(e);

    setStatus("off", "OFF DUTY");
    setDutyBtn("start");
  } finally {
    window.removeEventListener('beforeunload', preventClose);
  }
}

document.addEventListener("DOMContentLoaded", loadEMS);
