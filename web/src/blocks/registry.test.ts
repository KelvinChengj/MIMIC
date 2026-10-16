import { beforeAll, describe, expect, it } from 'vitest';
import { registerBuiltinBlocks } from './index';
import { blockLibrary, createBlock, footprintOf, getBlockDef, listBlockDefs, normalizeBlock, registerBlock } from './registry';
import { evaluateLamp, lampTags } from '../lib/blocks';
import { SCALE } from './layout';
import { fetchSnapshot } from '../lib/fdm';
import { buildTagIndex } from '../lib/blocks';
import type { PageBlock } from '../types';
import type { BlockDefinition, BlockEnv } from './types';

beforeAll(() => registerBuiltinBlocks());

const env = (): BlockEnv => {
  const snapshot = fetchSnapshot(0, 0);
  return { snapshot, index: buildTagIndex(snapshot) };
};

describe('積木庫 registry', () => {
  it('內建五種積木都已註冊', () => {
    expect(listBlockDefs().map((d) => d.type).slice(0, 5)).toEqual(['lamp', 'wall', 'summary', 'tags', 'text']);
  });
  it('積木庫目前只開放「燈號」與「文字」；燈號牆、系統摘要、Tag 清單仍註冊但不開放使用者新增', () => {
    expect(blockLibrary().map((g) => [g.category, g.items.map((d) => d.type)])).toEqual([
      ['燈號', ['lamp']],
      ['版面', ['text']],
    ]);
    for (const t of ['wall', 'summary', 'tags']) {
      expect(getBlockDef(t)).toBeDefined();
      expect(getBlockDef(t)!.inLibrary).toBe(false);
    }
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
    expect(createBlock('wall', []).size).toBe('S');
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
    expect(SCALE).toEqual({ S: 1, M: 2, L: 4 });
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
  it('舊格式（只有燈號積木、自訂算式）轉成新格式：只保留選過的 Tag', () => {
    const legacy = { id: 'b1', title: '舊', x: 10, y: 20, vars: [{ name: 'A', site: 'f18p2', tag: 'UPW-POL-02.TOC' }, { name: 'B' }], valueExpr: '', unit: 'ppb', redExpr: 'A > 1', yellowExpr: '' };
    expect(normalizeBlock(legacy)).toEqual({
      id: 'b1', type: 'lamp', title: '舊', size: 'M', x: 10, y: 20,
      props: { tags: [{ site: 'f18p2', tag: 'UPW-POL-02.TOC' }] },
    });
    const modern = { id: 'b2', type: 'text', title: '', size: 'L', x: 0, y: 0, props: { text: 'x' } };
    expect(normalizeBlock(modern)).toEqual(modern);
    expect(normalizeBlock({ ...modern, size: undefined }).size).toBe('M');
  });
  it('各積木對整頁燈號的貢獻', () => {
    const e = env();
    const lamp = { ...createBlock('lamp', []), props: { tags: [{ site: 'f18p2', tag: 'UPW-POL-02.TOC' }] } };
    expect(getBlockDef('lamp')!.status!(lamp, e)).toBe(evaluateLamp(lampTags(lamp.props), e.index).status);
    expect(getBlockDef('lamp')!.status!(lamp, e)).toBe('red');
    const wall = { ...createBlock('wall', []), props: { sites: ['f18p2'], systems: ['upw'] } };
    expect(getBlockDef('wall')!.status!(wall, e)).toBe('red');
    const calm = { ...createBlock('summary', []), props: { site: 'f18p1', system: 'upw' } };
    expect(getBlockDef('summary')!.status!(calm, e)).toBe('green');
    expect(getBlockDef('text')!.status).toBeUndefined();
  });
});
