import { beforeAll, describe, expect, it } from 'vitest';
import { allLayoutPages, builtinLayoutPage } from '../blocks/builtin';
import { registerBuiltinBlocks } from '../blocks/index';
import type { LampProps, Layer } from '../types';
import { layerOf } from './pages';
import { exportPage, parsePageJson, SAMPLE_PAGE_JSON, stringifyPage, type ImportContext, type PageJson } from './pageJson';

beforeAll(() => registerBuiltinBlocks());

const ctx: ImportContext = { layerOfPage: (slug) => { const p = builtinLayoutPage(slug); return p && layerOf(p); } };
const parse = (v: unknown) => parsePageJson(typeof v === 'string' ? v : JSON.stringify(v), ctx);
/** 範例的可修改複本 */
const sample = (): any => structuredClone(SAMPLE_PAGE_JSON);
const errorsOf = (v: unknown) => { const r = parse(v); return r.ok ? [] : r.errors; };
const warningsOf = (v: unknown) => { const r = parse(v); return r.ok ? r.warnings : ['（不能匯入）']; };

describe('頁面 JSON：匯出再匯入', () => {
  it('所有內建頁面匯出後都能原樣匯入（積木、層級、底圖一致，沒有警告）', () => {
    const pages = allLayoutPages([]);
    expect(pages.length).toBeGreaterThan(30);
    for (const page of pages) {
      const layer = layerOf(page);
      const r = parse(stringifyPage(exportPage(page, { layer })));
      expect(r.ok, `${page.slug}: ${r.ok ? '' : r.errors.join(' / ')}`).toBe(true);
      if (!r.ok) continue;
      expect(r.warnings, page.slug).toEqual([]);
      expect(r.page.title).toBe(page.title);
      expect(r.page.layer).toBe(layer);
      expect(r.page.blocks).toEqual(page.blocks);
      expect(r.page.background?.src).toBe(page.background?.src);
    }
  });

  it('System / Phase 一起匯出；不在選項內的不輸出', () => {
    const page = builtinLayoutPage('f18p2-water')!;
    expect(exportPage(page, { layer: 'duty', system: '超純水', phase: 'F18P2' }).page).toMatchObject({ system: '超純水', phase: 'F18P2' });
    expect(exportPage(page, { layer: 'duty', system: '超純水、電力', phase: '' }).page).not.toHaveProperty('system');
  });

  it('上傳的底圖可以選擇不帶；內建底圖一律保留', () => {
    const base = builtinLayoutPage('cleanroom-hvac')!;
    const uploaded = { ...base, background: { src: 'data:image/png;base64,AAAA', width: 900, height: 500, name: 'plan.png' } };
    expect(exportPage(uploaded, { layer: 'duty' }, false).page.background).toBeUndefined();
    expect(exportPage(uploaded, { layer: 'duty' }, true).page.background).toMatchObject({ src: 'data:image/png;base64,AAAA', width: 900, height: 500 });
    expect(exportPage(base, { layer: 'duty' }, false).page.background?.src).toBe('builtin:f18p2-3f-cleanroom');
  });

  it('舊版燈號（整個情境）匯出成 virtual tag', () => {
    const page = { ...builtinLayoutPage('upw')!, blocks: [{ id: 'a', type: 'lamp', title: '', size: 'M' as const, x: 0, y: 0, props: { source: { site: 'f18p2', system: 'upw' } } }] };
    expect(exportPage(page, { layer: 'duty' }).page.blocks[0].props).toEqual({ vtag: { site: 'f18p2', name: 'F18P2.UPW.LAMP' } });
  });

  it('README 的格式範例可以匯入', () => {
    const r = parse({
      format: 'mimic.page', version: 1,
      page: {
        title: 'F18P2 純水值班', layer: 'duty', system: '超純水', phase: 'F18P2',
        background: { src: 'builtin:f18p2-3f-cleanroom', opacity: 1 },
        blocks: [
          { id: 'title', type: 'text', size: 'M', x: 24, y: 24, props: { text: 'F18P2 純水關鍵單元' } },
          { id: 'pol', type: 'lamp', title: '拋光', size: 'L', x: 24, y: 80, props: { vtag: { site: 'f18p2', name: 'F18P2.UPW.POL.LAMP' } } },
        ],
      },
    });
    expect(r).toMatchObject({ ok: true, warnings: [] });
  });

  it('範例可以直接匯入', () => {
    const r = parse(SAMPLE_PAGE_JSON);
    expect(r).toMatchObject({ ok: true, warnings: [] });
  });
});

