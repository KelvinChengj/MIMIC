import type { PageBlock, Status, UserPage } from '../types';
import { evaluateLamp, lampVTag, vtagKey, type TagIndex } from './blocks';
import { summarize, worstOf, type Summary } from './status';

export const layerOf = (page: Pick<UserPage, 'layer'>) => page.layer ?? 'duty';

const lampBlocks = (page: UserPage) => page.blocks.filter((b) => b.type === 'lamp');

/** 值班情境頁裡所有燈號積木的燈號 */
export function dutyLamps(page: UserPage, index: TagIndex): Status[] {
  return lampBlocks(page).map((b) => evaluateLamp(lampVTag(b.props as PageBlock['props'] & object), index).status);
}

/**
 * 指揮官層看一個值班情境：燈號取該頁所有燈號最差（紅 > 黃 > 灰 > 綠，有缺資料不報平安），
 * 文字顯示各色數量。只看燈號積木，所以不會一層套一層。
 */
export function dutySummary(page: UserPage, index: TagIndex): Summary {
  const statuses = dutyLamps(page, index);
  return { ...summarize(statuses), status: statuses.length ? worstOf(statuses) : 'gray' };
}

export function dutyText(sum: Summary): string {
  if (sum.total === 0) return '沒有燈號';
  if (sum.red) return `${sum.red} 紅${sum.yellow ? ` · ${sum.yellow} 黃` : ''}`;
  if (sum.yellow) return `${sum.yellow} 黃`;
  if (sum.gray) return `${sum.gray} 無資料`;
  return `${sum.total} 燈正常`;
}

/** 這次要向 FDM 要哪些 virtual tag：所有頁面燈號積木綁的 virtual tag，去除重複 */
export function collectVTagKeys(pages: UserPage[]): string[] {
  const keys = new Set<string>();
  for (const page of pages)
    for (const b of lampBlocks(page)) {
      const ref = lampVTag(b.props as object);
      if (ref) keys.add(vtagKey(ref));
    }
  return [...keys];
}

/** 燈號尺寸改定義前存的頁面：原本的小 → 中、中 → 大、大（已移除）→ 大；文字積木不變 */
const SIZE_V2: Record<string, PageBlock['size']> = { S: 'M', M: 'L', L: 'L' };
export function migrateSizes(p: UserPage): UserPage {
  if (p.sizes === 2) return p;
  return {
    ...p,
    sizes: 2,
    blocks: p.blocks.map((b) => (b.type === 'lamp' || b.type === 'duty' ? { ...b, size: SIZE_V2[b.size ?? 'M'] ?? 'M' } : b)),
  };
}
