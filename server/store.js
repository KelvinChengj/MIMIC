// 頁面設定以 JSON 檔存放（data/pages.json）；換成資料庫只需改這個檔案。
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedPages } from './seed.js';

const DATA_FILE = process.env.MIMIC_DATA || join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'pages.json');
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;

let cache = null;
let writing = Promise.resolve();

async function load() {
  if (cache) return cache;
  try {
    cache = JSON.parse(await readFile(DATA_FILE, 'utf8'));
  } catch {
    cache = seedPages();
    await persist();
  }
  return cache;
}

function persist() {
  writing = writing.then(async () => {
    await mkdir(dirname(DATA_FILE), { recursive: true });
    const tmp = DATA_FILE + '.tmp';
    await writeFile(tmp, JSON.stringify(cache, null, 2));
    await rename(tmp, DATA_FILE);
  });
  return writing;
}

export async function listPages() {
  const pages = await load();
  return Object.values(pages).map(({ slug, title, lights, updatedAt }) => ({
    slug, title, updatedAt, lightCount: lights.length,
  }));
}

export async function getPage(slug) {
  return (await load())[slug] ?? null;
}

export async function savePage(slug, page) {
  const pages = await load();
  pages[slug] = { ...page, slug, updatedAt: new Date().toISOString() };
  await persist();
  return pages[slug];
}

export async function deletePage(slug) {
  const pages = await load();
  if (!pages[slug]) return false;
  delete pages[slug];
  await persist();
  return true;
}
