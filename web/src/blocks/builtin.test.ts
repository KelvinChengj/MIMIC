import { beforeAll, describe, expect, it } from 'vitest';
import { PAGES, pageBySlug } from '../catalog/catalog';
import { fetchLamps, VTAGS } from '../lib/fdm';
import { buildTagIndex } from '../lib/blocks';
import { allLayoutPages, builtinLayoutPage, defaultCommandLayout, defaultWallLayout, DUTY_HOME, isWallPage } from './builtin';
import { pageHost, PREVIEW_HOST } from './host';
import { registerBuiltinBlocks } from './index';
import { footprintOf, getBlockDef } from './registry';
import { textFootprint } from './text';
import type { BlockEnv } from './types';
import type { DutyProps, LampProps, PageBlock } from '../types';

beforeAll(() => registerBuiltinBlocks());

const env = (): BlockEnv => {
  const snapshot = fetchLamps(VTAGS.map((v) => v.key), 0, 0);
  return { snapshot, index: buildTagIndex(snapshot), getPage: (slug) => builtinLayoutPage(slug) };
};

const overlaps = (blocks: PageBlock[]) => {
  const boxes = blocks.map((b) => ({ b, f: footprintOf(b) }));
  const hits: string[] = [];
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], c = boxes[j];
      if (a.b.x < c.b.x + c.f.w && a.b.x + a.f.w > c.b.x && a.b.y < c.b.y + c.f.h && a.b.y + a.f.h > c.b.y) hits.push(`${a.b.id}/${c.b.id}`);
    }
  return hits;
};

describe('值班情境頁 = 燈號（virtual tag）+ 文字積木', () => {
  const wall = defaultWallLayout(pageBySlug('f18p7-overview')!);
  const lamps = wall.filter((b) => b.type === 'lamp');

  it('只用「燈號」與「文字」兩種積木', () => expect(new Set(wall.map((b) => b.type))).toEqual(new Set(['lamp', 'text'])));
  it('每顆燈號綁該廠區 × 系統的 virtual tag', () => {
    expect(lamps).toHaveLength(8);
    expect(lamps.every((b) => b.size === 'M')).toBe(true);
    expect((lamps.find((b) => b.id === 'cell-f18p7-upw')!.props as LampProps).vtag).toEqual({ site: 'f18p7', name: 'F18P7.UPW.LAMP' });
  });
  it('積木互不重疊、id 穩定', () => {
    expect(overlaps(wall)).toEqual([]);
    expect(defaultWallLayout(pageBySlug('f18p7-overview')!).map((b) => b.id)).toEqual(wall.map((b) => b.id));
  });
  it('燈號 = virtual tag 的代碼：F18P2 超純水紅、F18P7 排氣灰、F18P1 超純水綠', () => {
    const e = env();
    const lamp = getBlockDef('lamp')!;
    const at = (slug: string, id: string) => lamp.status!(builtinLayoutPage(slug)!.blocks.find((b) => b.id === id) as PageBlock<LampProps>, e);
    expect(at('upw', 'cell-f18p2-upw')).toBe('red');
    expect(at('exhaust', 'cell-f18p7-exhaust')).toBe('gray');
    expect(at('upw', 'cell-f18p1-upw')).toBe('green');
  });
});

