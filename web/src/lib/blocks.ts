import type { LampProps, Snapshot, Status, VTagReading, VTagRef } from '../types';
import { tagKey, VTAG_BY_KEY, VTAGS, vtagName, type VirtualTag } from './fdm';
import { STATUS_META, vtagStatus } from './status';

export { tagKey, type VirtualTag };

/** FDM 最新一次回傳，依「廠區|virtual tag」查詢 */
export type TagIndex = Map<string, VTagReading>;

export function buildTagIndex(snapshot: Snapshot): TagIndex {
  return new Map(Object.entries(snapshot.readings));
}

export const vtagKey = (r: VTagRef) => tagKey(r.site, r.name);

/** 燈號積木綁的 virtual tag；舊版「整個情境」轉成該廠區 × 情境的 virtual tag，舊版「選取 Tag」沒有對應 */
export function lampVTag(p: LampProps): VTagRef | undefined {
  if (p.vtag) return p.vtag;
  if (p.source) return { site: p.source.site, name: vtagName(p.source.site, p.source.system) };
  return undefined;
}

export interface LampResult {
  ref?: VTagRef;
  /** 上游主檔有這個 virtual tag */
  info?: VirtualTag;
  value: number | null;
  status: Status;
  reason: 'ok' | 'empty' | 'invalid' | 'nodata';
  /** 燈號下方一行字 */
  text: string;
}

/** 燈號積木的判定：virtual tag 的值就是燈號代碼 */
export function evaluateLamp(ref: VTagRef | undefined, index: TagIndex): LampResult {
  if (!ref) return { value: null, status: 'gray', reason: 'empty', text: '尚未選擇 virtual tag' };
  const info = VTAG_BY_KEY.get(vtagKey(ref));
  if (!info) return { ref, value: null, status: 'gray', reason: 'invalid', text: 'virtual tag 無效' };
  const value = index.get(info.key)?.value ?? null;
  const status = vtagStatus(value);
  return { ref, info, value, status, reason: status === 'gray' ? 'nodata' : 'ok', text: STATUS_META[status].badge };
}

/** 依名稱找 virtual tag（不分大小寫）；找不到為 undefined */
export function findVTag(siteId: string, name: string): VirtualTag | undefined {
  const n = name.trim().toUpperCase();
  return VTAGS.find((v) => v.siteId === siteId && v.name.toUpperCase() === n);
}

const rid = () => Math.random().toString(36).slice(2, 8);
export const newId = (prefix: string) => `${prefix}-${rid()}`;
