import { describe, expect, it } from 'vitest';
import { collectVTagKeys, dutySummary, dutyText, layerOf } from './pages';
import type { TagIndex } from './blocks';
import type { PageBlock, UserPage } from '../types';

const lamp = (id: string, props: unknown): PageBlock => ({ id, type: 'lamp', title: id, size: 'S', x: 0, y: 0, props });
const page = (blocks: PageBlock[], layer?: 'duty' | 'command'): UserPage => ({ slug: 'u-1', title: '值班', blocks, createdAt: 0, layer });
const v = (site: string, name: string) => ({ vtag: { site, name } });
const index: TagIndex = new Map([
  ['f18p2|F18P2.UPW.LAMP', { value: 2 }],
  ['f18p2|F18P2.MAU.LAMP', { value: 1 }],
  ['f18p1|F18P1.UPW.LAMP', { value: 0 }],
  ['f18p7|F18P7.EXH.LAMP', { value: null }],
]);

describe('dutySummary：指揮官看一個值班情境', () => {
  it('取最差，文字顯示各色數量', () => {
    const s = dutySummary(page([lamp('a', v('f18p2', 'F18P2.UPW.LAMP')), lamp('b', v('f18p2', 'F18P2.MAU.LAMP')), lamp('c', v('f18p1', 'F18P1.UPW.LAMP'))]), index);
    expect([s.status, s.red, s.yellow, s.green]).toEqual(['red', 1, 1, 1]);
    expect(dutyText(s)).toBe('1 紅 · 1 黃');
  });
  it('有沒資料的燈時不報平安（灰 > 綠）', () => {
    const s = dutySummary(page([lamp('c', v('f18p1', 'F18P1.UPW.LAMP')), lamp('d', v('f18p7', 'F18P7.EXH.LAMP'))]), index);
    expect(s.status).toBe('gray');
    expect(dutyText(s)).toBe('1 無資料');
  });
  it('全部正常、沒有燈號', () => {
    expect(dutyText(dutySummary(page([lamp('c', v('f18p1', 'F18P1.UPW.LAMP'))]), index))).toBe('1 燈正常');
    const empty = dutySummary(page([]), index);
    expect([empty.status, dutyText(empty)]).toEqual(['gray', '沒有燈號']);
  });
  it('只看燈號積木：頁面裡的其他積木不計入（不會一層套一層）', () => {
    const s = dutySummary(page([lamp('a', v('f18p1', 'F18P1.UPW.LAMP')), { ...lamp('x', { page: 'upw' }), type: 'duty' }]), index);
    expect(s.total).toBe(1);
  });
});

describe('collectVTagKeys：這次要向 FDM 要哪些 virtual tag', () => {
  it('所有頁面的燈號，去除重複；舊版「整個情境」也算', () => {
    const keys = collectVTagKeys([
      page([lamp('a', v('f18p2', 'F18P2.UPW.LAMP')), lamp('b', { source: { site: 'f18p2', system: 'upw' } }), lamp('c', {})]),
      page([lamp('d', v('f18p1', 'F18P1.UPW.LAMP'))]),
    ]);
    expect(keys).toEqual(['f18p2|F18P2.UPW.LAMP', 'f18p1|F18P1.UPW.LAMP']);
  });
});

describe('layerOf', () => {
  it('沒有標記的舊頁面視為值班情境', () => {
    expect(layerOf(page([]))).toBe('duty');
    expect(layerOf(page([], 'command'))).toBe('command');
  });
});
