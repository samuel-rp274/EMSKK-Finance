let allInvoices=[], weekRanges=[];
let weekSelectTS = null;
let potonganCache = {};
const CACHE_KEY_INV = "invoice_cache_v1";

async function loadPotonganCache(){
  const data = await callApi("getAllPotongan");
  potonganCache = {};
  data.forEach(item => {
    potonganCache[item.divisi] = Number(item.potongan || 0);
  });
}

function parseDateSafe(dateStr){
  const [y, m, d] = dateStr.split("-");
  return new Date(Number(y), Number(m)-1, Number(d));
}

async function checkLogin(){
  const pw = document.getElementById("adminPassword").value.trim();
  document.getElementById("loginStatus").innerText = "⏳ Memeriksa tingkat otentikasi...";
  try{
    const data = await callApi("verifyAdminGate", { password: pw });
	
	if(data.success){
		sessionStorage.setItem(ADMIN_GATE_KEY, "true");
		document.getElementById("loginCard").classList.add("hidden");
		document.getElementById("adminPanel").classList.remove("hidden");
		document.getElementById("navbar").style.display = "flex";
		loadData();
	} else {
      document.getElementById("loginStatus").innerText = "❌ Password salah, maksimal 3x salah maka IP akan di block";
    }
  }catch(e){
    document.getElementById("loginStatus").innerText = "❌ Server error, silahkan hubungi FINANCE";
  }
}

async function loadData(){
  const cached = localStorage.getItem(CACHE_KEY_INV);
  if(cached){
    const parsed = JSON.parse(cached);
    if(isCacheValid(parsed.time)){
      allInvoices = parsed.data;
      requestAnimationFrame(() => {
        populateWeeks();
        renderTable();
      });
      loadPotonganCache().then(() => {
        requestAnimationFrame(() => { renderTable(); });
      });
      setTimeout(refreshFromServer, 1000);
      return;
    }
  }

  const data = await callApi("getInvoices", { weeks: 2 });
  allInvoices = data;
  localStorage.setItem(CACHE_KEY_INV, JSON.stringify({ data: allInvoices, time: Date.now() }));

  requestAnimationFrame(() => {
    populateWeeks();
    renderTable();
  });
  loadPotonganCache().then(() => {
    requestAnimationFrame(() => { renderTable(); });
  });
}

async function refreshFromServer(){
  try{
    const fresh = await callApi("getInvoices", { weeks: 2 });
    allInvoices = fresh;
    localStorage.setItem(CACHE_KEY_INV, JSON.stringify({ data: fresh, time: Date.now() }));
    requestAnimationFrame(() => {
      populateWeeks();
      renderTable();
    });
  } catch(e){
    console.log("sync gagal, pakai cache");
  }
}

function populateWeeks(){
  if (!Array.isArray(allInvoices)) allInvoices = [];

  if(!weekSelectTS){
    weekSelectTS = new TomSelect("#weekSelect", {
      create: false,
      controlInput: null,
      onChange: () => { renderTable(); }
    });
  }

  const previousSelectedValue = weekSelectTS.getValue();
  const weeks = {};

  allInvoices.forEach(i => {
    const date = parseDateSafe(i["Tanggal Invoice"]);
    date.setHours(0,0,0,0);
    const start = new Date(date);
    start.setHours(0,0,0,0);
    start.setDate(start.getDate() - date.getDay());

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23,59,59,999);

    const formatDate = (d) => d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
    const key = formatDate(start) + "|" + formatDate(end);
    if(!weeks[key]) weeks[key] = { start, end };
  });

  const keys = Object.keys(weeks);
  weekSelectTS.clearOptions();

  keys.forEach(key=>{
    const [s,e] = key.split("|");
    weekSelectTS.addOption({ value: key, text: `${s} s/d ${e}` });
  });
  weekSelectTS.refreshOptions(false);

  if (keys.length > 0) {
    if (previousSelectedValue && keys.includes(previousSelectedValue)) {
      weekSelectTS.setValue(previousSelectedValue, true);
    } else {
      weekSelectTS.setValue(keys[0], true);
    }
    renderTable();
  }
}

