import { useMemo } from 'react';
import { StatusTile } from '../../components/StatusTile';
import { evaluateLamp, lampVTag, type LampResult } from '../../lib/blocks';
import { useTagIndex } from '../../state/derived';
import type { LampProps } from '../../types';
import { SCALE } from '../layout';
import type { RenderProps } from '../types';

/** 依 FDM 最新回傳的 virtual tag 值判定燈號 */
export function useLampResult(props: LampProps): LampResult {
  const index = useTagIndex();
  return useMemo(() => evaluateLamp(lampVTag(props), index), [props, index]);
}

/** 值班情境的燈號：virtual tag 的值就是燈號；點了下鑽到 InSQL tag 清單 */
export function LampRender({ block, host }: RenderProps<LampProps>) {
  const r = useLampResult(block.props);
  const scale = SCALE[block.size];
  const name = block.title || r.ref?.name || '燈號';
  return (
    <StatusTile
      fill
      scale={scale}
      status={r.status}
      to={r.info ? host.blockTo?.(block.id) : undefined}
      label={`${name}：${r.text}`}
      title={scale === 1 ? undefined : name}
      value={scale === 4 && r.reason === 'ok' ? r.text : undefined}
      text={scale === 4 && r.reason === 'ok' ? r.ref?.name : r.text}
    />
  );
}
