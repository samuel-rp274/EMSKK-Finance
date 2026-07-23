lucide.createIcons();

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyM0aOVZwPSu2Pz0gn-DljKMm6FXmGgpxhu2fOZV9_HOG87WdsEbGmf7Bq18sdRIZ2kgg/exec";
const CACHE_KEY = "emskk_index_cache_v1";
const REFRESH_MS = 5 * 60 * 1000;
const ROTATE_MS = 3000;
const FRESHNESS_TICK_MS = 30 * 1000;

const GALLERY_RAW_BASE = "https://raw.githubusercontent.com/samuel-rp274/EMSKK-Finance/main/assets/gallery/";
const GALLERY_SLOTS = 8;
const GALLERY_ROTATE_MS = 2800;
let galleryInterval = null;
let galleryIndex = 0;
let galleryUrls = [];

let currentData = null;
let rotateInterval = null;
let rotateIndex = 0;

function escapeHtml(str){
  return String(str || "").replace(/[&<>"']/g, m => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[m]));
}

function todayJakarta(){
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
}

function loadCache(){
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.savedDate !== todayJakarta()) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

function saveCache(data){
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: data,
      savedDate: todayJakarta()
    }));
  } catch (e) {
    console.warn("Gagal menyimpan cache index:", e);
  }
}

async function fetchSummary(){
  const res = await fetch(SCRIPT_URL + "?action=getIndexSummary");
  return await res.json();
}

function formatHours(h){
  const totalMinutes = Math.round(h * 60);
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  return `${hh}j ${mm}m`;
}

function formatWeekRange(startStr, endStr){
  const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  const [ys, ms, ds] = startStr.split("-").map(Number);
  const [ye, me, de] = endStr.split("-").map(Number);
  if (ms === me) return `${ds}–${de} ${months[ms-1]} ${ye}`;
  return `${ds} ${months[ms-1]} – ${de} ${months[me-1]} ${ye}`;
}

function timeAgo(isoLocal){
  if (!isoLocal) return "-";
  const then = new Date(isoLocal.replace(" ", "T") + "+07:00");
  const diffMin = Math.max(0, Math.round((Date.now() - then.getTime()) / 60000));
  if (diffMin < 1) return "baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} jam lalu`;
  return `${Math.floor(diffH / 24)} hari lalu`;
}

function renderSummary(data){
  document.getElementById('totalDuty').textContent = data.totalDutySessions;
  document.getElementById('totalDutyToday').textContent = data.totalDutySessionsToday;
  document.getElementById('totalInvoice').textContent = data.totalInvoices;
  document.getElementById('totalInvoiceToday').textContent = data.totalInvoicesToday;
  const range = formatWeekRange(data.week.start, data.week.end);
  document.getElementById('weekRangeA').textContent = range;
  document.getElementById('weekRangeB').textContent = range;
}

function renderTopDuty(data){
  const wrap = document.getElementById('topDutyList');
  const list = data.topDuty || [];
  if (list.length === 0) {
    wrap.innerHTML = `<div class="empty-note">Belum ada duty tercatat minggu ini</div>`;
    return;
  }
  const maxHours = Math.max(...list.map(d => d.hours), 0.01);
  wrap.innerHTML = list.map((d, i) => `
    <div class="duty-item">
      <div class="duty-top">
        <div class="duty-left">
          <span class="duty-rank">${String(i + 1).padStart(2, '0')}</span>
          <span class="duty-name" style="font-family:'Inter',sans-serif;">${escapeHtml(d.nama)}</span>
        </div>
        <span class="duty-hours">${formatHours(d.hours)}</span>
      </div>
      <div class="duty-track"><div class="duty-fill" style="width:${(d.hours / maxHours * 100).toFixed(1)}%"></div></div>
    </div>
  `).join('');
}

function renderRecentActivities(data){
  const wrap = document.getElementById('activityList');
  const list = data.recentActivities || [];
  if (list.length === 0) {
    wrap.innerHTML = `<div class="empty-note">Belum ada aktivitas tercatat</div>`;
    return;
  }
  wrap.innerHTML = list.map(item => {
    const timeLabel = item.waktu ? item.waktu.slice(11, 16) : "--:--";
    if (item.type === "duty") {
      return `
      <div class="invoice-item">
        <span class="invoice-dot duty-dot"></span>
        <span class="invoice-time mono">${timeLabel}</span>
        <span class="invoice-name">${escapeHtml(item.nama)}</span>
        <span class="invoice-type duty-badge">Start Duty</span>
      </div>`;
    }
    return `
    <div class="invoice-item">
      <span class="invoice-dot"></span>
      <span class="invoice-time mono">${timeLabel}</span>
      <span class="invoice-name">${escapeHtml(item.nama)}</span>
      <span class="invoice-type">${escapeHtml(item.jenis || '-')}</span>
    </div>`;
  }).join('');
}

