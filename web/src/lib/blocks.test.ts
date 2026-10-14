import { describe, expect, it } from 'vitest';
import { conditionsFromRules, evaluateLamp, nextVarName } from './blocks';
import { defaultRules } from '../state/RulesContext';
import { ALL_TAGS, TAG_BY_KEY } from './blocks';
import type { LampProps } from '../types';

const base = (over: Partial<LampProps>): LampProps => ({
  vars: [], valueExpr: '', unit: '', redExpr: '', yellowExpr: '', ...over,
});
const vars = [
  { name: 'A', site: 'f18p2', tag: 'UPW-POL-02.TOC' },
  { name: 'B', site: 'f18p2', tag: 'UPW-POL-03.RES' },
];
const getter = (m: Record<string, number | null>) => (_s: string, tag: string) => m[tag] ?? null;

describe('evaluateLamp', () => {
  const vals = { 'UPW-POL-02.TOC': 3.4, 'UPW-POL-03.RES': 18.2 };
  it('紅燈條件成立 → 紅，並說明代入的數值', () => {
    const r = evaluateLamp(base({ vars, redExpr: 'A > 3 or B < 17.5', yellowExpr: 'A > 1' }), getter(vals));
    expect(r.status).toBe('red');
    expect(r.message).toBe('紅燈條件成立：3.4 > 3 or 18.2 < 17.5');
  });
  it('紅不成立、黃成立 → 黃', () => {
    const r = evaluateLamp(base({ vars, redExpr: 'A > 5', yellowExpr: 'A > 1 and B > 18' }), getter(vals));
    expect(r.status).toBe('yellow');
  });
  it('都不成立 → 綠', () => {
    expect(evaluateLamp(base({ vars, redExpr: 'A > 5', yellowExpr: 'A > 4' }), getter(vals)).status).toBe('green');
  });
  it('只設紅燈條件也可以', () => {
    expect(evaluateLamp(base({ vars, redExpr: 'A > 5' }), getter(vals)).status).toBe('green');
  });
  it('尚未設定條件 → 灰', () => {
    const r = evaluateLamp(base({ vars }), getter(vals));
    expect([r.status, r.reason]).toEqual(['gray', 'unset']);
  });
  it('資料點無資料 → 灰', () => {
    const r = evaluateLamp(base({ vars, redExpr: 'A > 3' }), getter({ 'UPW-POL-03.RES': 18 }));
    expect([r.status, r.reason]).toEqual(['gray', 'nodata']);
  });
  it('尚未選擇 Tag 的資料點視為無資料', () => {
    const r = evaluateLamp(base({ vars: [{ name: 'A' }], redExpr: 'A > 3' }), getter({}));
    expect(r.reason).toBe('nodata');
  });
  it('公式有誤 → 灰並帶錯誤訊息', () => {
    const r = evaluateLamp(base({ vars, redExpr: 'A >' }), getter(vals));
    expect([r.status, r.reason]).toEqual(['gray', 'error']);
    expect(r.message).toContain('還沒寫完');
  });
  it('顯示值算式', () => {
    const r = evaluateLamp(base({ vars, valueExpr: '(A + B) / 2', unit: 'x', redExpr: 'A > 5' }), getter(vals));
    expect([r.display, r.unit]).toEqual(['10.8', 'x']);
  });
  it('單一資料點且沒寫算式 → 直接顯示該點數值與單位', () => {
    const r = evaluateLamp(base({ vars: [vars[0]], redExpr: 'A > 3' }), getter(vals));
    expect([r.display, r.unit]).toEqual(['3.4', 'ppb']);
  });
});

describe('其他', () => {
  it('nextVarName 補第一個沒用過的字母', () => {
    expect(nextVarName([])).toBe('A');
    expect(nextVarName([{ name: 'A' }, { name: 'C' }])).toBe('B');
  });
  it('可選資料點涵蓋所有廠區', () => {
    expect(new Set(ALL_TAGS.map((t) => t.siteId)).size).toBe(4);
    expect(ALL_TAGS.length).toBe(TAG_BY_KEY.size);
  });
  it('由系統門檻帶出條件算式', () => {
    const tag = TAG_BY_KEY.get('f18p2|UPW-POL-02.TOC')!;
    expect(conditionsFromRules('A', tag, defaultRules())).toEqual({ redExpr: 'A > 3', yellowExpr: 'A > 1' });
    const v = TAG_BY_KEY.get('f18p1|PWR-TR1.VLT')!;
    expect(conditionsFromRules('B', v, defaultRules()).redExpr).toBe('B > 405 or B < 355');
  });
});
