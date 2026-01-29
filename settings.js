const apiBase = '';
let authHeader = '';
let apiKeyVisible = false;

function setStatus(text) {
  document.getElementById('status').textContent = text;
}

function showApp() {
  document.getElementById('appContent').classList.remove('hidden');
  document.getElementById('loginPanel').classList.add('hidden');
}

function hideApp() {
  document.getElementById('appContent').classList.add('hidden');
  document.getElementById('loginPanel').classList.remove('hidden');
}

function getAuth() {
  const user = document.getElementById('username').value.trim() || 'provoz@hotelchodovasc.cz';
  const pass = document.getElementById('password').value.trim();
  if (!pass) throw new Error('Zadejte heslo');
  authHeader = 'Basic ' + btoa(`${user}:${pass}`);
  sessionStorage.setItem('dc_auth', authHeader);
}

function restoreAuth() {
  const stored = sessionStorage.getItem('dc_auth');
  if (stored) authHeader = stored;
}

async function fetchJson(path, options = {}) {
  const resp = await fetch(apiBase + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
      ...(options.headers || {}),
    },
  });
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  if (resp.status === 204) return {};
  return resp.json();
}

const fields = [
  'autoEnabled',
  'emailAutoEnabled',
  'emailSendMode',
  'instructionsFirst',
  'instructionsNext',
  'instructionsAlways',
  'roleFirst',
  'roleNext',
  'roleAlways',
  'contextFirst',
  'contextNext',
  'contextAlways',
  'inputSuffixFirst',
  'inputSuffixNext',
  'inputSuffixAlways',
  'outputPrefixFirst',
  'outputPrefixNext',
  'outputPrefixAlways',
  'openaiApiKey',
  'openaiModel',
  'imapHost',
  'imapPort',
  'imapUser',
  'imapPass',
  'imapInbox',
  'imapSpam',
  'imapDrafts',
  'imapSent',
  'smtpHost',
  'smtpPort',
  'smtpUser',
  'smtpPass',
  'pop3Host',
  'pop3Port',
  'pop3User',
  'pop3Pass',
  'pop3UseSsl',
];

async function loadSettings() {
  try {
    getAuth();
    setStatus('Načítám...');
    const data = await fetchJson('/api/settings');
    fields.forEach((f) => {
      const el = document.getElementById(f);
      if (!el) return;
      if (el.type === 'checkbox') {
        el.checked = Boolean(data[f]);
      } else if (el.tagName === 'SELECT') {
        const val = data[f] || '';
        if (!el.options.length && val) {
          el.add(new Option(val, val));
        }
        el.value = val;
      } else {
        el.value = data[f] || '';
      }
    });
    const mode = data.emailSendMode || 'draft';
    document.querySelectorAll('input[name="emailSendMode"]').forEach((r) => (r.checked = r.value === mode));
    setStatus('OK');
    showApp();
  } catch (e) {
    setStatus('Chyba: ' + e.message);
    hideApp();
  }
}

async function saveSettings() {
  try {
    getAuth();
    setStatus('Ukládám...');
    const payload = {};
    fields.forEach((f) => {
      const el = document.getElementById(f);
      if (!el) return;
      if (el.type === 'checkbox') payload[f] = el.checked;
      else payload[f] = el.value;
    });
    const mode = document.querySelector('input[name=\"emailSendMode\"]:checked');
    if (mode) payload.emailSendMode = mode.value;
    await fetchJson('/api/settings', { method: 'POST', body: JSON.stringify(payload) });
    setStatus('Uloženo');
  } catch (e) {
    setStatus('Chyba: ' + e.message);
  }
}

async function saveSingle(fieldId) {
  try {
    getAuth();
    const el = document.getElementById(fieldId);
    if (!el) return;
    const payload = {};
    payload[fieldId] = el.type === 'checkbox' ? el.checked : el.value;
    const mode = document.querySelector('input[name="emailSendMode"]:checked');
    if (mode) payload.emailSendMode = mode.value;
    await fetchJson('/api/settings', { method: 'POST', body: JSON.stringify(payload) });
    flashSaved(el);
  } catch (e) {
    setStatus('Auto-save chyba: ' + e.message);
  }
}

function flashSaved(el) {
  el.classList.add('save-flash');
  setTimeout(() => el.classList.remove('save-flash'), 600);
}

