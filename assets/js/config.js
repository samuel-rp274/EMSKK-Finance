const EDGE_FUNCTION_URL = "https://ihtbokgftahlnwpsgmyy.supabase.co/functions/v1/emskk-api";
const SUPABASE_ANON_KEY = "sb_publishable_SNeGnTkt6wBTexgH4faIXQ_PvEloSQZ";

const LOGIN_KEY = "ems_admin_login";
const ADMIN_GATE_KEY = "emskk_admin_gate";
const CACHE_KEY_EMS = "ems_cache_v1";

const CACHE_TTL = 1000 * 60 * 5;

function isCacheValid(time){
  return (Date.now() - time) < CACHE_TTL;
}

// Helper standar buat manggil Edge Function dari halaman mana pun
async function callApi(action, payload = {}) {
  const res = await fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + SUPABASE_ANON_KEY
    },
    body: JSON.stringify({ action, ...payload })
  });
  return await res.json();
}