import { SITES, SYSTEMS } from '../../catalog/catalog';
import { describeRules, formatValue } from '../../lib/status';
import { useCell } from '../../state/derived';
import type { RunResult } from '../../lib/expr';
import { Dot } from '../../components/Lamp';
import type { LampProps, PageBlock } from '../../types';
import { fmtNum } from '../../lib/expr';
import { useLampResult } from './LampBlock';
import { useLampSim } from './sim';

const runText = (r: RunResult, kind: 'cond' | 'value' = 'cond'): string => {
  if (r.state === 'empty') return '未設定';
  if (r.state === 'error') return `⚠ ${r.message}`;
  if (r.state === 'nodata') return `資料點 ${r.varName} 無資料`;
  if (typeof r.value === 'boolean') return `${r.traced} → ${r.value ? '成立' : '不成立'}`;
  return kind === 'value' ? `${r.traced} = ${fmtNum(r.value)}` : `${r.traced} → ${r.value}`;
};

/** 系統燈號：列出該系統的判定規則與有問題的 Tag */
function SystemExplain({ block }: { block: PageBlock<LampProps> }) {
  const { site: siteId, system: systemId } = block.props.source!;
  const cell = useCell(siteId, systemId);
  const site = SITES.find((s) => s.id === siteId);
  const sys = SYSTEMS.find((s) => s.id === systemId);
  if (!cell || !sys) return <p className="pv__none">找不到這個廠區或系統。</p>;
  const bad = cell.tags.filter((t) => t.status === 'red' || t.status === 'yellow');
  return (
    <div className="pv">
      <p className="pv__msg">{site?.label} · {sys.name} {sys.short}：紅 {cell.summary.red}、黃 {cell.summary.yellow}、灰 {cell.summary.gray}，共 {cell.summary.total} 個 Tag</p>
      <h4>判定規則（系統共用，可在「門檻設定」調整）</h4>
      <ul className="pv__steps">
        {describeRules(sys, cell.rules).map((l) => (
          <li key={l.status} className={cell.summary.status === l.status ? 'is-decisive' : ''}>
            <Dot status={l.status} /><div><span>{l.text}</span></div>{cell.summary.status === l.status && <em>目前</em>}
          </li>
        ))}
      </ul>
      <h4>有問題的 Tag（{bad.length}）</h4>
      {bad.length === 0 ? <p className="pv__none">目前沒有。</p> : (
        <table className="mini-table"><tbody>
          {bad.map((t) => (
            <tr key={t.name}><td><Dot status={t.status} /></td><td><code>{t.name}</code><small>{t.desc}</small></td><td className="num">{formatValue(t.value, t.metricDef?.decimals ?? 1)}</td></tr>
          ))}
        </tbody></table>
      )}
    </div>
  );
}

/** 判斷過程：資料點目前數值、紅黃條件代入數值後的結果、哪一顆在亮 */
export function LampExplain({ block }: { block: PageBlock<LampProps> }) {
  return block.props.source ? <SystemExplain block={block} /> : <CustomExplain block={block} />;
}

function CustomExplain({ block }: { block: PageBlock<LampProps> }) {
  const result = useLampResult(block.props);
  const sim = useLampSim();
  const simulating = result.vars.filter((v) => v.simulated);
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
      {simulating.length > 0 && (
        <p className="pv__sim" role="status">
          <b>模擬中</b>：{simulating.map((v) => `${v.name} = ${v.value == null ? '無資料' : v.value}`).join('、')}（只在這個視窗試算，不會存檔）
          <button className="link-btn" onClick={() => sim.clear()}>清除</button>
        </p>
      )}
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
                <td className={`num ${v.simulated ? 'is-sim' : ''}`}>{v.value == null ? '—' : v.value.toFixed(v.tag?.decimals ?? 2)}{v.tag?.unit && v.value != null ? ` ${v.tag.unit}` : ''}{v.simulated && <small>模擬值</small>}</td>
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
