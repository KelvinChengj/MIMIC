import { SITES, SYSTEMS } from '../catalog/catalog';
import type { BlockVar, LampProps, RulesConfig, Snapshot, Status } from '../types';
import { fmtNum, run, type Env, type RunResult } from './expr';

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

/** 所有可選的資料點（各廠區 × 各系統的 Tag） */
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

export type ValueGetter = (siteId: string, tag: string) => number | null;

export function buildValueGetter(snapshot: Snapshot): ValueGetter {
  const m = new Map<string, number | null>();
  for (const [siteId, systems] of Object.entries(snapshot.data))
    for (const readings of Object.values(systems))
      for (const r of readings) m.set(tagKey(siteId, r.name), r.history[r.history.length - 1] ?? null);
  return (siteId, tag) => m.get(tagKey(siteId, tag)) ?? null;
}

export interface VarState {
  name: string;
  tag?: TagInfo;
  value: number | null;
  /** FDM 的真實數值（不受模擬值影響） */
  real: number | null;
  /** 這個值是編輯時手動填的模擬值，不是 FDM 的真實數值 */
  simulated: boolean;
}

/** 以資料點名稱（A、B…）覆蓋數值，用來在編輯時試算；null＝模擬無資料 */
export type Overrides = Record<string, number | null>;

export interface BlockResult {
  /** 紅 / 黃 / 綠；無資料、未設定、算式有誤時為灰 */
  status: Status;
  reason: 'ok' | 'unset' | 'nodata' | 'error';
  label: string;
  message: string;
  vars: VarState[];
  red: RunResult;
  yellow: RunResult;
  value: RunResult;
  display: string;
  unit: string;
}

const LABELS: Record<Status, string> = { red: '異常', yellow: '部分異常', green: '正常', gray: '' };

export function evaluateLamp(block: LampProps, getValue: ValueGetter, overrides: Overrides = {}): BlockResult {
  const vars: VarState[] = block.vars.map((v) => {
    const tag = v.site && v.tag ? TAG_BY_KEY.get(tagKey(v.site, v.tag)) : undefined;
    const simulated = Object.prototype.hasOwnProperty.call(overrides, v.name);
    const real = tag ? getValue(tag.siteId, tag.name) : null;
    return { name: v.name, tag, simulated, real, value: simulated ? overrides[v.name] : real };
  });
  const env: Env = Object.fromEntries(vars.map((v) => [v.name, v.value]));
  const red = run(block.redExpr, env, 'bool');
  const yellow = run(block.yellowExpr, env, 'bool');
  const value = run(block.valueExpr, env, 'any');

  // 顯示值：沒寫算式且只有一個資料點時，直接顯示該點數值
  let display = '';
  let unit = block.unit;
  if (value.state === 'ok') display = typeof value.value === 'boolean' ? (value.value ? '成立' : '不成立') : fmtNum(value.value);
  else if (value.state === 'nodata') display = '—';
  else if (value.state === 'error') display = '算式錯誤';
  else if (vars.length === 1) {
    const v = vars[0];
    display = v.value == null ? '—' : v.tag ? v.value.toFixed(v.tag.decimals) : fmtNum(v.value);
    if (!unit) unit = v.tag?.unit ?? '';
  }

  const base = { vars, red, yellow, value, display, unit };
  const gray = (reason: BlockResult['reason'], label: string, message: string): BlockResult => ({
    ...base, status: 'gray', reason, label, message,
  });

  const firstError = [red, yellow, value].find((r) => r.state === 'error');
  if (firstError && firstError.state === 'error') return gray('error', '公式錯誤', firstError.message);
  if (red.state === 'empty' && yellow.state === 'empty') return gray('unset', '尚未設定', '尚未設定燈號條件');

  const done = (status: Status, message: string): BlockResult => ({
    ...base, status, reason: 'ok', label: block.labels?.[status as 'red' | 'yellow' | 'green']?.trim() || LABELS[status], message,
  });
  if (red.state === 'ok' && red.value === true) return done('red', `紅燈條件成立：${red.traced}`);
  if (red.state === 'nodata') return gray('nodata', '無資料', `資料點 ${red.varName} 目前無資料`);
  if (yellow.state === 'ok' && yellow.value === true) return done('yellow', `黃燈條件成立：${yellow.traced}`);
  if (yellow.state === 'nodata') return gray('nodata', '無資料', `資料點 ${yellow.varName} 目前無資料`);
  return done('green', red.state === 'empty' ? '黃燈條件不成立' : '紅、黃燈條件都不成立');
}

export function nextVarName(vars: BlockVar[]): string {
  const used = new Set(vars.map((v) => v.name));
  for (let i = 0; i < 26; i++) {
    const n = String.fromCharCode(65 + i);
    if (!used.has(n)) return n;
  }
  return `V${vars.length + 1}`;
}

const rid = () => Math.random().toString(36).slice(2, 8);
export const newId = (prefix: string) => `${prefix}-${rid()}`;

/** 依該量測目前的門檻設定，產生對應的紅 / 黃條件算式 */
export function conditionsFromRules(varName: string, tag: TagInfo, rules: RulesConfig): { redExpr: string; yellowExpr: string } {
  const r = rules[tag.systemId]?.metrics[tag.metric] ?? {};
  const join = (hi?: number, lo?: number) =>
    [hi != null ? `${varName} > ${hi}` : '', lo != null ? `${varName} < ${lo}` : ''].filter(Boolean).join(' or ');
  return { redExpr: join(r.redHigh, r.redLow), yellowExpr: join(r.yellowHigh, r.yellowLow) };
}
