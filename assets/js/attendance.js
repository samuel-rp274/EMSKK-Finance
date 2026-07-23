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
  el.className="status";
  el.innerText=text;

  if(type==="on") el.classList.add("badge-on");
  else if(type==="loading") el.classList.add("badge-loading","loading");
  else el.classList.add("badge-off");
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
    document.getElementById("nama").value = nama + " (data EMS tidak ditemukan)";
    setStatus("off","DATA EMS TIDAK DITEMUKAN");
    return;
  }

  currentUser = nama;
  document.getElementById("nama").value = nama;
  document.getElementById("jabatan").value = emsData[nama].jabatan || "";
  document.getElementById("divisi").value = emsData[nama].divisi || "";

  checkSession(nama);
}

async function checkSession(nama){
  try {
    const res=await fetch(SCRIPT_URL+"?action=getActiveSession&nama="+encodeURIComponent(nama));
    const data=await res.json();

    if(data.active){
      setStatus("on","ON DUTY ACTIVE");
      startTimer(data.startTime);
      document.querySelector(".start").disabled=true;
      document.querySelector(".finish").disabled=false;
    }else{
      setStatus("off","OFF DUTY");
      document.querySelector(".start").disabled=false;
      document.querySelector(".finish").disabled=true;
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

  const startBtn = document.querySelector(".start");
  const finishBtn = document.querySelector(".finish");

  startBtn.disabled = true;
  finishBtn.disabled = true;
  const originalText = startBtn.innerText;
  startBtn.innerText = "PROCESSING...";

  window.addEventListener('beforeunload', preventClose);
  setStatus("loading","STARTING...");

  const data = emsData[currentUser];
  if(!data) {
    startBtn.disabled = false;
    finishBtn.disabled = true;
    startBtn.innerText = originalText;
    window.removeEventListener('beforeunload', preventClose);
    return;
  }

  try {
    const res = await fetch(
      SCRIPT_URL +
      "?action=startDuty" +
      "&nama=" + encodeURIComponent(currentUser) +
      "&jabatan=" + encodeURIComponent(data.jabatan || "") +
      "&divisi=" + encodeURIComponent(data.divisi || "")
    );

    const result = await res.json();

    if(!result.success){
      setStatus("off", result.message || "FAILED START DUTY");
      startBtn.disabled = false;
      finishBtn.disabled = true;
      return;
    }

    await checkSession(currentUser);

  } catch (err) {
    console.error(err);
    setStatus("off","NETWORK ERROR / API FAILED");
    startBtn.disabled = false;
    finishBtn.disabled = true;
  } finally {

    startBtn.innerText = originalText;
    window.removeEventListener('beforeunload', preventClose);
  }
}

async function finishDuty(){
  if(!currentUser) return;

  const startBtn = document.querySelector(".start");
  const finishBtn = document.querySelector(".finish");

  startBtn.disabled = true;
  finishBtn.disabled = true;
  const originalText = finishBtn.innerText;
  finishBtn.innerText = "PROCESSING...";

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

    startBtn.disabled = false;
    finishBtn.disabled = true;

  } catch(e) {
    console.error(e);

    setStatus("off", "OFF DUTY");
    startBtn.disabled = false;
    finishBtn.disabled = true;
  } finally {

    finishBtn.innerText = originalText;
    window.removeEventListener('beforeunload', preventClose);
  }
}

document.addEventListener("DOMContentLoaded", loadEMS);