async function toggleApiKeyVisibility() {
  const field = document.getElementById('openaiApiKey');
  try {
    getAuth();
    const data = await fetchJson('/api/settings');
    field.value = data.openaiApiKey || '';
  } catch (e) {
    setStatus('Chyba API key: ' + e.message);
  }
  apiKeyVisible = !apiKeyVisible;
  field.type = apiKeyVisible ? 'text' : 'password';
  document.getElementById('toggleApiKey').textContent = apiKeyVisible ? 'Skrýt' : 'Zobrazit uložený klíč';
}

async function saveKeyOnly() {
  try {
    getAuth();
    setStatus('Ukládám API key...');
    await fetchJson('/api/settings', {
      method: 'POST',
      body: JSON.stringify({ openaiApiKey: document.getElementById('openaiApiKey').value }),
    });
    setStatus('API key uložen');
  } catch (e) {
    setStatus('Chyba: ' + e.message);
  }
}

async function loadModels() {
  const key = document.getElementById('openaiApiKey').value.trim();
  if (!key) {
    document.getElementById('openaiStatus').textContent = 'Zadejte API key';
    return;
  }
  document.getElementById('openaiStatus').textContent = 'Načítám modely...';
  try {
    const resp = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: 'Bearer ' + key },
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    const models = (data.data || []).map((m) => m.id).filter((id) => id.startsWith('gpt'));
    const select = document.getElementById('modelSelect');
    select.innerHTML = '';
    models.forEach((id) => select.add(new Option(id, id)));
    if (models.length) {
      select.value = models[0];
      document.getElementById('openaiModel').value = models[0];
    }
    document.getElementById('openaiStatus').textContent = 'Modely načteny';
  } catch (e) {
    document.getElementById('openaiStatus').textContent = 'Chyba: ' + e.message;
  }
}

function onModelSelectChange() {
  const val = document.getElementById('modelSelect').value;
  if (val) document.getElementById('openaiModel').value = val;
}

async function testOpenAI() {
  try {
    getAuth();
    document.getElementById('openaiStatus').textContent = 'Testuji...';
    const data = await fetchJson('/api/status/test/openai', { method: 'POST' });
    document.getElementById('openaiStatus').textContent = 'OK: ' + (data.preview || '');
  } catch (e) {
    document.getElementById('openaiStatus').textContent = 'Chyba: ' + e.message;
  }
}

async function loadFolders() {
  try {
    getAuth();
    setStatus('Načítám složky...');
    const data = await fetchJson('/api/email/folders');
    const boxes = data.boxes || [];
    const selects = ['imapInbox', 'imapSpam', 'imapDrafts', 'imapSent'].map((id) => document.getElementById(id));
    selects.forEach((sel) => {
      if (!sel) return;
      const current = sel.value;
      sel.innerHTML = '';
      boxes.forEach((b) => sel.add(new Option(b, b)));
      if (current && boxes.includes(current)) sel.value = current;
    });
    document.getElementById('emailStatus').textContent = `Načteno ${boxes.length} složek`;
    setStatus('Složky načteny');
  } catch (e) {
    const msg = 'Chyba složek: ' + e.message;
    setStatus(msg);
    const statusEl = document.getElementById('emailStatus');
    if (statusEl) statusEl.textContent = msg;
  }
}

async function testEmail() {
  try {
    getAuth();
    document.getElementById('emailStatus').textContent = 'Testuji IMAP/SMTP...';
    const data = await fetchJson('/api/email/test', { method: 'POST' });
    document.getElementById('emailStatus').textContent = JSON.stringify(data, null, 2);
  } catch (e) {
    document.getElementById('emailStatus').textContent = 'Chyba e-mail testu: ' + e.message;
  }
}

async function testResetEmail() {
  try {
    getAuth();
    const target =
      document.getElementById('resetTestEmail').value.trim() ||
      document.getElementById('smtpUser').value.trim() ||
      document.getElementById('username').value.trim();
    if (!target) throw new Error('Zadejte cílový e-mail');
    document.getElementById('emailStatus').textContent = 'Odesílám testovací reset e-mail...';
    const resp = await fetchJson('/api/email/test-reset', {
      method: 'POST',
      body: JSON.stringify({ user: target }),
    });
    document.getElementById('emailStatus').textContent = resp.message || 'Testovací reset e-mail odeslán.';
  } catch (e) {
    document.getElementById('emailStatus').textContent = 'Chyba reset e-mailu: ' + e.message;
  }
}

