import { useState } from 'react';
import { buildFromWizard, type WizardInput, type WizardMode } from '../../lib/wizard';
import type { VarState } from '../../lib/blocks';

const MODES: { id: WizardMode; label: string; hint: string }[] = [
  { id: 'high', label: '高於門檻就有問題', hint: '例：TOC、溫度、壓差' },
  { id: 'low', label: '低於門檻就有問題', hint: '例：電阻率、壓力、液位' },
  { id: 'range', label: '超出範圍就有問題', hint: '例：電壓、溫度、濕度' },
];

function NumField({ id, label, value, onChange, dot }: { id: string; label: string; value: string; onChange: (v: string) => void; dot?: 'red' | 'yellow' }) {
  return (
    <div className="ef ef--num">
      <label htmlFor={id}>{dot && <span className={`dot dot--${dot}`} aria-hidden="true" />}{label}</label>
      <input id={id} className="ef__input" type="number" step="any" inputMode="decimal" placeholder="不設" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/**
 * 條件精靈：選資料點與方向、填黃紅門檻，自動產生條件算式。
 * 套用只會寫入紅、黃條件欄位，之後還是可以在欄位裡手動調整。
 */
export function Wizard({ vars, hasConds, onApply }: {
  vars: VarState[];
  hasConds: boolean;
  onApply: (redExpr: string, yellowExpr: string) => void;
}) {
  const [w, setW] = useState<WizardInput>({ mode: 'high', varName: '', yellow: '', red: '', yellowLow: '', yellowHigh: '', redLow: '', redHigh: '' });
  const [confirm, setConfirm] = useState(false);
  const varName = vars.some((v) => v.name === w.varName) ? w.varName : (vars[0]?.name ?? '');
  const result = buildFromWizard({ ...w, varName });
  const empty = !result.redExpr && !result.yellowExpr;
  const set = (patch: Partial<WizardInput>) => { setW((x) => ({ ...x, ...patch })); setConfirm(false); };

  const apply = () => {
    if (hasConds && !confirm) return setConfirm(true);
    onApply(result.redExpr, result.yellowExpr);
    setConfirm(false);
  };

  return (
    <details className="wizard">
      <summary>條件精靈：不想手寫算式時，填門檻數字就好</summary>
      {vars.length === 0 ? (
        <p className="be__empty">先在上面新增資料點。</p>
      ) : (
        <div className="wizard__body">
          <div className="be__pair">
            <div className="ef">
              <label htmlFor="wz-var">資料點</label>
              <select id="wz-var" className="ef__input ef__input--plain" value={varName} onChange={(e) => set({ varName: e.target.value })}>
                {vars.map((v) => <option key={v.name} value={v.name}>{v.name}{v.tag ? ` · ${v.tag.name}` : '（尚未選擇 Tag）'}</option>)}
              </select>
            </div>
            <div className="ef">
              <label htmlFor="wz-mode">什麼情況算有問題</label>
              <select id="wz-mode" className="ef__input ef__input--plain" value={w.mode} onChange={(e) => set({ mode: e.target.value as WizardMode })}>
                {MODES.map((m) => <option key={m.id} value={m.id}>{m.label}（{m.hint}）</option>)}
              </select>
            </div>
          </div>

          {w.mode === 'range' ? (
            <div className="wizard__nums wizard__nums--4">
              <NumField id="wz-yl" dot="yellow" label="黃燈：低於" value={w.yellowLow} onChange={(v) => set({ yellowLow: v })} />
              <NumField id="wz-yh" dot="yellow" label="黃燈：高於" value={w.yellowHigh} onChange={(v) => set({ yellowHigh: v })} />
              <NumField id="wz-rl" dot="red" label="紅燈：低於" value={w.redLow} onChange={(v) => set({ redLow: v })} />
              <NumField id="wz-rh" dot="red" label="紅燈：高於" value={w.redHigh} onChange={(v) => set({ redHigh: v })} />
            </div>
          ) : (
            <div className="wizard__nums">
              <NumField id="wz-y" dot="yellow" label={w.mode === 'high' ? '黃燈：高於' : '黃燈：低於'} value={w.yellow} onChange={(v) => set({ yellow: v })} />
              <NumField id="wz-r" dot="red" label={w.mode === 'high' ? '紅燈：高於' : '紅燈：低於'} value={w.red} onChange={(v) => set({ red: v })} />
            </div>
          )}

          {result.errors.map((e) => <p key={e} className="ef__msg ef__msg--error" role="alert">⚠ {e}</p>)}
          {!empty && result.errors.length === 0 && (
            <p className="wizard__result">
              <span><span className="dot dot--red" /> 紅 <code>{result.redExpr || '（不設）'}</code></span>
              <span><span className="dot dot--yellow" /> 黃 <code>{result.yellowExpr || '（不設）'}</code></span>
            </p>
          )}
          <button className={`btn btn--sm ${confirm ? 'btn--danger' : ''}`} onClick={apply} onBlur={() => setConfirm(false)} disabled={empty || result.errors.length > 0}>
            {confirm ? '會覆蓋現有條件，再按一次確認' : '套用到紅、黃燈條件'}
          </button>
        </div>
      )}
    </details>
  );
}
