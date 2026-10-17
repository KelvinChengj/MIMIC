import { SITES, SYSTEMS } from '../../catalog/catalog';
import { SummaryCard } from '../../components/DrillParts';
import { useCell } from '../../state/derived';
import { cellsStatus } from '../cells';
import { SiteSystemSelect } from '../SiteSystemFields';
import { SummaryIcon } from '../icons';
import type { BlockDefinition, RenderProps } from '../types';

export interface SummaryProps {
  site: string;
  system: string;
  /** true＝顯示「Refresh Values」按鈕與網址（內建下鑽頁用） */
  showActions?: boolean;
}

const FOOT = { S: { w: 300, h: 96 }, M: { w: 460, h: 176 }, L: { w: 620, h: 236 } };
const LAMP = { S: 44, M: 60, L: 78 };
const LINES = { S: 0, M: 2, L: 4 };

function SummaryRender({ block, mode }: RenderProps<SummaryProps>) {
  const { site: siteId, system: systemId, showActions } = block.props;
  const cell = useCell(siteId, systemId);
  const site = SITES.find((s) => s.id === siteId);
  const sys = SYSTEMS.find((s) => s.id === systemId);
  if (!cell || !site || !sys) return <section className="card">找不到這個廠區或系統</section>;
  return (
    <SummaryCard
      status={cell.summary.status}
      title={<>{site.label} · {sys.name} {sys.short}</>}
      size={block.size}
      lamp={LAMP[block.size]}
      lines={LINES[block.size]}
      staleMinutes={sys.defaultStaleMinutes}
      showActions={showActions}
      style={mode === 'canvas' ? { width: FOOT[block.size].w } : undefined}
    />
  );
}

export const summaryBlock: BlockDefinition<SummaryProps> = {
  type: 'summary',
  label: '系統摘要',
  description: '某廠區某系統的整體燈號，附紅黃綠判定規則說明。',
  inLibrary: false, // 目前只給內建頁面使用，先不開放使用者自己新增
  category: '燈號',
  icon: <SummaryIcon />,
  defaultProps: () => ({ site: SITES[0].id, system: SYSTEMS[0].id }),
  defaultTitle: () => '系統摘要',
  titleless: true,
  footprint: (b) => FOOT[b.size],
  Render: SummaryRender,
  Editor: ({ block, onProps }) => <SiteSystemSelect site={block.props.site} system={block.props.system} onChange={onProps} />,
  status: (b, env) => cellsStatus(env, [b.props.site], [b.props.system]),
};
