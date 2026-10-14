import { describe, expect, it } from 'vitest';
import { buildFromWizard, type WizardInput } from './wizard';
import { lintLamp } from './lampLint';
import { evaluateLamp } from './blocks';
import type { LampProps } from '../types';

const W = (o: Partial<WizardInput>): WizardInput => ({ mode: 'high', varName: 'A', yellow: '', red: '', yellowLow: '', yellowHigh: '', redLow: '', redHigh: '', ...o });

describe('條件精靈', () => {
  it('高於門檻', () => expect(buildFromWizard(W({ yellow: '1', red: '3' }))).toEqual({ redExpr: 'A > 3', yellowExpr: 'A > 1', errors: [] }));
  it('低於門檻', () => expect(buildFromWizard(W({ mode: 'low', yellow: '18', red: '17.5' }))).toEqual({ redExpr: 'A < 17.5', yellowExpr: 'A < 18', errors: [] }));
  it('超出範圍', () => {
    const r = buildFromWizard(W({ mode: 'range', yellowLow: '365', yellowHigh: '395', redLow: '355', redHigh: '405' }));
    expect(r).toEqual({ redExpr: 'A < 355 or A > 405', yellowExpr: 'A < 365 or A > 395', errors: [] });
  });
  it('只填紅燈或只填黃燈', () => {
    expect(buildFromWizard(W({ red: '3' }))).toMatchObject({ redExpr: 'A > 3', yellowExpr: '' });
    expect(buildFromWizard(W({ yellow: '1' }))).toMatchObject({ redExpr: '', yellowExpr: 'A > 1' });
  });
  it('支援負數與小數', () => expect(buildFromWizard(W({ yellow: '-200', red: '-150' })).redExpr).toBe('A > -150'));
  it('紅燈比黃燈寬鬆時回報錯誤', () => {
    expect(buildFromWizard(W({ yellow: '5', red: '3' })).errors).toHaveLength(1);
    expect(buildFromWizard(W({ mode: 'low', yellow: '5', red: '8' })).errors).toHaveLength(1);
    expect(buildFromWizard(W({ mode: 'range', yellowLow: '10', yellowHigh: '20', redLow: '12', redHigh: '25' })).errors).toHaveLength(1);
    expect(buildFromWizard(W({ mode: 'range', yellowLow: '30', yellowHigh: '20' })).errors).toContain('下限必須小於上限');
  });
  it('不是數字', () => expect(buildFromWizard(W({ red: 'abc' })).errors).toContain('紅燈門檻不是數字'));
  it('沒選資料點', () => expect(buildFromWizard(W({ varName: '' })).errors).toHaveLength(1));
  it('產生的算式可以直接拿來判定', () => {
    const w = buildFromWizard(W({ yellow: '1', red: '3' }));
    const p: LampProps = { vars: [{ name: 'A', site: 'f18p2', tag: 'UPW-POL-02.TOC' }], valueExpr: '', unit: '', redExpr: w.redExpr, yellowExpr: w.yellowExpr };
    expect(evaluateLamp(p, () => 3.4).status).toBe('red');
    expect(evaluateLamp(p, () => 2).status).toBe('yellow');
    expect(evaluateLamp(p, () => 0.4).status).toBe('green');
  });
});

describe('lintLamp', () => {
  const base: LampProps = { vars: [], valueExpr: '', unit: '', redExpr: '', yellowExpr: '' };
  const A = { name: 'A', site: 'f18p2', tag: 'UPW-POL-02.TOC' };
  it('空白積木：沒資料點、沒條件', () => expect(lintLamp(base).map((n) => n.text)).toEqual(expect.arrayContaining([expect.stringContaining('資料點'), expect.stringContaining('灰色')])));
  it('資料點沒選 Tag', () => expect(lintLamp({ ...base, vars: [{ name: 'A' }], redExpr: 'A > 1' }).some((n) => n.text.includes('A 還沒選擇'))).toBe(true));
  it('資料點沒被用到', () => expect(lintLamp({ ...base, vars: [A, { name: 'B', site: 'f18p2', tag: 'UPW-POL-03.RES' }], redExpr: 'A > 1' }).some((n) => n.text.includes('B 沒有被'))).toBe(true));
  it('同一 Tag 重複', () => expect(lintLamp({ ...base, vars: [A, { ...A, name: 'B' }], redExpr: 'A > 1 or B > 1' }).some((n) => n.text.includes('同一個 Tag'))).toBe(true));
  it('紅黃相同', () => expect(lintLamp({ ...base, vars: [A], redExpr: 'A > 1', yellowExpr: 'A>1' }).some((n) => n.text.includes('完全相同'))).toBe(true));
  it('只有黃燈條件', () => expect(lintLamp({ ...base, vars: [A], yellowExpr: 'A > 1' }).some((n) => n.text.includes('只會亮黃'))).toBe(true));
  it('設定完整時沒有提醒', () => expect(lintLamp({ ...base, vars: [A], redExpr: 'A > 3', yellowExpr: 'A > 1' })).toEqual([]));
  it('算式有誤時不重複洗版（由算式欄自己顯示錯誤）', () => expect(() => lintLamp({ ...base, vars: [A], redExpr: 'A >' })).not.toThrow());
});

describe('模擬值與自訂狀態文字', () => {
  const p: LampProps = { vars: [{ name: 'A', site: 'f18p2', tag: 'UPW-POL-02.TOC' }], valueExpr: '', unit: '', redExpr: 'A > 3', yellowExpr: 'A > 1', labels: { red: '超標', green: '' } };
  it('模擬值覆蓋 FDM 數值', () => {
    expect(evaluateLamp(p, () => 0.4).status).toBe('green');
    const r = evaluateLamp(p, () => 0.4, { A: 5 });
    expect(r.status).toBe('red');
    expect(r.vars[0]).toMatchObject({ value: 5, real: 0.4, simulated: true });
  });
  it('模擬無資料', () => expect(evaluateLamp(p, () => 5, { A: null })).toMatchObject({ status: 'gray', reason: 'nodata' }));
  it('沒選 Tag 的資料點也可以模擬', () => {
    const q: LampProps = { ...p, vars: [{ name: 'A' }] };
    expect(evaluateLamp(q, () => 0, { A: 5 }).status).toBe('red');
  });
  it('自訂狀態文字，空白時用預設', () => {
    expect(evaluateLamp(p, () => 5).label).toBe('超標');
    expect(evaluateLamp(p, () => 0.4).label).toBe('正常');
    expect(evaluateLamp(p, () => 2).label).toBe('部分異常');
  });
});
