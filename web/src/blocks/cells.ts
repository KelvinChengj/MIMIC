import { cellKey } from '../lib/systems';
import { worstOf, type Summary } from '../lib/status';
import type { Status } from '../types';
import type { BlockEnv } from './types';

/** 某廠區 × 系統目前的判定摘要（沒有這個系統時為 null）；直接查集中算好的結果 */
export function cellSummary(env: BlockEnv, siteId: string, systemId: string): Summary | null {
  return env.rollup.get(cellKey(siteId, systemId))?.summary ?? null;
}

export function cellsStatus(env: BlockEnv, siteIds: string[], systemIds: string[]): Status | null {
  const out: Status[] = [];
  for (const s of siteIds)
    for (const y of systemIds) {
      const sum = cellSummary(env, s, y);
      if (sum) out.push(sum.status);
    }
  return out.length ? worstOf(out) : null;
}
