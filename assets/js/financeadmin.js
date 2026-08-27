if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  });
}

let allSalaryData = [];
let weekSelectTS = null;
let financeStaffList = [];
const CACHE_KEY_SALARY = "salary_cache_v1";

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}

async function loadFinanceStaff(){
  try {
    const res = await callApi("getFinanceStaff", {});
    financeStaffList = (res && res.success && Array.isArray(res.data)) ? res.data : [];
  } catch(e){
    financeStaffList = [];
  }
}


async function checkLogin(){
  const pw = document.getElementById("adminPassword").value.trim();
  document.getElementById("loginStatus").innerHTML = "⏳ Memeriksa tingkat otentikasi...";

  try{
    const data = await callApi("verifyAdminGate", { password: pw });

    if(data.success){
      sessionStorage.setItem(ADMIN_GATE_KEY, "true");
      document.getElementById("loginCard").classList.add("hidden");
      document.getElementById("adminPanel").classList.remove("hidden");
      document.getElementById("fabStaff").classList.add("show");
      document.getElementById("navbar").style.display = "flex";
      await loadFinanceStaff();
      requestAnimationFrame(loadData);
    } else {
      document.getElementById("loginStatus").innerHTML = "❌ Password salah, kesalahan berulang secara beruntun akan mengunci akun sementara";
    }
  }catch(e){
    document.getElementById("loginStatus").innerHTML = "❌ Server error, silahkan hubungi FINANCE";
  }
}

async function loadData(){
  const cached = localStorage.getItem(CACHE_KEY_SALARY);
  if(cached){
    let parsed = null;
    try { parsed = JSON.parse(cached); } catch(e){ localStorage.removeItem(CACHE_KEY_SALARY); }
    if(parsed && isCacheValid(parsed.time)){
      allSalaryData = parsed.data || [];
      requestAnimationFrame(() => {
        populateWeeks();
        renderTable();
      });
      setTimeout(refreshFromServer, 2000);
      return;
    }
  }
  try {
    const data = await callApi("getTotalSalary", { weeks: 4 });
    allSalaryData = data || [];
    localStorage.setItem(CACHE_KEY_SALARY, JSON.stringify({ data: allSalaryData, time: Date.now() }));
  } catch(e){
    allSalaryData = [];
  }
  requestAnimationFrame(() => { 
    populateWeeks(); 
    renderTable(); 
  });
}

async function refreshFromServer(){
  try{
    const data = await callApi("getTotalSalary", { weeks: 4 });
    allSalaryData = data || [];
    localStorage.setItem(CACHE_KEY_SALARY, JSON.stringify({ data: allSalaryData, time: Date.now() }));
    requestAnimationFrame(() => { 
      populateWeeks(); 
      renderTable(); 
    });
  } catch(e){
    console.log("sync gagal, pakai cache");
  }
}

function populateWeeks(){
  if (!Array.isArray(allSalaryData)) allSalaryData = [];

  if(!weekSelectTS){
    weekSelectTS = new TomSelect("#weekSelect", {
      create: false,
      controlInput: null,
      onChange: () => { renderTable(); }
    });
  }

  const previousSelectedValue = weekSelectTS.getValue();

  const weeks = {};
  allSalaryData.forEach(i => { if (!i.week) return; weeks[i.week] = true; });
  const weekKeys = Object.keys(weeks).sort((a, b) => {
    const startA = new Date(a.split("|")[0]);
    const startB = new Date(b.split("|")[0]);
    return startB - startA;
  });
  const today = new Date();
  today.setHours(0,0,0,0);
  let defaultIndex = 0;

  weekSelectTS.clearOptions();
  weekKeys.forEach((key, index) => {
    const [startStr, endStr] = key.split("|");
    weekSelectTS.addOption({ value: key, text: `${startStr} s/d ${endStr}` });
    if (today >= new Date(startStr) && today <= new Date(endStr)) { defaultIndex = index; }
  });
  weekSelectTS.refreshOptions(false);

  if (weekKeys.length > 0) {
    if (previousSelectedValue && weekKeys.includes(previousSelectedValue)) {
      weekSelectTS.setValue(previousSelectedValue, true);
    } else {
      weekSelectTS.setValue(weekKeys[defaultIndex], true);
    }
    renderTable();
  }
}

