lucide.createIcons();

const CACHE_KEY_PRICE_MANUAL = "price_cache_v1";

let emsData = {};

/* ---------- Helper: Auto Fill Bulan & Tahun Lokal ---------- */
function setMonthYearDefaults() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  const startInput = document.getElementById("attStart");
  const finishInput = document.getElementById("attFinish");
  const invTanggalInput = document.getElementById("invTanggal");

  // Untuk input datetime-local (Start & Finish Duty): format YYYY-MM-01T00:00
  if (startInput && !startInput.value) {
    startInput.value = `${year}-${month}-01T00:00`;
  }
  if (finishInput && !finishInput.value) {
    finishInput.value = `${year}-${month}-01T00:00`;
  }

  // Untuk input date (Tanggal Invoice): format YYYY-MM-01
  if (invTanggalInput && !invTanggalInput.value) {
    invTanggalInput.value = `${year}-${month}-01`;
  }
}

/* ---------- Admin password gate ---------- */
async function checkLogin() {
  const pw = document.getElementById("adminPassword").value.trim();
  document.getElementById("loginStatus").innerHTML = "⏳ Memeriksa tingkat otentikasi...";

  try {
    const result = await callApi("verifyAdminGate", { password: pw });

    if (result.success) {
      sessionStorage.setItem(ADMIN_GATE_KEY, "true");
      document.getElementById("loginCard").classList.add("hidden");
      document.getElementById("adminPanel").classList.remove("hidden");
      requestAnimationFrame(initManualAdmin);
    } else {
      document.getElementById("loginStatus").innerHTML = "❌ Password salah, maksimal 3x salah maka IP akan di block";
    }
  } catch (e) {
    document.getElementById("loginStatus").innerHTML = "❌ Server error, silahkan hubungi FINANCE";
  }
}

async function initManualAdmin() {
  setMonthYearDefaults(); // Set default bulan & tahun untuk Attendance & Invoice
  await loadEMS();
  await loadPriceList();
}

window.addEventListener("load", () => {
  const isLoggedIn = sessionStorage.getItem(ADMIN_GATE_KEY);
  if (isLoggedIn === "true") {
    document.getElementById("loginCard").classList.add("hidden");
    document.getElementById("adminPanel").classList.remove("hidden");
    requestAnimationFrame(initManualAdmin);
  }
});

/* ---------- Tabs ---------- */
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("panel-" + btn.dataset.tab).classList.add("active");
    
    // Setel ulang default tanggal ketika tab berpindah
    setMonthYearDefaults();
  });
});

/* ---------- Load EMS (nama/jabatan/divisi/id) ---------- */
async function loadEMS() {
  const cached = localStorage.getItem(CACHE_KEY_EMS);

  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.data?.length) {
        buildEMS(parsed.data);
        if (isCacheValid(parsed.time)) {
          refreshEMSFromServer();
          return;
        }
      }
    } catch (e) {
      localStorage.removeItem(CACHE_KEY_EMS);
    }
  }
  await refreshEMSFromServer();
}

async function refreshEMSFromServer() {
  try {
    const data = await callApi("getEMS");
    const safe = Array.isArray(data) ? data : [];

    localStorage.setItem(CACHE_KEY_EMS, JSON.stringify({
      data: safe,
      time: Date.now()
    }));
    buildEMS(safe);
  } catch (e) {
    console.error("Gagal refresh EMS dari server:", e);
  }
}

function buildEMS(data) {
  emsData = {};
  data
    .filter(u => u && u.nama && u.nama.trim().toUpperCase() !== "NAMA")
    .forEach(u => { emsData[u.nama.trim()] = u; });

  fillNamaDropdown("attNama");
  fillNamaDropdown("invNama");
}

let attNamaTS = null;
let invNamaTS = null;

function fillNamaDropdown(selectId) {
  const select = document.getElementById(selectId);
  const options = Object.keys(emsData).sort().map(nama => ({ value: nama, text: nama }));

  let instance = selectId === "attNama" ? attNamaTS : invNamaTS;

  if (!instance) {
    instance = new TomSelect(select, {
      options: options,
      valueField: "value",
      labelField: "text",
      searchField: "text",
      placeholder: "Ketik atau pilih nama",
      create: false
    });
    if (selectId === "attNama") attNamaTS = instance;
    else invNamaTS = instance;
  } else {
    const current = instance.getValue();
    instance.clearOptions();
    instance.addOptions(options);
    if (current && emsData[current]) instance.setValue(current, true);
    else instance.clear(true);
  }
}

/* ---------- Attendance tab: auto-fill jabatan/divisi ---------- */
document.getElementById("attNama").addEventListener("change", function () {
  const u = emsData[this.value];
  document.getElementById("attJabatan").innerText = u?.jabatan || "-";
  document.getElementById("attDivisi").innerText = u?.divisi || "-";
});

