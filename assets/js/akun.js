lucide.createIcons();

if (window.__guardSession) {
  window.__guardSession.then(function(session){
    if (session && session.nama) {
      document.getElementById('greetingText').textContent = 'Halo, ' + session.nama;
    }
  });
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

function setBtnLoading(btnId, loading, idleHtml){
  const btn = document.getElementById(btnId);
  btn.disabled = loading;
  btn.innerHTML = loading
    ? '<i data-lucide="loader-circle" style="animation:spin 1s linear infinite;"></i> Memproses...'
    : idleHtml;
  lucide.createIcons();
}

function resetAllForms(){
  document.getElementById('newUsernameInput').value = '';
  document.getElementById('usernamePasswordInput').value = '';
  document.getElementById('currentPasswordInput').value = '';
  document.getElementById('newPasswordInput').value = '';
  document.getElementById('confirmPasswordInput').value = '';
  hideStatus('usernameStep1Status');
  hideStatus('usernameStep2Status');
  hideStatus('passwordStep1Status');
  hideStatus('passwordStep2Status');
  const hint = document.getElementById('matchHint');
  hint.className = 'match-hint';
  hint.textContent = '';
}

function forceLogoutAndRedirect(){
  localStorage.removeItem('emskk_username');
  setTimeout(function(){
    window.location.href = 'login.html';
  }, 1500);
}

let draftNewUsername = null;
let draftCurrentPassword = null;

document.getElementById('wantUsernameBtn').addEventListener('click', function(){
  showView('usernameStep1View');
});
document.getElementById('wantPasswordBtn').addEventListener('click', function(){
  showView('passwordStep1View');
});
document.getElementById('backToPortalBtn').addEventListener('click', function(){
  window.location.href = 'index.html';
});
document.getElementById('backFromUsernameStep1Btn').addEventListener('click', function(){
  resetAllForms();
  showView('choiceView');
});
document.getElementById('backFromUsernameStep2Btn').addEventListener('click', function(){
  showView('usernameStep1View');
});
document.getElementById('backFromPasswordStep1Btn').addEventListener('click', function(){
  resetAllForms();
  showView('choiceView');
});
document.getElementById('backFromPasswordStep2Btn').addEventListener('click', function(){
  showView('passwordStep1View');
});

document.getElementById('usernameStep1Form').addEventListener('submit', function(e){
  e.preventDefault();
  const newUsername = document.getElementById('newUsernameInput').value.trim();
  if (!newUsername) {
    showStatus('usernameStep1Status', 'error', 'Username baru wajib diisi.');
    return;
  }
  hideStatus('usernameStep1Status');
  draftNewUsername = newUsername;
  showView('usernameStep2View');
});

document.getElementById('usernameStep2Form').addEventListener('submit', async function(e){
  e.preventDefault();

  const currentUsername = localStorage.getItem('emskk_username');
  const currentPassword = document.getElementById('usernamePasswordInput').value.trim();

  if (!currentUsername) {
    showStatus('usernameStep2Status', 'error', 'Sesi tidak ditemukan, silakan login ulang.');
    return;
  }
  if (!currentPassword) {
    showStatus('usernameStep2Status', 'error', 'Password saat ini wajib diisi.');
    return;
  }

  hideStatus('usernameStep2Status');
  setBtnLoading('usernameStep2Btn', true);

  try {
    const res = await fetch(SCRIPT_URL + "?action=updateCredentials"
      + "&currentUsername=" + encodeURIComponent(currentUsername)
      + "&currentPassword=" + encodeURIComponent(currentPassword)
      + "&newUsername=" + encodeURIComponent(draftNewUsername));
    const result = await res.json();

    if (result.success) {
      showStatus('usernameStep2Status', 'success', 'Username berhasil diperbarui. Silakan login ulang...');
      setBtnLoading('usernameStep2Btn', false, '<i data-lucide="check"></i> Simpan');
      forceLogoutAndRedirect();
    } else {
      showStatus('usernameStep2Status', 'error', result.message || 'Terjadi kesalahan.');
      setBtnLoading('usernameStep2Btn', false, '<i data-lucide="check"></i> Simpan');
    }
  } catch (err) {
    showStatus('usernameStep2Status', 'error', 'Gagal menghubungi server: ' + err.message);
    setBtnLoading('usernameStep2Btn', false, '<i data-lucide="check"></i> Simpan');
  }
});

document.getElementById('passwordStep1Form').addEventListener('submit', function(e){
  e.preventDefault();
  const currentPassword = document.getElementById('currentPasswordInput').value.trim();
  if (!currentPassword) {
    showStatus('passwordStep1Status', 'error', 'Password saat ini wajib diisi.');
    return;
  }
  hideStatus('passwordStep1Status');
  draftCurrentPassword = currentPassword;
  showView('passwordStep2View');
});

function checkPasswordMatch(){
  const newPassword = document.getElementById('newPasswordInput').value;
  const confirmPassword = document.getElementById('confirmPasswordInput').value;
  const hint = document.getElementById('matchHint');

  if (!confirmPassword) {
    hint.className = 'match-hint';
    hint.textContent = '';
    return;
  }
  if (newPassword === confirmPassword) {
    hint.className = 'match-hint show match';
    hint.textContent = 'Password sama.';
  } else {
    hint.className = 'match-hint show mismatch';
    hint.textContent = 'Password berbeda.';
  }
}
document.getElementById('newPasswordInput').addEventListener('input', checkPasswordMatch);
document.getElementById('confirmPasswordInput').addEventListener('input', checkPasswordMatch);

document.getElementById('passwordStep2Form').addEventListener('submit', async function(e){
  e.preventDefault();

  const currentUsername = localStorage.getItem('emskk_username');
  const newPassword = document.getElementById('newPasswordInput').value.trim();
  const confirmPassword = document.getElementById('confirmPasswordInput').value.trim();

  if (!currentUsername) {
    showStatus('passwordStep2Status', 'error', 'Sesi tidak ditemukan, silakan login ulang.');
    return;
  }
  if (!newPassword) {
    showStatus('passwordStep2Status', 'error', 'Password baru wajib diisi.');
    return;
  }
  if (newPassword !== confirmPassword) {
    showStatus('passwordStep2Status', 'error', 'Ketik ulang password baru tidak cocok.');
    return;
  }

  hideStatus('passwordStep2Status');
  setBtnLoading('passwordStep2Btn', true);

  try {
    const res = await fetch(SCRIPT_URL + "?action=updateCredentials"
      + "&currentUsername=" + encodeURIComponent(currentUsername)
      + "&currentPassword=" + encodeURIComponent(draftCurrentPassword)
      + "&newPassword=" + encodeURIComponent(newPassword));
    const result = await res.json();

    if (result.success) {
      showStatus('passwordStep2Status', 'success', 'Password berhasil diperbarui. Silakan login ulang...');
      setBtnLoading('passwordStep2Btn', false, '<i data-lucide="check"></i> Simpan');
      forceLogoutAndRedirect();
    } else {
      showStatus('passwordStep2Status', 'error', result.message || 'Terjadi kesalahan.');
      setBtnLoading('passwordStep2Btn', false, '<i data-lucide="check"></i> Simpan');
    }
  } catch (err) {
    showStatus('passwordStep2Status', 'error', 'Gagal menghubungi server: ' + err.message);
    setBtnLoading('passwordStep2Btn', false, '<i data-lucide="check"></i> Simpan');
  }
});
