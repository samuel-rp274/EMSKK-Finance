lucide.createIcons();

async function checkLogin() {
  const pw = document.getElementById("adminPassword").value.trim();
  document.getElementById("loginStatus").innerHTML = "⏳ Memeriksa tingkat otentikasi...";

  try {
    const result = await callApi("verifyAdminGate", { password: pw });

    if (result.success) {
      sessionStorage.setItem(ADMIN_GATE_KEY, "true");
      document.getElementById("loginCard").classList.add("hidden");
      document.getElementById("adminPanel").classList.remove("hidden");
    } else {
      document.getElementById("loginStatus").innerHTML = "❌ Password salah, maksimal 3x salah maka IP akan di block";
    }
  } catch (e) {
    document.getElementById("loginStatus").innerHTML = "❌ Server error, silahkan hubungi FINANCE";
  }
}

window.addEventListener("load", () => {
  const isLoggedIn = sessionStorage.getItem(ADMIN_GATE_KEY);
  if (isLoggedIn === "true") {
    document.getElementById("loginCard").classList.add("hidden");
    document.getElementById("adminPanel").classList.remove("hidden");
  }
});

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("panel-" + btn.dataset.tab).classList.add("active");
  });
});

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}

const tomSelects = {}; // select id -> TomSelect instance, for lookup by helpers below

const TIER_DIVISI = ["PETINGGI", "PENGURUS", "SPESIALIS"];
const JABATAN_BY_DIVISI = {
  OBGYN: ["Dokter Obgyn", "Ass. Obgyn"],
  LAB: ["Dokter Lab", "Ass. Lab"],
  OPLAS: ["Dokter Oplas", "Ass. Oplas"],
  UMUM: ["Dokter Umum", "Co. Ass", "Trainee", "Probation"],
};

function jabatanPlaceholder(divisi) {
  if (divisi === "SPESIALIS") return "Contoh: Dokter Spesialis Bedah Plastik";
  return "Contoh: CEO - Dokter"; 
}

function populateJabatanFresh(jabatanTS, divisi) {
  const list = JABATAN_BY_DIVISI[divisi] || [];
  jabatanTS.clearOptions();
  list.forEach(v => jabatanTS.addOption({ value: v, text: v }));
  jabatanTS.refreshOptions(false);
  jabatanTS.setValue(divisi === "UMUM" ? "Probation" : (list[0] || ""), true);
}

function populateJabatanWithValue(jabatanTS, divisi, value) {
  const list = [...(JABATAN_BY_DIVISI[divisi] || [])];
  if (value && !list.includes(value)) list.push(value);
  jabatanTS.clearOptions();
  list.forEach(v => jabatanTS.addOption({ value: v, text: v }));
  jabatanTS.refreshOptions(false);
  jabatanTS.setValue(value || (divisi === "UMUM" ? "Probation" : (list[0] || "")), true);
}

function setupJabatanToggle(divisiSelectId, jabatanSelectId, jabatanManualId) {
  const divisiTS = new TomSelect(`#${divisiSelectId}`, {
    create: false,
    controlInput: null, // no free-typing, dropdown-only selection
    onChange: () => apply()
  });
  const jabatanTS = new TomSelect(`#${jabatanSelectId}`, {
    create: false,
    controlInput: null
  });
  const jabatanSelectEl = document.getElementById(jabatanSelectId);
  const jabatanManual = document.getElementById(jabatanManualId);

  tomSelects[divisiSelectId] = divisiTS;
  tomSelects[jabatanSelectId] = jabatanTS;

  function apply() {
    const divisi = divisiTS.getValue();
    const isTier = TIER_DIVISI.includes(divisi);
    // The original <select> is hidden by TomSelect itself; toggle the visible
    // .ts-wrapper (jabatanTS.wrapper) instead, or this has no visible effect.
    jabatanTS.wrapper.classList.toggle("hidden", isTier);
    jabatanManual.classList.toggle("hidden", !isTier);
    jabatanSelectEl.required = !isTier;
    jabatanManual.required = isTier;

    if (isTier) {
      jabatanManual.placeholder = jabatanPlaceholder(divisi);
    } else {
      populateJabatanFresh(jabatanTS, divisi);
    }
  }

  apply();
}

function getJabatanValue(jabatanSelectId, jabatanManualId) {
  const jabatanManual = document.getElementById(jabatanManualId);
  if (!jabatanManual.classList.contains("hidden")) return jabatanManual.value.trim();
  return tomSelects[jabatanSelectId].getValue();
}

