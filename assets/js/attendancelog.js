lucide.createIcons();

let allData = [];
let ts;
const CACHE_KEY_ATT = "attendance_cache_v1";


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

    if(parsed && isCacheValid(parsed.time)){
      buildEMS(parsed.data || []);
      return;
    }
  }

  try {
    const res = await fetch(SCRIPT_URL + "?action=getEMS");
    const data = await res.json();
    const safeData = data || [];

    localStorage.setItem(CACHE_KEY_EMS, JSON.stringify({
      data: safeData,
      time: Date.now()
    }));

    buildEMS(safeData);
  } catch(e){
    console.error("Gagal fetch EMS:", e);
    const fallback = localStorage.getItem(CACHE_KEY_EMS);
    if(fallback){
      try {
        const parsed = JSON.parse(fallback);
        buildEMS(parsed.data || []);
      } catch(err){
        buildEMS([]);
      }
    } else {
      buildEMS([]);
    }
  }
}

function buildEMS(data){
  const select = document.getElementById("searchEMS");
  select.innerHTML = "";

  data
    .filter(d => d.nama && d.nama.trim().toUpperCase() !== "NAMA")
    .sort((a,b)=>a.nama.localeCompare(b.nama))
    .forEach(d=>{
      let clean = d.nama.trim();
      let opt = document.createElement("option");
      opt.value = clean;
      opt.textContent = clean;
      select.appendChild(opt);
    });

  ts = new TomSelect("#searchEMS",{
    create: false,
    items: [],
    sortField: [{ field: "text", direction: "asc" }],
    placeholder: "Cari nama EMS...",
    dropdownParent: "body",
    onChange: function(value){
      localStorage.setItem("ems_name", value);
      render(value);
    }
  });

  const saved = localStorage.getItem("ems_name");
  if(saved){
    setTimeout(()=>{
      ts.setValue(saved);
    },100);
  }
}

async function loadData(){
  const cached = localStorage.getItem(CACHE_KEY_ATT);

  if(cached){
    let parsed = null;
    try {
      parsed = JSON.parse(cached);
    } catch(e){
      console.warn("Cache rusak, dihapus");
      localStorage.removeItem(CACHE_KEY_ATT);
    }

    if(parsed && isCacheValid(parsed.time)){
      allData = parsed.data || [];
      requestAnimationFrame(() => render());
      refreshFromServer();
      return;
    }
  }

  try {
    const res = await fetch(SCRIPT_URL + "?action=getAttendanceLogAll");
    const data = await res.json();
    allData = data || [];

    localStorage.setItem(CACHE_KEY_ATT, JSON.stringify({
      data: allData,
      time: Date.now()
    }));

    const oldMsg = document.getElementById("attendance-error-msg");
    if(oldMsg) oldMsg.remove();

  } catch(e){
    console.error("Gagal fetch server:", e);
    const fallback = localStorage.getItem(CACHE_KEY_ATT);
    if(fallback){
      try {
        const parsed = JSON.parse(fallback);
        allData = parsed.data || [];
        showAttendanceStatusMessage("⚠️ Gagal terhubung ke server. Menampilkan data cadangan terakhir (Offline).", "#f59e0b");
      } catch(err) {
        allData = [];
      }
    } else {
      allData = [];
    }

    if(allData.length === 0) {
      showAttendanceTableError();
    }
  }
  render();
}

async function refreshFromServer(){
  try{
    const res = await fetch(SCRIPT_URL+"?action=getAttendanceLogAll");
    const fresh = await res.json();

    localStorage.setItem(CACHE_KEY_ATT, JSON.stringify({
      data: fresh,
      time: Date.now()
    }));

    allData = fresh;

    const oldMsg = document.getElementById("attendance-error-msg");
    if(oldMsg) oldMsg.remove();

    requestAnimationFrame(() => {
        render();
    });
  } catch(e){
    console.log("sync gagal, pakai cache");
    showAttendanceStatusMessage("⚠️ Gagal sinkronisasi data terbaru. Menampilkan data offline.", "#f59e0b");
  }
}

function showAttendanceStatusMessage(msg, color) {
  let oldMsg = document.getElementById("attendance-error-msg");
  if(oldMsg) oldMsg.remove();
  
  const div = document.createElement("div");
  div.id = "attendance-error-msg";
  div.style.color = color;
  div.style.textAlign = "center";
  div.style.fontSize = "13px";
  div.style.fontWeight = "600";
  div.style.marginTop = "15px";
  div.innerText = msg;
  
  const container = document.querySelector(".card");
  if(container) container.appendChild(div);
}

