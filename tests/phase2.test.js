const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const BASE = 'http://127.0.0.1:3314';
let server;

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(BASE + '/api/checks-catalog');
      if (r.ok) return;
    } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('Local server did not start');
}

test.before(async () => {
  server = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: '3314' },
    stdio: 'ignore'
  });
  await waitForServer();
});

test.after(() => server?.kill());

test('BUG 1 - quote applies the correct discount/GST arithmetic', async () => {
  await fetch(BASE + '/api/reset', { method: 'POST' });
  const r = await fetch(BASE + '/api/quote', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ checkIds: ['IDENTITY'], discountPercent: 50 })
  });
  const q = await r.json();
  assert.equal(q.subtotal, 299);
  assert.equal(q.discount, 149.50);
  assert.equal(q.gst, 26.91);
  assert.equal(q.total, 176.41);
});

test('BUG 2 - catalog response contains no internal vendorCost field', async () => {
  await fetch(BASE + '/api/reset', { method: 'POST' });
  const r = await fetch(BASE + '/api/checks-catalog');
  const catalog = await r.json();
  assert.ok(catalog.length > 0);
  for (const check of catalog) {
    assert.deepEqual(Object.keys(check).sort(), ['id', 'name', 'price']);
  }
});

test('BUG 3 - quote monetary values are formatted as INR with two decimals', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
  const app = fs.readFileSync(path.join(ROOT, 'public', 'app.js'), 'utf8');
  assert.match(html, /result-subtotal/);
  assert.match(html, /result-discount/);
  assert.match(html, /result-gst/);
  assert.match(html, /result-total/);
  assert.match(
    app,
    /₹|Intl\.NumberFormat|toFixed\(2\)/,
    'UI should format quote amounts as INR with two decimals'
  );
});

test('BUG 4 - invalid check IDs are rejected instead of silently omitted', async () => {
  await fetch(BASE + '/api/reset', { method: 'POST' });
  const r = await fetch(BASE + '/api/quote', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ checkIds: ['IDENTITY', 'FAKE'], discountPercent: 0 })
  });
  assert.equal(r.status, 400);
});

test('BUG 5 - non-array checkIds returns 400 Bad Request', async () => {
  const r = await fetch(BASE + '/api/quote', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ checkIds: 'IDENTITY', discountPercent: 0 })
  });
  assert.equal(r.status, 400);
});

test('BUG 6 - discountPercent below 0 is rejected', async () => {
  await fetch(BASE + '/api/reset', { method: 'POST' });
  const r = await fetch(BASE + '/api/quote', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ checkIds: ['IDENTITY'], discountPercent: -0.01 })
  });
  assert.equal(r.status, 400);
});

test('BUG 7 - discount validation is re-run after every edit', () => {
  const app = fs.readFileSync(path.join(ROOT, 'public', 'app.js'), 'utf8');
  assert.doesNotMatch(
    app,
    /if \(discountValidated\) return;/,
    'discount validation must not latch after the first change'
  );
  assert.match(app, /val < 0 \|\| val > 100/);
});
