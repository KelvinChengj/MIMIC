import { SITES, SYSTEMS } from '../catalog/catalog';
import type { LampProps, Snapshot, Status, TagReading, TagRef } from '../types';
import { STATUS_META, summarize, tagStatus, type Summary } from './status';

export interface TagInfo {
  key: string;
  siteId: string;
  siteName: string;
  systemId: string;
  systemName: string;
  name: string;
  desc: string;
  metric: string;
  unit: string;
  decimals: number;
}

export const tagKey = (siteId: string, tag: string) => `${siteId}|${tag}`;

/** FDM 的 Tag 主檔：所有廠區 × 系統可選的 Tag（選取、檢查是否有效都以這份為準） */
export const ALL_TAGS: TagInfo[] = SITES.flatMap((site) =>
  SYSTEMS.flatMap((sys) =>
    sys.tags.slice(0, sys.tags.length - site.dropTags).map((t): TagInfo => {
      const metric = t.name.slice(t.name.lastIndexOf('.') + 1);
      const m = sys.metrics.find((x) => x.code === metric);
      return {
        key: tagKey(site.id, t.name),
        siteId: site.id,
        siteName: site.name,
        systemId: sys.id,
        systemName: sys.name,
        name: t.name,
        desc: t.desc,
        metric,
        unit: m?.unit ?? '',
        decimals: m?.decimals ?? 1,
      };
    }),
  ),
);
export const TAG_BY_KEY = new Map(ALL_TAGS.map((t) => [t.key, t]));

/** FDM 最新一次回傳，依「廠區|Tag」查詢 */
export type TagIndex = Map<string, TagReading>;

export function buildTagIndex(snapshot: Snapshot): TagIndex {
  const m: TagIndex = new Map();
  for (const [siteId, systems] of Object.entries(snapshot.data))
    for (const readings of Object.values(systems)) for (const r of readings) m.set(tagKey(siteId, r.name), r);
  return m;
}

/** 燈號積木選取的 Tag；舊資料（自訂算式時期）的資料點自動轉成 Tag，重複的只算一次 */
export function lampTags(p: LampProps): TagRef[] {
  const raw = p.tags ?? (p.vars ?? []).flatMap((v) => (v.site && v.tag ? [{ site: v.site, tag: v.tag }] : []));
  const seen = new Set<string>();
  return raw.filter((r) => {
    const k = tagKey(r.site, r.tag);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export interface LampTagState {
  ref: TagRef;
  info?: TagInfo;
  /** FDM 有這個 Tag */
  valid: boolean;
  reading?: TagReading;
  status: Status;
}

export interface LampResult {
  /** 紅 / 黃 / 綠；沒選 Tag、Tag 無效或全部無資料時為灰 */
  status: Status;
  reason: 'ok' | 'empty' | 'invalid' | 'nodata';
  /** 狀態文字：異常 / 部分異常 / 正常 / 無資料 / 尚未選擇 Tag / Tag 無效 */
  label: string;
  /** 燈號下方一行字：單一 Tag 顯示數值，多個 Tag 顯示統計（例如「3 台異常」） */
  text: string;
  tags: LampTagState[];
  /** 有效 Tag 的彙整 */
  summary: Summary;
}

const fmt = (r: TagReading | undefined, info: TagInfo | undefined) =>
  r?.value == null ? '無資料' : `${r.value.toFixed(info?.decimals ?? 1)}${info?.unit ? ` ${info.unit}` : ''}`;

/** 燈號積木的判定：完全依 FDM 回傳的 isOOS / isOOC，使用者不需要設定任何條件 */
export function evaluateLamp(refs: TagRef[], index: TagIndex): LampResult {
  const tags: LampTagState[] = refs.map((ref) => {
    const reading = index.get(tagKey(ref.site, ref.tag));
    return {
      ref,
      info: TAG_BY_KEY.get(tagKey(ref.site, ref.tag)),
      valid: !!reading,
      reading,
      status: reading ? tagStatus(reading) : 'gray',
    };
  });
  const valid = tags.filter((t) => t.valid);
  const summary = summarize(valid.map((t) => t.status));
  const base = { tags, summary };

  if (tags.length === 0) return { ...base, status: 'gray', reason: 'empty', label: '尚未選擇 Tag', text: '尚未選擇 Tag' };
  if (valid.length === 0) return { ...base, status: 'gray', reason: 'invalid', label: 'Tag 無效', text: 'Tag 無效' };

  const status = summary.status;
  const label = STATUS_META[status].badge;
  let text: string;
  if (valid.length === 1) text = fmt(valid[0].reading, valid[0].info);
  else if (status === 'red') text = `${summary.red} 台異常`;
  else if (status === 'yellow') text = `${summary.yellow}/${summary.total} 台`;
  else if (status === 'green') text = `${summary.total} 台`;
  else text = '無資料';
  return { ...base, status, reason: status === 'gray' ? 'nodata' : 'ok', label, text };
}

export interface TagInputResult {
  /** FDM 有、且還不在清單裡的 Tag */
  added: TagRef[];
  /** 已經在清單裡 */
  duplicate: string[];
  /** FDM 找不到 */
  missing: string[];
}

/**
 * 檢查使用者輸入的 Tag 名稱（可一次貼多個，以換行、空白、逗號分隔，不分大小寫），
 * 對照 FDM 的 Tag 主檔判斷是否有效。
 */
export function checkTagInput(text: string, siteId: string, existing: TagRef[]): TagInputResult {
  const names = [...new Set(text.split(/[\s,，、;；]+/).map((s) => s.trim().toUpperCase()).filter(Boolean))];
  const have = new Set(existing.map((r) => tagKey(r.site, r.tag)));
  const out: TagInputResult = { added: [], duplicate: [], missing: [] };
  for (const n of names) {
    const info = ALL_TAGS.find((t) => t.siteId === siteId && t.name.toUpperCase() === n);
    if (!info) out.missing.push(n);
    else if (have.has(info.key)) out.duplicate.push(info.name);
    else {
      out.added.push({ site: siteId, tag: info.name });
      have.add(info.key);
    }
  }
  return out;
}

const rid = () => Math.random().toString(36).slice(2, 8);
export const newId = (prefix: string) => `${prefix}-${rid()}`;
