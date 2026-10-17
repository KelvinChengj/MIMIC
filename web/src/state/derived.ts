import { useMemo } from 'react';
import { getBlockDef } from '../blocks/registry';
import type { BlockEnv } from '../blocks/types';
import { builtinLayoutPage, isWallPage } from '../blocks/builtin';
import { PAGES, pageBySlug } from '../catalog/catalog';
import { buildTagIndex } from '../lib/blocks';
import { worstOf } from '../lib/status';
import { blockSystems, buildRollup, cellKey } from '../lib/systems';
import type { PageDef, Status } from '../types';
import { useFdm } from './FdmContext';
import { useSystems } from './SystemsContext';
import { useUserPages } from './UserPagesContext';

/** FDM 最新回傳，依「廠區|Tag」查詢 */
export function useTagIndex() {
  const { snapshot } = useFdm();
  return useMemo(() => buildTagIndex(snapshot), [snapshot]);
}

/** 每次 FDM 回傳（或系統定義變更）後集中算一次的廠區 × 系統燈號 */
export function useRollup() {
  const index = useTagIndex();
  const { systems } = useSystems();
  return useMemo(() => buildRollup(systems, index), [systems, index]);
}

/** 某廠區 × 系統目前的燈號（查表，不重算） */
export function useCell(siteId: string, systemId: string) {
  return useRollup().get(cellKey(siteId, systemId)) ?? null;
}

/** 頁面（Explore）上的整體燈號 */
export function usePageStatus() {
  const rollup = useRollup();
  return useMemo(() => {
    return (page: PageDef): Status => {
      if (!page.scope) return page.fixedStatus ?? 'gray';
      const statuses: Status[] = [];
      for (const siteId of page.scope.sites)
        for (const sysId of page.scope.systems) {
          const cell = rollup.get(cellKey(siteId, sysId));
          if (cell) statuses.push(cell.summary.status);
        }
      return worstOf(statuses);
    };
  }, [rollup]);
}

/** 積木判定燈號所需的資料（FDM 快照、Tag 索引與系統燈號表） */
export function useBlockEnv(): BlockEnv {
  const { snapshot } = useFdm();
  const index = useTagIndex();
  const rollup = useRollup();
  return useMemo(() => ({ snapshot, index, rollup }), [snapshot, index, rollup]);
}

export interface ResolvedPage {
  slug: string;
  title: string;
  status: Status;
  user: boolean;
}

/** 側欄用：不論是內建頁面或自建頁面，都用 slug 取得標題與整體燈號 */
export function useResolvePage() {
  const { getPage } = useUserPages();
  const pageStatus = usePageStatus();
  const env = useBlockEnv();
  return useMemo(
    () =>
      (slug: string): ResolvedPage | null => {
        const up = getPage(slug);
        if (up) {
          // 整頁燈號 = 各積木貢獻的燈號取最差；沒有任何燈號意義的積木（空白頁、只有文字）顯示灰色
          const contributions = up.blocks.flatMap((b) => getBlockDef(b.type)?.status?.(b, env) ?? []);
          const status = worstOf(contributions.length ? contributions : ['gray']);
          return { slug, title: up.title, status, user: true };
        }
        const page = pageBySlug(slug);
        return page ? { slug, title: page.title, status: pageStatus(page), user: false } : null;
      },
    [getPage, pageStatus, env],
  );
}

/** 引用某個系統的地方：頁面上的積木，或範圍包含這個系統的內建頁面 */
export interface SystemRef {
  pageSlug: string;
  pageTitle: string;
  /** 積木；內建的單一系統頁面沒有 */
  blockId?: string;
  blockTitle?: string;
  siteIds: string[];
}

/** 依頁面分組：一個頁面引用了幾個積木、涵蓋哪些廠區 */
export function groupRefs(refs: SystemRef[]) {
  const out = new Map<string, { pageSlug: string; pageTitle: string; blocks: number; siteIds: string[] }>();
  for (const r of refs) {
    const g = out.get(r.pageSlug) ?? { pageSlug: r.pageSlug, pageTitle: r.pageTitle, blocks: 0, siteIds: [] };
    if (r.blockId) g.blocks += 1;
    g.siteIds = [...new Set([...g.siteIds, ...r.siteIds])];
    out.set(r.pageSlug, g);
  }
  return [...out.values()];
}

/** 每個系統被哪些積木 / 頁面引用（系統管理用：還有引用就不能刪除） */
export function useSystemRefs() {
  const { pages } = useUserPages();
  return useMemo(() => {
    const out = new Map<string, SystemRef[]>();
    const add = (id: string, ref: SystemRef) => out.set(id, [...(out.get(id) ?? []), ref]);
    const stored = new Set(pages.map((p) => p.slug));
    const withBlocks = [...pages, ...PAGES.filter((p) => !stored.has(p.slug)).flatMap((p) => builtinLayoutPage(p.slug) ?? [])];
    for (const page of withBlocks)
      for (const b of page.blocks) {
        const ref = blockSystems(b);
        if (ref) for (const id of new Set(ref.systemIds)) add(id, { pageSlug: page.slug, pageTitle: page.title, blockId: b.id, blockTitle: b.title, siteIds: ref.siteIds });
      }
    // 單一廠區 × 系統的內建頁面（下鑽頁形式）
    for (const p of PAGES)
      if (p.scope && !isWallPage(p)) for (const id of p.scope.systems) add(id, { pageSlug: p.slug, pageTitle: p.title, siteIds: p.scope.sites });
    return out;
  }, [pages]);
}
