import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { SITES } from '../catalog/catalog';
import { FdmChip, TagBrowser } from '../blocks/lamp/fields';
import { StatusBadge } from '../components/Lamp';
import { TrashIcon } from '../components/Icons';
import { NotFound } from '../components/PageParts';
import { checkTagInput, TAG_BY_KEY, tagKey, type TagInputResult } from '../lib/blocks';
import { formatValue, summarize, tagStatus, tileText } from '../lib/status';
import { useFdm } from '../state/FdmContext';
import { groupRefs, useSystemRefs, useTagIndex } from '../state/derived';
import { useSystems } from '../state/SystemsContext';
import { useUi } from '../state/UiContext';
import type { SystemConfig, TagRef } from '../types';
import { formatDate } from './SystemsPage';

export function SystemEditRoute() {
  const { id = '' } = useParams();
  const sys = useSystems().getSystem(id);
  if (!sys) return <NotFound what="系統" />;
  // 換系統時重新建立草稿
  return <SystemEditor key={sys.id} system={sys} />;
}

const siteName = (id: string) => SITES.find((s) => s.id === id)?.name ?? id;

/** 和已儲存的版本比較，寫成一行變更紀錄 */
function describeChanges(before: SystemConfig, after: SystemConfig): string {
  const out: string[] = [];
  if (before.name !== after.name) out.push(`名稱改為「${after.name}」`);
  if (before.short !== after.short) out.push(`代號改為 ${after.short || '（無）'}`);
  if (before.owner !== after.owner) out.push(`負責人改為 ${after.owner || '（無）'}`);
  if (before.staleMinutes !== after.staleMinutes) out.push(`無資料判定改為 ${after.staleMinutes} 分鐘`);
  for (const site of SITES) {
    const a = new Set(before.tags[site.id] ?? []);
    const b = new Set(after.tags[site.id] ?? []);
    const added = [...b].filter((t) => !a.has(t));
    const removed = [...a].filter((t) => !b.has(t));
    if (added.length) out.push(`${site.name} 加入 ${added.join('、')}`);
    if (removed.length) out.push(`${site.name} 移除 ${removed.join('、')}`);
  }
  return out.join('；') || '儲存（無變更）';
}

