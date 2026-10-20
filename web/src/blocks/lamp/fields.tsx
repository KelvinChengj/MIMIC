import { useMemo, useState } from 'react';
import { SITES } from '../../catalog/catalog';
import { VTAGS } from '../../lib/fdm';
import type { VirtualTag } from '../../lib/blocks';
import type { Status } from '../../types';

/** 燈號標籤：異常 / 部分異常 / 正常 / 無資料 / 無效 */
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

/** 從上游的 virtual tag 主檔搜尋並選取 */
export function VTagBrowser({ selected, onPick }: { selected?: string; onPick: (v: VirtualTag) => void }) {
  const [q, setQ] = useState('');
  const [site, setSite] = useState('');
  const matches = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return VTAGS.filter((v) => {
      if (site && v.siteId !== site) return false;
      const hay = `${v.siteName} ${v.name} ${v.desc}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [q, site]);

  return (
    <div className="tp__panel tp__panel--inline">
      <div className="tp__search">
        <input type="search" value={q} placeholder="搜尋 virtual tag 名稱或說明，例如 UPW、超純水" aria-label="搜尋 virtual tag" onChange={(e) => setQ(e.target.value)} />
        <select value={site} onChange={(e) => setSite(e.target.value)} aria-label="篩選廠區">
          <option value="">全部廠區</option>
          {SITES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <ul className="tp__list" role="listbox" aria-label="virtual tag 清單">
        {matches.slice(0, 60).map((v) => {
          const on = v.key === selected;
          return (
            <li key={v.key}>
              <button type="button" role="option" aria-selected={on} className={on ? 'is-on' : ''} onClick={() => onPick(v)}>
                <span><b>{v.siteName}</b> · <code>{v.name}</code>{on && <em className="tp__added">已選取</em>}</span>
                <small>{v.desc} · {v.sources.length} 個 InSQL tag</small>
              </button>
            </li>
          );
        })}
        {matches.length === 0 && <li className="tp__none">找不到符合的 virtual tag</li>}
      </ul>
    </div>
  );
}
