import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { allLayoutPages } from '../blocks/builtin';
import { getBlockDef } from '../blocks/registry';
import { PHASE_OPTIONS, SYSTEM_OPTIONS } from '../catalog/catalog';
import { layerOf } from '../lib/pages';
import { LIMITS, parsePageJson, SAMPLE_PAGE_JSON, stringifyPage } from '../lib/pageJson';
import { useFavorites } from '../state/FavoritesContext';
import { useUi } from '../state/UiContext';
import { useUserPages } from '../state/UserPagesContext';
import { LAYER_META } from './LayerChip';
import { Modal } from './Modal';

const NEW_GROUP = '__new__';
const MAX_SHOWN = 8;

function Issues({ kind, items }: { kind: 'error' | 'warn'; items: string[] }) {
  return (
    <ul className={`json-issues json-issues--${kind}`}>
      {items.slice(0, MAX_SHOWN).map((m, i) => <li key={i}>{m}</li>)}
      {items.length > MAX_SHOWN && <li>…還有 {items.length - MAX_SHOWN} 個</li>}
    </ul>
  );
}

/**
 * 從 JSON 匯入頁面：貼上或選檔，立即檢查；通過才可以建立成新頁面（不會覆蓋既有頁面）。
 */
export function ImportPageDialog() {
  const { importPage, closeImport, showToast } = useUi();
  const { groups, addGroup, addSlug } = useFavorites();
  const { pages, createCopy } = useUserPages();
  const navigate = useNavigate();
  const file = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState('');

  const layers = useMemo(() => new Map(allLayoutPages(pages).map((p) => [p.slug, layerOf(p)])), [pages]);
  const result = useMemo(() => (text.trim() ? parsePageJson(text, { layerOfPage: (slug) => layers.get(slug) }) : null), [text, layers]);
  const parsed = result?.ok ? result.page : null;

  // 名稱、System、Phase 預設用 JSON 裡的值，可以在這裡改
  const [title, setTitle] = useState<string | null>(null);
  const [system, setSystem] = useState<string | null>(null);
  const [phase, setPhase] = useState<string | null>(null);
  const shownTitle = title ?? parsed?.title ?? '';
  const shownSystem = system ?? parsed?.system ?? '';
  const shownPhase = phase ?? parsed?.phase ?? '';
  const [groupId, setGroupId] = useState(importPage?.groupId ?? groups[0]?.id ?? NEW_GROUP);
  const [groupName, setGroupName] = useState('');
  const ready = !!parsed && !!shownTitle.trim() && !!shownSystem && !!shownPhase;

  const load = (value: string, name = '', error = '') => {
    setText(value);
    setFileName(name);
    setFileError(error);
    setTitle(null);
    setSystem(null);
    setPhase(null);
  };
  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > LIMITS.textLength) return load('', f.name, `檔案 ${(f.size / 1024 / 1024).toFixed(1)} MB，上限 3 MB`);
    const reader = new FileReader();
    reader.onload = () => load(String(reader.result), f.name);
    reader.onerror = () => load('', f.name, '讀取檔案失敗');
    reader.readAsText(f);
  };

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    parsed?.blocks.forEach((b) => m.set(b.type, (m.get(b.type) ?? 0) + 1));
    return [...m].map(([type, n]) => `${n} ${getBlockDef(type)?.label ?? type}`).join('、');
  }, [parsed]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!ready || !parsed) return;
    const slug = createCopy({ ...parsed, title: shownTitle.trim(), system: shownSystem, phase: shownPhase });
    const gid = groupId === NEW_GROUP || !groups.some((g) => g.id === groupId) ? addGroup(groupName || '我的頁面') : groupId;
    addSlug(gid, slug);
    closeImport();
    showToast(`已匯入「${shownTitle.trim()}」：${parsed.blocks.length} 個積木`);
    navigate(`/p/${slug}/edit`);
  };

  // 內嵌圖檔很長：輸入框只顯示開頭，實際檢查與匯入用完整內容
  const long = text.length > 200_000;

  return (
    <Modal title="從 JSON 匯入頁面" size="md" onClose={closeImport}>
      <form className="newpage" onSubmit={submit}>
        <p className="newpage__hint">
          貼上頁面 JSON 或選擇 .json 檔，檢查通過後建立成<b>新頁面</b>（不會覆蓋既有頁面）。JSON 可以從任何頁面右上角的「Export」取得。
        </p>
        <div className="json-tools">
          <input ref={file} type="file" accept=".json,application/json,text/plain" hidden aria-label="選擇 JSON 檔" onChange={pick} />
          <button type="button" className="btn btn--xs" onClick={() => file.current?.click()}>選擇檔案</button>
          <button type="button" className="btn btn--xs" onClick={() => load(stringifyPage(SAMPLE_PAGE_JSON), '')}>載入範例</button>
          {text && <button type="button" className="btn btn--xs" onClick={() => load('')}>清除</button>}
          {fileName && <span className="json-tools__file">{fileName}</span>}
        </div>
        {long ? (
          <p className="json-long">內容較長（{(text.length / 1024 / 1024).toFixed(1)} MB，可能含底圖圖檔），不在這裡顯示全文。</p>
        ) : (
          <textarea
            className="ef__input ef__input--plain ef__textarea json-area" aria-label="頁面 JSON" rows={9} spellCheck={false}
            placeholder={'{\n  "format": "mimic.page",\n  "version": 1,\n  "page": { "title": "…", "layer": "duty", "blocks": [ … ] }\n}'}
            value={text} onChange={(e) => load(e.target.value, '')}
          />
        )}

        {fileError && <div className="json-result json-result--error" role="alert"><b>不能匯入：{fileError}</b></div>}
        {result && !result.ok && (
          <div className="json-result json-result--error" role="alert">
            <b>不能匯入：{result.errors.length} 個問題</b>
            <Issues kind="error" items={result.errors} />
          </div>
        )}
        {result?.ok && parsed && (
          <div className="json-result json-result--ok" role="status">
            <b>檢查通過</b>
            <p>
              {LAYER_META[parsed.layer].label} · {parsed.blocks.length} 個積木{counts && `（${counts}）`}
              {parsed.background && ` · 底圖：${parsed.background.name ?? '內嵌圖檔'}`}
            </p>
            {result.warnings.length > 0 && (
              <>
                <b className="json-result__warn">{result.warnings.length} 個提醒（仍可匯入）</b>
                <Issues kind="warn" items={result.warnings} />
              </>
            )}
          </div>
        )}

        {parsed && (
          <>
            <div className="ef">
              <label htmlFor="ip-title">頁面名稱</label>
              <input id="ip-title" className="ef__input ef__input--plain" value={shownTitle} maxLength={40} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="be__pair">
              <div className="ef">
                <label htmlFor="ip-system">System <small className="req">必填</small></label>
                <select id="ip-system" className="ef__input ef__input--plain" required value={shownSystem} onChange={(e) => setSystem(e.target.value)}>
                  <option value="" disabled>請選擇系統</option>
                  {SYSTEM_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="ef">
                <label htmlFor="ip-phase">Phase <small className="req">必填</small></label>
                <select id="ip-phase" className="ef__input ef__input--plain" required value={shownPhase} onChange={(e) => setPhase(e.target.value)}>
                  <option value="" disabled>請選擇廠區</option>
                  {PHASE_OPTIONS.map((s) => <option key={s} value={s}>{s === 'F18A' ? 'F18A（全廠）' : s}</option>)}
                </select>
              </div>
            </div>
            <div className="ef">
              <label htmlFor="ip-group">放在哪個分類</label>
              <select id="ip-group" className="ef__input ef__input--plain" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                <option value={NEW_GROUP}>＋ 新分類…</option>
              </select>
            </div>
            {(groupId === NEW_GROUP || groups.length === 0) && (
              <div className="ef">
                <label htmlFor="ip-gname">新分類名稱</label>
                <input id="ip-gname" className="ef__input ef__input--plain" value={groupName} maxLength={20} placeholder="例：我的頁面" onChange={(e) => setGroupName(e.target.value)} />
              </div>
            )}
          </>
        )}
        <div className="newpage__actions">
          <button type="button" className="btn" onClick={closeImport}>取消</button>
          <button type="submit" className="btn btn--primary" disabled={!ready} title={ready ? undefined : parsed ? '請填頁面名稱並選擇 System 與 Phase' : '請先貼上通過檢查的 JSON'}>匯入並建立頁面</button>
        </div>
      </form>
    </Modal>
  );
}
