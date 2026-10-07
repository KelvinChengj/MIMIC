import test from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.MIMIC_DATA = join(tmpdir(), `mimic-${process.pid}.json`);
const { server } = await import('../server/index.js');

let base;
test.before(() => new Promise((r) => server.listen(0, () => { base = `http://localhost:${server.address().port}`; r(); })));
test.after(() => server.close());
const j = (p, o) => fetch(base + p, o).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
const put = (p, body) => j(p, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('範例頁面存在', async () => {
  const r = await j('/api/pages');
  assert.ok(r.body.some((p) => p.slug === 'demo'));
});

test('建立 / 讀取 / 刪除頁面', async () => {
  const page = { title: '測試', lights: [{ id: 'a', label: 'L', fallback: 'green', rules: [{ id: 'r', color: 'red', mode: 'all', conds: [{ tag: 'CH-01.CHWS_T', op: '>', value: 8, value2: null }] }] }] };
  assert.equal((await put('/api/pages/t-1', page)).status, 200);
  const got = await j('/api/pages/t-1');
  assert.equal(got.body.lights[0].rules[0].conds[0].value, 8);
  assert.equal((await j('/api/pages/t-1', { method: 'DELETE' })).status, 200);
  assert.equal((await j('/api/pages/t-1')).status, 404);
});

test('驗證：非法網址與內容', async () => {
  assert.equal((await put('/api/pages/Bad_Slug', { title: 'x', lights: [] })).status, 400);
  assert.equal((await put('/api/pages/ok', { title: '', lights: [] })).status, 400);
  const r = await put('/api/pages/ok2', { title: 'x', lights: [{ id: 1, label: 'x', fallback: 'gray', rules: [{ color: 'gray', mode: 'zz', conds: [{ tag: 't', op: 'DROP', value: 'x' }] }] }] });
  assert.equal(r.status, 200); // 淨化而非拒絕
  assert.equal(r.body.lights[0].fallback, 'green');
  assert.equal(r.body.lights[0].rules[0].conds[0].op, '>');
  assert.equal(r.body.lights[0].rules[0].conds[0].value, null);
});

test('FDM 資料點與數值', async () => {
  const tags = await j('/api/fdm/tags');
  assert.ok(tags.body.tags.length > 5);
  const v = await j('/api/fdm/values?tags=CH-01.CHWS_T,AHU-03.SUP_T,nope');
  assert.equal(typeof v.body.values['CH-01.CHWS_T'].value, 'number');
  assert.equal(v.body.values['AHU-03.SUP_T'], null);
  assert.equal(v.body.values.nope, null);
});

test('SPA 路由回傳 index.html，且擋路徑穿越', async () => {
  const r = await fetch(base + '/p/demo/edit');
  assert.match(await r.text(), /<main id="app">/);
  const t = await fetch(base + '/..%2f..%2fpackage.json');
  assert.notEqual(t.status, 200);
});
