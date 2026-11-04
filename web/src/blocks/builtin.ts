import { SITES, STSP, SYSTEMS, PAGES, stspSlug } from '../catalog/catalog';
import { tagKey, VTAG_BY_KEY, vtagName } from '../lib/fdm';
import type { BlockSize, DutyProps, Layer, LampProps, PageBackground, PageBlock, PageDef, UserPage } from '../types';
import { bayRect, BUILTIN_BACKGROUNDS, builtinBackgroundId, CLEANROOM, MAP_TITLES, mauRect, POWER, powerLampAt, WATER, waterLampAt, type PowerNodeId, type WaterNodeId } from './backgrounds';
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
  { slug: 'f18p2-bulk', size: 'M' },
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

/**
 * 南科戰情官總覽：每個廠區一列（列名在上方），每列五顆大尺寸燈號：水、電、空調、氣體、化學供應。
 * 每顆燈代表該廠區 × 系統的值班情境頁，點了進入。頁首已有說明，畫布上不再放標題，整頁一個畫面看完。
 */
export function stspCommandLayout(): PageBlock[] {
  const out: PageBlock[] = [];
  const L = { w: 192, h: 176 }, GAP = 16, TOP = 20, ROW = 34 + L.h + 24;
  STSP.sites.forEach((siteId, r) => {
    const site = SITES.find((s) => s.id === siteId)!;
    const y = TOP + r * ROW;
    textAt(out, `row-${siteId}`, site.label, 'M', 24, y + 14);
    STSP.columns.forEach((c, i) =>
      out.push(mk(`duty-${siteId}-${c.key}`, 'duty', { page: stspSlug(siteId, c.key) } satisfies DutyProps, {
        size: 'L', x: 24 + i * (L.w + GAP), y: y + 34, title: c.label,
      })),
    );
  });
  return out;
}

/**
 * 單一廠區 × 系統的值班情境頁：每個子系統一顆大尺寸燈號（兩列），綁上游的 virtual tag，點了下鑽 InSQL tag。
 * 不另放「整體」燈號：指揮官層取最差就是整體，而且燈號數量才不會重複計算。
 */
export function subsystemLayout(page: PageDef): PageBlock[] {
  const site = SITES.find((s) => s.id === page.scope!.sites[0])!;
  const sys = SYSTEMS.find((s) => s.id === page.scope!.systems[0])!;
  const groups = sys.groups.filter((g) => VTAG_BY_KEY.has(tagKey(site.id, vtagName(site.id, sys.id, g.code))));
  const out: PageBlock[] = [];
  textAt(out, 'title', `${site.label} · ${sys.name}`, 'M', 24, 40);
  textAt(out, 'hint', '點燈號下鑽 InSQL tag', 'S', 24, 76);
  const L = { w: 192, h: 176 }, GAP = 16, TOP = 112, perRow = Math.ceil(groups.length / 2);
  groups.forEach((g, i) =>
    out.push(mk(`sub-${g.code.toLowerCase()}`, 'lamp', { vtag: { site: site.id, name: vtagName(site.id, sys.id, g.code) } } satisfies LampProps, {
      size: 'L', x: 24 + (i % perRow) * (L.w + GAP), y: TOP + Math.floor(i / perRow) * (L.h + GAP), title: g.name,
    })),
  );
  return out;
}

/** 內建底圖的大標題（文字積木，可在編輯模式點兩下修改） */
function mapTitle(bgId: string): PageBlock {
  const t = MAP_TITLES[bgId];
  return mk('map-title', 'text', { text: t.text }, { size: 'M', x: t.x, y: t.y });
}

/**
 * 舊資料：內建底圖的大標題原本畫在圖裡，改成文字積木後補上一次（之後使用者刪掉就不再補）。
 * 內建頁面存過的版面、以及從地圖頁複製出來的頁面都適用。
 */
export function withMapTitle(page: UserPage): UserPage {
  const bg = page.background;
  const id = bg && builtinBackgroundId(bg.src);
  if (!bg || bg.v === 2 || !id) return page;
  const blocks = MAP_TITLES[id] && !page.blocks.some((b) => b.id === 'map-title') ? [mapTitle(id), ...page.blocks] : page.blocks;
  return { ...page, blocks, background: { ...bg, v: 2 } };
}

/**
 * 地圖型值班情境：無塵室平面圖當底圖，每個 Bay 中央一顆小尺寸燈號（綁該 Bay 的溫濕度 virtual tag），
 * 每台 MAU 機組上一顆（綁 MAU 子系統 virtual tag）。燈號座標以底圖像素為準。
 */
