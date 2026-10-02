const puppeteer = require('puppeteer');

const THEMES = ['clean', 'github', 'dark', 'print'];
const SIZES = { A4: 'A4', Letter: 'Letter', Legal: 'Legal', A3: 'A3' };
const ORIENTATIONS = ['portrait', 'landscape'];
const MARGINS_MM = { narrow: 10, normal: 20, wide: 30 };
const MAX_WARNINGS = 20;

const footer = (color) =>
  `<div style="font-size:9px;width:100%;text-align:center;color:${color};font-family:Arial,sans-serif;">` +
  '<span class="pageNumber"></span> / <span class="totalPages"></span></div>';

function validate(body) {
  if (!body || typeof body !== 'object') return 'Invalid request';
  if (typeof body.markdown !== 'string') return 'markdown must be text';
  if (!body.markdown.trim()) return 'Nothing to export';
  if (!THEMES.includes(body.theme)) return 'Unknown theme';
  const p = body.page;
  if (!p || typeof p !== 'object') return 'page options are required';
  if (!Object.hasOwn(SIZES, p.size)) return 'Unknown paper size';
  if (!ORIENTATIONS.includes(p.orientation)) return 'Unknown orientation';
  if (!Object.hasOwn(MARGINS_MM, p.margins)) return 'Unknown margins';
  if (typeof p.pageNumbers !== 'boolean') return 'pageNumbers must be true or false';
  return null;
}

function createPdfHandler({ port }) {
  let browserPromise = null;

  function getBrowser() {
    if (browserPromise) {
      return browserPromise.then((b) => (b.connected ? b : ((browserPromise = null), getBrowser())));
    }
    browserPromise = puppeteer
      .launch({ headless: true, args: ['--no-sandbox'] })
      .catch((e) => {
        browserPromise = null;
        throw e;
      });
    return browserPromise;
  }

  async function renderPdf(body) {
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      page.setDefaultTimeout(60000);
      await page.goto(`http://localhost:${port()}/print.html`, { waitUntil: 'load' });
      const { warnings } = await page.evaluate((input) => window.runPrint(input), {
        markdown: body.markdown,
        theme: body.theme,
      });
      const { size, orientation, margins, pageNumbers } = body.page;
      const mm = MARGINS_MM[margins];
      const bg = await page.evaluate(() => getComputedStyle(document.getElementById('out')).backgroundColor);
      // The page background must also cover the margins, so it is set on @page as well.
      await page.addStyleTag({
        content: `@page { size: ${SIZES[size]} ${orientation}; margin: ${mm}mm; background: ${bg}; }`,
      });
      const pdf = await page.pdf({
        preferCSSPageSize: true,
        printBackground: true,
        displayHeaderFooter: pageNumbers,
        headerTemplate: '<div></div>',
        footerTemplate: pageNumbers ? footer(body.theme === 'dark' ? '#b0b8c1' : '#666') : '<div></div>',
      });
      return { pdf: Buffer.from(pdf), warnings };
    } finally {
      await page.close().catch(() => {});
    }
  }

  async function handler(req, res) {
    const problem = validate(req.body);
    if (problem) return res.status(400).json({ error: problem });
    try {
      const { pdf, warnings } = await renderPdf(req.body);
      const shown = warnings.slice(0, MAX_WARNINGS).map((w) => String(w).slice(0, 200));
      res.set('X-Render-Warnings', encodeURIComponent(JSON.stringify(shown)));
      res.set('Content-Type', 'application/pdf');
      res.send(pdf);
    } catch (e) {
      // NFR-2: never log or echo the content; report only that it failed.
      res.status(500).json({ error: 'PDF could not be created. Please try again.' });
    }
  }

  handler.close = async () => {
    if (!browserPromise) return;
    const b = await browserPromise.catch(() => null);
    browserPromise = null;
    if (b) await b.close().catch(() => {});
  };
  handler.browser = () => getBrowser();
  return handler;
}

module.exports = { createPdfHandler, validate };
