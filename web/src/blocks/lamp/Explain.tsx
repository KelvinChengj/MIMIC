import { SITES } from '../../catalog/catalog';
import { Dot } from '../../components/Lamp';
import { formatValue, ruleLines } from '../../lib/status';
import { useCell } from '../../state/derived';
import type { LampProps, PageBlock, Status } from '../../types';
import { FdmChip } from './fields';
import { useLampResult } from './LampBlock';

function Rules({ current }: { current: Status }) {
  return (
    <>
      <h4>燈號規則（由 FDM 判定，不需設定）</h4>
      <ul className="pv__steps">
        {ruleLines(15).map((l) => (
          <li key={l.status} className={current === l.status ? 'is-decisive' : ''}>
            <Dot status={l.status} /><div><span>{l.text}</span></div>{current === l.status && <em>目前</em>}
          </li>
        ))}
      </ul>
    </>
  );
}

/** 整個情境：列出有問題的 Tag */
function SystemExplain({ block }: { block: PageBlock<LampProps> }) {
  const { site: siteId, system: systemId } = block.props.source!;
  const cell = useCell(siteId, systemId);
  const site = SITES.find((s) => s.id === siteId);
  const sys = cell?.system;
  if (!cell || !sys) return <p className="pv__none">找不到這個廠區或情境。</p>;
  const bad = cell.tags.filter((t) => t.status === 'red' || t.status === 'yellow');
  return (
    <div className="pv">
      <p className="pv__msg">{site?.label} · {sys.name} {sys.short}：OOS {cell.summary.red}、OOC {cell.summary.yellow}、無資料 {cell.summary.gray}，共 {cell.summary.total} 個 Tag</p>
      <h4>有問題的 Tag（{bad.length}）</h4>
      {bad.length === 0 ? <p className="pv__none">目前沒有。</p> : (
        <table className="mini-table"><tbody>
          {bad.map((t) => (
            <tr key={t.name}>
              <td><code>{t.name}</code><small>{t.desc}</small></td>
              <td className="num">{formatValue(t.value, t.decimals)}</td>
              <td><FdmChip valid status={t.status} /></td>
            </tr>
          ))}
        </tbody></table>
      )}
      <Rules current={cell.summary.status} />
    </div>
  );
}

/** 選取的 Tag：每個 Tag 的目前值與 FDM 判定 */
function TagExplain({ block }: { block: PageBlock<LampProps> }) {
  const r = useLampResult(block.props);
  const invalid = r.tags.filter((t) => !t.valid).length;
  return (
    <div className="pv">
      <p className="pv__msg">
        {r.reason === 'empty' ? '還沒有選擇 Tag。' : `共 ${r.tags.length} 個 Tag：OOS ${r.summary.red}、OOC ${r.summary.yellow}、正常 ${r.summary.green}、無資料 ${r.summary.gray}${invalid ? `、無效 ${invalid}` : ''}`}
      </p>
      {r.tags.length > 0 && (
        <table className="mini-table"><tbody>
          {r.tags.map((t) => (
            <tr key={`${t.ref.site}|${t.ref.tag}`}>
              <td><code>{t.ref.tag}</code><small>{t.info ? `${t.info.siteName} · ${t.info.desc}` : t.ref.site}</small></td>
              <td className="num">{t.reading ? formatValue(t.reading.value, t.info?.decimals ?? 1) : '—'}{t.reading?.value != null && t.info?.unit ? ` ${t.info.unit}` : ''}</td>
              <td><FdmChip valid={t.valid} status={t.status} /></td>
            </tr>
          ))}
        </tbody></table>
      )}
      <Rules current={r.status} />
    </div>
  );
}

export function LampExplain({ block }: { block: PageBlock<LampProps> }) {
  return block.props.source ? <SystemExplain block={block} /> : <TagExplain block={block} />;
}
