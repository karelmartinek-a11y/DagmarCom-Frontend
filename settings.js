const apiBase = '';
let authHeader = '';

function getAuth() {
  const pass = document.getElementById('password').value || '+Sin8glov8';
  authHeader = 'Basic ' + btoa(`admin:${pass}`);
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
  return resp.json();
}

async function loadSettings() {
  try {
    getAuth();
    document.getElementById('loginStatus').textContent = 'Nacitam...';
    const data = await fetchJson('/api/settings');
    document.getElementById('loginStatus').textContent = 'OK';
    Object.entries(data).forEach(([key, value]) => {
      const el = document.getElementById(key);
      if (!el) return;
      if (el.type === 'checkbox') {
        el.checked = Boolean(value);
      } else {
        el.value = value || '';
      }
    });
  } catch (e) {
    document.getElementById('loginStatus').textContent = 'Chyba: ' + e.message;
  }
}

async function saveSettings() {
  try {
    const payload = {};
    ['autoEnabled', 'instructions', 'role', 'context', 'inputSuffix', 'outputPrefixFirst', 'outputPrefixNext', 'outputPrefixAlways', 'openaiApiKey', 'openaiModel'].forEach(
      (id) => {
        const el = document.getElementById(id);
        if (!el) return;
        payload[id] = el.type === 'checkbox' ? el.checked : el.value;
      }
    );
    document.getElementById('saveStatus').textContent = 'Ukladam...';
    await fetchJson('/api/settings', { method: 'POST', body: JSON.stringify(payload) });
    document.getElementById('saveStatus').textContent = 'Ulozeno';
  } catch (e) {
    document.getElementById('saveStatus').textContent = 'Chyba: ' + e.message;
  }
}

async function loadLogs() {
  try {
    getAuth();
    const phone = document.getElementById('filterPhone').value;
    const text = document.getElementById('filterText').value;
    const params = new URLSearchParams();
    if (phone) params.append('phone', phone);
    if (text) params.append('q', text);
    const data = await fetchJson('/api/logs?' + params.toString());
    const formatted = data
      .map((row) => `${new Date(row.created_at).toISOString()} ${row.direction} ${row.phone}: ${row.payload}`)
      .join('\n');
    document.getElementById('logOutput').textContent = formatted || '(zadne zaznamy)';
  } catch (e) {
    document.getElementById('logOutput').textContent = 'Chyba: ' + e.message;
  }
}

document.getElementById('loadSettings').addEventListener('click', loadSettings);
document.getElementById('saveBtn').addEventListener('click', saveSettings);
document.getElementById('loadLogs').addEventListener('click', loadLogs);
