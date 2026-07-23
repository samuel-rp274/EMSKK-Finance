const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyM0aOVZwPSu2Pz0gn-DljKMm6FXmGgpxhu2fOZV9_HOG87WdsEbGmf7Bq18sdRIZ2kgg/exec";

const LOGIN_KEY = "ems_admin_login";
const CACHE_KEY_EMS = "ems_cache_v1";

const CACHE_TTL = 1000 * 60 * 5;

function isCacheValid(time){
  return (Date.now() - time) < CACHE_TTL;
}
