const apiBase = '';
let authHeader = '';

function setStatus(msg) {
  document.getElementById('statusInfo').textContent = msg;
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
    headers: { Authorization: authHeader, ...(options.headers || {}) },
  });
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  if (resp.status === 204) return {};
  return resp.json();
}

function lamp(id, on) {
  const el = document.getElementById(id);
  el.classList.remove('ok', 'warn', 'err');
  el.classList.add(on ? 'ok' : 'err');
}

function lampWarn(id) {
  const el = document.getElementById(id);
  el.classList.remove('ok', 'err');
  el.classList.add('warn');
}

function renderLogs(data) {
  const fmt = (row) => `${new Date(row.created_at).toISOString()} ${row.direction} ${row.phone || '-'}: ${row.payload}`;
  document.getElementById('lastIn').textContent = data.lastInbound ? fmt(data.lastInbound) : '(není)';
  document.getElementById('lastOut').textContent = data.lastOutbound ? fmt(data.lastOutbound) : '(není)';
  document.getElementById('lastOAReq').textContent = data.lastOpenAIRequest ? fmt(data.lastOpenAIRequest) : '(není)';
  document.getElementById('lastOARes').textContent = data.lastOpenAIResponse ? fmt(data.lastOpenAIResponse) : '(není)';

  const human = extractHumanReadable(data);
  document.getElementById('lastTextIn').textContent = human.in || '(není)';
  document.getElementById('lastTextOut').textContent = human.out || '(není)';
  document.getElementById('lastTextOAIn').textContent = human.oaIn || '(není)';
  document.getElementById('lastTextOAOut').textContent = human.oaOut || '(není)';
}

function renderActivity(data) {
  const box = document.getElementById('activityLog');
  if (!box) return;
  const rows = (data.recentActivity || []).map((r) => {
    const ts = new Date(r.created_at).toLocaleTimeString('cs-CZ');
    return `${ts} ${r.direction.padEnd(10)} ${(r.phone || '-').padEnd(12)} ${String(r.payload).slice(0, 160)}`;
  });
  box.textContent = rows.join('\n') || '(žádné čerstvé záznamy)';
}