/* ---------- Invoice tab: auto-fill jabatan/divisi ---------- */
document.getElementById("invNama").addEventListener("change", function () {
  const u = emsData[this.value];
  document.getElementById("invJabatan").innerText = u?.jabatan || "-";
  document.getElementById("invDivisi").innerText = u?.divisi || "-";
});

/* ---------- Price list (jenis invoice) ---------- */
const invType = document.getElementById("invType");

async function loadPriceList() {
  const cached = localStorage.getItem(CACHE_KEY_PRICE_MANUAL);

  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.data?.length) {
        injectPrice(parsed.data);
        if (isCacheValid(parsed.time)) {
          refreshPriceFromServer();
          return;
        }
      }
    } catch (e) {
      localStorage.removeItem(CACHE_KEY_PRICE_MANUAL);
    }
  }
  await refreshPriceFromServer();
}

async function refreshPriceFromServer() {
  try {
    const data = await callApi("getPriceList");
    const safe = data || [];

    localStorage.setItem(CACHE_KEY_PRICE_MANUAL, JSON.stringify({
      data: safe,
      time: Date.now()
    }));
    injectPrice(safe);
  } catch (e) {
    console.error("Gagal refresh price list dari server:", e);
  }
}

function injectPrice(data) {
  const currentSelection = invType.value;
  invType.innerHTML = `<option value="">Pilih Invoice</option>`;

  data.forEach(item => {
    const opt = document.createElement("option");
    opt.value = item.label;
    opt.textContent = item.label;
    opt.dataset.price = item.price;
    invType.appendChild(opt);
  });

  ["operasi", "surat", "lain"].forEach((val) => {
    const labels = { operasi: "OPERASI", surat: "SURAT", lain: "LAIN-LAIN" };
    const el = document.createElement("option");
    el.value = val;
    el.textContent = labels[val];
    invType.appendChild(el);
  });

  if (currentSelection) invType.value = currentSelection;
}

const invNormalSection = document.getElementById("invNormalSection");
const invOperasiSection = document.getElementById("invOperasiSection");
const invSuratSection = document.getElementById("invSuratSection");
const invLainSection = document.getElementById("invLainSection");
const invHarga = document.getElementById("invHarga");

invType.addEventListener("change", function () {
  invNormalSection.classList.add("hidden");
  invOperasiSection.classList.add("hidden");
  invSuratSection.classList.add("hidden");
  invLainSection.classList.add("hidden");

  const selected = this.options[this.selectedIndex];
  const price = selected?.dataset?.price;

  if (this.value === "operasi") {
    invOperasiSection.classList.remove("hidden");
    invHarga.value = "";
  } else if (this.value === "surat") {
    invSuratSection.classList.remove("hidden");
    invHarga.value = "";
  } else if (this.value === "lain") {
    invLainSection.classList.remove("hidden");
    invHarga.value = "";
  } else {
    invNormalSection.classList.remove("hidden");
    invHarga.value = price || 0;
  }
  updateInvTotal();
});

function updateInvTotal() {
  let total = 0;
  const type = invType.value;
  if (type === "operasi") {
    total = (Number(document.getElementById("invHargaOperasi").value) || 0) * (Number(document.getElementById("invQtyOperasi").value) || 1);
  } else if (type === "surat") {
    total = (Number(document.getElementById("invHargaSurat").value) || 0) * (Number(document.getElementById("invQtySurat").value) || 1);
  } else if (type === "lain") {
    total = (Number(document.getElementById("invHargaLain").value) || 0) * (Number(document.getElementById("invQtyLain").value) || 1);
  } else {
    total = (Number(invHarga.value) || 0) * (Number(document.getElementById("invQty").value) || 1);
  }
  document.getElementById("invTotal").innerText = "$KK " + Number(total).toLocaleString("id-ID");
}

document.getElementById("panel-invoice").addEventListener("input", (e) => {
  const numIds = ["invHarga", "invHargaOperasi", "invHargaSurat", "invHargaLain", "invQty", "invQtyOperasi", "invQtySurat", "invQtyLain"];
  if (numIds.includes(e.target.id)) {
    const el = e.target;
    if (el.id.toLowerCase().includes("qty") && Number(el.value) < 1) el.value = 1;
    if (el.id.toLowerCase().includes("harga") && Number(el.value) < 0) el.value = 0;
  }
  updateInvTotal();
});