describe('戰情指揮官頁 = 值班情境燈號 + 文字積木', () => {
  const cmd = defaultCommandLayout();
  const duties = cmd.filter((b) => b.type === 'duty');

  it('全廠總覽是戰情指揮官層，每個內建值班情境一顆燈', () => {
    expect(builtinLayoutPage('overview')).toMatchObject({ layer: 'command', builtin: true, title: 'F18A 全廠總覽' });
    expect(DUTY_HOME).toEqual(['power', 'upw', 'hvac', 'exhaust', 'gas', 'chemical']);
    expect(duties.map((b) => (b.props as DutyProps).page)).toEqual([...DUTY_HOME, 'f18p1-utility', 'f18p2-bulk', 'upw-drill']);
    expect(overlaps(cmd)).toEqual([]);
  });
  it('展示大、中、小三種尺寸：超純水大、電力與空調中、其餘小', () => {
    const size = (slug: string) => duties.find((b) => (b.props as DutyProps).page === slug)!.size;
    expect(DUTY_HOME.map(size)).toEqual(['M', 'L', 'M', 'S', 'S', 'S']);
  });
  it('黃燈範例：UPW 值班頁 F18P3、F18P7 為黃燈（超出管制、未超規格）', () => {
    const e = env();
    const lamp = getBlockDef('lamp')!;
    const at = (id: string) => lamp.status!(builtinLayoutPage('upw')!.blocks.find((b) => b.id === id) as PageBlock<LampProps>, e);
    expect(['cell-f18p1-upw', 'cell-f18p2-upw', 'cell-f18p3-upw', 'cell-f18p7-upw'].map(at)).toEqual(['green', 'red', 'yellow', 'yellow']);
  });
  it('綠燈範例：大、中、小各一顆，目前全部正常', () => {
    const e = env();
    const duty = getBlockDef('duty')!;
    const greens = duties.filter((b) => ['f18p1-utility', 'f18p2-bulk', 'upw-drill'].includes((b.props as DutyProps).page));
    expect(greens.map((b) => b.size)).toEqual(['L', 'M', 'S']);
    for (const b of greens) expect(duty.status!(b as PageBlock<DutyProps>, e)).toBe('green');
  });
  it('指揮官燈號取值班情境頁最差燈號', () => {
    const e = env();
    const duty = getBlockDef('duty')!;
    const at = (slug: string) => duty.status!(duties.find((b) => (b.props as DutyProps).page === slug) as PageBlock<DutyProps>, e);
    expect(at('upw')).toBe('red');
    expect(at('exhaust')).toBe('gray'); // F18P7 排氣沒資料：不報平安
    expect(duty.status!({ ...duties[0], props: { page: 'nope' } } as PageBlock<DutyProps>, e)).toBe('gray');
  });
  it('值班情境頁都是值班層；指揮官層不能被指揮官引用', () => {
    for (const slug of DUTY_HOME) expect(builtinLayoutPage(slug)!.layer).toBe('duty');
  });
});

describe('哪些內建頁面是積木畫布', () => {
  it('所有內建頁面都有資料範圍（沒有功能的示意頁已移除）', () => {
    expect(PAGES.every(isWallPage)).toBe(true);
    expect(isWallPage(pageBySlug('f18p2-upw-duty')!)).toBe(true);
    expect(builtinLayoutPage('cda')).toBeUndefined();
  });
  it('值班頁燈號數 = 廠區數 × 系統數', () => {
    for (const p of PAGES.filter((x) => isWallPage(x) && x.layer !== 'command')) {
      expect(defaultWallLayout(p).filter((b) => b.type === 'lamp').length).toBe(p.scope!.sites.length * p.scope!.systems.length);
    }
  });
  it('同一個頁面每次拿到同一份預設版面（快取）', () => expect(builtinLayoutPage('overview')).toBe(builtinLayoutPage('overview')));
  it('allLayoutPages：存過的頁面優先，其餘補上內建預設版面', () => {
    const mine = { ...builtinLayoutPage('upw')!, blocks: [] };
    const all = allLayoutPages([mine]);
    expect(all.filter((p) => p.slug === 'upw')).toEqual([mine]);
    expect(all.some((p) => p.slug === 'overview')).toBe(true);
  });
});

describe('積木連結 host', () => {
  it('畫布頁：燈號下鑽到該頁底下；值班情境燈號進入該頁', () => {
    const h = pageHost('upw');
    expect(h.blockTo!('cell-f18p2-upw')).toBe('/p/upw/b/cell-f18p2-upw');
    expect(h.pageTo!('upw')).toBe('/p/upw');
  });
  it('預覽不連到任何地方', () => expect(PREVIEW_HOST).toEqual({}));
});

