import { useMemo, useRef, useState } from 'react';
import { saveTextFile } from '../lib/download';
import { layerOf } from '../lib/pages';
import { exportPage, stringifyPage } from '../lib/pageJson';
import { pageMetaOf } from '../state/derived';
import { useUi } from '../state/UiContext';
import type { UserPage } from '../types';
import { Modal } from './Modal';

const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/**
 * 匯出頁面 JSON：複製或下載，之後可以用「匯入 JSON」建立成新頁面（修改後再匯入、交給同事、請 AI 依格式產生）。
 */
export function ExportPageDialog({ page, onClose }: { page: UserPage; onClose: () => void }) {
  const { showToast } = useUi();
  const area = useRef<HTMLTextAreaElement>(null);
  const uploaded = !!page.background && !page.background.src.startsWith('builtin:');
  const [withImage, setWithImage] = useState(true);

  const text = useMemo(() => {
    const meta = pageMetaOf(page);
    return stringifyPage(exportPage(page, { layer: layerOf(page), system: page.system ?? meta.system, phase: page.phase ?? meta.phase }, withImage));
  }, [page, withImage]);
  // 內嵌圖檔很長：畫面上只顯示開頭，複製與下載仍是完整內容
  const shown = useMemo(
    () => (uploaded && withImage ? text.replace(/("src": "data:image\/[^"]{0,60})[^"]*"/, '$1…（圖檔內容已省略顯示，複製與下載會包含完整圖檔）"') : text),
    [text, uploaded, withImage],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('已複製 JSON');
    } catch {
      // 瀏覽器不允許自動複製（例如內嵌頁面）：選取全文讓使用者自己按複製
      area.current?.focus();
      area.current?.select();
      showToast(uploaded && withImage ? '無法自動複製，請改用下載' : '無法自動複製，已選取全文，請按 Ctrl/⌘ + C');
    }
  };
  const [saving, setSaving] = useState(false);
  const download = async () => {
    setSaving(true);
    const outcome = await saveTextFile(`mimic-${page.slug}.json`, text);
    setSaving(false);
    if (outcome === 'saved') showToast('已儲存 JSON 檔');
    else if (outcome === 'declined') showToast('已取消下載');
  };

  return (
    <Modal title="匯出 JSON" size="md" onClose={onClose}>
      <div className="newpage">
        <p className="newpage__hint">
          「{page.title}」的完整內容：層級、System／Phase、積木位置與綁定{page.background ? '、底圖' : ''}。用側欄的「匯入 JSON」可以建立成新頁面。
        </p>
        {uploaded && (
          <label className="copy-check">
            <input type="checkbox" checked={withImage} onChange={(e) => setWithImage(e.target.checked)} /> 包含底圖圖檔（{page.background!.name ?? '底圖'}）
          </label>
        )}
        <textarea ref={area} className="ef__input ef__input--plain ef__textarea json-area" aria-label="頁面 JSON" readOnly rows={16} value={shown} spellCheck={false} />
        <div className="json-foot">
          <span className="json-foot__stat">{page.blocks.length} 個積木 · {kb(new Blob([text]).size)}</span>
          <button type="button" className="btn" onClick={onClose}>關閉</button>
          <button type="button" className="btn" onClick={download} disabled={saving}>下載 .json</button>
          <button type="button" className="btn btn--primary" onClick={copy}>複製</button>
        </div>
      </div>
    </Modal>
  );
}
