import { beforeAll, describe, expect, it } from 'vitest';
import { PAGES, pageBySlug } from '../catalog/catalog';
import { fetchSnapshot } from '../lib/fdm';
import { buildValueGetter } from '../lib/blocks';
import { defaultRules } from '../state/RulesContext';
import { builtinLayoutPage, defaultWallLayout, isWallPage } from './builtin';
import { cellSummary } from './cells';
import { OVERVIEW_HOST, pageHost } from './host';
import { registerBuiltinBlocks } from './index';
import { footprintOf, getBlockDef } from './registry';
import { textFootprint } from './text';
import type { BlockEnv } from './types';
import type { LampProps, PageBlock } from '../types';

beforeAll(() => registerBuiltinBlocks());

const env = (): BlockEnv => {
  const snapshot = fetchSnapshot(0, 0);
  return { snapshot, rules: defaultRules(), getValue: buildValueGetter(snapshot) };
};

describe('內建燈號牆 = 燈號積木 + 文字積木', () => {
  const overview = defaultWallLayout(pageBySlug('overview')!);
  const lamps = overview.filter((b) => b.type === 'lamp');
  const texts = overview.filter((b) => b.type === 'text');

  it('只用「燈號」與「文字」兩種積木', () => {
    expect(new Set(overview.map((b) => b.type))).toEqual(new Set(['lamp', 'text']));
  });
  it('全廠總覽：4 廠區 × 6 系統 = 24 顆系統燈號；文字 = 標題 + 6 欄名 + 4 列名', () => {
    expect(lamps).toHaveLength(24);
    expect(texts).toHaveLength(1 + 6 + 4);
    expect(lamps.every((b) => b.size === 'S' && (b.props as LampProps).source)).toBe(true);
  });
  it('積木 id 唯一且穩定（存檔後能對得上）', () => {
    expect(new Set(overview.map((b) => b.id)).size).toBe(overview.length);
    expect(defaultWallLayout(pageBySlug('overview')!).map((b) => b.id)).toEqual(overview.map((b) => b.id));
  });
  it('所有積木互不重疊', () => {
    const boxes = overview.map((b) => ({ b, f: footprintOf(b) }));
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], c = boxes[j];
        const hit = a.b.x < c.b.x + c.f.w && a.b.x + a.f.w > c.b.x && a.b.y < c.b.y + c.f.h && a.b.y + a.f.h > c.b.y;
        expect(hit, `${a.b.id} 與 ${c.b.id} 重疊`).toBe(false);
      }
  });
  it('行列對齊：同一列 y 相同、同一欄 x 相同，欄名置中在燈號上方', () => {
    const cell = (s: string, y: string) => lamps.find((b) => b.id === `cell-${s}-${y}`)!;
    expect(cell('f18p1', 'upw').y).toBe(cell('f18p1', 'power').y);
    expect(cell('f18p1', 'upw').x).toBe(cell('f18p3', 'upw').x);
    const col = texts.find((b) => b.id === 'col-upw')!;
    const tile = cell('f18p1', 'upw');
    expect(col.y + footprintOf(col).h).toBeLessThanOrEqual(tile.y);
    expect(Math.abs(col.x + footprintOf(col).w / 2 - (tile.x + 48))).toBeLessThanOrEqual(1);
  });
  it('每個系統燈號的狀態與平台判定（舊燈號牆）完全一致', () => {
    const e = env();
    const lamp = getBlockDef('lamp')!;
    for (const b of lamps) {
      const { site, system } = (b.props as LampProps).source!;
      expect(lamp.status!(b as PageBlock<LampProps>, e)).toBe(cellSummary(e, site, system)!.status);
    }
    const byId = (id: string) => lamp.status!(lamps.find((b) => b.id === id) as PageBlock<LampProps>, e);
    expect(byId('cell-f18p2-upw')).toBe('red');
    expect(byId('cell-f18p7-exhaust')).toBe('gray');
    expect(byId('cell-f18p1-upw')).toBe('green');
  });
});

describe('哪些內建頁面是積木畫布', () => {
  it('多個格子的燈號牆頁面是；單一格子的下鑽頁與示意頁不是', () => {
    expect(isWallPage(pageBySlug('overview')!)).toBe(true);
    expect(isWallPage(pageBySlug('upw')!)).toBe(true);
    expect(isWallPage(pageBySlug('f18p2-upw-duty')!)).toBe(false);
    expect(isWallPage(pageBySlug('cda')!)).toBe(false);
    expect(builtinLayoutPage('f18p2-upw-duty')).toBeUndefined();
    expect(builtinLayoutPage('cda')).toBeUndefined();
    expect(builtinLayoutPage('overview')).toMatchObject({ builtin: true, title: 'F18A 全廠總覽' });
  });
  it('所有燈號牆頁面都能產生版面，且燈號數 = 廠區數 × 系統數', () => {
    for (const p of PAGES.filter(isWallPage)) {
      const lampsN = defaultWallLayout(p).filter((b) => b.type === 'lamp').length;
      expect(lampsN).toBe(p.scope!.sites.length * p.scope!.systems.length);
    }
  });
  it('同一個頁面每次拿到同一份預設版面（快取）', () => expect(builtinLayoutPage('overview')).toBe(builtinLayoutPage('overview')));
});

describe('下鑽連結 host', () => {
  it('自建頁面一律下鑽到全廠總覽底下', () => expect(OVERVIEW_HOST.drillTo('f18p2', 'upw')).toBe('/p/overview/f18p2/upw'));
  it('內建頁面：在範圍內掛在自己底下，範圍外退回全廠總覽', () => {
    const h = pageHost(pageBySlug('upw'));
    expect(h.drillTo('f18p2', 'upw')).toBe('/p/upw/f18p2/upw');
    expect(h.drillTo('f18p2', 'chem')).toBe('/p/overview/f18p2/chem');
  });
});

describe('文字積木寬度跟著內容', () => {
  it('短文字窄、長文字寬，且不超過該尺寸上限', () => {
    const a = textFootprint('超純水', 'S').w, b = textFootprint('這是一段比較長的說明文字，用來測試換行', 'S');
    expect(a).toBeLessThan(b.w);
    expect(b.w).toBeLessThanOrEqual(220);
    expect(b.h).toBeGreaterThan(textFootprint('超純水', 'S').h);
  });
  it('大尺寸字級更大', () => expect(textFootprint('標題', 'L').w).toBeGreaterThan(textFootprint('標題', 'S').w));
  it('空白文字也有最小大小', () => expect(textFootprint('', 'M')).toMatchObject({ w: 48 }));
});
