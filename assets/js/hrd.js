lucide.createIcons();

let allData = [];

function parseDate(str){
  if(!str) return null;
  return new Date(str.replace(" ","T"));
}

function getDurationHours(s,f){
  const a = parseDate(s);
  const b = parseDate(f);
  if(!a || !b || isNaN(a) || isNaN(b)) return 0;
  return (b - a) / (1000 * 60 * 60);
}

async function loadData(){
  const btn = document.getElementById("btnGenerate");
  const btnText = document.getElementById("btnText");
  const infoText = document.getElementById("infoText");
  
  try {
    const res = await fetch(SCRIPT_URL + "?action=getAttendanceLogAll");
    allData = await res.json() || [];

    btn.disabled = false;
    btnText.innerText = "Generate";
    infoText.innerText = "Silakan masukkan rentang tanggal di atas.";

    const iconContainer = document.getElementById("btnIcon");
    iconContainer.setAttribute("data-lucide", "activity");
    lucide.createIcons();
    
  } catch (error) {
    console.error("Gagal memuat data:", error);
    infoText.innerText = "Gagal memuat data dari server. Silakan refresh halaman.";
    btnText.innerText = "Error";
  }
}

loadData();

function generate(){
  const startVal = document.getElementById("startDate").value;
  const endVal = document.getElementById("endDate").value;

  if(!startVal || !endVal){
    alert("Isi start & end date");
    return;
  }

  const startDate = new Date(startVal + "T00:00:00");
  const endDate = new Date(endVal + "T23:59:59");

  if(startDate > endDate){
    alert("Start harus <= End");
    return;
  }

  const map = {};

  allData.forEach(r => {
    if(!r.Start || r.Status !== "VALID") return;

    const d = parseDate(r.Start);
    if(!d) return;

    if(d < startDate || d > endDate) return;

    const name = (r.Nama || "").trim();
    if(!name) return;

    const h = getDurationHours(r.Start, r.Finish);
    map[name] = (map[name] || 0) + h;
  });

  const sorted = Object.entries(map).sort((a,b) => b[1] - a[1]);
  const tb = document.getElementById("tableBody");
  tb.innerHTML = "";

  if(sorted.length === 0){
    tb.innerHTML = `<tr><td colspan="3" class="empty-state">Tidak ada data ditemukan pada rentang ini</td></tr>`;
    document.getElementById("infoText").innerText = "Total user: 0";
    return;
  }

  sorted.forEach((x, i) => {
    let trophy = i + 1;
    if(i === 0) trophy = "🥇";
    if(i === 1) trophy = "🥈";
    if(i === 2) trophy = "🥉";

    const totalHours = Math.floor(x[1]);
    const totalMinutes = Math.round((x[1] % 1) * 60);

    tb.innerHTML += `
      <tr>
        <td class="rank">${trophy}</td>
        <td>${x[0]}</td>
        <td>${totalHours}h ${totalMinutes}m</td>
      </tr>
    `;
  });

  document.getElementById("infoText").innerText = `Total user: ${sorted.length}`;
}