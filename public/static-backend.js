// 純前端試玩版：用瀏覽器內建的「假後端」取代 /api/*，資料存在 localStorage。
// 與伺服器共用 shared/ 內的範例資料、驗證與模擬 FDM，行為一致。
import { seedPages } from './shared/seed.js';
import { validatePage } from './shared/validate.js';
import { MOCK_TAGS, mockValue } from './shared/fdm-mock.js';

window.MIMIC_STATIC = true;
const KEY = 'mimic-demo-pages';
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;

let mem = null; // localStorage 不可用時的備援
const read = () => {
  try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch { /* 忽略 */ }
  return mem;
};
const write = (pages) => {
  mem = pages;
  try { localStorage.setItem(KEY, JSON.stringify(pages)); } catch { /* 忽略 */ }
};
const pages = () => { let p = read(); if (!p) { p = seedPages(); write(p); } return p; };

export function resetDemo() {
  mem = null;
  try { localStorage.removeItem(KEY); } catch { /* 忽略 */ }
}

const reply = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function handle(url, method, bodyText) {
  const u = new URL(url, 'http://demo.local');
  const [, kind, slug] = u.pathname.split('/').filter(Boolean); // /api/<kind>/<slug>
  const all = pages();

  if (kind === 'pages' && !slug) {
    return reply(200, Object.values(all).map(({ slug: s, title, lights, updatedAt }) => ({ slug: s, title, updatedAt, lightCount: lights.length })));
  }
  if (kind === 'pages') {
    if (!SLUG_RE.test(slug)) return reply(400, { error: '網址代稱只能使用小寫英文、數字與連字號' });
    if (method === 'GET') return all[slug] ? reply(200, all[slug]) : reply(404, { error: '找不到此頁面' });
    if (method === 'PUT') {
      const { page, error } = validatePage(JSON.parse(bodyText || '{}'));
      if (error) return reply(400, { error });
      all[slug] = { ...page, slug, updatedAt: new Date().toISOString() };
      write(all);
      return reply(200, all[slug]);
    }
    if (method === 'DELETE') {
      if (!all[slug]) return reply(404, { error: '找不到此頁面' });
      delete all[slug]; write(all);
      return reply(200, { ok: true });
    }
  }
  if (kind === 'fdm' && slug === 'tags') {
    return reply(200, { mode: 'mock', tags: MOCK_TAGS.map(({ tag, name, unit, area }) => ({ tag, name, unit, area })) });
  }
  if (kind === 'fdm' && slug === 'values') {
    const now = Date.now();
    const values = {};
    for (const tag of (u.searchParams.get('tags') || '').split(',').filter(Boolean)) {
      const def = MOCK_TAGS.find((d) => d.tag === tag);
      const value = def ? mockValue(def, now) : null;
      values[tag] = value === null ? null : { value, ts: now };
    }
    return reply(200, { mode: 'mock', now, values });
  }
  return reply(404, { error: 'not found' });
}

const realFetch = window.fetch.bind(window);
window.fetch = (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url;
  if (!url.startsWith('/api/')) return realFetch(input, init);
  try { return Promise.resolve(handle(url, (init.method || 'GET').toUpperCase(), init.body)); }
  catch (e) { return Promise.resolve(reply(500, { error: e.message })); }
};
