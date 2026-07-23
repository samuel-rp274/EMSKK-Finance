lucide.createIcons();

let allInvoices = [];
let tomSelectInstance = null;
const CACHE_KEY_INV = "invoice_cache_v1";


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
      .forEach(item=>{
        const opt = document.createElement("option");
        opt.value = item.nama.trim();
        opt.textContent = item.nama.trim();
        select.appendChild(opt);
    });

    tomSelectInstance = new TomSelect("#searchEMS",{
        create:false,
        sortField:{field:"text",direction:"asc"},
        placeholder:"Cari nama EMS...",
        dropdownParent: "body",
        onChange: function(value){
          localStorage.setItem("ems_name", value);
          renderTable();
        }
    });

    const saved = localStorage.getItem("ems_name");
    if (saved) {
      setTimeout(() => {
        tomSelectInstance.setValue(saved);
      }, 100);
    }
}

async function loadData(){
    const cached = localStorage.getItem(CACHE_KEY_INV);

    if(cached){
        let parsed = null;
        try {
            parsed = JSON.parse(cached);
        } catch(e){
            localStorage.removeItem(CACHE_KEY_INV);
        }

        if(parsed && isCacheValid(parsed.time)){
            allInvoices = parsed.data || [];
            requestAnimationFrame(() => renderTable());
            refreshFromServer();
            return;
        }
    }

    try {
        const res = await fetch(SCRIPT_URL+"?action=getInvoicesAll");
        const data = await res.json();
        allInvoices = data || [];
        localStorage.setItem(CACHE_KEY_INV, JSON.stringify({
            data: allInvoices,
            time: Date.now()
        }));
        requestAnimationFrame(() => renderTable());
    } catch(e){
        console.error("Gagal fetch invoice:", e);
        handleFetchError();
    }
}

async function refreshFromServer(){
    try{
        const res = await fetch(SCRIPT_URL+"?action=getInvoicesAll");
        const fresh = await res.json();
        allInvoices = fresh;
        localStorage.setItem(CACHE_KEY_INV, JSON.stringify({
            data: fresh,
            time: Date.now()
        }));
        requestAnimationFrame(() => renderTable());
    } catch(e){
        console.log("sync gagal, pakai cache");
        handleFetchError();
    }
}

function handleFetchError() {
    const fallback = localStorage.getItem(CACHE_KEY_INV);
    if(fallback) {
        try {
            const parsed = JSON.parse(fallback);
            allInvoices = parsed.data || [];
            requestAnimationFrame(() => renderTable());
            
            showStatusMessage("⚠️ Gagal sinkronisasi dengan server. Menampilkan data cadangan terakhir (Offline).", "#f59e0b");
            return;
        } catch(err) {
        }
    }
    
    allInvoices = [];
    document.getElementById("tbody").innerHTML = `
        <tr>
            <td colspan="6" class="empty" style="color: #ef4444; padding: 40px !important;">
                <i data-lucide="alert-triangle" style="width: 24px; height: 24px; margin: 0 auto 10px auto; display: block;"></i>
                Gagal memuat data dari server. Silakan periksa koneksi internet Anda atau hubungi admin.
            </td>
        </tr>
    `;
    if(window.lucide) lucide.createIcons();
}

function showStatusMessage(msg, color) {
    let oldMsg = document.getElementById("error-status-msg");
    if(oldMsg) oldMsg.remove();
    
    const div = document.createElement("div");
    div.id = "error-status-msg";
    div.style.color = color;
    div.style.textAlign = "center";
    div.style.fontSize = "13px";
    div.style.fontWeight = "600";
    div.style.marginTop = "15px";
    div.innerText = msg;
    
    const container = document.querySelector(".card");
    if(container) container.appendChild(div);
}

function getWeekRange(date){
    const d = new Date(date);
    const day = d.getDay();
    const start = new Date(d);
    start.setDate(d.getDate() - day);
    start.setHours(0,0,0,0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23,59,59,999);

    return { start, end };
}

function safeDate(val){
  if(!val) return new Date(0);
  const str = String(val).split("T")[0].split(" ")[0];
  const parts = str.split("-");
  if(parts.length === 3){
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date(val);
}

function renderTable(){
    const name = (tomSelectInstance?.getValue() || "").toLowerCase().trim();

    if(!name){
        document.getElementById("tbody").innerHTML =
        `<tr><td colspan="6" class="empty">Pilih EMS terlebih dahulu</td></tr>`;
        return;
    }

    const filtered = allInvoices.filter(i =>
     (i["Nama"] || "").toLowerCase().trim() === name
    );
    
    if(filtered.length===0){
        document.getElementById("jumlahInvoice").innerText = "0";
        document.getElementById("totalGaji").innerText = "$KK 0";
        document.getElementById("uploadTerakhir").innerText = "-";
        document.getElementById("tbody").innerHTML =
        `<tr><td colspan="6" class="empty">Belum ada invoice</td></tr>`;
        return;
    }
    
    const today = new Date();
    const { start, end } = getWeekRange(today);
    
    const weekInvoices = filtered.filter(i => {
        const t = safeDate(i["Tanggal Invoice"]);
        return t >= start && t <= end;
    });

    document.getElementById("jumlahInvoice").innerText = weekInvoices.length;

    document.getElementById("totalGaji").innerText =
    "$KK " + weekInvoices
        .reduce((a,b)=>a+(Number(b["Total"])||0),0)
        .toLocaleString("id-ID");
    
    const last = filtered
     .filter(i => i["Tanggal Invoice"])
     .sort((a, b) => safeDate(b["Tanggal Invoice"]) - safeDate(a["Tanggal Invoice"]))[0];
    
    if(last && last["Tanggal Invoice"]){
        const dateObj = safeDate(last["Tanggal Invoice"]);
        const formattedDate = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString("id-ID") : last["Tanggal Invoice"];
        document.getElementById("uploadTerakhir").innerText = formattedDate + " - " + (last["Jenis Invoice"] || "");
    } else {
        document.getElementById("uploadTerakhir").innerText = "-";
    }

    document.getElementById("tbody").innerHTML = weekInvoices.length ? weekInvoices.map((i, idx)=>{
        const dateObj = safeDate(i["Tanggal Invoice"]);
        const formattedDate = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString("id-ID") : i["Tanggal Invoice"];
        return `
        <tr>
            <td>${idx + 1}</td>
            <td>${formattedDate}</td>
            <td>${i["Jenis Invoice"] || ""}</td>
            <td>${i["Qty"] || 0}</td>
            <td>$KK ${Number(i["Total"] || 0).toLocaleString("id-ID")}</td>
            <td><a href="${i["Bukti"] || '#'}" target="_blank"><i data-lucide="external-link" style="width: 14px; height: 14px;"></i> Lihat</a></td>
        </tr>
        `;
    }).join("") : `<tr><td colspan="6" class="empty">Tidak ada invoice minggu ini</td></tr>`;
    
    lucide.createIcons();
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadEMS();
    await loadData();
});