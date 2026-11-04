import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { backgroundUrl } from '../blocks/backgrounds';
import { BlockRender } from '../blocks/BlockView';
import { GRID, SIZE_LABEL, canvasExtent, snap } from '../blocks/layout';
import { footprintOf, getBlockDef } from '../blocks/registry';
import type { BlockHost } from '../blocks/types';
import type { BlockSize, PageBackground, PageBlock } from '../types';
import { CopyIcon, EditIcon, TrashIcon } from './Icons';
import { SizeSwitch } from './SizeSwitch';

interface FrameProps {
  block: PageBlock;
  host: BlockHost;
  edit: boolean;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (size: BlockSize) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  /** 地圖模式的縮放倍率：拖曳距離要換算回底圖座標 */
  scale: number;
}

/**
 * 畫布上的積木外框：負責位置、選取、拖曳、尺寸切換與工具列；
 * 內容一律交給積木自己的 Render，所以任何積木種類都能放上畫布。
 *
 * 編輯模式：點一下選取（工具列固定顯示在積木下方）、拖曳移動、
 * 雙擊 / Enter / 工具列「編輯」開啟編輯器、方向鍵微調位置。
 */
function BlockFrame({ block, host, edit, selected, onSelect, onOpen, onMove, onResize, onDuplicate, onDelete, scale }: FrameProps) {
  const def = getBlockDef(block.type);
  const fp = footprintOf(block);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const drag = useRef<{ px: number; py: number; bx: number; by: number; moved: boolean; last: { x: number; y: number } } | null>(null);

  useEffect(() => { if (!selected) setConfirm(false); }, [selected]);

  const x = pos?.x ?? block.x;
  const y = pos?.y ?? block.y;
  // 檢視頁：只有有「判斷過程」的積木（燈號）點了會開啟說明；其他積木自己處理點擊
  const explainable = !!def?.Explain && (def.explainable?.(block) ?? true);
  const clickable = edit || explainable;
  const name = `${block.title || def?.label || '積木'}（${def?.label ?? '未知'}・${SIZE_LABEL[block.size]}）`;

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (!edit || e.button !== 0 || (e.target as HTMLElement).closest('[data-no-drag]')) return;
    onSelect();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, bx: block.x, by: block.y, moved: false, last: { x: block.x, y: block.y } };
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.px) / scale;
    const dy = (e.clientY - d.py) / scale;
    if (!d.moved && Math.abs(dx * scale) + Math.abs(dy * scale) < 5) return;
    d.moved = true;
    d.last = { x: snap(d.bx + dx), y: snap(d.by + dy) };
    setPos(d.last);
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (d?.moved) onMove(d.last.x, d.last.y);
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
      className={`cb ${edit ? 'cb--edit' : ''} ${selected ? 'is-selected' : ''} ${pos ? 'is-dragging' : ''}`}
      style={{ left: x, top: y, width: fp.w, height: def?.fixedHeight ? fp.h : undefined }}
      data-type={block.type}
      data-size={block.size}
      tabIndex={clickable ? 0 : undefined}
      role={clickable ? 'button' : undefined}
      aria-label={clickable ? `${name}。${edit ? '按 Enter 編輯，方向鍵移動' : '按 Enter 查看判斷過程'}` : undefined}
      aria-pressed={edit ? selected : undefined}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => { drag.current = null; setPos(null); }}
      onFocus={edit ? onSelect : undefined}
      onDoubleClick={edit ? onOpen : undefined}
      onClick={edit || !explainable ? undefined : onOpen}
      onKeyDown={key}
    >
      <div className="cb__body"><BlockRender block={block} mode="canvas" host={host} /></div>

      {edit && (
        <>
          <span className="cb__size" aria-hidden="true">{SIZE_LABEL[block.size]}</span>
          {/* 工具列和積木之間有一條透明的「橋」(::before)，滑鼠從積木移到工具列不會因為經過空隙而中斷 */}
          <div className="cb__tools" data-no-drag role="toolbar" aria-label={`${name}的工具列`} onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setConfirm(false)}>
            <span className="cb__tools-label">尺寸</span>
            <SizeSwitch compact value={block.size} onChange={onResize} />
            <span className="cb__tools-sep" aria-hidden="true" />
            <button className="btn btn--xs" onClick={onOpen} aria-label={`編輯${name}`}><EditIcon size={13} /> 編輯</button>
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
  /** 有底圖時是地圖模式：畫布大小等於底圖，圖和積木一起縮放到畫面寬度 */
  background?: PageBackground;
}

