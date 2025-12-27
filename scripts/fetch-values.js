const fs = require('fs');
const { execSync } = require('child_process');
const TARGET = 'https://www.silber-kraft.de/versilbertes-besteck';

function parseEuro(str) {
  return str.replace(/\./g, ',') + ' €';
}

function extractValues(html) {
  const text = html.replace(/\s+/g, ' ');
  const lines = text.split(/\s{2,}|\/|\.|\n/).map(s => s.trim()).filter(Boolean);
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

  if ((!besteck || !messer)) {
    const all = [...text.matchAll(/(\d{1,3}(?:[.,]\d{3})?[.,]\d{2})\s*€/g)].map(m => m[1]);
    if (!besteck && all[0]) besteck = parseEuro(all[0]);
    if (!messer && all[1]) messer = parseEuro(all[1]);
  }

  return { besteck, messer };
}

async function run() {
  console.log('Fetching target page...');
  const res = await fetch(TARGET, { headers: { 'User-Agent': 'versilbertes-besteck-fetch/1.0' } });
  if (!res.ok) {
    console.error('Fetch failed', res.status);
    process.exit(1);
  }
  const html = await res.text();
  const data = extractValues(html);
  if (!data.besteck && !data.messer) {
    console.error('No values found');
    process.exit(1);
  }

  const out = {
    besteck: data.besteck || null,
    messer: data.messer || null,
    updated: new Date().toISOString(),
  };

  const path = 'values.json';
  let old = null;
  if (fs.existsSync(path)) {
    try { old = JSON.parse(fs.readFileSync(path, 'utf8')); } catch (e) { old = null; }
  }

  if (old && old.besteck === out.besteck && old.messer === out.messer) {
    console.log('No change in values, nothing to commit.');
    return;
  }

  fs.writeFileSync(path, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log('Wrote values.json:', out);

  try {
    execSync('git config user.email "actions@github.com"');
    execSync('git config user.name "GitHub Actions"');
    execSync('git add values.json');
    execSync('git commit -m "Update values.json (automated)"');
    execSync('git push');
    console.log('Committed and pushed changes.');
  } catch (err) {
    console.error('Git commit/push failed:', err.message);
    process.exit(1);
  }
}

run().catch(err => { console.error(err); process.exit(1); });