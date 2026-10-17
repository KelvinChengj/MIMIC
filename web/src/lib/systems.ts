import { SITES, SYSTEMS } from '../catalog/catalog';
import type { LampProps, PageBlock, Snapshot, Status, SystemConfig, UserPage } from '../types';
import { buildTagIndex, lampTags, type TagIndex } from './blocks';
import { FDM_TAG_BY_KEY, tagKey } from './fdm';
import { summarize, tagStatus, type Summary } from './status';

const OWNERS: Record<string, string> = {
  upw: '水課', bulk: '氣體課', chem: '化學品課', power: '電力課', mau: '空調課', exhaust: '空調課',
};

/** 預設的系統定義：catalog 的系統，各廠區放入該廠區 FDM 上有的 Tag */
export function defaultSystems(): SystemConfig[] {
  return SYSTEMS.map((sys) => ({
    id: sys.id,
    name: sys.name,
    short: sys.short,
    owner: OWNERS[sys.id] ?? '',
    staleMinutes: sys.defaultStaleMinutes,
    tags: Object.fromEntries(SITES.map((site) => [site.id, sys.tags.slice(0, sys.tags.length - site.dropTags).map((t) => t.name)])),
  }));
}

/** 系統裡的一個 Tag：FDM 最新值與燈號 */
export interface CellTag {
  key: string;
  name: string;
  desc: string;
  unit: string;
  decimals: number;
  /** FDM 有這個 Tag */
  valid: boolean;
  value: number | null;
  isOOS: boolean;
  isOOC: boolean;
  status: Status;
}

/** 某廠區 × 系統的判定結果 */
export interface CellResult {
  siteId: string;
  system: SystemConfig;
  tags: CellTag[];
  /** 有效 Tag 的彙整（任一 OOS 紅、任一 OOC 黃…） */
  summary: Summary;
}

/** 所有廠區 × 系統的判定結果，依「廠區|系統」查詢 */
export type Rollup = Map<string, CellResult>;
export const cellKey = (siteId: string, systemId: string) => `${siteId}|${systemId}`;

/**
 * 每次 FDM 回傳後集中算一次：Tag 燈號 → 系統計數。
 * 積木、側欄、下鑽頁都只查這張表，不各自重算；積木再多，計算量也不變。
 */
export function buildRollup(systems: SystemConfig[], index: TagIndex): Rollup {
  const out: Rollup = new Map();
  for (const system of systems)
    for (const site of SITES) {
      const tags = (system.tags[site.id] ?? []).map((name): CellTag => {
        const key = tagKey(site.id, name);
        const info = FDM_TAG_BY_KEY.get(key);
        const r = index.get(key);
        return {
          key,
          name,
          desc: r?.desc ?? info?.desc ?? 'FDM 找不到這個 Tag',
          unit: info?.unit ?? '',
          decimals: info?.decimals ?? 1,
          valid: !!r,
          value: r?.value ?? null,
          isOOS: !!r?.isOOS,
          isOOC: !!r?.isOOC,
          status: r ? tagStatus(r) : 'gray',
        };
      });
      out.set(cellKey(site.id, system.id), { siteId: site.id, system, tags, summary: summarize(tags.filter((t) => t.valid).map((t) => t.status)) });
    }
  return out;
}

/** 選取 Tag 的燈號積木 */
const tagLampRefs = (b: PageBlock) => (b.type === 'lamp' && !(b.props as LampProps).source ? lampTags(b.props as LampProps) : []);

/**
 * 這次要向 FDM 要哪些 Tag：所有系統定義裡的 Tag + 各頁面「選擇 Tag」燈號積木的 Tag，去除重複。
 * 合成一份清單，一次批次請求。
 */
export function collectTagKeys(systems: SystemConfig[], pages: UserPage[]): string[] {
  const keys = new Set<string>();
  for (const sys of systems) for (const [siteId, names] of Object.entries(sys.tags)) for (const n of names) keys.add(tagKey(siteId, n));
  for (const page of pages) for (const b of page.blocks) for (const r of tagLampRefs(b)) keys.add(tagKey(r.site, r.tag));
  return [...keys];
}

/** 這個積木引用了哪些系統（燈號積木的「整個系統」、內建的摘要 / Tag 清單 / 燈號牆積木） */
export function blockSystems(b: PageBlock): { siteIds: string[]; systemIds: string[] } | null {
  const p = b.props as { source?: { site: string; system: string }; site?: string; system?: string; sites?: string[]; systems?: string[] };
  if (b.type === 'lamp') return p.source ? { siteIds: [p.source.site], systemIds: [p.source.system] } : null;
  if (p.site && p.system) return { siteIds: [p.site], systemIds: [p.system] };
  if (p.sites && p.systems) return { siteIds: p.sites, systemIds: p.systems };
  return null;
}

/** 測試與非 React 環境用：用系統定義與一份 FDM 回傳組出積木判定所需的資料 */
export function makeEnv(systems: SystemConfig[], snapshot: Snapshot) {
  const index = buildTagIndex(snapshot);
  return { snapshot, index, rollup: buildRollup(systems, index) };
}
