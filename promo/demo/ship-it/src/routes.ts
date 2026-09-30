import type { IncomingMessage, ServerResponse } from 'node:http';
import { find, save } from './store.ts';

type Handler = (req: IncomingMessage, res: ServerResponse, url: URL) => void | Promise<void>;

export const routes: Record<string, Handler> = {
  'GET /health': (_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  },

  fallback: (_req, res, url) => {
    const link = find(url.pathname.slice(1));
    if (!link) return void res.writeHead(404).end('Not found');
    res.writeHead(302, { location: link.url }).end();
  },
};
