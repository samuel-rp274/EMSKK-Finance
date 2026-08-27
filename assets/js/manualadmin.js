lucide.createIcons();

const CACHE_KEY_PRICE_MANUAL = "price_cache_v1";

let emsData = {};

function setMonthYearDefaults() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  const startInput = document.getElementById("attStart");
  const finishInput = document.getElementById("attFinish");
  const invTanggalInput = document.getElementById("invTanggal");

  if (startInput && !startInput.value) {
    startInput.value = `${year}-${month}-01T00:00`;
  }
  if (finishInput && !finishInput.value) {
    finishInput.value = `${year}-${month}-01T00:00`;
  }

  if (invTanggalInput && !invTanggalInput.value) {
    invTanggalInput.value = `${year}-${month}-01`;
  }
}

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
      document.getElementById("loginStatus").innerHTML = "❌ Password salah, kesalahan berulang secara beruntun akan mengunci akun sementara";
    }
  } catch (e) {
    document.getElementById("loginStatus").innerHTML = "❌ Server error, silahkan hubungi FINANCE";
  }
}

async function initManualAdmin() {
  setMonthYearDefaults(); 
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

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("panel-" + btn.dataset.tab).classList.add("active");
    
    setMonthYearDefaults();
  });
});

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

document.getElementById("attNama").addEventListener("change", function () {
  const u = emsData[this.value];
  document.getElementById("attJabatan").innerText = u?.jabatan || "-";
  document.getElementById("attDivisi").innerText = u?.divisi || "-";
});

document.getElementById("invNama").addEventListener("change", function () {
  const u = emsData[this.value];
  document.getElementById("invJabatan").innerText = u?.jabatan || "-";
  document.getElementById("invDivisi").innerText = u?.divisi || "-";
});

const invType = document.getElementById("invType");
let invTypeTS = null;       // TomSelect instance wrapping #invType
let invRawatInapTS = null;  // TomSelect instance wrapping #invRawatInap
let invPembayaranTS = null; // TomSelect instance wrapping #invPembayaran

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

function ensureInvRawatInapPembayaranTS(){
  if(!invRawatInapTS){
    invRawatInapTS = new TomSelect("#invRawatInap", { create: false, controlInput: null });
  }
  if(!invPembayaranTS){
    invPembayaranTS = new TomSelect("#invPembayaran", { create: false, controlInput: null });
  }
}

function handleInvTypeChange(value){
  invNormalSection.classList.add("hidden");
  invOperasiSection.classList.add("hidden");
  invSuratSection.classList.add("hidden");
  invLainSection.classList.add("hidden");

  const optionData = invTypeTS.options[value];
  const price = optionData?.price;

  if (value === "operasi") {
    invOperasiSection.classList.remove("hidden");
    ensureInvRawatInapPembayaranTS();
    invHarga.value = "";
  } else if (value === "surat") {
    invSuratSection.classList.remove("hidden");
    invHarga.value = "";
  } else if (value === "lain") {
    invLainSection.classList.remove("hidden");
    invHarga.value = "";
  } else {
    invNormalSection.classList.remove("hidden");
    invHarga.value = price || 0;
  }
  updateInvTotal();
}

function injectPrice(data) {
  if(!invTypeTS){
    invTypeTS = new TomSelect("#invType", {
      create: false,
      controlInput: null,
      onChange: (value) => { handleInvTypeChange(value); }
    });
  }

  const currentSelection = invTypeTS.getValue();
  invTypeTS.clearOptions();

  data.forEach(item => {
    invTypeTS.addOption({ value: item.label, text: item.label, price: item.price });
  });

  ["operasi", "surat", "lain"].forEach((val) => {
    const labels = { operasi: "OPERASI", surat: "SURAT", lain: "LAIN-LAIN" };
    invTypeTS.addOption({ value: val, text: labels[val] });
  });

  invTypeTS.refreshOptions(false);
  if (currentSelection) invTypeTS.setValue(currentSelection, true);
}

const invNormalSection = document.getElementById("invNormalSection");
const invOperasiSection = document.getElementById("invOperasiSection");
const invSuratSection = document.getElementById("invSuratSection");
const invLainSection = document.getElementById("invLainSection");
const invHarga = document.getElementById("invHarga");

function updateInvTotal() {
  let total = 0;
  const type = invTypeTS ? invTypeTS.getValue() : "";
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

document.getElementById("attendanceManualForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const status = document.getElementById("attStatus");

  const nama = document.getElementById("attNama").value;
  if (!nama || !emsData[nama]) { status.innerHTML = "⚠️ Pilih nama terlebih dahulu"; return; }

  const attStartVal = document.getElementById("attStart").value;
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
    setMonthYearDefaults();
    document.getElementById("attJabatan").innerText = "-";
    document.getElementById("attDivisi").innerText = "-";

    setTimeout(() => { status.innerHTML = ""; }, 3000);
  } catch (err) {
    console.error(err);
    status.innerHTML = "❌ Gagal mengirim data (network error)";
  }
});

document.getElementById("invoiceManualForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const status = document.getElementById("invStatus");

  const nama = invNamaTS ? invNamaTS.getValue() : "";
  if (!nama || !emsData[nama]) { status.innerHTML = "⚠️ Pilih nama terlebih dahulu"; return; }
  const invTypeValue = invTypeTS ? invTypeTS.getValue() : "";
  if (!invTypeValue) { status.innerHTML = "⚠️ Pilih Jenis Invoice"; return; }
  if (!document.getElementById("invTanggal").value) { status.innerHTML = "⚠️ Pilih Tanggal Invoice"; return; }

  const bukti = document.getElementById("invBukti").value;
  if (!bukti.includes("discord.com") && !bukti.includes("discordapp.com") && !bukti.includes("cdn.discordapp.com")) {
    status.innerHTML = "⚠️ Bukti harus link Discord";
    return;
  }

  const jenis = invTypeValue;
  const invTypeText = invTypeTS.options[invTypeValue]?.text || "";
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
    jenisInvoice: invTypeText,
    jenisOperasi: document.getElementById("invJenisOperasi")?.value || "",
    rawatInap: invRawatInapTS ? invRawatInapTS.getValue() : "",
    pembayaran: invPembayaranTS ? invPembayaranTS.getValue() : "",
    jenisSurat: document.getElementById("invJenisSurat")?.value || "",
    keterangan: document.getElementById("invDeskripsiLain")?.value || "",
    harga: hargaFinal,
    qty: qtyFinal,
    total: hargaFinal * qtyFinal,
    bukti: bukti || ""
  };

  const yakin = confirm(`Nama: ${nama}\nInvoice: ${invTypeText}\nTotal: $KK ${hargaFinal * qtyFinal}\nLanjut simpan?`);
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
    // form.reset() only resets the underlying native <select> elements;
    // it doesn't notify TomSelect, so each wrapped dropdown must be synced manually.
    // For rawatInap/pembayaran, the native select's own value is already correctly
    // reset to its default option by form.reset() itself — just mirror that into TomSelect.
    if(invNamaTS) invNamaTS.setValue("", true);
    if(invTypeTS) invTypeTS.setValue("", true);
    if(invRawatInapTS) invRawatInapTS.setValue(document.getElementById("invRawatInap").value, true);
    if(invPembayaranTS) invPembayaranTS.setValue(document.getElementById("invPembayaran").value, true);
    setMonthYearDefaults(); 
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