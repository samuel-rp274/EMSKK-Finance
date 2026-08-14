lucide.createIcons();

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}

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

function getWeekRange(d){
  const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const ws = new Date(local);
  ws.setDate(local.getDate() - local.getDay());
  ws.setHours(0,0,0,0);

  const we = new Date(ws);
  we.setDate(ws.getDate() + 6);
  we.setHours(23,59,59,999);

  return { start: ws, end: we };
}

function weekKey(d){
  const { start, end } = getWeekRange(d);
  const fmt = (x)=>
    `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
  return `${fmt(start)}|${fmt(end)}`;
}

function formatDateShort(d){
  const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatHM(h){
  const totalHours = Math.floor(h);
  const totalMinutes = Math.round((h % 1) * 60);
  return `${totalHours}h ${totalMinutes}m`;
}

let selectedMemberId = null;
let selectedMemberName = null;

function setupMemberSearch(inputEl, resultsEl, onSelect) {
  let debounce = null;

  inputEl.addEventListener("input", () => {
    const q = inputEl.value.trim();
    clearTimeout(debounce);

    selectedMemberId = null;
    selectedMemberName = null;
    document.getElementById("memberWrap").classList.add("hidden");

    if (q.length < 2) {
      resultsEl.classList.add("hidden");
      resultsEl.innerHTML = "";
      return;
    }

    debounce = setTimeout(() => runMemberSearch(q, resultsEl, onSelect), 350);
  });
}

async function runMemberSearch(q, resultsEl, onSelect) {
  try {
    const result = await callApi("searchActiveMembers", { q });
    const list = (result && result.data) || [];

    if (list.length === 0) {
      resultsEl.innerHTML = `<div class="search-result-empty">Tidak ada member ditemukan</div>`;
    } else {
      resultsEl.innerHTML = list.map(p => `
        <div class="search-result-item" data-id="${escapeHtml(p.id)}" data-nama="${escapeHtml(p.nama)}" data-angkatan="${escapeHtml(p.angkatan)}" data-jabatan="${escapeHtml(p.jabatan)}" data-divisi="${escapeHtml(p.divisi)}">
          <div class="search-result-name">${escapeHtml(p.nama)}</div>
          <div class="search-result-meta">Angkatan ${escapeHtml(p.angkatan)} · ${escapeHtml(p.jabatan)} · ${escapeHtml(p.divisi)}</div>
        </div>
      `).join("");
    }
    resultsEl.classList.remove("hidden");

    resultsEl.querySelectorAll(".search-result-item").forEach(item => {
      item.addEventListener("click", () => onSelect(item.dataset));
    });
  } catch (err) {
    console.error("Gagal search member:", err);
  }
}

function selectMember(data){
  selectedMemberId = data.id;
  selectedMemberName = data.nama;

  document.getElementById("memberSearchResults").classList.add("hidden");
  document.getElementById("memberSearch").value = data.nama;

  document.getElementById("memberName").innerText = data.nama;
  document.getElementById("memberMeta").innerText =
    `Angkatan ${data.angkatan} · ${data.jabatan} · ${data.divisi}`;
  document.getElementById("memberWrap").classList.remove("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  const memberSearchInput = document.getElementById("memberSearch");
  const memberSearchResults = document.getElementById("memberSearchResults");
  setupMemberSearch(memberSearchInput, memberSearchResults, selectMember);

  document.getElementById("infoText").innerText = "Silakan pilih member dan rentang tanggal di atas.";
});

async function generate(){
  const startVal = document.getElementById("startDate").value;
  const endVal = document.getElementById("endDate").value;

  if(!selectedMemberId){
    alert("Pilih member terlebih dahulu");
    return;
  }

  if(!startVal || !endVal){
    alert("Isi start & end date");
    return;
  }

  if(new Date(startVal) > new Date(endVal)){
    alert("Start harus <= End");
    return;
  }

  const btn = document.getElementById("btnGenerate");
  const btnText = document.getElementById("btnText");
  const btnIcon = document.getElementById("btnIcon");
  const infoText = document.getElementById("infoText");
  const summaryBox = document.getElementById("summaryBox");

  btn.disabled = true;
  btnIcon.classList.add("animate-spin");
  btnText.innerText = "Memuat...";
  infoText.innerText = "Mengambil data dari server...";
  summaryBox.classList.add("hidden");

  let allData = [];
  try {
    allData = await callApi("getAttendanceLog", {
      startDate: startVal + " 00:00:00",
      endDate: endVal + " 23:59:59",
      user_id: selectedMemberId
    }) || [];
  } catch (error) {
    console.error("Gagal memuat data:", error);
    infoText.innerText = "Gagal memuat data dari server. Silakan coba lagi.";
    btn.disabled = false;
    btnIcon.classList.remove("animate-spin");
    btnText.innerText = "Generate";
    return;
  }

  btn.disabled = false;
  btnIcon.classList.remove("animate-spin");
  btnText.innerText = "Generate";

  const validLogs = allData.filter(r => r.Start && r.Status === "VALID");

  const weekMap = {};
  let totalHours = 0;

  validLogs.forEach(r => {
    const h = getDurationHours(r.Start, r.Finish);
    totalHours += h;

    const startDateObj = parseDate(r.Start);
    if(!startDateObj || isNaN(startDateObj)) return;

    const key = weekKey(startDateObj);
    if(!weekMap[key]){
      const { start, end } = getWeekRange(startDateObj);
      weekMap[key] = { start, end, hours: 0 };
    }
    weekMap[key].hours += h;
  });

  const tb = document.getElementById("tableBody");
  tb.innerHTML = "";

  const weekEntries = Object.values(weekMap).sort((a,b) => a.start - b.start);

  if(weekEntries.length === 0){
    tb.innerHTML = `<tr><td colspan="3" class="empty-state">Tidak ada data duty ditemukan pada rentang ini</td></tr>`;
    infoText.innerText = `${selectedMemberName}: 0 minggu ditemukan`;
    summaryBox.classList.add("hidden");
    return;
  }

  weekEntries.forEach((w, i) => {
    tb.innerHTML += `
      <tr>
        <td>Minggu ${i + 1}</td>
        <td>${formatDateShort(w.start)} - ${formatDateShort(w.end)}</td>
        <td>${formatHM(w.hours)}</td>
      </tr>
    `;
  });

  document.getElementById("summaryTotal").innerText = formatHM(totalHours);
  document.getElementById("summaryRange").innerText =
    `${selectedMemberName} · ${formatDateShort(new Date(startVal))} - ${formatDateShort(new Date(endVal))}`;
  summaryBox.classList.remove("hidden");

  infoText.innerText = `${selectedMemberName}: ${weekEntries.length} minggu ditemukan`;
}