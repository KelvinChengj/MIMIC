import { useMemo } from 'react';
import { StatusTile } from '../../components/StatusTile';
import { dutySummary, dutyText } from '../../lib/pages';
import { STATUS_META } from '../../lib/status';
import { useDutyPages, useTagIndex } from '../../state/derived';
import { useUserPages } from '../../state/UserPagesContext';
import type { DutyProps } from '../../types';
import { DutyIcon } from '../icons';
import { LAMP_BASE } from '../lamp';
import { SCALE } from '../layout';
import type { BlockDefinition, EditorProps, RenderProps } from '../types';

function useDuty(slug: string) {
  const page = useUserPages().getPage(slug);
  const index = useTagIndex();
  return useMemo(() => (page ? { page, sum: dutySummary(page, index) } : null), [page, index]);
}

/** 戰情指揮官的燈號：代表一個值班情境頁，點了進入該頁（不下鑽） */
function DutyRender({ block, host }: RenderProps<DutyProps>) {
  const d = useDuty(block.props.page);
  const scale = SCALE[block.size];
  const name = block.title || d?.page.title || '值班情境';
  if (!d) return <StatusTile fill scale={scale} status="gray" label={`${name}：找不到值班情境頁`} title={scale === 1 ? undefined : name} text="找不到頁面" />;
  const text = dutyText(d.sum);
  return (
    <StatusTile
      fill
      scale={scale}
      status={d.sum.status}
      to={host.pageTo?.(d.page.slug)}
      title={scale === 1 ? undefined : name}
      value={scale === 4 ? text : undefined}
      text={scale === 4 ? STATUS_META[d.sum.status].badge : text}
      label={`${name}：${STATUS_META[d.sum.status].badge}，${text}。進入值班情境`}
    />
  );
}

function DutyEditor({ block, onProps }: EditorProps<DutyProps>) {
  const pages = useDutyPages();
  const d = useDuty(block.props.page);
  return (
    <>
      <section className="be__sec">
        <h3>值班情境 <small>這顆燈代表哪個值班情境頁；燈號取該頁所有燈號最差，點了進入該頁</small></h3>
        <div className="ef">
          <label htmlFor="duty-page">值班情境頁</label>
          <select id="duty-page" className="ef__input ef__input--plain" value={block.props.page} onChange={(e) => onProps({ page: e.target.value })}>
            {!pages.some((p) => p.slug === block.props.page) && <option value={block.props.page}>（找不到頁面）</option>}
            {pages.map((p) => <option key={p.slug} value={p.slug}>{p.title}</option>)}
          </select>
        </div>
        {d && <p className="be__note">{d.page.title}：{d.sum.total} 顆燈號，紅 {d.sum.red}、黃 {d.sum.yellow}、綠 {d.sum.green}、無資料 {d.sum.gray}。</p>}
      </section>
      <p className="be__note">指揮官層只看巨觀：不下鑽 Tag，點燈號直接進入值班情境的 MIMIC，再由值班情境下鑽。</p>
    </>
  );
}

export const dutyBlock: BlockDefinition<DutyProps> = {
  type: 'duty',
  label: '值班情境燈號',
  description: '代表一個值班情境頁，取該頁最差燈號；點了進入該值班情境。',
  category: '燈號',
  layers: ['command'],
  icon: <DutyIcon />,
  defaultProps: () => ({ page: 'upw' }),
  defaultTitle: () => '',
  fixedHeight: true,
  footprint: (b) => ({ w: LAMP_BASE.w * SCALE[b.size], h: LAMP_BASE.h * SCALE[b.size] }),
  Render: DutyRender,
  Editor: DutyEditor,
  explainable: () => false,
  status: (b, env) => {
    const page = env.getPage(b.props.page);
    return page ? dutySummary(page, env.index).status : 'gray';
  },
};
