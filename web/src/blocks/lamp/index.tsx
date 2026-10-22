import { evaluateLamp, lampVTag } from '../../lib/blocks';
import type { LampProps } from '../../types';
import { LampIcon } from '../icons';
import { SCALE } from '../layout';
import type { BlockDefinition } from '../types';
import { LampEditor } from './LampEditor';
import { LampRender } from './LampBlock';

/** 基準（中）96 × 88；小、大依 SCALE 為 0.5 倍、2 倍 */
export const LAMP_BASE = { w: 96, h: 88 };

export const lampBlock: BlockDefinition<LampProps> = {
  type: 'lamp',
  label: '燈號',
  description: '綁一個 virtual tag，值就是燈號；點了下鑽 InSQL tag 清單。',
  category: '燈號',
  layers: ['duty'],
  icon: <LampIcon />,
  defaultProps: () => ({}),
  defaultTitle: (n) => `燈號 ${n}`,
  fixedHeight: true,
  footprint: (b) => ({ w: LAMP_BASE.w * SCALE[b.size], h: LAMP_BASE.h * SCALE[b.size] }),
  Render: LampRender,
  Editor: LampEditor,
  // 檢視頁點燈號一律下鑽到 InSQL tag 清單，不開說明視窗
  explainable: () => false,
  status: (b, env) => evaluateLamp(lampVTag(b.props), env.index).status,
};
