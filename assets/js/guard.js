window.__guardSession = (function(){
  var SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyM0aOVZwPSu2Pz0gn-DljKMm6FXmGgpxhu2fOZV9_HOG87WdsEbGmf7Bq18sdRIZ2kgg/exec";
  var ROLE_LEVELS = { user: 1, admin: 2 };

  var thisScript = document.currentScript;
  var REQUIRED_LEVEL = parseInt(thisScript.getAttribute('data-level'), 10) || 1;

  var username = localStorage.getItem('emskk_username');
  var cachedRole = localStorage.getItem('emskk_role');
  var cachedNama = localStorage.getItem('emskk_nama');

  function redirectToLogin(){
    var currentPage = window.location.pathname.split('/').pop() || 'index.html';
    window.location.replace('login.html?redirect=' + encodeURIComponent(currentPage));
  }

  function reveal(){
    document.querySelectorAll('link[href$="guard.css"]').forEach(function(el){ el.disabled = true; });
  }

  function storeSession(role, nama){
    localStorage.setItem('emskk_role', role);
    localStorage.setItem('emskk_nama', nama);
  }

  function clearSession(){
    localStorage.removeItem('emskk_username');
    localStorage.removeItem('emskk_role');
    localStorage.removeItem('emskk_nama');
  }

  if (!username) {
    redirectToLogin();
    return Promise.resolve(null);
  }

  var canOptimistic = !!cachedRole && (ROLE_LEVELS[cachedRole] || 0) >= REQUIRED_LEVEL;
  if (canOptimistic) {
    reveal();
  }

  return fetch(SCRIPT_URL + '?action=validateSession&username=' + encodeURIComponent(username))
    .then(function(res){ return res.json(); })
    .then(function(result){
      if (!result.valid) {
        clearSession();
        redirectToLogin();
        return null;
      }
      var level = ROLE_LEVELS[result.role] || 0;
      if (level < REQUIRED_LEVEL) {
        clearSession();
        redirectToLogin();
        return null;
      }

      var nama = result.nama || username;
      var changed = canOptimistic && (result.role !== cachedRole || nama !== cachedNama);
      storeSession(result.role, nama);

      if (changed) {
        window.location.reload();
        return null;
      }

      reveal();
      return { username: username, role: result.role, nama: nama };
    })
    .catch(function(){
      reveal();
      return { username: username, role: cachedRole || null, nama: cachedNama || username };
    });
})();