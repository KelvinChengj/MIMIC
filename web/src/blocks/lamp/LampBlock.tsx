import { useMemo } from 'react';
import { SITES } from '../../catalog/catalog';
import { StatusTile } from '../../components/StatusTile';
import { evaluateLamp, lampTags, type LampResult } from '../../lib/blocks';
import { STATUS_META, tileText } from '../../lib/status';
import { useCell, useTagIndex } from '../../state/derived';
import type { LampProps } from '../../types';
import { SCALE } from '../layout';
import type { RenderProps } from '../types';

/** 依 FDM 最新回傳判定燈號 */
export function useLampResult(props: LampProps): LampResult {
  const index = useTagIndex();
  return useMemo(() => evaluateLamp(lampTags(props), index), [props, index]);
}

/** 整個情境：顯示該廠區該情境的整體燈號與「3 台異常」，點了下鑽到 Tag 清單 */
function SystemLampRender({ block, host }: RenderProps<LampProps>) {
  const { site: siteId, system: systemId } = block.props.source!;
  const cell = useCell(siteId, systemId);
  const scale = SCALE[block.size];
  const site = SITES.find((s) => s.id === siteId);
  const sys = cell?.system;
  const name = block.title || `${site?.label ?? siteId} ${sys?.name ?? systemId}`;
  if (!cell) return <StatusTile fill scale={scale} status="gray" label={`${name}：找不到資料來源`} title={scale === 1 ? undefined : name} text="無資料來源" />;
  const text = cell.tags.length === 0 ? '尚未設定 Tag' : tileText(cell.summary, cell.system.staleMinutes);
  const status = cell.summary.status;
  return (
    <StatusTile
      fill
      scale={scale}
      status={status}
      to={host.drillTo(siteId, systemId)}
      title={scale === 1 ? undefined : name}
      value={scale === 4 ? text : undefined}
      text={scale === 4 ? STATUS_META[status].badge : text}
      label={`${site?.label ?? siteId} ${sys?.name ?? systemId}：${STATUS_META[status].badge}，${text}`}
    />
  );
}

/** 選取的 Tag：單一 Tag 顯示數值，多個 Tag 顯示統計；大尺寸數值放大、狀態文字在下方 */
function TagLampRender({ block, host }: RenderProps<LampProps>) {
  const r = useLampResult(block.props);
  const scale = SCALE[block.size];
  return (
    <StatusTile
      fill
      scale={scale}
      status={r.status}
      to={host.blockTo?.(block.id)}
      label={`${block.title}：${r.label}${r.text !== r.label ? `，${r.text}` : ''}`}
      title={scale === 1 ? undefined : block.title}
      value={scale === 4 && r.reason === 'ok' ? r.text : undefined}
      text={scale === 4 && r.reason === 'ok' ? r.label : r.text}
    />
  );
}

export function LampRender(props: RenderProps<LampProps>) {
  return props.block.props.source ? <SystemLampRender {...props} /> : <TagLampRender {...props} />;
}
