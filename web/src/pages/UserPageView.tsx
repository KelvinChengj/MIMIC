import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BlockDetail, BlockDialog } from '../components/BlockDialog';
import { BlockLibrary } from '../components/BlockLibrary';
import { Canvas } from '../components/Canvas';
import { PlusIcon } from '../components/Icons';
import { Legend } from '../components/Lamp';
import { BackButton, FullscreenButton, PageHeader } from '../components/PageParts';
import type { BlockHost } from '../blocks/types';
import { useFavorites } from '../state/FavoritesContext';
import { useUi } from '../state/UiContext';
import { useUserPages } from '../state/UserPagesContext';
import type { UserPage } from '../types';

/** 自建頁面積木裡的下鑽連結，掛在涵蓋所有廠區與系統的「全廠總覽」底下 */
const HOST: BlockHost = { drillBase: 'overview' };

/** 自建頁面：檢視 /p/:slug；編輯 /p/:slug/edit（左側積木庫 + 畫布） */
export function UserPageView({ page, edit }: { page: UserPage; edit: boolean }) {
  const { addBlock, updateBlock, moveBlock, removeBlock, duplicateBlock, renamePage, deletePage } = useUserPages();
  const { removeSlug } = useFavorites();
  const { showToast } = useUi();
  const navigate = useNavigate();
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const open = page.blocks.find((b) => b.id === openId);
  const add = (type: string) => setOpenId(addBlock(page.slug, type));
  const remove = () => {
    if (!confirmDelete) return setConfirmDelete(true);
    deletePage(page.slug);
    removeSlug(page.slug);
    showToast(`已刪除頁面「${page.title}」`);
    navigate('/');
  };

  const canvas = (
    <Canvas
      blocks={page.blocks}
      edit={edit}
      host={HOST}
      onOpen={setOpenId}
      onMove={(id, x, y) => moveBlock(page.slug, id, x, y)}
      onResize={(id, size) => updateBlock(page.slug, id, { size })}
      onDuplicate={(id) => duplicateBlock(page.slug, id)}
      onDelete={(id) => removeBlock(page.slug, id)}
      empty={
        edit ? (
          <>
            <h2>這是一張空白畫布</h2>
            <p>從左邊的積木庫挑積木。燈號積木可以選 Tag，用加減乘除和 and / or 寫出紅、黃燈條件，再依 FDM 數值亮燈。</p>
            <button className="btn btn--primary btn--lg" onClick={() => add('lamp')}><PlusIcon size={18} /> 新增第一個燈號積木</button>
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

  return (
    <>
      {edit ? (
        <PageHeader
          title={
            <>
              <input
                className="title-input" aria-label="頁面名稱" value={page.title} maxLength={40}
                style={{ width: `${Math.max(6, [...page.title].reduce((w, c) => w + (c.charCodeAt(0) > 255 ? 1.05 : 0.62), 1.6))}em` }}
                onChange={(e) => renamePage(page.slug, e.target.value)}
                onBlur={(e) => !e.target.value.trim() && renamePage(page.slug, '未命名頁面')}
              />
              <span className="mode-pill">編輯模式</span>
            </>
          }
          sub="從積木庫加入積木，拖曳擺放；滑過積木可切換小、中、大，點積木編輯內容。變更自動儲存"
          actions={
            <>
              <button className={`btn ${confirmDelete ? 'btn--danger' : ''}`} onClick={remove} onBlur={() => setConfirmDelete(false)}>
                {confirmDelete ? '確定刪除整個頁面？' : '刪除頁面'}
              </button>
              <Link className="btn btn--primary" to={`/p/${page.slug}`}>完成</Link>
            </>
          }
        />
      ) : (
        <PageHeader
          title={page.title}
          sub={`自訂頁面 · ${page.blocks.length} 個積木`}
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
          <BlockLibrary onAdd={add} />
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
