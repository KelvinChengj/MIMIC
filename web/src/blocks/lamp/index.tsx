import { evaluateLamp, lampTags } from '../../lib/blocks';
import type { LampProps } from '../../types';
import { cellsStatus } from '../cells';
import { LampIcon } from '../icons';
import { SCALE } from '../layout';
import type { BlockDefinition } from '../types';
import { LampExplain } from './Explain';
import { LampEditor } from './LampEditor';
import { LampRender } from './LampBlock';

/** 基準（小）96 × 88，中、大依 SCALE 放大 2 倍、4 倍 */
const BASE = { w: 96, h: 88 };

export const lampBlock: BlockDefinition<LampProps> = {
  type: 'lamp',
  label: '燈號',
  description: '選取 Tag，依 FDM 的 OOS / OOC 自動亮紅、黃、綠燈。',
  category: '燈號',
  icon: <LampIcon />,
  defaultProps: () => ({ tags: [] }),
  defaultTitle: (n) => `燈號 ${n}`,
  fixedHeight: true,
  footprint: (b) => ({ w: BASE.w * SCALE[b.size], h: BASE.h * SCALE[b.size] }),
  Render: LampRender,
  Editor: LampEditor,
  Explain: LampExplain,
  // 檢視頁點燈號一律下鑽（整個情境 → 情境的 Tag 清單；選取 Tag → 這顆積木的 Tag 清單），不開說明視窗
  explainable: () => false,
  status: (b, env) =>
    b.props.source ? cellsStatus(env, [b.props.source.site], [b.props.source.system]) : evaluateLamp(lampTags(b.props), env.index).status,
};
