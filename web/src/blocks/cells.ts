import { systemById } from '../catalog/catalog';
import { evaluateSystem, worstOf, type Summary } from '../lib/status';
import type { Status } from '../types';
import type { BlockEnv } from './types';

/** 某廠區 × 系統目前的判定摘要（沒有資料來源時為 null） */
export function cellSummary(env: BlockEnv, siteId: string, systemId: string): Summary | null {
  const sys = systemById(systemId);
  const readings = env.snapshot.data[siteId]?.[systemId];
  return sys && readings ? evaluateSystem(sys, readings, env.rules[systemId]).summary : null;
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
