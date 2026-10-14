import { describe, expect, it } from 'vitest';
import { canvasExtent, nextFreePosition, snap } from './layout';
import type { PageBlock } from '../types';

const blk = (id: string, x: number, y: number): PageBlock => ({ id, type: 't', title: '', size: 'M', x, y, props: {} });
const fp = () => ({ w: 168, h: 128 });

describe('layout', () => {
  it('snap 對齊 10px 且不小於 0', () => {
    expect(snap(14)).toBe(10);
    expect(snap(16)).toBe(20);
    expect(snap(-30)).toBe(0);
  });
  it('空畫布從左上角開始', () => expect(nextFreePosition([], fp, { w: 168, h: 128 })).toEqual({ x: 24, y: 24 }));
  it('新積木不壓到既有積木，依序往右排', () => {
    const blocks: PageBlock[] = [];
    for (let i = 0; i < 8; i++) {
      const p = nextFreePosition(blocks, fp, { w: 168, h: 128 });
      blocks.push(blk(String(i), p.x, p.y));
    }
    expect(new Set(blocks.map((b) => `${b.x},${b.y}`)).size).toBe(8);
    expect(blocks[1].x).toBeGreaterThanOrEqual(24 + 168);
    for (const a of blocks) for (const b of blocks)
      if (a !== b) expect(a.x + 168 <= b.x || b.x + 168 <= a.x || a.y + 128 <= b.y || b.y + 128 <= a.y).toBe(true);
  });
  it('依各積木實際大小避開（大積木佔更多位置）', () => {
    const big = blk('big', 24, 24);
    const p = nextFreePosition([big], () => ({ w: 600, h: 300 }), { w: 168, h: 128 });
    expect(p.x).toBeGreaterThanOrEqual(24 + 600);
  });
  it('放不下一行時換到下一列', () => {
    const p = nextFreePosition([blk('a', 24, 24)], () => ({ w: 1000, h: 100 }), { w: 168, h: 128 });
    expect(p.y).toBeGreaterThanOrEqual(24 + 100);
  });
  it('canvasExtent', () => {
    expect(canvasExtent([blk('a', 100, 50), blk('b', 300, 10)], fp)).toEqual({ w: 468, h: 178 });
    expect(canvasExtent([], fp)).toEqual({ w: 0, h: 0 });
  });
});
