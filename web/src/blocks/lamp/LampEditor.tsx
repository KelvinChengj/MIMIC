import { useState, type FormEvent } from 'react';
import { SITES } from '../../catalog/catalog';
import { formatValue } from '../../lib/status';
import { checkTagInput, lampTags, tagKey, type TagInputResult } from '../../lib/blocks';
import { useSystems } from '../../state/SystemsContext';
import { useFdm } from '../../state/FdmContext';
import { formatClock } from '../../components/Topbar';
import { TrashIcon } from '../../components/Icons';
import type { LampProps, TagRef } from '../../types';
import { SiteSystemSelect } from '../SiteSystemFields';
import type { EditorProps } from '../types';
import { FdmChip, TagBrowser } from './fields';
import { useLampResult } from './LampBlock';

/**
 * 燈號積木編輯器：只需要「設定 Tag → 選取 Tag → 檢查 Tag 有效」。
 * 紅 / 黃 / 綠由 FDM 回傳的 isOOS / isOOC 決定，沒有任何條件要設定。
 */
export function LampEditor({ block, onProps }: EditorProps<LampProps>) {
  const p = block.props;
  const { snapshot, refresh, lookup } = useFdm();
  const { systems } = useSystems();
  const result = useLampResult(p);
  const tags = lampTags(p);
  const [site, setSite] = useState(tags[0]?.site ?? SITES[0].id);
  const [text, setText] = useState('');
  const [check, setCheck] = useState<TagInputResult | null>(null);
  const [checkedAt, setCheckedAt] = useState<number | null>(null);

  const source = p.source;
  // 寫入時一律用 tags，並清掉舊版的資料點欄位
  const setTags = (next: TagRef[]) => onProps({ tags: next, vars: undefined });
  // 新加入的 Tag 還沒取過值：只查這幾個（不是重新取全部）
  const addTags = (added: TagRef[]) => {
    setTags([...tags, ...added]);
    lookup(added.map((r) => tagKey(r.site, r.tag)));
  };
  const setMode = (mode: 'tags' | 'system') =>
    onProps({ source: mode === 'system' ? (source ?? { site: SITES[0].id, system: systems[0]?.id ?? '' }) : undefined });

  const addTyped = (e: FormEvent) => {
    e.preventDefault();
    const r = checkTagInput(text, site, tags);
    setCheck(r);
    if (r.added.length) addTags(r.added);
    if (r.missing.length === 0) setText('');
  };
  const recheck = () => {
    refresh();
    setCheckedAt(Date.now());
  };

  const picker = (
    <section className="be__sec" aria-labelledby="sec-source">
      <h3 id="sec-source">資料來源</h3>
      <div className="seg seg--wrap" role="radiogroup" aria-label="資料來源">
        <button role="radio" aria-checked={!source} className={!source ? 'is-on' : ''} onClick={() => setMode('tags')}>選擇 Tag</button>
        <button role="radio" aria-checked={!!source} className={source ? 'is-on' : ''} onClick={() => setMode('system')}>整個系統</button>
      </div>
    </section>
  );

  if (source) {
    return (
      <>
        {picker}
        <SiteSystemSelect site={source.site} system={source.system} onChange={(patch) => onProps({ source: { ...source, ...(patch.site ? { site: patch.site } : {}), ...(patch.system ? { system: patch.system } : {}) } })} />
        <p className="be__note">這個系統的所有 Tag 一起判定：任一 Tag 為 OOS 亮紅、任一為 OOC 亮黃，下方文字顯示「3 台異常」這類統計，點燈號會下鑽到 Tag 清單。</p>
      </>
    );
  }

  const invalid = result.tags.filter((t) => !t.valid);
  return (
    <>
      {picker}

      <section className="be__sec" aria-labelledby="sec-set">
        <h3 id="sec-set">1. 設定 Tag <small>輸入 Tag 名稱，可一次貼上多個（用換行、空白或逗號分隔），系統會向 FDM 檢查是否存在</small></h3>
        <form className="taginput" onSubmit={addTyped}>
          <select className="ef__input ef__input--plain" value={site} onChange={(e) => setSite(e.target.value)} aria-label="廠區">
            {SITES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <textarea
            className="ef__input taginput__text" rows={2} value={text} spellCheck={false}
            placeholder={'例：UPW-POL-02.TOC\nUPW-POL-03.RES'} aria-label="Tag 名稱"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addTyped(e); }}
          />
          <button type="submit" className="btn btn--primary btn--sm" disabled={!text.trim()}>檢查並加入</button>
        </form>
        {check && (
          <div className="taginput__result" aria-live="polite">
            {check.added.length > 0 && <p className="ok">✓ 已加入 {check.added.length} 個：{check.added.map((r) => r.tag).join('、')}</p>}
            {check.missing.length > 0 && <p className="bad" role="alert">✗ FDM 找不到：{check.missing.join('、')}（請確認名稱與廠區）</p>}
            {check.duplicate.length > 0 && <p className="dup">已在清單中：{check.duplicate.join('、')}</p>}
          </div>
        )}
        <div className="be__row">
          <span className="be__or">或</span>
          <TagBrowser selected={tags} onPick={(t) => addTags([{ site: t.siteId, tag: t.name }])} />
        </div>
      </section>

      <section className="be__sec" aria-labelledby="sec-picked">
        <div className="be__sechead">
          <h3 id="sec-picked">2. 已選取的 Tag（{tags.length}）</h3>
          {tags.length > 0 && (
            <button className="btn btn--sm" onClick={recheck}>重新檢查</button>
          )}
        </div>
        {tags.length === 0 ? (
          <p className="be__empty">還沒有 Tag。在上方輸入名稱，或從 FDM Tag 清單選取。</p>
        ) : (
          <table className="picked">
            <thead><tr><th>Tag</th><th className="num">目前值</th><th>FDM 判定</th><th><span className="sr-only">移除</span></th></tr></thead>
            <tbody>
              {result.tags.map((t) => (
                <tr key={`${t.ref.site}|${t.ref.tag}`} className={t.valid ? '' : 'is-invalid'}>
                  <td><code>{t.ref.tag}</code><small>{t.info ? `${t.info.siteName} · ${t.info.desc}` : `${t.ref.site} · FDM 找不到這個 Tag`}</small></td>
                  <td className="num">{t.reading ? formatValue(t.reading.value, t.info?.decimals ?? 1) : '—'}{t.reading?.value != null && t.info?.unit ? ` ${t.info.unit}` : ''}</td>
                  <td><FdmChip valid={t.valid} status={t.status} /></td>
                  <td><button className="icon-btn icon-btn--plain" onClick={() => setTags(tags.filter((x) => !(x.site === t.ref.site && x.tag === t.ref.tag)))} aria-label={`移除 ${t.ref.tag}`}><TrashIcon size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tags.length > 0 && (
          <p className={`be__check ${invalid.length ? 'is-bad' : 'is-ok'}`} aria-live="polite">
            {invalid.length ? `⚠ 有 ${invalid.length} 個 Tag 無效，不會計入燈號，建議移除。` : '✓ 全部 Tag 有效。'}
            {checkedAt && <span>　已於 {formatClock(snapshot.updatedAt)} 向 FDM 重新取值</span>}
          </p>
        )}
      </section>

      <p className="be__note">
        燈號不用設定條件：任一 Tag 為 <b>OOS</b>（FDM 判定超出規格）亮紅；否則任一為 <b>OOC</b>（超出管制）亮黃；都正常亮綠；全部沒有資料亮灰。
        只選一個 Tag 時燈號下方顯示它的數值，選多個時顯示統計（例如「3 台異常」）。
      </p>
    </>
  );
}