async function renderTable(){
  const week = weekSelectTS ? weekSelectTS.getValue() : "";
  if(!week) return;

  const filtered = allSalaryData.filter(x => x.week === week);
  const totalDuty = filtered.reduce((a,b)=>a + (Number(b.duty) || 0), 0);
  const totalInvoice = filtered.reduce((a,b)=>a + (Number(b.invoice) || 0), 0);

  document.getElementById("totalDuty").innerText = "$KK " + totalDuty.toLocaleString("id-ID");
  document.getElementById("totalInvoice").innerText = "$KK " + totalInvoice.toLocaleString("id-ID");

  const totalWeek = totalDuty + totalInvoice;
  const paidAmount = filtered.filter(x => x.paid && x.paid !== "UNPAID").reduce((a,b)=>a + (Number(b.duty) || 0) + (Number(b.invoice) || 0), 0);
  const sisaWeek = totalWeek - paidAmount;

  document.getElementById("totalWeek").innerText = "$KK " + totalWeek.toLocaleString("id-ID");
  document.getElementById("sisaWeek").innerText = "$KK " + sisaWeek.toLocaleString("id-ID");

  const top3 = [...filtered].sort((a,b)=>(Number(b.duty) + Number(b.invoice)) - (Number(a.duty) + Number(a.invoice))).slice(0,3);
  window._top3Cache = top3;
  
  document.getElementById("topGaji").innerHTML = top3.map((x,i)=>`
    <div class="top-rank-item">
      <span>${["🥇","🥈","🥉"][i] || ""} ${escapeHtml(x.nama)}</span> 
      <span style="font-weight:700; color:#facc15">$KK ${(Number(x.duty) + Number(x.invoice)).toLocaleString("id-ID")}</span>
    </div>
  `).join("");

  const tbody = document.getElementById("tbody");
  const staffNames = financeStaffList.map(s => s.name);
  const STATUS_OPTIONS = ["UNPAID", ...staffNames];
  const STATUS_ORDER = { "UNPAID": 0 };
  staffNames.forEach((n, i) => { STATUS_ORDER[n] = i + 1; });
  const STATUS_LABELS = { "UNPAID": "Unpaid" };
  staffNames.forEach(n => { STATUS_LABELS[n] = n.charAt(0) + n.slice(1).toLowerCase(); });

  const sorted = [...filtered].sort((a, b) => {
    const rankA = STATUS_ORDER[a.paid] ?? 0;
    const rankB = STATUS_ORDER[b.paid] ?? 0;
    if (rankA !== rankB) return rankA - rankB;
    return a.nama.localeCompare(b.nama);
  });

  tbody.innerHTML = sorted.map(x=>{
    const duty = Number(x.duty) || 0;
    const invoice = Number(x.invoice) || 0;
    const total = duty + invoice;

    const currentStatus = x.paid || "UNPAID";
    const optionsForRow = STATUS_OPTIONS.includes(currentStatus) ? STATUS_OPTIONS : [...STATUS_OPTIONS, currentStatus];
    const rowClass = currentStatus === "UNPAID" ? "row-unpaid" : "";
    const optionsHtml = optionsForRow.map(opt =>
      `<option value="${opt}" ${opt === currentStatus ? "selected" : ""}>${STATUS_LABELS[opt] || (opt.charAt(0) + opt.slice(1).toLowerCase())}</option>`
    ).join("");
    return `
      <tr class="${rowClass}">
        <td style="font-weight:600; color:#ffffff;">${escapeHtml(x.nama)}</td>
        <td>$KK ${duty.toLocaleString("id-ID")}</td>
        <td>$KK ${invoice.toLocaleString("id-ID")}</td>
        <td><b style="color:#ef4444">$KK ${total.toLocaleString("id-ID")}</b></td>
        <td>
          <select class="status-select status-${currentStatus.toLowerCase()}" data-prev-value="${currentStatus}" onchange="markPaid('${x.user_id}','${x.week}', this.value, this)">${optionsHtml}</select>
        </td>
      </tr>
    `;
  }).join("");
}

window.addEventListener("load", () => {
  lucide.createIcons();
  const isLoggedIn = sessionStorage.getItem(ADMIN_GATE_KEY);
  if(isLoggedIn === "true"){
    document.getElementById("loginCard").classList.add("hidden");
    document.getElementById("adminPanel").classList.remove("hidden");
    document.getElementById("fabStaff").classList.add("show");
    document.getElementById("navbar").style.display = "flex";
    loadFinanceStaff().then(() => requestAnimationFrame(loadData));
  }
});

