import { Fragment, useLayoutEffect, useRef, useState } from 'react';
import { BlockRender } from '../blocks/BlockView';
import { footprintOf, getBlockDef } from '../blocks/registry';
import { OVERVIEW_HOST } from '../blocks/host';
import type { PageBlock } from '../types';
import { Modal } from './Modal';
import { SizeSwitch } from './SizeSwitch';

const HOST = OVERVIEW_HOST;

/** 預覽區：用實際尺寸畫出積木，改尺寸、改內容時即時變化 */
function Stage({ block }: { block: PageBlock }) {
  const def = getBlockDef(block.type);
  const fp = footprintOf(block);
  // 縮放比例依「最大尺寸」決定，小、中、大共用同一個比例，預覽上才看得出真正的 1 : 2 : 4
  const big = footprintOf({ ...block, size: 'L' });
  const ref = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  // 預覽太寬或太高時等比縮小，確保整顆積木看得到，也不會把下面的表單擠出畫面
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const narrow = window.matchMedia('(max-width: 960px)').matches;
      const maxH = Math.max(150, window.innerHeight * (narrow ? 0.38 : 0.5));
      setZoom(Math.min(1, Math.max(0.3, Math.min((el.clientWidth - 40) / big.w, (maxH - 36) / big.h))));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener('resize', fit);
    return () => { ro.disconnect(); window.removeEventListener('resize', fit); };
  }, [big.w, big.h]);
  return (
    <div className="be__stage" ref={ref} data-zoom={zoom.toFixed(2)}>
      <div style={{ zoom }}>
        <div className="cb cb--static" style={{ width: fp.w, height: def?.fixedHeight ? fp.h : undefined }}>
          <div className="cb__body"><BlockRender block={block} mode="canvas" host={HOST} /></div>
        </div>
      </div>
      {zoom < 1 && <p className="be__zoom">預覽縮小為 {Math.round(zoom * 100)}%（小、中、大用同一個比例）</p>}
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
  const Provider = def.EditorProvider ?? Fragment;
  return (
    <Provider>
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
          {!def.titleless && (
            <div className="ef">
              <label htmlFor="blk-title">積木名稱</label>
              <input id="blk-title" className="ef__input ef__input--plain" value={block.title} maxLength={40} onChange={(e) => onChange({ title: e.target.value })} />
            </div>
          )}
          <Editor block={block} onProps={(patch) => onChange({ props: { ...(block.props as object), ...patch } })} />
        </div>

        {/* 預覽與尺寸切換放在一起：點了尺寸，變化就在旁邊。窄畫面時這一塊固定在對話框頂端 */}
        <aside className="be__preview" aria-label="即時預覽">
          <div className="be__pin">
            <div className="be__pinhead">
              <h3>即時預覽 <small>實際大小 {fp.w} × {fp.h}</small></h3>
              <div className="be__sizerow"><span id="size-label">尺寸</span><SizeSwitch value={block.size} onChange={(size) => onChange({ size })} /></div>
            </div>
            <Stage block={block} />
          </div>
          {Explain && <div className="be__explain"><Explain block={block} /></div>}
        </aside>
      </div>
    </Modal>
    </Provider>
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
