// Client: lädt bevorzugt `/values.json` (vom GitHub Action-Workflow erzeugt), fällt bei Fehlen auf Proxy zurück

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

async function fetchValuesJson() {
  const res = await fetch('/values.json');
  if (!res.ok) throw new Error(res.statusText || res.status);
  return res.json();
}

async function fetchProxyPage() {
  const res = await fetch(PROXY + encodeURIComponent(TARGET));
  if (!res.ok) throw new Error('Proxy HTTP ' + res.status);
  return res.text();
}

async function fetchAndUpdate() {
  statusEl.textContent = 'Lade…';

  // 1) values.json (GitHub Pages) versuchen
  try {
    const data = await fetchValuesJson();
    if (data && (data.besteck || data.messer)) {
      besteckEl.textContent = data.besteck || 'nicht gefunden';
      messerEl.textContent = data.messer || 'nicht gefunden';
      statusEl.textContent = `Letzte Prüfung: ${new Date().toLocaleTimeString()} (values.json)`;
      // show updated timestamp if present
      const updatedEl = document.getElementById('updated');
      if (data.updated && updatedEl) {
        const d = new Date(data.updated);
        updatedEl.textContent = `Letzte Aktualisierung (values.json): ${d.toLocaleString()}`;
      }
      return;
    }
    statusEl.textContent = 'values.json leer, versuche Fallback...';
  } catch (err) {
    statusEl.textContent = 'values.json nicht verfügbar, Fallback per Proxy...';
  }

  // 2) Proxy-Fallback
  try {
    const html = await fetchProxyPage();
    const { besteck, messer } = extractValuesFromHtml(html);
    besteckEl.textContent = besteck || 'nicht gefunden';
    messerEl.textContent = messer || 'nicht gefunden';
    statusEl.textContent = `Letzte Prüfung: ${new Date().toLocaleTimeString()} (Proxy)`;
  } catch (err) {
    statusEl.textContent = 'Fehler: ' + err.message + ' (kein values.json & Proxy fehlgeschlagen)';
    besteckEl.textContent = '—';
    messerEl.textContent = '—';
  }
}

refreshBtn.addEventListener('click', fetchAndUpdate);

// initial
fetchAndUpdate();
