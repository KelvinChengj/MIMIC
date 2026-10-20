import { newId } from '../lib/blocks';
import type { Layer, PageBlock } from '../types';
import { nextFreePosition, type Footprint } from './layout';
import type { BlockDefinition } from './types';

/**
 * 積木庫（store）：所有可用的積木種類都註冊在這裡。
 * 內建積木在 blocks/index.ts 註冊；未來要加新積木，呼叫 registerBlock 即可。
 */
const defs = new Map<string, BlockDefinition<any>>();

export function registerBlock<P>(def: BlockDefinition<P>) {
  if (defs.has(def.type)) throw new Error(`積木種類「${def.type}」已經註冊過`);
  defs.set(def.type, def as BlockDefinition<any>);
}

export const getBlockDef = (type: string) => defs.get(type);
export const listBlockDefs = () => [...defs.values()];

/** 積木庫分組（保持註冊順序；inLibrary: false 或不適用這個層級的積木不列出） */
export function blockLibrary(layer?: Layer): { category: string; items: BlockDefinition<any>[] }[] {
  const groups = new Map<string, BlockDefinition<any>[]>();
  for (const d of defs.values()) {
    if (d.inLibrary === false || (layer && d.layers && !d.layers.includes(layer))) continue;
    groups.set(d.category, [...(groups.get(d.category) ?? []), d]);
  }
  return [...groups].map(([category, items]) => ({ category, items }));
}

const FALLBACK: Footprint = { w: 200, h: 120 };
export const footprintOf = (b: PageBlock): Footprint => getBlockDef(b.type)?.footprint(b) ?? FALLBACK;

/** 依種類建立新積木，放在畫布上第一個空位 */
export function createBlock(type: string, existing: PageBlock[]): PageBlock {
  const def = getBlockDef(type);
  if (!def) throw new Error(`找不到積木種類「${type}」`);
  const draft: PageBlock = {
    id: newId('b'),
    type,
    title: def.defaultTitle(existing.filter((b) => b.type === type).length + 1),
    size: def.defaultSize ?? 'M',
    x: 0,
    y: 0,
    props: def.defaultProps(),
  };
  return { ...draft, ...nextFreePosition(existing, footprintOf, def.footprint(draft)) };
}

/** 舊版（只有燈號積木、沒有 type 欄位）存下來的資料轉成新格式 */
export function normalizeBlock(raw: any): PageBlock {
  if (raw && typeof raw.type === 'string' && raw.props) return { ...raw, size: raw.size ?? 'M' } as PageBlock;
  return {
    id: raw.id,
    type: 'lamp',
    title: raw.title ?? '燈號',
    size: 'M',
    x: raw.x ?? 24,
    y: raw.y ?? 24,
    // 條件算式已不再使用；燈號改綁 virtual tag，需重新選擇
    props: {},
  };
}