async function renderTable(){
  const key = weekSelectTS ? weekSelectTS.getValue() : "";
  if(!key) return;
  const [startStr,endStr]=key.split("|");
  const start = new Date(startStr + "T00:00:00");
  const end = new Date(endStr + "T23:59:59");

  const weekInvoices = allInvoices.filter(i=>{
    const t = parseDateSafe(i["Tanggal Invoice"]);
    return t>=start && t<=end;
  });

  const validInvoices = weekInvoices.filter(i=>i.Status==="VALID");
  const pendingInvoices = weekInvoices.filter(i => i.Status === "PENDING");
  const payroll = {};
  
  for (const i of weekInvoices) {
    const nama = i["Nama"];
    const divisi = String(i["Divisi"] || "").trim().toUpperCase();
    const total = Number(i["Total"] || 0);

    if (!payroll[nama]) {
      payroll[nama] = { divisi: divisi, total: 0, gaji: 0, invoices: [], gajiStatus: "UNPAID" };
    }
    payroll[nama].invoices.push(i);
    if (i.GajiStatus === "PAID") { payroll[nama].gajiStatus = "PAID"; }
    if (i.Status === "VALID") {
      payroll[nama].total += total;
      payroll[nama].gaji += Number(i.GajiBersih || 0);
    }
  }

  const totalInvoice = validInvoices.length;
  const totalBruto = validInvoices.reduce((a,b)=>a+Number(b.Total||0),0);
  const totalGaji = Object.values(payroll).reduce((a,b)=>a+b.gaji,0);

  document.getElementById("pendingInvoice").innerText = pendingInvoices.length + " Invoice";
  document.getElementById("jumlahInvoice").innerText = totalInvoice + " Invoice";
  document.getElementById("totalInvoiceBruto").innerText = "$KK "+totalBruto.toLocaleString("id-ID");
  document.getElementById("totalGaji").innerText = "$KK "+totalGaji.toLocaleString("id-ID");

  const top3 = Object.entries(payroll).sort((a,b)=>b[1].gaji-a[1].gaji).slice(0,3);
  document.getElementById("topGaji").innerHTML = 
    top3.map((x,i)=>`
      <div class="top-rank-item">
        <span>${["🥇","🥈","🥉"][i]} ${x[0]}</span>
        <span style="font-weight:700; color:#facc15">$KK ${x[1].gaji.toLocaleString("id-ID")}</span>
      </div>
  `).join("");

  const tbody=document.getElementById("tbody");
  if(Object.keys(payroll).length===0){
    tbody.innerHTML='<tr><td colspan="6" class="empty">Belum ada klaim log invoice pada periode ini</td></tr>'; 
    return;
  }
  
  const sortedPayroll = Object.entries(payroll).sort((a, b) => {
    const aHasPending = a[1].invoices.some(i => i.Status === "PENDING");
    const bHasPending = b[1].invoices.some(i => i.Status === "PENDING");
    if (aHasPending && !bHasPending) return -1;
    if (!aHasPending && bHasPending) return 1;
    return a[0].localeCompare(b[0]);
  });

  tbody.innerHTML = sortedPayroll.map(([n,v], idx)=>{
    const hasPending = v.invoices.some(i => i.Status === "PENDING");
    return `
    <tr class="${hasPending ? "row-pending" : ""}">
      <td style="font-weight:600; color:#ffffff;">${n}</td>
      <td>${v.divisi}</td>
      <td>$KK ${v.total.toLocaleString("id-ID")}</td>
      <td>${((potonganCache[v.divisi] || 0) * 100).toFixed(0)}%</td>
      <td><b style="color:#ef4444">$KK ${v.gaji.toLocaleString("id-ID")}</b></td>
      <td><a onclick="toggleDetail(${idx})">Detail</a></td>
    </tr>
    <tr class="detail-row hidden" id="detail-${idx}">
      <td colspan="6" class="detail-row-box">
        <div class="table-responsive" style="margin-top:0;">
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Tanggal</th>
                <th>Invoice</th>
                <th>Qty</th>
                <th>Total</th>
                <th>Link Bukti</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${v.invoices.map((inv, i)=>`
              <tr>
                <td style="font-weight:600; color:var(--muted);">${i + 1}</td>
                <td style="font-family:monospace; white-space: nowrap;">${inv["Tanggal Invoice"]}</td>
                <td>${inv["Jenis Invoice"]}</td>
                <td>${inv["Qty"]}</td>
                <td>${inv.Status==="INVALID"?'<s>$KK '+Number(inv["Total"]).toLocaleString("id-ID")+'</s>':'$KK '+Number(inv["Total"]).toLocaleString("id-ID")}</td>
                <td>${(() => { const h = safeHref(inv["Bukti"]); return h ? `<a href="${h}" target="_blank" rel="noopener noreferrer" style="display:inline-flex; align-items:center; gap:4px;"><i data-lucide="external-link" style="width:12px;height:12px;"></i> Lihat Bukti</a>` : "-"; })()}</td>
                <td>
                  <select onchange="updateStatus('${inv["id"]}', this.value, this)">
                    <option value="PENDING" ${inv.Status==="PENDING"?'selected':''}>⏳ PENDING</option>
                    <option value="VALID" ${inv.Status==="VALID"?'selected':''}>🟢 VALID</option>
                    <option value="INVALID" ${inv.Status==="INVALID"?'selected':''}>❌ INVALID</option>
                  </select>
                </td>
              </tr>`).join("")}
            </tbody>
          </table>
        </div>
      </td>
    </tr>
  `;
  }).join("");
  
  if(window.lucide) { lucide.createIcons(); }
}

