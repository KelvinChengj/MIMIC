import type { PageBlock } from '../types';
import { getBlockDef } from './registry';
import type { BlockHost } from './types';

/** 依積木種類找到對應的呈現元件；找不到（例如積木種類已被移除）時顯示提示，不會讓整頁壞掉 */
export function BlockRender({ block, mode, host }: { block: PageBlock; mode: 'flow' | 'canvas'; host: BlockHost }) {
  const def = getBlockDef(block.type);
  if (!def) {
    return (
      <div className="card unknown-block" role="note">
        找不到積木種類「{block.type}」，可能是這個版本不支援。
      </div>
    );
  }
  const Render = def.Render;
  return <Render block={block} mode={mode} host={host} />;
}

