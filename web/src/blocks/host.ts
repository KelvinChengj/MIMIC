import type { PageDef } from '../types';
import type { BlockHost } from './types';

/** 沒有自己下鑽頁的頁面（自建頁面）：下鑽到涵蓋所有廠區與系統的「全廠總覽」底下 */
export const OVERVIEW_HOST: BlockHost = {
  drillTo: (siteId, systemId) => `/p/overview/${siteId}/${systemId}`,
};

/** 內建頁面：格子在頁面範圍內就掛在該頁面底下（麵包屑會回到該頁），否則退回全廠總覽 */
export function pageHost(page?: PageDef): BlockHost {
  const scope = page?.scope;
  if (!page || !scope) return OVERVIEW_HOST;
  return {
    drillTo: (siteId, systemId) =>
      scope.sites.includes(siteId) && scope.systems.includes(systemId)
        ? `/p/${page.slug}/${siteId}/${systemId}`
        : OVERVIEW_HOST.drillTo(siteId, systemId),
  };
}
