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

export function formatValue(v: number | null, decimals: number): string {
  return v == null ? '—' : v.toFixed(decimals);
}

/**
 * virtual tag 的燈號代碼對照（由上游定義；要改代碼只改這裡）。
 * 不在表上的值與沒有值一律灰燈。
 */
export const LAMP_CODE: Record<number, Status> = { 0: 'green', 1: 'yellow', 2: 'red' };

export function vtagStatus(value: number | null | undefined): Status {
  return value == null ? 'gray' : (LAMP_CODE[value] ?? 'gray');
}

const codeOf = (st: Status) => Object.entries(LAMP_CODE).find(([, v]) => v === st)?.[0];

/** 值班情境燈號的規則說明（virtual tag 的值 → 燈號） */
export function ruleLines(): { status: Status; text: string }[] {
  return [
    { status: 'red', text: `virtual tag 值為 ${codeOf('red')}（上游判定：任一 InSQL tag 為 OOS）` },
    { status: 'yellow', text: `virtual tag 值為 ${codeOf('yellow')}（上游判定：任一 InSQL tag 為 OOC）` },
    { status: 'green', text: `virtual tag 值為 ${codeOf('green')}` },
    { status: 'gray', text: 'virtual tag 沒有值，或值不在代碼表上' },
  ];
}