function toggleDetail(idx){
  const id="detail-"+idx;
  const row=document.getElementById(id);
  if(row) row.classList.toggle("hidden");
}

async function updateStatus(invoiceId, status, element){
  if(element) element.disabled = true;

  try {
    const data = await callApi("updateInvoiceStatus", { invoice_id: invoiceId, status });
    if(!data.success) {
      alert("Gagal memperbarui status di server.");
      if(element) element.disabled = false;
      return;
    }
    
    let cached = localStorage.getItem(CACHE_KEY_INV);
    if(!cached) return;

    let parsed;
    try { 
      parsed = JSON.parse(cached); 
    } catch(e){ 
      localStorage.removeItem(CACHE_KEY_INV); 
      return; 
    }

    parsed.data = parsed.data.map(i => {
      if (String(i.id) === String(invoiceId)) {
        return { ...i, Status: status };
      }
      return i;
    });

    parsed.time = Date.now();
    localStorage.setItem(CACHE_KEY_INV, JSON.stringify(parsed));
    allInvoices = parsed.data;

    requestAnimationFrame(() => { renderTable(); });
  } catch(err) { 
    alert("Gagal update status akibat gangguan jaringan."); 
    if(element) element.disabled = false;
  }
}

window.addEventListener("load", () => {
  if(window.lucide) { lucide.createIcons(); }
  const isLoggedIn = sessionStorage.getItem(ADMIN_GATE_KEY);
  if(isLoggedIn === "true"){
    document.getElementById("loginCard").classList.add("hidden");
    document.getElementById("adminPanel").classList.remove("hidden");
    loadData();
  }
});

function handleNavbar(){
  const navbar = document.getElementById("navbar");
  if (!navbar) return;
  const isLoggedIn = sessionStorage.getItem(ADMIN_GATE_KEY);
  if (isLoggedIn === "true") {
    navbar.style.display = "flex";
  } else {
    navbar.style.display = "none";
  }
}
window.addEventListener("load", handleNavbar);