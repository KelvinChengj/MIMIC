import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Dot } from '../components/Lamp';
import { BackButton, PageHeader } from '../components/PageParts';
import { ChevronDown, CloseIcon, SearchIcon, StarIcon } from '../components/Icons';
import { PAGES } from '../catalog/catalog';
import { usePageStatus } from '../state/derived';
import { useFavorites } from '../state/FavoritesContext';

const SORTS = [
  { id: 'favorites', label: '收藏數' },
  { id: 'clicks', label: '點擊數' },
  { id: 'updated', label: '最近更新' },
] as const;
type SortId = (typeof SORTS)[number]['id'];

const EXPLORE_PAGES = PAGES.filter((p) => p.explore);
const unique = (xs: string[]) => [...new Set(xs)];
const SYSTEM_OPTIONS = unique(EXPLORE_PAGES.flatMap((p) => p.systemTags ?? []));
const SITE_OPTIONS = unique(EXPLORE_PAGES.map((p) => p.siteLabel ?? ''));
const AUTHOR_OPTIONS = unique(EXPLORE_PAGES.map((p) => p.author?.name ?? ''));

function Highlight({ text, q }: { text: string; q: string }): ReactNode {
  const term = q.trim();
  if (!term) return text;
  const lower = text.toLowerCase();
  const needle = term.toLowerCase();
  const out: ReactNode[] = [];
  let i = 0;
  for (let at = lower.indexOf(needle); at !== -1; at = lower.indexOf(needle, i)) {
    if (at > i) out.push(text.slice(i, at));
    out.push(<mark key={at}>{text.slice(at, at + needle.length)}</mark>);
    i = at + needle.length;
  }
  out.push(text.slice(i));
  return out;
}

