lucide.createIcons();

const spKetSpTS = new TomSelect("#spKetSp", {
  create: false,
  controlInput: null // no free-typing, dropdown-only selection
});

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}

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

const spSearchInput = document.getElementById("spSearch");
const spSearchResults = document.getElementById("spSearchResults");
setupMemberSearch(spSearchInput, spSearchResults, (id) => selectSpMember(id));

async function selectSpMember(id) {
  const status = document.getElementById("spStatus");
  status.innerHTML = "";
  spSearchResults.classList.add("hidden");

  try {
    const result = await callApi("getMemberForEdit", { id });
    if (!result.success) {
      alert(result.message || "Gagal memuat data member");
      return;
    }

    const p = result.data;
    document.getElementById("spId").value = p.id;
    document.getElementById("spName").innerText = p.nama;
    document.getElementById("spMeta").innerText = `Angkatan ${p.angkatan} · ${p.jabatan} · ${p.divisi} · ${p.status}`;
    spKetSpTS.setValue(p.ket_sp || "", true); // silent: not a user-initiated change

    document.getElementById("spMemberWrap").classList.remove("hidden");
    spSearchInput.value = p.nama;
  } catch (err) {
    console.error(err);
    alert("Gagal memuat data member (network error)");
  }
}

document.getElementById("spForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const status = document.getElementById("spStatus");

  const id = document.getElementById("spId").value;
  const nama = document.getElementById("spName").innerText;
  const ketSp = spKetSpTS.getValue();

  const label = ketSp ? ketSp : "tidak ada SP (bersih)";
  const yakin = confirm(`Simpan status SP untuk ${nama}?\n\nKet. SP baru: ${label}`);
  if (!yakin) return;

  status.innerHTML = "⏳ Menyimpan...";

  try {
    const result = await callApi("updateMemberSP", { id, ketSp });

    if (!result.success) {
      status.innerHTML = "❌ " + (result.message || "Gagal menyimpan perubahan SP");
      return;
    }

    status.innerHTML = "✅ Status SP berhasil disimpan";
  } catch (err) {
    console.error(err);
    status.innerHTML = "❌ Gagal mengirim data (network error)";
  }
});
