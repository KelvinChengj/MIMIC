import type { PageBlock, PageDef } from '../types';

const mk = (id: string, type: string, props: unknown, over: Partial<PageBlock> = {}): PageBlock => ({
  id, type, title: '', size: 'M', x: 0, y: 0, props, ...over,
});

/** 內建燈號牆頁面 = 一個燈號牆積木（範圍就是頁面的廠區 × 系統） */
export function wallPageBlocks(page: PageDef, onlySite?: string | null): PageBlock[] {
  const scope = page.scope!;
  const sites = onlySite && scope.sites.includes(onlySite) ? [onlySite] : scope.sites;
  return [mk('wall', 'wall', { sites, systems: scope.systems }, { title: '燈號牆 · 廠區 × 系統' })];
}

/** 內建下鑽頁 = 系統摘要積木 + Tag 清單積木 */
export function drillPageBlocks(site: string, system: string, editTo: string): PageBlock[] {
  return [
    mk('summary', 'summary', { site, system, editTo }, { size: 'L' }),
    mk('tags', 'tags', { site, system, filter: 'abnormal' }, { title: 'Tag 燈號清單' }),
  ];
}