describe('文字積木寬度跟著內容', () => {
  it('短文字窄、長文字寬，且不超過該尺寸上限', () => {
    const a = textFootprint('超純水', 'S').w, b = textFootprint('這是一段比較長的說明文字，用來測試換行', 'S');
    expect(a).toBeLessThan(b.w);
    expect(b.w).toBeLessThanOrEqual(220);
    expect(b.h).toBeGreaterThan(textFootprint('超純水', 'S').h);
  });
  it('大尺寸字級更大', () => expect(textFootprint('標題', 'L').w).toBeGreaterThan(textFootprint('標題', 'S').w));
  it('空白文字也有最小大小', () => expect(textFootprint('', 'M')).toMatchObject({ w: 48 }));
});

describe('南科戰情官總覽', () => {
  const page = builtinLayoutPage('stsp')!;
  const duties = page.blocks.filter((b) => b.type === 'duty');

  it('是戰情指揮官頁：F18P1～P3 × 水電空調氣體化學供應，共 15 顆大尺寸燈號', () => {
    expect(page.layer).toBe('command');
    expect(duties).toHaveLength(15);
    expect(duties.every((b) => b.size === 'L')).toBe(true);
    expect(duties.slice(0, 5).map((b) => b.title)).toEqual(['水', '電', '空調', '氣體', '化學供應']);
  });

  it('每顆燈引用的值班情境頁都存在，而且是值班層', () => {
    for (const b of duties) {
      const target = builtinLayoutPage((b.props as DutyProps).page);
      expect(target?.layer, (b.props as DutyProps).page).toBe('duty');
    }
  });

  it('積木互不重疊，寬度放得進一般螢幕', () => {
    expect(overlaps(page.blocks)).toEqual([]);
    expect(Math.max(...page.blocks.map((b) => b.x + footprintOf(b).w))).toBeLessThanOrEqual(1060);
  });

  it('燈號與值班頁的整體燈號一致（取最差）', () => {
    const e = env();
    const def = getBlockDef('duty')!;
    const lamp = getBlockDef('lamp')!;
    for (const b of duties) {
      const target = builtinLayoutPage((b.props as DutyProps).page)!;
      const vt = (target.blocks.find((x) => x.type === 'lamp')!.props as LampProps).vtag!;
      const whole: PageBlock = { id: 'w', type: 'lamp', title: '', size: 'M', x: 0, y: 0, props: { vtag: { site: vt.site, name: vt.name.replace(/\.[^.]+\.LAMP$/, '.LAMP') } } };
      expect(def.status!(b, e), target.slug).toBe(lamp.status!(whole, e));
    }
  });
});

describe('子系統值班情境頁', () => {
  it('每個子系統一顆大尺寸燈號，全部綁得到 virtual tag', () => {
    const page = builtinLayoutPage('f18p2-water')!;
    const lamps = page.blocks.filter((b) => b.type === 'lamp');
    expect(lamps.every((b) => b.size === 'L')).toBe(true);
    expect(lamps.map((b) => (b.props as LampProps).vtag!.name)).toEqual([
      'F18P2.UPW.PRE.LAMP', 'F18P2.UPW.RO.LAMP', 'F18P2.UPW.EDI.LAMP', 'F18P2.UPW.POL.LAMP', 'F18P2.UPW.LOOP.LAMP',
    ]);
    expect(overlaps(page.blocks)).toEqual([]);
  });

  it('廠區沒有某組 Tag 時不放那顆燈（F18P3 沒有前處理 Tag）', () => {
    const names = builtinLayoutPage('f18p3-water')!.blocks.filter((b) => b.type === 'lamp').map((b) => b.title);
    expect(names).not.toContain('前處理');
    expect(names).toHaveLength(4);
  });

  it('子系統的 Tag 合起來就是整體燈號的 Tag', () => {
    for (const v of VTAGS.filter((x) => x.name.split('.').length === 3)) {
      const subs = VTAGS.filter((x) => x.siteId === v.siteId && x.name.startsWith(v.name.replace('.LAMP', '.')) && x !== v);
      expect(subs.flatMap((x) => x.sources).sort(), v.name).toEqual([...v.sources].sort());
    }
  });
});

