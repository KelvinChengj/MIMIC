import { useState } from 'react';
import { SITES, SYSTEMS } from '../../catalog/catalog';
import { Dot } from '../../components/Lamp';
import { formatValue } from '../../lib/status';
import { useCell } from '../../state/derived';
import type { BlockSize, Status } from '../../types';
import { cellsStatus } from '../cells';
import { SiteSystemSelect } from '../SiteSystemFields';
import { TagsIcon } from '../icons';
import type { BlockDefinition, RenderProps } from '../types';

export interface TagsProps {
  site: string;
  system: string;
  /** 預設顯示哪些 Tag；檢視時可以臨時切換 */
  filter: 'abnormal' | 'all';
}

const SEVERITY: Record<Status, number> = { red: 0, yellow: 1, green: 2, gray: 3 };
/** 畫布上依尺寸限制列數；內建下鑽頁（flow）不限制 */
const ROWS: Record<BlockSize, number> = { S: 4, M: 8, L: 12 };
const WIDTH: Record<BlockSize, number> = { S: 380, M: 520, L: 720 };

function TagsRender({ block, mode }: RenderProps<TagsProps>) {
  const cell = useCell(block.props.site, block.props.system);
  const [local, setLocal] = useState<TagsProps['filter'] | null>(null);
  if (!cell) return <section className="card">找不到這個廠區或系統</section>;

  const { summary, tags } = cell;
  const abnormal = summary.red + summary.yellow;
  const filter = local ?? (block.props.filter === 'abnormal' && abnormal === 0 ? 'all' : block.props.filter);
  const rows = tags
    .filter((t) => filter === 'all' || t.status === 'red' || t.status === 'yellow')
    .sort((a, b) => SEVERITY[a.status] - SEVERITY[b.status]);
  const cap = mode === 'canvas' ? ROWS[block.size] : Infinity;
  const shown = rows.slice(0, cap);

  return (
    <section className={`card tagsblk tagsblk--${block.size}`} style={mode === 'canvas' ? { width: WIDTH[block.size] } : undefined}>
      <div className="card__head">
        <h2>{block.title}</h2>
        <div className="seg" role="group" aria-label="篩選">
          <button className={filter === 'abnormal' ? 'is-on' : ''} aria-pressed={filter === 'abnormal'} onClick={() => setLocal('abnormal')}>
            僅顯示異常{abnormal > 0 && <em>{abnormal}</em>}
          </button>
          <button className={filter === 'all' ? 'is-on' : ''} aria-pressed={filter === 'all'} onClick={() => setLocal('all')}>
            全部 Tag<em>{tags.length}</em>
          </button>
        </div>
      </div>
      <table className="tag-table">
        <thead>
          <tr><th>Tag name</th><th>Description</th><th className="num">Value</th></tr>
        </thead>
        <tbody>
          {shown.map((t) => (
            <tr key={t.name} className={t.status === 'red' ? 'is-red' : ''}>
              <td><code>{t.name}</code></td>
              <td>{t.desc}{t.metricDef?.unit ? ` · ${t.metricDef.unit}` : ''}</td>
              <td className={`num val val--${t.status}`}>
                <span className="val__in">
                  <Dot status={t.status} />
                  <span className="val__num">{formatValue(t.value, t.metricDef?.decimals ?? 1)}</span>
                </span>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={3} className="tag-table__empty">
                目前沒有異常的 Tag。
                <button className="link-btn" onClick={() => setLocal('all')}>查看全部 Tag</button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {rows.length > shown.length && <p className="tagsblk__more">還有 {rows.length - shown.length} 筆未顯示，調大積木可看到更多</p>}
    </section>
  );
}

export const tagsBlock: BlockDefinition<TagsProps> = {
  type: 'tags',
  label: 'Tag 清單',
  description: '某系統所有 Tag 的名稱、說明與數值，依嚴重程度排序。',
  category: '資料',
  icon: <TagsIcon />,
  defaultProps: () => ({ site: SITES[0].id, system: SYSTEMS[0].id, filter: 'abnormal' }),
  defaultTitle: () => 'Tag 燈號清單',
  footprint: (b) => ({ w: WIDTH[b.size], h: 110 + ROWS[b.size] * 49 }),
  Render: TagsRender,
  Editor: ({ block, onProps }) => (
    <>
      <SiteSystemSelect site={block.props.site} system={block.props.system} onChange={onProps} />
      <section className="be__sec">
        <h3>預設顯示 <small>檢視頁面時仍可臨時切換</small></h3>
        <div className="seg" role="group" aria-label="預設篩選">
          <button className={block.props.filter === 'abnormal' ? 'is-on' : ''} aria-pressed={block.props.filter === 'abnormal'} onClick={() => onProps({ filter: 'abnormal' })}>僅顯示異常</button>
          <button className={block.props.filter === 'all' ? 'is-on' : ''} aria-pressed={block.props.filter === 'all'} onClick={() => onProps({ filter: 'all' })}>全部 Tag</button>
        </div>
      </section>
    </>
  ),
  status: (b, env) => cellsStatus(env, [b.props.site], [b.props.system]),
};
