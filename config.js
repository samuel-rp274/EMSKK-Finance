const EDGE_FUNCTION_URL = "https://ihtbokgftahlnwpsgmyy.supabase.co/functions/v1/emskk-api";
const SUPABASE_ANON_KEY = "sb_publishable_SNeGnTkt6wBTexgH4faIXQ_PvEloSQZ";

const LOGIN_KEY = "ems_admin_login";
const ADMIN_GATE_KEY = "emskk_admin_gate";
const CACHE_KEY_EMS = "ems_cache_v1";

const CACHE_TTL = 1000 * 60 * 5;

function isCacheValid(time){
  return (Date.now() - time) < CACHE_TTL;
}

// Escape teks bebas dari user sebelum ditaro ke innerHTML, biar nggak bisa
// "kabur" dari tag/atribut HTML dan nyuntik script (stored XSS).
function escapeHtml(str){
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

// Buat link (href) dari input user — cuma izinin http/https, selain itu
// (javascript:, data:, dll) di-block dan diganti "#" biar nggak bisa dipake
// buat XSS lewat href.
function safeUrl(url){
  const s = String(url ?? "").trim();
  if (/^https?:\/\//i.test(s)) return s;
  return "#";
}

async function callApi(action, payload = {}) {
  let token = payload.token;
  if (!token) {
    try {
      const session = JSON.parse(localStorage.getItem(LOGIN_KEY));
      if (session && session.token) token = session.token;
    } catch (e) {
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
  return await res.json();
}