lucide.createIcons();

const PHOTO_BASE = "assets/photos/"; 

const DEFAULT_AVATAR_COLOR = "#334155"; 

function escapeHtml(str){
  return String(str || "").replace(/[&<>"']/g, m => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[m]));
}

function initials(name){
  const clean = String(name || "").replace(/^dr\.\s*/i, '').replace(/,.*$/, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colorFor(name){
  return DEFAULT_AVATAR_COLOR;
}

function avatarHtml(nama, size){
  const bg = colorFor(nama);
  const label = initials(nama);
  return `<div class="__avatar" data-nama="${escapeHtml(nama)}" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${bg};">${label}</div>`;
}

function personCardHtml(p, size){
  const cardClass = size === 'mini' ? 'mini' : 'full';
  const dataAttrs = `data-nama="${escapeHtml(p.nama)}" data-jabatan="${escapeHtml(p.jabatanFull || '')}" data-divisi="${escapeHtml(p.divisi || '')}" data-photo="${escapeHtml(p.photo || '')}" data-photo-v="${p.photoUpdatedAt || ''}"`;
  if (cardClass === 'mini') {
    return `
    <div class="mini-person" onclick="openPersonModal(this)" ${dataAttrs}>
      <div class="mini-avatar">${photoOrFallback(p, 'mini')}</div>
      <div class="mini-name" title="${escapeHtml(p.nama)}">${escapeHtml(p.nama)}</div>
    </div>`;
  }
  return `
  <div class="person-card" onclick="openPersonModal(this)" ${dataAttrs}>
    <div class="person-avatar">${photoOrFallback(p, 'full')}</div>
    <div class="person-name">${escapeHtml(p.nama)}</div>
    <div class="person-title">${escapeHtml(p.title)}</div>
  </div>`;
}

function photoOrFallback(p, size){
  const bg = colorFor(p.nama);
  const label = initials(p.nama);
  if (p.photo) {
    const verParam = p.photoUpdatedAt ? ('?v=' + p.photoUpdatedAt) : '';
    return `<img src="${PHOTO_BASE}${escapeHtml(p.photo)}${verParam}" alt="${escapeHtml(p.nama)}"
              onerror="this.outerHTML='<div style=&quot;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${bg};font-weight:700;&quot;>${label}</div>'">`;
  }
  return `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${bg};font-weight:700;">${label}</div>`;
}

const DIVISI_LABELS = { LAB: "Divisi Laboratorium", OPLAS: "Divisi Operasi Plastik", OBGYN: "Divisi Obstetri & Ginekologi" };
function divisiLabel(code){ return DIVISI_LABELS[code] || code; }

function openPersonModal(el){
  const nama = el.getAttribute('data-nama') || '';
  const jabatan = el.getAttribute('data-jabatan') || '';
  const divisi = el.getAttribute('data-divisi') || '';
  const photo = el.getAttribute('data-photo') || '';
  const photoV = el.getAttribute('data-photo-v') || '';

  const bg = DEFAULT_AVATAR_COLOR;
  const label = initials(nama);
  const modalAvatar = document.getElementById('modalAvatar');

  if (photo) {
    const verParam = photoV ? ('?v=' + photoV) : '';
    modalAvatar.innerHTML = `<img src="${PHOTO_BASE}${photo}${verParam}" alt="${escapeHtml(nama)}"
      onerror="this.outerHTML='<div style=&quot;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${bg};font-weight:700;&quot;>${label}</div>'">`;
  } else {
    modalAvatar.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${bg};font-weight:700;">${label}</div>`;
  }

  document.getElementById('modalName').innerText = nama;
  document.getElementById('modalJabatan').innerText = jabatan;

  const modalDivisi = document.getElementById('modalDivisi');
  if (divisi) {
    modalDivisi.innerText = divisiLabel(divisi);
    modalDivisi.style.display = 'block';
  } else {
    modalDivisi.style.display = 'none';
  }

  document.getElementById('personModal').classList.add('active');
  lucide.createIcons();
}

function closePersonModal(){
  document.getElementById('personModal').classList.remove('active');
}

document.addEventListener('keydown', function(e){
  if (e.key === 'Escape') closePersonModal();
});

function groupPeople(people){
  const g = {
    ceo: [], direktur: [], wakdirPersonalia: [], wakdirOperasional: [],
    hrd: [], finance: [], komdis: [],
    dokterSpesialis: [],
    divisi: {
      LAB: { label: "Divisi Laboratorium", color: "#38bdf8", dokter: [], asisten: [] },
      OPLAS: { label: "Divisi Operasi Plastik", color: "#a855f7", dokter: [], asisten: [] },
      OBGYN: { label: "Divisi Obstetri & Ginekologi", color: "#ec4899", dokter: [], asisten: [] }
    },
    dokterUmum: [], coAss: [], trainee: [], probation: []
  };

  people.forEach(p => {
    const section = p.section;
    const title = p.title;
    const divisi = p.divisi;

    if (section === "PETINGGI & PENGURUS") {
      if (title === "CEO") g.ceo.push(p);
      else if (title === "DIREKTUR") g.direktur.push(p);
      else if (title === "WAKDIR Personalia") g.wakdirPersonalia.push(p);
      else if (title === "WAKDIR Operasional") g.wakdirOperasional.push(p);
      else if (title === "HRD") g.hrd.push(p);
      else if (title === "FINANCE") g.finance.push(p);
      else if (title === "KOMDIS") g.komdis.push(p);
    } else if (section === "DOKTER SPESIALIS") {
      g.dokterSpesialis.push(p);
    } else if (section === "DOKTER") {
      if (divisi === "LAB") g.divisi.LAB.dokter.push(p);
      else if (divisi === "OPLAS") g.divisi.OPLAS.dokter.push(p);
      else if (divisi === "OBGYN") g.divisi.OBGYN.dokter.push(p);
      else g.dokterUmum.push(p);
    } else if (section === "Co. Ass") {
      if (divisi === "LAB") g.divisi.LAB.asisten.push(p);
      else if (divisi === "OPLAS") g.divisi.OPLAS.asisten.push(p);
      else if (divisi === "OBGYN") g.divisi.OBGYN.asisten.push(p);
      else g.coAss.push(p);
    } else if (section === "Trainee") {
      g.trainee.push(p);
    } else if (section === "Probation") {
      g.probation.push(p);
    }
  });

  return g;
}

function nodeBox(label, people, opts){
  opts = opts || {};
  if (!people || people.length === 0) {
    return `<div class="node-box vacant">
      <div class="node-label">${escapeHtml(label)}</div>
      <div class="vacant-text">Belum terisi</div>
    </div>`;
  }
  const peopleHtml = people.map(p => personCardHtml(p, 'mini')).join('');
  return `<div class="node-box">
    <div class="node-label">${escapeHtml(label)}</div>
    <div class="node-people">${peopleHtml}</div>
  </div>`;
}

function renderKepengurusan(g){
  const html = `
  <ul class="org-tree">
    <li>
      ${nodeBox('CEO', g.ceo)}
      <ul>
        <li>
          ${nodeBox('Direktur', g.direktur)}
          <ul>
            <li>
              ${nodeBox('Wakil Direktur Personalia', g.wakdirPersonalia)}
              <ul>
                <li>${nodeBox('HRD', g.hrd)}</li>
                <li>${nodeBox('Finance', g.finance)}</li>
              </ul>
            </li>
            <li>
              ${nodeBox('Wakil Direktur Operasional', g.wakdirOperasional)}
              <ul>
                <li>${nodeBox('Komdis', g.komdis)}</li>
              </ul>
            </li>
            <li>
              ${nodeBox('Sekretaris', [])}
            </li>
          </ul>
        </li>
      </ul>
    </li>
  </ul>`;
  document.getElementById('kepengurusanTree').innerHTML = html;
}

function tierHeader(color, title, count){
  return `<div class="tier-header">
    <div class="dot" style="background:${color}; box-shadow:0 0 8px ${color};"></div>
    <h3>${escapeHtml(title)}</h3>
    <div class="count">${count} orang</div>
  </div>`;
}

function personGrid(people){
  if (!people || people.length === 0) return `<div class="empty-note">Belum ada personel</div>`;
  return `<div class="person-grid">${people.map(p => personCardHtml(p, 'full')).join('')}</div>`;
}

function renderNonKepengurusan(g){
  let html = '';

  html += `<div class="tier">
    ${tierHeader('#facc15', 'Dokter Spesialis', g.dokterSpesialis.length)}
    ${personGrid(g.dokterSpesialis)}
  </div>`;

  html += `<div class="tier">`;
  ['LAB','OPLAS','OBGYN'].forEach(key => {
    const d = g.divisi[key];
    const total = d.dokter.length + d.asisten.length;
    html += `<div class="divisi-wrap">
      <div class="divisi-title" style="color:${d.color};">
        <i data-lucide="git-branch" style="width:14px;height:14px;"></i>
        ${escapeHtml(d.label)} <span style="color:#64748b; font-weight:500; margin-left:4px;">(${total} orang)</span>
      </div>
      <div class="divisi-sub-label">Dokter</div>
      ${personGrid(d.dokter)}
      <div class="divisi-sub-label">Asisten</div>
      ${personGrid(d.asisten)}
    </div>`;
  });
  html += `</div>`;

  html += `<div class="tier">
    ${tierHeader('#38bdf8', 'Dokter Umum', g.dokterUmum.length)}
    ${personGrid(g.dokterUmum)}
  </div>`;

  html += `<div class="tier">
    ${tierHeader('#38bdf8', 'Co. Ass', g.coAss.length)}
    ${personGrid(g.coAss)}
  </div>`;

  html += `<div class="tier">
    ${tierHeader('#94a3b8', 'Trainee', g.trainee.length)}
    ${personGrid(g.trainee)}
  </div>`;

  html += `<div class="tier">
    ${tierHeader('#64748b', 'Probation', g.probation.length)}
    ${personGrid(g.probation)}
  </div>`;

  document.getElementById('nonKepengurusanTiers').innerHTML = html;
}

const CACHE_KEY = "emskk_orgchart_cache_v1";

function saveCache(people){
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ people: people, savedAt: Date.now() }));
  } catch (e) {
    console.warn("Gagal menyimpan cache org chart:", e);
  }
}

