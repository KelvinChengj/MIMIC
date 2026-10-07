import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, testCond } from '../public/logic.js';

const val = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v == null ? null : { value: v }]));
const light = (rules, fallback = 'green') => ({ id: 'x', label: 'x', fallback, rules });
const rule = (color, mode, ...conds) => ({ id: color, color, mode, conds });
const c = (tag, op, value, value2) => ({ tag, op, value, value2 });

test('運算子', () => {
  assert.ok(testCond(c('a', 'between_in', 1, 5), 3));
  assert.ok(!testCond(c('a', 'between_in', 5, 1), 9));
  assert.ok(testCond(c('a', 'between_out', 1, 5), 9));
  assert.ok(!testCond(c('a', '>', null), 9)); // 未填門檻不成立
});

test('第一個成立的規則決定顏色', () => {
  const l = light([rule('red', 'any', c('t', '>', 8)), rule('yellow', 'any', c('t', '>', 6))]);
  assert.equal(evaluate(l, val({ t: 9 })).color, 'red');
  assert.equal(evaluate(l, val({ t: 7 })).color, 'yellow');
  assert.equal(evaluate(l, val({ t: 1 })).color, 'green');
});

test('符合全部 / 任一', () => {
  const all = light([rule('red', 'all', c('a', '>', 1), c('b', '>', 1))]);
  assert.equal(evaluate(all, val({ a: 2, b: 0 })).color, 'green');
  assert.equal(evaluate(all, val({ a: 2, b: 2 })).color, 'red');
  const any = light([rule('red', 'any', c('a', '>', 1), c('b', '>', 1))]);
  assert.equal(evaluate(any, val({ a: 2, b: 0 })).color, 'red');
});

test('無資料或未設定 → 灰', () => {
  const l = light([rule('red', 'any', c('t', '>', 8))]);
  assert.equal(evaluate(l, val({ t: null })).color, 'gray');
  assert.equal(evaluate(l, {}).color, 'gray');
  assert.equal(evaluate(light([]), {}).color, 'gray');
});

test('fallback 可為黃/紅', () => {
  assert.equal(evaluate(light([rule('red', 'any', c('t', '>', 8))], 'yellow'), val({ t: 1 })).color, 'yellow');
});
