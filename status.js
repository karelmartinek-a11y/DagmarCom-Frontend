const apiBase = '';
let authHeader = '';

function setLamp(id, state) {
  const el = document.getElementById(id);
  el.classList.remove('ok', 'warn', 'err');
  if (state === 'ok') el.classList.add('ok');
  else if (state === 'warn') el.classList.add('warn');
  else el.classList.add('err');
}

function getAuth() {
  const pass = document.getElementById('password').value.trim();
  if (!pass) throw new Error('Zadejte heslo.');
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

function fmt(obj) {
  if (!obj) return '(není)';
  return JSON.stringify(obj, null, 2);
}

async function loadStatus() {
  try {
    getAuth();
    document.getElementById('statusInfo').textContent = 'Nacitam...';
    const data = await fetchJson('/api/status');
    document.getElementById('statusInfo').textContent = 'OK';
    setLamp('lampApiKey', data.apiKeySet ? 'ok' : 'err');
    setLamp('lampWhatsApp', data.whatsappSet ? 'ok' : 'err');
    setLamp('lampDB', data.dbOk ? 'ok' : 'err');
    setLamp('lampSystem', 'ok');
    document.getElementById('lastIn').textContent = fmt(data.lastInbound);
    document.getElementById('lastOut').textContent = fmt(data.lastOutbound);
    document.getElementById('lastOAReq').textContent = fmt(data.lastOpenAIRequest);
    document.getElementById('lastOARes').textContent = fmt(data.lastOpenAIResponse);
  } catch (e) {
    document.getElementById('statusInfo').textContent = 'Chyba: ' + e.message;
  }
}

async function testWA() {
  try {
    getAuth();
    document.getElementById('testOutput').textContent = 'Testuji WhatsApp...';
    const data = await fetchJson('/api/status/test/whatsapp', { method: 'POST' });
    document.getElementById('testOutput').textContent = 'WA OK:\n' + fmt(data);
  } catch (e) {
    document.getElementById('testOutput').textContent = 'WA chyba: ' + e.message;
  }
}

async function testOA() {
  try {
    getAuth();
    document.getElementById('testOutput').textContent = 'Testuji OpenAI...';
    const data = await fetchJson('/api/status/test/openai', { method: 'POST' });
    document.getElementById('testOutput').textContent = 'OpenAI OK:\n' + fmt(data);
  } catch (e) {
    document.getElementById('testOutput').textContent = 'OpenAI chyba: ' + e.message;
  }
}

document.getElementById('loadStatus').addEventListener('click', loadStatus);
document.getElementById('testWA').addEventListener('click', testWA);
document.getElementById('testOA').addEventListener('click', testOA);
document.getElementById('exitBtn').addEventListener('click', () => window.close());