export function cleanroomLayout(page: PageDef): PageBlock[] {
  const site = page.scope!.sites[0];
  const DOT = { w: 48, h: 44 };
  const bays = CLEANROOM.bays.map(([id, area], i) => {
    const r = bayRect(i);
    return mk(`bay-${id.toLowerCase()}`, 'lamp', { vtag: { site, name: vtagName(site, 'cr', `BAY${id}`) } } satisfies LampProps, {
      size: 'S', title: `Bay ${id} ${area}`, x: Math.round(r.x + (r.w - DOT.w) / 2), y: Math.round(r.y + (r.h - DOT.h) / 2 + 14),
    });
  });
  const maus = CLEANROOM.cols.map((_, i) => {
    const m = mauRect(i);
    return mk(`mau-${i + 1}`, 'lamp', { vtag: { site, name: vtagName(site, 'mau', `MAU0${i + 1}`) } } satisfies LampProps, {
      size: 'S', title: `MAU 0${i + 1}`, x: Math.round(m.x + m.w - DOT.w - 6), y: Math.round(m.y + (m.h - DOT.h) / 2),
    });
  });
  return [mapTitle(CLEANROOM.id), ...maus, ...bays];
}

/** 水平衡拓樸圖：每個處理單元一顆燈號，純水單元綁超純水子系統、廢水單元綁廢水回收子系統的 virtual tag */
const WATER_LAMPS: [WaterNodeId, string, string][] = [
  ['raw', 'ww', 'RAW'], ['pre', 'upw', 'PRE'], ['ro', 'upw', 'RO'], ['edi', 'upw', 'EDI'], ['pol', 'upw', 'POL'], ['loop', 'upw', 'LOOP'],
  ['rcl', 'ww', 'RCL'], ['bal', 'ww', 'BAL'], ['org', 'ww', 'ORG'], ['aw', 'ww', 'AW'], ['cmp', 'ww', 'CMP'], ['fw', 'ww', 'FW'], ['dis', 'ww', 'DIS'],
];

export function waterBalanceLayout(page: PageDef): PageBlock[] {
  const site = page.scope!.sites[0];
  return [mapTitle(WATER.id), ...WATER_LAMPS.map(([id, sys, group]) =>
    mk(`node-${id}`, 'lamp', { vtag: { site, name: vtagName(site, sys, group) } } satisfies LampProps, {
      size: 'S', title: WATER.nodes[id].title, ...waterLampAt(id),
    }),
  )];
}

/** 高壓單線圖：每個設備一顆燈號，綁高壓電力子系統的 virtual tag（例如 F18P2.HV.MTR1.LAMP） */
const POWER_LAMPS: [PowerNodeId, string][] = [
  ['tpca', 'TPCA'], ['tpcb', 'TPCB'], ['gis', 'GIS'], ['mtr1', 'MTR1'], ['mtr2', 'MTR2'], ['gen', 'GEN'],
  ['busa', 'BUSA'], ['busb', 'BUSB'], ['tie', 'TIE'], ['loop1', 'LOOP1'], ['loop2', 'LOOP2'],
  ['ss1', 'SS1'], ['ss2', 'SS2'], ['ss3', 'SS3'], ['ss4', 'SS4'],
];

export function powerLayout(page: PageDef): PageBlock[] {
  const site = page.scope!.sites[0];
  return [mapTitle(POWER.id), ...POWER_LAMPS.map(([id, group]) => {
    const { x, y, title } = powerLampAt(id);
    return mk(`node-${id}`, 'lamp', { vtag: { site, name: vtagName(site, 'hv', group) } } satisfies LampProps, { size: 'S', title, x, y });
  })];
}

const PRESET_BG: Partial<Record<NonNullable<PageDef['preset']>, number>> = { cleanroom: 0, water: 1, power: 2 };

const builtinBackground = (page: PageDef): PageBackground | undefined => {
  const i = page.preset ? PRESET_BG[page.preset] : undefined;
  const bg = i === undefined ? undefined : BUILTIN_BACKGROUNDS[i];
  if (!bg) return undefined;
  const { label: _label, ...rest } = bg;
  return { ...rest, opacity: 1 };
};

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
    const blocks =
      page.preset === 'stsp' ? stspCommandLayout()
      : page.preset === 'subsystems' ? subsystemLayout(page)
      : page.preset === 'cleanroom' ? cleanroomLayout(page)
      : page.preset === 'water' ? waterBalanceLayout(page)
      : page.preset === 'power' ? powerLayout(page)
      : layer === 'command' ? defaultCommandLayout() : defaultWallLayout(page);
    const background = builtinBackground(page);
    cached = { slug, title: page.title, blocks, createdAt: 0, builtin: true, layer, sizes: 2, ...(background && { background }) };
    cache.set(slug, cached);
  }
  return cached;
}

/** 所有積木畫布頁：使用者存過的頁面 + 還沒改過的內建頁面預設版面 */
export function allLayoutPages(stored: UserPage[]): UserPage[] {
  const have = new Set(stored.map((p) => p.slug));
  return [...stored, ...PAGES.filter((p) => !have.has(p.slug)).flatMap((p) => builtinLayoutPage(p.slug) ?? [])];
}
