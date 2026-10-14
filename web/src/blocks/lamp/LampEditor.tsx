import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SITES, SYSTEMS } from '../../catalog/catalog';
import { PlusIcon, TrashIcon } from '../../components/Icons';
import { SiteSystemSelect } from '../SiteSystemFields';
import { conditionsFromRules, nextVarName } from '../../lib/blocks';
import { lintLamp } from '../../lib/lampLint';
import { useRules } from '../../state/RulesContext';
import type { BlockVar, LampCaption, LampProps } from '../../types';
import type { EditorProps } from '../types';
import { ExprField, OPS_CMP, OPS_LOGIC, OPS_MATH, TagPicker } from './fields';
import { useLampResult } from './LampBlock';
import { useLampSim } from './sim';
import { Wizard } from './Wizard';

const CAPTIONS: { id: LampCaption; label: string; hint: string }[] = [
  { id: 'auto', label: '數值優先', hint: '有顯示值就顯示數值，沒有就顯示狀態文字' },
  { id: 'status', label: '只顯示狀態文字', hint: '例如「異常」「正常」' },
  { id: 'both', label: '數值 + 狀態文字', hint: '中尺寸同一行，大尺寸分兩行' },
];

/** 資料點目前數值，旁邊可填「模擬值」來試算（只在這個視窗內有效，不會存檔） */
function SimField({ name, real }: { name: string; real: number | null }) {
  const { overrides, setValue, clear } = useLampSim();
  const active = Object.prototype.hasOwnProperty.call(overrides, name);
  const v = overrides[name];
  return (
    <span className={`sim ${active ? 'is-active' : ''}`}>
      <input
        className="sim__input" type="number" step="any" inputMode="decimal"
        aria-label={`資料點 ${name} 的模擬值`} placeholder={real == null ? '無資料' : String(Number(real.toFixed(3)))}
        value={active && v != null ? String(v) : ''}
        onChange={(e) => (e.target.value === '' ? clear(name) : setValue(name, Number(e.target.value)))}
      />
      <button type="button" className={`chip chip--tiny ${active && v === null ? 'is-on' : ''}`} onClick={() => setValue(name, null)} title="模擬這個資料點沒有資料" aria-pressed={active && v === null}>無資料</button>
      {active && <button type="button" className="chip chip--tiny" onClick={() => clear(name)} aria-label={`清除資料點 ${name} 的模擬值`}>還原</button>}
    </span>
  );
}

