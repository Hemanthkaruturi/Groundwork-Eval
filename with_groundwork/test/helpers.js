const puppeteer = require('puppeteer');
const { createApp, HOST } = require('../server/index');

async function startServer(opts = {}) {
  const app = createApp(opts);
  const server = await new Promise((resolve) => {
    const s = app.listen(0, HOST, () => resolve(s));
  });
  return { server, base: `http://localhost:${server.address().port}` };
}

async function launch() {
  return puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
}

// Renders markdown on /print.html with the shared renderer; returns { page, html, warnings }.
async function renderOnPage(browser, base, markdown, theme = 'clean') {
  const page = await browser.newPage();
  await page.goto(`${base}/print.html`, { waitUntil: 'load' });
  const result = await page.evaluate((input) => window.runPrint(input), { markdown, theme });
  const html = await page.$eval('#out', (el) => el.innerHTML);
  return { page, html, warnings: result.warnings };
}

module.exports = { startServer, launch, renderOnPage };
