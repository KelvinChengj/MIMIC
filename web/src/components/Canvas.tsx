import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { BlockRender } from '../blocks/BlockView';
import { GRID, SIZE_LABEL, canvasExtent, snap } from '../blocks/layout';
import { footprintOf, getBlockDef } from '../blocks/registry';
import type { BlockHost } from '../blocks/types';
import type { BlockSize, PageBlock } from '../types';
import { CopyIcon, EditIcon, TrashIcon } from './Icons';
import { SizeSwitch } from './SizeSwitch';

interface FrameProps {
  block: PageBlock;
  host: BlockHost;
  edit: boolean;
  onOpen: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (size: BlockSize) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

/**
 * 畫布上的積木外框：負責位置、拖曳、尺寸切換與工具列；
 * 內容一律交給積木自己的 Render，所以任何積木種類都能放上畫布。
 */
function BlockFrame({ block, host, edit, onOpen, onMove, onResize, onDuplicate, onDelete }: FrameProps) {
  const def = getBlockDef(block.type);
  const fp = footprintOf(block);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const drag = useRef<{ px: number; py: number; bx: number; by: number; moved: boolean; last: { x: number; y: number } } | null>(null);

  const x = pos?.x ?? block.x;
  const y = pos?.y ?? block.y;
  // 檢視頁：只有有「判斷過程」的積木（燈號）點了會開啟說明；其他積木自己處理點擊（例如燈號牆下鑽）
  const clickable = edit || !!def?.Explain;
  const name = `${block.title || def?.label || '積木'}（${def?.label ?? '未知'}・${SIZE_LABEL[block.size]}）`;

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (!edit || e.button !== 0 || (e.target as HTMLElement).closest('[data-no-drag]')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, bx: block.x, by: block.y, moved: false, last: { x: block.x, y: block.y } };
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < 5) return;
    d.moved = true;
    d.last = { x: snap(d.bx + dx), y: snap(d.by + dy) };
    setPos(d.last);
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.moved) onMove(d.last.x, d.last.y);
    else onOpen();
    setPos(null);
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || !clickable) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); return; }
    if (!edit) return;
    const step = e.shiftKey ? GRID * 5 : GRID;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (d) { e.preventDefault(); onMove(block.x + d[0], block.y + d[1]); }
  };

  return (
    <div
      className={`cb ${edit ? 'cb--edit' : ''} ${pos ? 'is-dragging' : ''}`}
      style={{ left: x, top: y, width: fp.w, height: def?.fixedHeight ? fp.h : undefined }}
      data-type={block.type}
      data-size={block.size}
      tabIndex={clickable ? 0 : undefined}
      role={clickable ? 'button' : undefined}
      aria-label={clickable ? `${name}。${edit ? '按 Enter 編輯，方向鍵移動' : '按 Enter 查看判斷過程'}` : undefined}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => { drag.current = null; setPos(null); }}
      onClick={edit || !def?.Explain ? undefined : onOpen}
      onKeyDown={key}
    >
      <div className="cb__body"><BlockRender block={block} mode="canvas" host={host} /></div>

      {edit && (
        <>
          <span className="cb__size" aria-hidden="true">{SIZE_LABEL[block.size]}</span>
          <div className="cb__tools" data-no-drag onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setConfirm(false)}>
            <SizeSwitch compact value={block.size} onChange={onResize} />
            <button className="icon-btn icon-btn--xs" onClick={onOpen} aria-label={`編輯${name}`} title="編輯"><EditIcon size={14} /></button>
            <button className="icon-btn icon-btn--xs" onClick={onDuplicate} aria-label={`複製${name}`} title="複製"><CopyIcon size={14} /></button>
            <button
              className={`icon-btn icon-btn--xs ${confirm ? 'is-danger' : ''}`}
              onClick={() => (confirm ? onDelete() : setConfirm(true))}
              aria-label={confirm ? `確定刪除${name}` : `刪除${name}`}
              title={confirm ? '再按一次確定刪除' : '刪除'}
            >
              {confirm ? <span className="cb__sure">確定?</span> : <TrashIcon size={14} />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

interface CanvasProps {
  blocks: PageBlock[];
  edit: boolean;
  host: BlockHost;
  empty: ReactNode;
  onOpen: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, size: BlockSize) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export function Canvas({ blocks, edit, host, empty, onOpen, onMove, onResize, onDuplicate, onDelete }: CanvasProps) {
  const ext = canvasExtent(blocks, footprintOf);
  return (
    <div className={`canvas ${edit ? 'canvas--edit' : ''}`} aria-label={edit ? '畫布（編輯中）' : '畫布'}>
      <div className="canvas__inner" style={{ minWidth: ext.w + 120, minHeight: Math.max(ext.h + 140, 440) }}>
        {blocks.map((b) => (
          <BlockFrame
            key={b.id}
            block={b}
            host={host}
            edit={edit}
            onOpen={() => onOpen(b.id)}
            onMove={(x, y) => onMove(b.id, x, y)}
            onResize={(s) => onResize(b.id, s)}
            onDuplicate={() => onDuplicate(b.id)}
            onDelete={() => onDelete(b.id)}
          />
        ))}
        {blocks.length === 0 && <div className="canvas__empty">{empty}</div>}
      </div>
    </div>
  );
}
