(function(){
  if (!window.__guardSession) return;

  var rendered = false;

  var cachedUsername = localStorage.getItem('emskk_username');
  var cachedRole = localStorage.getItem('emskk_role');
  var cachedNama = localStorage.getItem('emskk_nama');

  if (cachedUsername && cachedRole) {
    rendered = true;
    initSidebar({ username: cachedUsername, role: cachedRole, nama: cachedNama || cachedUsername });
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
    items.push({ type: 'link', label: 'Account', href: 'akun.html', icon: 'user-cog' });
    items.push({ type: 'divider' });
    items.push({ type: 'logout', label: 'Logout', icon: 'log-out' });

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
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const items = buildMenu(role);

    const topbar = document.createElement('div');
    topbar.id = '__sbTopbar';
    topbar.innerHTML =
      '<button id="__sbToggleBtn" aria-label="Buka menu">' + icon('menu') + '</button>' +
      '<div id="__sbTopbarTitle">EMSKK SYSTEM</div>';

    const backdrop = document.createElement('div');
    backdrop.id = '__sbBackdrop';

    const panel = document.createElement('div');
    panel.id = '__sbPanel';
    panel.innerHTML =
      '<a class="__sb-brand" href="index.html"><img src="assets/images/logo.png" alt="Logo"><span>EMS KOTAKITA</span></a>' +
      '<div class="__sb-greeting">Halo, ' + nama + '</div>' +
      '<div class="__sb-menu">' + renderMenuHTML(items, currentPage) + '</div>' +
      '<div class="__sb-footer">EMS KotaKita<br>© Samuel ' + new Date().getFullYear() + '</div>';

    document.body.appendChild(topbar);
    document.body.appendChild(backdrop);
    document.body.appendChild(panel);

    if (window.lucide) lucide.createIcons();

    function openSidebar(){
      panel.classList.add('__sb-open');
      backdrop.classList.add('__sb-show');
    }
    function closeSidebar(){
      panel.classList.remove('__sb-open');
      backdrop.classList.remove('__sb-show');
    }

    document.getElementById('__sbToggleBtn').addEventListener('click', openSidebar);
    backdrop.addEventListener('click', closeSidebar);

    const logoutBtn = document.getElementById('__sbLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function(e){
        e.preventDefault();
        localStorage.removeItem('emskk_username');
        localStorage.removeItem('emskk_role');
        localStorage.removeItem('emskk_nama');
        window.location.href = 'login.html';
      });
    }
  }
})();