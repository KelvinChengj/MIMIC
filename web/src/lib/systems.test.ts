import { describe, expect, it } from 'vitest';
import { fetchLatest, FDM_TAGS } from './fdm';
import { blockSystems, buildRollup, cellKey, collectTagKeys, defaultSystems, makeEnv } from './systems';
import { buildTagIndex } from './blocks';
import type { PageBlock, SystemConfig, UserPage } from '../types';

const lamp = (id: string, props: unknown): PageBlock => ({ id, type: 'lamp', title: id, size: 'M', x: 0, y: 0, props });
const page = (blocks: PageBlock[]): UserPage => ({ slug: 'u-1', title: '我的頁面', blocks, createdAt: 0 });

describe('collectTagKeys：彙整這次要向 FDM 要的 Tag', () => {
  const systems = defaultSystems();
  const base = collectTagKeys(systems, []);

  it('包含所有系統定義裡的 Tag，且不重複', () => {
    const count = systems.reduce((n, s) => n + Object.values(s.tags).reduce((m, t) => m + t.length, 0), 0);
    expect(base).toHaveLength(count);
    expect(new Set(base).size).toBe(base.length);
  });
  it('加入燈號積木選的 Tag；已在系統裡的不重複要', () => {
    const keys = collectTagKeys(systems, [page([
      lamp('a', { tags: [{ site: 'f18p2', tag: 'UPW-POL-02.TOC' }, { site: 'f18p2', tag: 'UPW-POL-04.RES' }] }),
      lamp('b', { tags: [{ site: 'f18p2', tag: 'UPW-POL-04.RES' }] }),
    ])]);
    expect(keys.length).toBe(base.length + 1);
    expect(keys).toContain('f18p2|UPW-POL-04.RES');
  });
  it('「整個系統」積木不增加 Tag（系統的 Tag 已經在清單裡）', () => {
    expect(collectTagKeys(systems, [page([lamp('c', { tags: [], source: { site: 'f18p1', system: 'upw' } })])])).toHaveLength(base.length);
  });
});

describe('fetchLatest：一次批次請求', () => {
  it('只回傳要求、且 FDM 有的 Tag', () => {
    const r = fetchLatest(['f18p2|UPW-POL-02.TOC', 'f18p2|NOPE.X'], 0, 0);
    expect(Object.keys(r.readings)).toEqual(['f18p2|UPW-POL-02.TOC']);
  });
  it('FDM 主檔有預設沒放進系統的 spare Tag', () => {
    const spare = 'f18p1|UPW-POL-04.RES';
    expect(FDM_TAGS.some((t) => t.key === spare)).toBe(true);
    expect(collectTagKeys(defaultSystems(), [])).not.toContain(spare);
  });
});

describe('buildRollup：系統燈號集中算一次', () => {
  it('修改系統定義後，燈號依新的 Tag 清單計算', () => {
    const systems = defaultSystems();
    const snap = fetchLatest(FDM_TAGS.map((t) => t.key), 0, 0);
    const index = buildTagIndex(snap);
    expect(buildRollup(systems, index).get(cellKey('f18p2', 'upw'))!.summary.status).toBe('red');
    // 只留下正常的 Tag → 綠
    const edited: SystemConfig[] = systems.map((s) => (s.id === 'upw' ? { ...s, tags: { ...s.tags, f18p2: ['UPW-EDI-02.TMP', 'UPW-POL-04.RES'] } } : s));
    const cell = buildRollup(edited, index).get(cellKey('f18p2', 'upw'))!;
    expect([cell.summary.status, cell.summary.total]).toEqual(['green', 2]);
  });
  it('FDM 找不到的 Tag 標為無效、不計入燈號', () => {
    const systems: SystemConfig[] = [{ id: 'x', name: 'X', short: 'X', owner: '', staleMinutes: 15, tags: { f18p1: ['NOPE.X', 'UPW-POL-01.RES'] } }];
    const cell = makeEnv(systems, fetchLatest(collectTagKeys(systems, []), 0, 0)).rollup.get(cellKey('f18p1', 'x'))!;
    expect(cell.tags.map((t) => t.valid)).toEqual([false, true]);
    expect(cell.summary.total).toBe(1);
  });
  it('沒有 Tag 的系統是灰燈', () => {
    const systems: SystemConfig[] = [{ id: 'y', name: 'Y', short: '', owner: '', staleMinutes: 15, tags: {}, custom: true }];
    expect(buildRollup(systems, new Map()).get(cellKey('f18p1', 'y'))!.summary.status).toBe('gray');
  });
});

describe('blockSystems：積木引用了哪個系統', () => {
  it('燈號積木的「整個系統」', () => expect(blockSystems(lamp('a', { source: { site: 'f18p1', system: 'upw' } }))).toEqual({ siteIds: ['f18p1'], systemIds: ['upw'] }));
  it('選 Tag 的燈號積木不算引用系統', () => expect(blockSystems(lamp('a', { tags: [] }))).toBeNull());
});
