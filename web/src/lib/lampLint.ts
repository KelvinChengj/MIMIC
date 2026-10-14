import { compile } from './expr';
import type { LampProps } from '../types';

export interface LintNote {
  level: 'warn' | 'info';
  text: string;
}

/** 燈號積木的檢查提醒：不擋存檔，只告訴使用者哪裡可能不是他想要的 */
export function lintLamp(p: LampProps): LintNote[] {
  const notes: LintNote[] = [];
  const used = new Set<string>();
  for (const src of [p.redExpr, p.yellowExpr, p.valueExpr]) {
    const c = compile(src);
    if (c.ok) c.vars.forEach((v) => used.add(v));
  }

  if (p.vars.length === 0) notes.push({ level: 'warn', text: '還沒有資料點。先新增資料點，算式才有數值可以判斷。' });
  for (const v of p.vars) {
    if (!v.tag) notes.push({ level: 'warn', text: `資料點 ${v.name} 還沒選擇 Tag，會一直被當成無資料。` });
    else if (!used.has(v.name)) notes.push({ level: 'info', text: `資料點 ${v.name} 沒有被任何算式用到。` });
  }
  const seen = new Map<string, string>();
  for (const v of p.vars) {
    if (!v.tag) continue;
    const k = `${v.site}|${v.tag}`;
    if (seen.has(k)) notes.push({ level: 'info', text: `資料點 ${seen.get(k)} 與 ${v.name} 是同一個 Tag。` });
    else seen.set(k, v.name);
  }
  const red = p.redExpr.trim(), yellow = p.yellowExpr.trim();
  if (!red && !yellow) notes.push({ level: 'warn', text: '紅燈、黃燈條件都還沒設定，燈號會一直是灰色。' });
  else if (!red) notes.push({ level: 'info', text: '沒有紅燈條件，這顆燈最嚴重只會亮黃燈。' });
  if (red && red.replace(/\s+/g, '') === yellow.replace(/\s+/g, '')) notes.push({ level: 'warn', text: '紅燈與黃燈條件完全相同，黃燈永遠不會亮。' });
  return notes;
}
