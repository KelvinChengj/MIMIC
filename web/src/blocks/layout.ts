import type { BlockSize, PageBlock } from '../types';

export const GRID = 10;
export const SIZE_LABEL: Record<BlockSize, string> = { S: '小', M: '中', L: '大' };
export const SIZES: BlockSize[] = ['S', 'M', 'L'];

export interface Footprint {
  w: number;
  h: number;
}

/** 對齊格線（不小於 0） */
export const snap = (n: number) => Math.max(0, Math.round(n / GRID) * GRID);

const overlaps = (ax: number, ay: number, a: Footprint, b: PageBlock, fb: Footprint, gap: number) =>
  ax < b.x + fb.w + gap && ax + a.w + gap > b.x && ay < b.y + fb.h + gap && ay + a.h + gap > b.y;

/**
 * 找第一個不會壓到既有積木的位置：由左到右、由上到下，以格線掃描。
 * footprintOf 回傳每個既有積木目前佔用的大小（由積木種類與尺寸決定）。
 */
export function nextFreePosition(
  blocks: PageBlock[],
  footprintOf: (b: PageBlock) => Footprint,
  size: Footprint,
  width = 1040,
  gap = 16,
): { x: number; y: number } {
  const fps = blocks.map((b) => footprintOf(b));
  for (let y = 24; y < 6000; y += GRID * 2) {
    for (let x = 24; x + size.w <= width; x += GRID * 2) {
      if (!blocks.some((b, i) => overlaps(x, y, size, b, fps[i], gap))) return { x, y };
    }
  }
  return { x: 24, y: 24 };
}

/** 畫布需要多大才容得下所有積木 */
export function canvasExtent(blocks: PageBlock[], footprintOf: (b: PageBlock) => Footprint): Footprint {
  return {
    w: Math.max(0, ...blocks.map((b) => b.x + footprintOf(b).w)),
    h: Math.max(0, ...blocks.map((b) => b.y + footprintOf(b).h)),
  };
}
