window.__guardSession = (function(){
  var ROLE_LEVELS = { user: 1, admin: 2, superadmin: 3 };

  var thisScript = document.currentScript;
  var REQUIRED_LEVEL = parseInt(thisScript.getAttribute('data-level'), 10) || 1;

  function getSession(){
    try {
      return JSON.parse(localStorage.getItem(LOGIN_KEY)) || null;
    } catch (e) {
      return null;
    }
  }

  var session = getSession();

  function redirectToLogin(){
    var currentPage = window.location.pathname.split('/').pop() || 'index.html';
    window.location.replace('login.html?redirect=' + encodeURIComponent(currentPage));
  }

  function reveal(){
    document.querySelectorAll('link[href$="guard.css"]').forEach(function(el){ el.disabled = true; });
  }

  function storeSession(updated){
    localStorage.setItem(LOGIN_KEY, JSON.stringify(updated));
  }

  function clearSession(){
    localStorage.removeItem(LOGIN_KEY);
  }

  if (!session || !session.token) {
    redirectToLogin();
    return Promise.resolve(null);
  }

  var cachedRole = session.role;
  var cachedNama = session.nama;
  var cachedPhoto = session.photo || null;
  var cachedPhotoUpdatedAt = session.photoUpdatedAt || null;

  var canOptimistic = !!cachedRole && (ROLE_LEVELS[cachedRole] || 0) >= REQUIRED_LEVEL;
  if (canOptimistic) {
    reveal();
  }

  return callApi('validateSession', { token: session.token })
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

      var nama = result.nama || session.username;
      var photo = result.photo || null;
      var photoUpdatedAt = result.photoUpdatedAt || null;
      var changed = canOptimistic && (result.role !== cachedRole || nama !== cachedNama || photo !== cachedPhoto);

      storeSession({
        token: session.token,
        username: session.username,
        id: result.id,
        role: result.role,
        nama: nama,
        jabatan: result.jabatan || null,
        divisi: result.divisi || null,
        photo: photo,
        photoUpdatedAt: photoUpdatedAt
      });

      if (changed) {
        window.location.reload();
        return null;
      }

      reveal();
      return { username: session.username, id: result.id, role: result.role, nama: nama, jabatan: result.jabatan || null, divisi: result.divisi || null, photo: photo, photoUpdatedAt: photoUpdatedAt };
    })
    .catch(function(){
      reveal();
      return { username: session.username, id: session.id || null, role: cachedRole || null, nama: cachedNama || session.username, jabatan: session.jabatan || null, divisi: session.divisi || null, photo: cachedPhoto, photoUpdatedAt: cachedPhotoUpdatedAt };
    });
})();