function SystemEditor({ system }: { system: SystemConfig }) {
  const { saveSystem, deleteSystem, log } = useSystems();
  const { lookup } = useFdm();
  const { showToast } = useUi();
  const index = useTagIndex();
  const refs = groupRefs(useSystemRefs().get(system.id) ?? []);
  const navigate = useNavigate();

  const [draft, setDraft] = useState<SystemConfig>(system);
  const [site, setSite] = useState(SITES[0].id);
  const [text, setText] = useState('');
  const [check, setCheck] = useState<TagInputResult | null>(null);

  const dirty = JSON.stringify(draft) !== JSON.stringify(system);
  const names = draft.tags[site] ?? [];
  const refsOf = (siteId: string): TagRef[] => (draft.tags[siteId] ?? []).map((tag) => ({ site: siteId, tag }));
  const allRefs = SITES.flatMap((s) => refsOf(s.id));
  const invalid = allRefs.filter((r) => !TAG_BY_KEY.has(tagKey(r.site, r.tag)));

  const patch = (p: Partial<SystemConfig>) => setDraft((d) => ({ ...d, ...p }));
  const setSiteTags = (siteId: string, next: string[]) => setDraft((d) => ({ ...d, tags: { ...d.tags, [siteId]: next } }));
  const addRefs = (added: TagRef[]) => {
    setDraft((d) => {
      const tags = { ...d.tags };
      for (const r of added) tags[r.site] = [...(tags[r.site] ?? []), r.tag];
      return { ...d, tags };
    });
    // 新加入的 Tag 還沒取過值：只查這幾個
    lookup(added.map((r) => tagKey(r.site, r.tag)));
  };

  const addTyped = (e: FormEvent) => {
    e.preventDefault();
    const r = checkTagInput(text, site, refsOf(site));
    setCheck(r);
    if (r.added.length) addRefs(r.added);
    if (r.missing.length === 0) setText('');
  };

  const rows = names.map((name) => {
    const key = tagKey(site, name);
    const info = TAG_BY_KEY.get(key);
    const reading = index.get(key);
    return { name, key, info, reading, valid: !!info, status: reading ? tagStatus(reading) : ('gray' as const) };
  });
  const preview = summarize(rows.filter((r) => r.valid && r.reading).map((r) => r.status));

  const save = () => {
    if (!draft.name.trim() || invalid.length) return;
    const next = { ...draft, name: draft.name.trim(), short: draft.short.trim().toUpperCase() };
    saveSystem(next, describeChanges(system, next));
    showToast('已儲存，所有引用這個系統的積木已同步更新');
  };
  const remove = () => {
    if (!window.confirm(`確定刪除「${system.name}」？`)) return;
    deleteSystem(system.id);
    showToast('已刪除系統');
    navigate('/systems');
  };
  const history = useMemo(() => log.filter((l) => l.systemId === system.id), [log, system.id]);
  const deleteBlock = !system.custom ? '內建系統不能刪除' : refs.length ? `還有 ${refs.length} 個頁面引用，無法刪除` : '';

  return (
    <>
      <nav className="crumbs" aria-label="路徑">
        <Link to="/systems">系統管理</Link>
        <span aria-hidden="true">›</span>
        <strong>{system.name}{system.short ? ` ${system.short}` : ''}</strong>
        <span className="crumbs__spacer" />
        {dirty && <span className="sysedit__dirty" role="status">尚未儲存</span>}
        <button className="btn" disabled={!dirty} onClick={() => { setDraft(system); setCheck(null); }}>捨棄變更</button>
        <button className="btn btn--primary" disabled={!dirty || !draft.name.trim() || invalid.length > 0} onClick={save}>儲存變更</button>
      </nav>

      <div className="sysedit">
        <div className="stack">
          <section className="card">
            <div className="card__head"><h2>基本資料</h2></div>
            <div className="sysedit__grid">
              <div className="ef">
                <label htmlFor="se-name">系統名稱</label>
                <input id="se-name" className="ef__input ef__input--plain" value={draft.name} maxLength={20} aria-invalid={!draft.name.trim()} onChange={(e) => patch({ name: e.target.value })} />
              </div>
              <div className="ef">
                <label htmlFor="se-short">代號</label>
                <input id="se-short" className="ef__input" value={draft.short} maxLength={8} onChange={(e) => patch({ short: e.target.value })} />
              </div>
              <div className="ef">
                <label htmlFor="se-owner">負責人</label>
                <input id="se-owner" className="ef__input ef__input--plain" value={draft.owner} maxLength={20} onChange={(e) => patch({ owner: e.target.value })} />
              </div>
              <div className="ef">
                <label htmlFor="se-stale">幾分鐘沒有資料算灰燈</label>
                <input id="se-stale" type="number" min={1} max={1440} className="ef__input" value={draft.staleMinutes} onChange={(e) => patch({ staleMinutes: Math.max(1, Number(e.target.value) || 1) })} />
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card__head"><h2>各廠區的 Tag</h2></div>
            <div className="seg seg--wrap" role="tablist" aria-label="廠區">
              {SITES.map((s) => (
                <button key={s.id} role="tab" aria-selected={site === s.id} className={site === s.id ? 'is-on' : ''} onClick={() => { setSite(s.id); setCheck(null); }}>
                  {s.name} <em>{draft.tags[s.id]?.length ?? 0}</em>
                </button>
              ))}
            </div>

            <div className="sysedit__tags">
              <form className="taginput" onSubmit={addTyped}>
                <span className="taginput__site">{siteName(site)}</span>
                <textarea
                  className="ef__input taginput__text" rows={2} value={text} spellCheck={false}
                  placeholder={'貼上 Tag 名稱，可一次多個\n例：UPW-POL-04.RES'} aria-label="Tag 名稱"
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addTyped(e); }}
                />
                <button type="submit" className="btn btn--primary btn--sm" disabled={!text.trim()}>檢查並加入</button>
              </form>
              {check && (
                <div className="taginput__result" aria-live="polite">
                  {check.added.length > 0 && <p className="ok">✓ 已加入 {check.added.length} 個：{check.added.map((r) => r.tag).join('、')}</p>}
                  {check.missing.length > 0 && <p className="bad" role="alert">✗ FDM 在 {siteName(site)} 找不到：{check.missing.join('、')}</p>}
                  {check.duplicate.length > 0 && <p className="dup">已在清單中：{check.duplicate.join('、')}</p>}
                </div>
              )}
              <div className="be__row">
                <span className="be__or">或</span>
                <TagBrowser selected={allRefs} onPick={(t) => addRefs([{ site: t.siteId, tag: t.name }])} />
              </div>

              <p className="sysedit__preview">
                {siteName(site)} 目前燈號：<StatusBadge status={preview.status} />
                <span>{rows.length === 0 ? '尚未設定 Tag' : tileText(preview, draft.staleMinutes)}</span>
                {dirty && <small>（依編輯中的內容，儲存後生效）</small>}
              </p>

              {rows.length === 0 ? (
                <p className="be__empty">{siteName(site)} 還沒有 Tag。</p>
              ) : (
                <table className="picked">
                  <thead><tr><th>Tag</th><th className="num">目前值</th><th>FDM 判定</th><th><span className="sr-only">移除</span></th></tr></thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.key} className={r.valid ? '' : 'is-invalid'}>
                        <td><code>{r.name}</code><small>{r.info ? `${r.info.desc}${r.info.unit ? ` · ${r.info.unit}` : ''}` : 'FDM 找不到這個 Tag'}</small></td>
                        <td className="num">{r.reading ? formatValue(r.reading.value, r.info?.decimals ?? 1) : '—'}</td>
                        <td><FdmChip valid={r.valid} status={r.status} /></td>
                        <td><button className="icon-btn icon-btn--plain" onClick={() => setSiteTags(site, names.filter((n) => n !== r.name))} aria-label={`移除 ${r.name}`}><TrashIcon size={15} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {invalid.length > 0 && <p className="be__check is-bad" role="alert">⚠ 有 {invalid.length} 個 Tag 在 FDM 找不到，請移除後再儲存。</p>}
            </div>
          </section>
        </div>

        <aside className="stack">
          <section className="card">
            <div className="card__head"><h2>引用這個系統的頁面（{refs.length}）</h2></div>
            {refs.length === 0 ? <p className="be__empty">目前沒有積木或頁面引用。</p> : (
              <ul className="sysrefs">
                {refs.map((r) => (
                  <li key={r.pageSlug}>
                    <Link to={`/p/${r.pageSlug}`}>{r.pageTitle}</Link>
                    <small>{r.blocks ? `${r.blocks} 個燈號積木` : '內建頁面'} · {r.siteIds.map(siteName).join('、')}</small>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card">
            <div className="card__head"><h2>變更紀錄</h2></div>
            {history.length === 0 ? <p className="be__empty">還沒有變更紀錄。</p> : (
              <ul className="syslog">
                {history.map((l, i) => (
                  <li key={i}><span className="mono">{formatDate(l.at)}</span> <b>{l.who}</b> {l.text}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="card">
            <div className="card__head"><h2>刪除系統</h2></div>
            <button className="btn btn--danger" disabled={!!deleteBlock} onClick={remove}><TrashIcon size={15} /> 刪除這個系統</button>
            {deleteBlock && <p className="be__empty sysedit__why">{deleteBlock}</p>}
          </section>
        </aside>
      </div>
    </>
  );
}
