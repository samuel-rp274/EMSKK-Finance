lucide.createIcons();

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}

async function checkLogin() {
  const pw = document.getElementById("adminPassword").value.trim();
  document.getElementById("loginStatus").innerHTML = "⏳ Memeriksa tingkat otentikasi...";

  try {
    const result = await callApi("verifyAdminGate", { password: pw });

    if (result.success) {
      sessionStorage.setItem(ADMIN_GATE_KEY, "true");
      openPanel();
    } else {
      document.getElementById("loginStatus").innerHTML = "❌ Password salah, kesalahan berulang secara beruntun akan mengunci akun sementara";
    }
  } catch (e) {
    document.getElementById("loginStatus").innerHTML = "❌ Server error, silahkan hubungi FINANCE";
  }
}

function openPanel() {
  document.getElementById("loginCard").classList.add("hidden");
  document.getElementById("adminPanel").classList.remove("hidden");
  loadAllTabs();
}

window.addEventListener("load", () => {
  const isLoggedIn = sessionStorage.getItem(ADMIN_GATE_KEY);
  if (isLoggedIn === "true") openPanel();
});

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("panel-" + btn.dataset.tab).classList.add("active");
  });
});

function loadAllTabs() {
  loadRateDivisi();
  loadRateJabatan();
  loadPotongan();
  loadPriceList();
  lucide.createIcons();
}

async function loadRateDivisi() {
  const tbody = document.getElementById("rateDivisiBody");
  tbody.innerHTML = `<tr><td colspan="3" class="empty">Memuat...</td></tr>`;
  try {
    const result = await callApi("getRatesAPI");
    renderRateTable(tbody, result.divisi || [], "divisi", "updateRateDivisi");
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="3" class="empty">Gagal memuat data</td></tr>`;
  }
}

async function loadRateJabatan() {
  const tbody = document.getElementById("rateJabatanBody");
  tbody.innerHTML = `<tr><td colspan="3" class="empty">Memuat...</td></tr>`;
  try {
    const result = await callApi("getRatesAPI");
    renderRateTable(tbody, result.jabatan || [], "jabatan", "updateRateJabatan");
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="3" class="empty">Gagal memuat data</td></tr>`;
  }
}

