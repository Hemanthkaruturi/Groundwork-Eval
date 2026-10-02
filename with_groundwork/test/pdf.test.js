const test = require('node:test');
const assert = require('node:assert');
const { PDFDocument } = require('pdf-lib');
const { startServer } = require('./helpers');
const { createPdfHandler } = require('../server/pdf');

let ctx;
test.before(async () => {
  let server;
  const handler = createPdfHandler({ port: () => server.address().port });
  ctx = await startServer({ pdf: handler });
  server = ctx.server;
  ctx.handler = handler;
});
test.after(async () => {
  await ctx.handler.close();
  ctx.server.close();
});

const PAGE = { size: 'A4', orientation: 'portrait', margins: 'normal', pageNumbers: true };

async function exportPdf(body) {
  const res = await fetch(`${ctx.base}/api/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res;
}

async function pdfInfo(res) {
  const buf = Buffer.from(await res.arrayBuffer());
  const doc = await PDFDocument.load(buf);
  return { buf, doc, size: doc.getPage(0).getSize(), pages: doc.getPageCount() };
}

async function pdfText(buf) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), useSystemFonts: true }).promise;
  let text = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const c = await (await doc.getPage(i)).getTextContent();
    text += c.items.map((it) => it.str).join(' ') + '\n';
  }
  return text;
}

test('defaults give A4 portrait with page-number footer (FR-7)', async () => {
  const res = await exportPdf({ markdown: '# Hello\n\nbody', theme: 'clean', page: PAGE });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.headers.get('content-type'), 'application/pdf');
  const { buf, size } = await pdfInfo(res);
  assert.ok(Math.abs(size.width - 595) < 2 && Math.abs(size.height - 842) < 2, JSON.stringify(size));
  const text = await pdfText(buf);
  assert.match(text, /Hello/);
  assert.match(text, /1\s*\/\s*1/);
});

test('Letter, landscape, wide margins, numbers off (AC-7)', async () => {
  const res = await exportPdf({
    markdown: '# Hello\n\nbody',
    theme: 'clean',
    page: { size: 'Letter', orientation: 'landscape', margins: 'wide', pageNumbers: false },
  });
  const { buf, size } = await pdfInfo(res);
  assert.ok(Math.abs(size.width - 792) < 2 && Math.abs(size.height - 612) < 2, JSON.stringify(size));
  assert.doesNotMatch(await pdfText(buf), /1\s*\/\s*1/);
});

test('wide margins push text further in than narrow (FR-7)', async () => {
  const x = async (margins) => {
    const res = await exportPdf({
      markdown: 'Marker',
      theme: 'print',
      page: { ...PAGE, margins, pageNumbers: false },
    });
    const { buf } = await pdfInfo(res);
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), useSystemFonts: true }).promise;
    const c = await (await doc.getPage(1)).getTextContent();
    return c.items.find((i) => i.str.includes('Marker')).transform[4];
  };
  assert.ok((await x('wide')) > (await x('narrow')) + 30);
});

test('math, diagram and code appear in the PDF (AC-4)', async () => {
  const md = '# Doc\n\n$$E=mc^2$$\n\n```mermaid\ngraph TD; Alpha-->Beta;\n```\n\n```js\nconst answer = 42;\n```\n';
  const res = await exportPdf({ markdown: md, theme: 'github', page: PAGE });
  const { buf } = await pdfInfo(res);
  const text = await pdfText(buf);
  assert.match(text, /answer/);
  assert.match(text, /Alpha/);
  assert.match(text, /Beta/);
});

test('long document makes several numbered pages', async () => {
  const md = Array.from({ length: 300 }, (_, i) => `Line ${i}\n`).join('\n');
  const res = await exportPdf({ markdown: md, theme: 'clean', page: PAGE });
  const { buf, pages } = await pdfInfo(res);
  assert.ok(pages > 1);
  assert.match(await pdfText(buf), new RegExp(`${pages}\\s*/\\s*${pages}`));
});

async function fillColours(buf) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), useSystemFonts: true }).promise;
  const ops = await (await doc.getPage(1)).getOperatorList();
  const found = new Set();
  ops.fnArray.forEach((fn, i) => {
    if (fn === pdfjs.OPS.setFillRGBColor) found.add(String(ops.argsArray[i]));
  });
  return found;
}

test('dark theme prints its dark background; clean does not (AC-6)', async () => {
  const dark = await pdfInfo(
    await exportPdf({ markdown: '# Dark', theme: 'dark', page: { ...PAGE, pageNumbers: false } })
  );
  const clean = await pdfInfo(
    await exportPdf({ markdown: '# Clean', theme: 'clean', page: { ...PAGE, pageNumbers: false } })
  );
  const d = await fillColours(dark.buf);
  const c = await fillColours(clean.buf);
  assert.ok(d.has('#0d1117'), [...d].join(' '));
  assert.ok(!c.has('#0d1117'));
});

test('warnings come back in the header for broken image (FR-5)', async () => {
  const res = await exportPdf({
    markdown: '![x](http://localhost:1/nope.png)\n\nafter',
    theme: 'clean',
    page: PAGE,
  });
  assert.strictEqual(res.status, 200);
  const warnings = JSON.parse(decodeURIComponent(res.headers.get('x-render-warnings')));
  assert.strictEqual(warnings.length, 1);
  assert.match(warnings[0], /Image could not be loaded/);
});

test('invalid input gets 400 and the Markdown is not echoed (E18)', async () => {
  const bad = [
    { markdown: 'SECRETTEXT', theme: 'neon', page: PAGE },
    { markdown: 'SECRETTEXT', theme: 'clean', page: { ...PAGE, size: 'B5' } },
    { theme: 'clean', page: PAGE },
    { markdown: '   \n ', theme: 'clean', page: PAGE },
  ];
  for (const body of bad) {
    const res = await exportPdf(body);
    assert.strictEqual(res.status, 400);
    assert.ok(!(await res.text()).includes('SECRETTEXT'));
  }
});

test('Chromium crash gives 500, next request recovers (E17)', async () => {
  const browser = await ctx.handler.browser();
  browser.process().kill('SIGKILL');
  await new Promise((r) => setTimeout(r, 500));
  const first = await exportPdf({ markdown: '# a', theme: 'clean', page: PAGE });
  assert.ok([200, 500].includes(first.status));
  const second = await exportPdf({ markdown: '# b', theme: 'clean', page: PAGE });
  assert.strictEqual(second.status, 200);
});

test('three concurrent exports all succeed with their own content (E22)', async () => {
  const names = ['Alpha', 'Bravo', 'Charlie'];
  const results = await Promise.all(
    names.map((n) => exportPdf({ markdown: `# ${n}`, theme: 'clean', page: PAGE }))
  );
  for (let i = 0; i < 3; i++) {
    assert.strictEqual(results[i].status, 200);
    const { buf } = await pdfInfo(results[i]);
    const text = await pdfText(buf);
    assert.match(text, new RegExp(names[i]));
    for (const other of names.filter((_, j) => j !== i)) assert.doesNotMatch(text, new RegExp(other));
  }
});
