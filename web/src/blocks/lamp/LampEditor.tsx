import { useState } from 'react';
import { PlusIcon, TrashIcon } from '../../components/Icons';
import { conditionsFromRules, nextVarName } from '../../lib/blocks';
import { useRules } from '../../state/RulesContext';
import type { BlockVar, LampProps } from '../../types';
import type { EditorProps } from '../types';
import { ExprField, OPS_CMP, OPS_LOGIC, OPS_MATH, TagPicker } from './fields';
import { useLampResult } from './LampBlock';

export function LampEditor({ block, onProps }: EditorProps<LampProps>) {
  const p = block.props;
  const { rules } = useRules();
  const result = useLampResult(p);
  const [pickFor, setPickFor] = useState<string | null>(null);
  const [fillVar, setFillVar] = useState('');
  const [confirmFill, setConfirmFill] = useState(false);

  const setVar = (name: string, patch: Partial<BlockVar>) =>
    onProps({ vars: p.vars.map((v) => (v.name === name ? { ...v, ...patch } : v)) });
  const addVar = () => {
    const name = nextVarName(p.vars);
    onProps({ vars: [...p.vars, { name }] });
    setPickFor(name);
  };

  const tagVars = result.vars.filter((v) => v.tag);
  const fromVar = tagVars.find((v) => v.name === fillVar) ?? tagVars[0];
  const hasConds = !!(p.redExpr.trim() || p.yellowExpr.trim());
  const applyRules = () => {
    if (!fromVar?.tag) return;
    if (hasConds && !confirmFill) return setConfirmFill(true);
    onProps(conditionsFromRules(fromVar.name, fromVar.tag, rules));
    setConfirmFill(false);
  };

  return (
    <>
      <section className="be__sec" aria-labelledby="sec-vars">
        <h3 id="sec-vars">1. 資料點 <small>每個資料點有一個名稱 A、B、C…，算式裡用這個名稱代表它的最新數值</small></h3>
        {p.vars.length === 0 && <p className="be__empty">還沒有資料點，按下方按鈕新增。</p>}
        <ul className="vars">
          {result.vars.map((v) => (
            <li key={v.name}>
              <span className="chip chip--var chip--lg">{v.name}</span>
              <TagPicker value={v.tag} startOpen={pickFor === v.name} onPick={(t) => setVar(v.name, { site: t.siteId, tag: t.name })} />
              <span className="vars__val" title="目前數值">{v.value == null ? '—' : v.value.toFixed(v.tag?.decimals ?? 2)}</span>
              <button className="icon-btn icon-btn--plain" onClick={() => onProps({ vars: p.vars.filter((x) => x.name !== v.name) })} aria-label={`移除資料點 ${v.name}`}><TrashIcon size={16} /></button>
            </li>
          ))}
        </ul>
        <button className="btn btn--sm" onClick={addVar} disabled={p.vars.length >= 26}><PlusIcon size={14} /> 新增資料點</button>
      </section>

      <section className="be__sec" aria-labelledby="sec-conds">
        <h3 id="sec-conds">2. 燈號條件 <small>先看紅燈條件，成立就亮紅；否則看黃燈條件；都不成立亮綠</small></h3>
        <ExprField
          id="red-expr" label="紅燈條件" dot="red" kind="cond" hint="例：A > 3 or B < 17.5"
          value={p.redExpr} onChange={(v) => onProps({ redExpr: v })}
          vars={p.vars} run={result.red} ops={[OPS_CMP, OPS_LOGIC, OPS_MATH]}
        />
        <ExprField
          id="yellow-expr" label="黃燈條件" dot="yellow" kind="cond" hint="例：A > 1 and B < 18"
          value={p.yellowExpr} onChange={(v) => onProps({ yellowExpr: v })}
          vars={p.vars} run={result.yellow} ops={[OPS_CMP, OPS_LOGIC, OPS_MATH]}
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
            value={p.valueExpr} onChange={(v) => onProps({ valueExpr: v })}
            vars={p.vars} run={result.value} ops={[OPS_MATH]}
          />
          <div className="ef ef--unit">
            <label htmlFor="blk-unit">單位</label>
            <input id="blk-unit" className="ef__input ef__input--plain" value={p.unit} maxLength={12} placeholder="例：ppb" onChange={(e) => onProps({ unit: e.target.value })} />
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
    </>
  );
}
