import { SITES, SYSTEMS, PAGES } from '../catalog/catalog';
import type { LampProps, PageBlock, PageDef, UserPage } from '../types';
import { textFootprint } from './text';

const mk = (id: string, type: string, props: unknown, over: Partial<PageBlock> = {}): PageBlock => ({
  id, type, title: '', size: 'M', x: 0, y: 0, props, ...over,
});

/** 燈號牆版面的尺寸（小尺寸燈號 96 × 88） */
const TILE = { w: 96, h: 88 };
const GAP_X = 12;
const GAP_Y = 14;
const X0 = 150;
const Y0 = 112;

/**
 * 內建燈號牆頁面的預設版面：全部都是「燈號」與「文字」積木。
 * 每個廠區 × 系統是一顆「系統燈號」的小燈號積木，欄名、列名與標題是文字積木。
 * 使用者可以像自建頁面一樣在畫布上移動、縮放、增刪。
 */
export function defaultWallLayout(page: PageDef): PageBlock[] {
  const scope = page.scope!;
  const sites = SITES.filter((s) => scope.sites.includes(s.id));
  const systems = SYSTEMS.filter((s) => scope.systems.includes(s.id));
  const out: PageBlock[] = [];

  const text = (id: string, content: string, size: 'S' | 'M', x: number, cy: number, centerW?: number) => {
    const fp = textFootprint(content, size);
    const left = centerW ? x + (centerW - fp.w) / 2 : x;
    out.push(mk(id, 'text', { text: content }, { size, x: Math.round(left), y: Math.round(cy - fp.h / 2) }));
  };

  text('title', '燈號牆 · 廠區 × 系統', 'M', 24, 40);
  systems.forEach((sys, c) => text(`col-${sys.id}`, sys.name, 'S', X0 + c * (TILE.w + GAP_X), Y0 - 24, TILE.w));
  sites.forEach((site, r) => {
    const y = Y0 + r * (TILE.h + GAP_Y);
    text(`row-${site.id}`, site.label, 'S', 24, y + TILE.h / 2);
    systems.forEach((sys, c) =>
      out.push(
        mk(`cell-${site.id}-${sys.id}`, 'lamp', {
          tags: [],
          source: { site: site.id, system: sys.id },
        } satisfies LampProps, { title: `${site.label} ${sys.name}`, size: 'S', x: X0 + c * (TILE.w + GAP_X), y }),
      ),
    );
  });
  return out;
}

/** 範圍涵蓋多個格子的內建頁面（燈號牆）用積木畫布呈現；單一格子的頁面是下鑽頁 */
export const isWallPage = (page: PageDef) =>
  !!page.scope && page.scope.sites.length * page.scope.systems.length > 1;

const cache = new Map<string, UserPage>();

/** 內建燈號牆頁面的預設版面（以 UserPage 形式提供，和自建頁面共用同一套編輯畫面） */
export function builtinLayoutPage(slug: string): UserPage | undefined {
  const page = PAGES.find((p) => p.slug === slug);
  if (!page || !isWallPage(page)) return undefined;
  let cached = cache.get(slug);
  if (!cached) {
    cached = { slug, title: page.title, blocks: defaultWallLayout(page), createdAt: 0, builtin: true };
    cache.set(slug, cached);
  }
  return cached;
}

/** 內建下鑽頁 = 系統摘要積木 + Tag 清單積木 */
export function drillPageBlocks(site: string, system: string): PageBlock[] {
  return [
    mk('summary', 'summary', { site, system, showActions: true }, { size: 'L' }),
    mk('tags', 'tags', { site, system, filter: 'abnormal' }, { title: 'Tag 燈號清單' }),
  ];
}
