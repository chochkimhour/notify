import { createServer } from 'node:http';
import { POST as webhook } from '../api/webhook.js';
import { POST as sendAlert } from '../api/send-alert.js';
import { log } from '../lib/log.js';

const routes = { '/api/webhook': webhook, '/api/send-alert': sendAlert };
const port = Number(process.env.PORT ?? 3000);

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://localhost:${port}`);
  const route = routes[pathname];
  if (!route) return res.writeHead(404).end('Not found');
  if (req.method !== 'POST') return res.writeHead(405).end('Method not allowed');

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const request = new Request(`http://localhost:${port}${req.url}`, {
      method: 'POST',
      headers: req.headers,
      body: Buffer.concat(chunks),
    });

    const response = await route(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(await response.text());
    log.info('http.request', { method: req.method, path: pathname, status: response.status });
  } catch (error) {
    log.error('http.failed', { method: req.method, path: pathname, error: error.message });
    if (!res.headersSent) res.writeHead(500);
    res.end('Internal error');
  }
}).listen(port, () => log.info('server.listening', { url: `http://localhost:${port}` }));
