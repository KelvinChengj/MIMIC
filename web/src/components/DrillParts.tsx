import { useState, type CSSProperties, type ReactNode } from 'react';
import { formatValue, ruleLines } from '../lib/status';
import { useFdm } from '../state/FdmContext';
import type { Status } from '../types';
import { RefreshIcon } from './Icons';
import { Dot, Lamp, StatusBadge } from './Lamp';
import { PathChip, useSpin } from './PageParts';

const SIGN = { red: '紅', yellow: '黃', green: '綠', gray: '灰' } as const;
const SEVERITY: Record<Status, number> = { red: 0, yellow: 1, green: 2, gray: 3 };

/** 下鑽頁上方的摘要卡：大燈號、標題、燈號規則、Refresh Values */
export function SummaryCard({ status, title, lamp = 78, lines = 4, size = 'L', staleMinutes = 15, showActions, style }: {
  status: Status;
  title: ReactNode;
  lamp?: number;
  /** 顯示幾行規則說明（0～4） */
  lines?: number;
  size?: 'S' | 'M' | 'L';
  staleMinutes?: number;
  /** 顯示網址與 Refresh Values（獨立的下鑽頁用） */
  showActions?: boolean;
  style?: CSSProperties;
}) {
  const { refresh } = useFdm();
  const [spin, startSpin] = useSpin();
  const rules = ruleLines(staleMinutes).slice(0, lines);
  return (
    <section className={`card summary summary--${status} summary--${size}`} style={style}>
      <Lamp status={status} size={lamp} />
      <div className="summary__body">
        <h1>{title} <StatusBadge status={status} /></h1>
        {rules.length > 0 && (
          <ul className="rule-lines">
            {rules.map((l) => (
              <li key={l.status}><Dot status={l.status} /><b>{SIGN[l.status]}</b><span>{l.text}</span></li>
            ))}
          </ul>
        )}
        {showActions && <PathChip />}
      </div>
      {showActions && (
        <div className="summary__actions">
          <button className="btn btn--primary" onClick={() => { startSpin(); refresh(); }}>
            <RefreshIcon size={16} className={spin ? 'spin' : ''} /> Refresh Values
          </button>
        </div>
      )}
    </section>
  );
}

export interface TagRow {
  key: string;
  name: string;
  desc: string;
  value: number | null;
  decimals: number;
  status: Status;
  /** FDM 找不到這個 Tag */
  invalid?: boolean;
}

/** 「Tag 燈號清單」：Tag name / Description / Value，依嚴重程度排序，可切換「僅顯示異常 / 全部 Tag」 */
export function TagTable({ title, rows, defaultFilter = 'abnormal', cap = Infinity, className = '', style }: {
  title: ReactNode;
  rows: TagRow[];
  defaultFilter?: 'abnormal' | 'all';
  /** 最多顯示幾列（畫布上的小積木用） */
  cap?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const [local, setLocal] = useState<'abnormal' | 'all' | null>(null);
  const abnormal = rows.filter((r) => r.status === 'red' || r.status === 'yellow').length;
  const filter = local ?? (defaultFilter === 'abnormal' && abnormal === 0 ? 'all' : defaultFilter);
  const list = rows
    .filter((r) => filter === 'all' || r.status === 'red' || r.status === 'yellow')
    .sort((a, b) => SEVERITY[a.status] - SEVERITY[b.status] || Number(!!a.invalid) - Number(!!b.invalid));
  const shown = list.slice(0, cap);

  return (
    <section className={`card ${className}`} style={style}>
      <div className="card__head">
        <h2>{title}</h2>
        <div className="seg" role="group" aria-label="篩選">
          <button className={filter === 'abnormal' ? 'is-on' : ''} aria-pressed={filter === 'abnormal'} onClick={() => setLocal('abnormal')}>
            僅顯示異常{abnormal > 0 && <em>{abnormal}</em>}
          </button>
          <button className={filter === 'all' ? 'is-on' : ''} aria-pressed={filter === 'all'} onClick={() => setLocal('all')}>
            全部 Tag<em>{rows.length}</em>
          </button>
        </div>
      </div>
      <table className="tag-table">
        <thead>
          <tr><th>Tag name</th><th>Description</th><th className="num">Value</th></tr>
        </thead>
        <tbody>
          {shown.map((t) => (
            <tr key={t.key} className={t.status === 'red' ? 'is-red' : t.invalid ? 'is-invalid' : ''}>
              <td><code>{t.name}</code></td>
              <td>{t.desc}</td>
              <td className={`num val val--${t.status}`}>
                <span className="val__in">
                  <Dot status={t.status} />
                  <span className="val__num">{t.invalid ? '無效' : formatValue(t.value, t.decimals)}</span>
                </span>
              </td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr>
              <td colSpan={3} className="tag-table__empty">
                {rows.length === 0 ? '還沒有選擇 Tag。' : <>目前沒有異常的 Tag。<button className="link-btn" onClick={() => setLocal('all')}>查看全部 Tag</button></>}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {list.length > shown.length && <p className="tagsblk__more">還有 {list.length - shown.length} 筆未顯示，調大積木可看到更多</p>}
    </section>
  );
}
