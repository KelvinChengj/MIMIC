import { evaluate, lightTags, COLOR_LABEL, COLOR_NAME, OPS, opArgs } from './logic.js';

/* ───────── 小工具 ───────── */
const $app = document.getElementById('app');
const $crumbs = document.getElementById('crumbs');
const uid = () => Math.random().toString(36).slice(2, 8);
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;
const POLL_MS = 5000;

async function api(path, opts = {}) {
  const res = await fetch('/api' + path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

// 以 DOM API 建立節點（文字一律走 text node，無 XSS 風險）
function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  el.append(...kids.flat(Infinity).filter((k) => k != null && k !== false));
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.className = v;
    else if (k in el && k !== 'list') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  return el;
}

let toastTimer;
function toast(msg, kind = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.dataset.kind = kind;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 2800);
}

const fmtTime = (d = new Date()) => d.toLocaleTimeString('zh-TW', { hour12: false });
const fmtNum = (v) => { const k = Math.abs(v) >= 1000 ? 1 : Math.abs(v) >= 10 ? 100 : 1000; return String(Math.round(v * k) / k); };

/* ───────── FDM 資料 ───────── */
let tagCatalog = null; // { mode, tags, byTag }
async function loadTags() {
  if (tagCatalog) return tagCatalog;
  const { mode, tags } = await api('/fdm/tags');
  tagCatalog = { mode, tags, byTag: Object.fromEntries(tags.map((t) => [t.tag, t])) };
  return tagCatalog;
}

function setBadge(state, text) {
  const b = document.getElementById('fdm-badge');
  b.className = 'badge ' + state;
  b.textContent = text;
}

// 週期輪詢 FDM；失敗時以空資料回報（所有燈號轉灰）
function startPolling(getTags, onData) {
  let stopped = false, timer;
  const tick = async () => {
    let payload;
    try {
      const tags = getTags();
      payload = tags.length ? await api('/fdm/values?tags=' + encodeURIComponent(tags.join(','))) : { mode: tagCatalog?.mode, values: {} };
      setBadge('ok', payload.mode === 'mock' ? 'FDM 模擬資料' : 'FDM 已連線');
    } catch {
      payload = { values: {}, failed: true };
      setBadge('err', 'FDM 連線失敗');
    }
    if (stopped) return;
    onData(payload.values || {}, payload);
    timer = setTimeout(tick, POLL_MS);
  };
  tick();
  return () => { stopped = true; clearTimeout(timer); };
}

/* ───────── 路由 ───────── */
let current = null; // { dispose?, dirty? }
async function navigate(url, { replace = false, force = false } = {}) {
  if (!force && current?.dirty?.() && !confirm('有尚未儲存的變更，確定離開？')) return;
  if (replace) history.replaceState(null, '', url); else history.pushState(null, '', url);
  await render();
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-link]');
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
  e.preventDefault();
  navigate(a.getAttribute('href'));
});
window.addEventListener('popstate', () => render());
window.addEventListener('beforeunload', (e) => { if (current?.dirty?.()) { e.preventDefault(); e.returnValue = ''; } });

function setCrumbs(...items) {
  $crumbs.replaceChildren(...items.map((it) => (it.href ? h('a', { href: it.href, 'data-link': true }, it.text) : h('span', {}, it.text))));
}

async function render() {
  current?.dispose?.();
  current = null;
  document.body.classList.remove('tv');
  const path = location.pathname.replace(/\/+$/, '') || '/';
  const m = path.match(/^\/p\/([^/]+)(\/edit)?$/);
  try {
    await loadTags();
    if (path === '/') current = await homeView();
    else if (m) current = await (m[2] ? editorView(m[1]) : pageView(m[1]));
    else current = notFound('找不到此網址');
  } catch (err) {
    current = notFound(err.message);
  }
}

function notFound(msg) {
  setCrumbs();
  $app.replaceChildren(h('div', { class: 'empty' }, h('div', { class: 'empty-icon' }, '○'), h('h2', {}, msg), h('a', { class: 'btn', href: '/', 'data-link': true }, '回到頁面清單')));
  return {};
}

/* ───────── 共用元件：燈號 ───────── */
function readingLines(light, values, max = 3) {
  return lightTags(light).slice(0, max).map((t) => {
    const meta = tagCatalog.byTag[t];
    const v = values[t]?.value;
    return h('div', { class: 'reading' },
      h('span', { class: 'reading-name' }, meta?.name || t),
      h('span', { class: 'reading-val' }, v == null ? '—' : `${fmtNum(v)} ${meta?.unit || ''}`));
  });
}

