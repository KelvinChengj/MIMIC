import { useMemo } from 'react';
import { StatusTile } from '../../components/StatusTile';
import { SITES, SYSTEMS } from '../../catalog/catalog';
import { evaluateLamp, type BlockResult } from '../../lib/blocks';
import { STATUS_META, tileText } from '../../lib/status';
import { useCell, useValueGetter } from '../../state/derived';
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

/** 資料來源是「系統燈號」：顯示該廠區該系統的整體燈號與「3 台異常」，點了下鑽到 Tag 清單 */
function SystemLampRender({ block, host }: RenderProps<LampProps>) {
  const { site: siteId, system: systemId } = block.props.source!;
  const cell = useCell(siteId, systemId);
  const scale = SCALE[block.size];
  const site = SITES.find((s) => s.id === siteId);
  const sys = SYSTEMS.find((s) => s.id === systemId);
  const name = block.title || `${site?.label ?? siteId} ${sys?.name ?? systemId}`;
  if (!cell) return <StatusTile fill scale={scale} status="gray" label={`${name}：找不到資料來源`} title={scale === 1 ? undefined : name} text="無資料來源" />;
  const text = tileText(cell.summary, cell.rules.staleMinutes);
  const status = cell.summary.status;
  return (
    <StatusTile
      fill
      scale={scale}
      status={status}
      to={host.drillTo(siteId, systemId)}
      title={scale === 1 ? undefined : name}
      text={text}
      label={`${site?.label ?? siteId} ${sys?.name ?? systemId}：${STATUS_META[status].badge}，${text}`}
    />
  );
}

export function LampRender(props: RenderProps<LampProps>) {
  return props.block.props.source ? <SystemLampRender {...props} /> : <CustomLampRender {...props} />;
}

function CustomLampRender({ block }: RenderProps<LampProps>) {
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
