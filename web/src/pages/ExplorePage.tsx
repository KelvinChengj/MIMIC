import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BackButton, PageHeader } from '../components/PageParts';
import { CloseIcon, SearchIcon, StarIcon } from '../components/Icons';
import { PAGES } from '../catalog/catalog';
import { useFavorites } from '../state/FavoritesContext';
import type { PageDef } from '../types';

/** 可排序的欄位（點欄名切換：第一次依該欄預設方向，再點反向） */
const COLUMNS = {
  page: { label: 'MIMIC Page', dir: 'asc' },
  author: { label: 'Author', dir: 'asc' },
  system: { label: 'System', dir: 'asc' },
  site: { label: 'Site', dir: 'asc' },
  clicks: { label: 'Clicks', dir: 'desc' },
  favorites: { label: 'Favorites', dir: 'desc' },
  updated: { label: 'Last Updated', dir: 'desc' },
} as const;
type SortId = keyof typeof COLUMNS;
type Dir = 'asc' | 'desc';

const EXPLORE_PAGES = PAGES.filter((p) => p.explore);
const has = (text: string | undefined, f: string) => !f || (text ?? '').toLowerCase().includes(f.trim().toLowerCase());

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

/** 表頭的欄名：點了排序，顯示目前方向 */
function SortHeader({ id, sort, dir, onSort, className = '' }: { id: SortId; sort: SortId; dir: Dir; onSort: (id: SortId) => void; className?: string }) {
  const on = sort === id;
  return (
    <th className={`sortable ${className} ${on ? 'is-sorted' : ''}`} aria-sort={on ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onSort(id)} title={`依 ${COLUMNS[id].label} 排序`}>
        {COLUMNS[id].label}
        <span className="sort-ind" aria-hidden="true">{on ? (dir === 'asc' ? '▲' : '▼') : '↕'}</span>
      </button>
    </th>
  );
}

/** 表頭下方的篩選列（像 AG Grid 的 floating filter）：輸入就篩選，包含即符合 */
function FilterCell({ label, value, onChange, className = '' }: { label: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <th className={className}>
      <span className="col-filter">
        <input type="text" value={value} placeholder="篩選…" aria-label={`篩選 ${label}`} onChange={(e) => onChange(e.target.value)} />
        {value && <button type="button" aria-label={`清除 ${label} 篩選`} onClick={() => onChange('')}><CloseIcon size={12} /></button>}
      </span>
    </th>
  );
}

export function ExplorePage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();

  // 篩選條件都放在網址 query，所以搜尋結果也能分享
  const urlQ = params.get('q') ?? '';
  const fPage = params.get('page') ?? '';
  const system = params.get('system') ?? '';
  const site = params.get('site') ?? '';
  const author = params.get('author') ?? '';
  const sort: SortId = (params.get('sort') as SortId) in COLUMNS ? (params.get('sort') as SortId) : 'favorites';
  const dir: Dir = params.get('dir') === 'asc' || params.get('dir') === 'desc' ? (params.get('dir') as Dir) : COLUMNS[sort].dir;
  const [text, setText] = useState(urlQ);

  const setParam = (key: string, value: string) =>
    setParams((p) => {
      const next = new URLSearchParams(p);
      if (value) next.set(key, value); else next.delete(key);
      return next;
    }, { replace: true });

  // 點欄名：換欄位時用該欄的預設方向，同一欄再點則反向
  const onSort = (id: SortId) =>
    setParams((p) => {
      const next = new URLSearchParams(p);
      const nextDir: Dir = id === sort ? (dir === 'asc' ? 'desc' : 'asc') : COLUMNS[id].dir;
      if (id === 'favorites' && nextDir === 'desc') { next.delete('sort'); next.delete('dir'); }
      else { next.set('sort', id); next.set('dir', nextDir); }
      return next;
    }, { replace: true });

  const results = useMemo(() => {
    const q = urlQ.trim().toLowerCase();
    const key = (p: PageDef): string | number => {
      switch (sort) {
        case 'page': return p.title;
        case 'author': return p.author?.name ?? '';
        case 'system': return p.systemTags?.join(' ') ?? '';
        case 'site': return p.siteLabel ?? '';
        case 'clicks': return p.clicks ?? 0;
        case 'updated': return p.updatedRank ?? 0;
        default: return (p.favorites ?? 0) + (isFavorite(p.slug) ? 1 : 0);
      }
    };
    return EXPLORE_PAGES
      .filter((p) => has(`${p.title} mimic/p/${p.slug}`, fPage))
      .filter((p) => has(p.systemTags?.join(' '), system))
      .filter((p) => has(p.siteLabel, site))
      .filter((p) => has(`${p.author?.name} ${p.author?.dept}`, author))
      .filter((p) => {
        if (!q) return true;
        const hay = [p.title, `mimic/p/${p.slug}`, p.author?.name, p.author?.dept, p.systemTags?.join(' '), p.siteLabel].join(' ').toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => {
        const ka = key(a), kb = key(b);
        const c = typeof ka === 'number' && typeof kb === 'number' ? ka - kb : String(ka).localeCompare(String(kb), 'zh-Hant');
        return dir === 'asc' ? c : -c;
      });
  }, [urlQ, fPage, system, site, author, sort, dir, isFavorite]);

  const anyFilter = !!(urlQ || fPage || system || site || author);
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
        {anyFilter && (
          <button className="link-btn" onClick={() => { setText(''); setParams({}, { replace: true }); }}>清除全部條件</button>
        )}
        <span className="filters__count" aria-live="polite">共 {results.length} 個頁面</span>
      </div>

      <section className="card table-card">
        <table className="explore-table">
          <thead>
            <tr>
              <SortHeader id="page" sort={sort} dir={dir} onSort={onSort} />
              <SortHeader id="author" sort={sort} dir={dir} onSort={onSort} />
              <SortHeader id="system" sort={sort} dir={dir} onSort={onSort} />
              <SortHeader id="site" sort={sort} dir={dir} onSort={onSort} />
              <SortHeader id="clicks" sort={sort} dir={dir} onSort={onSort} className="num" />
              <SortHeader id="favorites" sort={sort} dir={dir} onSort={onSort} className="num" />
              <SortHeader id="updated" sort={sort} dir={dir} onSort={onSort} />
              <th className="center">Favorite</th>
            </tr>
            <tr className="filter-row">
              <FilterCell label="MIMIC Page" value={fPage} onChange={(v) => setParam('page', v)} />
              <FilterCell label="Author" value={author} onChange={(v) => setParam('author', v)} />
              <FilterCell label="System" value={system} onChange={(v) => setParam('system', v)} />
              <FilterCell label="Site" value={site} onChange={(v) => setParam('site', v)} />
              <th /><th /><th /><th />
            </tr>
          </thead>
          <tbody>
            {results.map((p) => {
              const fav = isFavorite(p.slug);
              return (
                <tr key={p.slug} onClick={() => navigate(`/p/${p.slug}`)}>
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
                <td colSpan={8} className="explore-table__empty">
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
