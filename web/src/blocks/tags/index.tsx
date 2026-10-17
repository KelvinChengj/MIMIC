import { SITES, SYSTEMS } from '../../catalog/catalog';
import { TagTable, type TagRow } from '../../components/DrillParts';
import { useCell } from '../../state/derived';
import type { BlockSize } from '../../types';
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

/** 畫布上依尺寸限制列數；內建下鑽頁（flow）不限制 */
const ROWS: Record<BlockSize, number> = { S: 4, M: 8, L: 12 };
const WIDTH: Record<BlockSize, number> = { S: 380, M: 520, L: 720 };

function TagsRender({ block, mode }: RenderProps<TagsProps>) {
  const cell = useCell(block.props.site, block.props.system);
  if (!cell) return <section className="card">找不到這個廠區或系統</section>;
  const rows: TagRow[] = cell.tags.map((t) => ({
    key: t.name,
    name: t.name,
    desc: `${t.desc}${t.unit ? ` · ${t.unit}` : ''}`,
    value: t.value,
    decimals: t.decimals,
    status: t.status,
    isOOC: t.isOOC,
    isOOS: t.isOOS,
    invalid: !t.valid,
  }));
  return (
    <TagTable
      title={block.title}
      rows={rows}
      defaultFilter={block.props.filter}
      cap={mode === 'canvas' ? ROWS[block.size] : Infinity}
      className={`tagsblk tagsblk--${block.size}`}
      style={mode === 'canvas' ? { width: WIDTH[block.size] } : undefined}
    />
  );
}

export const tagsBlock: BlockDefinition<TagsProps> = {
  type: 'tags',
  label: 'Tag 清單',
  description: '某系統所有 Tag 的名稱、說明與數值，依嚴重程度排序。',
  inLibrary: false, // 目前只給內建頁面使用，先不開放使用者自己新增
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
