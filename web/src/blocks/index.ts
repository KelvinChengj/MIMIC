import { lampBlock } from './lamp';
import { registerBlock } from './registry';
import { summaryBlock } from './summary';
import { tagsBlock } from './tags';
import type { BlockDefinition } from './types';
import { textBlock } from './text';
import { wallBlock } from './wall';

let done = false;

/**
 * 註冊內建積木（順序即積木庫的顯示順序）。
 * 要新增積木種類：在 blocks/<名稱>/ 寫好 BlockDefinition，加到這裡即可。
 */
export function registerBuiltinBlocks() {
  if (done) return;
  done = true;
  const builtin: BlockDefinition<any>[] = [lampBlock, wallBlock, summaryBlock, tagsBlock, textBlock];
  builtin.forEach((d) => registerBlock(d));
}
