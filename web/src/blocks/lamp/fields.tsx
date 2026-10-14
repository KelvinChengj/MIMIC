import { useMemo, useRef, useState } from 'react';
import { SITES } from '../../catalog/catalog';
import { ALL_TAGS, type TagInfo } from '../../lib/blocks';
import { fmtNum, type RunResult } from '../../lib/expr';
import { Dot } from '../../components/Lamp';
import type { BlockVar } from '../../types';

export const OPS_MATH: [string, string][] = [['+', '+'], ['−', '-'], ['×', '*'], ['÷', '/'], ['(', '('], [')', ')']];
export const OPS_CMP: [string, string][] = [['>', '>'], ['≥', '>='], ['<', '<'], ['≤', '<='], ['=', '=='], ['≠', '!=']];
export const OPS_LOGIC: [string, string][] = [['and', 'and'], ['or', 'or'], ['not', 'not']];

/** 資料點選擇：搜尋所有廠區的 Tag */
export function TagPicker({ value, onPick, startOpen }: { value?: TagInfo; onPick: (t: TagInfo) => void; startOpen?: boolean }) {
  const [open, setOpen] = useState(!!startOpen);
  const [q, setQ] = useState('');
  const [site, setSite] = useState('');
  const matches = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return ALL_TAGS.filter((t) => {
      if (site && t.siteId !== site) return false;
      const hay = `${t.siteName} ${t.name} ${t.desc} ${t.systemName}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [q, site]);

  return (
    <div className="tp">
      <button type="button" className={`tp__btn ${value ? '' : 'is-empty'}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {value ? (
          <>
            <span className="tp__name"><b>{value.siteName}</b> · <code>{value.name}</code></span>
            <small>{value.desc}{value.unit ? ` · ${value.unit}` : ''}</small>
          </>
        ) : (
          <span>選擇資料點…</span>
        )}
      </button>
      {open && (
        <div className="tp__panel" onKeyDown={(e) => e.key === 'Escape' && (e.stopPropagation(), setOpen(false))}>
          <div className="tp__search">
            <input autoFocus type="search" value={q} placeholder="搜尋 Tag 名稱或說明，例如 TOC、電阻率、MAU" aria-label="搜尋資料點" onChange={(e) => setQ(e.target.value)} />
            <select value={site} onChange={(e) => setSite(e.target.value)} aria-label="廠區">
              <option value="">全部廠區</option>
              {SITES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <ul className="tp__list" role="listbox" aria-label="資料點清單">
            {matches.slice(0, 60).map((t) => (
              <li key={t.key}>
                <button type="button" role="option" aria-selected={value?.key === t.key} onClick={() => { onPick(t); setOpen(false); setQ(''); }}>
                  <span><b>{t.siteName}</b> · <code>{t.name}</code></span>
                  <small>{t.desc}{t.unit ? ` · ${t.unit}` : ''}</small>
                </button>
              </li>
            ))}
            {matches.length === 0 && <li className="tp__none">找不到符合的資料點</li>}
            {matches.length > 60 && <li className="tp__none">還有 {matches.length - 60} 筆，請輸入更多關鍵字縮小範圍</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

function Outcome({ run, kind }: { run: RunResult; kind: 'cond' | 'value' }) {
  if (run.state === 'empty') return null;
  if (run.state === 'error') return <p className="ef__msg ef__msg--error" role="alert">⚠ {run.message}</p>;
  if (run.state === 'nodata') return <p className="ef__msg ef__msg--warn">資料點 {run.varName} 目前無資料，這個條件無法判斷</p>;
  if (kind === 'value')
    return <p className="ef__msg">代入：<code>{run.traced}</code> → <b>{typeof run.value === 'boolean' ? (run.value ? '成立' : '不成立') : fmtNum(run.value)}</b></p>;
  return (
    <p className="ef__msg">
      代入：<code>{run.traced}</code> → <b className={run.value ? 'is-true' : 'is-false'}>{run.value ? '成立' : '不成立'}</b>
    </p>
  );
}

/** 算式輸入欄：附變數與運算符號小工具，並即時顯示代入數值後的結果或錯誤 */
export function ExprField({ id, label, dot, hint, value, onChange, vars, run, kind, ops }: {
  id: string;
  label: string;
  dot?: 'red' | 'yellow';
  hint: string;
  value: string;
  onChange: (v: string) => void;
  vars: BlockVar[];
  run: RunResult;
  kind: 'cond' | 'value';
  ops: [string, string][][];
}) {
  const ref = useRef<HTMLInputElement>(null);

  const insert = (text: string, atom = false) => {
    const el = ref.current;
    const s = el?.selectionStart ?? value.length;
    const e = el?.selectionEnd ?? value.length;
    const before = value[s - 1];
    const after = value[e];
    const paren = text === '(' || text === ')';
    const left = !paren && before && !/[\s(]/.test(before) && !(atom && !/[A-Za-z0-9_)]/.test(before)) ? ' ' : '';
    const right = !paren && !atom && !(after && /[\s)]/.test(after)) ? ' ' : '';
    onChange(value.slice(0, s) + left + text + right + value.slice(e));
    const caret = s + left.length + text.length + right.length;
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(caret, caret); });
  };

  return (
    <div className="ef">
      <label htmlFor={id}>{dot && <Dot status={dot} />} {label}</label>
      <input
        id={id} ref={ref} className="ef__input" value={value} placeholder={hint}
        spellCheck={false} autoComplete="off"
        aria-invalid={run.state === 'error'} aria-describedby={`${id}-msg`}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="ef__tools" role="group" aria-label={`${label}的輸入小工具`}>
        {vars.map((v) => (
          <button key={v.name} type="button" className="chip chip--var" onClick={() => insert(v.name, true)} title={v.tag ? `${v.site} ${v.tag}` : '尚未選擇資料點'}>{v.name}</button>
        ))}
        {vars.length > 0 && <span className="ef__sep" />}
        {ops.map((grp, i) => (
          <span className="ef__grp" key={i}>
            {grp.map(([shown, ins]) => (
              <button key={ins} type="button" className="chip" onClick={() => insert(ins)} aria-label={`插入 ${ins}`}>{shown}</button>
            ))}
          </span>
        ))}
      </div>
      <div id={`${id}-msg`} aria-live="polite"><Outcome run={run} kind={kind} /></div>
    </div>
  );
}
