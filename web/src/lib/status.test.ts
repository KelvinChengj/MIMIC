import { describe, expect, it } from 'vitest';
import { fetchSnapshot, judge } from './fdm';
import { evaluateSystem, ruleLines, summarize, tagStatus, tileText, worstOf } from './status';
import { systemById } from '../catalog/catalog';

describe('tagStatus：只看 FDM 旗標', () => {
  it('無資料為灰（即使旗標有值也一樣）', () => expect(tagStatus({ value: null, isOOS: true, isOOC: false })).toBe('gray'));
  it('isOOS → 紅', () => expect(tagStatus({ value: 3.4, isOOS: true, isOOC: false })).toBe('red'));
  it('isOOC → 黃', () => expect(tagStatus({ value: 2.4, isOOS: false, isOOC: true })).toBe('yellow'));
  it('兩者都是時以 OOS 為準', () => expect(tagStatus({ value: 9, isOOS: true, isOOC: true })).toBe('red'));
  it('都沒有 → 綠', () => expect(tagStatus({ value: 0.4, isOOS: false, isOOC: false })).toBe('green'));
});

describe('模擬 FDM 的判定 judge', () => {
  const limits = { yellowHigh: 1, redHigh: 3, yellowLow: -1, redLow: -3 };
  it('超出規格界限 → OOS（不同時算 OOC）', () => expect(judge(limits, 3.4)).toEqual({ isOOS: true, isOOC: false }));
  it('超出管制界限 → OOC', () => expect(judge(limits, 2)).toEqual({ isOOS: false, isOOC: true }));
  it('下限同理', () => {
    expect(judge(limits, -4)).toEqual({ isOOS: true, isOOC: false });
    expect(judge(limits, -2)).toEqual({ isOOS: false, isOOC: true });
  });
  it('界限內與無資料都不是', () => {
    expect(judge(limits, 0.5)).toEqual({ isOOS: false, isOOC: false });
    expect(judge(limits, null)).toEqual({ isOOS: false, isOOC: false });
  });
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

describe('示範資料（FDM 模擬）', () => {
  const snap = fetchSnapshot(0, 0);
  const run = (site: string, sys: string) => evaluateSystem(systemById(sys)!, snap.data[site][sys]).summary;
  it('每個 Tag 都帶有 value / isOOS / isOOC', () => {
    const r = snap.data.f18p2.upw[0];
    expect(Object.keys(r)).toEqual(expect.arrayContaining(['value', 'isOOS', 'isOOC']));
  });
  it('F18P2 超純水：3 OOS、2 OOC、1 無資料，共 8 點', () => {
    const s = run('f18p2', 'upw');
    expect([s.status, s.red, s.yellow, s.gray, s.total]).toEqual(['red', 3, 2, 1, 8]);
    expect(tileText(s, 15)).toBe('3 台異常');
  });
  it('F18P7 排氣整個無資料為灰', () => {
    const s = run('f18p7', 'exhaust');
    expect(s.status).toBe('gray');
    expect(tileText(s, 15)).toBe('15 分無資料');
  });
  it('F18P1 電力：TR1 溫度 97 超出規格 → OOS 紅燈', () => expect(run('f18p1', 'power').status).toBe('red'));
  it('正常的廠區 × 系統是綠燈', () => {
    expect(run('f18p1', 'upw').status).toBe('green');
    expect(run('f18p2', 'mau').status).toBe('green');
  });
  it('重新整理後正常 Tag 仍是正常', () => {
    const again = fetchSnapshot(7, 0);
    expect(evaluateSystem(systemById('upw')!, again.data.f18p1.upw).summary.status).toBe('green');
  });
});

describe('ruleLines', () => {
  it('四條固定規則，以 OOS / OOC 說明', () => {
    const lines = ruleLines(15);
    expect(lines.map((l) => l.status)).toEqual(['red', 'yellow', 'green', 'gray']);
    expect(lines[0].text).toContain('OOS');
    expect(lines[1].text).toContain('OOC');
    expect(lines[3].text).toContain('15 分鐘');
  });
});
