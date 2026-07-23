lucide.createIcons();

let allData = [];
let masterData = [];
let lastSorted = [];
let lastNever = [];
let mode = "weekly";
let periods = [];
let selectedPeriod = "";

function parseDate(str){
  if(!str) return null;
  return new Date(str.replace(" ","T"));
}

function getWeekKey(d){
  const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const ws = new Date(local);
  ws.setDate(local.getDate() - local.getDay());
  ws.setHours(0,0,0,0);

  const we = new Date(ws);
  we.setDate(ws.getDate() + 6);
  we.setHours(23,59,59,999);

  const fmt = (x)=>
    `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;

  return `${fmt(ws)}|${fmt(we)}`;
}

function getDurationHours(s,f){
  const a=parseDate(s);
  const b=parseDate(f);
  if(!a||!b) return 0;
  return (b-a)/(1000*60*60);
}

function formatHours(h){
  const m=Math.floor(h*60);
  return `${Math.floor(m/60)}h ${m%60}m`;
}

async function loadData(isClick = false){
  const refreshBtn = document.getElementById("refreshBtn");
  
  if(refreshBtn && isClick) {
    refreshBtn.classList.add("spinning");
  }

  try {
    const res = await fetch(SCRIPT_URL + "?action=getAttendanceLogAll");
    allData = await res.json() || [];

    const res2 = await fetch(SCRIPT_URL + "?action=getEMSList");
    const raw = await res2.json() || [];

    masterData = raw
      .map(x => {
        if (!x) return "";
        if (typeof x === "string") return x;
        if (x.nama) return x.nama;
        return "";
      })
      .map(n => String(n).trim())
      .filter(n =>
        n &&
        n !== "undefined" &&
        n !== "-" &&
        n.toLowerCase() !== "nama" &&
        !/^\d+(\.\d+)?$/.test(n)
      );

    buildPeriods();
    render();
  } catch (error) {
    console.error("Gagal memuat data:", error);
    alert("Gagal memuat data dari server. Periksa koneksi internet Anda.");
  } finally {
    if(refreshBtn) {
      refreshBtn.classList.remove("spinning");
    }
  }
}

function buildPeriods(){
  const weekMap = {};
  const monthSet = new Set();

  allData.forEach(r=>{
    if(!r.Start || r.Status !== "VALID") return;

    const d=parseDate(r.Start);
    if(!d) return;

    weekMap[getWeekKey(d)] = true;

    const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    monthSet.add(`${local.getFullYear()}-${String(local.getMonth()+1).padStart(2,'0')}`);
  });

  periods = mode==="weekly"
    ? Object.keys(weekMap).sort().reverse()
    : Array.from(monthSet).sort().reverse();

  const sel=document.getElementById("periodSelect");
  sel.innerHTML="";

  periods.forEach(p=>{
    const o=document.createElement("option");
    o.value=p;
    o.textContent=p;
    sel.appendChild(o);
  });

  if(periods.length){
    selectedPeriod = periods[0];
    sel.value = selectedPeriod;
  } else {
    selectedPeriod = "";
  }
}

function render(){
  const selElement = document.getElementById("periodSelect");
  if (!selElement || !selElement.value) {
    document.getElementById("tableBody").innerHTML = `<tr><td colspan="3">Tidak ada data untuk ditampilkan</td></tr>`;
    document.getElementById("neverDutyTable").innerHTML = `<tr><td colspan="2">Tidak ada data</td></tr>`;
    return;
  }
  
  selectedPeriod = selElement.value;
  const map = {};

  allData.forEach(r => {
    if (!r.Start || r.Status !== "VALID") return;

    const d = parseDate(r.Start);
    if (!d) return;

    let match = false;

    if (mode === "weekly") {
      match = getWeekKey(d) === selectedPeriod;
    } else {
      const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const mKey = `${local.getFullYear()}-${String(local.getMonth()+1).padStart(2,'0')}`;
      match = mKey === selectedPeriod;
    }

    if (!match) return;

    const h = getDurationHours(r.Start, r.Finish);
    const n = String(r.Nama || "").trim();

    if (!n || n.toLowerCase() === "nama" || n === "-") return;

    if (!map[n]) map[n] = 0;
    map[n] += h;
  });

  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
  lastSorted = sorted;

  const tb = document.getElementById("tableBody");
  let tableHtml = "";

  if(sorted.length === 0) {
    tableHtml = `<tr><td colspan="3">Tidak ada aktivitas duty pada periode ini</td></tr>`;
  } else {
    sorted.forEach((x, i) => {
      let trophy = i + 1;
      if(i === 0) trophy = "🥇";
      if(i === 1) trophy = "🥈";
      if(i === 2) trophy = "🥉";

      tableHtml += `
        <tr>
          <td class="rank">${trophy}</td>
          <td>${x[0]}</td>
          <td>${formatHours(x[1])}</td>
        </tr>
      `;
    });
  }
  tb.innerHTML = tableHtml;

  const dutySet = new Set(
    sorted.map(x => x[0].trim().toLowerCase())
  );

  const never = masterData
    .filter(n => !dutySet.has(n.toLowerCase()));

  const tb2 = document.getElementById("neverDutyTable");
  let neverHtml = "";
  lastNever = never;

  if(never.length === 0) {
    neverHtml = `<tr><td colspan="2">Semua anggota sudah pernah melakukan duty!</td></tr>`;
  } else {
    never.forEach((u, i) => {
      neverHtml += `
        <tr>
          <td>${i + 1}</td>
          <td>${u}</td>
        </tr>
      `;
    });
  }
  tb2.innerHTML = neverHtml;

  if (window.lucide) {
    lucide.createIcons({
      attrs: { class: 'lucide-icon' },
      nameAttr: 'data-lucide'
    });
  }
}

function setMode(m){
  mode=m;
  document.getElementById("weeklyBtn").classList.toggle("active",m==="weekly");
  document.getElementById("monthlyBtn").classList.toggle("active",m==="monthly");
  buildPeriods();
  render();
}

function exportTXT(){
  if (!selectedPeriod) {
    alert("Tidak ada data periode yang bisa diekspor.");
    return;
  }

  let text = "";
  text += "EMSKK DUTY RANKING\n";
  text += "Period: " + selectedPeriod + "\n\n";
  text += "=== RANKING ===\n";

  if (lastSorted.length === 0) {
    text += "(Tidak ada data)\n";
  } else {
    lastSorted.forEach((x, i) => {
      text += `${i+1}. ${x[0]} - ${formatHours(x[1])}\n`;
    });
  }

  text += "\n=== BELUM PERNAH DUTY ===\n";
  if (lastNever.length === 0) {
    text += "(Semua anggota sudah pernah duty)\n";
  } else {
    lastNever.forEach((n, i) => {
      text += `${i+1}. ${n}\n`;
    });
  }

  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `ems-duty-${selectedPeriod}.txt`;
  a.click();

  URL.revokeObjectURL(url);
}

loadData();