const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { createApp, HOST } = require('../server/index');

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, HOST, () => resolve(server));
  });
}

function request(server, { method = 'GET', path = '/', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: HOST, port: server.address().port, method, path, headers },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

const stub = (req, res) => res.json({ ok: true });

test('server binds to 127.0.0.1 only (AC-10)', async () => {
  const server = await listen(createApp({ pdf: stub }));
  assert.strictEqual(server.address().address, '127.0.0.1');
  server.close();
});

test('foreign Host header is refused (AC-10)', async () => {
  const server = await listen(createApp({ pdf: stub }));
  const bad = await request(server, { headers: { Host: 'evil.example' } });
  assert.strictEqual(bad.status, 403);
  const good = await request(server, { headers: { Host: `localhost:${server.address().port}` } });
  assert.notStrictEqual(good.status, 403);
  server.close();
});

test('body just over 1 MB gets 413 without echoing content (AC-11)', async () => {
  const server = await listen(createApp({ pdf: stub }));
  const big = JSON.stringify({ markdown: 'SECRETTEXT' + 'a'.repeat(1024 * 1024) });
  const res = await request(server, {
    method: 'POST',
    path: '/api/pdf',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(big) },
    body: big,
  });
  assert.strictEqual(res.status, 413);
  assert.ok(!res.body.includes('SECRETTEXT'));
  server.close();
});

test('body under the limit is accepted (NFR-1 boundary)', async () => {
  const server = await listen(createApp({ pdf: stub }));
  const ok = JSON.stringify({ markdown: 'a'.repeat(900 * 1024) });
  const res = await request(server, {
    method: 'POST',
    path: '/api/pdf',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(ok) },
    body: ok,
  });
  assert.strictEqual(res.status, 200);
  server.close();
});
