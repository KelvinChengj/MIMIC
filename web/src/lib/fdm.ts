import { SITES, SYSTEMS } from '../catalog/catalog';
import type { MetricRule, Snapshot } from '../types';

/**
 * 模擬 FDM。真實環境中 isOOS / isOOC 由 FDM 判定後回傳，前端只負責顯示；
 * 這裡用 catalog 裡各量測類型的界限模擬那個判定。
 *
 * 示範數值表：指定某廠區 × FDM 分類的 Tag 數值，讓示範畫面有紅黃灰燈。
 * - number：固定數值；null：無資料；'*' 代表整個分類無資料
 */
type Pin = number | null;
const SCENARIOS: Record<string, Record<string, Record<string, Pin>>> = {
  f18p1: {
    chem: { 'CHEM-HF-01.LVL': 28, 'CHEM-NH4OH-01.TMP': 29 },
    power: { 'PWR-TR1.TMP': 97 },
  },
  f18p2: {
    upw: {
      'UPW-POL-02.TOC': 3.4,
      'UPW-POL-03.RES': 17.4,
      'UPW-LOOP-01.PRS': 2.9,
      'UPW-POL-03.TOC': 2.4,
      'UPW-RO-03.FLW': 31.5,
      'UPW-PRE-04.TOC': null,
    },
    power: { 'PWR-TR1.LOAD': 84, 'PWR-UPS-A.LOAD': 82 },
  },
  f18p3: {
    bulk: { 'GAS-GN2-01.PRS': 6.8, 'GAS-PN2-01.O2': 60 },
    mau: { 'MAU-01.TMP': 26, 'MAU-01.RH': 57, 'MAU-02.RH': 34 },
  },
  f18p7: {
    chem: { 'CHEM-HF-01.LVL': 12, 'CHEM-H2SO4-01.LVL': 14, 'CHEM-H2SO4-01.PRS': 1.2 },
    mau: { 'MAU-01.TMP': 23.8, 'MAU-02.DP': 280 },
    exhaust: { '*': null },
  },
};

/** 確定性亂數（同一個 seq 產生同樣結果，重新整理才會變） */
function rand(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

const jitter = (nominal: number, key: string) => nominal * (1 + (rand(key) - 0.5) * 0.01);

/** 模擬 FDM 的判定：超出規格界限＝OOS；超出管制界限（未超規格）＝OOC；沒有資料兩者皆 false */
export function judge(limits: MetricRule, value: number | null): { isOOS: boolean; isOOC: boolean } {
  if (value == null) return { isOOS: false, isOOC: false };
  const isOOS = (limits.redHigh != null && value > limits.redHigh) || (limits.redLow != null && value < limits.redLow);
  const isOOC = !isOOS && ((limits.yellowHigh != null && value > limits.yellowHigh) || (limits.yellowLow != null && value < limits.yellowLow));
  return { isOOS, isOOC };
}

export interface TagInfo {
  key: string;
  siteId: string;
  siteName: string;
  /** FDM 上的分類（Tag 主檔裡的系統別）；燈號的情境歸屬以「情境管理」的定義為準 */
  systemId: string;
  systemName: string;
  name: string;
  desc: string;
  metric: string;
  unit: string;
  decimals: number;
}

export const tagKey = (siteId: string, tag: string) => `${siteId}|${tag}`;

interface MockTag {
  info: TagInfo;
  nominal: number;
  limits: MetricRule;
}

/** 模擬 FDM 內部的 Tag 主檔（含預設沒放進任何情境的 spare Tag） */
const MOCK: MockTag[] = SITES.flatMap((site) =>
  SYSTEMS.flatMap((sys) =>
    [...sys.tags.slice(0, sys.tags.length - site.dropTags), ...(sys.spare ?? [])].map((t): MockTag => {
      const metric = t.name.slice(t.name.lastIndexOf('.') + 1);
      const m = sys.metrics.find((x) => x.code === metric);
      return {
        info: {
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
        },
        nominal: t.nominal,
        limits: m?.defaults ?? {},
      };
    }),
  ),
);
const MOCK_BY_KEY = new Map(MOCK.map((t) => [t.info.key, t]));

/** FDM 的 Tag 主檔：選取 Tag、檢查 Tag 是否有效都以這份為準 */
export const FDM_TAGS: TagInfo[] = MOCK.map((t) => t.info);
export const FDM_TAG_BY_KEY = new Map(FDM_TAGS.map((t) => [t.key, t]));

/**
 * 向 FDM 發「一次」批次請求，取回指定 Tag 的最新值與 isOOS / isOOC。
 * keys 為「廠區|Tag」；FDM 沒有的 Tag 不會回傳。
 * 以模擬資料取代真實 FDM；接真實 API 時只要換掉這個函式，回傳同樣的結構。
 */
export function fetchLatest(keys: Iterable<string>, seq: number, now = Date.now()): Snapshot {
  const readings: Snapshot['readings'] = {};
  for (const key of keys) {
    const t = MOCK_BY_KEY.get(key);
    if (!t) continue;
    const { siteId, systemId, name, desc, metric } = t.info;
    const pins = SCENARIOS[siteId]?.[systemId] ?? {};
    const pin: Pin | undefined = name in pins ? pins[name] : '*' in pins ? pins['*'] : undefined;
    const value = pin === undefined ? jitter(t.nominal, `${siteId}|${name}|${seq}`) : pin;
    readings[key] = { name, desc, metric, value, ...judge(t.limits, value) };
  }
  return { updatedAt: now, readings };
}
