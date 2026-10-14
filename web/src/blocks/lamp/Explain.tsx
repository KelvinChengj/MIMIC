import type { RunResult } from '../../lib/expr';
import { Dot } from '../../components/Lamp';
import type { LampProps, PageBlock } from '../../types';
import { fmtNum } from '../../lib/expr';
import { useLampResult } from './LampBlock';

const runText = (r: RunResult, kind: 'cond' | 'value' = 'cond'): string => {
  if (r.state === 'empty') return '未設定';
  if (r.state === 'error') return `⚠ ${r.message}`;
  if (r.state === 'nodata') return `資料點 ${r.varName} 無資料`;
  if (typeof r.value === 'boolean') return `${r.traced} → ${r.value ? '成立' : '不成立'}`;
  return kind === 'value' ? `${r.traced} = ${fmtNum(r.value)}` : `${r.traced} → ${r.value}`;
};

/** 判斷過程：資料點目前數值、紅黃條件代入數值後的結果、哪一顆在亮 */
export function LampExplain({ block }: { block: PageBlock<LampProps> }) {
  const result = useLampResult(block.props);
  const p = block.props;
  const row = (dot: 'red' | 'yellow' | 'green', title: string, body: string, on: boolean) => (
    <li className={on ? 'is-decisive' : ''}>
      <Dot status={dot} />
      <div><b>{title}</b><span>{body}</span></div>
      {on && <em>目前亮這顆</em>}
    </li>
  );
  return (
    <div className="pv">
      <p className="pv__msg">{result.message}</p>

      <h4>資料點目前數值</h4>
      {result.vars.length === 0 ? (
        <p className="pv__none">尚未新增資料點</p>
      ) : (
        <table className="mini-table">
          <tbody>
            {result.vars.map((v) => (
              <tr key={v.name}>
                <td><span className="chip chip--var">{v.name}</span></td>
                <td>{v.tag ? <><code>{v.tag.name}</code><small>{v.tag.siteName} · {v.tag.desc}</small></> : <small>尚未選擇</small>}</td>
                <td className="num">{v.value == null ? '—' : v.value.toFixed(v.tag?.decimals ?? 2)}{v.tag?.unit && v.value != null ? ` ${v.tag.unit}` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h4>判斷過程（由上往下，第一個成立的亮燈）</h4>
      <ul className="pv__steps">
        {row('red', '紅燈條件', runText(result.red), result.status === 'red')}
        {row('yellow', '黃燈條件', runText(result.yellow), result.status === 'yellow')}
        {row('green', '以上都不成立', '亮綠燈', result.status === 'green')}
      </ul>
      {p.valueExpr.trim() && (
        <>
          <h4>顯示值</h4>
          <p className="pv__value"><code>{p.valueExpr}</code><br />{runText(result.value, 'value')}{result.unit ? ` ${result.unit}` : ''}</p>
        </>
      )}
    </div>
  );
}
