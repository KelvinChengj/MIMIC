/**
 * 燈號積木用的小型算式語言：
 *   四則運算  + - * /（也接受 × ÷）與括號
 *   比較      > >= < <= == !=（也接受 ≥ ≤ ≠ =）
 *   邏輯      and or not（也接受 && || ! 且 或 非）
 *   函式      abs(x) min(a,b,…) max(a,b,…) avg(a,b,…) round(x,位數)
 * 變數是積木上的資料點名稱 A、B、C…（不分大小寫）。
 */

export type Value = number | boolean;

export class ExprError extends Error {
  constructor(message: string, public pos?: number) {
    super(message);
  }
}
/** 算式用到的資料點目前沒有數值 */
export class NoDataError extends Error {
  constructor(public varName: string) {
    super(`資料點 ${varName} 目前無資料`);
  }
}

type Tok = { t: 'num' | 'id' | 'op' | '(' | ')' | ',' | 'end'; s: string; pos: number; n?: number; raw?: string };

const FULL: Record<string, string> = {
  '（': '(', '）': ')', '，': ',', '＋': '+', '－': '-', '−': '-', '＊': '*', '×': '*', '／': '/', '÷': '/',
  '＞': '>', '＜': '<', '＝': '=', '！': '!', '≥': '>=', '≤': '<=', '≠': '!=', '＆': '&', '｜': '|', '。': '.',
};
const norm = (c: string | undefined) => (c === undefined ? '' : FULL[c] ?? c);
const WORDS: Record<string, string> = { and: 'and', or: 'or', not: 'not', 且: 'and', 或: 'or', 非: 'not' };

export function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = norm(src[i]);
    const pos = i;
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(norm(src[i + 1])))) {
      let s = '';
      while (i < src.length && /[0-9.]/.test(norm(src[i]))) s += norm(src[i++]);
      if ((s.match(/\./g) ?? []).length > 1 || !Number.isFinite(Number(s))) throw new ExprError(`「${s}」不是正確的數字`, pos);
      out.push({ t: 'num', s, pos, n: Number(s) });
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let s = '';
      while (i < src.length && /[A-Za-z0-9_]/.test(norm(src[i]))) s += norm(src[i++]);
      const w = WORDS[s.toLowerCase()];
      out.push(w ? { t: 'op', s: w, pos } : { t: 'id', s: s.toUpperCase(), pos, raw: s });
      continue;
    }
    if (WORDS[c]) { out.push({ t: 'op', s: WORDS[c], pos }); i++; continue; }
    if (c === '(' || c === ')' || c === ',') { out.push({ t: c, s: c, pos }); i++; continue; }
    // 運算符號：先試兩個字元（>=、==、&& …）
    const two = c.length === 2 ? c : c + norm(src[i + 1]);
    const adv = c.length === 2 ? 1 : 2;
    if (['>=', '<=', '==', '!=', '&&', '||'].includes(two)) {
      out.push({ t: 'op', s: two === '&&' ? 'and' : two === '||' ? 'or' : two, pos });
      i += adv;
      continue;
    }
    if (c === '&') { out.push({ t: 'op', s: 'and', pos }); i++; continue; }
    if (c === '|') { out.push({ t: 'op', s: 'or', pos }); i++; continue; }
    if (c === '=') { out.push({ t: 'op', s: '==', pos }); i++; continue; }
    if (c === '!') { out.push({ t: 'op', s: 'not', pos }); i++; continue; }
    if (['+', '-', '*', '/', '>', '<'].includes(c)) { out.push({ t: 'op', s: c, pos }); i++; continue; }
    throw new ExprError(`看不懂「${src[i]}」這個符號`, pos);
  }
  out.push({ t: 'end', s: '', pos: src.length });
  return out;
}

export type Node =
  | { k: 'num'; v: number }
  | { k: 'var'; name: string; pos: number }
  | { k: 'un'; op: '-' | '+' | 'not'; e: Node }
  | { k: 'bin'; op: string; l: Node; r: Node; pos: number }
  | { k: 'call'; fn: string; args: Node[]; pos: number };

export const FUNCTIONS = ['abs', 'min', 'max', 'avg', 'round'];

class Parser {
  private i = 0;
  constructor(private toks: Tok[]) {}
  private cur(): Tok { return this.toks[this.i]; }
  private isOp(...ops: string[]) { return this.cur().t === 'op' && ops.includes(this.cur().s); }
  private unexpected(): never {
    if (this.cur().t === 'end') throw new ExprError('算式還沒寫完', this.cur().pos);
    throw new ExprError(`這裡不應該出現「${this.cur().s}」`, this.cur().pos);
  }

