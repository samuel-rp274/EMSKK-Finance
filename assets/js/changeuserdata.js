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

function populateJabatanFresh(selectEl, divisi) {
  const list = JABATAN_BY_DIVISI[divisi] || [];
  selectEl.innerHTML = list.map(v => `<option value="${v}">${v}</option>`).join("");
  selectEl.value = divisi === "UMUM" ? "Probation" : (list[0] || "");
}

function populateJabatanWithValue(selectEl, divisi, value) {
  const list = [...(JABATAN_BY_DIVISI[divisi] || [])];
  if (value && !list.includes(value)) list.push(value);
  selectEl.innerHTML = list.map(v => `<option value="${v}">${v}</option>`).join("");
  selectEl.value = value || (divisi === "UMUM" ? "Probation" : (list[0] || ""));
}

function setupJabatanToggle(divisiSelectId, jabatanSelectId, jabatanManualId) {
  const divisiSelect = document.getElementById(divisiSelectId);
  const jabatanSelect = document.getElementById(jabatanSelectId);
  const jabatanManual = document.getElementById(jabatanManualId);

  function apply() {
    const divisi = divisiSelect.value;
    const isTier = TIER_DIVISI.includes(divisi);
    jabatanSelect.classList.toggle("hidden", isTier);
    jabatanManual.classList.toggle("hidden", !isTier);
    jabatanSelect.required = !isTier;
    jabatanManual.required = isTier;

    if (isTier) {
      jabatanManual.placeholder = jabatanPlaceholder(divisi);
    } else {
      populateJabatanFresh(jabatanSelect, divisi);
    }
  }

  divisiSelect.addEventListener("change", apply);
  apply();
}

function getJabatanValue(jabatanSelectId, jabatanManualId) {
  const jabatanManual = document.getElementById(jabatanManualId);
  if (!jabatanManual.classList.contains("hidden")) return jabatanManual.value.trim();
  return document.getElementById(jabatanSelectId).value;
}

function setJabatanValue(divisiSelectId, jabatanSelectId, jabatanManualId, jabatan) {
  const divisiSelect = document.getElementById(divisiSelectId);
  const jabatanSelect = document.getElementById(jabatanSelectId);
  const jabatanManual = document.getElementById(jabatanManualId);
  const divisi = divisiSelect.value;
  const isTier = TIER_DIVISI.includes(divisi);

  jabatanSelect.classList.toggle("hidden", isTier);
  jabatanManual.classList.toggle("hidden", !isTier);
  jabatanSelect.required = !isTier;
  jabatanManual.required = isTier;

  if (isTier) {
    jabatanManual.placeholder = jabatanPlaceholder(divisi);
    jabatanManual.value = jabatan || "";
  } else {
    populateJabatanWithValue(jabatanSelect, divisi, jabatan);
  }
}

setupJabatanToggle("addDivisi", "addJabatanSelect", "addJabatanManual");
setupJabatanToggle("editDivisi", "editJabatanSelect", "editJabatanManual");

document.getElementById("addMemberForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const status = document.getElementById("addStatus");

  const angkatan = document.getElementById("addAngkatan").value.trim();
  const nama = document.getElementById("addNama").value.trim();
  const divisi = document.getElementById("addDivisi").value;
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
    document.getElementById("addDivisi").value = "UMUM";
    setJabatanValue("addDivisi", "addJabatanSelect", "addJabatanManual", "Probation");
  } catch (err) {
    console.error(err);
    status.innerHTML = "❌ Gagal mengirim data (network error)";
  }
});

let searchDebounce = null;
const searchInput = document.getElementById("memberSearch");
const searchResults = document.getElementById("searchResults");

searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim();
  clearTimeout(searchDebounce);

  if (q.length < 2) {
    searchResults.classList.add("hidden");
    searchResults.innerHTML = "";
    return;
  }

  searchDebounce = setTimeout(() => runSearch(q), 350);
});

async function runSearch(q) {
  try {
    const result = await callApi("searchActiveMembers", { q });
    const list = (result && result.data) || [];

    if (list.length === 0) {
      searchResults.innerHTML = `<div class="search-result-empty">Tidak ada member ditemukan</div>`;
    } else {
      searchResults.innerHTML = list.map(p => `
        <div class="search-result-item" data-id="${escapeHtml(p.id)}">
          <div class="search-result-name">${escapeHtml(p.nama)}</div>
          <div class="search-result-meta">Angkatan ${escapeHtml(p.angkatan)} · ${escapeHtml(p.jabatan)} · ${escapeHtml(p.divisi)}</div>
        </div>
      `).join("");
    }
    searchResults.classList.remove("hidden");

    searchResults.querySelectorAll(".search-result-item").forEach(item => {
      item.addEventListener("click", () => selectMember(item.dataset.id));
    });
  } catch (err) {
    console.error("Gagal search member:", err);
  }
}

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
    document.getElementById("editDivisi").value = p.divisi;
    setJabatanValue("editDivisi", "editJabatanSelect", "editJabatanManual", p.jabatan);
    document.getElementById("editStatus").value = p.status;
    document.getElementById("editKetSp").value = p.ket_sp || "";

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
  const divisi = document.getElementById("editDivisi").value;
  const jabatan = getJabatanValue("editJabatanSelect", "editJabatanManual");
  const newStatus = document.getElementById("editStatus").value;
  const ketSp = document.getElementById("editKetSp").value;

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
