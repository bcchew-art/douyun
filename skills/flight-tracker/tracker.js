// ☁️ Dou Yun — Flight Price Tracker
// Tracks SIA prices on Google Flights daily and reports changes.
// Uses puppeteer-core with the system Chrome on Windows — no extra download.

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

// ─── BASELINE (16 Feb 2026 — when tracking started) ─────────────────────────

const BASELINE = {
  date: '2026-02-16',
  'Combo 1': { sia: 848 },
  'Combo 2': { sia: 848 },
};

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const FLIGHTS = [
  {
    label: 'Combo 1',
    outbound: 'SQ828 · SIN 07:20 → PVG 12:45',
    inbound:  'SQ833 · PVG 16:25 → SIN 22:15',
    url: 'https://www.google.com/travel/flights/booking?tfs=CBwQAhpNEgoyMDI2LTEyLTEwIh8KA1NJThIKMjAyNi0xMi0xMBoDUFZHKgJTUTIDODI4MgJTUWoMCAISCC9tLzA2dDJ0cgwIAxIIL20vMDZ3amYaTRIKMjAyNi0xMi0xOSIfCgNQVkcSCjIwMjYtMTItMTkaA1NJTioCU1EyAzgzMzICU1FqDAgDEggvbS8wNndqZnIMCAISCC9tLzA2dDJ0QAFIAXABggELCP___________wGYAQE&tfu=CmxDalJJYVVRMU0ySXpibE5vV0hkQlNYUWtOMUZDUnkwdExTMHRMUzB0TFhOdFltWjVOVUZCUVVGQlIyMXpOakZ2Um1KaGNtbEJFZ1ZUVVRnek14b0xDTGFXQlJBQ0dnTlRSMFE0SEhEV2h3UT0SAggAIgA&hl=en&gl=SG'
  },
  {
    label: 'Combo 2',
    outbound: 'SQ830 · SIN 09:20 → PVG 14:35',
    inbound:  'SQ833 · PVG 16:25 → SIN 22:15',
    url: 'https://www.google.com/travel/flights/booking?tfs=CBwQAhpNEgoyMDI2LTEyLTEwIh8KA1NJThIKMjAyNi0xMi0xMBoDUFZHKgJTUTIDODMwMgJTUWoMCAISCC9tLzA2dDJ0cgwIAxIIL20vMDZ3amYaTRIKMjAyNi0xMi0xOSIfCgNQVkcSCjIwMjYtMTItMTkaA1NJTioCU1EyAzgzMzICU1FqDAgDEggvbS8wNndqZnIMCAISCC9tLzA2dDJ0QAFIAXABggELCP___________wGYAQE&tfu=CmxDalJJVkVWQ1RFWlBlakpmU0dOQlIxcFBjR2RDUnkwdExTMHRMUzB0TFhObFkzUnhPRUZCUVVGQlIyMXpOMUJKVDFWV1ZYbEJFZ1ZUVVJnek14b0xDTGFXQlJBQ0dnTlRSMFE0SEhEV2h3UT0SAggAIgA&hl=en&gl=SG'
  }
];

const DATA_FILE = path.join(__dirname, 'data', 'prices.json');

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Users\\Admin\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function findChrome() {
  for (const p of CHROME_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Chrome not found. Checked:\n' + CHROME_PATHS.join('\n'));
}

function formatDiff(curr, prev) {
  if (!prev || !curr) return '';
  const d = curr - prev;
  if (d > 0) return ` ▲ +${d}`;
  if (d < 0) return ` ▼ ${d}`;
  return ' → same';
}

// ─── SCRAPER ─────────────────────────────────────────────────────────────────

async function extractSIAPrice(page, flight) {
  await page.goto(flight.url, { waitUntil: 'networkidle2', timeout: 60000 });

  try {
    await page.waitForFunction(
      () => document.body.innerText.includes('Book with Singapore Airlines'),
      { timeout: 30000 }
    );
  } catch (e) {
    console.error(`[${flight.label}] Timed out waiting for SIA price`);
  }

  const text = await page.evaluate(() =>
    document.querySelector('main')?.innerText || document.body.innerText
  );

  const siaBlock = text.match(/Book with Singapore Airlines[^\n]*\nSGD\s*([\d,]+)/);
  const sia = siaBlock ? parseInt(siaBlock[1].replace(/,/g, '')) : null;

  if (!sia) {
    console.error(`[${flight.label}] Could not find SIA price. Snippet:\n`, text.substring(0, 800));
  }

  return sia;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  let history = {};
  if (fs.existsSync(DATA_FILE)) {
    try { history = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) {}
  }

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' });
  const prevDates = Object.keys(history).sort();
  const prevDate = prevDates[prevDates.length - 1];
  const prev = prevDate ? history[prevDate] : null;

  const executablePath = findChrome();
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=en-US,en'],
  });

  const results = [];

  for (const flight of FLIGHTS) {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
    try {
      const sia = await extractSIAPrice(page, flight);
      results.push({ ...flight, sia });
    } catch (err) {
      console.error(`[${flight.label}] Error:`, err.message);
      results.push({ ...flight, sia: null });
    } finally {
      await page.close();
    }
  }

  await browser.close();

  // Save today
  history[today] = {};
  results.forEach(r => { history[today][r.label] = { sia: r.sia }; });
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(history, null, 2));

  // ─── FORMAT MESSAGE ───────────────────────────────────────────────────────

  const dateStr = new Date().toLocaleDateString('en-SG', {
    timeZone: 'Asia/Singapore', day: 'numeric', month: 'short', year: 'numeric'
  });

  let msg = `✈️ *Flight Price Update — ${dateStr}*\n`;

  const summaryLines = [];

  for (const r of results) {
    const prevSIA      = prev?.[r.label]?.sia;
    const baselineSIA  = BASELINE[r.label].sia;
    const diff         = formatDiff(r.sia, prevSIA);
    const vsBaseline   = r.sia != null ? r.sia - baselineSIA : null;
    const vsBaselineStr = vsBaseline !== null
      ? (vsBaseline > 0 ? ` (+${vsBaseline} vs Feb)` : vsBaseline < 0 ? ` (${vsBaseline} vs Feb)` : ` (back to Feb 🎉)`)
      : '';

    msg += `\n*${r.label}*\n`;
    msg += `• ${r.outbound}\n`;
    msg += `• ${r.inbound}\n`;
    msg += `• SIA: ${r.sia ? `SGD ${r.sia}` : 'n/a'}${diff}${vsBaselineStr}\n`;

    if (r.sia != null) {
      const trend = prevSIA
        ? (r.sia < prevSIA ? 'dropping' : r.sia > prevSIA ? 'rising' : 'unchanged')
        : null;
      const status = vsBaseline > 0
        ? `still SGD ${vsBaseline} above Feb baseline`
        : vsBaseline < 0
        ? `SGD ${Math.abs(vsBaseline)} below Feb baseline 🎉`
        : `back to Feb baseline 🎉`;
      if (trend) summaryLines.push(`${r.label}: ${trend} since last check, ${status}`);
    }
  }

  msg += `\n*Summary*\n`;
  msg += `• Feb baseline (SIA): SGD ${BASELINE['Combo 1'].sia}\n`;
  if (summaryLines.length > 0) {
    summaryLines.forEach(s => { msg += `• ${s}\n`; });
  }
  if (prev) msg += `\n_(prev check: ${prevDate})_`;

  console.log(msg);
  return msg;
}

main().catch(err => {
  console.error('Flight tracker failed:', err.message);
  process.exit(1);
});