function setJabatanValue(divisiSelectId, jabatanSelectId, jabatanManualId, jabatan) {
  const divisiTS = tomSelects[divisiSelectId];
  const jabatanTS = tomSelects[jabatanSelectId];
  const jabatanSelectEl = document.getElementById(jabatanSelectId);
  const jabatanManual = document.getElementById(jabatanManualId);
  const divisi = divisiTS.getValue();
  const isTier = TIER_DIVISI.includes(divisi);

  jabatanTS.wrapper.classList.toggle("hidden", isTier);
  jabatanManual.classList.toggle("hidden", !isTier);
  jabatanSelectEl.required = !isTier;
  jabatanManual.required = isTier;

  if (isTier) {
    jabatanManual.placeholder = jabatanPlaceholder(divisi);
    jabatanManual.value = jabatan || "";
  } else {
    populateJabatanWithValue(jabatanTS, divisi, jabatan);
  }
}

setupJabatanToggle("addDivisi", "addJabatanSelect", "addJabatanManual");
setupJabatanToggle("editDivisi", "editJabatanSelect", "editJabatanManual");

tomSelects["editStatus"] = new TomSelect("#editStatus", { create: false, controlInput: null });
tomSelects["editKetSp"] = new TomSelect("#editKetSp", { create: false, controlInput: null });

document.getElementById("addMemberForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const status = document.getElementById("addStatus");

  const angkatan = document.getElementById("addAngkatan").value.trim();
  const nama = document.getElementById("addNama").value.trim();
  const divisi = tomSelects["addDivisi"].getValue();
  const jabatan = getJabatanValue("addJabatanSelect", "addJabatanManual");
  const passporHex = document.getElementById("addPassporHex").value.trim();

  if (!angkatan || isNaN(Number(angkatan))) { status.innerHTML = "⚠️ Angkatan harus berupa angka"; return; }
  if (!nama) { status.innerHTML = "⚠️ Nama wajib diisi"; return; }
  if (!jabatan) { status.innerHTML = "⚠️ Jabatan wajib diisi"; return; }
  if (!passporHex.toLowerCase().includes("steam")) { status.innerHTML = "⚠️ Passpor Hex harus mengandung kata 'steam'"; return; }

  const yakin = confirm(`Tambah member baru?\n\nNama: ${nama}\nAngkatan: ${angkatan}\nJabatan: ${jabatan}\nDivisi: ${divisi}`);
  if (!yakin) return;

  status.innerHTML = "⏳ Menyimpan...";

  try {
    const result = await callApi("addMember", { angkatan, nama, jabatan, divisi, passporHex });

    if (!result.success) {
      status.innerHTML = "❌ " + (result.message || "Gagal menambah member");
      return;
    }

    status.innerHTML = `✅ Member berhasil ditambahkan (username: ${result.username}, password: ${angkatan})`;
    document.getElementById("addMemberForm").reset();
    tomSelects["addDivisi"].setValue("UMUM", true);
    setJabatanValue("addDivisi", "addJabatanSelect", "addJabatanManual", "Probation");
  } catch (err) {
    console.error(err);
    status.innerHTML = "❌ Gagal mengirim data (network error)";
  }
});