function FilterSelect({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const current = options.find((o) => o.value === value)?.label ?? options[0].label;
  return (
    <label className={`select-chip ${value ? 'is-set' : ''}`}>
      <span>{label}：{current}</span>
      <ChevronDown size={14} />
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function ExplorePage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const pageStatus = usePageStatus();
  const { isFavorite, toggleFavorite } = useFavorites();

  // 篩選條件都放在網址 query，所以搜尋結果也能分享
  const urlQ = params.get('q') ?? '';
  const system = params.get('system') ?? '';
  const site = params.get('site') ?? '';
  const author = params.get('author') ?? '';
  const sort = (SORTS.find((s) => s.id === params.get('sort'))?.id ?? 'favorites') as SortId;
  const [text, setText] = useState(urlQ);

  const setParam = (key: string, value: string) =>
    setParams((p) => {
      const next = new URLSearchParams(p);
      if (value) next.set(key, value); else next.delete(key);
      return next;
    }, { replace: true });

  const results = useMemo(() => {
    const q = urlQ.trim().toLowerCase();
    return EXPLORE_PAGES
      .filter((p) => !system || p.systemTags?.includes(system))
      .filter((p) => !site || p.siteLabel === site)
      .filter((p) => !author || p.author?.name === author)
      .filter((p) => {
        if (!q) return true;
        const hay = [p.title, `mimic/p/${p.slug}`, p.author?.name, p.author?.dept, p.systemTags?.join(' '), p.siteLabel].join(' ').toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => {
        if (sort === 'clicks') return (b.clicks ?? 0) - (a.clicks ?? 0);
        if (sort === 'updated') return (b.updatedRank ?? 0) - (a.updatedRank ?? 0);
        return (b.favorites ?? 0) - (a.favorites ?? 0);
      });
  }, [urlQ, system, site, author, sort]);

  const anyFilter = !!(urlQ || system || site || author);
  const submit = () => setParam('q', text.trim());

  return (
    <>
      <PageHeader
        title="Explore MIMIC"
        sub="搜尋他人建立的 MIMIC 頁面，點右側 ☆ 加入 Favorites；燈號會與原頁面同步。"
        actions={<BackButton fallback="/" />}
      />

      <form className="search-row" role="search" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="search-box">
          <SearchIcon size={18} />
          <input
            type="search" autoFocus value={text} placeholder="搜尋頁面名稱、網址、著作人、系統…"
            aria-label="搜尋 MIMIC 頁面"
            onChange={(e) => { setText(e.target.value); setParam('q', e.target.value.trim()); }}
          />
          {text && (
            <button type="button" className="icon-btn icon-btn--plain" aria-label="清除搜尋" onClick={() => { setText(''); setParam('q', ''); }}>
              <CloseIcon size={16} />
            </button>
          )}
        </div>
        <button className="btn btn--primary btn--lg" type="submit">Search</button>
      </form>

      <div className="filters">
        <FilterSelect label="系統" value={system} onChange={(v) => setParam('system', v)}
          options={[{ value: '', label: '全部' }, ...SYSTEM_OPTIONS.map((v) => ({ value: v, label: v }))]} />
        <FilterSelect label="廠區" value={site} onChange={(v) => setParam('site', v)}
          options={[{ value: '', label: '全部' }, ...SITE_OPTIONS.map((v) => ({ value: v, label: v }))]} />
        <FilterSelect label="著作人" value={author} onChange={(v) => setParam('author', v)}
          options={[{ value: '', label: '全部' }, ...AUTHOR_OPTIONS.map((v) => ({ value: v, label: v }))]} />
        <FilterSelect label="排序" value={sort} onChange={(v) => setParam('sort', v === 'favorites' ? '' : v)}
          options={SORTS.map((s) => ({ value: s.id, label: s.label }))} />
        {anyFilter && (
          <button className="link-btn" onClick={() => { setText(''); setParams({}, { replace: true }); }}>清除全部條件</button>
        )}
        <span className="filters__count" aria-live="polite">共 {results.length} 個頁面</span>
      </div>

      <section className="card table-card">
        <table className="explore-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>MIMIC Page</th>
              <th>Author</th>
              <th>System</th>
              <th>Site</th>
              <th className="num">Clicks</th>
              <th className="num">Favorites</th>
              <th>Last Updated</th>
              <th className="center">Favorite</th>
            </tr>
          </thead>
          <tbody>
            {results.map((p) => {
              const fav = isFavorite(p.slug);
              return (
                <tr key={p.slug} onClick={() => navigate(`/p/${p.slug}`)}>
                  <td><Dot status={pageStatus(p)} /></td>
                  <td>
                    <Link to={`/p/${p.slug}`} className="page-link" onClick={(e) => e.stopPropagation()}>
                      <Highlight text={p.title} q={urlQ} />
                    </Link>
                    <code className="page-path"><Highlight text={`mimic/p/${p.slug}`} q={urlQ} /></code>
                  </td>
                  <td>
                    <span className="author">
                      <span className="author__avatar">{p.author?.initials}</span>
                      <span><strong><Highlight text={p.author?.name ?? ''} q={urlQ} /></strong><small>{p.author?.dept}</small></span>
                    </span>
                  </td>
                  <td>{p.systemTags?.join(' · ')}</td>
                  <td>{p.siteLabel}</td>
                  <td className="num">{p.clicks?.toLocaleString()}</td>
                  <td className="num">{(p.favorites ?? 0) + (fav ? 1 : 0)}</td>
                  <td>{p.updatedLabel}</td>
                  <td className="center">
                    <button
                      className={`star ${fav ? 'is-on' : ''}`}
                      aria-pressed={fav}
                      aria-label={`${fav ? '從 Favorites 移除' : '加入 Favorites'}：${p.title}`}
                      title={fav ? '點擊移除' : '點擊加入 Favorites'}
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(p.slug); }}
                    >
                      <StarIcon filled={fav} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {results.length === 0 && (
              <tr>
                <td colSpan={9} className="explore-table__empty">
                  找不到符合的頁面。試試較短的關鍵字，或
                  <button className="link-btn" onClick={() => { setText(''); setParams({}, { replace: true }); }}>清除全部條件</button>。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
      <p className="explore-legend">
        <span className="star-key is-on"><StarIcon filled size={14} /></span> In Favorites (click to remove)
        <span className="star-key"><StarIcon size={14} /></span> Click to add to Favorites
      </p>
    </>
  );
}