  parse(): Node {
    const n = this.or();
    if (this.cur().t !== 'end') {
      if (this.cur().t === ')') throw new ExprError('多了一個右括號 )', this.cur().pos);
      throw new ExprError(`「${this.cur().s}」前面少了運算符號（例如 + 或 and）`, this.cur().pos);
    }
    return n;
  }
  private or(): Node {
    let l = this.and();
    while (this.isOp('or')) { const pos = this.cur().pos; this.i++; l = { k: 'bin', op: 'or', l, r: this.and(), pos }; }
    return l;
  }
  private and(): Node {
    let l = this.not();
    while (this.isOp('and')) { const pos = this.cur().pos; this.i++; l = { k: 'bin', op: 'and', l, r: this.not(), pos }; }
    return l;
  }
  private not(): Node {
    if (this.isOp('not')) { this.i++; return { k: 'un', op: 'not', e: this.not() }; }
    return this.cmp();
  }
  private cmp(): Node {
    const l = this.add();
    if (this.isOp('>', '>=', '<', '<=', '==', '!=')) {
      const { s, pos } = this.cur();
      this.i++;
      const r = this.add();
      if (this.isOp('>', '>=', '<', '<=', '==', '!='))
        throw new ExprError('一次只能比較兩個數，區間請寫成 A > 1 and A < 3', this.cur().pos);
      return { k: 'bin', op: s, l, r, pos };
    }
    return l;
  }
  private add(): Node {
    let l = this.mul();
    while (this.isOp('+', '-')) { const { s, pos } = this.cur(); this.i++; l = { k: 'bin', op: s, l, r: this.mul(), pos }; }
    return l;
  }
  private mul(): Node {
    let l = this.unary();
    while (this.isOp('*', '/')) { const { s, pos } = this.cur(); this.i++; l = { k: 'bin', op: s, l, r: this.unary(), pos }; }
    return l;
  }
  private unary(): Node {
    if (this.isOp('-', '+')) { const op = this.cur().s as '-' | '+'; this.i++; return { k: 'un', op, e: this.unary() }; }
    return this.primary();
  }
  private primary(): Node {
    const t = this.cur();
    if (t.t === 'num') { this.i++; return { k: 'num', v: t.n! }; }
    if (t.t === 'id') {
      this.i++;
      if (this.cur().t === '(') {
        const fn = t.s.toLowerCase();
        if (!FUNCTIONS.includes(fn)) throw new ExprError(`不認得函式「${t.raw}」，可用：${FUNCTIONS.join('、')}`, t.pos);
        this.i++;
        const args: Node[] = [];
        if (this.cur().t !== ')') {
          args.push(this.or());
          while (this.cur().t === ',') { this.i++; args.push(this.or()); }
        }
        if (this.cur().t !== ')') throw new ExprError('函式少了右括號 )', this.cur().pos);
        this.i++;
        return { k: 'call', fn, args, pos: t.pos };
      }
      return { k: 'var', name: t.s, pos: t.pos };
    }
    if (t.t === '(') {
      this.i++;
      const n = this.or();
      if (this.cur().t !== ')') throw new ExprError('少了右括號 )', this.cur().pos);
      this.i++;
      return n;
    }
    return this.unexpected();
  }
}

export type Compiled = { ok: true; node: Node; vars: string[] } | { ok: false; error: string; pos?: number };

export function collectVars(n: Node, acc = new Set<string>()): string[] {
  if (n.k === 'var') acc.add(n.name);
  else if (n.k === 'un') collectVars(n.e, acc);
  else if (n.k === 'bin') { collectVars(n.l, acc); collectVars(n.r, acc); }
  else if (n.k === 'call') n.args.forEach((a) => collectVars(a, acc));
  return [...acc];
}

export function compile(src: string): Compiled {
  try {
    const node = new Parser(tokenize(src)).parse();
    return { ok: true, node, vars: collectVars(node) };
  } catch (e) {
    if (e instanceof ExprError) return { ok: false, error: e.message, pos: e.pos };
    throw e;
  }
}

export type Env = Record<string, number | null | undefined>;

const needNum = (v: Value, where: string): number => {
  if (typeof v !== 'number') throw new ExprError(`${where}必須是數字，不能是「成立／不成立」`);
  return v;
};
const needBool = (v: Value, where: string): boolean => {
  if (typeof v !== 'boolean') throw new ExprError(`${where}必須是條件（例如 A > 3），目前是數字`);
  return v;
};