function updateTile(tile, light, values) {
  const res = evaluate(light, values);
  tile.className = tile.className.replace(/\bc-\w+/g, '').trim() + ' c-' + res.color;
  tile.title = `${COLOR_LABEL[res.color]}｜${res.reason}`;
  const lamp = tile.querySelector('.lamp');
  lamp.setAttribute('aria-label', COLOR_LABEL[res.color]);
  const rd = tile.querySelector('.readings');
  if (rd) rd.replaceChildren(...readingLines(light, values));
  return res;
}

function lightTile(light, values, extra = {}) {
  const tile = h('div', { class: 'tile', 'data-id': light.id, ...extra },
    h('div', { class: 'lamp', role: 'img' }),
    h('div', { class: 'tile-label' }, light.label || '（未命名）'),
    h('div', { class: 'readings' }));
  updateTile(tile, light, values);
  return tile;
}

function summarize(lights, values) {
  const n = { red: 0, yellow: 0, green: 0, gray: 0 };
  lights.forEach((l) => n[evaluate(l, values).color]++);
  return n;
}

function legend(counts) {
  return h('div', { class: 'legend' }, ['red', 'yellow', 'green', 'gray'].map((c) =>
    h('div', { class: `legend-item c-${c}` }, h('span', { class: 'dot' }), h('span', { class: 'legend-label' }, `${COLOR_NAME[c]}・${COLOR_LABEL[c]}`), h('b', { 'data-count': c }, counts[c]))));
}

/* ───────── 首頁：頁面清單 ───────── */
async function homeView() {
  setCrumbs();
  const pages = await api('/pages');

  const dlg = createPageDialog();
  const grid = h('div', { class: 'cards' },
    pages.map((p) => h('div', { class: 'card' },
      h('a', { class: 'card-main', href: `/p/${p.slug}`, 'data-link': true },
        h('div', { class: 'card-title' }, p.title),
        h('div', { class: 'card-meta' }, h('code', {}, `/p/${p.slug}`), h('span', {}, `${p.lightCount} 個燈號`))),
      h('div', { class: 'card-actions' },
        h('a', { class: 'btn small', href: `/p/${p.slug}/edit`, 'data-link': true }, '編輯'),
        h('button', { class: 'btn small danger', onclick: async () => {
          if (!confirm(`刪除頁面「${p.title}」？此動作無法復原。`)) return;
          await api(`/pages/${p.slug}`, { method: 'DELETE' });
          toast('已刪除'); navigate('/', { replace: true, force: true });
        } }, '刪除')))),
    h('button', { class: 'card card-new', onclick: () => dlg.showModal() }, h('span', { class: 'plus' }, '＋'), '新增 MIMIC 頁面'));

  $app.replaceChildren(h('section', { class: 'wrap' },
    h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, '我的 MIMIC 頁面'), h('p', { class: 'muted' }, '每個頁面都有獨立網址，可自行用積木組合燈號邏輯。'))),
    pages.length ? null : h('p', { class: 'muted' }, '還沒有任何頁面，先建立一個吧。'),
    grid, dlg));
  return {};
}

function createPageDialog() {
  const title = h('input', { type: 'text', required: true, maxLength: 60, placeholder: '例如：冰水系統總覽' });
  const slug = h('input', { type: 'text', required: true, maxLength: 40, placeholder: 'chiller-overview', pattern: '[a-z0-9][a-z0-9\\-]*' });
  let slugTouched = false;
  slug.addEventListener('input', () => (slugTouched = true));
  title.addEventListener('input', () => {
    if (slugTouched) return;
    slug.value = title.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  });
  const dlg = h('dialog', { class: 'dlg' },
    h('form', { method: 'dialog', onsubmit: async (e) => {
      e.preventDefault();
      if (!SLUG_RE.test(slug.value)) return toast('網址代稱只能使用小寫英文、數字與連字號', 'err');
      try {
        const exists = await api(`/pages/${slug.value}`).then(() => true, () => false);
        if (exists) return toast('此網址已被使用', 'err');
        await api(`/pages/${slug.value}`, { method: 'PUT', body: JSON.stringify({ title: title.value.trim(), lights: [] }) });
        dlg.close();
        navigate(`/p/${slug.value}/edit`, { force: true });
      } catch (err) { toast(err.message, 'err'); }
    } },
      h('h2', {}, '新增 MIMIC 頁面'),
      h('label', {}, '頁面名稱', title),
      h('label', {}, '網址代稱', h('div', { class: 'slug-row' }, h('span', { class: 'muted' }, `${location.origin}/p/`), slug)),
      h('div', { class: 'dlg-actions' },
        h('button', { type: 'button', class: 'btn', onclick: () => dlg.close() }, '取消'),
        h('button', { type: 'submit', class: 'btn primary' }, '建立並編輯'))));
  return dlg;
}

