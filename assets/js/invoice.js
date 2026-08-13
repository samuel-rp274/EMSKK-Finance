lucide.createIcons();

function getWIBDate() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc + (7 * 60 * 60000));
}

const CACHE_KEY_PRICE = "price_cache_v1";

let currentUser = null;

const nama = document.getElementById("nama");
const jabatan = document.getElementById("jabatan");
const divisi = document.getElementById("divisi");
const harga = document.getElementById("harga");

const invoiceType = document.getElementById("invoiceType");
let invoiceTypeTS = null;   // TomSelect instance wrapping #invoiceType
let rawatInapTS = null;     // TomSelect instance wrapping #rawatInap
let pembayaranTS = null;    // TomSelect instance wrapping #pembayaran
const status = document.getElementById("status");
const normalSection = document.getElementById("normalSection");
const operasiSection = document.getElementById("operasiSection");
const suratSection = document.getElementById("suratSection");
const lainSection = document.getElementById("lainSection");

const tanggalInvoice = document.getElementById("tanggalInvoice");

const hargaOperasi = document.getElementById("hargaOperasi");
const qtyOperasi = document.getElementById("qtyOperasi");
const hargaSurat = document.getElementById("hargaSurat");
const qtySurat = document.getElementById("qtySurat");
const hargaLain = document.getElementById("hargaLain");
const qtyLain = document.getElementById("qtyLain");
const qty = document.getElementById("qty");
const jenisOperasi = document.getElementById("jenisOperasi");
const jenisSurat = document.getElementById("jenisSurat");
const deskripsiLain = document.getElementById("deskripsiLain");

function ensureRawatInapPembayaranTS(){
  if(!rawatInapTS){
    rawatInapTS = new TomSelect("#rawatInap", { create: false, controlInput: null });
  }
  if(!pembayaranTS){
    pembayaranTS = new TomSelect("#pembayaran", { create: false, controlInput: null });
  }
}

async function loadPriceList(){
  const cached = localStorage.getItem(CACHE_KEY_PRICE);

  if(cached){
    try {
      const parsed = JSON.parse(cached);
      if(parsed && parsed.data?.length){
        injectPrice(parsed.data);
        if(isCacheValid(parsed.time)){
          refreshPriceFromServer();
          return;
        }
      }
    } catch(e){
      localStorage.removeItem(CACHE_KEY_PRICE);
    }
  }
  await refreshPriceFromServer();
}

async function refreshPriceFromServer(){
  try {
    const data = await callApi("getPriceList");
    const safe = data || [];

    localStorage.setItem(CACHE_KEY_PRICE, JSON.stringify({
      data: safe,
      time: Date.now()
    }));
    injectPrice(safe);
  } catch(e) {
    console.error("Gagal refresh price list dari server:", e);
  }
}

function handleInvoiceTypeChange(value){
    normalSection.classList.add("hidden");
    operasiSection.classList.add("hidden");
    suratSection.classList.add("hidden");
    lainSection.classList.add("hidden");

    const optionData = invoiceTypeTS.options[value];
    const price = optionData?.price;

    if (value === "operasi") {
        operasiSection.classList.remove("hidden");
        ensureRawatInapPembayaranTS();
        harga.value = "";
    }
    else if (value === "surat") {
        suratSection.classList.remove("hidden");
        harga.value = "";
    }
    else if (value === "lain") {
        lainSection.classList.remove("hidden");
        harga.value = "";
    }
    else {
        normalSection.classList.remove("hidden");
        harga.value = price || 0;
    }
    updateTotal();
}

function injectPrice(data){
    if (!Array.isArray(data)) data = [];

    if(!invoiceTypeTS){
      invoiceTypeTS = new TomSelect("#invoiceType", {
        create: false,
        controlInput: null,
        onChange: (value) => { handleInvoiceTypeChange(value); }
      });
    }

    const currentSelection = invoiceTypeTS.getValue();
    invoiceTypeTS.clearOptions();

    data.forEach(item => {
        invoiceTypeTS.addOption({ value: item.label, text: item.label, price: item.price });
    });

    injectSpecialOptions();
    invoiceTypeTS.refreshOptions(false);
    if(currentSelection) invoiceTypeTS.setValue(currentSelection, true);
}

function injectSpecialOptions() {
  const specialOptions = [
    { value: "operasi", text: "OPERASI" },
    { value: "surat", text: "SURAT" },
    { value: "lain", text: "LAIN-LAIN" }
  ];

  specialOptions.forEach(opt => invoiceTypeTS.addOption(opt));
}

(function(){
    const now = getWIBDate();
    const start = new Date(now);
    start.setHours(0,0,0,0);

    const day = start.getDay(); 
    start.setDate(start.getDate() - day);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23,59,59,999);

    const formatDate = (d)=>{
        const y = d.getFullYear();
        const m = String(d.getMonth()+1).padStart(2,"0");
        const day = String(d.getDate()).padStart(2,"0");
        return `${y}-${m}-${day}`;
    };

    tanggalInvoice.min = formatDate(start);
    tanggalInvoice.max = formatDate(end);
})();

async function applySessionIdentity(){
  if (!window.__guardSession) return;
  const session = await window.__guardSession;
  if (!session || !session.id) {
    nama.innerText = "(data EMS tidak ditemukan)";
    return;
  }

  currentUser = {
    id: session.id,
    nama: session.nama,
    jabatan: session.jabatan || "",
    divisi: session.divisi || ""
  };

  nama.innerText = currentUser.nama;
  jabatan.innerText = currentUser.jabatan;
  divisi.innerText = currentUser.divisi;
}

