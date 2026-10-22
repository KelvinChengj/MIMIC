import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { pageHost } from '../blocks/host';
import { BlockDetail, BlockDialog } from '../components/BlockDialog';
import { BlockLibrary } from '../components/BlockLibrary';
import { Canvas } from '../components/Canvas';
import { PlusIcon } from '../components/Icons';
import { Legend } from '../components/Lamp';
import { BackButton, FullscreenButton, PageHeader } from '../components/PageParts';
import { useFavorites } from '../state/FavoritesContext';
import { useUi } from '../state/UiContext';
import { useUserPages } from '../state/UserPagesContext';
import { PHASE_OPTIONS, SYSTEM_OPTIONS } from '../catalog/catalog';
import { layerOf } from '../lib/pages';
import type { UserPage } from '../types';
import { LAYER_META, LayerChip } from '../components/LayerChip';

/**
 * 積木畫布頁面：檢視 /p/:slug；編輯 /p/:slug/edit（左側積木庫 + 畫布）。
 * 自建頁面與內建燈號牆頁面（page.builtin）共用；內建頁面不能改名或刪除（要回到預設請用「重置展示資料」）。
 */
export function UserPageView({ page, edit }: { page: UserPage; edit: boolean }) {
  const { addBlock, updateBlock, moveBlock, removeBlock, duplicateBlock, renamePage, deletePage, setPageMeta } = useUserPages();
  const { removeSlug } = useFavorites();
  const { showToast } = useUi();
  const navigate = useNavigate();
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const host = useMemo(() => pageHost(page.slug), [page.slug]);
  const layer = layerOf(page);
  const meta = LAYER_META[layer];

  const open = page.blocks.find((b) => b.id === openId);
  const add = (type: string) => setOpenId(addBlock(page.slug, type));
  const remove = () => {
    if (!confirm) return setConfirm(true);
    deletePage(page.slug);
    removeSlug(page.slug);
    showToast(`已刪除頁面「${page.title}」`);
    navigate('/');
  };

  const canvas = (
    <Canvas
      blocks={page.blocks}
      edit={edit}
      host={host}
      onOpen={setOpenId}
      onMove={(id, x, y) => moveBlock(page.slug, id, x, y)}
      onResize={(id, size) => updateBlock(page.slug, id, { size })}
      onDuplicate={(id) => duplicateBlock(page.slug, id)}
      onDelete={(id) => removeBlock(page.slug, id)}
      empty={
        edit ? (
          <>
            <h2>這是一張空白的{meta.label}畫布</h2>
            <p>從左邊的積木庫挑積木。{meta.hint}。</p>
            <button className="btn btn--primary btn--lg" onClick={() => add(meta.first)}><PlusIcon size={18} /> {meta.firstLabel}</button>
          </>
        ) : (
          <>
            <h2>這個頁面還沒有積木</h2>
            <p>按右上角 Edit 進入編輯模式，開始新增。</p>
            <Link className="btn btn--primary" to={`/p/${page.slug}/edit`}>Edit</Link>
          </>
        )
      }
    />
  );

  // 內建頁面不能刪除；自建頁面才有「刪除頁面」
  const dangerBtn = page.builtin ? null : (
    <button className={`btn ${confirm ? 'btn--danger' : ''}`} onClick={remove} onBlur={() => setConfirm(false)}>
      {confirm ? '確定刪除整個頁面？' : '刪除頁面'}
    </button>
  );

  return (
    <>
      {edit ? (
        <PageHeader
          title={
            <>
              {page.builtin ? (
                <span>{page.title}</span>
              ) : (
                <input
                  className="title-input" aria-label="頁面名稱" value={page.title} maxLength={40}
                  style={{ width: `${Math.max(6, [...page.title].reduce((w, c) => w + (c.charCodeAt(0) > 255 ? 1.05 : 0.62), 1.6))}em` }}
                  onChange={(e) => renamePage(page.slug, e.target.value)}
                  onBlur={(e) => !e.target.value.trim() && renamePage(page.slug, '未命名頁面')}
                />
              )}
              <LayerChip layer={layer} />
              {!page.builtin && (
                <span className="page-meta-edit">
                  <select aria-label="System" value={page.system ?? ''} onChange={(e) => setPageMeta(page.slug, { system: e.target.value })}>
                    <option value="" disabled>System</option>
                    {SYSTEM_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select aria-label="Phase" value={page.phase ?? ''} onChange={(e) => setPageMeta(page.slug, { phase: e.target.value })}>
                    <option value="" disabled>Phase</option>
                    {PHASE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </span>
              )}
              <span className="mode-pill">編輯模式</span>
            </>
          }
          sub={`${meta.label}：${meta.hint}。從積木庫加入積木，拖曳擺放；點一下選取後可切換小、中、大，點兩下編輯。變更自動儲存`}
          actions={
            <>
              {dangerBtn}
              <Link className="btn btn--primary" to={`/p/${page.slug}`}>完成</Link>
            </>
          }
        />
      ) : (
        <PageHeader
          title={<>{page.title} <LayerChip layer={layer} /></>}
          sub={<>{(page.system || page.phase) && <span className="page-meta">{[page.system, page.phase].filter(Boolean).join(' · ')}</span>}{meta.hint}</>}
          actions={
            <>
              <BackButton />
              <FullscreenButton />
              <Link className="btn btn--primary" to={`/p/${page.slug}/edit`}>Edit</Link>
            </>
          }
        />
      )}

      {edit ? (
        <div className="editor-layout">
          <BlockLibrary layer={layer} onAdd={add} />
          <div className="editor-layout__canvas">{canvas}</div>
        </div>
      ) : (
        canvas
      )}
      <Legend />

      {open && edit && (
        <BlockDialog block={open} onChange={(patch) => updateBlock(page.slug, open.id, patch)} onClose={() => setOpenId(null)} />
      )}
      {open && !edit && <BlockDetail block={open} onClose={() => setOpenId(null)} />}
    </>
  );
}
