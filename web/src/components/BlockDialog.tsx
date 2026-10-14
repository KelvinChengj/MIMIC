import { BlockRender } from '../blocks/BlockView';
import { footprintOf, getBlockDef } from '../blocks/registry';
import type { BlockHost } from '../blocks/types';
import type { PageBlock } from '../types';
import { Modal } from './Modal';
import { SizeSwitch } from './SizeSwitch';

const HOST: BlockHost = { drillBase: 'overview' };

/** 預覽區：用實際尺寸畫出積木，改尺寸、改內容時即時變化 */
function Stage({ block }: { block: PageBlock }) {
  const def = getBlockDef(block.type);
  const fp = footprintOf(block);
  return (
    <div className="be__stage">
      <div className="cb cb--static" style={{ width: fp.w, height: def?.fixedHeight ? fp.h : undefined }}>
        <div className="cb__body"><BlockRender block={block} mode="canvas" host={HOST} /></div>
      </div>
    </div>
  );
}

/** 編輯對話框外殼：名稱、尺寸、各積木自己的 Editor，右側即時預覽 */
export function BlockDialog({ block, onChange, onClose }: {
  block: PageBlock;
  onChange: (patch: Partial<PageBlock>) => void;
  onClose: () => void;
}) {
  const def = getBlockDef(block.type);
  if (!def) return null;
  const { Editor, Explain } = def;
  const fp = footprintOf(block);
  return (
    <Modal
      title={`編輯${def.label}積木`}
      size="xl"
      onClose={onClose}
      footer={
        <>
          <span className="modal__auto">變更會自動儲存</span>
          <button className="btn btn--primary" onClick={onClose}>完成</button>
        </>
      }
    >
      <div className="be">
        <div className="be__form">
          <div className="be__top">
            {!def.titleless && (
              <div className="ef">
                <label htmlFor="blk-title">積木名稱</label>
                <input id="blk-title" className="ef__input ef__input--plain" value={block.title} maxLength={40} onChange={(e) => onChange({ title: e.target.value })} />
              </div>
            )}
            <div className="ef ef--size">
              <label id="size-label">尺寸</label>
              <SizeSwitch value={block.size} onChange={(size) => onChange({ size })} />
            </div>
          </div>
          <Editor block={block} onProps={(patch) => onChange({ props: { ...(block.props as object), ...patch } })} />
        </div>

        <aside className="be__preview" aria-label="即時預覽">
          <h3>即時預覽 <small>實際大小 {fp.w} × {fp.h}</small></h3>
          <Stage block={block} />
          {Explain && <Explain block={block} />}
        </aside>
      </div>
    </Modal>
  );
}

/** 檢視頁點積木：看這顆燈為什麼亮這個顏色 */
export function BlockDetail({ block, onClose }: { block: PageBlock; onClose: () => void }) {
  const def = getBlockDef(block.type);
  if (!def) return null;
  const { Explain } = def;
  return (
    <Modal title={block.title || def.label} onClose={onClose} size="sm">
      <Stage block={block} />
      {Explain && <Explain block={block} />}
    </Modal>
  );
}