describe('頁面 JSON：擋下不良輸入', () => {
  it('空白、不是 JSON、不是物件', () => {
    expect(errorsOf('   ')).toEqual(['請貼上 JSON 或選擇檔案']);
    expect(errorsOf('{ "format": ')[0]).toMatch(/^不是合法的 JSON/);
    expect(errorsOf('[1,2]')[0]).toMatch(/最外層必須是物件/);
    expect(errorsOf('null')[0]).toMatch(/最外層必須是物件/);
  });

  it('format / version / page', () => {
    expect(errorsOf({ ...sample(), format: 'other' })).toEqual(['format：必須是 "mimic.page"']);
    expect(errorsOf({ ...sample(), version: 2 })[0]).toMatch(/比這個版本支援的 1 新/);
    expect(errorsOf({ ...sample(), version: '1' })[0]).toMatch(/version：必須是數字/);
    expect(errorsOf({ format: 'mimic.page', version: 1 })).toEqual(['page：必須是物件（頁面內容）']);
    expect(errorsOf({ format: 'mimic.page', version: 1, page: [] })).toEqual(['page：必須是物件（頁面內容）']);
  });

  it('頁面名稱、層級、blocks 必填', () => {
    const s = sample();
    delete s.page.title; s.page.layer = 'top'; s.page.blocks = {};
    expect(errorsOf(s)).toEqual([
      'page.title：必填，頁面名稱',
      'page.layer：必須是 "duty"（值班情境）或 "command"（戰情指揮官）',
      'page.blocks：必須是陣列（可以是空陣列 []）',
    ]);
  });

  it('積木種類與層級：不認得的種類、放錯層', () => {
    const s = sample();
    s.page.blocks.push({ type: 'chart', x: 0, y: 0, props: {} });
    s.page.blocks.push({ type: 'duty', title: '指揮', x: 0, y: 0, props: { page: 'upw' } });
    const e = errorsOf(s);
    expect(e[0]).toMatch(/page\.blocks\[4\]\.type：不認得的積木種類「chart」/);
    expect(e[1]).toMatch(/page\.blocks\[5\]（指揮）：「值班情境燈號」積木不能放在值班情境頁/);
    const c = sample(); c.page.layer = 'command';
    expect(errorsOf(c).filter((x) => x.includes('「燈號」積木不能放在戰情指揮官頁'))).toHaveLength(3);
  });

  it('尺寸、座標、內容的型別', () => {
    const s = sample();
    s.page.blocks[1].size = 'XL';
    s.page.blocks[2].x = '240';
    s.page.blocks[2].y = -5;
    s.page.blocks[3].x = 1e9;
    s.page.blocks[0].props = { text: 123 };
    s.page.blocks[1].props = { vtag: 'F18P2.UPW.POL.LAMP' };
    const e = errorsOf(s);
    expect(e).toEqual([
      'page.blocks[0]（text）.props.text：必填，文字內容',
      'page.blocks[1]（拋光）.size：必須是 "S"、"M" 或 "L"',
      'page.blocks[1]（拋光）.props.vtag：必須是 { "site": "f18p2", "name": "F18P2.UPW.LAMP" }',
      'page.blocks[2]（RO 逆滲透）.x：必須是 0～10000 的數字',
      'page.blocks[2]（RO 逆滲透）.y：必須是 0～10000 的數字',
      'page.blocks[3]（EDI 混床）.x：必須是 0～10000 的數字',
    ]);
  });

  it('積木數量上限', () => {
    const s = sample();
    s.page.blocks = Array.from({ length: 301 }, (_, i) => ({ type: 'text', x: i, y: 0, props: { text: 't' } }));
    expect(errorsOf(s)).toEqual(['page.blocks：301 個積木，超過上限 300']);
  });

  it('內容太大', () => {
    expect(errorsOf(' '.repeat(10) + 'x'.repeat(3 * 1024 * 1024 + 1))[0]).toMatch(/內容太大/);
  });

  it('底圖：只接受內建代號或內嵌圖檔，不接受外部網址', () => {
    const bg = (background: unknown) => { const s = sample(); s.page.background = background; return s; };
    expect(errorsOf(bg({ src: 'https://example.com/plan.png', width: 800, height: 600 }))[0]).toMatch(/不接受外部網址/);
    expect(errorsOf(bg({ src: 'javascript:alert(1)', width: 800, height: 600 }))[0]).toMatch(/不接受外部網址/);
    expect(errorsOf(bg({ src: 'data:text/html;base64,AAAA', width: 800, height: 600 }))[0]).toMatch(/不接受外部網址/);
    expect(errorsOf(bg({ src: 'builtin:nope' }))[0]).toMatch(/沒有「builtin:nope」這張內建底圖/);
    expect(errorsOf(bg('plan.png'))[0]).toMatch(/page\.background：必須是物件/);
    expect(errorsOf(bg({ src: 'data:image/png;base64,AAAA', width: 10, height: 600 }))[0]).toMatch(/100～5000/);
    expect(errorsOf(bg({ src: 'data:image/png;base64,' + 'A'.repeat(2_400_000), width: 800, height: 600 }))[0]).toMatch(/圖檔太大/);
    const ok = parse(bg({ src: 'data:image/png;base64,AAAA', width: 900.4, height: 500, opacity: 5, extra: 1 }));
    expect(ok.ok && ok.page.background).toEqual({ src: 'data:image/png;base64,AAAA', width: 900, height: 500, opacity: 1, v: 2 });
    const builtin = parse(bg({ src: 'builtin:f18p2-3f-cleanroom', width: 1, height: 1 }));
    expect(builtin.ok && builtin.page.background).toMatchObject({ width: 1200, height: 720, v: 2 });
  });
});

