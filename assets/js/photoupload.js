lucide.createIcons();

const JPEG_QUALITY = 0.82;
const STAGE_WIDTH = 280;
const GALLERY_RAW_BASE = "https://cdn.jsdelivr.net/gh/samuel-rp274/EMSKK-Finance@main/assets/gallery/";

const MODES = {
  profile: { aspect: 1, outputW: 500, outputH: 500 },
  gallery: { aspect: 16 / 9, outputW: 960, outputH: 540 }
};

let currentMode = 'profile';
let gallerySubmode = 'new';
let galleryOrderCache = [];

let compressedBase64 = null;
let peopleData = {}; 

let cropNaturalW = 0, cropNaturalH = 0;
let baseCropW = 0, baseCropH = 0;
let cropW = 0, cropH = 0;
let cropX = 0, cropY = 0;
let isDragging = false;
let dragStartX = 0, dragStartY = 0, dragStartCropX = 0, dragStartCropY = 0;

function updateModeUI(){
  document.querySelectorAll('#modeToggle .mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === currentMode);
  });
  document.getElementById('namaField').style.display = currentMode === 'profile' ? '' : 'none';
  document.getElementById('filenameField').style.display = currentMode === 'profile' ? '' : 'none';
  document.getElementById('gallerySubmodeField').style.display = currentMode === 'gallery' ? '' : 'none';
}

function resetGallerySubmode(){
  gallerySubmode = 'new';
  document.querySelectorAll('#gallerySubmodeToggle .mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.submode === 'new');
  });
  document.getElementById('gallerySlotField').style.display = 'none';
  document.getElementById('gallerySlotSelect').innerHTML = '<option value="">Memuat slot...</option>';
  document.getElementById('slotPreview').classList.remove('show');
}

function resetPhotoState(){
  document.getElementById('cropWrap').classList.remove('active');
  document.getElementById('previewWrap').classList.remove('active');
  document.getElementById('dropzone').style.display = '';
  document.getElementById('fileInput').value = '';
  compressedBase64 = null;
  hideStatus();
  updateSubmitState();
}

document.querySelectorAll('#modeToggle .mode-btn').forEach(btn => {
  btn.addEventListener('click', function(){
    if (this.dataset.mode === currentMode) return;
    currentMode = this.dataset.mode;
    updateModeUI();
    resetPhotoState();
    resetGallerySubmode();
  });
});

document.querySelectorAll('#gallerySubmodeToggle .mode-btn').forEach(btn => {
  btn.addEventListener('click', function(){
    if (this.dataset.submode === gallerySubmode) return;
    gallerySubmode = this.dataset.submode;
    document.querySelectorAll('#gallerySubmodeToggle .mode-btn').forEach(b => b.classList.toggle('active', b === this));

    const slotField = document.getElementById('gallerySlotField');
    if (gallerySubmode === 'replace') {
      slotField.style.display = '';
      loadGallerySlots();
    } else {
      slotField.style.display = 'none';
      document.getElementById('slotPreview').classList.remove('show');
    }
    updateSubmitState();
  });
});

updateModeUI();

function slugify2Words(name){
  let clean = String(name || "").replace(/^dr\.\s*/i, '').replace(/,.*$/, '').trim().toLowerCase();
  clean = clean.replace(/[^a-z0-9\s-]/g, '');
  const words = clean.split(/\s+/).filter(Boolean).slice(0, 2);
  return words.join('-');
}

function isValidPhotoFilename(filename){
  return /^[a-z0-9_-]+\.(jpg|jpeg|png)$/i.test(filename);
}

function showStatus(type, message){
  const box = document.getElementById('statusBox');
  box.className = 'status-box show ' + type;
  const icon = type === 'success' ? 'check-circle-2' : 'alert-circle';
  box.innerHTML = `<i data-lucide="${icon}"></i><div>${message}</div>`;
  lucide.createIcons();
}

function hideStatus(){
  const box = document.getElementById('statusBox');
  box.className = 'status-box';
  box.innerHTML = '';
}

function updateSubmitState(){
  if (currentMode === 'gallery') {
    const slotVal = document.getElementById('gallerySlotSelect').value;
    const slotOk = gallerySubmode !== 'replace' || !!slotVal;
    document.getElementById('submitBtn').disabled = !(compressedBase64 && slotOk);
    return;
  }

  const nama = document.getElementById('namaSelect').value;
  const filename = document.getElementById('filenameInput').value.trim();
  const hint = document.getElementById('filenameHint');

  let filenameOk = true;
  if (filename) {
    filenameOk = isValidPhotoFilename(filename);
    hint.textContent = filenameOk ? '' : 'Nama file tidak valid — hanya huruf kecil, angka, - dan _, diakhiri .jpg/.jpeg/.png';
    hint.style.color = filenameOk ? '#64748b' : '#fca5a5';
  } else {
    hint.textContent = '';
  }

  document.getElementById('submitBtn').disabled = !(nama && filename && filenameOk && compressedBase64);
}

