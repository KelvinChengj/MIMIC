import { describe, expect, it } from 'vitest';
import { fetchSnapshot } from './fdm';
import { evaluateSystem, summarize, tagStatus, tileText, validateMetric, worstOf } from './status';
import { SYSTEMS, systemById } from '../catalog/catalog';
import type { SystemRules } from '../types';

const defaults = (id: string): SystemRules => {
  const sys = systemById(id)!;
  return {
    consecutive: sys.defaultConsecutive,
    staleMinutes: sys.defaultStaleMinutes,
    metrics: Object.fromEntries(sys.metrics.map((m) => [m.code, { ...m.defaults }])),
  };
};

describe('tagStatus', () => {
  const rule = { yellowHigh: 1, redHigh: 3 };
  it('無資料為灰', () => expect(tagStatus(rule, [0.5, null], 3)).toBe('gray'));
  it('連續 3 點超紅為紅', () => expect(tagStatus(rule, [0.5, 3.1, 3.2, 3.4], 3)).toBe('red'));
  it('只有最新一點超紅，未連續成立 → 黃', () => expect(tagStatus(rule, [0.5, 0.5, 0.5, 3.4], 3)).toBe('yellow'));
  it('連續點數改成 1 就變紅', () => expect(tagStatus(rule, [0.5, 0.5, 0.5, 3.4], 1)).toBe('red'));
  it('介於黃紅之間為黃', () => expect(tagStatus(rule, [2, 2, 2, 2], 3)).toBe('yellow'));
  it('正常為綠', () => expect(tagStatus(rule, [0.4, 0.5, 0.4, 0.5], 3)).toBe('green'));
  it('下限門檻', () => expect(tagStatus({ yellowLow: 18, redLow: 17.5 }, [17.4, 17.4, 17.4], 3)).toBe('red'));
});

describe('summarize / worstOf', () => {
  it('紅 > 黃 > 綠 > 灰', () => {
    expect(summarize(['green', 'yellow', 'red']).status).toBe('red');
    expect(summarize(['green', 'yellow']).status).toBe('yellow');
    expect(summarize(['green', 'gray']).status).toBe('green');
    expect(summarize(['gray', 'gray']).status).toBe('gray');
  });
  it('頁面彙整時灰優先於綠', () => expect(worstOf(['green', 'gray'])).toBe('gray'));
});

describe('示範資料', () => {
  const snap = fetchSnapshot(0, 0);
  const run = (site: string, sys: string) => {
    const s = systemById(sys)!;
    return evaluateSystem(s, snap.data[site][sys], defaults(sys)).summary;
  };
  it('F18P2 超純水：3 紅 2 黃 1 灰，共 8 點', () => {
    const s = run('f18p2', 'upw');
    expect([s.status, s.red, s.yellow, s.gray, s.total]).toEqual(['red', 3, 2, 1, 8]);
    expect(tileText(s, 15)).toBe('3 台異常');
  });
  it('F18P7 排氣整個無資料為灰', () => {
    const s = run('f18p7', 'exhaust');
    expect(s.status).toBe('gray');
    expect(tileText(s, 15)).toBe('15 分無資料');
  });
  it('F18P1 電力的尖峰值被連續點數濾掉 → 黃', () => {
    expect(run('f18p1', 'power').status).toBe('yellow');
  });
  it('正常的廠區 × 系統是綠燈', () => {
    expect(run('f18p1', 'upw').status).toBe('green');
    expect(run('f18p2', 'mau').status).toBe('green');
  });
  it('重新整理後正常 Tag 仍是正常', () => {
    const again = fetchSnapshot(7, 0);
    const s = evaluateSystem(systemById('upw')!, again.data.f18p1.upw, defaults('upw')).summary;
    expect(s.status).toBe('green');
  });
  it('預設門檻全部通過合理性檢查', () => {
    for (const sys of SYSTEMS) for (const m of sys.metrics) expect(validateMetric(m.defaults)).toEqual([]);
  });
});

describe('validateMetric', () => {
  it('紅燈比黃燈寬鬆時回報錯誤', () => {
    expect(validateMetric({ yellowHigh: 5, redHigh: 3 })).not.toEqual([]);
    expect(validateMetric({ yellowLow: 5, redLow: 8 })).not.toEqual([]);
    expect(validateMetric({ yellowHigh: 3, yellowLow: 5 })).not.toEqual([]);
  });
});
