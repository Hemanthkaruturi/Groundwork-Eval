const path = require('path');
const express = require('express');

const HOST = '127.0.0.1';
const DEFAULT_PORT = 3000;
const BODY_LIMIT = '1mb';
const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function hostName(header) {
  if (!header) return '';
  if (header.startsWith('[')) return header.slice(0, header.indexOf(']') + 1);
  return header.split(':')[0];
}

function createApp({ pdf } = {}) {
  const app = express();
  app.disable('x-powered-by');

  // FR-11: refuse any request whose Host is not this machine (blocks DNS rebinding).
  app.use((req, res, next) => {
    if (!ALLOWED_HOSTS.has(hostName(req.headers.host))) {
      return res.status(403).json({ error: 'Forbidden host' });
    }
    next();
  });

  const root = path.join(__dirname, '..');
  const mods = path.join(root, 'node_modules');
  app.use('/vendor/katex', express.static(path.join(mods, 'katex', 'dist')));
  app.use('/vendor/mermaid', express.static(path.join(mods, 'mermaid', 'dist')));
  app.use('/vendor/hljs', express.static(path.join(mods, '@highlightjs', 'cdn-assets')));
  app.use('/vendor/markdown-it', express.static(path.join(mods, 'markdown-it', 'dist')));
  app.use('/vendor/task-lists', express.static(path.join(mods, 'markdown-it-task-lists', 'dist')));
  app.use('/vendor/texmath', express.static(path.join(mods, 'markdown-it-texmath')));
  app.use(express.static(path.join(root, 'public')));

  if (pdf) {
    app.post('/api/pdf', express.json({ limit: BODY_LIMIT }), pdf);
  }

  // NFR-2: error responses never echo the request content or log it.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Input is larger than the 1 MB limit' });
    }
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Invalid request' });
    }
    return res.status(500).json({ error: 'Internal error' });
  });

  return app;
}

function start(port = DEFAULT_PORT) {
  const { createPdfHandler } = require('./pdf');
  const handler = createPdfHandler({ port: () => server.address().port });
  const app = createApp({ pdf: handler });
  const server = app.listen(port, HOST, () => {
    console.log(`Markdown to PDF running at http://localhost:${server.address().port}`);
  });
  const close = () => handler.close().finally(() => server.close());
  process.on('SIGINT', close);
  process.on('SIGTERM', close);
  return server;
}

if (require.main === module) {
  start(Number(process.env.PORT) || DEFAULT_PORT);
}

module.exports = { createApp, start, HOST };
