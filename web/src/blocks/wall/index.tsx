import { Fragment } from 'react';
import { SITES, SYSTEMS } from '../../catalog/catalog';
import { StatusTile } from '../../components/StatusTile';
import { STATUS_META, tileText } from '../../lib/status';
import { useCell } from '../../state/derived';
import type { BlockSize } from '../../types';
import { cellsStatus } from '../cells';
import { SiteSystemChecks } from '../SiteSystemFields';
import { WallIcon } from '../icons';
import type { BlockDefinition, RenderProps } from '../types';

export interface WallProps {
  sites: string[];
  systems: string[];
}

/** 磚塊大小；小尺寸只留燈，文字收進滑鼠提示 */
const TILE: Record<BlockSize, { w: number; h: number }> = { S: { w: 64, h: 54 }, M: { w: 104, h: 88 }, L: { w: 136, h: 124 } };
const HEAD_W = 96;
const GAP = 12;

function WallTile({ to, siteId, systemId, size }: { to: string; siteId: string; systemId: string; size: BlockSize }) {
  const cell = useCell(siteId, systemId);
  const site = SITES.find((s) => s.id === siteId)!;
  if (!cell) return <div className="tile tile--gray" />;
  const { summary, sys } = cell;
  const text = tileText(summary, sys.defaultStaleMinutes);
  return (
    <StatusTile
      to={to}
      status={summary.status}
      size={size}
      text={size === 'S' ? undefined : text}
      label={`${site.label} ${sys.name}：${STATUS_META[summary.status].badge}，${text}`}
    />
  );
}

function footprint(sites: number, systems: number, size: BlockSize) {
  const t = TILE[size];
  return { w: 52 + HEAD_W + systems * (t.w + GAP), h: 120 + sites * (t.h + 14) };
}

function WallRender({ block, mode, host }: RenderProps<WallProps>) {
  const sites = SITES.filter((s) => block.props.sites.includes(s.id));
  const systems = SYSTEMS.filter((s) => block.props.systems.includes(s.id));
  const t = TILE[block.size];
  const fp = footprint(sites.length, systems.length, block.size);
  return (
    <section className={`card wall wall--${block.size}`} style={mode === 'canvas' ? { width: fp.w } : undefined} aria-label={block.title}>
      <div className="card__head">
        <h2>{block.title}</h2>
        {block.size !== 'S' && <span className="card__hint">點選燈號可下鑽至設備</span>}
      </div>
      <div className="wall__scroll">
        <div
          className="wall__grid"
          style={{ gridTemplateColumns: `${block.size === 'S' ? 72 : HEAD_W}px repeat(${systems.length}, ${mode === 'canvas' ? `${t.w}px` : `minmax(${t.w}px, 1fr)`})`, minWidth: mode === 'flow' ? 640 : undefined }}
        >
          <div />
          {systems.map((sys) => <div className="wall__col" key={sys.id}>{sys.name}</div>)}
          {sites.map((site) => (
            <Fragment key={site.id}>
              <div className="wall__rowhead">{block.size === 'S' ? site.name : site.label}</div>
              {systems.map((sys) => (
                <WallTile key={sys.id} to={host.drillTo(site.id, sys.id)} siteId={site.id} systemId={sys.id} size={block.size} />
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}

export const wallBlock: BlockDefinition<WallProps> = {
  type: 'wall',
  label: '燈號牆',
  description: '廠區 × 系統的燈號矩陣，點燈號可下鑽到 Tag 清單。',
  inLibrary: false, // 目前只給內建頁面使用，先不開放使用者自己新增
  category: '燈號',
  icon: <WallIcon />,
  defaultProps: () => ({ sites: SITES.map((s) => s.id), systems: SYSTEMS.slice(0, 3).map((s) => s.id) }),
  defaultTitle: () => '燈號牆 · 廠區 × 系統',
  defaultSize: 'S',
  footprint: (b) => footprint(b.props.sites.length, b.props.systems.length, b.size),
  Render: WallRender,
  Editor: ({ block, onProps }) => <SiteSystemChecks sites={block.props.sites} systems={block.props.systems} onChange={onProps} />,
  status: (b, env) => cellsStatus(env, b.props.sites, b.props.systems),
};
