const CACHE_KEY_ATT = "attendance_cache_v1";

let allAttendance = [];
let rateDivisiCache = {};
let rateJabatanCache = {};
let potonganCache = {};
let rateDivisiMap = {};
let rateJabatanMap = {};
let ratesReady = false;

function safeGet(obj, key){
  if(!obj) return null;
  return obj[key] ?? obj[key?.trim?.()] ?? obj[key?.toUpperCase?.()] ?? obj[key?.toLowerCase?.()] ?? null;
}


async function checkLogin(){
  const pw = document.getElementById("adminPassword").value.trim();
  document.getElementById("loginStatus").innerText = "⏳ Memeriksa tingkat otentikasi...";

  try{
    const res = await fetch(`${SCRIPT_URL}?action=verifyAdmin&password=${encodeURIComponent(pw)}`);
    const data = await res.json();

    if(data.success){
      sessionStorage.setItem(LOGIN_KEY, "true");
      document.getElementById("loginCard").classList.add("hidden");
      document.getElementById("adminPanel").classList.remove("hidden");
      document.getElementById("navbar").style.display = "flex";

      await loadRates();
      await loadAttendanceData();
      requestIdleCallback(refreshFromServer);
    } else {
      document.getElementById("loginStatus").innerText = "❌ Password salah, maksimal 3x salah maka IP akan di block";
    }
  } catch(e){
    document.getElementById("loginStatus").innerText = "❌ Server error, silahkan hubungi FINANCE";
  }
}

async function loadAttendanceData(){
  const cached = localStorage.getItem(CACHE_KEY_ATT);
  if(cached){
    let parsed = null;
    try { parsed = JSON.parse(cached); } catch(e){ localStorage.removeItem(CACHE_KEY_ATT); }
    if(parsed && isCacheValid(parsed.time)){
      allAttendance = parsed.data;
      if(ratesReady && allAttendance.length){ requestAnimationFrame(() => populateWeeks()); }
      setTimeout(() => { if(ratesReady){ refreshFromServer(); } }, 1000);
      return;
    }
  }

  const res = await fetch(SCRIPT_URL+"?action=getAttendanceLogMonthly");
  allAttendance = await res.json();
  localStorage.setItem(CACHE_KEY_ATT, JSON.stringify({ data: allAttendance, time: Date.now() }));
  if(ratesReady && allAttendance.length){ requestAnimationFrame(() => populateWeeks()); }
}

async function refreshFromServer(){
  try{
    const res = await fetch(SCRIPT_URL+"?action=getAttendanceLogMonthly");
    const fresh = await res.json();
    allAttendance = fresh;
    localStorage.setItem(CACHE_KEY_ATT, JSON.stringify({ data: fresh, time: Date.now() }));
    if(ratesReady && allAttendance.length){ requestAnimationFrame(() => populateWeeks()); }
  } catch(e){
    console.log("sync gagal, pakai cache");
  }
}

async function loadRates(){
  const res = await fetch(SCRIPT_URL + "?action=getRatesAPI");
  const data = await res.json();
  if(!data || !data.divisi || !data.jabatan){
    ratesReady = false;
    return;
  }
  mapRates(data);
  ratesReady = true;
  if(allAttendance.length){ requestAnimationFrame(() => populateWeeks()); }
}

function mapRates(data){
  rateDivisiMap = {}; rateJabatanMap = {};
  data.divisi.forEach(r => { rateDivisiMap[String(r[0]).trim().toUpperCase()] = Number(r[1]); });
  data.jabatan.forEach(r => { rateJabatanMap[String(r[0]).trim().toUpperCase()] = Number(r[1]); });
}

function normalizeDate(d){ const x = new Date(d); x.setHours(0,0,0,0); return x; }

function parseWIB(dateStr){
  if(!dateStr) return null;
  const [date, time] = dateStr.split(" ");
  if(!date || !time) return null;
  const [y,m,d] = date.split("-").map(Number);
  const [hh,mm,ss] = time.split(":").map(Number);
  return new Date(y, m-1, d, hh, mm, ss);
}

function parseKeyDate(str){
  const [y,m,d] = str.split("-").map(Number);
  return new Date(y, m-1, d, 0, 0, 0);
}