function renderRateTable(tbody, rows, nameField, action) {
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="empty">Tidak ada data</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => `
    <tr data-id="${escapeHtml(r.id)}">
      <td>${escapeHtml(r[nameField])}</td>
      <td class="rs-value-cell">${Number(r.rate_per_hour).toLocaleString("id-ID")}</td>
      <td>
        <div class="rs-actions">
          <button class="rs-btn rs-btn-edit" data-act="edit">Edit</button>
        </div>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll('button[data-act="edit"]').forEach(btn => {
    btn.addEventListener("click", () => {
      const tr = btn.closest("tr");
      const id = tr.dataset.id;
      const row = rows.find(r => String(r.id) === String(id));
      startRateEdit(tr, row, action);
    });
  });
}

function startRateEdit(tr, row, action) {
  const valueCell = tr.querySelector(".rs-value-cell");
  const actionsCell = tr.querySelector(".rs-actions");
  const originalValue = Number(row.rate_per_hour);

  valueCell.innerHTML = `<input type="number" class="rs-value-input" value="${originalValue}" min="0.01" step="any">`;
  actionsCell.innerHTML = `
    <button class="rs-btn rs-btn-save" data-act="save">Simpan</button>
    <button class="rs-btn rs-btn-cancel" data-act="cancel">Batal</button>
  `;

  const input = valueCell.querySelector("input");
  input.focus();

  actionsCell.querySelector('[data-act="cancel"]').addEventListener("click", () => {
    valueCell.innerHTML = originalValue.toLocaleString("id-ID");
    actionsCell.innerHTML = `<button class="rs-btn rs-btn-edit" data-act="edit">Edit</button>`;
    actionsCell.querySelector('[data-act="edit"]').addEventListener("click", () => startRateEdit(tr, row, action));
  });

  actionsCell.querySelector('[data-act="save"]').addEventListener("click", async () => {
    const newValue = Number(input.value);
    if (!Number.isFinite(newValue) || newValue <= 0) {
      alert("Rate per jam harus berupa angka lebih dari 0");
      return;
    }

    const saveBtn = actionsCell.querySelector('[data-act="save"]');
    saveBtn.disabled = true;
    saveBtn.textContent = "...";

    try {
      const result = await callApi(action, { id: row.id, rate_per_hour: newValue });
      if (!result.success) {
        alert(result.message || "Gagal menyimpan");
        saveBtn.disabled = false;
        saveBtn.textContent = "Simpan";
        return;
      }
      row.rate_per_hour = newValue;
      valueCell.innerHTML = newValue.toLocaleString("id-ID");
      actionsCell.innerHTML = `<button class="rs-btn rs-btn-edit" data-act="edit">Edit</button>`;
      actionsCell.querySelector('[data-act="edit"]').addEventListener("click", () => startRateEdit(tr, row, action));
    } catch (e) {
      alert("Gagal mengirim data (network error)");
      saveBtn.disabled = false;
      saveBtn.textContent = "Simpan";
    }
  });
}

let potonganRows = [];

async function loadPotongan() {
  const tbody = document.getElementById("potonganBody");
  tbody.innerHTML = `<tr><td colspan="3" class="empty">Memuat...</td></tr>`;
  try {
    potonganRows = await callApi("getAllPotongan");
    renderPotonganTable();
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="3" class="empty">Gagal memuat data</td></tr>`;
  }
}

