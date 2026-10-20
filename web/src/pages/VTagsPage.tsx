import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Dot } from '../components/Lamp';
import { PageHeader } from '../components/PageParts';
import { formatClock } from '../components/Topbar';
import { findVTag } from '../lib/blocks';
import { VTAGS } from '../lib/fdm';
import { LAMP_CODE, STATUS_META, vtagStatus } from '../lib/status';
import { useFdm } from '../state/FdmContext';
import { useTagIndex, useVTagRefs } from '../state/derived';
import { VTagDrillView } from './LampDrillPage';

const KIND = { open: '開啟網頁', refresh: '按重新整理', check: '選取新的 virtual tag', detail: '下鑽讀回 InSQL tag' } as const;
const CODES = Object.entries(LAMP_CODE).map(([code, st]) => `${code} = ${STATUS_META[st].label}`).join('、');

/**
 * /vtags：virtual tag 清單（唯讀）。virtual tag 由上游（FDM / InSQL）定義，MIMIC 只讀取：
 * 值就是燈號代碼，可讀回組成它的 InSQL tag。
 */
export function VTagsPage() {
  const index = useTagIndex();
  const refs = useVTagRefs();
  const { stats } = useFdm();
  const navigate = useNavigate();
  const to = (siteId: string, name: string) => `/vtags/${siteId}/${encodeURIComponent(name)}`;

  return (
    <>
      <PageHeader title="Virtual Tag 清單" sub="值班情境燈號的信號來源，由上游定義，MIMIC 只讀取" />

      <section className="card sysnote">
        <ul>
          <li><b>燈號</b>：virtual tag 的值就是燈號代碼（{CODES}；沒有值為灰）。判定在上游完成，MIMIC 不重算。</li>
          <li><b>下鑽</b>：點值班情境的燈號，由 virtual tag 讀回組成它的 InSQL tag 清單（數值、OOC、OOS）供查原因。</li>
          <li><b>戰情指揮官</b>：不直接看 virtual tag，每顆燈代表一個值班情境頁，取該頁最差燈號。</li>
          <li>
            <b>FDM 取值</b>：開啟網頁與按重新整理時，把所有頁面燈號用到的 virtual tag 去除重複後一次批次請求；下鑽時才讀回 InSQL tag。
            最近一次：{KIND[stats.lastKind]}，<span className="mono">{formatClock(stats.lastAt)}</span>，{stats.lastTags} 筆。
          </li>
        </ul>
      </section>

      <section className="card card--flush">
        <table className="explore-table systems-table">
          <thead>
            <tr>
              <th>Virtual tag</th>
              <th>說明</th>
              <th className="num">InSQL tag</th>
              <th className="num">目前值</th>
              <th>燈號</th>
              <th className="num">引用頁面</th>
            </tr>
          </thead>
          <tbody>
            {VTAGS.map((v) => {
              const value = index.get(v.key)?.value;
              const st = vtagStatus(value);
              const pages = new Set((refs.get(v.key) ?? []).map((r) => r.slug)).size;
              return (
                <tr key={v.key} onClick={() => navigate(to(v.siteId, v.name))}>
                  <td><Link to={to(v.siteId, v.name)} onClick={(e) => e.stopPropagation()}><code>{v.name}</code></Link></td>
                  <td>{v.desc}</td>
                  <td className="num">{v.sources.length}</td>
                  <td className="num">{value === undefined ? <span className="muted" title="沒有頁面用到，這次沒有取值">未取值</span> : (value ?? '—')}</td>
                  <td>{value === undefined ? '—' : <span className="vtstate"><Dot status={st} />{STATUS_META[st].badge}</span>}</td>
                  <td className="num">{pages}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}

/** /vtags/:site/:name：單一 virtual tag 的下鑽 */
export function VTagDrillRoute() {
  const { site = '', name = '' } = useParams();
  const v = findVTag(site, decodeURIComponent(name));
  const ref = { site, name: v?.name ?? decodeURIComponent(name) };
  const { lookup } = useFdm();
  // 沒有任何頁面用到的 virtual tag 開啟時沒有取值：只查這一個
  useEffect(() => {
    if (v) lookup([v.key]);
  }, [v, lookup]);
  return <VTagDrillView vref={ref} title={ref.name} crumbs={<Link to="/vtags">Virtual Tag 清單</Link>} back="/vtags" />;
}