function populateWeeks(){
  const select = document.getElementById("weekSelect");
  
  const previousSelectedValue = select.value;
  
  select.innerHTML = "";
  const weeks = {};

  allAttendance.forEach(i => {
    if(!i.Start) return;
    const d = parseWIB(i.Start);
    if(!d) return;
    const local = new Date(d);
    local.setHours(0,0,0,0);
    const start = new Date(local);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23,59,59,999);

    const key = start.getFullYear() + "-" + String(start.getMonth()+1).padStart(2,"0") + "-" + String(start.getDate()).padStart(2,"0") + "|" + end.getFullYear() + "-" + String(end.getMonth()+1).padStart(2,"0") + "-" + String(end.getDate()).padStart(2,"0");
    weeks[key] = { start, end };
  });

  const keys = Object.keys(weeks);
  if(keys.length === 0){ select.innerHTML = `<option>Tidak ada data</option>`; return; }

  keys.forEach(k => {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = k.replace("|"," s/d ");
    select.appendChild(opt);
  });

  if (previousSelectedValue && keys.includes(previousSelectedValue)) {
    select.value = previousSelectedValue;
  } else {
    const now = new Date();
    now.setHours(0,0,0,0);
    let currentWeek = keys.find(k => {
      const [startStr, endStr] = k.split("|");
      const start = parseKeyDate(startStr);
      const end = parseKeyDate(endStr);
      end.setHours(23,59,59,999);
      return now >= start && now <= end;
    });

    if(!currentWeek){ currentWeek = keys[keys.length - 1]; }
    select.value = currentWeek;
  }

  select.onchange = () => { if(ratesReady){ requestAnimationFrame(() => renderAttendanceTable()); } };
  if(ratesReady && allAttendance.length){ requestAnimationFrame(() => renderAttendanceTable()); }
}

