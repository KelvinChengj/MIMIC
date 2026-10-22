import { useMemo } from 'react';
import { allLayoutPages, DUTY_HOME } from '../blocks/builtin';
import { getBlockDef } from '../blocks/registry';
import type { BlockEnv } from '../blocks/types';
import { pageBySlug, SITES, SYSTEMS } from '../catalog/catalog';
import { buildTagIndex, lampVTag, vtagKey } from '../lib/blocks';
import { layerOf } from '../lib/pages';
import { worstOf } from '../lib/status';
import type { Layer, Status, UserPage } from '../types';
import { useFdm } from './FdmContext';
import { useUserPages } from './UserPagesContext';

/** FDM 最新回傳，依「廠區|virtual tag」查詢 */
export function useTagIndex() {
  const { snapshot } = useFdm();
  return useMemo(() => buildTagIndex(snapshot), [snapshot]);
}

/** 積木判定燈號所需的資料（FDM 快照、virtual tag 索引、取得其他頁面） */
export function useBlockEnv(): BlockEnv {
  const { snapshot } = useFdm();
  const index = useTagIndex();
  const { getPage } = useUserPages();
  return useMemo(() => ({ snapshot, index, getPage }), [snapshot, index, getPage]);
}

/** 整頁燈號 = 各積木貢獻的燈號取最差；沒有任何燈號意義的積木（空白頁、只有文字）顯示灰色 */
export function pageStatusOf(page: UserPage, env: BlockEnv): Status {
  const contributions = page.blocks.flatMap((b) => getBlockDef(b.type)?.status?.(b, env) ?? []);
  return worstOf(contributions.length ? contributions : ['gray']);
}

export interface ResolvedPage {
  slug: string;
  title: string;
  status: Status;
  user: boolean;
  /** 積木畫布頁的層級 */
  layer?: Layer;
}

/** 側欄用：不論是內建頁面或自建頁面，都用 slug 取得標題、層級與整體燈號 */
export function useResolvePage() {
  const env = useBlockEnv();
  return useMemo(
    () =>
      (slug: string): ResolvedPage | null => {
        const up = env.getPage(slug);
        if (up) return { slug, title: up.title, status: pageStatusOf(up, env), user: !up.builtin, layer: layerOf(up) };
        const page = pageBySlug(slug);
        return page ? { slug, title: page.title, status: 'gray', user: false } : null;
      },
    [env],
  );
}

/** 可以被戰情指揮官引用的值班情境頁（內建的系統頁排前面） */
/** 頁面的 System / Phase：自建頁取使用者填的；內建頁由涵蓋範圍推出 */
export function pageMetaOf(p: UserPage): { system: string; phase: string } {
  if (p.system || p.phase) return { system: p.system ?? '', phase: p.phase ?? '' };
  const scope = pageBySlug(p.slug)?.scope;
  if (!scope) return { system: '', phase: '' };
  const system = scope.systems.length === SYSTEMS.length ? '全系統' : scope.systems.map((id) => SYSTEMS.find((s) => s.id === id)?.name ?? id).join('、');
  const phase = scope.sites.length === SITES.length ? 'F18A' : scope.sites.map((id) => SITES.find((s) => s.id === id)?.name ?? id).join('、');
  return { system, phase };
}

export function useDutyPages() {
  const { pages } = useUserPages();
  return useMemo(() => {
    const all = allLayoutPages(pages).filter((p) => layerOf(p) === 'duty');
    const rank = (slug: string) => (DUTY_HOME.includes(slug) ? DUTY_HOME.indexOf(slug) : DUTY_HOME.length);
    return all.sort((a, b) => rank(a.slug) - rank(b.slug)).map((p) => ({ slug: p.slug, title: p.title, ...pageMetaOf(p) }));
  }, [pages]);
}

/** 每個 virtual tag 被哪些頁面的燈號引用 */
export function useVTagRefs() {
  const { pages } = useUserPages();
  return useMemo(() => {
    const out = new Map<string, { slug: string; title: string; blockId: string }[]>();
    for (const page of allLayoutPages(pages))
      for (const b of page.blocks) {
        const ref = b.type === 'lamp' ? lampVTag(b.props as object) : undefined;
        if (ref) out.set(vtagKey(ref), [...(out.get(vtagKey(ref)) ?? []), { slug: page.slug, title: page.title, blockId: b.id }]);
      }
    return out;
  }, [pages]);
}
