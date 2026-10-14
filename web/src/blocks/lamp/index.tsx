import { evaluateLamp } from '../../lib/blocks';
import type { LampProps } from '../../types';
import { LampIcon } from '../icons';
import type { BlockDefinition } from '../types';
import { LampExplain } from './Explain';
import { LampEditor } from './LampEditor';
import { LampRender } from './LampBlock';

const FOOT = { S: { w: 112, h: 96 }, M: { w: 168, h: 128 }, L: { w: 240, h: 184 } };

export const lampBlock: BlockDefinition<LampProps> = {
  type: 'lamp',
  label: '燈號',
  description: '挑選 Tag，用加減乘除與 and / or 寫出紅、黃燈條件，顯示一顆燈。',
  category: '燈號',
  icon: <LampIcon />,
  defaultProps: () => ({ vars: [], valueExpr: '', unit: '', redExpr: '', yellowExpr: '' }),
  defaultTitle: (n) => `燈號 ${n}`,
  fixedHeight: true,
  footprint: (b) => FOOT[b.size],
  Render: LampRender,
  Editor: LampEditor,
  Explain: LampExplain,
  status: (b, env) => evaluateLamp(b.props, env.getValue).status,
};
