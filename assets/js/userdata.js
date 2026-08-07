let allMembers = [];

const TIER_ORDER = ["CEO", "DIREKTUR", "WAKDIR Personalia", "WAKDIR Operasional", "HRD", "FINANCE", "KOMDIS"];

const DOKTER_JABATAN = ["Dokter Umum", "Dokter Obgyn", "Dokter Oplas", "Dokter Lab"];
const COASS_JABATAN = ["Co. Ass", "Ass. Oplas", "Ass. Obgyn", "Ass. Lab"];

const ACTIVE_STATUS = ["AKTIF", "TIDAK AKTIF"];
const EXIT_STATUS = ["RESIGN", "PTDH", "DEATH", "PENSIUN"];

const SECTIONS = [
  { key: "petinggi_pengurus", label: "Petinggi & Pengurus", icon: "crown" },
  { key: "spesialis", label: "Dokter Spesialis", icon: "stethoscope" },
  { key: "dokter", label: "Dokter", icon: "heart-pulse" },
  { key: "coass", label: "Co. Ass", icon: "users" },
  { key: "trainee", label: "Trainee", icon: "graduation-cap" },
  { key: "probation", label: "Probation", icon: "hourglass" },
  { key: "lainnya", label: "Lainnya", icon: "help-circle" },
];

function angkatanNum(a) {
  const n = parseFloat(a);
  return isNaN(n) ? 0 : n;
}

function sortByAngkatanAbjad(list) {
  return list.slice().sort((a, b) => {
    const da = angkatanNum(a.angkatan), db = angkatanNum(b.angkatan);
    if (da !== db) return da - db;
    return (a.nama || "").localeCompare(b.nama || "", "id", { sensitivity: "base" });
  });
}

function classifyActive(person) {
  const divisi = (person.divisi || "").toUpperCase().trim();
  if (divisi === "PETINGGI" || divisi === "PENGURUS") return "petinggi_pengurus";
  if (divisi === "SPESIALIS") return "spesialis";

  const jab = (person.jabatan || "").trim();
  if (DOKTER_JABATAN.includes(jab)) return "dokter";
  if (COASS_JABATAN.includes(jab)) return "coass";
  if (jab === "Trainee") return "trainee";
  if (jab === "Probation") return "probation";
  return "lainnya";
}

function sortPetinggiPengurus(list) {
  return list.slice().sort((a, b) => {
    const ia = TIER_ORDER.indexOf(a.title);
    const ib = TIER_ORDER.indexOf(b.title);
    const ra = ia === -1 ? TIER_ORDER.length : ia;
    const rb = ib === -1 ? TIER_ORDER.length : ib;
    if (ra !== rb) return ra - rb;
    const da = angkatanNum(a.angkatan), db = angkatanNum(b.angkatan);
    if (da !== db) return da - db;
    return (a.nama || "").localeCompare(b.nama || "", "id", { sensitivity: "base" });
  });
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}

function statusPill(status) {
  const cls = "status-" + String(status || "").replace(/\s+/g, "");
  return `<span class="status-pill ${cls}">${escapeHtml(status || "-")}</span>`;
}

function ketSpCell(ketSp) {
  if (!ketSp) return `<span class="ket-sp-empty">-</span>`;
  return `<span class="ket-sp">${escapeHtml(ketSp)}</span>`;
}

function rowHtml(p) {
  return `
    <tr>
      <td>${escapeHtml(p.angkatan)}</td>
      <td>${escapeHtml(p.nama)}</td>
      <td>${escapeHtml(p.jabatan)}</td>
      <td>${escapeHtml(p.divisi)}</td>
      <td>${statusPill(p.status)}</td>
      <td>${ketSpCell(p.ketSp)}</td>
    </tr>`;
}

function renderActiveTab(members) {
  const active = members.filter((p) => ACTIVE_STATUS.includes(p.status));
  document.getElementById("countAktif").textContent = active.length;

  const buckets = {};
  SECTIONS.forEach((s) => (buckets[s.key] = []));
  active.forEach((p) => buckets[classifyActive(p)].push(p));

  SECTIONS.forEach((s) => {
    const wrapper = document.getElementById("section-" + s.key);
    const list = s.key === "petinggi_pengurus"
      ? sortPetinggiPengurus(buckets[s.key])
      : sortByAngkatanAbjad(buckets[s.key]);

    if (list.length === 0) {
      wrapper.style.display = "none";
      return;
    }
    wrapper.style.display = "";
    document.getElementById("count-" + s.key).textContent = list.length + " orang";
    document.getElementById("body-" + s.key).innerHTML = list.map(rowHtml).join("");
  });
}

function renderExitTab(members) {
  const exited = members.filter((p) => EXIT_STATUS.includes(p.status));
  document.getElementById("countKeluar").textContent = exited.length;

  const sorted = exited.slice().sort((a, b) => {
    const ta = a.exitRecordedAt ? new Date(a.exitRecordedAt).getTime() : Infinity;
    const tb = b.exitRecordedAt ? new Date(b.exitRecordedAt).getTime() : Infinity;
    return ta - tb;
  });

  const tbody = document.getElementById("body-keluar");
  if (sorted.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Belum ada data</td></tr>`;
    return;
  }
  tbody.innerHTML = sorted.map(rowHtml).join("");
}

function renderAll() {
  renderActiveTab(allMembers);
  renderExitTab(allMembers);
  if (window.lucide) lucide.createIcons();
}

function switchTab(tab) {
  document.querySelectorAll(".dir-tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".dir-panel").forEach((p) => p.classList.toggle("active", p.id === "panel-" + tab));
}

async function loadDirectory() {
  try {
    const result = await callApi("getMemberDirectory");
    allMembers = (result && result.data) || [];
    renderAll();
  } catch (err) {
    console.error("Gagal memuat data pegawai:", err);
    document.getElementById("panel-aktif").innerHTML =
      `<div class="empty" style="padding:40px;">Gagal memuat data. Silakan refresh halaman.</div>`;
  }
}

window.addEventListener("load", () => {
  lucide.createIcons();

  document.querySelectorAll(".dir-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  loadDirectory();
});