async function markPaid(userId, week, status, element){
  if(element) element.disabled = true;
  const previousValue = element ? element.dataset.prevValue || "UNPAID" : null;

  try {
    await callApi("updatePaidStatus", { user_id: userId, week: week, status: status });

    const cached = localStorage.getItem(CACHE_KEY_SALARY);
    if(cached){
      let parsed = null;
      try { parsed = JSON.parse(cached); } catch(e){ localStorage.removeItem(CACHE_KEY_SALARY); }
      if(parsed?.data){
        parsed.data = parsed.data.map(i => 
          (String(i.user_id) === String(userId) && i.week === week) 
            ? { ...i, paid: status } 
            : i
        );
      }
      parsed.time = Date.now();
      localStorage.setItem(CACHE_KEY_SALARY, JSON.stringify(parsed));
      allSalaryData = parsed.data;
    }
    if(element){
      element.className = `status-select status-${status.toLowerCase()}`;
      element.dataset.prevValue = status;
      element.disabled = false;
    }
    requestAnimationFrame(renderTable);
  } catch(err) {
    console.error("Gagal memperbarui status:", err);
    alert("Koneksi bermasalah. Gagal mengubah status pembayaran.");
    if(element){ element.disabled = false; element.value = previousValue; }
  }
}

function copyTop3(){
  const top3 = window._top3Cache || [];
  const text = top3.map((x, i) => `${i+1}. ${x.nama}`).join("\n");

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

function openStaffModal(){
  document.getElementById("staffModal").classList.add("active");
  document.getElementById("staffFormStatus").innerText = "";
  document.getElementById("newStaffName").value = "";
  renderStaffList();
}

function closeStaffModal(){
  document.getElementById("staffModal").classList.remove("active");
}

function renderStaffList(){
  const container = document.getElementById("staffList");
  if(!financeStaffList.length){
    container.innerHTML = `<div class="staff-empty">Belum ada staff finance aktif</div>`;
    return;
  }
  container.innerHTML = financeStaffList.map(s => `
    <div class="staff-item">
      <span>${escapeHtml(s.name.charAt(0) + s.name.slice(1).toLowerCase())}</span>
      <button onclick="submitDeactivateFinanceStaff(${s.id}, this)">Nonaktifkan</button>
    </div>
  `).join("");
}

async function submitAddFinanceStaff(){
  const input = document.getElementById("newStaffName");
  const statusEl = document.getElementById("staffFormStatus");
  const name = input.value.trim();

  if(!name){
    statusEl.style.color = "var(--accent-red-light)";
    statusEl.innerText = "Nama tidak boleh kosong.";
    return;
  }
  if(name.toUpperCase() === "UNPAID"){
    statusEl.style.color = "var(--accent-red-light)";
    statusEl.innerText = "Nama tidak boleh 'Unpaid'.";
    return;
  }
  const alreadyActive = financeStaffList.some(s => s.name === name.toUpperCase());
  if(alreadyActive){
    statusEl.style.color = "var(--accent-red-light)";
    statusEl.innerText = "Nama tersebut sudah ada dan masih aktif.";
    return;
  }

  statusEl.style.color = "var(--muted)";
  statusEl.innerText = "Menyimpan...";

  try {
    const res = await callApi("addFinanceStaff", { name });
    if(res && res.success){
      input.value = "";
      statusEl.style.color = "var(--accent-emerald-light)";
      statusEl.innerText = "Berhasil ditambahkan.";
      await loadFinanceStaff();
      renderStaffList();
      renderTable();
    } else {
      statusEl.style.color = "var(--accent-red-light)";
      statusEl.innerText = (res && res.message) || "Gagal menambahkan nama.";
    }
  } catch(e){
    statusEl.style.color = "var(--accent-red-light)";
    statusEl.innerText = "Koneksi bermasalah, coba lagi.";
  }
}

async function submitDeactivateFinanceStaff(id, buttonEl){
  if(!confirm("Nonaktifkan staff ini? Riwayat status bayar lama yang sudah pakai nama ini tidak akan berubah.")) return;

  if(buttonEl) buttonEl.disabled = true;
  try {
    const res = await callApi("deactivateFinanceStaff", { id });
    if(res && res.success){
      await loadFinanceStaff();
      renderStaffList();
      renderTable();
    } else {
      alert((res && res.message) || "Gagal menonaktifkan staff.");
      if(buttonEl) buttonEl.disabled = false;
    }
  } catch(e){
    alert("Koneksi bermasalah, coba lagi.");
    if(buttonEl) buttonEl.disabled = false;
  }
}