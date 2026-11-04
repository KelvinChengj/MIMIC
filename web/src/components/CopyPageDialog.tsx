import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { PHASE_OPTIONS, SITES, SYSTEM_OPTIONS } from '../catalog/catalog';
import { copyTitle, planCopy, sitesInPage, type SiteSwap } from '../lib/copy';
import { layerOf } from '../lib/pages';
import { pageMetaOf } from '../state/derived';
import { useFavorites } from '../state/FavoritesContext';
import { useUi } from '../state/UiContext';
import { useUserPages } from '../state/UserPagesContext';
import type { UserPage } from '../types';
import { LAYER_META } from './LayerChip';
import { Modal } from './Modal';

const NEW_GROUP = '__new__';
const siteName = (id: string) => SITES.find((s) => s.id === id)?.name ?? id;

/**
 * 複製頁面：複本是自己的新頁面（可改名、刪除），之後和原頁面互不影響。
 * 值班情境頁可以順便「換廠區」：燈號改綁新廠區的同名 virtual tag，名稱與文字裡的廠區一併替換。
 */
export function CopyPageDialog({ page, onClose }: { page: UserPage; onClose: () => void }) {
  const { groups, addGroup, addSlug } = useFavorites();
  const { createCopy } = useUserPages();
  const { showToast } = useUi();
  const navigate = useNavigate();
  const layer = layerOf(page);
  const sites = useMemo(() => sitesInPage(page), [page]);
  const derived = pageMetaOf(page);

  const [from, setFrom] = useState(sites[0] ?? '');
  const [to, setTo] = useState('');
  const swap = useMemo<SiteSwap | undefined>(() => (from && to && to !== from ? { from, to } : undefined), [from, to]);
  const plan = useMemo(() => planCopy(page, swap), [page, swap]);

  const [title, setTitle] = useState<string | null>(null);
  const shownTitle = title ?? copyTitle(page.title, swap);
  const pick = (v: string | undefined, opts: string[]) => (v && opts.includes(v) ? v : '');
  const [system, setSystem] = useState(pick(page.system ?? derived.system, SYSTEM_OPTIONS));
  const [phase, setPhase] = useState<string | null>(null);
  const shownPhase = phase ?? (swap ? siteName(swap.to) : pick(page.phase ?? derived.phase, PHASE_OPTIONS));
  const [groupId, setGroupId] = useState(groups.find((g) => g.slugs.includes(page.slug))?.id ?? groups[0]?.id ?? NEW_GROUP);
  const [groupName, setGroupName] = useState('');
  const [withBg, setWithBg] = useState(true);
  const ready = !!system && !!shownPhase && !!shownTitle.trim();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    const slug = createCopy({
      title: shownTitle.trim(),
      blocks: plan.blocks,
      layer,
      system,
      phase: shownPhase,
      ...(page.background && withBg && { background: { ...page.background } }),
      copiedFrom: { slug: page.slug, title: page.title, at: Date.now() },
    });
    const gid = groupId === NEW_GROUP || !groups.some((g) => g.id === groupId) ? addGroup(groupName || '我的頁面') : groupId;
    addSlug(gid, slug);
    onClose();
    showToast(swap ? `已複製並換到 ${siteName(swap.to)}：${plan.rebound} 顆燈號改綁${plan.missing.length ? `，${plan.missing.length} 顆需重新選擇 virtual tag` : ''}` : '已複製頁面，可以開始調整');
    navigate(`/p/${slug}/edit`);
  };

  return (
    <Modal title="複製頁面" size="sm" onClose={onClose}>
      <form className="newpage" onSubmit={submit}>
        <p className="newpage__hint">
          複製「{page.title}」成為你的新頁面（{LAYER_META[layer].label}）。複本和原頁面互不影響，燈號的 virtual tag 綁定一起複製。
        </p>

        {sites.length > 0 && (
          <fieldset className="copy-swap">
            <legend>燈號換廠區 <small>選填</small></legend>
            <div className="copy-swap__row">
              {sites.length > 1 ? (
                <select aria-label="原廠區" className="ef__input ef__input--plain" value={from} onChange={(e) => setFrom(e.target.value)}>
                  {sites.map((s) => <option key={s} value={s}>{siteName(s)}</option>)}
                </select>
              ) : (
                <span className="copy-swap__from">{siteName(from)}</span>
              )}
              <span aria-hidden="true">→</span>
              <select aria-label="換成廠區" className="ef__input ef__input--plain" value={to} onChange={(e) => setTo(e.target.value)}>
                <option value="">不更換</option>
                {SITES.filter((s) => s.id !== from).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <p className="copy-swap__result" role="status">
              {swap
                ? <>{plan.rebound} 顆燈號改綁 {siteName(swap.to)} 的同名 virtual tag，名稱與文字裡的 {siteName(swap.from)} 一併改成 {siteName(swap.to)}。
                  {plan.missing.length > 0 && <b className="copy-swap__warn"> {plan.missing.length} 顆在 {siteName(swap.to)} 找不到對應的 virtual tag，複本中先清空，請再選擇：{plan.missing.join('、')}</b>}</>
                : '例如把 F18P2 的值班頁複製成 F18P3 版本。'}
            </p>
          </fieldset>
        )}

        <div className="ef">
          <label htmlFor="cp-title">頁面名稱</label>
          <input id="cp-title" className="ef__input ef__input--plain" value={shownTitle} maxLength={40} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="be__pair">
          <div className="ef">
            <label htmlFor="cp-system">System <small className="req">必填</small></label>
            <select id="cp-system" className="ef__input ef__input--plain" required value={system} onChange={(e) => setSystem(e.target.value)}>
              <option value="" disabled>請選擇系統</option>
              {SYSTEM_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="ef">
            <label htmlFor="cp-phase">Phase <small className="req">必填</small></label>
            <select id="cp-phase" className="ef__input ef__input--plain" required value={shownPhase} onChange={(e) => setPhase(e.target.value)}>
              <option value="" disabled>請選擇廠區</option>
              {PHASE_OPTIONS.map((s) => <option key={s} value={s}>{s === 'F18A' ? 'F18A（全廠）' : s}</option>)}
            </select>
          </div>
        </div>
        <div className="ef">
          <label htmlFor="cp-group">放在哪個分類</label>
          <select id="cp-group" className="ef__input ef__input--plain" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            <option value={NEW_GROUP}>＋ 新分類…</option>
          </select>
        </div>
        {(groupId === NEW_GROUP || groups.length === 0) && (
          <div className="ef">
            <label htmlFor="cp-gname">新分類名稱</label>
            <input id="cp-gname" className="ef__input ef__input--plain" value={groupName} maxLength={20} placeholder="例：我的頁面" onChange={(e) => setGroupName(e.target.value)} />
          </div>
        )}
        {page.background && (
          <label className="copy-check">
            <input type="checkbox" checked={withBg} onChange={(e) => setWithBg(e.target.checked)} /> 一併複製底圖（{page.background.name ?? '底圖'}）
          </label>
        )}
        {layer === 'command' && (
          <p className="newpage__hint">指揮官頁的燈號仍指向原本的值班情境頁；要連到新的值班頁，請在複本裡逐一改選。</p>
        )}
        <div className="newpage__actions">
          <button type="button" className="btn" onClick={onClose}>取消</button>
          <button type="submit" className="btn btn--primary" disabled={!ready} title={ready ? undefined : '請填頁面名稱並選擇 System 與 Phase'}>建立複本</button>
        </div>
      </form>
    </Modal>
  );
}
