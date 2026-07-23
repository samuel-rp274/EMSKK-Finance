lucide.createIcons();

const params = new URLSearchParams(window.location.search);
const redirectTarget = sanitizeRedirect(params.get('redirect'));

function sanitizeRedirect(target){
  if (!target) return 'index.html';
  if (target.includes('://') || target.startsWith('//')) return 'index.html';
  return target;
}

function showView(id){
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function showStatus(boxId, type, message){
  const box = document.getElementById(boxId);
  box.className = 'status-box show ' + type;
  const icon = type === 'error' ? 'alert-circle' : 'check-circle';
  box.innerHTML = `<i data-lucide="${icon}"></i><div>${message}</div>`;
  lucide.createIcons();
}

function hideStatus(boxId){
  const box = document.getElementById(boxId);
  box.className = 'status-box';
  box.innerHTML = '';
}

function setBtnLoading(btn, loading, idleHtml){
  btn.disabled = loading;
  btn.innerHTML = loading
    ? '<i data-lucide="loader-circle" style="animation:spin 1s linear infinite;"></i> Memproses...'
    : idleHtml;
  lucide.createIcons();
}

function finishLogin(username){
  localStorage.setItem('emskk_username', username);
  window.location.href = redirectTarget;
}

// state carried between views
let sessionUsername = null;
let sessionPassword = null;

document.getElementById('loginForm').addEventListener('submit', async function(e){
  e.preventDefault();
  const username = document.getElementById('usernameInput').value.trim();
  const password = document.getElementById('passwordInput').value.trim();
  if (!username || !password) return;

  hideStatus('loginStatus');
  const btn = document.getElementById('loginBtn');
  setBtnLoading(btn, true);

  try {
    const res = await fetch(SCRIPT_URL + "?action=login&username=" + encodeURIComponent(username) + "&password=" + encodeURIComponent(password));
    const result = await res.json();

    if (result.success) {
      sessionUsername = result.username;
      sessionPassword = password;

      if (!result.passwordChanged) {
        showView('choiceView');
      } else {
        finishLogin(result.username);
      }
    } else {
      showStatus('loginStatus', 'error', result.message || 'Username atau Password salah.');
      setBtnLoading(btn, false, '<i data-lucide="log-in"></i> Masuk');
    }
  } catch (err) {
    showStatus('loginStatus', 'error', 'Gagal menghubungi server: ' + err.message);
    setBtnLoading(btn, false, '<i data-lucide="log-in"></i> Masuk');
  }
});

document.getElementById('wantChangeBtn').addEventListener('click', function(){
  showView('changeView');
});

document.getElementById('backToChoiceBtn').addEventListener('click', function(){
  hideStatus('changeStatus');
  document.getElementById('newUsernameInput').value = '';
  document.getElementById('newPasswordInput').value = '';
  showView('choiceView');
});

document.getElementById('keepPasswordBtn').addEventListener('click', async function(){
  hideStatus('choiceStatus');
  const btn = document.getElementById('keepPasswordBtn');
  setBtnLoading(btn, true);

  try {
    const res = await fetch(SCRIPT_URL + "?action=updateCredentials"
      + "&currentUsername=" + encodeURIComponent(sessionUsername)
      + "&currentPassword=" + encodeURIComponent(sessionPassword));
    const result = await res.json();

    if (result.success) {
      finishLogin(result.username);
    } else {
      showStatus('choiceStatus', 'error', result.message || 'Terjadi kesalahan.');
      setBtnLoading(btn, false, '<i data-lucide="check"></i> Pertahankan Password Lama');
    }
  } catch (err) {
    showStatus('choiceStatus', 'error', 'Gagal menghubungi server: ' + err.message);
    setBtnLoading(btn, false, '<i data-lucide="check"></i> Pertahankan Password Lama');
  }
});

document.getElementById('changeForm').addEventListener('submit', async function(e){
  e.preventDefault();
  const newUsername = document.getElementById('newUsernameInput').value.trim();
  const newPassword = document.getElementById('newPasswordInput').value.trim();
  if (!newPassword) return;

  hideStatus('changeStatus');
  const btn = document.getElementById('changeBtn');
  setBtnLoading(btn, true);

  try {
    const res = await fetch(SCRIPT_URL + "?action=updateCredentials"
      + "&currentUsername=" + encodeURIComponent(sessionUsername)
      + "&currentPassword=" + encodeURIComponent(sessionPassword)
      + "&newUsername=" + encodeURIComponent(newUsername)
      + "&newPassword=" + encodeURIComponent(newPassword));
    const result = await res.json();

    if (result.success) {
      finishLogin(result.username);
    } else {
      showStatus('changeStatus', 'error', result.message || 'Terjadi kesalahan.');
      setBtnLoading(btn, false, '<i data-lucide="check"></i> Simpan');
    }
  } catch (err) {
    showStatus('changeStatus', 'error', 'Gagal menghubungi server: ' + err.message);
    setBtnLoading(btn, false, '<i data-lucide="check"></i> Simpan');
  }
});