function renderAlerts(metrics = {}) {
  const cert = metrics.cert_days || {};
  const rows = [];
  const add = (label, val, warn, details = '') => rows.push({ label, val, warn, details });
  const diskFree = metrics.disk_free_mb ?? 'n/a';
  const diskUsed = metrics.disk_used_pct ?? 'n/a';
  add('Disk free', `${diskFree} MB (used ${diskUsed})`, typeof diskFree === 'number' && diskFree < 2048);
  add('DAGMAR DB', `${metrics.dagmar_db_mb ?? 'n/a'} MB`, false);
  add('HOTEL DB', `${metrics.hotel_db_mb ?? 'n/a'} MB`, false);
  const media = metrics.hotel_media_mb ?? 'n/a';
  add('HOTEL media', `${media} MB`, typeof media === 'number' && media > 5120);
  const apiCert = cert.api ?? 'n/a';
  const dagmarCert = cert.dagmar ?? 'n/a';
  const hotelCert = cert.hotel ?? 'n/a';
  add('Cert api.hcasc.cz', `${apiCert} d`, typeof apiCert === 'number' && apiCert < 14);
  add('Cert dagmar.hcasc.cz', `${dagmarCert} d`, typeof dagmarCert === 'number' && dagmarCert < 14);
  add('Cert hotel.hcasc.cz', `${hotelCert} d`, typeof hotelCert === 'number' && hotelCert < 14);

  const tbody = document.querySelector('#alerts tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  rows.forEach((r) => {
    const tr = document.createElement('tr');
    tr.className = r.warn ? 'warn' : 'ok';
    tr.innerHTML = `<td>${r.label}</td><td class="code">${r.val}</td><td class="code">${r.details}</td>`;
    tbody.appendChild(tr);
  });
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractWhatsAppText(payload) {
  if (!payload) return '';
  const json = safeJson(payload);
  if (json?.messages?.[0]?.text?.body) return json.messages[0].text.body;
  if (json?.text?.body) return json.text.body;
  if (typeof payload === 'string') {
    const m = payload.match(/\"body\":\"([^\"]+)\"/);
    if (m) return m[1];
  }
  return payload.slice(0, 500);
}

function extractOpenAIInput(payload) {
  const json = safeJson(payload);
  if (json?.input?.[1]?.content) return json.input[1].content;
  if (json?.input?.[0]?.content) return json.input[0].content;
  return payload ? String(payload).slice(0, 500) : '';
}

function extractOpenAIOutput(payload) {
  const json = safeJson(payload);
  if (json?.output?.[0]?.content?.[0]?.text) return json.output[0].content[0].text;
  if (json?.output?.[0]?.content) return JSON.stringify(json.output[0].content);
  return payload ? String(payload).slice(0, 500) : '';
}

function extractHumanReadable(data) {
  return {
    in: extractWhatsAppText(data.lastInbound?.payload),
    out: extractWhatsAppText(data.lastOutbound?.payload),
    oaIn: extractOpenAIInput(data.lastOpenAIRequest?.payload),
    oaOut: extractOpenAIOutput(data.lastOpenAIResponse?.payload),
  };
}

async function loadStatus() {
  try {
    getAuth();
    setStatus('Načítám...');
    const data = await fetchJson('/api/status');
    lamp('lampApiKey', data.apiKeySet);
    lamp('lampWhatsApp', data.whatsappSet);
    if (!data.emailHealthy) lamp('lampEmail', false);
    else if ((data.emailActivity24h || 0) === 0) lampWarn('lampEmail');
    else lamp('lampEmail', true);
    lamp('lampResetEmail', data.resetEmailReady);
    lamp('lampDB', data.dbOk);
    lamp('lampSystem', true);
    const now = Date.now();
    const cutoff = 30 * 60 * 1000; // 30 minut
    const freshErrors = (data.recentErrors || []).filter((r) => now - (r.created_at || 0) <= cutoff);
    const freshEmailErr = data.lastEmailError && now - (data.lastEmailError.created_at || 0) <= cutoff;
    lamp('lampErrors', freshErrors.length === 0 && !freshEmailErr);
    renderLogs(data);
    renderAlerts(data.metrics || {});
    renderActivity(data);
    setStatus('OK');
    showApp();
  } catch (e) {
    setStatus('Chyba: ' + e.message);
    hideApp();
    sendAlertWhatsapp(e.message);
  }
}

async function sendAlertWhatsapp(errText) {
  try {
    await fetch('/api/status/alert/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: errText, note: 'Status UI selhalo' }),
    });
  } catch (_) {
    // swallow
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

async function testWA() {
  try {
    getAuth();
    document.getElementById('testOutput').textContent = 'Testuji WhatsApp...';
    const data = await fetchJson('/api/status/test/whatsapp', { method: 'POST' });
    document.getElementById('testOutput').textContent = JSON.stringify(data, null, 2);
  } catch (e) {
    document.getElementById('testOutput').textContent = 'WA chyba: ' + e.message;
  }
}

async function testOA() {
  try {
    getAuth();
    document.getElementById('testOutput').textContent = 'Testuji OpenAI...';
    const data = await fetchJson('/api/status/test/openai', { method: 'POST' });
    document.getElementById('testOutput').textContent = JSON.stringify(data, null, 2);
  } catch (e) {
    document.getElementById('testOutput').textContent = 'OpenAI chyba: ' + e.message;
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
      headers: { 'Content-Type': 'application/json' },
    });
    document.getElementById('sendWAResult').textContent = JSON.stringify(data, null, 2);
  } catch (e) {
    document.getElementById('sendWAResult').textContent = 'Chyba: ' + e.message;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  restoreAuth();
  prefillToken();
  document.getElementById('loadStatus').addEventListener('click', loadStatus);
  document.getElementById('resetBtn').addEventListener('click', requestReset);
  document.getElementById('applyResetBtn').addEventListener('click', applyReset);
  document.getElementById('testWA').addEventListener('click', testWA);
  document.getElementById('testOA').addEventListener('click', testOA);
  document.getElementById('sendWA').addEventListener('click', sendWA);
  document.getElementById('exitBtn').addEventListener('click', () => window.close());
  document.getElementById('password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      loadStatus();
    }
  });
});
