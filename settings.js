const apiBase = '';
let authHeader = '';
let apiKeyVisible = false;
let cachedModels = [];

function getAuth() {
  const pass = document.getElementById('password').value.trim();
  if (!pass) throw new Error('Zadejte heslo pro Basic Auth.');
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
    if (data.openaiModel) {
      updateModelSelectValue(data.openaiModel);
    }
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

function updateModelSelectValue(val) {
  const select = document.getElementById('modelSelect');
  if (!select) return;
  if (val) {
    const exists = Array.from(select.options).some((o) => o.value === val);
    if (!exists) {
      select.add(new Option(val, val), 0);
    }
    select.value = val;
  }
  const input = document.getElementById('openaiModel');
  if (input && val) input.value = val;
}

async function fetchModels() {
  const key = document.getElementById('openaiApiKey').value.trim();
  if (!key) {
    document.getElementById('saveStatus').textContent = 'Zadejte API klic pro nacteni modelu';
    return;
  }
  document.getElementById('saveStatus').textContent = 'Nacitam modely...';
  try {
    const resp = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: 'Bearer ' + key },
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    const models = (data.data || []).map((m) => m.id).filter((id) => id.startsWith('gpt'));
    cachedModels = models;
    const select = document.getElementById('modelSelect');
    select.innerHTML = '';
    models.forEach((id) => select.add(new Option(id, id)));
    if (models.length) updateModelSelectValue(models[0]);
    document.getElementById('saveStatus').textContent = 'Modely nacteny';
  } catch (e) {
    document.getElementById('saveStatus').textContent = 'Chyba pri nacitani modelu: ' + e.message;
  }
}

function onModelSelectChange() {
  const val = document.getElementById('modelSelect').value;
  updateModelSelectValue(val);
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

function toggleApiKeyVisibility() {
  const field = document.getElementById('openaiApiKey');
  apiKeyVisible = !apiKeyVisible;
  field.type = apiKeyVisible ? 'text' : 'password';
  document.getElementById('toggleApiKey').textContent = apiKeyVisible ? 'Skrýt' : 'Zobrazit';
}

async function deleteApiKey() {
  document.getElementById('openaiApiKey').value = '';
  document.getElementById('saveStatus').textContent = 'Mazani...';
  await saveSettings();
}

document.getElementById('loadSettings').addEventListener('click', loadSettings);
document.getElementById('saveBtn').addEventListener('click', saveSettings);
document.getElementById('loadLogs').addEventListener('click', loadLogs);
document.getElementById('toggleApiKey').addEventListener('click', toggleApiKeyVisibility);
document.getElementById('deleteApiKey').addEventListener('click', deleteApiKey);
document.getElementById('loadModels').addEventListener('click', fetchModels);
document.getElementById('modelSelect').addEventListener('change', onModelSelectChange);
document.getElementById('saveKeyBtn').addEventListener('click', saveSettings);
