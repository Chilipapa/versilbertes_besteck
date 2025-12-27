const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname)));

const TARGET = 'https://www.silber-kraft.de/versilbertes-besteck';
let cache = { ts: 0, data: null };
const TTL = 60 * 1000; // 60s

function parseEuro(str) {
  // Normalize 71,10 or 71.10 -> 71,10 €
  return str.replace('.', ',') + ' €';
}

function extractValues(html) {
  const $ = cheerio.load(html);
  const bodyText = $('body').text().replace(/\s+/g, ' ');

  // Try to find lines containing the markers
  const lines = bodyText.split(/\s{2,}|\/|\.|\n/).map(s => s.trim()).filter(Boolean);
  const euroRe = /(\d{1,3}(?:[.,]\d{3})?[.,]\d{2})\s*€/;
  let besteck = null;
  let messer = null;

  for (const line of lines) {
    const l = line.toLowerCase();
    if (!besteck && l.includes('versilbertes besteck')) {
      const m = line.match(euroRe);
      if (m) besteck = parseEuro(m[1]);
    }
    if (!messer && l.includes('versilbertes messer')) {
      const m = line.match(euroRe);
      if (m) messer = parseEuro(m[1]);
    }
    if (besteck && messer) break;
  }

  // Fallback: first two euro matches
  if (!besteck || !messer) {
    const all = [...bodyText.matchAll(euroRe)].map(m => m[1]);
    if (!besteck && all[0]) besteck = parseEuro(all[0]);
    if (!messer && all[1]) messer = parseEuro(all[1]);
  }

  return { besteck, messer };
}

app.get('/api/values', async (req, res) => {
  try {
    const now = Date.now();
    if (cache.data && (now - cache.ts < TTL)) {
      return res.json({ source: 'cache', ...cache.data });
    }

    const r = await axios.get(TARGET, { timeout: 10000, headers: { 'User-Agent': 'versilbertes-besteck-bot/1.0' } });
    const data = extractValues(r.data);
    cache = { ts: now, data };
    res.json({ source: 'live', ...data });
  } catch (err) {
    res.status(500).json({ error: err.message || 'fetch failed' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server läuft auf http://localhost:${port}`));