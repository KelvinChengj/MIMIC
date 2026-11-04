import { SITES } from '../catalog/catalog';
import type { TextProps } from '../blocks/text';
import type { LampProps, PageBlock, UserPage } from '../types';
import { lampVTag, tagKey } from './blocks';
import { VTAG_BY_KEY } from './fdm';

/** 頁面上燈號積木用到的廠區（依出現順序，不重複） */
export function sitesInPage(page: UserPage): string[] {
  const out: string[] = [];
  for (const b of page.blocks) {
    const site = b.type === 'lamp' ? lampVTag(b.props as LampProps)?.site : undefined;
    if (site && !out.includes(site)) out.push(site);
  }
  return out;
}

export interface SiteSwap {
  from: string;
  to: string;
}

export interface CopyPlan {
  blocks: PageBlock[];
  /** 改綁到新廠區的燈號數 */
  rebound: number;
  /** 新廠區沒有對應 virtual tag 的燈號名稱（複本中清空綁定，避免新廠區的頁面顯示原廠區的燈號） */
  missing: string[];
}

const siteName = (id: string) => SITES.find((s) => s.id === id)?.name ?? id.toUpperCase();

/** 把文字裡的廠區名稱換掉（例如 F18P2 → F18P3） */
export const swapText = (text: string, swap?: SiteSwap) =>
  swap && swap.from !== swap.to ? text.split(siteName(swap.from)).join(siteName(swap.to)) : text;

/**
 * 複製頁面的積木：深拷貝（複本與原頁面互不影響），積木 id 保留（下鑽網址的格式一致）。
 * 指定換廠區時：燈號的 virtual tag 改綁新廠區的同名 tag（例如 F18P2.UPW.POL.LAMP → F18P3.UPW.POL.LAMP），
 * 新廠區沒有這個 tag 就清空綁定並列出（燈號顯示「尚未選擇」，由使用者重新選）；積木名稱與文字裡的廠區名稱一併替換。
 */
export function planCopy(page: UserPage, swap?: SiteSwap): CopyPlan {
  const active = swap && swap.from !== swap.to ? swap : undefined;
  let rebound = 0;
  const missing: string[] = [];
  const blocks = page.blocks.map((src): PageBlock => {
    const b: PageBlock = { ...src, props: structuredClone(src.props), title: swapText(src.title, active) };
    if (!active) return b;
    if (b.type === 'text') {
      const p = b.props as TextProps;
      b.props = { ...p, text: swapText(p.text, active) };
    }
    if (b.type === 'lamp') {
      const ref = lampVTag(b.props as LampProps);
      if (ref?.site === active.from) {
        const prefix = `${siteName(active.from)}.`;
        const name = ref.name.startsWith(prefix) ? `${siteName(active.to)}.${ref.name.slice(prefix.length)}` : ref.name;
        const { source: _legacy, vtag: _old, ...rest } = b.props as LampProps;
        if (VTAG_BY_KEY.has(tagKey(active.to, name))) {
          b.props = { ...rest, vtag: { site: active.to, name } };
          rebound++;
        } else {
          b.props = rest;
          missing.push(src.title || ref.name);
        }
      }
    }
    return b;
  });
  return { blocks, rebound, missing };
}

/** 複本的預設名稱：換了廠區就用新廠區的名稱，否則加「（複本）」 */
export function copyTitle(title: string, swap?: SiteSwap): string {
  const swapped = swapText(title, swap);
  return swapped !== title ? swapped : `${title}（複本）`;
}
