import { describe, expect, it } from 'vitest';
import { compile, run, substitute } from './expr';

const val = (src: string, env = {}) => {
  const r = run(src, env, 'any');
  if (r.state !== 'ok') throw new Error(JSON.stringify(r));
  return r.value;
};

describe('四則運算', () => {
  it('先乘除後加減', () => expect(val('1 + 2 * 3')).toBe(7));
  it('括號', () => expect(val('(1 + 2) * 3')).toBe(9));
  it('除法與負號', () => expect(val('-6 / 4')).toBe(-1.5));
  it('× ÷ 與全形', () => expect(val('（2 × 3） ÷ 4 ＋ 1')).toBe(2.5));
  it('用變數', () => expect(val('(A + B) / 2', { A: 3, B: 5 })).toBe(4));
  it('變數不分大小寫', () => expect(val('a * 2', { A: 4 })).toBe(8));
  it('函式', () => {
    expect(val('max(A, B, 10)', { A: 3, B: 5 })).toBe(10);
    expect(val('avg(A, B)', { A: 3, B: 5 })).toBe(4);
    expect(val('abs(A - B)', { A: 3, B: 5 })).toBe(2);
    expect(val('round(A, 1)', { A: 3.14159 })).toBe(3.1);
  });
  it('除以 0 回報錯誤', () => expect(run('A / B', { A: 1, B: 0 }, 'any')).toMatchObject({ state: 'error' }));
});

describe('比較與 and / or / not', () => {
  const env = { A: 3.4, B: 17.6 };
  it('比較', () => {
    expect(val('A > 3', env)).toBe(true);
    expect(val('A >= 3.4', env)).toBe(true);
    expect(val('B < 17.5', env)).toBe(false);
    expect(val('A == 3.4', env)).toBe(true);
    expect(val('A != 3.4', env)).toBe(false);
    expect(val('A ≥ 4', env)).toBe(false);
  });
  it('and 優先於 or', () => expect(val('A > 9 and B > 9 or A > 1', env)).toBe(true));
  it('括號改變順序', () => expect(val('A > 9 and (B > 9 or A > 1)', env)).toBe(false));
  it('not', () => expect(val('not (A > 9)', env)).toBe(true));
  it('中文與符號寫法', () => {
    expect(val('A > 3 且 B > 17', env)).toBe(true);
    expect(val('A > 9 或 B > 17', env)).toBe(true);
    expect(val('A > 3 && B < 1 || A > 1', env)).toBe(true);
    expect(val('!(A > 9)', env)).toBe(true);
  });
  it('算式裡可混用運算', () => expect(val('(A + B) / 2 > 10 and A * 2 < 7', env)).toBe(true));
});

describe('無資料與短路', () => {
  it('用到無資料的變數 → nodata', () => {
    expect(run('A > 1', { A: null }, 'bool')).toEqual({ state: 'nodata', varName: 'A' });
  });
  it('or 左邊成立時，右邊無資料不影響', () => {
    expect(run('A > 1 or B > 1', { A: 5, B: null }, 'bool')).toMatchObject({ state: 'ok', value: true });
  });
  it('and 左邊不成立時，右邊無資料不影響', () => {
    expect(run('A > 9 and B > 1', { A: 5, B: null }, 'bool')).toMatchObject({ state: 'ok', value: false });
  });
  it('需要右邊才能決定時 → nodata', () => {
    expect(run('A > 1 and B > 1', { A: 5, B: null }, 'bool')).toEqual({ state: 'nodata', varName: 'B' });
  });
});

describe('錯誤訊息', () => {
  const err = (src: string, env = { A: 1 }) => {
    const r = run(src, env, 'bool');
    expect(r.state).toBe('error');
    return (r as { message: string }).message;
  };
  it('空白', () => expect(run('  ', {}, 'bool')).toEqual({ state: 'empty' }));
  it('少右括號', () => expect(err('(A > 1')).toContain('括號'));
  it('多右括號', () => expect(err('A > 1)')).toContain('括號'));
  it('寫不完', () => expect(err('A >')).toContain('還沒寫完'));
  it('少運算符號', () => expect(err('A B')).toContain('運算符號'));
  it('不存在的資料點', () => expect(err('Z > 1')).toContain('Z'));
  it('未知函式', () => expect(err('foo(A) > 1')).toContain('foo'));
  it('怪符號', () => expect(err('A ? 1')).toContain('?'));
  it('連續比較', () => expect(err('1 < A < 3')).toContain('區間'));
  it('條件算出數字', () => expect(err('A + 1')).toContain('條件'));
  it('and 兩邊要是條件', () => expect(err('A and 1')).toContain('條件'));
  it('不能對 true/false 做加減', () => expect(err('(A > 1) + 1 > 0')).toContain('數字'));
  it('compile 回報位置', () => expect(compile('A > > 1')).toMatchObject({ ok: false, pos: 4 }));
});

describe('substitute', () => {
  it('代入數值', () => expect(substitute('A > 3 and B < 17.5', { A: 3.4, B: 17.6 })).toBe('3.4 > 3 and 17.6 < 17.5'));
  it('括號與函式的間距', () => expect(substitute('max(A, B) / (A + 1)', { A: 2, B: 5 })).toBe('max(2, 5) / (2 + 1)'));
  it('無資料標示', () => expect(substitute('A > 1', { A: null })).toBe('A(無資料) > 1'));
  it('浮點誤差', () => expect(substitute('A + B', { A: 0.1 + 0.2, B: 1 })).toBe('0.3 + 1'));
});
