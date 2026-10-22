import { beforeAll, describe, expect, it } from 'vitest';
import { PAGES, pageBySlug } from '../catalog/catalog';
import { fetchLamps, VTAGS } from '../lib/fdm';
import { buildTagIndex } from '../lib/blocks';
import { allLayoutPages, builtinLayoutPage, defaultCommandLayout, defaultWallLayout, DUTY_HOME, isWallPage } from './builtin';
import { pageHost, PREVIEW_HOST } from './host';
import { registerBuiltinBlocks } from './index';
import { footprintOf, getBlockDef } from './registry';
import { textFootprint } from './text';
import type { BlockEnv } from './types';
import type { DutyProps, LampProps, PageBlock } from '../types';

beforeAll(() => registerBuiltinBlocks());

const env = (): BlockEnv => {
  const snapshot = fetchLamps(VTAGS.map((v) => v.key), 0, 0);
  return { snapshot, index: buildTagIndex(snapshot), getPage: (slug) => builtinLayoutPage(slug) };
};

const overlaps = (blocks: PageBlock[]) => {
  const boxes = blocks.map((b) => ({ b, f: footprintOf(b) }));
  const hits: string[] = [];
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], c = boxes[j];
      if (a.b.x < c.b.x + c.f.w && a.b.x + a.f.w > c.b.x && a.b.y < c.b.y + c.f.h && a.b.y + a.f.h > c.b.y) hits.push(`${a.b.id}/${c.b.id}`);
    }
  return hits;
};

describe('值班情境頁 = 燈號（virtual tag）+ 文字積木', () => {
  const wall = defaultWallLayout(pageBySlug('f18p7-overview')!);
  const lamps = wall.filter((b) => b.type === 'lamp');

  it('只用「燈號」與「文字」兩種積木', () => expect(new Set(wall.map((b) => b.type))).toEqual(new Set(['lamp', 'text'])));
  it('每顆燈號綁該廠區 × 系統的 virtual tag', () => {
    expect(lamps).toHaveLength(6);
    expect(lamps.every((b) => b.size === 'M')).toBe(true);
    expect((lamps.find((b) => b.id === 'cell-f18p7-upw')!.props as LampProps).vtag).toEqual({ site: 'f18p7', name: 'F18P7.UPW.LAMP' });
  });
  it('積木互不重疊、id 穩定', () => {
    expect(overlaps(wall)).toEqual([]);
    expect(defaultWallLayout(pageBySlug('f18p7-overview')!).map((b) => b.id)).toEqual(wall.map((b) => b.id));
  });
  it('燈號 = virtual tag 的代碼：F18P2 超純水紅、F18P7 排氣灰、F18P1 超純水綠', () => {
    const e = env();
    const lamp = getBlockDef('lamp')!;
    const at = (slug: string, id: string) => lamp.status!(builtinLayoutPage(slug)!.blocks.find((b) => b.id === id) as PageBlock<LampProps>, e);
    expect(at('upw', 'cell-f18p2-upw')).toBe('red');
    expect(at('exhaust', 'cell-f18p7-exhaust')).toBe('gray');
    expect(at('upw', 'cell-f18p1-upw')).toBe('green');
  });
});

describe('戰情指揮官頁 = 值班情境燈號 + 文字積木', () => {
  const cmd = defaultCommandLayout();
  const duties = cmd.filter((b) => b.type === 'duty');

  it('全廠總覽是戰情指揮官層，每個內建值班情境一顆燈', () => {
    expect(builtinLayoutPage('overview')).toMatchObject({ layer: 'command', builtin: true, title: 'F18A 全廠總覽' });
    expect(DUTY_HOME).toEqual(['power', 'upw', 'hvac', 'exhaust', 'gas', 'chemical']);
    expect(duties.map((b) => (b.props as DutyProps).page)).toEqual(DUTY_HOME);
    expect(overlaps(cmd)).toEqual([]);
  });
  it('展示大、中、小三種尺寸：超純水大、電力與空調中、其餘小', () => {
    const size = (slug: string) => duties.find((b) => (b.props as DutyProps).page === slug)!.size;
    expect(DUTY_HOME.map(size)).toEqual(['M', 'L', 'M', 'S', 'S', 'S']);
  });
  it('指揮官燈號取值班情境頁最差燈號', () => {
    const e = env();
    const duty = getBlockDef('duty')!;
    const at = (slug: string) => duty.status!(duties.find((b) => (b.props as DutyProps).page === slug) as PageBlock<DutyProps>, e);
    expect(at('upw')).toBe('red');
    expect(at('exhaust')).toBe('gray'); // F18P7 排氣沒資料：不報平安
    expect(duty.status!({ ...duties[0], props: { page: 'nope' } } as PageBlock<DutyProps>, e)).toBe('gray');
  });
  it('值班情境頁都是值班層；指揮官層不能被指揮官引用', () => {
    for (const slug of DUTY_HOME) expect(builtinLayoutPage(slug)!.layer).toBe('duty');
  });
});

describe('哪些內建頁面是積木畫布', () => {
  it('所有內建頁面都有資料範圍（沒有功能的示意頁已移除）', () => {
    expect(PAGES.every(isWallPage)).toBe(true);
    expect(isWallPage(pageBySlug('f18p2-upw-duty')!)).toBe(true);
    expect(builtinLayoutPage('cda')).toBeUndefined();
  });
  it('值班頁燈號數 = 廠區數 × 系統數', () => {
    for (const p of PAGES.filter((x) => isWallPage(x) && x.layer !== 'command')) {
      expect(defaultWallLayout(p).filter((b) => b.type === 'lamp').length).toBe(p.scope!.sites.length * p.scope!.systems.length);
    }
  });
  it('同一個頁面每次拿到同一份預設版面（快取）', () => expect(builtinLayoutPage('overview')).toBe(builtinLayoutPage('overview')));
  it('allLayoutPages：存過的頁面優先，其餘補上內建預設版面', () => {
    const mine = { ...builtinLayoutPage('upw')!, blocks: [] };
    const all = allLayoutPages([mine]);
    expect(all.filter((p) => p.slug === 'upw')).toEqual([mine]);
    expect(all.some((p) => p.slug === 'overview')).toBe(true);
  });
});

describe('積木連結 host', () => {
  it('畫布頁：燈號下鑽到該頁底下；值班情境燈號進入該頁', () => {
    const h = pageHost('upw');
    expect(h.blockTo!('cell-f18p2-upw')).toBe('/p/upw/b/cell-f18p2-upw');
    expect(h.pageTo!('upw')).toBe('/p/upw');
  });
  it('預覽不連到任何地方', () => expect(PREVIEW_HOST).toEqual({}));
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