function setupEmsRotator(data){
  const list = (data.emsCount || []).filter(c => c.jumlah > 0);
  clearInterval(rotateInterval);
  rotateIndex = 0;

  const numEl = document.getElementById('emsNumber');
  const labelEl = document.getElementById('emsLabel');
  const dotsEl = document.getElementById('emsDots');
  const prevBtn = document.getElementById('emsPrev');
  const nextBtn = document.getElementById('emsNext');

  if (list.length === 0) {
    numEl.textContent = "0";
    labelEl.textContent = "Belum ada data";
    dotsEl.innerHTML = "";
    prevBtn.style.visibility = 'hidden';
    nextBtn.style.visibility = 'hidden';
    return;
  }

  prevBtn.style.visibility = list.length > 1 ? 'visible' : 'hidden';
  nextBtn.style.visibility = list.length > 1 ? 'visible' : 'hidden';

  dotsEl.innerHTML = list.map((_, i) => `<span class="ems-dot${i === 0 ? ' active' : ''}"></span>`).join('');

  function show(i){
    numEl.style.opacity = 0;
    labelEl.style.opacity = 0;
    setTimeout(() => {
      numEl.textContent = list[i].jumlah;
      labelEl.textContent = list[i].kategori;
      numEl.style.opacity = 1;
      labelEl.style.opacity = 1;
      [...dotsEl.children].forEach((d, idx) => d.classList.toggle('active', idx === i));
    }, 220);
  }

  function startAutoRotate(){
    clearInterval(rotateInterval);
    if (list.length > 1) {
      rotateInterval = setInterval(() => {
        rotateIndex = (rotateIndex + 1) % list.length;
        show(rotateIndex);
      }, ROTATE_MS);
    }
  }

  function goTo(i){
    rotateIndex = (i + list.length) % list.length;
    show(rotateIndex);
    startAutoRotate();
  }

  prevBtn.onclick = () => goTo(rotateIndex - 1);
  nextBtn.onclick = () => goTo(rotateIndex + 1);

  show(0);
  startAutoRotate();
}

function renderFreshness(data){
  document.getElementById('freshnessText').textContent = "Diperbarui " + timeAgo(data.generatedAt);
}

function checkImageExists(url){
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

async function loadGallery(){
  const wrap = document.getElementById('galleryWrap');
  const bust = Date.now();
  const candidates = [];
  for (let i = 1; i <= GALLERY_SLOTS; i++){
    candidates.push(`${GALLERY_RAW_BASE}gallery-${i}.jpg?v=${bust}`);
  }

  const results = await Promise.all(candidates.map(checkImageExists));
  galleryUrls = candidates.filter((_, i) => results[i]);

  if (galleryUrls.length === 0){
    wrap.innerHTML = `<div class="gallery-empty">Belum ada foto galeri</div>`;
    return;
  }

  const multi = galleryUrls.length > 1;
  wrap.innerHTML = `
    <div class="gallery-stage" id="galleryStage">
      ${galleryUrls.map((url, i) => `<img class="gallery-img${i === 0 ? ' active' : ''}" src="${url}" alt="Galeri EMSKK">`).join('')}
    </div>
    ${multi ? `
    <div class="gallery-arrow prev" id="galleryPrev"><i data-lucide="chevron-left"></i></div>
    <div class="gallery-arrow next" id="galleryNext"><i data-lucide="chevron-right"></i></div>
    <div class="gallery-dots" id="galleryDots">${galleryUrls.map((_, i) => `<span class="gallery-dot${i === 0 ? ' active' : ''}"></span>`).join('')}</div>` : ''}
  `;
  lucide.createIcons();

  if (multi){
    const stage = document.getElementById('galleryStage');
    const dotsEl = document.getElementById('galleryDots');

    function show(i){
      [...stage.children].forEach((img, idx) => img.classList.toggle('active', idx === i));
      [...dotsEl.children].forEach((d, idx) => d.classList.toggle('active', idx === i));
    }
    function startAuto(){
      clearInterval(galleryInterval);
      galleryInterval = setInterval(() => {
        galleryIndex = (galleryIndex + 1) % galleryUrls.length;
        show(galleryIndex);
      }, GALLERY_ROTATE_MS);
    }
    function goTo(i){
      galleryIndex = (i + galleryUrls.length) % galleryUrls.length;
      show(galleryIndex);
      startAuto();
    }

    document.getElementById('galleryPrev').onclick = () => goTo(galleryIndex - 1);
    document.getElementById('galleryNext').onclick = () => goTo(galleryIndex + 1);
    startAuto();
  }
}

function renderDateSubtitle(){
  const now = new Date();
  const label = now.toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta'
  });
  document.getElementById('dateSubtitle').textContent = label;
}

function renderAll(data){
  currentData = data;
  renderSummary(data);
  renderTopDuty(data);
  renderRecentActivities(data);
  setupEmsRotator(data);
  renderFreshness(data);

  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('contentWrap').style.display = 'block';
  lucide.createIcons();
}

async function refreshInBackground(){
  try {
    const data = await fetchSummary();
    saveCache(data);
    renderAll(data);
  } catch (err) {
    console.error("Gagal memperbarui data index:", err);
  }
}

async function initIndex(){
  renderDateSubtitle();
  document.getElementById('fabTutorial').classList.add('show');
  loadGallery();

  const cached = loadCache();
  if (cached) {
    renderAll(cached.data);
    refreshInBackground();
  } else {
    document.getElementById('loadingState').style.display = 'flex';
    document.getElementById('contentWrap').style.display = 'none';
    try {
      const data = await fetchSummary();
      saveCache(data);
      renderAll(data);
    } catch (err) {
      console.error(err);
      document.getElementById('loadingState').innerHTML = `
        <i data-lucide="alert-triangle" style="animation:none; color:#ef4444;"></i>
        Gagal memuat data. Silakan refresh halaman.`;
      lucide.createIcons();
    }
  }

  setInterval(refreshInBackground, REFRESH_MS);
  setInterval(() => { if (currentData) renderFreshness(currentData); }, FRESHNESS_TICK_MS);
}

initIndex();