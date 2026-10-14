import { useMemo } from 'react';
import { StatusTile } from '../../components/StatusTile';
import { evaluateLamp, type BlockResult } from '../../lib/blocks';
import { useValueGetter } from '../../state/derived';
import type { LampProps } from '../../types';
import type { RenderProps } from '../types';

export function useLampResult(props: LampProps): BlockResult {
  const getValue = useValueGetter();
  return useMemo(() => evaluateLamp(props, getValue), [props, getValue]);
}

/** 燈號磚塊上的文字：有顯示值就顯示數值（含單位），否則顯示狀態 */
export const lampCaption = (r: BlockResult) =>
  r.display ? `${r.display}${r.unit ? ` ${r.unit}` : ''}` : r.label || '—';

export function LampRender({ block }: RenderProps<LampProps>) {
  const r = useLampResult(block.props);
  const s = block.size;
  const caption = lampCaption(r);
  const label = `${block.title}：${r.label || '無資料'}${r.display ? `，${caption}` : ''}`;
  return (
    <StatusTile
      fill
      status={r.status}
      size={s}
      label={label}
      title={s === 'S' ? undefined : block.title}
      // 大尺寸：數值放大，狀態文字在下方；小、中尺寸：一行文字
      value={s === 'L' && r.display ? caption : undefined}
      text={s === 'L' ? (r.display ? r.label : caption) : caption}
    />
  );
}