function showAttendanceTableError() {
  const tbody = document.getElementById("tbody");
  if(tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty" style="color: #ef4444; padding: 40px !important; text-align: center;">
          <i data-lucide="alert-triangle" style="width: 24px; height: 24px; margin: 0 auto 10px auto; display: block;"></i>
          Gagal memuat data absensi dari server. Silakan periksa koneksi internet Anda atau hubungi admin.
        </td>
      </tr>
    `;
  }
  
  if(document.getElementById("weekHours")) document.getElementById("weekHours").innerText = "-";
  if(document.getElementById("monthHours")) document.getElementById("monthHours").innerText = "-";
  if(document.getElementById("topDuty")) document.getElementById("topDuty").innerText = "-";
  
  if(window.lucide) lucide.createIcons();
}

function parseDuration(str){
    if(!str) return 0;
    str = String(str).trim().toLowerCase();

    if(str.includes(":")){
        const p = str.split(":");
        if(p.length === 3){
            return (+p[0]*3600) + (+p[1]*60) + (+p[2]);
        }
    }

    let h = 0, m = 0, s = 0;
    const hMatch = str.match(/(\d+)\s*h/);
    const mMatch = str.match(/(\d+)\s*m/);
    const sMatch = str.match(/(\d+)\s*s/);

    if(hMatch) h = +hMatch[1];
    if(mMatch) m = +mMatch[1];
    if(sMatch) s = +sMatch[1];

    return (h * 3600) + (m * 60) + s;
}

function safeDate(v){
    if(!v) return new Date(0);
    if(v instanceof Date) return v;
    return new Date(v);
}

function getWeekRange(){
    const d = new Date();
    const day = d.getDay();
    const start = new Date(d);
    start.setDate(d.getDate()-day);
    start.setHours(0,0,0,0);

    const end = new Date(start);
    end.setDate(start.getDate()+6);
    end.setHours(23,59,59,999);

    return {start,end};
}

function render(selectedName){	
    const name = (selectedName || ts?.getValue() || "").toString().trim();
	
    if(!name){
        document.getElementById("tbody").innerHTML =
        `<tr><td colspan="5" class="empty">Pilih EMS terlebih dahulu</td></tr>`;
        return;
    }
	
    const normalize = (s) =>
      (s || "")
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g,'')
        .replace(/\s+/g,' ')
        .trim();
	
    const filtered = allData.filter(i =>
      normalize(i["Nama"]) === normalize(name)
    );
	
    const {start,end} = getWeekRange();

    const week = filtered.filter(i=>{
        const t = safeDate(i["Start"]);
        return t>=start && t<=end;
    });

    let total = 0;
    week.forEach(i=>{
        total += parseDuration(i["Durasi"]);
    });

    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);

    document.getElementById("weekHours").innerText = `${hours}h ${minutes}m`;
		
    const now = new Date();
    const month = filtered.filter(i=>{
        const t = safeDate(i["Start"]);
        return t.getMonth() === now.getMonth() &&
               t.getFullYear() === now.getFullYear();
    });
	
    let monthTotal = 0;
    month.forEach(i=>{
        monthTotal += parseDuration(i["Durasi"]);
    });

    const mHours = Math.floor(monthTotal / 3600);
    const mMinutes = Math.floor((monthTotal % 3600) / 60);

    document.getElementById("monthHours").innerText = `${mHours}h ${mMinutes}m`;
	
    const lastDuty = filtered.length
        ? [...filtered]
            .filter(i => i["Finish"])
            .sort((a,b)=> safeDate(b["Finish"]) - safeDate(a["Finish"]))[0]
        : null;
	
    document.getElementById("topDuty").innerText =
    lastDuty && lastDuty["Finish"]
        ? lastDuty["Finish"].replace("T", " ")
        : "-";

    document.getElementById("tbody").innerHTML =
    week.length ? week.map((i, idx)=>`	
        <tr>
            <td>${idx + 1}</td>
            <td>${i["Nama"]}</td>
            <td>${i["Start"]}</td>
            <td>${i["Finish"]}</td>
            <td>${i["Durasi"]}</td>
        </tr>
    `).join("") : `
    <tr><td colspan="5" class="empty">Tidak ada data minggu ini</td></tr>`;
}

document.addEventListener("DOMContentLoaded", async ()=>{
    await loadEMS();
    await loadData();
});