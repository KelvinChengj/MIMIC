import { Link } from 'react-router-dom';
import { SITES, SYSTEMS } from '../../catalog/catalog';
import { RefreshIcon, EditIcon } from '../../components/Icons';
import { Dot, Lamp, StatusBadge } from '../../components/Lamp';
import { PathChip, useSpin } from '../../components/PageParts';
import { describeRules } from '../../lib/status';
import { useCell } from '../../state/derived';
import { useFdm } from '../../state/FdmContext';
import { cellsStatus } from '../cells';
import { SiteSystemSelect } from '../SiteSystemFields';
import { SummaryIcon } from '../icons';
import type { BlockDefinition, RenderProps } from '../types';

export interface SummaryProps {
  site: string;
  system: string;
  /** 有值才顯示「Refresh Values / Edit」按鈕與網址（內建下鑽頁用） */
  editTo?: string;
}

const FOOT = { S: { w: 300, h: 96 }, M: { w: 460, h: 176 }, L: { w: 620, h: 236 } };
const LAMP = { S: 44, M: 60, L: 78 };
const LINES = { S: 0, M: 2, L: 4 };
const SIGN = { red: '紅', yellow: '黃', green: '綠', gray: '灰' } as const;

function SummaryRender({ block, mode }: RenderProps<SummaryProps>) {
  const { site: siteId, system: systemId, editTo } = block.props;
  const cell = useCell(siteId, systemId);
  const { refresh } = useFdm();
  const [spin, startSpin] = useSpin();
  const site = SITES.find((s) => s.id === siteId);
  const sys = SYSTEMS.find((s) => s.id === systemId);
  if (!cell || !site || !sys) return <section className="card">找不到這個廠區或系統</section>;

  const { summary, rules } = cell;
  const lines = describeRules(sys, rules).slice(0, LINES[block.size]);
  return (
    <section
      className={`card summary summary--${summary.status} summary--${block.size}`}
      style={mode === 'canvas' ? { width: FOOT[block.size].w } : undefined}
    >
      <Lamp status={summary.status} size={LAMP[block.size]} />
      <div className="summary__body">
        <h1>{site.label} · {sys.name} {sys.short} <StatusBadge status={summary.status} /></h1>
        {lines.length > 0 && (
          <ul className="rule-lines">
            {lines.map((l) => (
              <li key={l.status} title={l.title || undefined}>
                <Dot status={l.status} /><b>{SIGN[l.status]}</b><span>{l.text}</span>
              </li>
            ))}
          </ul>
        )}
        {editTo && <PathChip />}
      </div>
      {editTo && (
        <div className="summary__actions">
          <button className="btn btn--primary" onClick={() => { startSpin(); refresh(); }}>
            <RefreshIcon size={16} className={spin ? 'spin' : ''} /> Refresh Values
          </button>
          <Link className="btn btn--primary" to={editTo}><EditIcon size={16} /> 門檻設定</Link>
        </div>
      )}
    </section>
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
