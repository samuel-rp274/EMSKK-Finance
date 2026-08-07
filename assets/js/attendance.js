lucide.createIcons();
let currentUser = null;

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

async function applySessionIdentity(){
  if (!window.__guardSession) return;
  const session = await window.__guardSession;
  if (!session || !session.id) {
    setStatus("off","DATA EMS TIDAK DITEMUKAN");
    return;
  }

  currentUser = {
    id: session.id,
    nama: session.nama,
    jabatan: session.jabatan || "",
    divisi: session.divisi || ""
  };

  document.getElementById("nama").innerText = currentUser.nama;
  document.getElementById("jabatan").innerText = currentUser.jabatan;
  document.getElementById("divisi").innerText = currentUser.divisi;

  checkSession();
}

async function checkSession(){
  if (!currentUser) return;
  try {
    const data = await callApi("getActiveSession", { user_id: currentUser.id });

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

  try {
    const session = JSON.parse(localStorage.getItem(LOGIN_KEY));
    const fresh = await callApi("validateSession", { token: session.token });

    if (!fresh.valid) {
      setStatus("off","Silahkan refresh halaman terlebih dahulu");
      setDutyBtn("start");
      window.removeEventListener('beforeunload', preventClose);
      return;
    }

    currentUser.jabatan = fresh.jabatan || "";
    currentUser.divisi = fresh.divisi || "";
    document.getElementById("jabatan").innerText = currentUser.jabatan;
    document.getElementById("divisi").innerText = currentUser.divisi;
  } catch(err){
    console.error("Gagal memeriksa data terbaru:", err);
    setStatus("off","Silahkan refresh halaman terlebih dahulu");
    setDutyBtn("start");
    window.removeEventListener('beforeunload', preventClose);
    return;
  }

  setStatus("loading","STARTING...");

  try {
    const result = await callApi("startDuty", {
      user_id: currentUser.id,
      jabatan: currentUser.jabatan,
      divisi: currentUser.divisi
    });

    if(!result.success){
      setStatus("off", result.message || "FAILED START DUTY");
      setDutyBtn("start");
      return;
    }

    await checkSession();

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

  const preventCloseFinish = (e) => { e.preventDefault(); e.returnValue = ''; };
  window.addEventListener('beforeunload', preventCloseFinish);

  setStatus("loading", "FINISHING...");

  try {
    const data = await callApi("finishDuty", { user_id: currentUser.id });

    setStatus("off", data.message || "DUTY FINISHED");
    setDutyBtn("start");

  } catch(e) {
    console.error(e);

    setStatus("off", "OFF DUTY");
    setDutyBtn("start");
  } finally {
    window.removeEventListener('beforeunload', preventCloseFinish);
  }
}

document.addEventListener("DOMContentLoaded", applySessionIdentity);
