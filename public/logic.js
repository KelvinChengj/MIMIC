// 燈號邏輯：由「規則積木」由上而下堆疊，第一個成立的規則決定燈號。
// 任何被引用的資料點無資料 → 灰燈；皆不成立 → 使用「否則」顏色。

export const COLOR_LABEL = { red: '異常', yellow: '部分異常', green: '正常', gray: '無資料' };
export const COLOR_NAME = { red: '紅', yellow: '黃', green: '綠', gray: '灰' };

export const OPS = [
  { op: '>', label: '大於', args: 1 },
  { op: '>=', label: '大於等於', args: 1 },
  { op: '<', label: '小於', args: 1 },
  { op: '<=', label: '小於等於', args: 1 },
  { op: '==', label: '等於', args: 1 },
  { op: '!=', label: '不等於', args: 1 },
  { op: 'between_in', label: '介於（含）', args: 2 },
  { op: 'between_out', label: '超出範圍', args: 2 },
];
export const opArgs = (op) => OPS.find((o) => o.op === op)?.args ?? 1;

export function testCond(c, v) {
  const a = c.value, b = c.value2;
  if (a == null) return false; // 尚未填門檻 → 視為不成立
  switch (c.op) {
    case '>': return v > a;
    case '>=': return v >= a;
    case '<': return v < a;
    case '<=': return v <= a;
    case '==': return v === a;
    case '!=': return v !== a;
    case 'between_in': return b != null && v >= Math.min(a, b) && v <= Math.max(a, b);
    case 'between_out': return b != null && (v < Math.min(a, b) || v > Math.max(a, b));
    default: return false;
  }
}

export const lightTags = (light) => [...new Set(light.rules.flatMap((r) => r.conds.map((c) => c.tag).filter(Boolean)))];

// values: { tag: { value, ts } | null }
export function evaluate(light, values) {
  const tags = lightTags(light);
  if (!tags.length) return { color: 'gray', reason: '尚未設定資料點' };
  const missing = tags.filter((t) => values[t]?.value == null);
  if (missing.length) return { color: 'gray', reason: `無資料：${missing.join('、')}` };

  for (let i = 0; i < light.rules.length; i++) {
    const r = light.rules[i];
    const conds = r.conds.filter((c) => c.tag);
    if (!conds.length) continue;
    const results = conds.map((c) => testCond(c, values[c.tag].value));
    if (r.mode === 'all' ? results.every(Boolean) : results.some(Boolean)) {
      return { color: r.color, reason: `符合第 ${i + 1} 條規則`, ruleIndex: i };
    }
  }
  return { color: light.fallback || 'green', reason: '皆不符合，採「否則」', ruleIndex: -1 };
}

export function describeCond(c) {
  const o = OPS.find((x) => x.op === c.op);
  const v = (x) => (x == null ? '?' : x);
  return `${c.tag || '?'} ${o?.label ?? c.op} ${o?.args === 2 ? `${v(c.value)} ~ ${v(c.value2)}` : v(c.value)}`;
}
