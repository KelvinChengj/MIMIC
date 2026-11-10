import { BUILTIN_BACKGROUNDS } from '../blocks/backgrounds';
import { getBlockDef } from '../blocks/registry';
import { PHASE_OPTIONS, SYSTEM_OPTIONS } from '../catalog/catalog';
import type { BlockSize, DutyProps, LampProps, Layer, PageBackground, PageBlock, UserPage } from '../types';
import { lampVTag, newId, tagKey } from './blocks';
import { VTAG_BY_KEY } from './fdm';

/**
 * 頁面 JSON：匯出一個頁面的全部內容，匯入時建立成新頁面。
 * 匯入一律「逐欄檢查、只取認得的欄位重新組出頁面」，不直接採用輸入的物件：
 * 手寫或 AI 產生的 JSON 有錯時會指出是哪個欄位，多餘的欄位直接忽略。
 */
export const PAGE_JSON_FORMAT = 'mimic.page';
export const PAGE_JSON_VERSION = 1;

export interface PageJsonBody {
  title: string;
  layer: Layer;
  system?: string;
  phase?: string;
  background?: PageBackground;
  blocks: PageBlock[];
}

export interface PageJson {
  format: typeof PAGE_JSON_FORMAT;
  version: typeof PAGE_JSON_VERSION;
  exportedAt?: string;
  page: PageJsonBody;
}

/** 匯入的上限（防止過大的檔案塞爆瀏覽器儲存空間或拖慢畫面） */
export const LIMITS = {
  /** 整份 JSON 文字（含底圖圖檔） */
  textLength: 3 * 1024 * 1024,
  blocks: 300,
  title: 40,
  blockTitle: 60,
  text: 400,
  coord: 10000,
  /** 底圖 data URL 的長度（1.5 MB 圖檔轉 base64 約 2 MB） */
  backgroundSrc: 2.2 * 1024 * 1024,
};

const SIZES: BlockSize[] = ['S', 'M', 'L'];
const LAYERS: Layer[] = ['duty', 'command'];
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
const DATA_IMAGE_RE = /^data:image\/(png|jpeg|webp|svg\+xml)[;,]/;

/** 把頁面轉成可匯出的 JSON 物件；withImage＝false 時不帶上傳的底圖圖檔（內建底圖只是一個代號，一律保留） */
export function exportPage(page: UserPage, meta: { system?: string; phase?: string; layer: Layer }, withImage = true): PageJson {
  const bg = page.background;
  const keepBg = bg && (withImage || bg.src.startsWith('builtin:'));
  return {
    format: PAGE_JSON_FORMAT,
    version: PAGE_JSON_VERSION,
    exportedAt: new Date().toISOString(),
    page: {
      title: page.title,
      layer: meta.layer,
      ...(meta.system && SYSTEM_OPTIONS.includes(meta.system) && { system: meta.system }),
      ...(meta.phase && PHASE_OPTIONS.includes(meta.phase) && { phase: meta.phase }),
      ...(keepBg && { background: { src: bg.src, width: bg.width, height: bg.height, ...(bg.name && { name: bg.name }), opacity: bg.opacity ?? 1 } }),
      blocks: page.blocks.map((b) => ({
        id: b.id,
        type: b.type,
        title: b.title,
        size: b.size,
        x: b.x,
        y: b.y,
        // 燈號只輸出目前有效的綁定（舊版欄位不帶出去）
        props: b.type === 'lamp' ? { ...(lampVTag(b.props as LampProps) && { vtag: lampVTag(b.props as LampProps) }) } : structuredClone(b.props),
      })),
    },
  };
}

export const stringifyPage = (json: PageJson) => JSON.stringify(json, null, 2);

export interface ImportContext {
  /** 目前有哪些頁面、各是哪一層（檢查「值班情境燈號」指向的頁面） */
  layerOfPage: (slug: string) => Layer | undefined;
}

export type ImportResult =
  | { ok: true; page: PageJsonBody; warnings: string[] }
  | { ok: false; errors: string[] };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown) => (typeof v === 'string' ? v : undefined);

/**
 * 檢查並解讀匯入的 JSON 文字。
 * errors＝不能匯入（指出欄位與原因）；warnings＝可以匯入，但有地方被調整或需要留意。
 */
