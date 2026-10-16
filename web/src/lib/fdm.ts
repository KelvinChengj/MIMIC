import { SITES, SYSTEMS } from '../catalog/catalog';
import type { MetricRule, Snapshot, TagReading } from '../types';

/**
 * 模擬 FDM。真實環境中 isOOS / isOOC 由 FDM 判定後回傳，前端只負責顯示；
 * 這裡用 catalog 裡各量測類型的界限模擬那個判定。
 *
 * 情境表：指定某廠區 × 系統的 Tag 數值，讓示範畫面有紅黃灰燈。
 * - number：固定數值；null：無資料；'*' 代表整個系統無資料
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

/** 以模擬資料取代真實 FDM；接真實 API 時只要換掉這個函式，回傳同樣的結構 */
export function fetchSnapshot(seq: number, now = Date.now()): Snapshot {
  const data: Snapshot['data'] = {};
  for (const site of SITES) {
    data[site.id] = {};
    for (const sys of SYSTEMS) {
      const pins = SCENARIOS[site.id]?.[sys.id] ?? {};
      const tags = sys.tags.slice(0, sys.tags.length - site.dropTags);
      data[site.id][sys.id] = tags.map((t): TagReading => {
        const metric = t.name.slice(t.name.lastIndexOf('.') + 1);
        const pin: Pin | undefined = t.name in pins ? pins[t.name] : '*' in pins ? pins['*'] : undefined;
        const value = pin === undefined ? jitter(t.nominal, `${site.id}|${t.name}|${seq}`) : pin;
        const limits = sys.metrics.find((m) => m.code === metric)?.defaults ?? {};
        return { name: t.name, desc: t.desc, metric, value, ...judge(limits, value) };
      });
    }
  }
  return { updatedAt: now, data };
}