/* ───────── 檢視頁 ───────── */
async function pageView(slug) {
  const page = await api(`/pages/${slug}`);
  setCrumbs({ text: '頁面', href: '/' }, { text: page.title });
  document.title = `${page.title}｜MIMIC`;

  const grid = h('div', { class: 'tiles' });
  const stamp = h('span', { class: 'muted' }, '載入中…');
  const legendBox = h('div', {});
  const banner = h('div', { class: 'banner', hidden: true }, '無法取得 FDM 資料，所有燈號暫以灰燈顯示。');
  const tiles = new Map();
  page.lights.forEach((l) => { const t = lightTile(l, {}); tiles.set(l.id, t); grid.append(t); });

  $app.replaceChildren(h('section', { class: 'wrap' },
    h('div', { class: 'page-head' },
      h('div', {}, h('h1', {}, page.title), h('p', { class: 'muted' }, h('code', {}, location.pathname), '　更新於 ', stamp)),
      h('div', { class: 'head-actions' },
        h('button', { class: 'btn', onclick: () => { document.body.classList.add('tv'); document.documentElement.requestFullscreen?.().catch(() => {}); } }, '看板模式'),
        h('a', { class: 'btn primary', href: `/p/${slug}/edit`, 'data-link': true }, '編輯積木'))),
    banner, legendBox,
    page.lights.length ? grid : h('div', { class: 'empty' }, h('h3', {}, '這個頁面還沒有燈號'), h('a', { class: 'btn primary', href: `/p/${slug}/edit`, 'data-link': true }, '開始編輯'))));

  const exitTv = (e) => { if (e.key === 'Escape') document.body.classList.remove('tv'); };
  document.addEventListener('keydown', exitTv);

  const stop = startPolling(() => [...new Set(page.lights.flatMap(lightTags))], (values, p) => {
    page.lights.forEach((l) => updateTile(tiles.get(l.id), l, values));
    legendBox.replaceChildren(legend(summarize(page.lights, values)));
    banner.hidden = !p.failed;
    stamp.textContent = fmtTime();
  });
  return { dispose() { stop(); document.removeEventListener('keydown', exitTv); document.body.classList.remove('tv'); } };
}

/* ───────── 編輯頁：積木 ───────── */
let dragInfo = null; // { kind, index }
function reorder(arr, from, to) { // to = 插入位置（以原陣列索引計）
  const [item] = arr.splice(from, 1);
  arr.splice(from < to ? to - 1 : to, 0, item);
}

// 讓 el 可由 handle 拖曳排序；kind 用來區分不同清單
function makeSortable(el, handle, kind, index, onDrop, horizontal = false) {
  handle.addEventListener('pointerdown', () => (el.draggable = true));
  el.addEventListener('dragend', () => { el.draggable = false; el.classList.remove('dragging'); document.querySelectorAll('.drop-before,.drop-after').forEach((n) => n.classList.remove('drop-before', 'drop-after')); dragInfo = null; });
  el.addEventListener('dragstart', (e) => { dragInfo = { kind, index }; el.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', kind); e.stopPropagation(); });
  const after = (e) => { const r = el.getBoundingClientRect(); return horizontal ? e.clientX > r.left + r.width / 2 : e.clientY > r.top + r.height / 2; };
  el.addEventListener('dragover', (e) => {
    if (dragInfo?.kind !== kind) return;
    e.preventDefault(); e.stopPropagation();
    const a = after(e);
    el.classList.toggle('drop-after', a); el.classList.toggle('drop-before', !a);
  });
  el.addEventListener('dragleave', () => el.classList.remove('drop-before', 'drop-after'));
  el.addEventListener('drop', (e) => {
    if (dragInfo?.kind !== kind) return;
    e.preventDefault(); e.stopPropagation();
    onDrop(dragInfo.index, index + (after(e) ? 1 : 0));
  });
}

// 積木庫中的來源積木：拖曳或點擊皆可加入
function paletteBlock(cls, title, desc, kind, onAdd) {
  const b = h('div', { class: `pal-block ${cls}`, draggable: true, tabIndex: 0, role: 'button', onclick: onAdd, onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAdd(); } } },
    h('div', { class: 'pal-title' }, title), h('div', { class: 'pal-desc' }, desc));
  b.addEventListener('dragstart', (e) => { dragInfo = { kind, index: -1 }; e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('text/plain', kind); });
  b.addEventListener('dragend', () => (dragInfo = null));
  return b;
}
function dropZone(el, kind, onDrop) {
  el.addEventListener('dragover', (e) => { if (dragInfo?.kind === kind && dragInfo.index === -1) { e.preventDefault(); el.classList.add('drop-hot'); } });
  el.addEventListener('dragleave', (e) => { if (!el.contains(e.relatedTarget)) el.classList.remove('drop-hot'); });
  el.addEventListener('drop', (e) => { el.classList.remove('drop-hot'); if (dragInfo?.kind === kind && dragInfo.index === -1) { e.preventDefault(); onDrop(); } });
}

