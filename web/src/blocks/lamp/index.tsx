import { evaluateLamp } from '../../lib/blocks';
import { cellsStatus } from '../cells';
import { SCALE } from '../layout';
import { LampSimProvider } from './sim';
import type { LampProps } from '../../types';
import { LampIcon } from '../icons';
import type { BlockDefinition } from '../types';
import { LampExplain } from './Explain';
import { LampEditor } from './LampEditor';
import { LampRender } from './LampBlock';

/** 基準（小）96 × 88，中、大依 SCALE 放大 2 倍、4 倍 */
const BASE = { w: 96, h: 88 };

export const lampBlock: BlockDefinition<LampProps> = {
  type: 'lamp',
  label: '燈號',
  description: '挑選 Tag，用加減乘除與 and / or 寫出紅、黃燈條件，顯示一顆燈。',
  category: '燈號',
  icon: <LampIcon />,
  defaultProps: () => ({ vars: [], valueExpr: '', unit: '', redExpr: '', yellowExpr: '', caption: 'auto', labels: {} }),
  defaultTitle: (n) => `燈號 ${n}`,
  fixedHeight: true,
  footprint: (b) => ({ w: BASE.w * SCALE[b.size], h: BASE.h * SCALE[b.size] }),
  Render: LampRender,
  Editor: LampEditor,
  Explain: LampExplain,
  EditorProvider: LampSimProvider,
  explainable: (b) => !b.props.source,
  status: (b, env) =>
    b.props.source ? cellsStatus(env, [b.props.source.site], [b.props.source.system]) : evaluateLamp(b.props, env.getValue).status,
};
