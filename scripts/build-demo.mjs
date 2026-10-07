// 產生純前端試玩版（不需後端）到 dist-demo/：把 public/ 複製過去，並用 static.html 取代 index.html。
// 部署到任何靜態空間（GitHub Pages 等）即可使用；資料存在瀏覽器 localStorage。
import { cp, rm, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist-demo');
await rm(out, { recursive: true, force: true });
await cp(join(root, 'public'), out, { recursive: true });
const body = await readFile(join(root, 'public', 'static.html'), 'utf8');
await writeFile(join(out, 'index.html'), `<!doctype html>\n<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">\n${body}\n</html>`);
console.log('已輸出 dist-demo/（以任何靜態伺服器開啟 index.html）');
