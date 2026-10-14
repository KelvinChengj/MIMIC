import { useMemo } from 'react';
import { buildValueGetter } from '../lib/blocks';
import { getBlockDef } from '../blocks/registry';
import type { BlockEnv } from '../blocks/types';
import { useUserPages } from './UserPagesContext';
import { SYSTEMS, systemById } from '../catalog/catalog';
import { evaluateSystem, worstOf } from '../lib/status';
import { pageBySlug } from '../catalog/catalog';
import type { PageDef, Status } from '../types';
import { useFdm } from './FdmContext';
import { useRules } from './RulesContext';

/** 某廠區 × 系統目前的判定結果 */
export function useCell(siteId: string, systemId: string) {
  const { snapshot } = useFdm();
  const { rules } = useRules();
  return useMemo(() => {
    const sys = systemById(systemId);
    const readings = snapshot.data[siteId]?.[systemId];
    if (!sys || !readings) return null;
    return { sys, rules: rules[systemId], ...evaluateSystem(sys, readings, rules[systemId]) };
  }, [snapshot, rules, siteId, systemId]);
}

/** 頁面（側欄、Explore）上的整體燈號 */
export function usePageStatus() {
  const { snapshot } = useFdm();
  const { rules } = useRules();
  return useMemo(() => {
    return (page: PageDef): Status => {
      if (!page.scope) return page.fixedStatus ?? 'gray';
      const statuses: Status[] = [];
      for (const siteId of page.scope.sites)
        for (const sysId of page.scope.systems) {
          const sys = SYSTEMS.find((s) => s.id === sysId);
          const readings = snapshot.data[siteId]?.[sysId];
          if (sys && readings) statuses.push(evaluateSystem(sys, readings, rules[sysId]).summary.status);
        }
      return worstOf(statuses);
    };
  }, [snapshot, rules]);
}

export function useValueGetter() {
  const { snapshot } = useFdm();
  return useMemo(() => buildValueGetter(snapshot), [snapshot]);
}

/** 積木判定燈號所需的資料（FDM 快照、門檻設定、單點取值） */
export function useBlockEnv(): BlockEnv {
  const { snapshot } = useFdm();
  const { rules } = useRules();
  const getValue = useValueGetter();
  return useMemo(() => ({ snapshot, rules, getValue }), [snapshot, rules, getValue]);
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