describe('無塵室空調品質管理（地圖型值班情境）', () => {
  const page = builtinLayoutPage('cleanroom-hvac')!;
  const lamps = page.blocks.filter((b) => b.type === 'lamp');

  it('值班層、有內建底圖，燈號是小尺寸', () => {
    expect(page.layer).toBe('duty');
    expect(page.background).toMatchObject({ src: 'builtin:f18p2-3f-cleanroom', width: 1200, height: 720 });
    expect(lamps).toHaveLength(12);
    expect(lamps.every((b) => b.size === 'S')).toBe(true);
  });

  it('燈號都在底圖範圍內、互不重疊，而且綁得到 virtual tag', () => {
    expect(overlaps(page.blocks)).toEqual([]);
    for (const b of lamps) {
      const f = footprintOf(b);
      expect(b.x >= 0 && b.y >= 0 && b.x + f.w <= 1200 && b.y + f.h <= 720, b.id).toBe(true);
      const vt = (b.props as LampProps).vtag!;
      expect(VTAGS.some((v) => v.siteId === vt.site && v.name === vt.name), vt.name).toBe(true);
    }
  });

  it('展示情境：MAU 03 黃 → Bay C 紅、Bay G 黃；Bay H 無資料；其他綠', () => {
    const e = env();
    const lamp = getBlockDef('lamp')!;
    const st = Object.fromEntries(lamps.map((b) => [b.id, lamp.status!(b, e)]));
    expect(st).toMatchObject({ 'mau-3': 'yellow', 'bay-c': 'red', 'bay-g': 'yellow', 'bay-h': 'gray', 'bay-a': 'green', 'mau-1': 'green' });
  });
});

describe('純水廢水水平衡圖（拓樸型值班情境）', () => {
  const page = builtinLayoutPage('water-balance')!;
  const lamps = page.blocks.filter((b) => b.type === 'lamp');

  it('值班層、有水平衡拓樸底圖，13 個處理單元各一顆小尺寸燈號', () => {
    expect(page.layer).toBe('duty');
    expect(page.background).toMatchObject({ src: 'builtin:f18p1-water-balance', width: 1200, height: 720 });
    expect(lamps).toHaveLength(13);
    expect(lamps.every((b) => b.size === 'S')).toBe(true);
  });

  it('燈號在底圖範圍內、互不重疊，全部綁得到 virtual tag', () => {
    expect(overlaps(page.blocks)).toEqual([]);
    for (const b of lamps) {
      const f = footprintOf(b);
      expect(b.x >= 0 && b.y >= 0 && b.x + f.w <= 1200 && b.y + f.h <= 720, b.id).toBe(true);
      const vt = (b.props as LampProps).vtag!;
      expect(VTAGS.some((v) => v.siteId === vt.site && v.name === vt.name), vt.name).toBe(true);
    }
  });

  it('展示情境：含氟廢水紅、水平衡黃，其餘綠', () => {
    const e = env();
    const lamp = getBlockDef('lamp')!;
    const st = Object.fromEntries(lamps.map((b) => [b.id, lamp.status!(b, e)]));
    expect(st['node-fw']).toBe('red');
    expect(st['node-bal']).toBe('yellow');
    expect(Object.entries(st).filter(([id]) => id !== 'node-fw' && id !== 'node-bal').every(([, s]) => s === 'green')).toBe(true);
  });
});
