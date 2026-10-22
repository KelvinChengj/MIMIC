import { useMemo } from 'react';
import { LampDot, StatusTile } from '../../components/StatusTile';
import { evaluateLamp, lampVTag, type LampResult } from '../../lib/blocks';
import { useTagIndex } from '../../state/derived';
import type { LampProps } from '../../types';
import { DOT_LAMP, SCALE } from '../layout';
import type { RenderProps } from '../types';

/** 依 FDM 最新回傳的 virtual tag 值判定燈號 */
export function useLampResult(props: LampProps): LampResult {
  const index = useTagIndex();
  return useMemo(() => evaluateLamp(lampVTag(props), index), [props, index]);
}

/** 值班情境的燈號：virtual tag 的值就是燈號；點了下鑽到 InSQL tag 清單 */
export function LampRender({ block, host }: RenderProps<LampProps>) {
  const r = useLampResult(block.props);
  const name = block.title || r.ref?.name || '燈號';
  const to = r.info ? host.blockTo?.(block.id) : undefined;
  const label = `${name}：${r.text}`;
  if (block.size === 'S') return <LampDot status={r.status} label={label} to={to} size={DOT_LAMP} />;
  const scale = SCALE[block.size] as 1 | 2;
  return <StatusTile fill scale={scale} status={r.status} to={to} label={label} title={scale === 1 ? undefined : name} text={r.text} />;
}