describe('頁面 JSON：可以匯入但要提醒', () => {
  it('找不到的 virtual tag、沒綁 virtual tag', () => {
    const s = sample();
    s.page.blocks[1].props.vtag.name = 'F18P2.NOPE.LAMP';
    s.page.blocks[2].props = {};
    const w = warningsOf(s);
    expect(w[0]).toMatch(/找不到 virtual tag「F18P2\.NOPE\.LAMP」/);
    expect(w[1]).toMatch(/沒有綁 virtual tag/);
  });

  it('值班情境燈號指向不存在的頁面或指揮官頁', () => {
    const cmd = (page: string): PageJson => ({ format: 'mimic.page', version: 1, page: { title: '指揮', layer: 'command' as Layer, blocks: [{ id: 'a', type: 'duty', title: 'X', size: 'L', x: 0, y: 0, props: { page } }] } });
    expect(warningsOf(cmd('upw'))).toEqual([]);
    expect(warningsOf(cmd('no-such-page'))[0]).toMatch(/找不到值班情境頁「no-such-page」/);
    expect(warningsOf(cmd('stsp'))[0]).toMatch(/不是值班情境頁/);
    expect(errorsOf(cmd('../etc'))[0]).toMatch(/props\.page：必填/);
  });

  it('System / Phase 不在選項內：清掉並提醒', () => {
    const s = sample(); s.page.system = '水'; s.page.phase = 'F99';
    const r = parse(s);
    expect(r.ok && r.page.system).toBeUndefined();
    expect(r.ok && r.page.phase).toBeUndefined();
    expect(warningsOf(s)).toHaveLength(2);
  });

  it('名稱太長截短；沒寫尺寸用預設；座標取整數', () => {
    const s = sample();
    s.page.title = '長'.repeat(50);
    delete s.page.blocks[1].size;
    s.page.blocks[1].x = 24.6;
    const r = parse(s);
    expect(r.ok && [...r.page.title]).toHaveLength(40);
    expect(r.ok && r.page.blocks[1]).toMatchObject({ size: 'M', x: 25 });
  });

  it('id 重複或格式不對：重新產生，彼此不重複', () => {
    const s = sample();
    s.page.blocks[1].id = 'title';
    s.page.blocks[2].id = 'a b/c';
    delete s.page.blocks[3].id;
    const r = parse(s);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const ids = r.page.blocks.map((b) => b.id);
    expect(new Set(ids).size).toBe(4);
    expect(ids[0]).toBe('title');
    expect(r.warnings).toContain('2 個積木的 id 重複或格式不對，已重新產生');
  });

  it('多餘或危險的欄位不會被帶進頁面', () => {
    const text = JSON.stringify(sample()).replace('"type":"lamp"', '"__proto__":{"polluted":true},"onclick":"x","builtin":true,"type":"lamp"');
    const r = parsePageJson(text, ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.keys(r.page.blocks[1]).sort()).toEqual(['id', 'props', 'size', 'title', 'type', 'x', 'y']);
    expect(Object.keys(r.page.blocks[1].props as LampProps)).toEqual(['vtag']);
    expect(({} as any).polluted).toBeUndefined();
    const extra = sample(); extra.page.slug = 'overview'; extra.page.builtin = true; extra.page.createdAt = 1;
    const e = parse(extra);
    expect(e.ok && Object.keys(e.page).sort()).toEqual(['blocks', 'layer', 'phase', 'system', 'title']);
  });
});
