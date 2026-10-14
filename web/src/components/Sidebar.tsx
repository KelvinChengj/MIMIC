import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useResolvePage } from '../state/derived';
import { useFavorites } from '../state/FavoritesContext';
import { useUi } from '../state/UiContext';
import { ChevronDown, ChevronUp, DotsIcon, GripIcon, LogoMark, MenuIcon, PlusIcon, SearchIcon } from './Icons';

type Drag = { kind: 'page'; slug: string } | { kind: 'group'; id: string };
type Drop =
  | { kind: 'item'; slug: string; after: boolean }
  | { kind: 'group-end'; id: string }
  | { kind: 'group'; id: string; after: boolean };

/** 窄欄裡代表頁面的字：標題的第一個中文字，沒有中文就用第一個字母 */
const railMark = (title: string) => {
  const cjk = [...title].find((c) => c.charCodeAt(0) > 0x2e80);
  return (cjk ?? title.trim()[0] ?? '?').toUpperCase();
};

const isTopHalf = (e: DragEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect();
  return e.clientY < r.top + r.height / 2;
};

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, openNewPage } = useUi();
  const fav = useFavorites();
  const { groups } = fav;
  const resolve = useResolvePage();
  const { pathname } = useLocation();

  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const [favOpen, setFavOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ id: string; confirmDelete: boolean } | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [drop, setDrop] = useState<Drop | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive = (slug: string) => pathname === `/p/${slug}` || pathname.startsWith(`/p/${slug}/`);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(null);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(null);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [menu]);

  const endDrag = () => { setDrag(null); setDrop(null); };

  const submitGroup = (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    fav.addGroup(newName);
    setNewName('');
    setAdding(false);
  };

  /* ── 窄欄模式 ── */
  if (sidebarCollapsed) {
    return (
      <aside className="sidebar sidebar--rail" aria-label="側邊欄（已收合）">
        <button className="icon-btn" onClick={toggleSidebar} aria-label="展開側邊欄" title="展開側邊欄"><MenuIcon /></button>
        <Link to="/explore" className={`icon-btn ${pathname === '/explore' ? 'is-active' : ''}`} aria-label="Explore MIMIC" title="Explore MIMIC"><SearchIcon /></Link>
        <button className="icon-btn" onClick={() => openNewPage()} aria-label="新增頁面" title="新增頁面"><PlusIcon /></button>
        <nav className="rail-list" aria-label="Favorites">
          {groups.map((g) => (
            <div className="rail-group" key={g.id}>
              {g.slugs.map((slug) => {
                const page = resolve(slug);
                if (!page) return null;
                return (
                  <NavLink key={slug} to={`/p/${slug}`} className={`rail-item ${isActive(slug) ? 'is-active' : ''}`} title={page.title} aria-label={page.title}>
                    <span className="rail-item__mark" aria-hidden="true">{railMark(page.title)}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
    );
  }

  /* ── 拖放 ── */
  const onItemOver = (e: DragEvent<HTMLLIElement>, slug: string) => {
    if (drag?.kind !== 'page') return;
    e.preventDefault();
    e.stopPropagation();
    const after = !isTopHalf(e);
    setDrop((d) => (d?.kind === 'item' && d.slug === slug && d.after === after ? d : { kind: 'item', slug, after }));
  };
  const onItemDrop = (e: DragEvent<HTMLLIElement>, groupId: string, slug: string) => {
    if (drag?.kind !== 'page') return;
    e.preventDefault();
    e.stopPropagation();
    const g = groups.find((x) => x.id === groupId)!;
    const after = !isTopHalf(e);
    const i = g.slugs.indexOf(slug);
    fav.movePage(drag.slug, groupId, after ? (g.slugs[i + 1] ?? null) : slug);
    endDrag();
  };
  const onGroupOver = (e: DragEvent<HTMLElement>, id: string) => {
    if (!drag) return;
    e.preventDefault();
    if (drag.kind === 'page') setDrop({ kind: 'group-end', id });
    else if (drag.id !== id) setDrop({ kind: 'group', id, after: !isTopHalf(e) });
  };
  const onGroupDrop = (e: DragEvent<HTMLElement>, id: string) => {
    if (!drag) return;
    e.preventDefault();
    if (drag.kind === 'page') fav.movePage(drag.slug, id, null);
    else {
      const after = !isTopHalf(e);
      const i = groups.findIndex((g) => g.id === id);
      fav.moveGroup(drag.id, after ? (groups[i + 1]?.id ?? null) : id);
    }
    endDrag();
  };

  return (
    <aside className="sidebar" aria-label="側邊欄">
      <div className="sidebar__brand">
        <Link to="/" className="brand">
          <LogoMark />
          <span><strong>MIMIC</strong><small>Semiconductor Facilities</small></span>
        </Link>
        <button className="icon-btn icon-btn--plain" onClick={toggleSidebar} aria-label="收合側邊欄" title="收合側邊欄"><MenuIcon /></button>
      </div>

      <Link to="/explore" className={`explore-btn ${pathname === '/explore' ? 'is-active' : ''}`}>
        <SearchIcon size={16} /><span>Explore MIMIC</span><Chev />
      </Link>
      <button className="newpage-btn" onClick={() => openNewPage()}><PlusIcon size={15} /> 新增頁面</button>

      <div className="fav-head">
        <button className="fav-head__title" onClick={() => setFavOpen((o) => !o)} aria-expanded={favOpen}>
          {favOpen ? <ChevronDown size={14} /> : <Chev />} Favorites
        </button>
        <button className={`icon-btn icon-btn--plain ${adding ? 'is-active' : ''}`} onClick={() => setAdding((a) => !a)} aria-label="新增分類" aria-expanded={adding} title="新增分類">
          <PlusIcon size={18} />
        </button>
      </div>

      {adding && (
        <form className="inline-form" onSubmit={submitGroup}>
          <input autoFocus value={newName} maxLength={20} placeholder="分類名稱，例如：值班看板" aria-label="新分類名稱"
            onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && setAdding(false)} />
          <button className="btn btn--sm btn--primary" type="submit" disabled={!newName.trim()}>建立</button>
          <button className="btn btn--sm" type="button" onClick={() => { setAdding(false); setNewName(''); }}>取消</button>
        </form>
      )}

      {favOpen && (
        <nav className="fav-groups" aria-label="Favorites" onDragEnd={endDrag}>
          {groups.length === 0 && <p className="fav-empty">還沒有分類，按上方 ＋ 新增。</p>}
          {groups.map((g, gi) => {
            const open = !closed[g.id];
            const groupDrop = drop?.kind === 'group' && drop.id === g.id ? (drop.after ? 'drop-after' : 'drop-before') : '';
            return (
              <div
                className={`fav-group ${groupDrop} ${drop?.kind === 'group-end' && drop.id === g.id ? 'is-target' : ''} ${drag?.kind === 'group' && drag.id === g.id ? 'is-dragging' : ''}`}
                key={g.id}
                // 整個分類區塊都是放置目標：頁面放在項目上會插入該處（項目自己處理並阻止冒泡），
                // 放在標題、空白處或空分類的提示上則加到該分類最後；拖的是分類時依上下半部決定插入位置
                onDragOver={(e) => onGroupOver(e, g.id)}
                onDrop={(e) => onGroupDrop(e, g.id)}
              >
                <div className="fav-group__head">
                  <span
                    className="grip grip--drag" draggable aria-hidden="true" title="拖曳調整分類順序"
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', g.id);
                      e.dataTransfer.effectAllowed = 'move';
                      const box = e.currentTarget.closest('.fav-group');
                      if (box) e.dataTransfer.setDragImage(box, 12, 12);
                      setDrag({ kind: 'group', id: g.id });
                    }}
                  ><GripIcon /></span>

                  {renaming === g.id ? (
                    <input
                      className="rename-input" autoFocus defaultValue={g.name} maxLength={20} aria-label="分類名稱"
                      onFocus={(e) => e.currentTarget.select()}
                      onBlur={(e) => { fav.renameGroup(g.id, e.currentTarget.value); setRenaming(null); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                        if (e.key === 'Escape') { e.currentTarget.value = g.name; e.currentTarget.blur(); }
                      }}
                    />
                  ) : (
                    <button className="fav-group__toggle" onClick={() => setClosed((c) => ({ ...c, [g.id]: open }))} aria-expanded={open}>
                      <span className="fav-group__name">{g.name}</span>
                      {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  )}

                  <span className="row-actions">
                    <button className="icon-btn icon-btn--xs" onClick={() => openNewPage(g.id)} aria-label={`在「${g.name}」新增頁面`} title="在此分類新增頁面"><PlusIcon size={14} /></button>
                    <button className="icon-btn icon-btn--xs" onClick={() => fav.nudgeGroup(g.id, -1)} disabled={gi === 0} aria-label={`上移分類「${g.name}」`} title="上移分類"><ChevronUp size={14} /></button>
                    <button className="icon-btn icon-btn--xs" onClick={() => fav.nudgeGroup(g.id, 1)} disabled={gi === groups.length - 1} aria-label={`下移分類「${g.name}」`} title="下移分類"><ChevronDown size={14} /></button>
                    <span className="menu-wrap" ref={menu?.id === g.id ? menuRef : undefined}>
                      <button className="icon-btn icon-btn--xs" onClick={() => setMenu(menu?.id === g.id ? null : { id: g.id, confirmDelete: false })} aria-haspopup="menu" aria-expanded={menu?.id === g.id} aria-label={`「${g.name}」更多`} title="更多"><DotsIcon size={14} /></button>
                      {menu?.id === g.id && (
                        <div className="menu" role="menu">
                          <button role="menuitem" onClick={() => { setRenaming(g.id); setMenu(null); }}>重新命名</button>
                          <button
                            role="menuitem" className="is-danger" disabled={groups.length < 2}
                            title={groups.length < 2 ? '至少要保留一個分類' : undefined}
                            onClick={() => (menu.confirmDelete ? (fav.deleteGroup(g.id), setMenu(null)) : setMenu({ id: g.id, confirmDelete: true }))}
                          >
                            {menu.confirmDelete ? (g.slugs.length ? '再按一次：刪除，頁面移到相鄰分類' : '再按一次確認刪除') : '刪除分類'}
                          </button>
                        </div>
                      )}
                    </span>
                  </span>
                </div>

                {open && (
                  <ul>
                    {g.slugs.map((slug) => {
                      const page = resolve(slug);
                      if (!page) return null;
                      const itemDrop = drop?.kind === 'item' && drop.slug === slug ? (drop.after ? 'drop-after' : 'drop-before') : '';
                      return (
                        <li
                          key={slug}
                          draggable
                          className={`${itemDrop} ${drag?.kind === 'page' && drag.slug === slug ? 'is-dragging' : ''}`}
                          onDragStart={(e) => { e.dataTransfer.setData('text/plain', slug); e.dataTransfer.effectAllowed = 'move'; setDrag({ kind: 'page', slug }); }}
                          onDragOver={(e) => onItemOver(e, slug)}
                          onDrop={(e) => onItemDrop(e, g.id, slug)}
                        >
                          <span className="grip" aria-hidden="true"><GripIcon /></span>
                          <Link to={`/p/${slug}`} className={`fav-item ${isActive(slug) ? 'is-active' : ''}`} aria-current={isActive(slug) ? 'page' : undefined} draggable={false}>
                            <span className="fav-item__title">{page.title}</span>
                            <span className="row-actions row-actions--item">
                              <button className="icon-btn icon-btn--xs" onClick={(e) => { e.preventDefault(); fav.nudgePage(slug, -1); }} aria-label={`上移「${page.title}」`} title="上移"><ChevronUp size={14} /></button>
                              <button className="icon-btn icon-btn--xs" onClick={(e) => { e.preventDefault(); fav.nudgePage(slug, 1); }} aria-label={`下移「${page.title}」`} title="下移"><ChevronDown size={14} /></button>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                    {g.slugs.length === 0 && (
                      <li className="fav-group__empty">拖曳頁面到這裡，或按 ＋ 新增頁面</li>
                    )}
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

function Chev({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="chev-r">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
