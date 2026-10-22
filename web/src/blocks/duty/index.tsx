import { useMemo, useState } from 'react';
import { PHASE_OPTIONS, SYSTEM_OPTIONS } from '../../catalog/catalog';
import { LampDot, StatusTile } from '../../components/StatusTile';
import { dutySummary, dutyText } from '../../lib/pages';
import { STATUS_META } from '../../lib/status';
import { useDutyPages, useTagIndex } from '../../state/derived';
import { useUserPages } from '../../state/UserPagesContext';
import type { DutyProps } from '../../types';
import { DutyIcon } from '../icons';
import { LAMP_BASE } from '../lamp';
import { DOT_LAMP, SCALE } from '../layout';
import type { BlockDefinition, EditorProps, RenderProps } from '../types';

function useDuty(slug: string) {
  const page = useUserPages().getPage(slug);
  const index = useTagIndex();
  return useMemo(() => (page ? { page, sum: dutySummary(page, index) } : null), [page, index]);
}

/** 戰情指揮官的燈號：代表一個值班情境頁，點了進入該頁（不下鑽） */
function DutyRender({ block, host }: RenderProps<DutyProps>) {
  const d = useDuty(block.props.page);
  const name = block.title || d?.page.title || '值班情境';
  if (!d) {
    const label = `${name}：找不到值班情境頁`;
    if (block.size === 'S') return <LampDot status="gray" label={label} size={DOT_LAMP} />;
    return <StatusTile fill scale={SCALE[block.size] as 1 | 2} status="gray" label={label} title={block.size === 'M' ? undefined : name} text="找不到頁面" />;
  }
  const text = dutyText(d.sum);
  const label = `${name}：${STATUS_META[d.sum.status].badge}，${text}。進入值班情境`;
  const to = host.pageTo?.(d.page.slug);
  // 小尺寸只有一顆燈：名稱與數量放在滑鼠提示
  if (block.size === 'S') return <LampDot status={d.sum.status} label={label} to={to} size={DOT_LAMP} />;
  const scale = SCALE[block.size] as 1 | 2;
  return (
    <StatusTile
      fill
      scale={scale}
      status={d.sum.status}
      to={to}
      title={scale === 1 ? undefined : name}
      // 中尺寸沒有標題列：燈號下方放積木名稱（數量在滑鼠提示裡）；大尺寸名稱在上、數量在下
      text={scale === 1 ? name : text}
      label={label}
    />
  );
}

type DutyOption = ReturnType<typeof useDutyPages>[number];

/** 依 System / Phase 篩選：涵蓋全系統、全廠（F18A）的頁面也算符合 */
const fits = (value: string, want: string, all: string) => !want || value === all || value.split('、').includes(want);

/** 值班情境頁很多：用關鍵字 + System + Phase 搜尋後點選 */
function DutyPagePicker({ pages, selected, onPick }: { pages: DutyOption[]; selected: string; onPick: (slug: string) => void }) {
  const [q, setQ] = useState('');
  const [system, setSystem] = useState('');
  const [phase, setPhase] = useState('');
  const matches = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return pages.filter((p) => {
      if (!fits(p.system, system, '全系統') || !fits(p.phase, phase, 'F18A')) return false;
      const hay = `${p.title} ${p.slug} ${p.system} ${p.phase}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [pages, q, system, phase]);

  return (
    <div className="tp__panel tp__panel--inline">
      <div className="tp__search">
        <input type="search" value={q} placeholder="搜尋頁面名稱、網址，例如 UPW、P2" aria-label="搜尋值班情境頁" onChange={(e) => setQ(e.target.value)} />
        <select value={system} onChange={(e) => setSystem(e.target.value)} aria-label="篩選 System">
          <option value="">全部 System</option>
          {SYSTEM_OPTIONS.filter((s) => s !== '全系統').map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={phase} onChange={(e) => setPhase(e.target.value)} aria-label="篩選 Phase">
          <option value="">全部 Phase</option>
          {PHASE_OPTIONS.filter((s) => s !== 'F18A').map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <p className="tp__count" aria-live="polite">共 {matches.length} / {pages.length} 個值班情境頁</p>
      <ul className="tp__list" role="listbox" aria-label="值班情境頁清單">
        {matches.map((p) => {
          const on = p.slug === selected;
          return (
            <li key={p.slug}>
              <button type="button" role="option" aria-selected={on} className={on ? 'is-on' : ''} onClick={() => onPick(p.slug)}>
                <span><b>{p.title}</b>{on && <em className="tp__added">已選取</em>}</span>
                <small>{[p.system, p.phase].filter(Boolean).join(' · ') || '—'} · <code>mimic/p/{p.slug}</code></small>
              </button>
            </li>
          );
        })}
        {matches.length === 0 && <li className="tp__none">找不到符合的值班情境頁</li>}
      </ul>
    </div>
  );
}

function DutyEditor({ block, onProps }: EditorProps<DutyProps>) {
  const pages = useDutyPages();
  const d = useDuty(block.props.page);
  return (
    <>
      <section className="be__sec">
        <h3>值班情境 <small>這顆燈代表哪個值班情境頁；燈號取該頁所有燈號最差，點了進入該頁</small></h3>
        <p className="duty-current">目前：<b>{d ? d.page.title : '（找不到頁面）'}</b></p>
        <DutyPagePicker pages={pages} selected={block.props.page} onPick={(page) => onProps({ page })} />
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