export function evaluate(n: Node, env: Env): Value {
  switch (n.k) {
    case 'num': return n.v;
    case 'var': {
      if (!(n.name in env)) throw new ExprError(`找不到資料點「${n.name}」`, n.pos);
      const v = env[n.name];
      if (v == null) throw new NoDataError(n.name);
      return v;
    }
    case 'un': {
      const v = evaluate(n.e, env);
      if (n.op === 'not') return !needBool(v, 'not 後面');
      return n.op === '-' ? -needNum(v, '負號後面') : needNum(v, '正號後面');
    }
    case 'call': {
      const a = n.args.map((x) => needNum(evaluate(x, env), `${n.fn}() 的參數`));
      if (n.fn !== 'round' && a.length === 0) throw new ExprError(`${n.fn}() 至少要有一個數`, n.pos);
      switch (n.fn) {
        case 'abs': return Math.abs(a[0]);
        case 'min': return Math.min(...a);
        case 'max': return Math.max(...a);
        case 'avg': return a.reduce((s, x) => s + x, 0) / a.length;
        default: {
          if (a.length < 1 || a.length > 2) throw new ExprError('round(x, 位數) 需要 1～2 個參數', n.pos);
          const f = 10 ** Math.trunc(a[1] ?? 0);
          return Math.round(a[0] * f) / f;
        }
      }
    }
    case 'bin': {
      if (n.op === 'and' || n.op === 'or') {
        const l = needBool(evaluate(n.l, env), `${n.op} 左邊`);
        // 短路：or 左邊成立、and 左邊不成立時，右邊的資料點即使無資料也不影響結果
        if (n.op === 'or' && l) return true;
        if (n.op === 'and' && !l) return false;
        return needBool(evaluate(n.r, env), `${n.op} 右邊`);
      }
      const l = evaluate(n.l, env);
      const r = evaluate(n.r, env);
      if (n.op === '==' || n.op === '!=') {
        if (typeof l !== typeof r) throw new ExprError('不能拿數字和「成立／不成立」比較相等', n.pos);
        return n.op === '==' ? l === r : l !== r;
      }
      const a = needNum(l, `${n.op} 左邊`);
      const b = needNum(r, `${n.op} 右邊`);
      switch (n.op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/':
          if (b === 0) throw new ExprError('不能除以 0', n.pos);
          return a / b;
        case '>': return a > b;
        case '>=': return a >= b;
        case '<': return a < b;
        default: return a <= b;
      }
    }
  }
}

/** 數字顯示：去掉浮點誤差（0.1+0.2 → 0.3） */
export const fmtNum = (v: number) => String(Number(v.toPrecision(8)));

/** 把算式裡的變數換成目前數值，讓使用者看到「3.4 > 3 → 成立」 */
export function substitute(src: string, env: Env): string {
  const toks = tokenize(src).filter((t) => t.t !== 'end');
  let out = '';
  toks.forEach((t, i) => {
    const prev = toks[i - 1];
    const isFn = t.t === 'id' && toks[i + 1]?.t === '(';
    const text = isFn ? t.s.toLowerCase() : t.t === 'id' ? (env[t.s] == null ? `${t.s}(無資料)` : fmtNum(env[t.s]!)) : t.s;
    const tight = t.t === ')' || t.t === ',' || prev?.t === '(' || (t.t === '(' && prev?.t === 'id');
    out += (i === 0 || tight ? '' : ' ') + text;
  });
  return out;
}

export type RunResult =
  | { state: 'empty' }
  | { state: 'ok'; value: Value; traced: string }
  | { state: 'nodata'; varName: string }
  | { state: 'error'; message: string; pos?: number };

/** expect：條件要得到成立／不成立；value 算式要得到數字或條件皆可 */
export function run(src: string, env: Env, expect: 'bool' | 'any'): RunResult {
  if (!src.trim()) return { state: 'empty' };
  const c = compile(src);
  if (!c.ok) return { state: 'error', message: c.error, pos: c.pos };
  const unknown = c.vars.find((v) => !(v in env));
  if (unknown) return { state: 'error', message: `找不到資料點「${unknown}」，請先在上方新增` };
  try {
    const value = evaluate(c.node, env);
    if (expect === 'bool' && typeof value !== 'boolean')
      return { state: 'error', message: '這裡要寫條件，結果必須是成立／不成立（例如 A > 3），目前算出來是數字' };
    return { state: 'ok', value, traced: substitute(src, env) };
  } catch (e) {
    if (e instanceof NoDataError) return { state: 'nodata', varName: e.varName };
    if (e instanceof ExprError) return { state: 'error', message: e.message, pos: e.pos };
    throw e;
  }
}
