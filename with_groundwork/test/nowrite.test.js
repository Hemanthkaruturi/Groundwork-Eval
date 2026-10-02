const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { startServer } = require('./helpers');
const { createPdfHandler } = require('../server/pdf');

const ROOT = path.join(__dirname, '..');
const SECRET = 'ZEBRA-SECRET-4711';

function snapshot(dir, out = new Map()) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.groundwork'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) snapshot(p, out);
    else out.set(p, fs.statSync(p).mtimeMs + ':' + fs.statSync(p).size);
  }
  return out;
}

function filesContaining(dir, needle, hits = []) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return hits; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    try {
      if (e.isDirectory()) filesContaining(p, needle, hits);
      else if (e.isFile() && fs.statSync(p).size < 50e6 && fs.readFileSync(p).includes(needle)) hits.push(p);
    } catch (err) { /* unreadable: skip */ }
  }
  return hits;
}

test('export writes no files in the project and prints no content (NFR-2)', async () => {
  let server;
  const handler = createPdfHandler({ port: () => server.address().port });
  const ctx = await startServer({ pdf: handler });
  server = ctx.server;

  const before = snapshot(ROOT);
  let output = '';
  const origOut = process.stdout.write;
  const origErr = process.stderr.write;
  process.stdout.write = (c, ...a) => { output += String(c); return origOut.call(process.stdout, c, ...a); };
  process.stderr.write = (c, ...a) => { output += String(c); return origErr.call(process.stderr, c, ...a); };
  try {
    const res = await fetch(`${ctx.base}/api/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        markdown: `# ${SECRET}`,
        theme: 'clean',
        page: { size: 'A4', orientation: 'portrait', margins: 'normal', pageNumbers: true },
      }),
    });
    assert.strictEqual(res.status, 200);
    // a failing request must not echo content either
    await fetch(`${ctx.base}/api/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markdown: SECRET, theme: 'bad', page: {} }),
    });
  } finally {
    process.stdout.write = origOut;
    process.stderr.write = origErr;
  }
  await handler.close();
  ctx.server.close();

  assert.deepStrictEqual([...snapshot(ROOT)], [...before]);
  assert.ok(!output.includes(SECRET), 'content appeared in server output');
  // The server itself writes nothing; check Chromium's own temp profile for leftovers too.
  const leaked = filesContaining(os.tmpdir(), Buffer.from(SECRET)).filter((f) => !f.includes('md2pdf-ui-'));
  assert.deepStrictEqual(leaked, []);
});