function renderPotonganTable() {
  const tbody = document.getElementById("potonganBody");
  if (!potonganRows.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="empty">Tidak ada data</td></tr>`;
    return;
  }

  tbody.innerHTML = potonganRows.map(r => `
    <tr data-id="${escapeHtml(r.id)}">
      <td>${escapeHtml(r.divisi)}</td>
      <td class="rs-value-cell">${(Number(r.potongan) * 100).toLocaleString("id-ID")}%</td>
      <td>
        <div class="rs-actions">
          <button class="rs-btn rs-btn-edit" data-act="edit">Edit</button>
        </div>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll('button[data-act="edit"]').forEach(btn => {
    btn.addEventListener("click", () => {
      const tr = btn.closest("tr");
      const id = tr.dataset.id;
      const row = potonganRows.find(r => String(r.id) === String(id));
      startPotonganEdit(tr, row);
    });
  });
}

function startPotonganEdit(tr, row) {
  const valueCell = tr.querySelector(".rs-value-cell");
  const actionsCell = tr.querySelector(".rs-actions");
  const originalPercent = Number(row.potongan) * 100;

  valueCell.innerHTML = `<input type="number" class="rs-value-input" value="${originalPercent}" min="0" max="100" step="any"> %`;
  actionsCell.innerHTML = `
    <button class="rs-btn rs-btn-save" data-act="save">Simpan</button>
    <button class="rs-btn rs-btn-cancel" data-act="cancel">Batal</button>
  `;

  const input = valueCell.querySelector("input");
  input.focus();

  actionsCell.querySelector('[data-act="cancel"]').addEventListener("click", () => {
    renderPotonganTable();
  });

  actionsCell.querySelector('[data-act="save"]').addEventListener("click", async () => {
    const newPercent = Number(input.value);
    if (!Number.isFinite(newPercent) || newPercent < 0 || newPercent > 100) {
      alert("Potongan harus antara 0% - 100%");
      return;
    }
    const newDecimal = newPercent / 100;

    const saveBtn = actionsCell.querySelector('[data-act="save"]');
    saveBtn.disabled = true;
    saveBtn.textContent = "...";

    try {
      const result = await callApi("updatePotonganDivisi", { id: row.id, potongan: newDecimal });
      if (!result.success) {
        alert(result.message || "Gagal menyimpan");
        saveBtn.disabled = false;
        saveBtn.textContent = "Simpan";
        return;
      }
      row.potongan = newDecimal;
      renderPotonganTable();
    } catch (e) {
      alert("Gagal mengirim data (network error)");
      saveBtn.disabled = false;
      saveBtn.textContent = "Simpan";
    }
  });
}

let priceListRows = [];

async function loadPriceList() {
  const tbody = document.getElementById("priceListBody");
  tbody.innerHTML = `<tr><td colspan="3" class="empty">Memuat...</td></tr>`;
  try {
    priceListRows = await callApi("getPriceList");
    renderPriceListTable();
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="3" class="empty">Gagal memuat data</td></tr>`;
  }
}

function renderPriceListTable() {
  const tbody = document.getElementById("priceListBody");
  if (!priceListRows.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="empty">Tidak ada data</td></tr>`;
    return;
  }

  tbody.innerHTML = priceListRows.map(r => `
    <tr data-id="${escapeHtml(r.id)}">
      <td class="rs-name-cell">${escapeHtml(r.label)}</td>
      <td class="rs-value-cell">${Number(r.price).toLocaleString("id-ID")}</td>
      <td>
        <div class="rs-actions">
          <button class="rs-btn rs-btn-edit" data-act="edit">Edit</button>
          <button class="rs-btn rs-btn-delete" data-act="delete">Hapus</button>
        </div>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll('button[data-act="edit"]').forEach(btn => {
    btn.addEventListener("click", () => {
      const tr = btn.closest("tr");
      const id = tr.dataset.id;
      const row = priceListRows.find(r => String(r.id) === String(id));
      startPriceListEdit(tr, row);
    });
  });

  tbody.querySelectorAll('button[data-act="delete"]').forEach(btn => {
    btn.addEventListener("click", () => {
      const tr = btn.closest("tr");
      const id = tr.dataset.id;
      const row = priceListRows.find(r => String(r.id) === String(id));
      openDeleteModal(row);
    });
  });
}

function startPriceListEdit(tr, row) {
  const nameCell = tr.querySelector(".rs-name-cell");
  const valueCell = tr.querySelector(".rs-value-cell");
  const actionsCell = tr.querySelector(".rs-actions");
  const originalLabel = row.label;
  const originalPrice = Number(row.price);

  nameCell.innerHTML = `<input type="text" class="rs-name-input" value="${escapeHtml(originalLabel)}">`;
  valueCell.innerHTML = `<input type="number" class="rs-value-input" value="${originalPrice}" min="0.01" step="any">`;
  actionsCell.innerHTML = `
    <button class="rs-btn rs-btn-save" data-act="save">Simpan</button>
    <button class="rs-btn rs-btn-cancel" data-act="cancel">Batal</button>
  `;

  const nameInput = nameCell.querySelector("input");
  const valueInput = valueCell.querySelector("input");
  nameInput.focus();

  actionsCell.querySelector('[data-act="cancel"]').addEventListener("click", () => {
    renderPriceListTable();
  });

  actionsCell.querySelector('[data-act="save"]').addEventListener("click", async () => {
    const newLabel = nameInput.value.trim();
    const newPrice = Number(valueInput.value);

    if (!newLabel) { alert("Jenis invoice wajib diisi"); return; }
    if (!Number.isFinite(newPrice) || newPrice <= 0) { alert("Harga harus berupa angka lebih dari 0"); return; }

    const saveBtn = actionsCell.querySelector('[data-act="save"]');
    saveBtn.disabled = true;
    saveBtn.textContent = "...";

    try {
      const result = await callApi("updatePriceListItem", { id: row.id, jenis_invoice: newLabel, harga: newPrice });
      if (!result.success) {
        alert(result.message || "Gagal menyimpan");
        saveBtn.disabled = false;
        saveBtn.textContent = "Simpan";
        return;
      }
      row.label = newLabel;
      row.price = newPrice;
      renderPriceListTable();
    } catch (e) {
      alert("Gagal mengirim data (network error)");
      saveBtn.disabled = false;
      saveBtn.textContent = "Simpan";
    }
  });
}

document.getElementById("addPriceItemBtn").addEventListener("click", () => {
  const tbody = document.getElementById("priceListBody");
  if (tbody.querySelector(".rs-new-row")) return;

  if (tbody.querySelector(".empty")) tbody.innerHTML = "";

  const tr = document.createElement("tr");
  tr.className = "rs-new-row";
  tr.innerHTML = `
    <td><input type="text" class="rs-name-input" id="newPriceLabel" placeholder="Contoh: MEDICAL CHECKUP"></td>
    <td><input type="number" class="rs-value-input" id="newPriceValue" placeholder="0" min="0.01" step="any"></td>
    <td>
      <div class="rs-actions">
        <button class="rs-btn rs-btn-save" id="newPriceSaveBtn">Simpan</button>
        <button class="rs-btn rs-btn-cancel" id="newPriceCancelBtn">Batal</button>
      </div>
    </td>
  `;
  tbody.prepend(tr);
  document.getElementById("newPriceLabel").focus();

  document.getElementById("newPriceCancelBtn").addEventListener("click", () => {
    renderPriceListTable();
  });

  document.getElementById("newPriceSaveBtn").addEventListener("click", async () => {
    const label = document.getElementById("newPriceLabel").value.trim();
    const price = Number(document.getElementById("newPriceValue").value);

    if (!label) { alert("Jenis invoice wajib diisi"); return; }
    if (!Number.isFinite(price) || price <= 0) { alert("Harga harus berupa angka lebih dari 0"); return; }

    const saveBtn = document.getElementById("newPriceSaveBtn");
    saveBtn.disabled = true;
    saveBtn.textContent = "...";

    try {
      const result = await callApi("addPriceListItem", { jenis_invoice: label, harga: price });
      if (!result.success) {
        alert(result.message || "Gagal menambah item");
        saveBtn.disabled = false;
        saveBtn.textContent = "Simpan";
        return;
      }
      await loadPriceList();
    } catch (e) {
      alert("Gagal mengirim data (network error)");
      saveBtn.disabled = false;
      saveBtn.textContent = "Simpan";
    }
  });
});

let pendingDeleteRow = null;

function openDeleteModal(row) {
  pendingDeleteRow = row;
  document.getElementById("deleteModalText").innerHTML =
    `Yakin ingin menghapus <b>${escapeHtml(row.label)}</b> dari price list? Aksi ini tidak bisa dibatalkan.`;
  document.getElementById("deleteModal").classList.add("rs-modal-show");
}

function closeDeleteModal() {
  pendingDeleteRow = null;
  document.getElementById("deleteModal").classList.remove("rs-modal-show");
}

document.getElementById("deleteModalCancelBtn").addEventListener("click", closeDeleteModal);

document.getElementById("deleteModalConfirmBtn").addEventListener("click", async () => {
  if (!pendingDeleteRow) return;
  const btn = document.getElementById("deleteModalConfirmBtn");
  btn.disabled = true;
  btn.textContent = "Menghapus...";

  try {
    const result = await callApi("deletePriceListItem", { id: pendingDeleteRow.id });
    if (!result.success) {
      alert(result.message || "Gagal menghapus");
      btn.disabled = false;
      btn.textContent = "Ya, Hapus";
      return;
    }
    closeDeleteModal();
    btn.disabled = false;
    btn.textContent = "Ya, Hapus";
    await loadPriceList();
  } catch (e) {
    alert("Gagal mengirim data (network error)");
    btn.disabled = false;
    btn.textContent = "Ya, Hapus";
  }
});