document.getElementById("bukti").addEventListener("keydown", function(e){
    if(e.key === "Enter") e.preventDefault();
});

document.addEventListener("input", (e) => {
    const numIds = ["harga","hargaOperasi","hargaSurat","hargaLain","qty","qtyOperasi","qtySurat","qtyLain"];
    if(numIds.includes(e.target.id)){
        const el = e.target;
        if(el.id.includes("qty") && Number(el.value)<1) el.value=1;
        if(el.id.includes("harga") && Number(el.value)<0) el.value=0;
    }
});

function updateTotal(){
    let total = 0;
    const type = invoiceTypeTS ? invoiceTypeTS.getValue() : "";
    if(type==="operasi") total = (Number(hargaOperasi.value)||0)*(Number(qtyOperasi.value)||1);
    else if(type==="surat") total = (Number(hargaSurat.value)||0)*(Number(qtySurat.value)||1);
    else if(type==="lain") total = (Number(hargaLain.value)||0)*(Number(qtyLain.value)||1);
    else total = (Number(harga.value)||0)*(Number(qty.value)||1);
    document.getElementById("total").innerText = "$KK "+Number(total).toLocaleString("id-ID");
}

document.addEventListener("input", updateTotal);

document.getElementById("invoiceForm").addEventListener("submit", async (e)=>{
    e.preventDefault();
    if(!currentUser){ status.innerHTML = "⚠️ Data EMS tidak ditemukan, tidak bisa submit"; return; }
    const invoiceTypeValue = invoiceTypeTS ? invoiceTypeTS.getValue() : "";
    if(!invoiceTypeValue){ status.innerHTML = "⚠️ Pilih Jenis Invoice"; return; }
    if(!document.getElementById("tanggalInvoice").value){ status.innerHTML = "⚠️ Pilih Tanggal Invoice"; return; }

    const bukti = document.getElementById("bukti").value;
    if (!bukti.includes("discord.com") && !bukti.includes("discordapp.com") && !bukti.includes("cdn.discordapp.com")) {
        status.innerHTML = "⚠️ Bukti harus link Discord"; return;
    }

    const jenis = invoiceTypeValue;
    const invoiceTypeText = invoiceTypeTS.options[invoiceTypeValue]?.text || "";
    let hargaFinal = 0;
    let qtyFinal = 1;
    if(jenis==="operasi"){ hargaFinal = Number(hargaOperasi.value)||0; qtyFinal = Number(qtyOperasi.value)||1; }
    else if(jenis==="surat"){ hargaFinal = Number(hargaSurat.value)||0; qtyFinal = Number(qtySurat.value)||1; }
    else if(jenis==="lain"){ hargaFinal = Number(hargaLain.value)||0; qtyFinal = Number(qtyLain.value)||1; }
    else{ hargaFinal = Number(harga.value)||0; qtyFinal = Number(qty.value)||1; }

    const payload = {
        user_id: currentUser.id,
        jabatan: currentUser.jabatan,
        divisi: currentUser.divisi,
        tanggalInvoice: document.getElementById("tanggalInvoice").value,
        jenisInvoice: invoiceTypeText,
        jenisOperasi: document.getElementById("jenisOperasi")?.value || "",
        rawatInap: rawatInapTS ? rawatInapTS.getValue() : "",
        pembayaran: pembayaranTS ? pembayaranTS.getValue() : "",
        jenisSurat: document.getElementById("jenisSurat")?.value || "",
        keterangan: document.getElementById("deskripsiLain")?.value || "",
        harga: hargaFinal,
        qty: qtyFinal,
        total: hargaFinal*qtyFinal,
        bukti: bukti||""
    };

    status.innerHTML = "⏳ Mengirim...";
    try{
        const yakin = confirm(`Nama: ${currentUser.nama}\nInvoice: ${invoiceTypeText}\nTotal: $KK ${hargaFinal*qtyFinal}\nLanjut simpan?`);
        if(!yakin) { status.innerHTML = ""; return; }

        const result = await callApi("submitInvoice", payload);

        if (!result.success) {
            status.innerHTML = "⚠️ " + (result.message || "Gagal menyimpan invoice");
            return;
        }

        status.innerHTML = "✅ Invoice berhasil disimpan";

        setTimeout(() => {
            status.textContent = "";
        }, 3000);

        document.getElementById("tanggalInvoice").value = "";
        if(invoiceTypeTS) invoiceTypeTS.setValue("", true);
        document.getElementById("bukti").value = "";

        normalSection.classList.remove("hidden");
        operasiSection.classList.add("hidden");
        suratSection.classList.add("hidden");
        lainSection.classList.add("hidden");

        harga.value = "";
        qty.value = 1;
        hargaOperasi.value = "";
        qtyOperasi.value = 1;
        hargaSurat.value = "";
        qtySurat.value = 1;
        hargaLain.value = "";
        qtyLain.value = 1;
        jenisOperasi.value = "";
        jenisSurat.value = "";
        deskripsiLain.value = "";

        document.getElementById("total").innerText = "$KK 0";

        jabatan.innerText = currentUser.jabatan;
        divisi.innerText = currentUser.divisi;

    } catch(err){
        console.error(err);
        status.innerHTML = "❌ Gagal mengirim invoice";
    }
});

document.addEventListener("DOMContentLoaded", async () => {
    await applySessionIdentity();
    await loadPriceList();
});