import type { Status, TagReading } from '../types';

export const STATUS_META: Record<Status, { label: string; badge: string; legend: string }> = {
  red: { label: '紅', badge: '異常', legend: 'Red: Abnormal (any tag out of spec, OOS)' },
  yellow: { label: '黃', badge: '部分異常', legend: 'Yellow: Partially abnormal (some tags out of control, OOC)' },
  green: { label: '綠', badge: '正常', legend: 'Green: Normal' },
  gray: { label: '灰', badge: '無資料', legend: 'Gray: No data (no FDM data received within the set time)' },
};

export const STATUS_ORDER: Status[] = ['red', 'yellow', 'gray', 'green'];

/**
 * 單一 Tag 的燈號，完全依 FDM 回傳的旗標：
 * 無資料 → 灰；isOOS → 紅；isOOC → 黃；其他 → 綠
 */
export function tagStatus(r: Pick<TagReading, 'value' | 'isOOS' | 'isOOC'>): Status {
  if (r.value == null) return 'gray';
  if (r.isOOS) return 'red';
  if (r.isOOC) return 'yellow';
  return 'green';
}

export interface Summary {
  status: Status;
  total: number;
  red: number;
  yellow: number;
  green: number;
  gray: number;
}

/** 多個 Tag 彙整：任一紅 → 紅；否則任一黃 → 黃；否則有綠 → 綠；全部無資料 → 灰 */
export function summarize(statuses: Status[]): Summary {
  const s: Summary = { status: 'gray', total: statuses.length, red: 0, yellow: 0, green: 0, gray: 0 };
  statuses.forEach((x) => (s[x] += 1));
  s.status = s.red ? 'red' : s.yellow ? 'yellow' : s.green ? 'green' : 'gray';
  return s;
}

/** 多個格子 / 系統彙整成頁面燈號：紅 > 黃 > 灰 > 綠（有缺資料的頁面不報平安） */
export function worstOf(statuses: Status[]): Status {
  for (const st of STATUS_ORDER) if (statuses.includes(st)) return st;
  return 'gray';
}

/** 磚塊底下的小字 */
export function tileText(sum: Summary, staleMinutes: number): string {
  switch (sum.status) {
    case 'red': return `${sum.red} 台異常`;
    case 'yellow': return `${sum.yellow}/${sum.total} 台`;
    case 'green': return `${sum.total} 台`;
    default: return `${staleMinutes} 分無資料`;
  }
}

export function formatValue(v: number | null, decimals: number): string {
  return v == null ? '—' : v.toFixed(decimals);
}

/** 燈號規則說明（固定，由 FDM 旗標決定，使用者不需要設定） */
export function ruleLines(staleMinutes: number): { status: Status; text: string }[] {
  return [
    { status: 'red', text: '任一 Tag 為 OOS（FDM 判定超出規格）' },
    { status: 'yellow', text: '無紅燈，且任一 Tag 為 OOC（FDM 判定超出管制）' },
    { status: 'green', text: '所有 Tag 皆在管制範圍內' },
    { status: 'gray', text: `Tag 超過 ${staleMinutes} 分鐘未收到 FDM 資料` },
  ];
}
