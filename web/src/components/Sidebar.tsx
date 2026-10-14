import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { pageBySlug } from '../catalog/catalog';
import { usePageStatus } from '../state/derived';
import { useFavorites } from '../state/FavoritesContext';
import { useUi } from '../state/UiContext';
import { Dot } from './Lamp';
import { ChevronDown, ChevronUp, GripIcon, LogoMark, MenuIcon, PlusIcon, SearchIcon } from './Icons';

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUi();
  const { groups, reorder } = useFavorites();
  const pageStatus = usePageStatus();
  const { pathname } = useLocation();
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const [favOpen, setFavOpen] = useState(true);
  const [drag, setDrag] = useState<{ group: string; index: number } | null>(null);

  const isActive = (slug: string) => pathname === `/p/${slug}` || pathname.startsWith(`/p/${slug}/`);

  if (sidebarCollapsed) {
    return (
      <aside className="sidebar sidebar--rail" aria-label="側邊欄（已收合）">
        <button className="icon-btn" onClick={toggleSidebar} aria-label="展開側邊欄" title="展開側邊欄">
          <MenuIcon />
        </button>
        <Link to="/explore" className={`icon-btn ${pathname === '/explore' ? 'is-active' : ''}`} aria-label="Explore MIMIC" title="Explore MIMIC">
          <SearchIcon />
        </Link>
        <nav className="rail-list" aria-label="Favorites">
          {groups.map((g) => (
            <div className="rail-group" key={g.id}>
              {g.slugs.map((slug) => {
                const page = pageBySlug(slug);
                if (!page) return null;
                return (
                  <NavLink
                    key={slug}
                    to={`/p/${slug}`}
                    className={`rail-item ${isActive(slug) ? 'is-active' : ''}`}
                    title={page.title}
                    aria-label={page.title}
                  >
                    <Dot status={pageStatus(page)} />
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
    );
  }

  return (
    <aside className="sidebar" aria-label="側邊欄">
      <div className="sidebar__brand">
        <Link to="/" className="brand">
          <LogoMark />
          <span>
            <strong>MIMIC</strong>
            <small>Semiconductor Facilities</small>
          </span>
        </Link>
        <button className="icon-btn icon-btn--plain" onClick={toggleSidebar} aria-label="收合側邊欄" title="收合側邊欄">
          <MenuIcon />
        </button>
      </div>

      <Link to="/explore" className={`explore-btn ${pathname === '/explore' ? 'is-active' : ''}`}>
        <SearchIcon size={16} />
        <span>Explore MIMIC</span>
        <ChevronRightSmall />
      </Link>

      <div className="fav-head">
        <button className="fav-head__title" onClick={() => setFavOpen((o) => !o)} aria-expanded={favOpen}>
          {favOpen ? <ChevronDown size={14} /> : <ChevronRightSmall />}
          Favorites
        </button>
        <Link to="/explore" className="icon-btn icon-btn--plain" aria-label="從 Explore 加入 Favorites" title="從 Explore 加入 Favorites">
          <PlusIcon size={18} />
        </Link>
      </div>

      {favOpen && (
        <nav className="fav-groups" aria-label="Favorites">
          {groups.length === 0 && <p className="fav-empty">尚無收藏，到 Explore 按 ☆ 加入。</p>}
          {groups.map((g) => {
            const open = !closed[g.id];
            return (
              <div className="fav-group" key={g.id}>
                <button
                  className="fav-group__head"
                  onClick={() => setClosed((c) => ({ ...c, [g.id]: open }))}
                  aria-expanded={open}
                >
                  <span className="grip" aria-hidden="true"><GripIcon /></span>
                  <span className="fav-group__name">{g.name}</span>
                  {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {open && (
                  <ul>
                    {g.slugs.map((slug, index) => {
                      const page = pageBySlug(slug);
                      if (!page) return null;
                      return (
                        <li
                          key={slug}
                          draggable
                          onDragStart={() => setDrag({ group: g.id, index })}
                          onDragOver={(e) => drag?.group === g.id && e.preventDefault()}
                          onDrop={() => {
                            if (drag?.group === g.id) reorder(g.id, drag.index, index);
                            setDrag(null);
                          }}
                          onDragEnd={() => setDrag(null)}
                          className={drag?.group === g.id && drag.index === index ? 'is-dragging' : ''}
                        >
                          <span className="grip" aria-hidden="true"><GripIcon /></span>
                          <Link to={`/p/${slug}`} className={`fav-item ${isActive(slug) ? 'is-active' : ''}`} aria-current={isActive(slug) ? 'page' : undefined}>
                            <span className="fav-item__title">{page.title}</span>
                            <Dot status={pageStatus(page)} />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>
      )}
    </aside>
  );
}

function ChevronRightSmall({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="chev-r">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