function colorPicker(value, onPick, colors = ['red', 'yellow', 'green']) {
  const wrap = h('div', { class: 'cpick', role: 'radiogroup' });
  const paint = () => wrap.replaceChildren(...colors.map((c) =>
    h('button', { type: 'button', class: `cdot c-${c}${c === value ? ' on' : ''}`, role: 'radio', 'aria-checked': String(c === value), title: `${COLOR_NAME[c]}・${COLOR_LABEL[c]}`,
      onclick: () => { value = c; onPick(c); paint(); } }, h('span', { class: 'lamp-mini' }), h('span', {}, COLOR_NAME[c]))));
  paint();
  return wrap;
}

async function editorView(slug) {
  const page = await api(`/pages/${slug}`);
  const draft = structuredClone({ title: page.title, lights: page.lights });
  let saved = JSON.stringify(draft);
  let selectedId = draft.lights[0]?.id ?? null;
  let values = {};
  document.title = `編輯 ${page.title}｜MIMIC`;
  setCrumbs({ text: '頁面', href: '/' }, { text: page.title, href: `/p/${slug}` }, { text: '編輯' });

  const dirty = () => JSON.stringify(draft) !== saved;
  const selected = () => draft.lights.find((l) => l.id === selectedId);

  const saveBtn = h('button', { class: 'btn primary', onclick: save }, '儲存');
  const dirtyMark = h('span', { class: 'dirty', hidden: true }, '● 未儲存');
  const titleInput = h('input', { class: 'title-input', value: draft.title, maxLength: 60, 'aria-label': '頁面名稱', oninput: (e) => { draft.title = e.target.value; touch(); } });
  const canvas = h('div', { class: 'tiles editor-tiles' });
  const logic = h('div', { class: 'logic' });
  const dl = h('datalist', { id: 'tag-list' }, tagCatalog.tags.map((t) => h('option', { value: t.tag }, `${t.name}（${t.area}）`)));

  function touch() { dirtyMark.hidden = !dirty(); refreshLive(); }

  async function save() {
    if (!draft.title.trim()) return toast('頁面名稱不可為空', 'err');
    try {
      await api(`/pages/${slug}`, { method: 'PUT', body: JSON.stringify(draft) });
      saved = JSON.stringify(draft); touch(); toast('已儲存 ✓');
    } catch (e) { toast(e.message, 'err'); }
  }

  /* 畫布：燈號積木 */
  function addLight() {
    const l = { id: uid(), label: `燈號 ${draft.lights.length + 1}`, fallback: 'green', rules: [] };
    draft.lights.push(l); selectedId = l.id; renderCanvas(); renderLogic(); touch();
  }
  function renderCanvas() {
    canvas.replaceChildren(...draft.lights.map((l, i) => {
      const handle = h('span', { class: 'grip', title: '拖曳排序' }, '⋮⋮');
      const tile = lightTile(l, values, { class: 'tile editable' + (l.id === selectedId ? ' selected' : ''), tabIndex: 0, onclick: () => { selectedId = l.id; renderCanvas(); renderLogic(); } });
      tile.classList.toggle('selected', l.id === selectedId);
      tile.append(h('div', { class: 'tile-tools' }, handle,
        h('button', { class: 'icon', title: '複製', onclick: (e) => { e.stopPropagation(); const c = structuredClone(l); c.id = uid(); c.label += ' 複本'; draft.lights.splice(i + 1, 0, c); selectedId = c.id; renderCanvas(); renderLogic(); touch(); } }, '⧉'),
        h('button', { class: 'icon', title: '刪除', onclick: (e) => { e.stopPropagation(); if (l.rules.length && !confirm(`刪除燈號「${l.label}」？`)) return; draft.lights.splice(i, 1); if (selectedId === l.id) selectedId = draft.lights[0]?.id ?? null; renderCanvas(); renderLogic(); touch(); } }, '✕')));
      makeSortable(tile, handle, 'light', i, (from, to) => { reorder(draft.lights, from, to); renderCanvas(); touch(); }, true);
      return tile;
    }).concat(draft.lights.length ? [] : [h('div', { class: 'canvas-empty' }, '把左邊的「燈號」積木拖到這裡，或直接點擊它')]));
  }
  dropZone(canvas, 'new-light', addLight);

  /* 邏輯面板：規則積木 */
  function renderLogic() {
    const light = selected();
    if (!light) { logic.replaceChildren(h('div', { class: 'logic-empty' }, '選擇一個燈號，在這裡用積木編輯它的判斷邏輯。')); return; }

    const addRule = () => { light.rules.push({ id: uid(), color: 'red', mode: 'any', conds: [{ tag: '', op: '>', value: null, value2: null }] }); renderLogic(); touch(); };
    const stack = h('div', { class: 'stack' });
    stack.append(
      h('div', { class: 'blk hat' }, h('b', {}, '當 FDM 資料更新時')),
      h('div', { class: 'blk lock' }, '若任一資料點「無資料」', h('span', { class: 'arrow' }, '→'), colorChip('gray'), h('span', { class: 'lock-note' }, '系統內建')),
      ...light.rules.map((r, i) => ruleBlock(light, r, i)),
      h('div', { class: 'blk else' }, '否則亮', colorPicker(light.fallback, (c) => { light.fallback = c; touch(); })),
    );
    dropZone(stack, 'new-rule', addRule);

    logic.replaceChildren(
      h('div', { class: 'logic-head' },
        h('label', {}, '燈號名稱', h('input', { type: 'text', value: light.label, maxLength: 40, oninput: (e) => { light.label = e.target.value; canvas.querySelector(`[data-id="${light.id}"] .tile-label`).textContent = e.target.value || '（未命名）'; touch(); } }))),
      h('div', { class: 'logic-hint' }, '規則由上而下判斷，', h('b', {}, '第一個成立'), '的規則決定燈號顏色。'),
      stack,
      h('button', { class: 'btn add-rule', onclick: addRule }, '＋ 加入「如果…就亮…」積木'),
      h('div', { class: 'preview', id: 'preview' }));
    refreshLive();
  }

  function colorChip(c) { return h('span', { class: `chip c-${c}` }, h('span', { class: 'lamp-mini' }), COLOR_NAME[c]); }

  function ruleBlock(light, r, i) {
    const handle = h('span', { class: 'grip', title: '拖曳排序' }, '⋮⋮');
    const addCond = () => { r.conds.push({ tag: '', op: '>', value: null, value2: null }); renderLogic(); touch(); };
    const el = h('div', { class: 'blk rule', 'data-rule': i },
      h('div', { class: 'rule-head' }, handle,
        h('span', { class: 'idx' }, i + 1), '如果',
        h('select', { value: r.mode, onchange: (e) => { r.mode = e.target.value; touch(); } },
          h('option', { value: 'any' }, '符合任一'), h('option', { value: 'all' }, '符合全部')),
        '條件',
        h('span', { class: 'spacer' }),
        h('button', { class: 'icon', title: '刪除規則', onclick: () => { light.rules.splice(i, 1); renderLogic(); touch(); } }, '✕')),
      h('div', { class: 'conds' }, r.conds.map((c, ci) => condBlock(r, c, ci)),
        h('button', { class: 'btn small ghost', onclick: addCond }, '＋ 條件')),
      h('div', { class: 'rule-foot' }, '則亮', colorPicker(r.color, (c) => { r.color = c; touch(); })));
    makeSortable(el, handle, 'rule', i, (from, to) => { reorder(light.rules, from, to); renderLogic(); touch(); });
    return el;
  }

  function condBlock(r, c, ci) {
    const meta = tagCatalog.byTag[c.tag];
    const numIn = (key, ph) => h('input', { type: 'number', step: 'any', class: 'num', placeholder: ph, value: c[key] ?? '', 'aria-label': ph,
      oninput: (e) => { c[key] = e.target.value === '' ? null : Number(e.target.value); touch(); } });
    const two = opArgs(c.op) === 2;
    return h('div', { class: 'blk cond' },
      h('div', { class: 'cond-row' },
        h('input', { type: 'text', class: 'tag', list: 'tag-list', placeholder: '選擇 FDM 資料點…', value: c.tag, 'aria-label': 'FDM 資料點', spellcheck: false,
          onchange: (e) => { c.tag = e.target.value.trim(); renderLogic(); touch(); } }),
        h('select', { value: c.op, 'aria-label': '運算子', onchange: (e) => { c.op = e.target.value; renderLogic(); touch(); } },
          OPS.map((o) => h('option', { value: o.op }, o.label))),
        numIn('value', two ? '下限' : '門檻值'),
        two ? [h('span', { class: 'tilde' }, '~'), numIn('value2', '上限')] : null,
        h('button', { class: 'icon', title: '移除條件', onclick: () => { r.conds.splice(ci, 1); renderLogic(); touch(); } }, '✕')),
      c.tag ? h('div', { class: `cond-meta${meta ? '' : ' warn'}` }, meta ? `${meta.name}・${meta.area}${meta.unit ? `・${meta.unit}` : ''}` : '⚠ 找不到此資料點') : null);
  }

  /* 即時預覽：用真實 FDM 數值評估目前（未儲存）的邏輯 */
  function refreshLive() {
    draft.lights.forEach((l) => { const t = canvas.querySelector(`[data-id="${l.id}"]`); if (t) updateTile(t, l, values); });
    const box = document.getElementById('preview');
    const light = selected();
    if (!box || !light) return;
    const res = evaluate(light, values);
    box.className = `preview c-${res.color}`;
    box.replaceChildren(
      h('div', { class: 'lamp big' }),
      h('div', {}, h('div', { class: 'pv-title' }, `目前：${COLOR_NAME[res.color]}・${COLOR_LABEL[res.color]}`), h('div', { class: 'muted' }, res.reason),
        h('div', { class: 'readings' }, readingLines(light, values, 8))));
  }

  /* 版面 */
  const palette = h('aside', { class: 'palette' },
    h('h3', {}, '積木庫'),
    h('p', { class: 'muted' }, '拖曳到右側，或直接點擊'),
    h('div', { class: 'pal-group' }, h('div', { class: 'pal-cap' }, '頁面積木'),
      paletteBlock('p-light', '燈號', '顯示紅／黃／綠／灰的狀態燈', 'new-light', addLight)),
    h('div', { class: 'pal-group' }, h('div', { class: 'pal-cap' }, '燈號邏輯積木'),
      paletteBlock('p-rule', '如果…就亮…', '一組條件 + 結果顏色', 'new-rule', () => { if (!selected()) return toast('請先選擇一個燈號'); logic.querySelector('.add-rule').click(); })),
    h('div', { class: 'pal-legend' },
      ['red', 'yellow', 'green', 'gray'].map((c) => h('div', { class: `legend-item c-${c}` }, h('span', { class: 'dot' }), `${COLOR_NAME[c]}・${COLOR_LABEL[c]}`))));

  $app.replaceChildren(h('section', { class: 'editor' },
    h('div', { class: 'editor-bar' },
      titleInput, h('code', { class: 'url' }, `/p/${slug}`), dirtyMark, h('span', { class: 'spacer' }),
      h('a', { class: 'btn', href: `/p/${slug}`, 'data-link': true }, '檢視'), saveBtn),
    h('div', { class: 'editor-grid' },
      palette,
      h('section', { class: 'panel' }, h('h3', {}, '頁面畫布'), canvas),
      h('section', { class: 'panel' }, h('h3', {}, '燈號邏輯'), logic)),
    dl));

  renderCanvas(); renderLogic();
  const onKey = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); save(); } };
  document.addEventListener('keydown', onKey);
  const stop = startPolling(() => [...new Set(draft.lights.flatMap(lightTags))], (v) => { values = v; refreshLive(); });
  return { dirty, dispose() { stop(); document.removeEventListener('keydown', onKey); } };
}

render();
