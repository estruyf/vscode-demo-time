import { createServer } from 'node:http';
import { routes } from './routes.ts';

const port = Number(process.env.PORT ?? 8080);

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const handler = routes[`${req.method} ${url.pathname}`] ?? routes.fallback;

  try {
    await handler(req, res, url);
  } catch (error) {
    res.writeHead(500).end(String(error));
  }
});

server.listen(port, () => {
  console.log(`tiny-links on http://localhost:${port}`);
});
