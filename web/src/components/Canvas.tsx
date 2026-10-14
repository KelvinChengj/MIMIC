import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { BLOCK_H, BLOCK_W, GRID, snap, type BlockResult } from '../lib/blocks';
import type { UserBlock } from '../types';
import { CopyIcon, EditIcon, TrashIcon } from './Icons';
import { LampTriple } from './Lamp';

interface BlockProps {
  block: UserBlock;
  result: BlockResult;
  edit: boolean;
  onOpen: () => void;
  onMove: (x: number, y: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

/** 畫布上的一顆燈號積木。編輯模式可拖曳（對齊 10px 格線）或用方向鍵微調 */
function BlockCard({ block, result, edit, onOpen, onMove, onDuplicate, onDelete }: BlockProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const drag = useRef<{ px: number; py: number; bx: number; by: number; moved: boolean; last: { x: number; y: number } } | null>(null);

  const x = pos?.x ?? block.x;
  const y = pos?.y ?? block.y;

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
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); return; }
    if (!edit) return;
    const step = e.shiftKey ? GRID * 5 : GRID;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (d) { e.preventDefault(); onMove(block.x + d[0], block.y + d[1]); }
  };

  return (
    <div
      className={`blk blk--${result.status} ${edit ? 'blk--edit' : ''} ${pos ? 'is-dragging' : ''}`}
      style={{ left: x, top: y, width: BLOCK_W, minHeight: BLOCK_H }}
      tabIndex={0}
      role="button"
      aria-label={`${block.title}：${result.label || '無資料'}。${edit ? '按 Enter 編輯，方向鍵移動' : '按 Enter 查看判斷過程'}`}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => { drag.current = null; setPos(null); }}
      onClick={edit ? undefined : onOpen}
      onKeyDown={key}
    >
      <div className="blk__title" title={block.title}>{block.title}</div>
      <LampTriple status={result.status} />
      <div className="blk__value">
        <b>{result.display || ' '}</b>
        {result.display && result.unit && <small>{result.unit}</small>}
      </div>
      <div className={`blk__status blk__status--${result.status}`}>{result.label}</div>

      {edit && (
        <div className="blk__actions" data-no-drag onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setConfirm(false)}>
          <button className="icon-btn icon-btn--plain" onClick={onOpen} aria-label={`編輯「${block.title}」`} title="編輯"><EditIcon size={15} /></button>
          <button className="icon-btn icon-btn--plain" onClick={onDuplicate} aria-label={`複製「${block.title}」`} title="複製"><CopyIcon size={15} /></button>
          <button
            className={`icon-btn icon-btn--plain ${confirm ? 'is-danger' : ''}`}
            onClick={() => (confirm ? onDelete() : setConfirm(true))}
            aria-label={confirm ? `確定刪除「${block.title}」` : `刪除「${block.title}」`}
            title={confirm ? '再按一次確定刪除' : '刪除'}
          >
            {confirm ? <span className="blk__sure">確定?</span> : <TrashIcon size={15} />}
          </button>
        </div>
      )}
    </div>
  );
}

interface CanvasProps {
  blocks: UserBlock[];
  results: Record<string, BlockResult>;
  edit: boolean;
  empty: ReactNode;
  onOpen: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export function Canvas({ blocks, results, edit, empty, onOpen, onMove, onDuplicate, onDelete }: CanvasProps) {
  const w = Math.max(0, ...blocks.map((b) => b.x + BLOCK_W)) + 120;
  const h = Math.max(0, ...blocks.map((b) => b.y + BLOCK_H)) + 140;
  return (
    <div className={`canvas ${edit ? 'canvas--edit' : ''}`} aria-label={edit ? '畫布（編輯中）' : '畫布'}>
      <div className="canvas__inner" style={{ minWidth: w, minHeight: Math.max(h, 440) }}>
        {blocks.map((b) => (
          <BlockCard
            key={b.id}
            block={b}
            result={results[b.id]}
            edit={edit}
            onOpen={() => onOpen(b.id)}
            onMove={(x, y) => onMove(b.id, x, y)}
            onDuplicate={() => onDuplicate(b.id)}
            onDelete={() => onDelete(b.id)}
          />
        ))}
        {blocks.length === 0 && <div className="canvas__empty">{empty}</div>}
      </div>
    </div>
  );
}
