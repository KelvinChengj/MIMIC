/** 「條件精靈」：不想手寫算式時，填門檻數字就產生紅 / 黃燈條件 */
export type WizardMode = 'high' | 'low' | 'range';

export interface WizardInput {
  mode: WizardMode;
  varName: string;
  /** 欄位內容（字串，空白＝不設） */
  yellow: string;
  red: string;
  yellowLow: string;
  yellowHigh: string;
  redLow: string;
  redHigh: string;
}

const num = (s: string): number | undefined => {
  const t = s.trim();
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};

export interface WizardResult {
  redExpr: string;
  yellowExpr: string;
  errors: string[];
}

export function buildFromWizard(w: WizardInput): WizardResult {
  const v = w.varName;
  const errors: string[] = [];
  const read = (label: string, s: string) => {
    const n = num(s);
    if (Number.isNaN(n)) errors.push(`${label}不是數字`);
    return n;
  };
  const or = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(' or ');

  if (!v) return { redExpr: '', yellowExpr: '', errors: ['請先選擇資料點'] };

  if (w.mode === 'range') {
    const yl = read('黃燈下限', w.yellowLow), yh = read('黃燈上限', w.yellowHigh);
    const rl = read('紅燈下限', w.redLow), rh = read('紅燈上限', w.redHigh);
    if (yl != null && rl != null && rl > yl) errors.push('紅燈下限不可高於黃燈下限');
    if (yh != null && rh != null && rh < yh) errors.push('紅燈上限不可低於黃燈上限');
    const lo = yl ?? rl, hi = yh ?? rh;
    if (lo != null && hi != null && lo >= hi) errors.push('下限必須小於上限');
    return {
      redExpr: or(rl != null ? `${v} < ${rl}` : undefined, rh != null ? `${v} > ${rh}` : undefined),
      yellowExpr: or(yl != null ? `${v} < ${yl}` : undefined, yh != null ? `${v} > ${yh}` : undefined),
      errors,
    };
  }

  const op = w.mode === 'high' ? '>' : '<';
  const y = read('黃燈門檻', w.yellow), r = read('紅燈門檻', w.red);
  if (y != null && r != null && (w.mode === 'high' ? r < y : r > y))
    errors.push(w.mode === 'high' ? '紅燈門檻不可低於黃燈門檻（高於才異常）' : '紅燈門檻不可高於黃燈門檻（低於才異常）');
  return {
    redExpr: r != null ? `${v} ${op} ${r}` : '',
    yellowExpr: y != null ? `${v} ${op} ${y}` : '',
    errors,
  };
}
