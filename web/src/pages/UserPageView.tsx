import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BlockDetail, BlockDialog } from '../components/BlockEditor';
import { Canvas } from '../components/Canvas';
import { PlusIcon } from '../components/Icons';
import { Legend } from '../components/Lamp';
import { BackButton, FullscreenButton, PageHeader } from '../components/PageParts';
import { useBlockEvaluator } from '../state/derived';
import { useFavorites } from '../state/FavoritesContext';
import { useUi } from '../state/UiContext';
import { useUserPages } from '../state/UserPagesContext';
import type { UserPage } from '../types';

/** 自建頁面：檢視模式 /p/:slug，編輯模式 /p/:slug/edit（空白畫布，可新增燈號積木） */
export function UserPageView({ page, edit }: { page: UserPage; edit: boolean }) {
  const { addBlock, updateBlock, moveBlock, removeBlock, duplicateBlock, renamePage, deletePage } = useUserPages();
  const { removeSlug } = useFavorites();
  const { showToast } = useUi();
  const navigate = useNavigate();
  const evalBlock = useBlockEvaluator();
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const results = useMemo(() => Object.fromEntries(page.blocks.map((b) => [b.id, evalBlock(b)])), [page.blocks, evalBlock]);
  const open = page.blocks.find((b) => b.id === openId);

  const add = () => setOpenId(addBlock(page.slug));
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
      results={results}
      edit={edit}
      onOpen={setOpenId}
      onMove={(id, x, y) => moveBlock(page.slug, id, x, y)}
      onDuplicate={(id) => duplicateBlock(page.slug, id)}
      onDelete={(id) => removeBlock(page.slug, id)}
      empty={
        edit ? (
          <>
            <h2>這是一張空白畫布</h2>
            <p>新增燈號積木，選好資料點（Tag），用加減乘除和 and / or 寫出紅、黃燈條件，積木就會依 FDM 數值亮燈。</p>
            <button className="btn btn--primary btn--lg" onClick={add}><PlusIcon size={18} /> 新增第一個燈號積木</button>
          </>
        ) : (
          <>
            <h2>這個頁面還沒有燈號積木</h2>
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
          sub="拖曳積木調整位置，點積木編輯資料點與條件；變更自動儲存"
          actions={
            <>
              <button className={`btn ${confirmDelete ? 'btn--danger' : ''}`} onClick={remove} onBlur={() => setConfirmDelete(false)}>
                {confirmDelete ? '確定刪除整個頁面？' : '刪除頁面'}
              </button>
              <button className="btn btn--primary" onClick={add}><PlusIcon size={16} /> 燈號積木</button>
              <Link className="btn" to={`/p/${page.slug}`}>完成</Link>
            </>
          }
        />
      ) : (
        <PageHeader
          title={page.title}
          sub={`自訂燈號頁面 · ${page.blocks.length} 個積木 · 點積木可看判斷過程`}
          actions={
            <>
              <BackButton />
              <FullscreenButton />
              <Link className="btn btn--primary" to={`/p/${page.slug}/edit`}>Edit</Link>
            </>
          }
        />
      )}

      {canvas}
      <Legend />

      {open && edit && (
        <BlockDialog block={open} onChange={(patch) => updateBlock(page.slug, open.id, patch)} onClose={() => setOpenId(null)} />
      )}
      {open && !edit && <BlockDetail block={open} result={results[open.id]} onClose={() => setOpenId(null)} />}
    </>
  );
}
