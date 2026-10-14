import { useMemo, useRef, useState } from 'react';
import { ALL_TAGS, conditionsFromRules, evaluateBlock, nextVarName, type BlockResult, type TagInfo } from '../lib/blocks';
import type { RunResult } from '../lib/expr';
import { SITES } from '../catalog/catalog';
import { useValueGetter } from '../state/derived';
import { useRules } from '../state/RulesContext';
import type { BlockVar, UserBlock } from '../types';
import { PlusIcon, TrashIcon } from './Icons';
import { Dot, LampTriple } from './Lamp';
import { Modal } from './Modal';

const OPS_MATH: [string, string][] = [['+', '+'], ['−', '-'], ['×', '*'], ['÷', '/'], ['(', '('], [')', ')']];
const OPS_CMP: [string, string][] = [['>', '>'], ['≥', '>='], ['<', '<'], ['≤', '<='], ['=', '=='], ['≠', '!=']];
const OPS_LOGIC: [string, string][] = [['and', 'and'], ['or', 'or'], ['not', 'not']];

/* ───────── 資料點選擇 ───────── */

function TagPicker({ value, onPick, startOpen }: { value?: TagInfo; onPick: (t: TagInfo) => void; startOpen?: boolean }) {
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

/* ───────── 算式輸入欄 ───────── */

function Outcome({ run, kind }: { run: RunResult; kind: 'cond' | 'value' }) {
  if (run.state === 'empty') return null;
  if (run.state === 'error') return <p className="ef__msg ef__msg--error" role="alert">⚠ {run.message}</p>;
  if (run.state === 'nodata') return <p className="ef__msg ef__msg--warn">資料點 {run.varName} 目前無資料，這個條件無法判斷</p>;
  if (kind === 'value') return <p className="ef__msg">代入：<code>{run.traced}</code> → <b>{typeof run.value === 'boolean' ? (run.value ? '成立' : '不成立') : String(Number(Number(run.value).toPrecision(8)))}</b></p>;
  return (
    <p className="ef__msg">
      代入：<code>{run.traced}</code> → <b className={run.value ? 'is-true' : 'is-false'}>{run.value ? '成立' : '不成立'}</b>
    </p>
  );
}

function ExprField({ id, label, dot, hint, value, onChange, vars, run, kind, ops }: {
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
    const next = value.slice(0, s) + left + text + right + value.slice(e);
    onChange(next);
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

/* ───────── 預覽：判斷過程 ───────── */

const runText = (r: RunResult, kind: 'cond' | 'value' = 'cond'): string => {
  if (r.state === 'empty') return '未設定';
  if (r.state === 'error') return `⚠ ${r.message}`;
  if (r.state === 'nodata') return `資料點 ${r.varName} 無資料`;
  if (typeof r.value === 'boolean') return `${r.traced} → ${r.value ? '成立' : '不成立'}`;
  return kind === 'value' ? `${r.traced} = ${String(Number(r.value.toPrecision(8)))}` : `${r.traced} → ${r.value}`;
};

export function BlockPreview({ block, result }: { block: UserBlock; result: BlockResult }) {
  const row = (dot: 'red' | 'yellow' | 'green', title: string, body: string, on: boolean) => (
    <li className={on ? 'is-decisive' : ''}>
      <Dot status={dot} />
      <div><b>{title}</b><span>{body}</span></div>
      {on && <em>目前亮這顆</em>}
    </li>
  );
  return (
    <div className="pv">
      <div className={`pv__head pv__head--${result.status}`}>
        <LampTriple status={result.status} size={40} />
        <div>
          <strong>{result.label || '—'}</strong>
          <p>{result.message}</p>
        </div>
      </div>

      <h4>資料點目前數值</h4>
      {result.vars.length === 0 ? (
        <p className="pv__none">尚未新增資料點</p>
      ) : (
        <table className="mini-table">
          <tbody>
            {result.vars.map((v) => (
              <tr key={v.name}>
                <td><span className="chip chip--var">{v.name}</span></td>
                <td>{v.tag ? <><code>{v.tag.name}</code><small>{v.tag.siteName} · {v.tag.desc}</small></> : <small>尚未選擇</small>}</td>
                <td className="num">{v.value == null ? '—' : v.value.toFixed(v.tag?.decimals ?? 2)}{v.tag?.unit && v.value != null ? ` ${v.tag.unit}` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h4>判斷過程（由上往下，第一個成立的亮燈）</h4>
      <ul className="pv__steps">
        {row('red', '紅燈條件', runText(result.red), result.status === 'red')}
        {row('yellow', '黃燈條件', runText(result.yellow), result.status === 'yellow')}
        {row('green', '以上都不成立', '亮綠燈', result.status === 'green')}
      </ul>
      {block.valueExpr.trim() && (
        <>
          <h4>顯示值</h4>
          <p className="pv__value"><code>{block.valueExpr}</code><br />{runText(result.value, 'value')}{result.unit ? ` ${result.unit}` : ''}</p>
        </>
      )}
    </div>
  );
}

/** 唯讀檢視：點頁面上的積木，看它為什麼亮這個燈 */
export function BlockDetail({ block, result, onClose }: { block: UserBlock; result: BlockResult; onClose: () => void }) {
  return (
    <Modal title={block.title} onClose={onClose} size="sm">
      <BlockPreview block={block} result={result} />
    </Modal>
  );
}

/* ───────── 編輯對話框 ───────── */

export function BlockDialog({ block, onChange, onClose }: {
  block: UserBlock;
  onChange: (patch: Partial<UserBlock>) => void;
  onClose: () => void;
}) {
  const getValue = useValueGetter();
  const { rules } = useRules();
  const result = useMemo(() => evaluateBlock(block, getValue), [block, getValue]);
  const [pickFor, setPickFor] = useState<string | null>(null);
  const [fillVar, setFillVar] = useState('');
  const [confirmFill, setConfirmFill] = useState(false);

  const setVar = (name: string, patch: Partial<BlockVar>) =>
    onChange({ vars: block.vars.map((v) => (v.name === name ? { ...v, ...patch } : v)) });
  const addVar = () => {
    const name = nextVarName(block.vars);
    onChange({ vars: [...block.vars, { name }] });
    setPickFor(name);
  };
  const removeVar = (name: string) => onChange({ vars: block.vars.filter((v) => v.name !== name) });

  const tagVars = result.vars.filter((v) => v.tag);
  const fromVar = tagVars.find((v) => v.name === fillVar) ?? tagVars[0];
  const hasConds = !!(block.redExpr.trim() || block.yellowExpr.trim());
  const applyRules = () => {
    if (!fromVar?.tag) return;
    if (hasConds && !confirmFill) return setConfirmFill(true);
    onChange(conditionsFromRules(fromVar.name, fromVar.tag, rules));
    setConfirmFill(false);
  };

  return (
    <Modal
      title="編輯燈號積木"
      size="xl"
      onClose={onClose}
      footer={
        <>
          <span className="modal__auto">變更會自動儲存</span>
          <button className="btn btn--primary" onClick={onClose}>完成</button>
        </>
      }
    >
      <div className="be">
        <div className="be__form">
          <div className="ef">
            <label htmlFor="blk-title">積木名稱</label>
            <input id="blk-title" className="ef__input ef__input--plain" value={block.title} maxLength={40} onChange={(e) => onChange({ title: e.target.value })} />
          </div>

          <section className="be__sec" aria-labelledby="sec-vars">
            <h3 id="sec-vars">1. 資料點 <small>每個資料點有一個名稱 A、B、C…，算式裡用這個名稱代表它的最新數值</small></h3>
            {block.vars.length === 0 && <p className="be__empty">還沒有資料點，按下方按鈕新增。</p>}
            <ul className="vars">
              {result.vars.map((v) => (
                <li key={v.name}>
                  <span className="chip chip--var chip--lg">{v.name}</span>
                  <TagPicker value={v.tag} startOpen={pickFor === v.name} onPick={(t) => setVar(v.name, { site: t.siteId, tag: t.name })} />
                  <span className="vars__val" title="目前數值">{v.value == null ? '—' : v.value.toFixed(v.tag?.decimals ?? 2)}</span>
                  <button className="icon-btn icon-btn--plain" onClick={() => removeVar(v.name)} aria-label={`移除資料點 ${v.name}`}><TrashIcon size={16} /></button>
                </li>
              ))}
            </ul>
            <button className="btn btn--sm" onClick={addVar} disabled={block.vars.length >= 26}><PlusIcon size={14} /> 新增資料點</button>
          </section>

          <section className="be__sec" aria-labelledby="sec-conds">
            <h3 id="sec-conds">2. 燈號條件 <small>先看紅燈條件，成立就亮紅；否則看黃燈條件；都不成立亮綠</small></h3>
            <ExprField
              id="red-expr" label="紅燈條件" dot="red" kind="cond" hint="例：A > 3 or B < 17.5"
              value={block.redExpr} onChange={(v) => onChange({ redExpr: v })}
              vars={block.vars} run={result.red} ops={[OPS_CMP, OPS_LOGIC, OPS_MATH]}
            />
            <ExprField
              id="yellow-expr" label="黃燈條件" dot="yellow" kind="cond" hint="例：A > 1 and B < 18"
              value={block.yellowExpr} onChange={(v) => onChange({ yellowExpr: v })}
              vars={block.vars} run={result.yellow} ops={[OPS_CMP, OPS_LOGIC, OPS_MATH]}
            />
            {tagVars.length > 0 && (
              <div className="be__fill">
                <span>快速帶入</span>
                <select value={fromVar?.name} onChange={(e) => { setFillVar(e.target.value); setConfirmFill(false); }} aria-label="選擇資料點">
                  {tagVars.map((v) => <option key={v.name} value={v.name}>{v.name} · {v.tag!.name}</option>)}
                </select>
                <button className={`btn btn--sm ${confirmFill ? 'btn--danger' : ''}`} onClick={applyRules} onBlur={() => setConfirmFill(false)}>
                  {confirmFill ? '會覆蓋現有條件，再按一次確認' : '帶入系統門檻'}
                </button>
              </div>
            )}
          </section>

          <section className="be__sec" aria-labelledby="sec-value">
            <h3 id="sec-value">3. 顯示值（選填） <small>積木上顯示的數字；只有一個資料點時可留白，會直接顯示該點數值</small></h3>
            <div className="be__valrow">
              <ExprField
                id="value-expr" label="算式" kind="value" hint="例：(A + B) / 2"
                value={block.valueExpr} onChange={(v) => onChange({ valueExpr: v })}
                vars={block.vars} run={result.value} ops={[OPS_MATH]}
              />
              <div className="ef ef--unit">
                <label htmlFor="blk-unit">單位</label>
                <input id="blk-unit" className="ef__input ef__input--plain" value={block.unit} maxLength={12} placeholder="例：ppb" onChange={(e) => onChange({ unit: e.target.value })} />
              </div>
            </div>
          </section>

          <details className="be__help">
            <summary>算式怎麼寫？</summary>
            <ul>
              <li><b>四則運算</b>：<code>+ − × ÷</code>（鍵盤可打 <code>+ - * /</code>），用括號決定順序，例如 <code>(A + B) / 2</code></li>
              <li><b>比較</b>：<code>&gt; ≥ &lt; ≤ = ≠</code>，例如 <code>A &gt; 3</code>；區間要拆開寫：<code>A &gt; 1 and A &lt; 3</code></li>
              <li><b>and / or / not</b>：and 兩邊都成立才成立；or 任一邊成立就成立；not 反過來。and 比 or 先算。也可以寫 且、或、非</li>
              <li><b>函式</b>：<code>abs(x)</code> <code>min(a,b)</code> <code>max(a,b)</code> <code>avg(a,b)</code> <code>round(x,位數)</code></li>
              <li>資料點沒有數值時，用到它的條件無法判斷，燈號會變灰。</li>
            </ul>
          </details>
        </div>

        <aside className="be__preview" aria-label="即時預覽">
          <h3>即時預覽</h3>
          <BlockPreview block={block} result={result} />
        </aside>
      </div>
    </Modal>
  );
}
