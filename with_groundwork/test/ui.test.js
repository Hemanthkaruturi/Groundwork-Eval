const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { startServer, launch } = require('./helpers');
const { createPdfHandler } = require('../server/pdf');

let ctx;
let tmp;
test.before(async () => {
  let server;
  const handler = createPdfHandler({ port: () => server.address().port });
  ctx = await startServer({ pdf: handler });
  server = ctx.server;
  ctx.handler = handler;
  ctx.browser = await launch();
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'md2pdf-ui-'));
});
test.after(async () => {
  await ctx.browser.close();
  await ctx.handler.close();
  ctx.server.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

async function openApp({ viewport, storage } = {}) {
  const context = await ctx.browser.createBrowserContext();
  const page = await context.newPage();
  if (viewport) await page.setViewport(viewport);
  if (storage !== undefined) {
    await page.evaluateOnNewDocument((v) => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem('md2pdf.state', v);
        sessionStorage.setItem('seeded', '1');
      }
    }, storage);
  }
  await page.goto(ctx.base, { waitUntil: 'load' });
  await page.waitForFunction(() => document.body.dataset.previewVersion);
  page.ctx = context;
  return page;
}

async function setText(page, text) {
  await page.$eval('#editor', (e, t) => {
    e.value = t;
    e.dispatchEvent(new Event('input', { bubbles: true }));
  }, text);
}

const previewHtml = (page) => page.$eval('#preview', (e) => e.innerHTML);
const messages = (page) => page.$eval('#messages', (e) => e.innerText);

async function downloadFresh(page) {
  await page.$eval('#download', (b) => delete b.dataset.lastFile);
  await page.click('#download');
  await page.waitForFunction(
    () => document.getElementById('download').dataset.lastFile || document.querySelector('#messages .error'),
    { timeout: 30000 }
  );
  return page.$eval('#download', (b) => b.dataset.lastFile || '');
}

test('live preview after typing (AC-1)', async () => {
  const page = await openApp();
  await page.type('#editor', '# Hi there');
  await page.waitForFunction(() => document.querySelector('#preview h1')?.textContent === 'Hi there', { timeout: 1500 });
  await page.ctx.close();
});

test('upload .md and .markdown fills editor and preview (AC-2)', async () => {
  const page = await openApp();
  for (const name of ['notes.md', 'a.markdown']) {
    const f = path.join(tmp, name);
    fs.writeFileSync(f, `# From ${name}\n`);
    const input = await page.$('#file');
    await input.uploadFile(f);
    await page.waitForFunction((n) => document.querySelector('#preview h1')?.textContent === 'From ' + n, {}, name);
    assert.strictEqual(await page.$eval('#editor', (e) => e.value), `# From ${name}\n`);
  }
  await page.ctx.close();
});

test('wrong file type shows an error and changes nothing (FR-1)', async () => {
  const page = await openApp();
  await setText(page, '# Keep me');
  for (const name of ['pic.png', 'notes.txt']) {
    const f = path.join(tmp, name);
    fs.writeFileSync(f, 'x');
    await (await page.$('#file')).uploadFile(f);
    await page.waitForFunction(() => document.querySelector('#messages .error'));
    assert.match(await messages(page), /\.md or \.markdown/);
    assert.strictEqual(await page.$eval('#editor', (e) => e.value), '# Keep me');
  }
  await page.ctx.close();
});

test('download file names (AC-8)', async () => {
  const page = await openApp();
  await setText(page, '# Plan\n\ntext');
  assert.strictEqual(await downloadFresh(page), 'Plan.pdf');

  await setText(page, 'just text, no heading');
  assert.strictEqual(await downloadFresh(page), 'document.pdf');

  await setText(page, '# a/b: c?\n');
  assert.strictEqual(await downloadFresh(page), 'ab c.pdf');

  await setText(page, '# **Bold** title\n');
  assert.strictEqual(await downloadFresh(page), 'Bold title.pdf');

  const f = path.join(tmp, 'notes.md');
  fs.writeFileSync(f, '# Different heading\n');
  await (await page.$('#file')).uploadFile(f);
  await page.waitForFunction(() => document.querySelector('#preview h1')?.textContent === 'Different heading');
  assert.strictEqual(await downloadFresh(page), 'notes.pdf');
  await page.ctx.close();
});

test('empty input shows "Nothing to export" and sends no request (AC-12)', async () => {
  const page = await openApp();
  let calls = 0;
  page.on('request', (r) => r.url().endsWith('/api/pdf') && calls++);
  for (const t of ['', '   \n  ']) {
    await setText(page, t);
    await page.click('#download');
    await page.waitForFunction(() => /Nothing to export/.test(document.getElementById('messages').innerText));
  }
  assert.strictEqual(calls, 0);
  await page.ctx.close();
});

