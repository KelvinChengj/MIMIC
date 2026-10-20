import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { newId } from '../lib/blocks';
import * as fav from '../lib/favorites';
import type { FavGroup } from '../lib/favorites';
import { usePersistentState } from './storage';

export type { FavGroup };

const EXPLORE_GROUP = 'explore';

const DEFAULT_GROUPS: FavGroup[] = [
  {
    id: 'plant',
    name: '廠務監控',
    slugs: ['overview', 'power', 'upw', 'hvac', 'exhaust', 'gas', 'chemical'],
  },
];

/** 已移除的示意頁（沒有任何功能）與只放這些頁面的預設分類；讀取舊的側欄設定時一併清掉 */
const REMOVED_SLUGS = new Set(['cda', 'pcw', 'daily-open10', 'abnormal-track', 'equipment-maint', 'energy-saving']);
const REMOVED_GROUPS = new Set(['daily', 'project']);
function cleanup(groups: FavGroup[]): FavGroup[] {
  if (!groups.some((g) => g.slugs.some((s) => REMOVED_SLUGS.has(s)))) return groups;
  const out = groups.flatMap((g) => {
    if (!g.slugs.some((s) => REMOVED_SLUGS.has(s))) return [g];
    const slugs = g.slugs.filter((s) => !REMOVED_SLUGS.has(s));
    // 只有「清掉示意頁後才變空」的預設分類才移除；使用者自己清空的分類保留
    return REMOVED_GROUPS.has(g.id) && slugs.length === 0 ? [] : [{ ...g, slugs }];
  });
  return out.length ? out : DEFAULT_GROUPS;
}

interface FavValue {
  groups: FavGroup[];
  isFavorite: (slug: string) => boolean;
  /** Explore 的 ☆：加入「我的收藏」或從任何分類移除 */
  toggleFavorite: (slug: string) => void;
  addGroup: (name: string) => string;
  renameGroup: (id: string, name: string) => void;
  deleteGroup: (id: string) => void;
  moveGroup: (id: string, beforeId: string | null) => void;
  nudgeGroup: (id: string, dir: -1 | 1) => void;
  movePage: (slug: string, toGroupId: string, beforeSlug: string | null) => void;
  nudgePage: (slug: string, dir: -1 | 1) => void;
  addSlug: (groupId: string, slug: string) => void;
  removeSlug: (slug: string) => void;
}
const Ctx = createContext<FavValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [stored, setGroups] = usePersistentState<FavGroup[]>('mimic.favorites.v1', DEFAULT_GROUPS);
  const groups = useMemo(() => cleanup(stored), [stored]);

  const value = useMemo<FavValue>(() => {
    const apply = (fn: (g: FavGroup[]) => FavGroup[]) => setGroups((prev) => fn(cleanup(prev)));
    return {
      groups,
      isFavorite: (slug) => groups.some((g) => g.slugs.includes(slug)),
      toggleFavorite: (slug) =>
        apply((prev) => {
          if (prev.some((g) => g.slugs.includes(slug)))
            return fav.removeSlug(prev, slug).filter((g) => g.slugs.length > 0 || g.id !== EXPLORE_GROUP);
          const base = prev.some((g) => g.id === EXPLORE_GROUP) ? prev : fav.addGroup(prev, EXPLORE_GROUP, '我的收藏');
          return fav.addSlug(base, EXPLORE_GROUP, slug);
        }),
      addGroup: (name) => {
        const id = newId('g');
        apply((prev) => fav.addGroup(prev, id, name));
        return id;
      },
      renameGroup: (id, name) => apply((p) => fav.renameGroup(p, id, name)),
      deleteGroup: (id) => apply((p) => fav.deleteGroup(p, id)),
      moveGroup: (id, before) => apply((p) => fav.moveGroup(p, id, before)),
      nudgeGroup: (id, dir) => apply((p) => fav.nudgeGroup(p, id, dir)),
      movePage: (slug, to, before) => apply((p) => fav.movePage(p, slug, to, before)),
      nudgePage: (slug, dir) => apply((p) => fav.nudgePage(p, slug, dir)),
      addSlug: (gid, slug) => apply((p) => fav.addSlug(p, gid, slug)),
      removeSlug: (slug) => apply((p) => fav.removeSlug(p, slug)),
    };
  }, [groups, setGroups]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFavorites() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useFavorites 必須在 FavoritesProvider 內使用');
  return v;
}