/** 地圖模式的縮放範圍：太小看不清、太大浪費畫面 */
const MIN_SCALE = 0.3;
const MAX_SCALE = 1.6;

export function Canvas({ blocks, edit, host, empty, onOpen, onMove, onResize, onDuplicate, onDelete, background }: CanvasProps) {
  const ext = canvasExtent(blocks, footprintOf);
  const [selected, setSelected] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const [avail, setAvail] = useState(0);

  // 地圖模式：量畫布可用寬度，算出縮放倍率（視窗、側欄、全螢幕改變時重算）
  useLayoutEffect(() => {
    const el = box.current;
    if (!background || !el) return;
    const measure = () => setAvail(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [background]);
  const stage = background && { w: Math.max(background.width, ext.w), h: Math.max(background.height, ext.h) };
  const scale = stage && avail ? Math.min(MAX_SCALE, Math.max(MIN_SCALE, (avail - 2) / stage.w)) : 1;

  // 選取中：按 Esc，或點到積木 / 對話框以外的任何地方，就取消選取
  useEffect(() => {
    if (!selected) return;
    const esc = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && !document.querySelector('[role="dialog"]') && setSelected(null);
    const away = (e: PointerEvent | MouseEvent) => !(e.target as HTMLElement).closest('.cb, .modal-back') && setSelected(null);
    document.addEventListener('keydown', esc);
    document.addEventListener('pointerdown', away);
    return () => {
      document.removeEventListener('keydown', esc);
      document.removeEventListener('pointerdown', away);
    };
  }, [selected]);

  const frames = blocks.map((b) => (
    <BlockFrame
      key={b.id}
      block={b}
      host={host}
      edit={edit}
      selected={edit && selected === b.id}
      onSelect={() => setSelected(b.id)}
      onOpen={() => onOpen(b.id)}
      onMove={(x, y) => onMove(b.id, x, y)}
      onResize={(s) => onResize(b.id, s)}
      onDuplicate={() => onDuplicate(b.id)}
      onDelete={() => { setSelected(null); onDelete(b.id); }}
      scale={scale}
    />
  ));

  if (stage && background) {
    return (
      <div ref={box} className={`canvas canvas--map ${edit ? 'canvas--edit' : ''}`} aria-label={edit ? '地圖畫布（編輯中）' : '地圖畫布'}>
        <div className="canvas__fit" style={{ width: stage.w * scale, height: stage.h * scale }}>
          <div className="canvas__inner canvas__inner--map" style={{ width: stage.w, height: stage.h, transform: `scale(${scale})` }}>
            <img
              className="canvas__bg" src={backgroundUrl(background.src)} alt={background.name ?? '底圖'}
              width={background.width} height={background.height} draggable={false}
              style={{ opacity: background.opacity ?? 1 }}
            />
            {frames}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`canvas ${edit ? 'canvas--edit' : ''}`} aria-label={edit ? '畫布（編輯中）' : '畫布'}>
      <div
        className="canvas__inner"
        style={edit || blocks.length === 0
          ? { minWidth: ext.w + 120, minHeight: Math.max(ext.h + 160, 440) }
          : { minWidth: ext.w + 24, minHeight: ext.h + 24 }}
      >
        {frames}
        {blocks.length === 0 && <div className="canvas__empty">{empty}</div>}
      </div>
    </div>
  );
}
