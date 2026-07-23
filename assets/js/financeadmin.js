if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  });
}

let allSalaryData = [];
const CACHE_KEY_SALARY = "salary_cache_v1";


async function checkLogin(){
  const pw = document.getElementById("adminPassword").value.trim();
  document.getElementById("loginStatus").innerHTML = "⏳ Memeriksa tingkat otentikasi...";

  try{
    const res = await fetch(`${SCRIPT_URL}?action=verifyAdmin&password=${encodeURIComponent(pw)}`);
    const data = await res.json();

    if(data.success){
      sessionStorage.setItem(LOGIN_KEY, "true");
      document.getElementById("loginCard").classList.add("hidden");
      document.getElementById("adminPanel").classList.remove("hidden");
      document.getElementById("navbar").style.display = "flex";
      requestAnimationFrame(loadData);
    } else {
      document.getElementById("loginStatus").innerHTML = "❌ Password salah, maksimal 3x salah maka IP akan di block";
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
    const res = await fetch(SCRIPT_URL + "?action=getTotalSalary");
    const data = await res.json();
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
    const res = await fetch(SCRIPT_URL + "?action=getTotalSalary");
    const fresh = await res.json();
    allSalaryData = fresh;
    localStorage.setItem(CACHE_KEY_SALARY, JSON.stringify({ data: fresh, time: Date.now() }));
    requestAnimationFrame(() => { 
      populateWeeks(); 
      renderTable(); 
    });
  } catch(e){
    console.log("sync gagal, pakai cache");
  }
}

function populateWeeks(){
  const select = document.getElementById("weekSelect");

  const previousSelectedValue = select.value;
  
  select.innerHTML = "";
  const weeks = {};
  allSalaryData.forEach(i => { if (!i.week) return; weeks[i.week] = true; });
  const weekKeys = Object.keys(weeks);
  const today = new Date();
  today.setHours(0,0,0,0);
  let defaultIndex = 0;

  weekKeys.forEach((key, index) => {
    const opt = document.createElement("option");
    opt.value = key;
    const [startStr, endStr] = key.split("|");
    opt.textContent = `${startStr} s/d ${endStr}`;
    if (today >= new Date(startStr) && today <= new Date(endStr)) { defaultIndex = index; }
    select.appendChild(opt);
  });

  if(!select.dataset.bound){
    select.addEventListener("change", renderTable);
    select.dataset.bound = "1";
  }

  if (select.options.length > 0) {
    if (previousSelectedValue && weekKeys.includes(previousSelectedValue)) {
      select.value = previousSelectedValue;
    } else {
      select.selectedIndex = defaultIndex;
    }
    select.dispatchEvent(new Event("change"));
  }
}

async function renderTable(){
  const select = document.getElementById("weekSelect");
  const week = select.value;
  if(!week) return;

  const filtered = allSalaryData.filter(x => x.week === week);
  const totalDuty = filtered.reduce((a,b)=>a + (Number(b.duty) || 0), 0);
  const totalInvoice = filtered.reduce((a,b)=>a + (Number(b.invoice) || 0), 0);

  document.getElementById("totalDuty").innerText = "$KK " + totalDuty.toLocaleString("id-ID");
  document.getElementById("totalInvoice").innerText = "$KK " + totalInvoice.toLocaleString("id-ID");

  const totalWeek = totalDuty + totalInvoice;
  const paidAmount = filtered.filter(x => x.paid === "PAID").reduce((a,b)=>a + (Number(b.duty) || 0) + (Number(b.invoice) || 0), 0);
  const sisaWeek = totalWeek - paidAmount;

  document.getElementById("totalWeek").innerText = "$KK " + totalWeek.toLocaleString("id-ID");
  document.getElementById("sisaWeek").innerText = "$KK " + sisaWeek.toLocaleString("id-ID");

  const top3 = [...filtered].sort((a,b)=>(Number(b.duty) + Number(b.invoice)) - (Number(a.duty) + Number(a.invoice))).slice(0,3);
  window._top3Cache = top3;
  
  document.getElementById("topGaji").innerHTML = top3.map((x,i)=>`
    <div class="top-rank-item">
      <span>${["🥇","🥈","🥉"][i] || ""} ${x.nama}</span> 
      <span style="font-weight:700; color:#facc15">$KK ${(Number(x.duty) + Number(x.invoice)).toLocaleString("id-ID")}</span>
    </div>
  `).join("");

  const tbody = document.getElementById("tbody");
  const sorted = [...filtered].sort((a, b) => {
    const aPaid = a.paid === "PAID"; const bPaid = b.paid === "PAID";
    if (!aPaid && bPaid) return -1; if (aPaid && !bPaid) return 1;
    return a.nama.localeCompare(b.nama);
  });

  tbody.innerHTML = sorted.map(x=>{
    const duty = Number(x.duty) || 0;
    const invoice = Number(x.invoice) || 0;
    const total = duty + invoice;
    const rowClass = x.paid === "PAID" ? "" : "row-unpaid";
    return `
      <tr class="${rowClass}">
        <td style="font-weight:600; color:#ffffff;">${x.nama}</td>
        <td>$KK ${duty.toLocaleString("id-ID")}</td>
        <td>$KK ${invoice.toLocaleString("id-ID")}</td>
        <td><b style="color:#ef4444">$KK ${total.toLocaleString("id-ID")}</b></td>
        <td>
          <input type="checkbox" onchange="markPaid('${x.nama}','${x.week}', this.checked, this)" ${x.paid === "PAID" ? "checked" : ""}>
        </td>
      </tr>
    `;
  }).join("");
}

window.addEventListener("load", () => {
  lucide.createIcons();
  const isLoggedIn = sessionStorage.getItem(LOGIN_KEY);
  if(isLoggedIn === "true"){
    document.getElementById("loginCard").classList.add("hidden");
    document.getElementById("adminPanel").classList.remove("hidden");
    document.getElementById("navbar").style.display = "flex";
    requestAnimationFrame(loadData);
  }
});

function markPaid(nama, week, checked, element){
  if(element) element.disabled = true; 

  fetch(SCRIPT_URL + "?action=updatePaidStatus&nama=" + encodeURIComponent(nama) + "&week=" + encodeURIComponent(week) + "&status=" + (checked ? "PAID" : "UNPAID"))
  .then(() => {
    const cached = localStorage.getItem(CACHE_KEY_SALARY);
    if(cached){
      let parsed = null;
      try { parsed = JSON.parse(cached); } catch(e){ localStorage.removeItem(CACHE_KEY_SALARY); }
      if(parsed?.data){
        parsed.data = parsed.data.map(i => 
          (i.nama.toLowerCase().trim() === nama.toLowerCase().trim() && i.week === week) 
            ? { ...i, paid: checked ? "PAID" : "UNPAID" } 
            : i
        );
      }
      parsed.time = Date.now();
      localStorage.setItem(CACHE_KEY_SALARY, JSON.stringify(parsed));
      allSalaryData = parsed.data;
    }
    requestAnimationFrame(renderTable);
  })
  .catch((err) => {
    console.error("Gagal memperbarui status:", err);
    alert("Koneksi bermasalah. Gagal mengubah status pembayaran.");
    if(element) element.disabled = false; 
  });
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