function setupMemberSearch(inputEl, resultsEl, onSelect) {
  let debounce = null;

  inputEl.addEventListener("input", () => {
    const q = inputEl.value.trim();
    clearTimeout(debounce);

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
        <div class="search-result-item" data-id="${escapeHtml(p.id)}">
          <div class="search-result-name">${escapeHtml(p.nama)}</div>
          <div class="search-result-meta">Angkatan ${escapeHtml(p.angkatan)} · ${escapeHtml(p.jabatan)} · ${escapeHtml(p.divisi)}</div>
        </div>
      `).join("");
    }
    resultsEl.classList.remove("hidden");

    resultsEl.querySelectorAll(".search-result-item").forEach(item => {
      item.addEventListener("click", () => onSelect(item.dataset.id));
    });
  } catch (err) {
    console.error("Gagal search member:", err);
  }
}

const searchInput = document.getElementById("memberSearch");
const searchResults = document.getElementById("searchResults");
setupMemberSearch(searchInput, searchResults, (id) => selectMember(id));

async function selectMember(id) {
  const status = document.getElementById("updateStatus");
  status.innerHTML = "";
  searchResults.classList.add("hidden");

  try {
    const result = await callApi("getMemberForEdit", { id });
    if (!result.success) {
      alert(result.message || "Gagal memuat data member");
      return;
    }

    const p = result.data;
    document.getElementById("editId").value = p.id;
    document.getElementById("editingName").innerText = p.nama;
    document.getElementById("editAngkatan").value = p.angkatan;
    document.getElementById("editNama").value = p.nama;
    tomSelects["editDivisi"].setValue(p.divisi, true);
    setJabatanValue("editDivisi", "editJabatanSelect", "editJabatanManual", p.jabatan);
    tomSelects["editStatus"].setValue(p.status, true);
    tomSelects["editKetSp"].setValue(p.ket_sp || "", true);

    document.getElementById("editMemberWrap").classList.remove("hidden");
    searchInput.value = p.nama;
  } catch (err) {
    console.error(err);
    alert("Gagal memuat data member (network error)");
  }
}

document.getElementById("updateMemberForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const status = document.getElementById("updateStatus");

  const id = document.getElementById("editId").value;
  const angkatan = document.getElementById("editAngkatan").value.trim();
  const nama = document.getElementById("editNama").value.trim();
  const divisi = tomSelects["editDivisi"].getValue();
  const jabatan = getJabatanValue("editJabatanSelect", "editJabatanManual");
  const newStatus = tomSelects["editStatus"].getValue();
  const ketSp = tomSelects["editKetSp"].getValue();

  if (!angkatan || isNaN(Number(angkatan))) { status.innerHTML = "⚠️ Angkatan harus berupa angka"; return; }
  if (!nama) { status.innerHTML = "⚠️ Nama wajib diisi"; return; }
  if (!jabatan) { status.innerHTML = "⚠️ Jabatan wajib diisi"; return; }

  const exitStatuses = ["RESIGN", "PTDH", "DEATH", "PENSIUN"];
  let confirmMsg = `Simpan perubahan untuk ${nama}?`;
  if (exitStatuses.includes(newStatus)) {
    confirmMsg += `\n\n⚠️ Status diubah jadi "${newStatus}" — akun login member ini akan DINONAKTIFKAN PERMANEN (username & password dihapus), dan tidak akan muncul lagi di pencarian ini.`;
  }
  const yakin = confirm(confirmMsg);
  if (!yakin) return;

  status.innerHTML = "⏳ Menyimpan...";

  try {
    const result = await callApi("updateMember", { id, angkatan, nama, jabatan, divisi, status: newStatus, ketSp });

    if (!result.success) {
      status.innerHTML = "❌ " + (result.message || "Gagal menyimpan perubahan");
      return;
    }

    status.innerHTML = "✅ Perubahan berhasil disimpan";
    document.getElementById("editMemberWrap").classList.add("hidden");
    searchInput.value = "";
  } catch (err) {
    console.error(err);
    status.innerHTML = "❌ Gagal mengirim data (network error)";
  }
});

let resetSelectedId = null;

const resetSearchInput = document.getElementById("resetSearch");
const resetSearchResults = document.getElementById("resetSearchResults");
setupMemberSearch(resetSearchInput, resetSearchResults, (id) => selectResetMember(id));

async function selectResetMember(id) {
  const status = document.getElementById("resetStatus");
  status.innerHTML = "";
  document.getElementById("resetResultBox").classList.add("hidden");
  resetSearchResults.classList.add("hidden");

  try {
    const result = await callApi("getMemberForEdit", { id });
    if (!result.success) {
      alert(result.message || "Gagal memuat data member");
      return;
    }

    const p = result.data;
    resetSelectedId = p.id;
    document.getElementById("resetName").innerText = p.nama;
    document.getElementById("resetMeta").innerText = `Angkatan ${p.angkatan} · ${p.jabatan} · ${p.divisi} · ${p.status}`;
    document.getElementById("resetUsername").innerText = `Username: ${p.username || "-"}`;

    document.getElementById("resetMemberWrap").classList.remove("hidden");
    resetSearchInput.value = p.nama;
  } catch (err) {
    console.error(err);
    alert("Gagal memuat data member (network error)");
  }
}

document.getElementById("resetPasswordBtn").addEventListener("click", async () => {
  if (!resetSelectedId) return;

  const status = document.getElementById("resetStatus");
  const resultBox = document.getElementById("resetResultBox");
  const nama = document.getElementById("resetName").innerText;

  const yakin = confirm(`Reset password ${nama} ke default (angkatan)?\n\nSesi login member ini akan otomatis logout dan wajib login ulang.`);
  if (!yakin) return;

  status.innerHTML = "⏳ Memproses reset password...";
  resultBox.classList.add("hidden");

  try {
    const result = await callApi("resetPasswordToDefault", { id: resetSelectedId });

    if (!result.success) {
      status.innerHTML = "❌ " + (result.message || "Gagal reset password");
      return;
    }

    status.innerHTML = "";
    document.getElementById("resetResultUsername").innerText = result.username;
    document.getElementById("resetResultPassword").innerText = result.password;
    resultBox.classList.remove("hidden");
    lucide.createIcons();
  } catch (err) {
    console.error(err);
    status.innerHTML = "❌ Gagal mengirim data (network error)";
  }
});
