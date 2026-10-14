import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { usePersistentState } from './storage';

export interface FavGroup {
  id: string;
  name: string;
  slugs: string[];
}

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
  toggleFavorite: (slug: string) => void;
  /** 同一群組內拖曳排序 */
  reorder: (groupId: string, from: number, to: number) => void;
}
const Ctx = createContext<FavValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = usePersistentState<FavGroup[]>('mimic.favorites.v1', DEFAULT_GROUPS);

  const isFavorite = useCallback((slug: string) => groups.some((g) => g.slugs.includes(slug)), [groups]);

  const toggleFavorite = useCallback(
    (slug: string) =>
      setGroups((prev) => {
        if (prev.some((g) => g.slugs.includes(slug))) {
          // 移除；空的「Explore 加入」群組一併收掉，其他群組保留
          return prev
            .map((g) => ({ ...g, slugs: g.slugs.filter((s) => s !== slug) }))
            .filter((g) => g.slugs.length > 0 || g.id !== EXPLORE_GROUP);
        }
        const existing = prev.find((g) => g.id === EXPLORE_GROUP);
        if (existing) return prev.map((g) => (g === existing ? { ...g, slugs: [...g.slugs, slug] } : g));
        return [...prev, { id: EXPLORE_GROUP, name: '我的收藏', slugs: [slug] }];
      }),
    [setGroups],
  );

  const reorder = useCallback(
    (groupId: string, from: number, to: number) =>
      setGroups((prev) =>
        prev.map((g) => {
          if (g.id !== groupId || from === to || to < 0 || to >= g.slugs.length) return g;
          const slugs = [...g.slugs];
          const [moved] = slugs.splice(from, 1);
          slugs.splice(to, 0, moved);
          return { ...g, slugs };
        }),
      ),
    [setGroups],
  );

  const value = useMemo(() => ({ groups, isFavorite, toggleFavorite, reorder }), [groups, isFavorite, toggleFavorite, reorder]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFavorites() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useFavorites 必須在 FavoritesProvider 內使用');
  return v;
}
