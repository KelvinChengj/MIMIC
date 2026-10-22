import { SITES, SYSTEMS, PAGES } from '../catalog/catalog';
import { vtagName } from '../lib/fdm';
import type { BlockSize, DutyProps, Layer, LampProps, PageBlock, PageDef, UserPage } from '../types';
import { textFootprint } from './text';

const mk = (id: string, type: string, props: unknown, over: Partial<PageBlock> = {}): PageBlock => ({
  id, type, title: '', size: 'M', x: 0, y: 0, props, ...over,
});

/** 燈號牆版面的尺寸（中尺寸燈號 96 × 88） */
const TILE = { w: 96, h: 88 };
const GAP_X = 12;
const GAP_Y = 14;
const X0 = 150;
const Y0 = 112;

const textAt = (out: PageBlock[], id: string, content: string, size: 'S' | 'M', x: number, cy: number, centerW?: number) => {
  const fp = textFootprint(content, size);
  const left = centerW ? x + (centerW - fp.w) / 2 : x;
  out.push(mk(id, 'text', { text: content }, { size, x: Math.round(left), y: Math.round(cy - fp.h / 2) }));
};

/**
 * 值班情境頁的預設版面：全部都是「燈號」與「文字」積木。
 * 每個廠區 × 系統是一顆中尺寸燈號，綁該格的 virtual tag；欄名、列名與標題是文字積木。
 */
export function defaultWallLayout(page: PageDef): PageBlock[] {
  const scope = page.scope!;
  const sites = SITES.filter((s) => scope.sites.includes(s.id));
  const systems = SYSTEMS.filter((s) => scope.systems.includes(s.id));
  const out: PageBlock[] = [];

  textAt(out, 'title', '值班燈號 · 廠區 × 系統', 'M', 24, 40);
  systems.forEach((sys, c) => textAt(out, `col-${sys.id}`, sys.name, 'S', X0 + c * (TILE.w + GAP_X), Y0 - 24, TILE.w));
  sites.forEach((site, r) => {
    const y = Y0 + r * (TILE.h + GAP_Y);
    textAt(out, `row-${site.id}`, site.label, 'S', 24, y + TILE.h / 2);
    systems.forEach((sys, c) =>
      out.push(
        mk(`cell-${site.id}-${sys.id}`, 'lamp', {
          vtag: { site: site.id, name: vtagName(site.id, sys.id) },
        } satisfies LampProps, { title: `${site.name} ${sys.short}`, size: 'M', x: X0 + c * (TILE.w + GAP_X), y }),
      ),
    );
  });
  return out;
}

/** 內建的值班情境頁：範圍是所有廠區 × 單一系統的頁面（Power、UPW…），也是全廠總覽指揮的對象 */
export const DUTY_HOME = PAGES.filter((p) => !p.explore && p.scope?.systems.length === 1 && p.scope.sites.length === SITES.length).map((p) => p.slug);

/** 綠燈範例：目前全部正常的值班情境頁，分別用大、中、小尺寸展示 */
const GREEN_EXAMPLES: { slug: string; size: BlockSize }[] = [
  { slug: 'f18p1-utility', size: 'L' },
  { slug: 'f18p3-upw-particle', size: 'M' },
  { slug: 'upw-drill', size: 'S' },
];
const COMMAND_PRIORITY = ['upw', 'power', 'hvac', 'exhaust', 'gas', 'chemical'];

/**
 * 戰情指揮官頁的預設版面：依尺寸分三欄（大、中、小），每欄先放需要關注的值班情境，再放一個綠燈範例。
 * 點燈號進入該值班情境。
 */
export function defaultCommandLayout(): PageBlock[] {
  const out: PageBlock[] = [];
  textAt(out, 'title', '戰情指揮 · 值班情境總覽', 'M', 24, 40);
  textAt(out, 'hint', '點燈號進入值班情境', 'S', 24, 76);
  const COL = { L: 24, M: 240, S: 476 }, TOP = 140, GAP = 20, ROW_S = 54;
  textAt(out, 'cap-l', '大尺寸', 'S', COL.L, 118);
  textAt(out, 'cap-m', '中尺寸', 'S', COL.M, 118);
  textAt(out, 'cap-s', '小尺寸', 'S', COL.S, 118);
  const title = (slug: string) => PAGES.find((p) => p.slug === slug)?.title ?? slug;
  const slots: { slug: string; size: BlockSize }[] = [
    ...[...DUTY_HOME]
      .sort((a, b) => COMMAND_PRIORITY.indexOf(a) - COMMAND_PRIORITY.indexOf(b))
      .map((slug, rank): { slug: string; size: BlockSize } => ({ slug, size: rank === 0 ? 'L' : rank <= 2 ? 'M' : 'S' })),
    ...GREEN_EXAMPLES,
  ];
  const used = { L: 0, M: 0, S: 0 };
  const dutyFirst = (slug: string) => (DUTY_HOME.includes(slug) ? 0 : 1);
  // 輸出順序：內建值班情境依 DUTY_HOME 順序在前，綠燈範例在後（id 穩定，不影響版面）
  const placed = slots.map((slot) => {
    const i = used[slot.size]++;
    const at =
      slot.size === 'L' ? { x: COL.L, y: TOP + i * (176 + GAP) }
      : slot.size === 'M' ? { x: COL.M + (i % 2) * (96 + GAP), y: TOP + Math.floor(i / 2) * (88 + GAP) }
      : { x: COL.S, y: TOP + i * ROW_S };
    return { ...slot, ...at };
  });
  placed
    .sort((a, b) => dutyFirst(a.slug) - dutyFirst(b.slug) || (DUTY_HOME.indexOf(a.slug) - DUTY_HOME.indexOf(b.slug)))
    .forEach(({ slug, size, x, y }) => {
      // 積木名稱預設為值班情境頁的名稱（大、中尺寸顯示的就是它，可在編輯器修改）
      out.push(mk(`duty-${slug}`, 'duty', { page: slug } satisfies DutyProps, { size, x, y, title: title(slug) }));
      // 小尺寸沒有文字：在燈號右邊放名稱
      if (size === 'S') textAt(out, `lbl-${slug}`, title(slug), 'S', x + 60, y + 22);
    });
  return out;
}

export const builtinLayer = (page: PageDef): Layer => page.layer ?? 'duty';

/** 有資料範圍的內建頁面都用積木畫布呈現（值班情境或戰情指揮官） */
export const isWallPage = (page: PageDef) => !!page.scope;

const cache = new Map<string, UserPage>();

/** 內建燈號牆頁面的預設版面（以 UserPage 形式提供，和自建頁面共用同一套編輯畫面） */
export function builtinLayoutPage(slug: string): UserPage | undefined {
  const page = PAGES.find((p) => p.slug === slug);
  if (!page || !isWallPage(page)) return undefined;
  let cached = cache.get(slug);
  if (!cached) {
    const layer = builtinLayer(page);
    const blocks = layer === 'command' ? defaultCommandLayout() : defaultWallLayout(page);
    cached = { slug, title: page.title, blocks, createdAt: 0, builtin: true, layer, sizes: 2 };
    cache.set(slug, cached);
  }
  return cached;
}

/** 所有積木畫布頁：使用者存過的頁面 + 還沒改過的內建頁面預設版面 */
export function allLayoutPages(stored: UserPage[]): UserPage[] {
  const have = new Set(stored.map((p) => p.slug));
  return [...stored, ...PAGES.filter((p) => !have.has(p.slug)).flatMap((p) => builtinLayoutPage(p.slug) ?? [])];
}