test('input over 1 MB is blocked in the browser with a message (AC-11)', async () => {
  const page = await openApp();
  let calls = 0;
  page.on('request', (r) => r.url().endsWith('/api/pdf') && calls++);
  await setText(page, 'a'.repeat(1010 * 1000));
  await page.click('#download');
  await page.waitForFunction(() => /1 MB limit/.test(document.getElementById('messages').innerText));
  assert.strictEqual(calls, 0);
  assert.strictEqual((await page.$eval('#editor', (e) => e.value)).length, 1010 * 1000);
  await page.ctx.close();
});

test('broken image still downloads and shows a warning (E14)', async () => {
  const page = await openApp();
  await setText(page, '# Img\n\n![x](http://localhost:1/nope.png)\n');
  await page.waitForFunction(() => /image not available/.test(document.getElementById('preview').innerText));
  assert.strictEqual(await downloadFresh(page), 'Img.pdf');
  assert.match(await messages(page), /Warning: Image could not be loaded/);
  await page.ctx.close();
});

test('text and settings are restored after reload (AC-9)', async () => {
  const page = await openApp();
  await setText(page, '# Remember me');
  await page.select('#theme', 'dark');
  await page.select('#size', 'Letter');
  await page.select('#orientation', 'landscape');
  await page.select('#margins', 'wide');
  await page.click('#pageNumbers');
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => document.body.dataset.previewVersion);
  assert.strictEqual(await page.$eval('#editor', (e) => e.value), '# Remember me');
  assert.deepStrictEqual(
    await page.evaluate(() => [theme.value, size.value, orientation.value, margins.value, pageNumbers.checked]),
    ['dark', 'Letter', 'landscape', 'wide', false]
  );
  assert.strictEqual(await page.$eval('#preview', (e) => e.dataset.theme), 'dark');
  await page.ctx.close();
});

test('corrupt local storage falls back to defaults without errors (E23)', async () => {
  const page = await openApp({ storage: '{not json' });
  assert.strictEqual(await page.$eval('#theme', (e) => e.value), 'clean');
  assert.strictEqual(await page.$eval('#editor', (e) => e.value), '');
  await page.ctx.close();
  const page2 = await openApp({ storage: JSON.stringify({ markdown: 5, theme: 'neon', page: { size: 'B5' } }) });
  assert.strictEqual(await page2.$eval('#theme', (e) => e.value), 'clean');
  assert.strictEqual(await page2.$eval('#size', (e) => e.value), 'A4');
  await page2.ctx.close();
});

test('default theme is Clean document and defaults are A4/portrait/normal/numbers on (FR-6, FR-7)', async () => {
  const page = await openApp();
  assert.deepStrictEqual(
    await page.evaluate(() => [theme.value, size.value, orientation.value, margins.value, pageNumbers.checked]),
    ['clean', 'A4', 'portrait', 'normal', true]
  );
  await page.ctx.close();
});

test('every control has a label and is reachable by Tab (NFR-3)', async () => {
  const page = await openApp();
  const names = await page.evaluate(() => {
    const out = {};
    for (const e of document.querySelectorAll('select, input, button, textarea')) {
      const label = e.labels && e.labels[0] ? e.labels[0].innerText.trim() : e.innerText.trim();
      out[e.id] = label;
    }
    return out;
  });
  for (const [id, label] of Object.entries(names)) assert.ok(label, `control #${id} has no label`);
  const seen = new Set();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    seen.add(await page.evaluate(() => document.activeElement.id));
  }
  for (const id of Object.keys(names)) assert.ok(seen.has(id), `Tab never reached #${id}`);
  await page.ctx.close();
});

test('narrow window stacks editor above preview (NFR-4)', async () => {
  const page = await openApp({ viewport: { width: 700, height: 900 } });
  const r = await page.evaluate(() => {
    const a = document.getElementById('editor').getBoundingClientRect();
    const b = document.getElementById('preview').getBoundingClientRect();
    return { aBottom: a.bottom, bTop: b.top, aLeft: a.left, bLeft: b.left };
  });
  assert.ok(r.bTop >= r.aBottom - 1);
  assert.strictEqual(Math.round(r.aLeft), Math.round(r.bLeft));
  const wide = await openApp({ viewport: { width: 1400, height: 900 } });
  const w = await wide.evaluate(() => ({
    a: document.getElementById('editor').getBoundingClientRect().left,
    b: document.getElementById('preview').getBoundingClientRect().left,
  }));
  assert.ok(w.b > w.a + 100);
  await page.ctx.close();
  await wide.ctx.close();
});

test('rapid double click on Download does not crash (catalogue)', async () => {
  const page = await openApp();
  await setText(page, '# Twice');
  await page.$eval('#download', (b) => { b.click(); b.click(); });
  await page.waitForFunction(() => document.getElementById('download').dataset.lastFile, { timeout: 30000 });
  await page.ctx.close();
});
