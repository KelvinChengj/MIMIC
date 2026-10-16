import { useMemo, useState } from 'react';
import { SITES } from '../../catalog/catalog';
import { ALL_TAGS, tagKey, type TagInfo } from '../../lib/blocks';
import type { Status, TagRef } from '../../types';

/** FDM 判定標籤：OOS / OOC / 正常 / 無資料 / 無效 */
export function FdmChip({ valid, status }: { valid: boolean; status: Status }) {
  if (!valid) return <span className="fdm fdm--invalid">無效</span>;
  const map: Record<Status, [string, string]> = {
    red: ['OOS', 'fdm--red'],
    yellow: ['OOC', 'fdm--yellow'],
    green: ['正常', 'fdm--green'],
    gray: ['無資料', 'fdm--gray'],
  };
  const [text, cls] = map[status];
  return <span className={`fdm ${cls}`}>{text}</span>;
}

/** 從 FDM 的 Tag 主檔搜尋並選取；已經選過的會標示「已加入」 */
export function TagBrowser({ selected, onPick }: { selected: TagRef[]; onPick: (t: TagInfo) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [site, setSite] = useState('');
  const have = useMemo(() => new Set(selected.map((r) => tagKey(r.site, r.tag))), [selected]);
  const matches = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return ALL_TAGS.filter((t) => {
      if (site && t.siteId !== site) return false;
      const hay = `${t.siteName} ${t.name} ${t.desc} ${t.systemName}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [q, site]);

  if (!open) {
    return <button type="button" className="btn btn--sm" onClick={() => setOpen(true)}>從 FDM Tag 清單選取…</button>;
  }
  return (
    <div className="tp__panel tp__panel--inline" onKeyDown={(e) => e.key === 'Escape' && (e.stopPropagation(), setOpen(false))}>
      <div className="tp__search">
        <input autoFocus type="search" value={q} placeholder="搜尋 Tag 名稱或說明，例如 TOC、電阻率、MAU" aria-label="搜尋 Tag" onChange={(e) => setQ(e.target.value)} />
        <select value={site} onChange={(e) => setSite(e.target.value)} aria-label="篩選廠區">
          <option value="">全部廠區</option>
          {SITES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button type="button" className="btn btn--sm" onClick={() => setOpen(false)}>收起</button>
      </div>
      <ul className="tp__list" role="listbox" aria-label="FDM Tag 清單">
        {matches.slice(0, 60).map((t) => {
          const added = have.has(t.key);
          return (
            <li key={t.key}>
              <button type="button" role="option" aria-selected={added} disabled={added} onClick={() => onPick(t)}>
                <span><b>{t.siteName}</b> · <code>{t.name}</code>{added && <em className="tp__added">已加入</em>}</span>
                <small>{t.desc}{t.unit ? ` · ${t.unit}` : ''}</small>
              </button>
            </li>
          );
        })}
        {matches.length === 0 && <li className="tp__none">找不到符合的 Tag</li>}
        {matches.length > 60 && <li className="tp__none">還有 {matches.length - 60} 筆，請輸入更多關鍵字縮小範圍</li>}
      </ul>
    </div>
  );
}
