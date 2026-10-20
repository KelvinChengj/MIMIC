import type { BlockHost } from './types';

/** 畫布頁的積木連結：燈號積木下鑽到 /p/:slug/b/:blockId，值班情境燈號進入該頁 */
export function pageHost(slug: string): BlockHost {
  return {
    blockTo: (blockId) => `/p/${slug}/b/${blockId}`,
    pageTo: (target) => `/p/${target}`,
  };
}

/** 預覽（編輯對話框）：不連到任何地方 */
export const PREVIEW_HOST: BlockHost = {};