function loadCache(){
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

async function fetchFromServer(){
  const res = await fetch(SCRIPT_URL + "?action=getOrgChart");
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.message || "Gagal memuat data");
  }
  return json.data || [];
}

function renderAll(people, fromCache){
  const g = groupPeople(people);
  renderKepengurusan(g);
  renderNonKepengurusan(g);

  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('contentWrap').style.display = 'block';

  const infoText = document.getElementById('infoText');
  const label = fromCache
    ? "menampilkan data tersimpan (cache)"
    : `data terbaru — ${new Date().toLocaleTimeString('id-ID')}`;
  infoText.innerText = `${people.length} member — ${label}`;

  lucide.createIcons();
}

async function initOrgChart(){
  const cached = loadCache();
  if (cached && cached.people && cached.people.length) {
    renderAll(cached.people, true);
    return;
  }
  await refreshOrgChart();
}

async function refreshOrgChart(){
  const loadingState = document.getElementById('loadingState');
  const contentWrap = document.getElementById('contentWrap');
  const infoText = document.getElementById('infoText');
  const refreshBtn = document.getElementById('refreshBtn');
  const alreadyRendered = contentWrap.style.display === 'block';

  if (!alreadyRendered) {
    loadingState.style.display = 'flex';
    contentWrap.style.display = 'none';
  } else {
    refreshBtn.disabled = true;
    refreshBtn.classList.add('spinning');
    refreshBtn.innerHTML = `<i data-lucide="loader-circle"></i> Memuat data terbaru...`;
    lucide.createIcons();
  }

  try {
    const people = await fetchFromServer();
    saveCache(people);
    renderAll(people, false);
  } catch (err) {
    console.error(err);
    if (!alreadyRendered) {
      loadingState.innerHTML = `
        <i data-lucide="alert-triangle" style="animation:none; color:#ef4444;"></i>
        Failed to load structure data. Please refresh the page.`;
      lucide.createIcons();
    } else {
      infoText.innerText = "Gagal memperbarui data, coba lagi nanti.";
    }
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.classList.remove('spinning');
    refreshBtn.innerHTML = `<i data-lucide="refresh-cw"></i> Refresh untuk perbarui foto / jabatan`;
    lucide.createIcons();
  }
}

initOrgChart();