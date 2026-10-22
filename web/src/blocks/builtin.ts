import { SITES, SYSTEMS, PAGES } from '../catalog/catalog';
import { vtagName } from '../lib/fdm';
import type { BlockSize, DutyProps, Layer, LampProps, PageBlock, PageDef, UserPage } from '../types';
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

const textAt = (out: PageBlock[], id: string, content: string, size: 'S' | 'M', x: number, cy: number, centerW?: number) => {
  const fp = textFootprint(content, size);
  const left = centerW ? x + (centerW - fp.w) / 2 : x;
  out.push(mk(id, 'text', { text: content }, { size, x: Math.round(left), y: Math.round(cy - fp.h / 2) }));
};

/**
 * 值班情境頁的預設版面：全部都是「燈號」與「文字」積木。
 * 每個廠區 × 系統是一顆小燈號，綁該格的 virtual tag；欄名、列名與標題是文字積木。
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
        } satisfies LampProps, { title: `${site.label} ${sys.name}`, size: 'S', x: X0 + c * (TILE.w + GAP_X), y }),
      ),
    );
  });
  return out;
}

/** 內建的值班情境頁：範圍是所有廠區 × 單一系統的頁面（Power、UPW…），也是全廠總覽指揮的對象 */
export const DUTY_HOME = PAGES.filter((p) => !p.explore && p.scope?.systems.length === 1 && p.scope.sites.length === SITES.length).map((p) => p.slug);

/** 指揮官頁的版位：最需要關注的一個用大尺寸，接著兩個中尺寸，其餘小尺寸（展示大中小三種燈號） */
const SPOT = { x0: 24, top: 140, gap: 20, L: 384, M: 192, S: 96, mH: 176 };
const COMMAND_PRIORITY = ['upw', 'power', 'hvac', 'exhaust', 'gas', 'chemical'];

function commandSpot(rank: number): { size: BlockSize; x: number; y: number } {
  const right = SPOT.x0 + SPOT.L + SPOT.gap + 4;
  if (rank === 0) return { size: 'L', x: SPOT.x0, y: SPOT.top };
  if (rank <= 2) return { size: 'M', x: right + (rank - 1) * (SPOT.M + SPOT.gap), y: SPOT.top };
  const i = rank - 3;
  return { size: 'S', x: right + (i % 4) * (SPOT.S + SPOT.gap), y: SPOT.top + SPOT.mH + 52 + Math.floor(i / 4) * (88 + SPOT.gap) };
}

/** 戰情指揮官頁的預設版面：每個值班情境一顆燈號（大、中、小三種尺寸），點了進入該值班情境 */
export function defaultCommandLayout(): PageBlock[] {
  const out: PageBlock[] = [];
  textAt(out, 'title', '戰情指揮 · 值班情境總覽', 'M', 24, 40);
  textAt(out, 'hint', '點燈號進入值班情境', 'S', 24, 76);
  const right = SPOT.x0 + SPOT.L + SPOT.gap + 4;
  textAt(out, 'cap-l', '大尺寸', 'S', SPOT.x0, 118);
  textAt(out, 'cap-m', '中尺寸', 'S', right, 118);
  textAt(out, 'cap-s', '小尺寸', 'S', right, SPOT.top + SPOT.mH + 30);
  const rank = (slug: string) => (COMMAND_PRIORITY.includes(slug) ? COMMAND_PRIORITY.indexOf(slug) : COMMAND_PRIORITY.length + DUTY_HOME.indexOf(slug));
  const order = [...DUTY_HOME].sort((a, b) => rank(a) - rank(b));
  DUTY_HOME.forEach((slug) =>
    out.push(mk(`duty-${slug}`, 'duty', { page: slug } satisfies DutyProps, commandSpot(order.indexOf(slug)))),
  );
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
    cached = { slug, title: page.title, blocks, createdAt: 0, builtin: true, layer };
    cache.set(slug, cached);
  }
  return cached;
}

/** 所有積木畫布頁：使用者存過的頁面 + 還沒改過的內建頁面預設版面 */
export function allLayoutPages(stored: UserPage[]): UserPage[] {
  const have = new Set(stored.map((p) => p.slug));
  return [...stored, ...PAGES.filter((p) => !have.has(p.slug)).flatMap((p) => builtinLayoutPage(p.slug) ?? [])];
}
