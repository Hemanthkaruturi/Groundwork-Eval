const test = require('node:test');
const assert = require('node:assert');
const { startServer, launch, renderOnPage } = require('./helpers');

let ctx;
test.before(async () => {
  ctx = { ...(await startServer()), browser: await launch() };
});
test.after(async () => {
  await ctx.browser.close();
  ctx.server.close();
});

const r = async (md, theme) => renderOnPage(ctx.browser, ctx.base, md, theme);

test('GitHub features: table, task list, coloured code (AC-3)', async () => {
  const { page, html } = await r(
    '| a | b |\n|---|---|\n| 1 | 2 |\n\n- [x] done\n- [ ] todo\n\n~~old~~\n\n```js\nconst x = 1;\n```\n'
  );
  assert.match(html, /<table>/);
  assert.match(html, /type="checkbox"/);
  assert.match(html, /<s>old<\/s>/);
  assert.match(html, /hljs-keyword/);
  const color = await page.$eval('.hljs-keyword', (el) => getComputedStyle(el).color);
  const base = await page.$eval('.hljs', (el) => getComputedStyle(el).color);
  assert.notStrictEqual(color, base);
  await page.close();
});

test('math and diagram render (AC-4)', async () => {
  const { page, html, warnings } = await r(
    'Inline $x^2$ and\n\n$$\\frac{a}{b}$$\n\n```mermaid\ngraph TD; A-->B;\n```\n'
  );
  assert.match(html, /class="katex"/);
  assert.match(html, /<svg/);
  assert.deepStrictEqual(warnings, []);
  await page.close();
});

test('bad Mermaid gives placeholder and one warning, rest intact (FR-4)', async () => {
  const { page, html, warnings } = await r('# Title\n\n```mermaid\nthis is not valid ((\n```\n\nafter');
  assert.match(html, /diagram error/);
  assert.match(html, /after/);
  assert.match(html, /<h1>Title<\/h1>/);
  assert.strictEqual(warnings.length, 1);
  await page.close();
});

test('bad math gives a visible error and a warning', async () => {
  const { page, html, warnings } = await r('Broken $\\frac{a$ here');
  assert.match(html, /Math error/);
  assert.ok(warnings.length >= 1);
  await page.close();
});

test('base64 image loads, broken URL becomes placeholder with warning (AC-5, FR-5)', async () => {
  const png =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const { page, html, warnings } = await r(
    `![ok](${png})\n\n![gone](http://localhost:1/nope.png)\n`
  );
  assert.match(html, /<img[^>]+src="data:image\/png/);
  assert.match(html, /image not available: gone/);
  assert.strictEqual(warnings.length, 1);
  await page.close();
});

test('each theme sets a different page colour; default is clean (AC-6, FR-6)', async () => {
  const colours = {};
  for (const theme of ['clean', 'github', 'dark', 'print']) {
    const { page } = await r('# Hi\n\ntext', theme);
    colours[theme] = await page.$eval('#out', (el) => {
      const s = getComputedStyle(el);
      return s.backgroundColor + '|' + s.color + '|' + s.fontFamily;
    });
    await page.close();
  }
  assert.strictEqual(new Set(Object.values(colours)).size, 4);
  const { page } = await r('# Hi', 'bogus');
  assert.strictEqual(await page.$eval('#out', (el) => el.dataset.theme), 'clean');
  await page.close();
});

test('script in Markdown does not crash the renderer (hostile input)', async () => {
  const { page, html } = await r('<b>bold</b>\n\n<script>window.__ran = 1</script>\n');
  assert.match(html, /<b>bold<\/b>/);
  await page.close();
});

test('unicode and emoji survive', async () => {
  const { page, html } = await r('# Привет 你好 🎉\n\nمرحبا');
  assert.match(html, /Привет 你好 🎉/);
  await page.close();
});