let namaTS = null;

async function loadNames(){
  const select = document.getElementById('namaSelect');
  try {
    const result = await callApi("getPeopleNames");
    if (!result.success) throw new Error(result.message || "Gagal memuat nama");

    peopleData = {};
    const options = result.data.map(p => {
      peopleData[p.nama] = p.id;
      return { value: p.nama, text: p.nama };
    });

    namaTS = new TomSelect(select, {
      options: options,
      valueField: "value",
      labelField: "text",
      searchField: "text",
      placeholder: "Ketik atau pilih nama",
      create: false,
      onChange: function(value){
        if (value) {
          document.getElementById('filenameInput').value = slugify2Words(value) + '.jpg';
        }
        updateSubmitState();
      }
    });
  } catch (err) {
    select.innerHTML = '<option value="">Gagal memuat daftar nama</option>';
    console.error(err);
  }
}

document.getElementById('filenameInput').addEventListener('input', updateSubmitState);

async function loadGallerySlots(){
  const select = document.getElementById('gallerySlotSelect');
  select.innerHTML = '<option value="">Memuat slot...</option>';
  try {
    const result = await callApi("getGalleryList");
    if (!result.success) throw new Error(result.message || "Gagal memuat galeri");

    galleryOrderCache = result.data || [];
    if (galleryOrderCache.length === 0) {
      select.innerHTML = '<option value="">Belum ada foto galeri</option>';
      return;
    }
    select.innerHTML = '<option value="">Pilih slot...</option>' +
      galleryOrderCache.map((_, i) => `<option value="${i + 1}">Slot ${i + 1}</option>`).join('');
  } catch (err) {
    select.innerHTML = '<option value="">Gagal memuat slot</option>';
    console.error(err);
  }
  updateSubmitState();
}

document.getElementById('gallerySlotSelect').addEventListener('change', function(){
  const preview = document.getElementById('slotPreview');
  const val = this.value;

  if (!val) {
    preview.classList.remove('show');
    updateSubmitState();
    return;
  }

  const filename = galleryOrderCache[parseInt(val, 10) - 1];
  if (filename) {
    document.getElementById('slotPreviewImg').src = `${GALLERY_RAW_BASE}${filename}?v=${Date.now()}`;
    document.getElementById('slotPreviewLabel').textContent = `Foto saat ini di slot ${val}`;
    preview.classList.add('show');
  } else {
    preview.classList.remove('show');
  }
  updateSubmitState();
});

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');

dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.style.borderColor = '#a855f7'; });
dropzone.addEventListener('dragleave', () => { dropzone.style.borderColor = ''; });
dropzone.addEventListener('drop', e => {
  e.preventDefault();
  dropzone.style.borderColor = '';
  if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', e => {
  if (e.target.files.length) handleFile(e.target.files[0]);
});