/* ---------- Attendance manual submit ---------- */
document.getElementById("attendanceManualForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const status = document.getElementById("attStatus");

  const nama = document.getElementById("attNama").value;
  if (!nama || !emsData[nama]) { status.innerHTML = "⚠️ Pilih nama terlebih dahulu"; return; }

  const attStartVal = document.getElementById("attStart").value;   // "yyyy-MM-ddTHH:mm"
  const attFinishVal = document.getElementById("attFinish").value;

  if (!attStartVal || !attFinishVal) {
    status.innerHTML = "⚠️ Lengkapi start & finish duty";
    return;
  }

  const startTime = attStartVal.replace("T", " ") + ":00";
  const finishTime = attFinishVal.replace("T", " ") + ":00";

  if (new Date(finishTime) <= new Date(startTime)) {
    status.innerHTML = "⚠️ Finish time harus setelah start time";
    return;
  }

  const u = emsData[nama];
  const yakin = confirm(`Nama: ${nama}\nStart: ${startTime}\nFinish: ${finishTime}\nLanjut simpan?`);
  if (!yakin) return;

  status.innerHTML = "⏳ Menyimpan...";

  try {
    const result = await callApi("addManualSession", {
      user_id: u.id,
      jabatan: u.jabatan || "",
      divisi: u.divisi || "",
      startTime: startTime,
      finishTime: finishTime
    });

    if (!result.success) {
      status.innerHTML = "❌ " + (result.message || "Gagal menambah sesi");
      return;
    }

    status.innerHTML = "✅ Sesi duty berhasil ditambahkan (" + result.duration + ")";
    document.getElementById("attendanceManualForm").reset();
    setMonthYearDefaults(); // Reset kembali ke default bulan-tahun lokal
    document.getElementById("attJabatan").innerText = "-";
    document.getElementById("attDivisi").innerText = "-";

    setTimeout(() => { status.innerHTML = ""; }, 3000);
  } catch (err) {
    console.error(err);
    status.innerHTML = "❌ Gagal mengirim data (network error)";
  }
});

/* ---------- Invoice manual submit ---------- */
document.getElementById("invoiceManualForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const status = document.getElementById("invStatus");

  const nama = document.getElementById("invNama").value;
  if (!nama || !emsData[nama]) { status.innerHTML = "⚠️ Pilih nama terlebih dahulu"; return; }
  if (!invType.value) { status.innerHTML = "⚠️ Pilih Jenis Invoice"; return; }
  if (!document.getElementById("invTanggal").value) { status.innerHTML = "⚠️ Pilih Tanggal Invoice"; return; }

  const bukti = document.getElementById("invBukti").value;
  if (!bukti.includes("discord.com") && !bukti.includes("discordapp.com") && !bukti.includes("cdn.discordapp.com")) {
    status.innerHTML = "⚠️ Bukti harus link Discord";
    return;
  }

  const jenis = invType.value;
  let hargaFinal = 0, qtyFinal = 1;
  if (jenis === "operasi") {
    hargaFinal = Number(document.getElementById("invHargaOperasi").value) || 0;
    qtyFinal = Number(document.getElementById("invQtyOperasi").value) || 1;
  } else if (jenis === "surat") {
    hargaFinal = Number(document.getElementById("invHargaSurat").value) || 0;
    qtyFinal = Number(document.getElementById("invQtySurat").value) || 1;
  } else if (jenis === "lain") {
    hargaFinal = Number(document.getElementById("invHargaLain").value) || 0;
    qtyFinal = Number(document.getElementById("invQtyLain").value) || 1;
  } else {
    hargaFinal = Number(invHarga.value) || 0;
    qtyFinal = Number(document.getElementById("invQty").value) || 1;
  }

  const u = emsData[nama];
  const payload = {
    user_id: u.id,
    jabatan: u.jabatan || "",
    divisi: u.divisi || "",
    tanggalInvoice: document.getElementById("invTanggal").value,
    jenisInvoice: invType.options[invType.selectedIndex].text,
    jenisOperasi: document.getElementById("invJenisOperasi")?.value || "",
    rawatInap: document.getElementById("invRawatInap")?.value || "",
    pembayaran: document.getElementById("invPembayaran")?.value || "",
    jenisSurat: document.getElementById("invJenisSurat")?.value || "",
    keterangan: document.getElementById("invDeskripsiLain")?.value || "",
    harga: hargaFinal,
    qty: qtyFinal,
    total: hargaFinal * qtyFinal,
    bukti: bukti || ""
  };

  const yakin = confirm(`Nama: ${nama}\nInvoice: ${invType.options[invType.selectedIndex].text}\nTotal: $KK ${hargaFinal * qtyFinal}\nLanjut simpan?`);
  if (!yakin) return;

  status.innerHTML = "⏳ Mengirim...";

  try {
    const result = await callApi("manualInvoice", payload);

    if (!result.success) {
      status.innerHTML = "❌ " + (result.message || "Gagal menyimpan invoice");
      return;
    }

    status.innerHTML = "✅ Invoice berhasil disimpan";

    document.getElementById("invoiceManualForm").reset();
    setMonthYearDefaults(); // Reset kembali ke default bulan-tahun lokal pada form Invoice
    invNormalSection.classList.remove("hidden");
    invOperasiSection.classList.add("hidden");
    invSuratSection.classList.add("hidden");
    invLainSection.classList.add("hidden");
    document.getElementById("invTotal").innerText = "$KK 0";
    document.getElementById("invJabatan").innerText = "-";
    document.getElementById("invDivisi").innerText = "-";

    setTimeout(() => { status.innerHTML = ""; }, 3000);
  } catch (err) {
    console.error(err);
    status.innerHTML = "❌ Gagal mengirim invoice";
  }
});