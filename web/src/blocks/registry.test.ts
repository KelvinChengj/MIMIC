import { beforeAll, describe, expect, it } from 'vitest';
import { registerBuiltinBlocks } from './index';
import { blockLibrary, createBlock, footprintOf, getBlockDef, listBlockDefs, normalizeBlock, registerBlock } from './registry';
import { SCALE } from './layout';
import { fetchLamps, VTAGS } from '../lib/fdm';
import { buildTagIndex } from '../lib/blocks';
import { builtinLayoutPage } from './builtin';
import type { PageBlock } from '../types';
import type { BlockDefinition, BlockEnv } from './types';

beforeAll(() => registerBuiltinBlocks());

const env = (): BlockEnv => {
  const snapshot = fetchLamps(VTAGS.map((v) => v.key), 0, 0);
  return { snapshot, index: buildTagIndex(snapshot), getPage: (slug) => builtinLayoutPage(slug) };
};

describe('積木庫 registry', () => {
  it('內建三種積木都已註冊', () => {
    expect(listBlockDefs().map((d) => d.type).slice(0, 3)).toEqual(['lamp', 'duty', 'text']);
  });
  it('積木庫依頁面層級：值班情境只有燈號、指揮官只有值班情境燈號，文字兩層都有', () => {
    const lib = (layer?: 'duty' | 'command') => blockLibrary(layer).filter((g) => g.category !== '測試').map((g) => [g.category, g.items.map((d) => d.type)]);
    expect(lib('duty')).toEqual([['燈號', ['lamp']], ['版面', ['text']]]);
    expect(lib('command')).toEqual([['燈號', ['duty']], ['版面', ['text']]]);
  });
  it('重複註冊同一種類會丟錯', () => {
    expect(() => registerBlock(getBlockDef('lamp') as BlockDefinition<unknown>)).toThrow();
  });
  it('未來新增的積木種類只要註冊就能被建立', () => {
    const def: BlockDefinition<{ n: number }> = {
      type: 'test-counter', label: '測試', description: '', category: '測試', icon: null,
      defaultProps: () => ({ n: 1 }), defaultTitle: (n) => `測試 ${n}`,
      footprint: () => ({ w: 100, h: 50 }), Render: () => null, Editor: () => null,
    };
    registerBlock(def);
    const b = createBlock('test-counter', []);
    expect(b).toMatchObject({ type: 'test-counter', title: '測試 1', size: 'M', props: { n: 1 } });
    expect(blockLibrary().some((g) => g.category === '測試')).toBe(true);
    registerBlock({ ...def, type: 'test-hidden', category: '隱藏', inLibrary: false });
    expect(blockLibrary().some((g) => g.category === '隱藏')).toBe(false);
  });
  it('createBlock：預設尺寸、依序命名、不重疊', () => {
    const a = createBlock('lamp', []);
    const b = createBlock('lamp', [a]);
    expect([a.title, b.title]).toEqual(['燈號 1', '燈號 2']);
    expect(a.size).toBe('M');
    expect(b.x).toBeGreaterThanOrEqual(a.x + footprintOf(a).w);
  });
  it('未知種類 createBlock 丟錯，footprintOf 有預設值', () => {
    expect(() => createBlock('nope', [])).toThrow();
    expect(footprintOf({ id: 'x', type: 'nope', title: '', size: 'M', x: 0, y: 0, props: {} }).w).toBeGreaterThan(0);
  });
  it('燈號積木 小 : 中 : 大 = 1 : 2 : 4（長與寬）', () => {
    const lamp = createBlock('lamp', []);
    const [s, m, l] = (['S', 'M', 'L'] as const).map((size) => footprintOf({ ...lamp, size }));
    expect([m.w / s.w, l.w / s.w]).toEqual([2, 4]);
    expect([m.h / s.h, l.h / s.h]).toEqual([2, 4]);
    expect(SCALE).toEqual({ S: 0.5, M: 1, L: 2 });
    expect([s.w, s.h, l.w, l.h]).toEqual([48, 44, 192, 176]);
  });
  it('各積木種類的三種尺寸都有合理的佔用大小', () => {
    for (const d of listBlockDefs().filter((x) => !x.type.startsWith('test-'))) {
      const base: PageBlock = { ...createBlock(d.type, []) };
      for (const size of ['S', 'M', 'L'] as const) {
        const f = d.footprint({ ...base, size });
        expect(f.w).toBeGreaterThan(40);
        expect(f.h).toBeGreaterThan(20);
      }
    }
  });
  it('舊格式（只有燈號積木、自訂算式）轉成燈號積木，需重新選 virtual tag', () => {
    const legacy = { id: 'b1', title: '舊', x: 10, y: 20, vars: [{ name: 'A', site: 'f18p2', tag: 'UPW-POL-02.TOC' }, { name: 'B' }], valueExpr: '', unit: 'ppb', redExpr: 'A > 1', yellowExpr: '' };
    expect(normalizeBlock(legacy)).toEqual({
      id: 'b1', type: 'lamp', title: '舊', size: 'M', x: 10, y: 20,
      props: {},
    });
    const modern = { id: 'b2', type: 'text', title: '', size: 'L', x: 0, y: 0, props: { text: 'x' } };
    expect(normalizeBlock(modern)).toEqual(modern);
    expect(normalizeBlock({ ...modern, size: undefined }).size).toBe('M');
  });
  it('各積木對整頁燈號的貢獻', () => {
    const e = env();
    const lamp = { ...createBlock('lamp', []), props: { vtag: { site: 'f18p2', name: 'F18P2.UPW.LAMP' } } };
    expect(getBlockDef('lamp')!.status!(lamp, e)).toBe('red');
    expect(getBlockDef('lamp')!.status!({ ...lamp, props: {} }, e)).toBe('gray');
    // 舊版「整個情境」自動對到 virtual tag
    expect(getBlockDef('lamp')!.status!({ ...lamp, props: { source: { site: 'f18p1', system: 'upw' } } }, e)).toBe('green');
    const duty = { ...createBlock('duty', []), props: { page: 'upw' } };
    expect(getBlockDef('duty')!.status!(duty, e)).toBe('red');
    expect(getBlockDef('text')!.status).toBeUndefined();
  });
});
