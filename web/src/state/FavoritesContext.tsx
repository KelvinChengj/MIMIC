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
    slugs: ['overview', 'power', 'cda', 'upw', 'pcw', 'hvac', 'exhaust', 'gas', 'chemical'],
  },
  { id: 'daily', name: '日常作業', slugs: ['daily-open10', 'abnormal-track', 'equipment-maint'] },
  { id: 'project', name: '專案專區', slugs: ['energy-saving'] },
];

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
  const [groups, setGroups] = usePersistentState<FavGroup[]>('mimic.favorites.v1', DEFAULT_GROUPS);

  const value = useMemo<FavValue>(() => {
    const apply = (fn: (g: FavGroup[]) => FavGroup[]) => setGroups((prev) => fn(prev));
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