export function parsePageJson(text: string, ctx: ImportContext): ImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fail = (): ImportResult => ({ ok: false, errors });

  if (!text.trim()) return { ok: false, errors: ['請貼上 JSON 或選擇檔案'] };
  if (text.length > LIMITS.textLength) return { ok: false, errors: [`內容太大（${(text.length / 1024 / 1024).toFixed(1)} MB），上限 3 MB`] };

  let root: unknown;
  try {
    root = JSON.parse(text);
  } catch (e) {
    return { ok: false, errors: [`不是合法的 JSON：${(e as Error).message}`] };
  }
  if (!isObj(root)) return { ok: false, errors: ['最外層必須是物件，例如 { "format": "mimic.page", "version": 1, "page": { … } }'] };
  if (root.format !== PAGE_JSON_FORMAT) errors.push(`format：必須是 "${PAGE_JSON_FORMAT}"`);
  if (typeof root.version !== 'number') errors.push(`version：必須是數字 ${PAGE_JSON_VERSION}`);
  else if (root.version > PAGE_JSON_VERSION) errors.push(`version：${root.version} 比這個版本支援的 ${PAGE_JSON_VERSION} 新，請更新 MIMIC 後再匯入`);
  else if (root.version < 1) errors.push(`version：必須是 ${PAGE_JSON_VERSION}`);
  const p = root.page;
  if (!isObj(p)) {
    errors.push('page：必須是物件（頁面內容）');
    return fail();
  }

  // ── 頁面欄位
  let title = (str(p.title) ?? '').trim();
  if (!title) errors.push('page.title：必填，頁面名稱');
  else if ([...title].length > LIMITS.title) {
    title = [...title].slice(0, LIMITS.title).join('');
    warnings.push(`頁面名稱超過 ${LIMITS.title} 字，已截短`);
  }
  const layer = LAYERS.includes(p.layer as Layer) ? (p.layer as Layer) : undefined;
  if (!layer) errors.push('page.layer：必須是 "duty"（值班情境）或 "command"（戰情指揮官）');

  let system: string | undefined;
  if (p.system !== undefined) {
    if (typeof p.system === 'string' && SYSTEM_OPTIONS.includes(p.system)) system = p.system;
    else warnings.push(`System「${String(p.system)}」不在選項內，請在下方重新選擇`);
  }
  let phase: string | undefined;
  if (p.phase !== undefined) {
    if (typeof p.phase === 'string' && PHASE_OPTIONS.includes(p.phase)) phase = p.phase;
    else warnings.push(`Phase「${String(p.phase)}」不在選項內，請在下方重新選擇`);
  }

  // ── 底圖
  let background: PageBackground | undefined;
  if (p.background !== undefined && p.background !== null) {
    const b = p.background;
    const src = isObj(b) ? str(b.src) : undefined;
    if (!isObj(b) || !src) errors.push('page.background：必須是物件，且有 src');
    else if (src.startsWith('builtin:')) {
      const known = BUILTIN_BACKGROUNDS.find((x) => x.src === src);
      if (!known) errors.push(`page.background.src：沒有「${src}」這張內建底圖（可用：${BUILTIN_BACKGROUNDS.map((x) => x.src).join('、')}）`);
      else background = { src, width: known.width, height: known.height, name: known.name, v: 2 };
    } else if (!DATA_IMAGE_RE.test(src)) {
      errors.push('page.background.src：只接受內建底圖（builtin:…）或內嵌圖檔（data:image/png、jpeg、webp、svg+xml），不接受外部網址');
    } else if (src.length > LIMITS.backgroundSrc) {
      errors.push(`page.background.src：圖檔太大（約 ${(src.length * 0.75 / 1024 / 1024).toFixed(1)} MB），上限 1.5 MB`);
    } else {
      const w = Number(b.width), h = Number(b.height);
      if (!(w >= 100 && w <= 5000 && h >= 100 && h <= 5000)) errors.push('page.background.width / height：必須是 100～5000 的數字（底圖的像素大小）');
      else background = { src, width: Math.round(w), height: Math.round(h), ...(str(b.name) && { name: str(b.name)!.slice(0, 80) }), v: 2 };
    }
    if (background && isObj(b) && b.opacity !== undefined) {
      const o = Number(b.opacity);
      if (Number.isFinite(o)) background.opacity = Math.min(1, Math.max(0.2, o));
      else warnings.push('底圖透明度不是數字，改用 100%');
    }
  }

  // ── 積木
  const blocks: PageBlock[] = [];
  if (!Array.isArray(p.blocks)) errors.push('page.blocks：必須是陣列（可以是空陣列 []）');
  else if (p.blocks.length > LIMITS.blocks) errors.push(`page.blocks：${p.blocks.length} 個積木，超過上限 ${LIMITS.blocks}`);
  else {
    const seen = new Set<string>();
    let renamed = 0;
    p.blocks.forEach((raw, i) => {
      const at = `page.blocks[${i}]`;
      if (!isObj(raw)) return void errors.push(`${at}：必須是物件`);
      const type = str(raw.type) ?? '';
      const def = getBlockDef(type);
      const label = `${at}（${str(raw.title) || type || '未命名'}）`;
      if (!def) return void errors.push(`${at}.type：不認得的積木種類「${String(raw.type)}」（可用：lamp、duty、text）`);
      if (layer && def.layers && !def.layers.includes(layer))
        return void errors.push(`${label}：「${def.label}」積木不能放在${layer === 'duty' ? '值班情境' : '戰情指揮官'}頁`);

      const size = raw.size === undefined ? (def.defaultSize ?? 'M') : SIZES.includes(raw.size as BlockSize) ? (raw.size as BlockSize) : undefined;
      if (!size) errors.push(`${label}.size：必須是 "S"、"M" 或 "L"`);
      const xy = (['x', 'y'] as const).map((k) => {
        const n = raw[k];
        if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > LIMITS.coord) {
          errors.push(`${label}.${k}：必須是 0～${LIMITS.coord} 的數字`);
          return 0;
        }
        return Math.round(n);
      });

      let blockTitle = str(raw.title) ?? '';
      if (raw.title !== undefined && typeof raw.title !== 'string') errors.push(`${label}.title：必須是文字`);
      if ([...blockTitle].length > LIMITS.blockTitle) blockTitle = [...blockTitle].slice(0, LIMITS.blockTitle).join('');

      const rp = isObj(raw.props) ? raw.props : {};
      let props: unknown;
      if (type === 'lamp') {
        const v = rp.vtag;
        if (v === undefined || v === null) {
          props = {} satisfies LampProps;
          warnings.push(`${label}：沒有綁 virtual tag，匯入後需要自己選`);
        } else if (!isObj(v) || !str(v.site) || !str(v.name)) {
          errors.push(`${label}.props.vtag：必須是 { "site": "f18p2", "name": "F18P2.UPW.LAMP" }`);
        } else {
          const ref = { site: str(v.site)!.trim().toLowerCase(), name: str(v.name)!.trim() };
          props = { vtag: ref } satisfies LampProps;
          if (!VTAG_BY_KEY.has(tagKey(ref.site, ref.name))) warnings.push(`${label}：找不到 virtual tag「${ref.name}」（${ref.site}），燈號會顯示「無效」`);
        }
      } else if (type === 'duty') {
        const page = str(rp.page)?.trim();
        if (!page || !ID_RE.test(page)) errors.push(`${label}.props.page：必填，值班情境頁的代號（網址 mimic/p/ 後面那一段）`);
        else {
          props = { page } satisfies DutyProps;
          const target = ctx.layerOfPage(page);
          if (!target) warnings.push(`${label}：找不到值班情境頁「${page}」，燈號會顯示「找不到頁面」`);
          else if (target !== 'duty') warnings.push(`${label}：「${page}」不是值班情境頁，請改選`);
        }
      } else if (type === 'text') {
        if (typeof rp.text !== 'string') errors.push(`${label}.props.text：必填，文字內容`);
        else {
          if ([...rp.text].length > LIMITS.text) warnings.push(`${label}：文字超過 ${LIMITS.text} 字，已截短`);
          props = { text: [...rp.text].slice(0, LIMITS.text).join('') };
        }
      } else {
        return void errors.push(`${label}：「${def.label}」積木還不支援匯入`);
      }

      // 積木代號：沒有、格式不對或重複時重新產生（代號會出現在下鑽網址裡）
      let id = str(raw.id) ?? '';
      if (!ID_RE.test(id) || seen.has(id)) {
        if (id) renamed++;
        do id = newId('b'); while (seen.has(id));
      }
      seen.add(id);
      if (size && props !== undefined) blocks.push({ id, type, title: blockTitle, size, x: xy[0], y: xy[1], props });
    });
    if (renamed) warnings.push(`${renamed} 個積木的 id 重複或格式不對，已重新產生`);
  }

  if (errors.length || !layer) return fail();
  return { ok: true, page: { title, layer, ...(system && { system }), ...(phase && { phase }), ...(background && { background }), blocks }, warnings };
}

/** 匯入對話框的範例：一個最小的值班情境頁 */
export const SAMPLE_PAGE_JSON: PageJson = {
  format: PAGE_JSON_FORMAT,
  version: PAGE_JSON_VERSION,
  page: {
    title: 'F18P2 純水值班（範例）',
    layer: 'duty',
    system: '超純水',
    phase: 'F18P2',
    blocks: [
      { id: 'title', type: 'text', title: '', size: 'M', x: 24, y: 24, props: { text: 'F18P2 純水關鍵單元' } },
      { id: 'pol', type: 'lamp', title: '拋光', size: 'L', x: 24, y: 80, props: { vtag: { site: 'f18p2', name: 'F18P2.UPW.POL.LAMP' } } },
      { id: 'ro', type: 'lamp', title: 'RO 逆滲透', size: 'M', x: 240, y: 80, props: { vtag: { site: 'f18p2', name: 'F18P2.UPW.RO.LAMP' } } },
      { id: 'edi', type: 'lamp', title: 'EDI 混床', size: 'M', x: 352, y: 80, props: { vtag: { site: 'f18p2', name: 'F18P2.UPW.EDI.LAMP' } } },
    ],
  },
};