export function LampEditor({ block, onProps }: EditorProps<LampProps>) {
  const p = block.props;
  const { rules } = useRules();
  const result = useLampResult(p);
  const sim = useLampSim();
  const [pickFor, setPickFor] = useState<string | null>(null);
  const [fillVar, setFillVar] = useState('');
  const [confirmFill, setConfirmFill] = useState(false);
  const notes = lintLamp(p);
  const simCount = Object.keys(sim.overrides).length;

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
  const setLabel = (k: 'red' | 'yellow' | 'green', v: string) => onProps({ labels: { ...(p.labels ?? {}), [k]: v } });

  const source = p.source;
  const setSource = (mode: 'custom' | 'system') =>
    onProps({ source: mode === 'system' ? (source ?? { site: SITES[0].id, system: SYSTEMS[0].id }) : undefined });

  const picker = (
    <section className="be__sec" aria-labelledby="sec-source">
      <h3 id="sec-source">資料來源 <small>自己用資料點與算式判斷，或直接顯示某個系統的整體燈號</small></h3>
      <div className="seg seg--wrap" role="radiogroup" aria-label="資料來源">
        <button role="radio" aria-checked={!source} className={!source ? 'is-on' : ''} onClick={() => setSource('custom')}>自訂算式</button>
        <button role="radio" aria-checked={!!source} className={source ? 'is-on' : ''} onClick={() => setSource('system')}>系統燈號</button>
      </div>
    </section>
  );

  if (source) {
    return (
      <>
        {picker}
        <SiteSystemSelect site={source.site} system={source.system} onChange={(patch) => onProps({ source: { ...source, ...(patch.site ? { site: patch.site } : {}), ...(patch.system ? { system: patch.system } : {}) } })} />
        <p className="be__note">
          燈號與下方文字（例如「3 台異常」）由這個系統的紅、黃、綠判定規則決定，點燈號會下鑽到 Tag 清單。
          要調整門檻，到 <Link to={`/p/overview/thresholds?system=${source.system}`}>門檻設定</Link>。
        </p>
      </>
    );
  }

  return (
    <>
      {picker}
      {notes.length > 0 && (
        <ul className="lint" aria-label="檢查提醒">
          {notes.map((n) => <li key={n.text} className={`lint--${n.level}`}>{n.level === 'warn' ? '⚠' : 'ℹ'} {n.text}</li>)}
        </ul>
      )}

      <section className="be__sec" aria-labelledby="sec-vars">
        <h3 id="sec-vars">1. 資料點 <small>每個資料點有一個名稱 A、B、C…，算式裡用這個名稱代表它的最新數值。右邊可填「模擬值」試算燈號（不會存檔）</small></h3>
        {p.vars.length === 0 && <p className="be__empty">還沒有資料點，按下方按鈕新增。</p>}
        <ul className="vars">
          {result.vars.map((v) => (
            <li key={v.name}>
              <span className="chip chip--var chip--lg">{v.name}</span>
              <div className="vars__main">
                <TagPicker value={v.tag} startOpen={pickFor === v.name} onPick={(t) => setVar(v.name, { site: t.siteId, tag: t.name })} />
                <div className="vars__sim">
                  <span className="vars__real">FDM 目前 <b>{v.real == null ? '—' : v.real.toFixed(v.tag?.decimals ?? 2)}{v.tag?.unit && v.real != null ? ` ${v.tag.unit}` : ''}</b></span>
                  <SimField name={v.name} real={v.real} />
                </div>
              </div>
              <button className="icon-btn icon-btn--plain" onClick={() => { sim.clear(v.name); onProps({ vars: p.vars.filter((x) => x.name !== v.name) }); }} aria-label={`移除資料點 ${v.name}`}><TrashIcon size={16} /></button>
            </li>
          ))}
        </ul>
        <div className="be__row">
          <button className="btn btn--sm" onClick={addVar} disabled={p.vars.length >= 26}><PlusIcon size={14} /> 新增資料點</button>
          {simCount > 0 && <button className="link-btn" onClick={() => sim.clear()}>清除全部模擬值（{simCount}）</button>}
        </div>
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
        <Wizard vars={result.vars} hasConds={hasConds} onApply={(redExpr, yellowExpr) => onProps({ redExpr, yellowExpr })} />
        {tagVars.length > 0 && (
          <div className="be__fill">
            <span>或帶入系統預設門檻</span>
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
        <h3 id="sec-value">3. 顯示值（選填） <small>燈號下方顯示的數字；只有一個資料點時可留白，會直接顯示該點數值</small></h3>
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

      <section className="be__sec" aria-labelledby="sec-text">
        <h3 id="sec-text">4. 燈號文字 <small>燈號下方那行字要寫什麼</small></h3>
        <div className="seg seg--wrap" role="radiogroup" aria-label="燈號文字顯示方式">
          {CAPTIONS.map((c) => (
            <button key={c.id} role="radio" aria-checked={(p.caption ?? 'auto') === c.id} className={(p.caption ?? 'auto') === c.id ? 'is-on' : ''} title={c.hint} onClick={() => onProps({ caption: c.id })}>{c.label}</button>
          ))}
        </div>
        <div className="wizard__nums wizard__nums--3">
          {([['red', '紅燈文字', '異常'], ['yellow', '黃燈文字', '部分異常'], ['green', '綠燈文字', '正常']] as const).map(([k, label, ph]) => (
            <div className="ef" key={k}>
              <label htmlFor={`lbl-${k}`}><span className={`dot dot--${k}`} aria-hidden="true" /> {label}</label>
              <input id={`lbl-${k}`} className="ef__input ef__input--plain" maxLength={10} placeholder={ph} value={p.labels?.[k] ?? ''} onChange={(e) => setLabel(k, e.target.value)} />
            </div>
          ))}
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