function renderAttendanceTable(){
  const select = document.getElementById("weekSelect");
  const key = select.value;
  if(!key){ document.getElementById("tbody").innerHTML = `<tr><td colspan="7">Pilih minggu dulu</td></tr>`; return; }

  const [startStr, endStr] = key.split("|");
  const start = parseKeyDate(startStr);
  const end = parseKeyDate(endStr);
  end.setHours(23,59,59,999);

  const normalize = s => String(s || "").trim().toUpperCase();
  const weekData = allAttendance.filter(i => {
    if(!i.Start) return false;
    const t = parseWIB(i.Start);
    return t && t >= start && t <= end;
  });

  const valid = weekData.filter(i => normalize(i.Status) === "VALID");
  const topMap = {};

  for(const i of weekData){
    if(String(i.Status).toUpperCase() !== "VALID") continue;
    const nama = i.Nama || "-";
    const match = (i.Durasi || "").match(/(\d+)h\s*(\d+)m/);
    const minutes = match ? (+match[1]*60 + +match[2]) : 0;
    if(!topMap[nama]){ topMap[nama] = { nama, minutes: 0 }; }
    topMap[nama].minutes += minutes;
  }

  const top3 = Object.values(topMap).sort((a,b) => b.minutes - a.minutes).slice(0,3);
  window._top3Cache = top3;
  const pending = weekData.filter(i => normalize(i.Status) === "PENDING");

  document.getElementById("pendingDuty").innerText = pending.length;
  document.getElementById("jumlahDuty").innerText = valid.length;

  const onDuty = weekData.filter(i => !i.Finish);
  document.getElementById("onDutyCount").innerText = onDuty.length;
  const topEl = document.getElementById("topDuty");

  if(top3.length === 0){
    topEl.innerHTML = "-";
  } else {
    topEl.innerHTML = top3.map((u, i) => {
      const h = Math.floor(u.minutes / 60); const m = u.minutes % 60;
      return `
        <div class="top-rank-item">
          <span>${["🥇","🥈","🥉"][i]} ${u.nama}</span>
          <span style="font-weight:700; color:#facc15">${h}h ${m}m</span>
        </div>
      `;
    }).join("");
  }

  const payroll = {};

  for(const i of weekData){
    const nama = i.Nama || "-"; const divisi = normalize(i.Divisi); const jabatan = normalize(i.Jabatan);
    if(!payroll[nama]){ payroll[nama] = { nama, divisi, jabatan, validMinutes: 0, gaji: 0, sessions: [] }; }

    const match = (i.Durasi || "").match(/(\d+)h\s*(\d+)m/);
    const minutes = match ? (+match[1] * 60 + +match[2]) : 0;

    if(normalize(i.Status) === "VALID"){
      payroll[nama].validMinutes += minutes;
      payroll[nama].gaji += Number(i.GajiDuty || 0);
    }
    payroll[nama].sessions.push(i);
  }

  const tbody = document.getElementById("tbody");
  if(Object.keys(payroll).length === 0){ tbody.innerHTML = `<tr><td colspan="7" class="empty">No data</td></tr>`; return; }

  const sortedPayroll = Object.values(payroll).sort((a, b) => {
    const aHasPending = a.sessions.some(i => String(i.Status).toUpperCase() === "PENDING");
    const bHasPending = b.sessions.some(i => String(i.Status).toUpperCase() === "PENDING");
    if (aHasPending && !bHasPending) return -1; if (!aHasPending && bHasPending) return 1;
    return a.nama.localeCompare(b.nama);
  });
  
  tbody.innerHTML = sortedPayroll.map((v, idx) => {
    const validHours = v.validMinutes / 60;
    const priorityDivisi = ["PETINGGI","PENGURUS","SPESIALIS"];
    const rateHour = priorityDivisi.includes(v.divisi) ? (rateDivisiMap[v.divisi] || 0) : (rateJabatanMap[v.jabatan] || 0);
    const hasPending = v.sessions.some(s => normalize(s.Status) === "PENDING");
    return `
      <tr data-row="${v.sessions[0]?.RowIndex}" class="${hasPending ? "row-pending" : ""}">
        <td style="font-weight:600; color:#ffffff;">${v.nama}</td>
        <td>${v.jabatan}</td>
        <td>${v.divisi}</td>
        <td style="font-weight:500;">${Math.floor(validHours)}h ${v.validMinutes % 60}m</td>
        <td>$KK ${rateHour.toFixed(0)}</td>
        <td><b style="color:#ef4444">$KK ${Math.floor(v.gaji).toLocaleString("id-ID")}</b></td>
        <td><a onclick="toggleDetail(${idx})">Detail</a></td>
      </tr>

      <tr id="detail-${idx}" class="hidden">
        <td colspan="7" class="detail-row-box">
          ${v.sessions.map((s, sIdx) => `
            <div class="session-item">
              <div style="font-weight:700; color:var(--muted); text-align:center;">${sIdx + 1}</div>
              
              <div><span style="color:var(--muted); font-size:11px; display:block;">START</span><span class="start">${s.Start || "-"}</span></div>
              <div><span style="color:var(--muted); font-size:11px; display:block;">FINISH</span><span class="finish">${s.Finish || "-"}</span></div>  
              <div style="font-weight:600;">${s.Durasi || "-"}</div>
              <div>
                <span class="status-badge" style="
                  padding:4px 10px; border-radius:8px; font-size:11px; font-weight:700;
                  background:${normalize(s.Status) === "VALID" ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)"};
                  color:${normalize(s.Status) === "VALID" ? "#10b981" : "#f59e0b"};
                  border: 1px solid ${normalize(s.Status) === "VALID" ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"};">
                  ${s.Status || "-"}
                </span>
              </div>
              <div class="btn-group-actions">
                <button class="btn-green" onclick="setStatus('${s.RowIndex}','VALID')">V</button>
                <button class="btn-red" onclick="setStatus('${s.RowIndex}','INVALID')">X</button>
                <button class="btn-orange" onclick="editTime('${s.RowIndex}','${s.Start}','${s.Finish}')">EDIT</button>
              </div>
            </div>
          `).join("")}
        </td>
      </tr>
    `;
  }).join(""); 
}

function toggleDetail(idx){ document.getElementById("detail-"+idx).classList.toggle("hidden"); }

function copyTop3(){
  const top3 = window._top3Cache || [];
  const text = top3.map((u, i) => {
    const h = Math.floor(u.minutes / 60); const m = u.minutes % 60;
    return `${i+1}. ${u.nama} - ${h}h ${m}m`;
  }).join("\n");

  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById("copyTop3Btn");
    const original = btn.innerHTML;
    btn.innerHTML = "Tersalin!";
    setTimeout(() => {
      btn.innerHTML = original;
      if(window.lucide) lucide.createIcons();
    }, 1500);
  });
}

async function loadPotonganCache(){
  const res = await fetch(SCRIPT_URL+"?action=getAllPotongan");
  const data = await res.json();
  data.forEach(i=>{ potonganCache[i.divisi] = Number(i.potongan || 0); });
}

