import { useState, type FormEvent } from 'react';
import { SITES } from '../../catalog/catalog';
import { findVTag, lampVTag, vtagKey, type VirtualTag } from '../../lib/blocks';
import { LAMP_CODE } from '../../lib/status';
import { useFdm } from '../../state/FdmContext';
import type { LampProps } from '../../types';
import type { EditorProps } from '../types';
import { VTagBrowser } from './fields';
import { useLampResult } from './LampBlock';

const CODES = Object.entries(LAMP_CODE).map(([code, st]) => `${code} ${{ red: '紅', yellow: '黃', green: '綠', gray: '灰' }[st]}`).join('、');

/**
 * 值班情境的燈號積木：選一個 virtual tag 即可。
 * virtual tag 由上游定義，值就是燈號代碼；點燈號會由它讀回 InSQL tag 清單下鑽。
 */
export function LampEditor({ block, onProps }: EditorProps<LampProps>) {
  const { lookup } = useFdm();
  const ref = lampVTag(block.props);
  const r = useLampResult(block.props);
  const [site, setSite] = useState(ref?.site ?? SITES[0].id);
  const [text, setText] = useState('');
  const [miss, setMiss] = useState<string | null>(null);

  // 寫入時一律用 vtag，並清掉舊版欄位；剛選的 virtual tag 還沒取過值：只查這一個
  const pick = (v: VirtualTag) => {
    onProps({ vtag: { site: v.siteId, name: v.name }, source: undefined, tags: undefined, vars: undefined });
    lookup([v.key]);
    setMiss(null);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = findVTag(site, text);
    if (v) { pick(v); setText(''); } else setMiss(text.trim());
  };

  return (
    <>
      <section className="be__sec" aria-labelledby="sec-vtag">
        <h3 id="sec-vtag">Virtual tag <small>燈號信號由上游的 virtual tag 提供，值就是燈號代碼（{CODES}；沒有值為灰）</small></h3>
        <div className={`vtpick ${r.reason === 'invalid' ? 'is-bad' : ''}`} aria-live="polite">
          {ref ? (
            <>
              <code>{ref.name}</code>
              <span>{r.info ? `${r.info.siteName} · ${r.info.desc} · ${r.info.sources.length} 個 InSQL tag` : '上游找不到這個 virtual tag，請重新選擇'}</span>
              {r.info && <span className="vtpick__val">目前值 <b className="mono">{r.value ?? '—'}</b> → {r.text}</span>}
            </>
          ) : (
            <span>{block.props.tags?.length ? '舊版燈號（選取 Tag）已不再使用，請改選一個 virtual tag。' : '還沒有選擇 virtual tag。'}</span>
          )}
        </div>
        <form className="taginput taginput--one" onSubmit={submit}>
          <select className="ef__input ef__input--plain" value={site} onChange={(e) => setSite(e.target.value)} aria-label="廠區">
            {SITES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input className="ef__input" value={text} spellCheck={false} placeholder="例：F18P2.UPW.LAMP" aria-label="virtual tag 名稱" onChange={(e) => setText(e.target.value)} />
          <button type="submit" className="btn btn--primary btn--sm" disabled={!text.trim()}>檢查並套用</button>
        </form>
        {miss && <p className="taginput__result"><span className="bad" role="alert">✗ 上游在 {SITES.find((s) => s.id === site)?.name} 找不到 virtual tag：{miss}</span></p>}
        <VTagBrowser selected={ref ? vtagKey(ref) : undefined} onPick={pick} />
      </section>

      <p className="be__note">
        燈號不用設定條件：判定在上游完成，virtual tag 的值直接決定紅黃綠。
        檢視時點燈號會下鑽，由這個 virtual tag 讀回 InSQL tag 清單（數值與 OOC / OOS），供查原因。
      </p>
    </>
  );
}
