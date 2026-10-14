import type { History, MetricDef, MetricRule, Status, SystemDef, SystemRules, TagReading } from '../types';

export const STATUS_META: Record<Status, { label: string; badge: string; legend: string }> = {
  red: { label: '紅', badge: '異常', legend: 'Red: Abnormal (any tag beyond the red limit)' },
  yellow: { label: '黃', badge: '部分異常', legend: 'Yellow: Partially abnormal (some tags beyond the yellow limit)' },
  green: { label: '綠', badge: '正常', legend: 'Green: Normal' },
  gray: { label: '灰', badge: '無資料', legend: 'Gray: No data (no FDM data received within the set time)' },
};

export const STATUS_ORDER: Status[] = ['red', 'yellow', 'gray', 'green'];

const beyondRed = (r: MetricRule, v: number | null) =>
  v != null && ((r.redHigh != null && v > r.redHigh) || (r.redLow != null && v < r.redLow));
const beyondYellow = (r: MetricRule, v: number | null) =>
  v != null && ((r.yellowHigh != null && v > r.yellowHigh) || (r.yellowLow != null && v < r.yellowLow));

/**
 * 單一 Tag 的燈號。
 * - 最新值為 null → 灰
 * - 最近 `consecutive` 點全部超出紅色管制 → 紅
 * - 最新值超出黃（或紅但未連續成立）→ 黃
 */
export function tagStatus(rule: MetricRule, history: History, consecutive: number): Status {
  const latest = history[history.length - 1] ?? null;
  if (latest == null) return 'gray';
  const recent = history.slice(-Math.max(1, consecutive));
  if (recent.length >= consecutive && recent.every((v) => beyondRed(rule, v))) return 'red';
  if (beyondYellow(rule, latest) || beyondRed(rule, latest)) return 'yellow';
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

export interface EvaluatedTag extends TagReading {
  status: Status;
  value: number | null;
  rule: MetricRule;
  metricDef?: MetricDef;
}

export function evaluateSystem(
  sys: SystemDef,
  readings: TagReading[],
  rules: SystemRules,
): { tags: EvaluatedTag[]; summary: Summary } {
  const tags = readings.map((t): EvaluatedTag => {
    const rule = rules.metrics[t.metric] ?? {};
    return {
      ...t,
      rule,
      metricDef: sys.metrics.find((m) => m.code === t.metric),
      value: t.history[t.history.length - 1] ?? null,
      status: tagStatus(rule, t.history, rules.consecutive),
    };
  });
  return { tags, summary: summarize(tags.map((t) => t.status)) };
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

/** 門檻顯示時至少補到該量測的小數位（18 → 18.0），使用者輸入更多位則照原樣 */
const fmtLimit = (v: number, decimals: number) => (decimals > 0 && Number.isInteger(v) ? v.toFixed(decimals) : String(v));

function conditions(sys: SystemDef, rules: SystemRules, level: 'yellow' | 'red'): string[] {
  const out: string[] = [];
  for (const m of sys.metrics) {
    const r = rules.metrics[m.code] ?? {};
    const hi = level === 'red' ? r.redHigh : r.yellowHigh;
    const lo = level === 'red' ? r.redLow : r.yellowLow;
    const unit = m.unit ? ` ${m.unit}` : '';
    if (hi != null) out.push(`${m.label} > ${fmtLimit(hi, m.decimals)}${unit}`);
    if (lo != null) out.push(`${m.label} < ${fmtLimit(lo, m.decimals)}${unit}`);
  }
  return out;
}

const MAX_SHOWN = 3;
function joinConds(list: string[]): { short: string; full: string } {
  const full = list.length ? list.join(' 或 ') : '尚未設定門檻';
  if (list.length <= MAX_SHOWN) return { short: full, full };
  return { short: `${list.slice(0, MAX_SHOWN).join(' 或 ')} 等 ${list.length} 項`, full };
}

/** 下鑽頁頭部的四行燈號規則說明（由實際設定組出，改門檻後會同步） */
export function describeRules(sys: SystemDef, rules: SystemRules) {
  const red = joinConds(conditions(sys, rules, 'red'));
  const yellow = joinConds(conditions(sys, rules, 'yellow'));
  return [
    { status: 'red' as const, text: `任一 Tag 超出紅色管制（${red.short}），連續 ${rules.consecutive} 點成立`, title: red.full },
    { status: 'yellow' as const, text: `無紅燈，且任一 Tag 超出黃色管制（${yellow.short}）`, title: yellow.full },
    { status: 'green' as const, text: '所有 Tag 皆在管制範圍內', title: '' },
    { status: 'gray' as const, text: `Tag 超過 ${rules.staleMinutes} 分鐘未收到 FDM 資料`, title: '' },
  ];
}

/** 門檻合理性檢查：紅色管制必須比黃色更外側 */
export function validateMetric(r: MetricRule): string[] {
  const errs: string[] = [];
  if (r.yellowHigh != null && r.redHigh != null && r.redHigh < r.yellowHigh) errs.push('紅燈上限不可低於黃燈上限');
  if (r.yellowLow != null && r.redLow != null && r.redLow > r.yellowLow) errs.push('紅燈下限不可高於黃燈下限');
  const hi = r.yellowHigh ?? r.redHigh;
  const lo = r.yellowLow ?? r.redLow;
  if (hi != null && lo != null && lo >= hi) errs.push('下限必須小於上限');
  return errs;
}
