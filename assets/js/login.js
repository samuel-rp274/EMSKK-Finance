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

function finishLogin(session){
  localStorage.setItem(LOGIN_KEY, JSON.stringify({
    token: session.token,
    username: session.username,
    role: session.role,
    nama: session.nama
  }));
  window.location.href = redirectTarget;
}

let sessionUsername = null;
let sessionPassword = null;
let sessionResult = null; 

document.getElementById('loginForm').addEventListener('submit', async function(e){
  e.preventDefault();
  const username = document.getElementById('usernameInput').value.trim();
  const password = document.getElementById('passwordInput').value.trim();
  if (!username || !password) return;

  hideStatus('loginStatus');
  const btn = document.getElementById('loginBtn');
  setBtnLoading(btn, true);

  try {
    const result = await callApi('login', { username, password });

    if (result.success) {
      sessionUsername = result.username;
      sessionPassword = password;
      sessionResult = result;

      if (!result.passwordChanged) {
        showView('choiceView');
      } else {
        finishLogin(result);
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
    const result = await callApi('updateCredentials', {
      token: sessionResult.token,  
      currentUsername: sessionUsername,
      currentPassword: sessionPassword
    });

    if (result.success) {
      finishLogin({ ...sessionResult, username: result.username });
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
    const result = await callApi('updateCredentials', {
      token: sessionResult.token,
      currentUsername: sessionUsername,
      currentPassword: sessionPassword,
      newUsername: newUsername,
      newPassword: newPassword
    });

    if (result.success) {
      finishLogin({ ...sessionResult, username: result.username });
    } else {
      showStatus('changeStatus', 'error', result.message || 'Terjadi kesalahan.');
      setBtnLoading(btn, false, '<i data-lucide="check"></i> Simpan');
    }
  } catch (err) {
    showStatus('changeStatus', 'error', 'Gagal menghubungi server: ' + err.message);
    setBtnLoading(btn, false, '<i data-lucide="check"></i> Simpan');
  }
});