function setStatus(rowIndex, status) {
  fetch(`${SCRIPT_URL}?action=updateAttendanceStatus&rowIndex=${rowIndex}&status=${status}`)
    .then(res => res.json())
    .then(data => {
      if(!data.success){ throw new Error("Gagal update status"); }
      updateStatusLocal(rowIndex, status);
      allAttendance = allAttendance.map(item => {
        if(String(item.RowIndex) === String(rowIndex)){ return { ...item, Status: status }; }
        return item;
      });
      const cached = localStorage.getItem(CACHE_KEY_ATT);
      if(cached){
        let parsed = null;
        try { parsed = JSON.parse(cached); } catch(e){ localStorage.removeItem(CACHE_KEY_ATT); }
        parsed.data = parsed.data.map(item => {
          if(String(item.RowIndex) === String(rowIndex)){ return { ...item, Status: status }; }
          return item;
        });
        parsed.time = Date.now();
        localStorage.setItem(CACHE_KEY_ATT, JSON.stringify(parsed));
      }
      if(ratesReady && allAttendance.length){ requestAnimationFrame(() => renderAttendanceTable()); }
    })
    .catch(err => { alert("Error koneksi server"); });
}

let currentEditId = null;
function editTime(rowIndex, start, finish){
  currentEditId = rowIndex;
  document.getElementById("editStart").value = convertToInputDate(start);
  document.getElementById("editFinish").value = convertToInputDate(finish);
  document.getElementById("editModal").style.display = "flex";
}

function closeModal(){ document.getElementById("editModal").style.display = "none"; }

function saveEdit(){
  const start = document.getElementById("editStart").value;
  const finish = document.getElementById("editFinish").value;
  
  const formattedStart = start.replace("T", " ") + ":00";
  const formattedFinish = finish.replace("T", " ") + ":00";

  closeModal();

  let newGaji = null;

  fetch(`${SCRIPT_URL}?action=updateSessionTime&rowIndex=${currentEditId}&start=${start}&finish=${finish}`)
    .then(res => res.json())
    .then(data => {
      if(!data.success){ throw new Error("Gagal update waktu"); }
      newGaji = data.gaji;
      return fetch(`${SCRIPT_URL}?action=updateAttendanceStatus&rowIndex=${currentEditId}&status=VALID`);
    })
    .then(res => res.json())
    .then(data => {
      if(!data.success){ throw new Error("Gagal set VALID"); }
      
      updateTimeLocal(currentEditId, formattedStart, formattedFinish, "VALID", newGaji);
    })
    .catch(err => { 
      alert("Server error atau gagal menyimpan perubahan. Silakan refresh halaman."); 
    });
}

function updateTimeLocal(rowIndex, newStart, newFinish, newStatus, newGaji){
  let newDurasi = "-";
  if (newStart && newFinish) {
    const d1 = new Date(newStart.replace(" ", "T"));
    const d2 = new Date(newFinish.replace(" ", "T"));
    
    if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
      const diffMs = d2 - d1;
      if (diffMs > 0) {
        const totalMinutes = Math.floor(diffMs / (1000 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        newDurasi = `${hours}h ${minutes}m`; 
      } else {
        newDurasi = "0h 0m";
      }
    }
  }

  allAttendance = allAttendance.map(item => {
    if(String(item.RowIndex) === String(rowIndex)){
      return { 
        ...item, 
        Start: newStart, 
        Finish: newFinish, 
        Status: newStatus,
        Durasi: newDurasi,
        GajiDuty: (newGaji !== null && newGaji !== undefined) ? newGaji : item.GajiDuty
      };
    }
    return item;
  });

  const cached = localStorage.getItem(CACHE_KEY_ATT);
  if(cached){
    try {
      let parsed = JSON.parse(cached);
      parsed.data = allAttendance;
      parsed.time = Date.now();
      localStorage.setItem(CACHE_KEY_ATT, JSON.stringify(parsed));
    } catch(e) { 
      localStorage.removeItem(CACHE_KEY_ATT); 
    }
  }

  if(ratesReady && allAttendance.length){ 
    requestAnimationFrame(() => renderAttendanceTable()); 
  }
}

function updateStatusLocal(rowIndex, status){
  const row = document.querySelector(`[data-row='${rowIndex}']`); if(!row) return;
  const badge = row.querySelector(".status-badge");
  if(badge){
    badge.innerText = status;
    badge.style.background = status === "VALID" ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)";
    badge.style.color = status === "VALID" ? "#10b981" : "#f59e0b";
  }
}

function convertToInputDate(str){
  if(!str) return "";
  const d = new Date(str); if(isNaN(d.getTime())) return "";
  const pad = n => String(n).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

window.addEventListener("load", () => {
  lucide.createIcons();
  if(sessionStorage.getItem(LOGIN_KEY) === "true"){
    document.getElementById("loginCard").classList.add("hidden");
    document.getElementById("adminPanel").classList.remove("hidden");
    document.getElementById("navbar").style.display = "flex";
    loadRates().then(() => { loadAttendanceData(); });
  }
});