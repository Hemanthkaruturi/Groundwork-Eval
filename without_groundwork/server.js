const express = require('express');
const multer = require('multer');
const MarkdownIt = require('markdown-it');
const hljs = require('highlight.js');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const md = new MarkdownIt({
  html: false, // don't pass raw HTML through to the renderer
  linkify: true,
  typographer: true,
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try { return hljs.highlight(code, { language: lang }).value; } catch {}
    }
    return '';
  },
}).use(require('markdown-it-anchor')).use(require('markdown-it-task-lists'));

const css = fs.readFileSync(path.join(__dirname, 'pdf.css'), 'utf8');
const hljsCss = fs.readFileSync(require.resolve('highlight.js/styles/github.css'), 'utf8');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });
const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const pageHtml = (body, title) => `<!doctype html><html><head><meta charset="utf-8">
<title>${title.replace(/[<>&"]/g, '')}</title><style>${hljsCss}${css}</style></head>
<body><article class="markdown-body">${body}</article></body></html>`;

let browserPromise;
const getBrowser = () => (browserPromise ||= puppeteer.launch({
  headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'],
}).then((b) => {
  // If Chrome dies, drop the cached instance so the next request relaunches it
  b.on('disconnected', () => { browserPromise = null; });
  return b;
}).catch((e) => { browserPromise = null; throw e; }));

async function toPdf(markdown, { title = 'document', pageSize = 'A4' } = {}) {
  const page = await (await getBrowser()).newPage();
  try {
    // JS disabled: output is static HTML only
    await page.setJavaScriptEnabled(false);
    await page.setContent(pageHtml(md.render(markdown), title), { waitUntil: 'load' });
    return await page.pdf({
      format: pageSize, printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '18mm', right: '18mm' },
    });
  } finally { await page.close(); }
}

const safeName = (s) => (s || 'document').replace(/\.(md|markdown|txt)$/i, '').replace(/[^\w.-]+/g, '_') || 'document';

app.post('/api/convert', upload.single('file'), async (req, res) => {
  try {
    const markdown = req.file ? req.file.buffer.toString('utf8') : (req.body.markdown || '');
    if (!markdown.trim()) return res.status(400).json({ error: 'No markdown provided.' });
    const name = safeName(req.file ? req.file.originalname : req.body.filename);
    const pdf = await toPdf(markdown, { title: name, pageSize: req.body.pageSize === 'Letter' ? 'Letter' : 'A4' });
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${name}.pdf"` });
    res.send(Buffer.from(pdf));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'PDF generation failed.' });
  }
});

// Live preview HTML (same renderer as the PDF)
app.post('/api/preview', (req, res) => res.json({ html: md.render(String(req.body.markdown || '')) }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Markdown → PDF running at http://localhost:${port}`));
process.on('SIGINT', async () => { if (browserPromise) await (await browserPromise).close(); process.exit(); });
