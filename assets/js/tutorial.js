const tutorialData = [
  {
    key: "attendance",
    icon: "clock",
    title: "1. Attendance",
    steps: [
      "Pilih atau Tulis Nama EMS (Jabatan & Divisi terisi otomatis)",
      "Klik <span class='highlight'>START DUTY</span> → ON DUTY (cukup 1x klik)",
      "Klik <span class='highlight'>FINISH DUTY</span> → OFF DUTY (cukup 1x klik)",
      "Data durasi duty otomatis tersimpan"
    ],
    note: {
      title: "Catatan",
      items: [
        "Sistem menggunakan zona waktu WIB (UTC+7), durasi kerja dihitung otomatis dari START → FINISH",
        "Apabila melamun diharapkan OFF DUTY",
        "Setelah ON DUTY, browser boleh ditutup, dan timer akan tetap berjalan",
        "Jika terlambat ON DUTY atau lupa OFF DUTY silakan hubungi FINANCE"
      ]
    }
  },
  {
    key: "attendance-overview",
    icon: "history",
    title: "2. Attendance Overview",
    steps: [
      "Filter berdasarkan Nama EMS",
      "Total jam kerja minggu ini",
      "Total jam kerja bulan ini",
      "Waktu duty terakhir",
      "Detail start & finish"
    ],
    note: null
  },
  {
    key: "invoice-input",
    icon: "file-text",
    title: "3. Invoice Input",
    steps: [
      "Pilih atau Tulis Nama EMS (Jabatan & Divisi terisi otomatis)",
      "Isi invoice",
      "Pilih jenis invoice",
      "Isi harga & qty (Khusus Operasi, Surat, Lain-lain)",
      "Upload link bukti invoice",
      "Simpan invoice"
    ],
    note: {
      title: "Catatan",
      items: [
        "Link bukti wajib berupa link attachment resmi Discord (domain cdn atau media)",
        "Format harga tanpa titik (contoh: 200000)",
        "Kesalahan input invoice silakan hubungi FINANCE"
      ]
    }
  },
  {
    key: "invoice-overview",
    icon: "folder-clock",
    title: "4. Invoice Overview",
    steps: [
      "Filter berdasarkan Nama EMS",
      "Lihat total minggu ini",
      "Lihat jumlah invoice",
      "Lihat upload terakhir"
    ],
    note: null
  }
];

function renderTutorialCards() {
  const container = document.getElementById("tutorial-cards-container");
  
  const cardsHtml = tutorialData.map(card => {
    const stepsHtml = card.steps.map(step => `<li>${step}</li>`).join("");
    
    let noteHtml = "";
    if (card.note) {
      const noteItemsHtml = card.note.items.map(item => `<li>${item}</li>`).join("");
      noteHtml = `
        <div class="note">
          <div class="note-title"><i data-lucide="lightbulb" style="width:16px; height:16px;"></i> ${card.note.title}</div>
          <ul>${noteItemsHtml}</ul>
        </div>
      `;
    }
    
    return `
      <div class="card ${card.key}">
        <h2><i data-lucide="${card.icon}" style="width:20px; height:20px;"></i> ${card.title}</h2>
        <ul>${stepsHtml}</ul>
        ${noteHtml}
      </div>
    `;
  }).join("");

  container.innerHTML = cardsHtml;
  
  if (window.lucide) {
    lucide.createIcons();
  }
}

document.addEventListener("DOMContentLoaded", renderTutorialCards);