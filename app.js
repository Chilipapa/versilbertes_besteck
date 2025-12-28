// Client: Holt Live‑Daten bei Button‑Klick (direkter Fetch, bei Blockierung Proxy‑Fallback)

const TARGET = 'https://www.silber-kraft.de/versilbertes-besteck';
const PROXY = 'https://api.allorigins.win/raw?url='; // Demo-Proxy, nur für Tests

const besteckEl = document.getElementById('besteck');
const messerEl = document.getElementById('messer');
const statusEl = document.getElementById('status');
const refreshBtn = document.getElementById('refresh');

function extractValuesFromHtml(html) {
  const text = html.replace(/\s+/g, ' ');
  const lines = text.split(/(?<=\.)|(?<=\n)|(?<=\t)|(?<=\/)|(?<=€)/).map(s => s.trim()).filter(Boolean);
  const euroRe = /(\d{1,3}(?:[.,]\d{3})?[.,]\d{2})\s*€/; // non-global for single-line captures
  const euroReGlobal = /(\d{1,3}(?:[.,]\d{3})?[.,]\d{2})\s*€/g; // global for matchAll
  let besteck = null;
  let messer = null;

  for (const line of lines) {
    const l = line.toLowerCase();
    if (!besteck && l.includes('versilbertes besteck')) {
      const m = line.match(euroRe);
      if (m) besteck = m[1].replace(/\./g, ',') + ' €';
    }
    if (!messer && l.includes('versilbertes messer')) {
      const m = line.match(euroRe);
      if (m) messer = m[1].replace(/\./g, ',') + ' €';
    }
    if (besteck && messer) break;
  }

  if ((!besteck || !messer)) {
    // Use text.matchAll with a global regex to collect euro matches
    const all = [...text.matchAll(euroReGlobal)].map(m => m[1]);
    if (!besteck && all[0]) besteck = all[0].replace(/\./g, ',') + ' €';
    if (!messer && all[1]) messer = all[1].replace(/\./g, ',') + ' €';
  }

  return { besteck, messer };
}

async function fetchProxyPage() {
  const res = await fetch(PROXY + encodeURIComponent(TARGET));
  if (!res.ok) throw new Error('Proxy HTTP ' + res.status);
  return res.text();
}

async function fetchTargetPage() {
  // Try direct fetch to the target site (may be blocked by CORS in some browsers)
  const res = await fetch(TARGET);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.text();
}

async function fetchAndUpdate() {
  statusEl.textContent = 'Lade…';

  // 1) Direkter Fetch vom Ziel (Live) versuchen
  try {
    const html = await fetchTargetPage();
    const { besteck, messer } = extractValuesFromHtml(html);
    if (besteck || messer) {
      besteckEl.textContent = besteck || 'nicht gefunden';
      messerEl.textContent = messer || 'nicht gefunden';
      statusEl.textContent = `Letzte Prüfung: ${new Date().toLocaleTimeString()} (Live)`;
      const updatedEl = document.getElementById('updated');
      if (updatedEl) updatedEl.textContent = '';
      return;
    }
    statusEl.textContent = 'Live: Werte nicht gefunden, versuche Proxy‑Fallback...';
  } catch (err) {
    // If the error is a TypeError (e.g. 'Failed to fetch') it often indicates
    // a CORS or network issue in the browser. Provide a helpful hint.
    const msg = (err && err.message) ? err.message : String(err);
    const looksLikeNetwork = err instanceof TypeError || /Failed to fetch|NetworkError/i.test(msg);
    if (looksLikeNetwork) {
      statusEl.textContent = 'Direkter Fetch fehlgeschlagen (möglicherweise CORS oder Netzwerk). Versuche Proxy‑Fallback...';
    } else {
      statusEl.textContent = 'Direkter Fetch fehlgeschlagen: ' + msg + ' — versuche Proxy‑Fallback...';
    }
  }

  // Proxy-Fallback
  try {
    const html = await fetchProxyPage();
    const { besteck, messer } = extractValuesFromHtml(html);
    besteckEl.textContent = besteck || 'nicht gefunden';
    messerEl.textContent = messer || 'nicht gefunden';
    statusEl.textContent = `Letzte Prüfung: ${new Date().toLocaleTimeString()} (Proxy)`;
  } catch (err) {
    const msg = (err && err.message) ? err.message : String(err);
    statusEl.textContent = 'Proxy‑Fallback fehlgeschlagen: ' + msg + ' (kein Erfolg)';
    besteckEl.textContent = '—';
    messerEl.textContent = '—';
  }
}

const fetchBtn = document.getElementById('fetchNow') || refreshBtn;
fetchBtn.addEventListener('click', fetchAndUpdate);

// Hinweis: Kein automatischer Abruf beim Laden — die Daten werden nur bei Klick geholt.
