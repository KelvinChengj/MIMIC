import { useMemo } from 'react';
import { StatusTile } from '../../components/StatusTile';
import { evaluateLamp, type BlockResult } from '../../lib/blocks';
import { useValueGetter } from '../../state/derived';
import type { LampProps } from '../../types';
import { SCALE } from '../layout';
import type { RenderProps } from '../types';
import { useLampSim } from './sim';

/** 判定燈號。在編輯對話框內會套用模擬值，其他地方一律是 FDM 真實數值 */
export function useLampResult(props: LampProps): BlockResult {
  const getValue = useValueGetter();
  const { overrides } = useLampSim();
  return useMemo(() => evaluateLamp(props, getValue, overrides), [props, getValue, overrides]);
}

/** 燈號下方的文字。小 / 中只有一行；大尺寸數值放大、狀態文字在下方 */
export function lampText(r: BlockResult, mode: LampProps['caption'], scale: 1 | 2 | 4): { value?: string; text?: string } {
  const valueText = r.display ? `${r.display}${r.unit ? ` ${r.unit}` : ''}` : '';
  const status = r.label || '—';
  if (mode === 'status') return { text: status };
  if (scale === 4) return { value: valueText || undefined, text: status };
  if (mode === 'both') return { text: valueText && scale === 2 ? `${valueText} · ${status}` : valueText || status };
  return { text: valueText || status };
}

export function LampRender({ block }: RenderProps<LampProps>) {
  const r = useLampResult(block.props);
  const scale = SCALE[block.size];
  const { value, text } = lampText(r, block.props.caption ?? 'auto', scale);
  const label = `${block.title}：${r.label || '無資料'}${r.display ? `，${r.display}${r.unit ? ` ${r.unit}` : ''}` : ''}`;
  return (
    <StatusTile
      fill
      scale={scale}
      status={r.status}
      label={label}
      title={scale === 1 ? undefined : block.title}
      value={value}
      text={text}
    />
  );
}