function handleFile(file){
  if (!file.type.startsWith('image/')) {
    showStatus('error', 'File harus berupa gambar.');
    return;
  }
  hideStatus();
  document.getElementById('previewWrap').classList.remove('active');
  compressedBase64 = null;
  updateSubmitState();

  const reader = new FileReader();
  reader.onload = function(e){
    const img = document.getElementById('cropImgEl');
    img.onload = function(){
      cropNaturalW = img.naturalWidth;
      cropNaturalH = img.naturalHeight;

      const aspect = MODES[currentMode].aspect;
      const stage = document.getElementById('cropStage');
      stage.style.height = Math.round(STAGE_WIDTH / aspect) + 'px';

      let bw = cropNaturalW, bh = bw / aspect;
      if (bh > cropNaturalH) { bh = cropNaturalH; bw = bh * aspect; }
      baseCropW = bw;
      baseCropH = bh;

      document.getElementById('zoomSlider').value = 1;
      cropW = baseCropW;
      cropH = baseCropH;
      cropX = (cropNaturalW - cropW) / 2;
      cropY = (cropNaturalH - cropH) / 2;

      renderCropImage();
      document.getElementById('cropWrap').classList.add('active');
      document.getElementById('dropzone').style.display = 'none';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function renderCropImage(){
  const img = document.getElementById('cropImgEl');
  const displayScale = STAGE_WIDTH / cropW;
  img.style.width = (cropNaturalW * displayScale) + 'px';
  img.style.height = (cropNaturalH * displayScale) + 'px';
  img.style.left = (-cropX * displayScale) + 'px';
  img.style.top = (-cropY * displayScale) + 'px';
}

function clampCrop(){
  cropX = Math.max(0, Math.min(cropX, cropNaturalW - cropW));
  cropY = Math.max(0, Math.min(cropY, cropNaturalH - cropH));
}

const cropStage = document.getElementById('cropStage');

function dragStart(clientX, clientY){
  isDragging = true;
  cropStage.classList.add('dragging');
  dragStartX = clientX;
  dragStartY = clientY;
  dragStartCropX = cropX;
  dragStartCropY = cropY;
}
function dragMove(clientX, clientY){
  if (!isDragging) return;
  const displayScale = STAGE_WIDTH / cropW;
  const dx = (clientX - dragStartX) / displayScale;
  const dy = (clientY - dragStartY) / displayScale;
  cropX = dragStartCropX - dx;
  cropY = dragStartCropY - dy;
  clampCrop();
  renderCropImage();
}
function dragEnd(){
  isDragging = false;
  cropStage.classList.remove('dragging');
}

cropStage.addEventListener('mousedown', e => { dragStart(e.clientX, e.clientY); e.preventDefault(); });
window.addEventListener('mousemove', e => dragMove(e.clientX, e.clientY));
window.addEventListener('mouseup', dragEnd);

cropStage.addEventListener('touchstart', e => {
  const t = e.touches[0];
  dragStart(t.clientX, t.clientY);
}, { passive: true });
window.addEventListener('touchmove', e => {
  if (!isDragging) return;
  const t = e.touches[0];
  dragMove(t.clientX, t.clientY);
}, { passive: true });
window.addEventListener('touchend', dragEnd);

document.getElementById('zoomSlider').addEventListener('input', function(){
  const zoom = Number(this.value);
  const centerX = cropX + cropW / 2;
  const centerY = cropY + cropH / 2;

  cropW = baseCropW / zoom;
  cropH = baseCropH / zoom;
  cropX = centerX - cropW / 2;
  cropY = centerY - cropH / 2;
  clampCrop();
  renderCropImage();
});

document.getElementById('cropCancelBtn').addEventListener('click', resetPhotoState);

document.getElementById('previewResetBtn').addEventListener('click', resetPhotoState);

document.getElementById('cropConfirmBtn').addEventListener('click', function(){
  const img = document.getElementById('cropImgEl');
  const modeCfg = MODES[currentMode];
  const canvas = document.createElement('canvas');
  canvas.width = modeCfg.outputW;
  canvas.height = modeCfg.outputH;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, modeCfg.outputW, modeCfg.outputH);

  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  compressedBase64 = dataUrl.split(',')[1];

  const approxKB = Math.round((compressedBase64.length * 0.75) / 1024);
  const ratioLabel = currentMode === 'gallery' ? '16:9' : '1:1';

  const previewImg = document.getElementById('previewImg');
  previewImg.src = dataUrl;
  previewImg.classList.toggle('wide', currentMode === 'gallery');
  document.getElementById('previewName').textContent = 'Foto siap diupload';
  document.getElementById('previewSize').textContent = `${modeCfg.outputW}x${modeCfg.outputH}px (${ratioLabel}) · ~${approxKB} KB`;
  document.getElementById('previewWrap').classList.add('active');

  document.getElementById('cropWrap').classList.remove('active');

  updateSubmitState();
});

document.getElementById('submitBtn').addEventListener('click', async function(){
  let payload;

  if (currentMode === 'gallery') {
    if (!compressedBase64) return;
    payload = { mode: 'gallery', imageBase64: compressedBase64 };

    if (gallerySubmode === 'replace') {
      const slotVal = document.getElementById('gallerySlotSelect').value;
      if (!slotVal) return;
      payload.targetSlot = parseInt(slotVal, 10);
    }
  } else {
    const nama = document.getElementById('namaSelect').value;
    const filename = document.getElementById('filenameInput').value.trim();
    const userId = peopleData[nama];

    if (!nama || !userId || !filename || !compressedBase64) return;
    if (!isValidPhotoFilename(filename)) {
      showStatus('error', 'Nama file tidak valid.');
      return;
    }
    payload = { user_id: userId, filename, imageBase64: compressedBase64 };
  }

  const btn = this;
  btn.disabled = true;
  btn.innerHTML = '<i data-lucide="loader-circle" style="animation:spin 1s linear infinite;"></i> Mengupload...';
  lucide.createIcons();
  hideStatus();

  try {
    const result = await callApi("uploadPhoto", payload);

    if (result.success) {
      showStatus('success', result.message);
      if (currentMode === 'gallery') {
        resetPhotoState();
        resetGallerySubmode();
      }
    } else {
      showStatus('error', result.message || 'Upload gagal.');
    }
  } catch (err) {
    showStatus('error', 'Gagal menghubungi server: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="upload"></i> Upload Foto';
    lucide.createIcons();
    updateSubmitState();
  }
});

const styleTag = document.createElement('style');
styleTag.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
document.head.appendChild(styleTag);

loadNames();
