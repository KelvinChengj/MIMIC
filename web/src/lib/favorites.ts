/** 側欄分類與頁面排序的純函式（不修改傳入的陣列） */
export interface FavGroup {
  id: string;
  name: string;
  slugs: string[];
}

const without = (groups: FavGroup[], slug: string) =>
  groups.map((g) => (g.slugs.includes(slug) ? { ...g, slugs: g.slugs.filter((s) => s !== slug) } : g));

/** 把頁面移到指定分類，插在 beforeSlug 前面；beforeSlug 為 null 則放到最後 */
export function movePage(groups: FavGroup[], slug: string, toGroupId: string, beforeSlug: string | null): FavGroup[] {
  if (!groups.some((g) => g.id === toGroupId) || beforeSlug === slug) return groups;
  return without(groups, slug).map((g) => {
    if (g.id !== toGroupId) return g;
    const at = beforeSlug == null ? -1 : g.slugs.indexOf(beforeSlug);
    const slugs = [...g.slugs];
    slugs.splice(at < 0 ? slugs.length : at, 0, slug);
    return { ...g, slugs };
  });
}

/** 上移 / 下移一格；到分類邊界時跨到相鄰分類（上一類的最後、下一類的最前） */
export function nudgePage(groups: FavGroup[], slug: string, dir: -1 | 1): FavGroup[] {
  const gi = groups.findIndex((g) => g.slugs.includes(slug));
  if (gi < 0) return groups;
  const g = groups[gi];
  const i = g.slugs.indexOf(slug);
  const j = i + dir;
  if (j >= 0 && j < g.slugs.length) {
    const slugs = [...g.slugs];
    [slugs[i], slugs[j]] = [slugs[j], slugs[i]];
    return groups.map((x, k) => (k === gi ? { ...x, slugs } : x));
  }
  const next = groups[gi + dir];
  if (!next) return groups;
  return movePage(groups, slug, next.id, dir === 1 ? (next.slugs[0] ?? null) : null);
}

export function moveGroup(groups: FavGroup[], id: string, beforeId: string | null): FavGroup[] {
  const g = groups.find((x) => x.id === id);
  if (!g || beforeId === id) return groups;
  const rest = groups.filter((x) => x.id !== id);
  const at = beforeId == null ? -1 : rest.findIndex((x) => x.id === beforeId);
  rest.splice(at < 0 ? rest.length : at, 0, g);
  return rest;
}

export function nudgeGroup(groups: FavGroup[], id: string, dir: -1 | 1): FavGroup[] {
  const i = groups.findIndex((g) => g.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= groups.length) return groups;
  const out = [...groups];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

export const addGroup = (groups: FavGroup[], id: string, name: string): FavGroup[] => [
  ...groups,
  { id, name: name.trim() || '新分類', slugs: [] },
];

export const renameGroup = (groups: FavGroup[], id: string, name: string): FavGroup[] =>
  name.trim() ? groups.map((g) => (g.id === id ? { ...g, name: name.trim() } : g)) : groups;

/** 刪除分類；裡面的頁面不會消失，會移到上一個分類的最後（第一個分類則移到下一個的最前）。只剩一個分類時不刪 */
export function deleteGroup(groups: FavGroup[], id: string): FavGroup[] {
  const i = groups.findIndex((g) => g.id === id);
  if (i < 0 || groups.length < 2) return groups;
  const g = groups[i];
  const rest = groups.filter((x) => x.id !== id);
  if (i > 0) return rest.map((x, k) => (k === i - 1 ? { ...x, slugs: [...x.slugs, ...g.slugs] } : x));
  return rest.map((x, k) => (k === 0 ? { ...x, slugs: [...g.slugs, ...x.slugs] } : x));
}

export const addSlug = (groups: FavGroup[], groupId: string, slug: string): FavGroup[] =>
  groups.map((g) => (g.id === groupId && !g.slugs.includes(slug) ? { ...g, slugs: [...g.slugs, slug] } : g));

export const removeSlug = (groups: FavGroup[], slug: string): FavGroup[] => without(groups, slug);
