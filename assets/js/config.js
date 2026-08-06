const EDGE_FUNCTION_URL = "https://ihtbokgftahlnwpsgmyy.supabase.co/functions/v1/emskk-api";
const SUPABASE_ANON_KEY = "sb_publishable_SNeGnTkt6wBTexgH4faIXQ_PvEloSQZ";

const LOGIN_KEY = "ems_admin_login";
const ADMIN_GATE_KEY = "emskk_admin_gate";
const CACHE_KEY_EMS = "ems_cache_v1";

const CACHE_TTL = 1000 * 60 * 5;

function isCacheValid(time){
  return (Date.now() - time) < CACHE_TTL;
}

// Helper standar buat manggil Edge Function dari halaman mana pun.
// Token session otomatis disisipkan (kalau ada & belum di-override manual di payload),
// supaya backend bisa validasi login + role tiap action lewat requireAuth().
async function callApi(action, payload = {}) {
  let token = payload.token;
  if (!token) {
    try {
      const session = JSON.parse(localStorage.getItem(LOGIN_KEY));
      if (session && session.token) token = session.token;
    } catch (e) {
      // localStorage kosong/rusak -> biarin token undefined, backend yang nolak kalau action-nya butuh login
    }
  }

  const res = await fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + SUPABASE_ANON_KEY
    },
    body: JSON.stringify({ action, ...payload, token })
  });
  const result = await res.json();

  // requireAuth() di backend selalu pakai prefix "Unauthorized"/"Forbidden" kalau nolak
  // gara-gara belum login / role kurang. Dilempar sebagai Error di sini (bukan diloloskan
  // sebagai data biasa), supaya ketangkep try/catch yang sudah ada di tiap halaman, dan
  // datanya nggak sempet ke-cache sebelum ketauan gagal. Gagal karena alasan bisnis biasa
  // (password salah, data tidak lengkap, dll) tetap diloloskan apa adanya seperti sebelumnya.
  if (
    result && result.success === false && typeof result.message === "string" &&
    (result.message.startsWith("Unauthorized") || result.message.startsWith("Forbidden"))
  ) {
    throw new Error(result.message);
  }

  return result;
}