async function sendWA() {
  try {
    getAuth();
    const phone = document.getElementById('waPhone').value.trim();
    const text = document.getElementById('waText').value.trim();
    if (!phone || !text) throw new Error('Zadejte telefon i text');
    const data = await fetchJson('/api/status/test/whatsapp/send', {
      method: 'POST',
      body: JSON.stringify({ phone, text }),
    });
    document.getElementById('waResult').textContent = JSON.stringify(data, null, 2);
  } catch (e) {
    document.getElementById('waResult').textContent = 'Chyba: ' + e.message;
  }
}

async function loadLogs() {
  try {
    getAuth();
    const phone = document.getElementById('filterPhone').value.trim();
    const text = document.getElementById('filterText').value.trim();
    const params = new URLSearchParams();
    if (phone) params.append('phone', phone);
    if (text) params.append('q', text);
    const data = await fetchJson('/api/logs?' + params.toString());
    const lines = (data || [])
      .map((row) => `${new Date(row.created_at).toISOString()} ${row.direction} ${row.phone || '-'}: ${row.payload}`)
      .join('\n');
    document.getElementById('logOutput').textContent = lines || '(žádné záznamy)';
  } catch (e) {
    document.getElementById('logOutput').textContent = 'Chyba: ' + e.message;
  }
}

async function requestReset() {
  try {
    setStatus('Zasílám reset link...');
    const user = document.getElementById('username').value.trim() || 'provoz@hotelchodovasc.cz';
    const resp = await fetch('/api/status/reset-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user }),
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json().catch(() => ({}));
    setStatus(data.message || 'Reset link odeslán na e-mail. Zkontrolujte schránku.');
  } catch (e) {
    setStatus('Reset selhal, otevřu e-mailový klient.');
    const user = document.getElementById('username').value.trim() || 'provoz@hotelchodovasc.cz';
    window.location.href = `mailto:${user}?subject=Reset hesla DagmarCom&body=Prosím o reset hesla. Potřebuji nový link platný 1 hodinu.`;
  }
}

async function applyReset() {
  const token = document.getElementById('resetToken').value.trim();
  const newPassword = document.getElementById('newPassword').value.trim();
  const user = document.getElementById('username').value.trim() || 'provoz@hotelchodovasc.cz';
  if (!token || !newPassword) {
    setStatus('Zadejte token i nové heslo.');
    return;
  }
  try {
    setStatus('Nastavuji nové heslo...');
    const resp = await fetch('/api/status/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password: newPassword, user }),
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json().catch(() => ({}));
    setStatus(data.message || 'Heslo nastaveno. Přihlaste se novým heslem.');
    document.getElementById('password').value = newPassword;
    authHeader = 'Basic ' + btoa(`${user}:${newPassword}`);
    sessionStorage.setItem('dc_auth', authHeader);
  } catch (e) {
    setStatus('Reset hesla selhal: ' + e.message);
  }
}

function prefillToken() {
  const params = new URLSearchParams(window.location.search || '');
  const token = params.get('token');
  if (token) {
    document.getElementById('resetToken').value = token;
  }
}

function attachAutosave() {
  document.querySelectorAll('.autosave').forEach((el) => {
    el.addEventListener('blur', () => saveSingle(el.id));
  });
  document.querySelectorAll('.clear-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-clear');
      const target = document.getElementById(id);
      if (!target) return;
      target.value = '';
      saveSingle(id);
    });
  });
}

// Event binding
window.addEventListener('DOMContentLoaded', () => {
  restoreAuth();
  prefillToken();
  document.getElementById('loadSettings').addEventListener('click', loadSettings);
  document.getElementById('loginBtn').addEventListener('click', loadSettings);
  document.getElementById('resetBtn').addEventListener('click', requestReset);
  document.getElementById('applyResetBtn').addEventListener('click', applyReset);
  document.getElementById('loadFolders').addEventListener('click', loadFolders);
  document.getElementById('testEmail').addEventListener('click', testEmail);
  document.getElementById('testResetEmail').addEventListener('click', testResetEmail);
  document.getElementById('saveSettings').addEventListener('click', saveSettings);
  document.getElementById('toggleApiKey').addEventListener('click', toggleApiKeyVisibility);
  document.getElementById('saveKeyBtn').addEventListener('click', saveKeyOnly);
  document.getElementById('loadModels').addEventListener('click', loadModels);
  document.getElementById('modelSelect').addEventListener('change', onModelSelectChange);
  document.getElementById('testOpenAI').addEventListener('click', testOpenAI);
  document.getElementById('sendWA').addEventListener('click', sendWA);
  document.getElementById('loadLogs').addEventListener('click', loadLogs);
  attachAutosave();
  document.getElementById('password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      loadSettings();
    }
  });
});
