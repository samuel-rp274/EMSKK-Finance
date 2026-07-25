(function(){
  if (!window.__guardSession) return;

  var rendered = false;
  var PHOTO_BASE = "assets/photos/";
  var DEFAULT_AVATAR_COLOR = "#334155";

  var cachedUsername = localStorage.getItem('emskk_username');
  var cachedRole = localStorage.getItem('emskk_role');
  var cachedNama = localStorage.getItem('emskk_nama');
  var cachedPhoto = localStorage.getItem('emskk_photo');
  var cachedPhotoUpdatedAt = localStorage.getItem('emskk_photo_updated_at');

  if (cachedUsername && cachedRole) {
    rendered = true;
    initSidebar({ username: cachedUsername, role: cachedRole, nama: cachedNama || cachedUsername, photo: cachedPhoto || null, photoUpdatedAt: cachedPhotoUpdatedAt || null });
  }

  window.__guardSession.then(function(session){
    if (!session) return;
    if (!rendered) {
      initSidebar(session);
    }
  });

  function icon(name){
    return '<i data-lucide="' + name + '"></i>';
  }

  function escapeHtml(str){
    return String(str || "").replace(/[&<>"']/g, function(m){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m];
    });
  }

  function initials(name){
    var clean = String(name || "").replace(/^dr\.\s*/i, '').replace(/,.*$/, '').trim();
    var parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function userAvatarHtml(nama, photo, photoUpdatedAt){
    var label = initials(nama);
    var bg = DEFAULT_AVATAR_COLOR;
    if (photo) {
      var verParam = photoUpdatedAt ? ('?v=' + photoUpdatedAt) : '';
      return '<img src="' + PHOTO_BASE + escapeHtml(photo) + verParam + '" alt="' + escapeHtml(nama) + '" ' +
        'onerror="this.outerHTML=\'<span class=&quot;__sb-avatar-fallback&quot; style=&quot;background:' + bg + ';&quot;>' + label + '</span>\'">';
    }
    return '<span class="__sb-avatar-fallback" style="background:' + bg + ';">' + label + '</span>';
  }

  function buildMenu(role){
    const items = [
      { type: 'sectionLabel', label: 'EMSKK Portal Menu' },
      { type: 'link', label: 'Dashboard', href: 'index.html', icon: 'layout-dashboard' },
      { type: 'link', label: 'Attendance', href: 'attendance.html', icon: 'clock' },
      { type: 'link', label: 'Attendance Overview', href: 'attendancelog.html', icon: 'history' },
      { type: 'link', label: 'Invoice Input', href: 'invoice.html', icon: 'file-text' },
      { type: 'link', label: 'Invoice Overview', href: 'invoicelog.html', icon: 'folder-clock' },
    ];

    if (role === 'admin') {
      items.push({ type: 'divider' });
      items.push({ type: 'sectionLabel', label: 'Admin Menu' });
      items.push({ type: 'link', label: 'Admin Dashboard', href: 'indexadminemskk.html', icon: 'layout-dashboard' });
      items.push({ type: 'link', label: 'Finance', href: 'financeadmin.html', icon: 'wallet' });
      items.push({ type: 'link', label: 'Photo Upload', href: 'photoupload.html', icon: 'image-plus' });
      items.push({ type: 'link', label: 'HRD', href: 'hrd.html', icon: 'users' });
      items.push({ type: 'link', label: 'Rank', href: 'rank.html', icon: 'trophy' });
    }

    items.push({ type: 'divider' });
    items.push({ type: 'link', label: 'Organizational Structure', href: 'structure.html', icon: 'network' });
    items.push({ type: 'link', label: 'Tutorial', href: 'tutorial.html', icon: 'book-open' });

    return items;
  }

  function renderMenuHTML(items, currentPage){
    return items.map(function(item){
      if (item.type === 'divider') {
        return '<hr class="__sb-divider">';
      }
      if (item.type === 'sectionLabel') {
        return '<div class="__sb-section-label">' + item.label + '</div>';
      }
      if (item.type === 'logout') {
        return '<a class="__sb-link __sb-logout" href="#" id="__sbLogoutBtn">' + icon(item.icon) + '<span>' + item.label + '</span></a>';
      }
      const activeClass = item.href === currentPage ? ' __sb-active' : '';
      return '<a class="__sb-link' + activeClass + '" href="' + item.href + '">' + icon(item.icon) + '<span>' + item.label + '</span></a>';
    }).join('');
  }

  function initSidebar(session){
    const role = session.role;
    const nama = session.nama || session.username;
    const photo = session.photo || null;
    const photoUpdatedAt = session.photoUpdatedAt || null;
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const items = buildMenu(role);

    const topbar = document.createElement('div');
    topbar.id = '__sbTopbar';
    topbar.innerHTML =
      '<button id="__sbToggleBtn" aria-label="Buka menu">' + icon('menu') + '</button>' +
      '<div id="__sbTopbarTitle">EMSKK SYSTEM</div>' +
      '<div id="__sbUserMenu">' +
        '<button id="__sbUserTrigger" aria-label="Menu akun">' +
          '<span class="__sb-user-avatar">' + userAvatarHtml(nama, photo, photoUpdatedAt) + '</span>' +
          '<span class="__sb-user-name">' + escapeHtml(nama) + '</span>' +
          '<span class="__sb-user-chevron">' + icon('chevron-down') + '</span>' +
        '</button>' +
        '<div id="__sbUserDropdown">' +
          '<a class="__sb-dropdown-link" href="account.html">' + icon('user-cog') + '<span>Manage Account</span></a>' +
          '<a class="__sb-dropdown-link __sb-logout" href="#" id="__sbLogoutBtn">' + icon('log-out') + '<span>Logout</span></a>' +
        '</div>' +
      '</div>';

    const backdrop = document.createElement('div');
    backdrop.id = '__sbBackdrop';

    const panel = document.createElement('div');
    panel.id = '__sbPanel';
    panel.innerHTML =
      '<a class="__sb-brand" href="index.html"><img src="assets/images/logo.png" alt="Logo"><span>EMS KOTAKITA</span></a>' +
      '<div class="__sb-menu">' + renderMenuHTML(items, currentPage) + '</div>' +
      '<div class="__sb-footer">EMS KotaKita<br>© Samuel ' + new Date().getFullYear() + '</div>';

    document.body.appendChild(topbar);
    document.body.appendChild(backdrop);
    document.body.appendChild(panel);

    if (window.lucide) lucide.createIcons();

    var isPinned = false;
    var isHoverOpen = false;
    var closeTimer = null;
    var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var HOVER_CLOSE_DELAY = 250;
    var toggleBtn = document.getElementById('__sbToggleBtn');

    function updateToggleIcon(){
      toggleBtn.innerHTML = isPinned ? icon('x') : icon('menu');
      toggleBtn.setAttribute('aria-label', isPinned ? 'Tutup menu' : 'Buka menu');
      if (window.lucide) lucide.createIcons();
    }

    function updateVisualState(){
      var shouldShowPanel = isPinned || isHoverOpen;
      panel.classList.toggle('__sb-open', shouldShowPanel);
      backdrop.classList.toggle('__sb-show', isPinned);
      updateToggleIcon();
    }

    function clearCloseTimer(){
      if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
    }

    function openHover(){
      if (isPinned) return;
      clearCloseTimer();
      isHoverOpen = true;
      updateVisualState();
    }

    function scheduleHoverClose(){
      if (isPinned) return;
      clearCloseTimer();
      closeTimer = setTimeout(function(){
        isHoverOpen = false;
        updateVisualState();
      }, HOVER_CLOSE_DELAY);
    }

    function togglePinned(){
      isPinned = !isPinned;
      if (isPinned) {
        clearCloseTimer();
        isHoverOpen = false;
      }
      updateVisualState();
    }

    function closeSidebar(){
      isPinned = false;
      isHoverOpen = false;
      clearCloseTimer();
      updateVisualState();
    }

    if (canHover) {
      toggleBtn.addEventListener('mouseenter', openHover);
      toggleBtn.addEventListener('mouseleave', scheduleHoverClose);
      panel.addEventListener('mouseenter', clearCloseTimer);
      panel.addEventListener('mouseleave', scheduleHoverClose);
      toggleBtn.addEventListener('click', togglePinned);
    } else {
      toggleBtn.addEventListener('click', function(){
        isPinned = !isPinned;
        updateVisualState();
      });
    }

    backdrop.addEventListener('click', closeSidebar);

    var userMenu = document.getElementById('__sbUserMenu');
    var userTrigger = document.getElementById('__sbUserTrigger');
    var userDropdown = document.getElementById('__sbUserDropdown');

    function closeUserDropdown(){
      userMenu.classList.remove('__sb-user-open');
    }

    userTrigger.addEventListener('click', function(e){
      e.stopPropagation();
      userMenu.classList.toggle('__sb-user-open');
    });

    document.addEventListener('click', function(e){
      if (!userMenu.contains(e.target)) closeUserDropdown();
    });

    const logoutBtn = document.getElementById('__sbLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function(e){
        e.preventDefault();
        localStorage.removeItem('emskk_username');
        localStorage.removeItem('emskk_role');
        localStorage.removeItem('emskk_nama');
        localStorage.removeItem('emskk_photo');
        localStorage.removeItem('emskk_photo_updated_at');
        window.location.href = 'login.html';
      });
    }
  }
})();