import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as store from './store.js';
import * as fdm from './fdm.js';
import { validatePage } from './validate.js';

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const PORT = Number(process.env.PORT) || 3000;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json',
};

const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
};

async function readBody(req) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > 1_000_000) throw Object.assign(new Error('payload too large'), { status: 413 });
    chunks.push(c);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
}

async function api(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean).slice(1); // 去掉 "api"
  const [kind, slug] = parts;

  if (kind === 'pages' && !slug && req.method === 'GET') return json(res, 200, await store.listPages());

  if (kind === 'pages' && slug) {
    if (!store.SLUG_RE.test(slug)) return json(res, 400, { error: '網址代稱只能使用小寫英文、數字與連字號' });
    if (req.method === 'GET') {
      const page = await store.getPage(slug);
      return page ? json(res, 200, page) : json(res, 404, { error: '找不到此頁面' });
    }
    if (req.method === 'PUT') {
      const { page, error } = validatePage(await readBody(req));
      if (error) return json(res, 400, { error });
      return json(res, 200, await store.savePage(slug, page));
    }
    if (req.method === 'DELETE') {
      return (await store.deletePage(slug)) ? json(res, 200, { ok: true }) : json(res, 404, { error: '找不到此頁面' });
    }
  }

  if (kind === 'fdm' && slug === 'tags' && req.method === 'GET') {
    return json(res, 200, { mode: fdm.fdmMode(), tags: await fdm.listTags() });
  }
  if (kind === 'fdm' && slug === 'values' && req.method === 'GET') {
    const tags = (url.searchParams.get('tags') || '').split(',').filter(Boolean).slice(0, 500);
    return json(res, 200, { mode: fdm.fdmMode(), now: Date.now(), values: await fdm.getValues(tags) });
  }
  return json(res, 404, { error: 'not found' });
}

async function serveStatic(res, pathname) {
  const rel = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const file = extname(rel) ? join(PUBLIC, rel) : join(PUBLIC, 'index.html'); // 其餘路徑皆為 SPA 頁面網址
  if (!file.startsWith(PUBLIC)) return json(res, 403, { error: 'forbidden' });
  try {
    const buf = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(buf);
  } catch {
    json(res, 404, { error: 'not found' });
  }
}

export const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    return await serveStatic(res, decodeURIComponent(url.pathname));
  } catch (err) {
    console.error(err);
    json(res, err.status || 500, { error: err.status ? err.message : '伺服器錯誤' });
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, () => console.log(`MIMIC 已啟動： http://localhost:${PORT}  （FDM 模式：${fdm.fdmMode()}）`));
}
