import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Dot, Lamp } from '../components/Lamp';
import { PlayIcon } from '../components/Icons';
import { NotFound, PageHeader, useBack } from '../components/PageParts';
import { SITES, SYSTEMS, pageBySlug } from '../catalog/catalog';
import { STATUS_META, describeRules, evaluateSystem, formatValue, tileText, validateMetric, type Summary } from '../lib/status';
import { cloneMetricRules, defaultRulesFor, useRules } from '../state/RulesContext';
import { useFdm } from '../state/FdmContext';
import { useUi } from '../state/UiContext';
import type { MetricRule, RulesConfig, Status, SystemDef, SystemRules } from '../types';

type Field = keyof MetricRule;

const clone = (r: SystemRules): SystemRules => ({ ...r, metrics: cloneMetricRules(r.metrics) });

interface TestRow {
  siteId: string;
  before: Summary;
  after: Summary;
}
interface TagDelta {
  siteId: string;
  name: string;
  desc: string;
  value: number | null;
  decimals: number;
  before: Status;
  after: Status;
}
interface TestResult {
  systemId: string;
  /** 試算當下的草稿內容，用來判斷試算結果是否已過期 */
  key: string;
  at: number;
  rows: TestRow[];
  deltas: TagDelta[];
  staleMinutes: number;
}

export function EditRoute() {
  const { slug = '' } = useParams();
  const page = pageBySlug(slug);
  if (!page?.scope) return <NotFound what="可編輯的頁面" />;
  return <EditView slug={slug} title={page.title} systemIds={page.scope.systems} siteIds={page.scope.sites} />;
}

function EditView({ slug, title, systemIds, siteIds }: { slug: string; title: string; systemIds: string[]; siteIds: string[] }) {
  const { rules, saveRules } = useRules();
  const { snapshot } = useFdm();
  const { showToast } = useUi();
  const navigate = useNavigate();
  const back = useBack(`/p/${slug}`);
  const [params, setParams] = useSearchParams();

  const systems = SYSTEMS.filter((s) => systemIds.includes(s.id));
  const [draft, setDraft] = useState<RulesConfig>(() =>
    Object.fromEntries(systems.map((s) => [s.id, clone(rules[s.id])])),
  );
  const activeId = systems.some((s) => s.id === params.get('system')) ? params.get('system')! : systems[0].id;
  const sys = systems.find((s) => s.id === activeId)!;
  const cur = draft[activeId];
  const [result, setResult] = useState<TestResult | null>(null);

  const dirtyIds = systems.filter((s) => JSON.stringify(draft[s.id]) !== JSON.stringify(rules[s.id])).map((s) => s.id);
  const errors = useMemo(
    () => Object.fromEntries(sys.metrics.map((m) => [m.code, validateMetric(cur.metrics[m.code] ?? {})])),
    [sys, cur],
  );
  const hasError = Object.values(errors).some((e) => e.length > 0);
  const anyInvalidElsewhere = systems.some(
    (s) => s.id !== activeId && s.metrics.some((m) => validateMetric(draft[s.id].metrics[m.code] ?? {}).length > 0),
  );

  const update = (fn: (r: SystemRules) => void) =>
    setDraft((d) => {
      const next = clone(d[activeId]);
      fn(next);
      return { ...d, [activeId]: next };
    });

  const setMetric = (code: string, field: Field, raw: string) =>
    update((r) => {
      const m = { ...(r.metrics[code] ?? {}) };
      if (raw === '' || Number.isNaN(Number(raw))) delete m[field];
      else m[field] = Number(raw);
      r.metrics[code] = m;
    });

  const runTest = () => {
    const rows: TestRow[] = [];
    const deltas: TagDelta[] = [];
    for (const siteId of siteIds) {
      const readings = snapshot.data[siteId][activeId];
      const before = evaluateSystem(sys, readings, rules[activeId]);
      const after = evaluateSystem(sys, readings, cur);
      rows.push({ siteId, before: before.summary, after: after.summary });
      after.tags.forEach((t, i) => {
        if (t.status !== before.tags[i].status)
          deltas.push({
            siteId, name: t.name, desc: t.desc, value: t.value, decimals: t.metricDef?.decimals ?? 1,
            before: before.tags[i].status, after: t.status,
          });
      });
    }
    setResult({ systemId: activeId, key: JSON.stringify(cur), at: Date.now(), rows, deltas, staleMinutes: cur.staleMinutes });
  };

  const save = () => {
    saveRules(Object.fromEntries(systems.map((s) => [s.id, draft[s.id]])));
    showToast('已儲存燈號門檻');
    navigate(`/p/${slug}`);
  };
  const [confirmLeave, setConfirmLeave] = useState(false);
  const cancel = () => {
    if (dirtyIds.length && !confirmLeave) return setConfirmLeave(true);
    back();
  };

  const resultVisible = result && result.systemId === activeId;
  const resultStale = resultVisible && result.key !== JSON.stringify(cur);

  return (
    <>
      <nav className="crumbs" aria-label="路徑">
        <Link to={`/p/${slug}`}>{title}</Link>
        <span aria-hidden="true">›</span>
        <strong>編輯模式</strong>
      </nav>
      <PageHeader
        title={<>編輯燈號 <span className="mode-pill">編輯模式</span></>}
        sub="設定黃、紅燈門檻，按 Test 以目前 FDM 數值試算"
        actions={
          <>
            <button className={`btn ${confirmLeave ? 'btn--danger' : ''}`} onClick={cancel} onBlur={() => setConfirmLeave(false)}>
              {confirmLeave ? '放棄未儲存的變更？' : 'Cancel'}
            </button>
            <button className="btn btn--primary" onClick={save} disabled={hasError || anyInvalidElsewhere || dirtyIds.length === 0}>
              Save{dirtyIds.length > 0 && ` (${dirtyIds.length})`}
            </button>
          </>
        }
      />

      {systems.length > 1 && (
        <div className="tabs" role="tablist" aria-label="系統">
          {systems.map((s) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={s.id === activeId}
              className={s.id === activeId ? 'is-on' : ''}
              onClick={() => setParams({ system: s.id }, { replace: true })}
            >
              {s.name} <span className="tabs__short">{s.short}</span>
              {dirtyIds.includes(s.id) && <i className="tabs__dirty" title="尚未儲存" />}
            </button>
          ))}
        </div>
      )}

      <div className="edit-grid">
        <section className="card edit-form" aria-label="門檻設定">
          <div className="card__head">
            <h2>{sys.name} {sys.short} · 判定設定</h2>
            <button className="link-btn" onClick={() => update((r) => Object.assign(r, defaultRulesFor(sys)))}>還原預設</button>
          </div>

          <div className="fields">
            <label className="field">
              <span>紅燈需連續成立</span>
              <span className="field__input">
                <input type="number" min={1} max={6} step={1} value={cur.consecutive}
                  onChange={(e) => update((r) => { r.consecutive = Math.min(6, Math.max(1, Math.round(Number(e.target.value) || 1))); })} />
                <em>點</em>
              </span>
            </label>
            <label className="field">
              <span>超過幾分鐘無資料判灰燈</span>
              <span className="field__input">
                <input type="number" min={1} step={1} value={cur.staleMinutes}
                  onChange={(e) => update((r) => { r.staleMinutes = Math.max(1, Math.round(Number(e.target.value) || 1)); })} />
                <em>分</em>
              </span>
            </label>
          </div>

          <MetricTable sys={sys} rules={cur} errors={errors} onChange={setMetric} />

          <div className="preview">
            <h3>規則預覽</h3>
            <ul className="rule-lines">
              {describeRules(sys, cur).map((l) => (
                <li key={l.status}><Dot status={l.status} /><b>{STATUS_META[l.status].label}</b><span title={l.title || undefined}>{l.text}</span></li>
              ))}
            </ul>
          </div>
        </section>

        <section className="card test" aria-label="Test 試算">
          <div className="card__head">
            <h2>Test 試算</h2>
          </div>
          <p className="test__hint">
            以目前 FDM 最新值與近 6 點歷史，套用左側<strong>尚未儲存</strong>的門檻，和已儲存的設定比較。
          </p>
          <button className="btn btn--primary btn--block" onClick={runTest} disabled={hasError}>
            <PlayIcon size={16} /> Test
          </button>
          {hasError && <p className="msg msg--error">門檻有錯誤，修正後才能試算。</p>}

          {!resultVisible && !hasError && <p className="test__empty">尚未試算。調整門檻後按 Test。</p>}
          {resultVisible && (
            <div className="test__result" aria-live="polite">
              {resultStale && <p className="msg msg--warn">門檻已變更，以下為舊的試算結果，請重新按 Test。</p>}
              <ul className="test__sites">
                {result.rows.map((r) => {
                  const site = SITES.find((s) => s.id === r.siteId)!;
                  const changed = r.before.status !== r.after.status;
                  return (
                    <li key={r.siteId}>
                      <Lamp status={r.after.status} size={28} />
                      <div>
                        <strong>{site.label}</strong>
                        <small>{tileText(r.after, result.staleMinutes)}</small>
                      </div>
                      <span className={`delta ${changed ? 'delta--changed' : ''}`}>
                        {changed ? (
                          <>
                            <Dot status={r.before.status} /> {STATUS_META[r.before.status].badge} → <Dot status={r.after.status} /> {STATUS_META[r.after.status].badge}
                          </>
                        ) : (
                          '無變化'
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <h3>燈號有變動的 Tag（{result.deltas.length}）</h3>
              {result.deltas.length === 0 ? (
                <p className="test__empty">與已儲存的設定相比，沒有任何 Tag 燈號改變。</p>
              ) : (
                <table className="mini-table">
                  <thead><tr><th>Tag</th><th className="num">Value</th><th>變化</th></tr></thead>
                  <tbody>
                    {result.deltas.slice(0, 14).map((d) => (
                      <tr key={d.siteId + d.name}>
                        <td><code>{d.name}</code><small>{SITES.find((s) => s.id === d.siteId)!.name}</small></td>
                        <td className="num">{formatValue(d.value, d.decimals)}</td>
                        <td className="nowrap"><Dot status={d.before} /> → <Dot status={d.after} /> {STATUS_META[d.after].badge}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {result.deltas.length > 14 && <p className="test__empty">另有 {result.deltas.length - 14} 筆未列出。</p>}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

const COLS: { field: Field; head: string; level: 'yellow' | 'red' }[] = [
  { field: 'yellowHigh', head: '上限 >', level: 'yellow' },
  { field: 'yellowLow', head: '下限 <', level: 'yellow' },
  { field: 'redHigh', head: '上限 >', level: 'red' },
  { field: 'redLow', head: '下限 <', level: 'red' },
];

function MetricTable({ sys, rules, errors, onChange }: {
  sys: SystemDef;
  rules: SystemRules;
  errors: Record<string, string[]>;
  onChange: (code: string, field: Field, raw: string) => void;
}) {
  return (
    <table className="metric-table">
      <thead>
        <tr>
          <th rowSpan={2}>量測項目</th>
          <th colSpan={2} className="grp grp--yellow"><Dot status="yellow" /> 黃燈（部分異常）</th>
          <th colSpan={2} className="grp grp--red"><Dot status="red" /> 紅燈（異常）</th>
        </tr>
        <tr>
          {COLS.map((c) => <th key={c.field} className={`sub sub--${c.level}`}>{c.head}</th>)}
        </tr>
      </thead>
      <tbody>
        {sys.metrics.map((m) => {
          const r = rules.metrics[m.code] ?? {};
          const errs = errors[m.code] ?? [];
          return (
            <FragmentRow key={m.code} errs={errs} cols={5}>
              <td>
                <strong>{m.label}</strong>
                <small><code>.{m.code}</code>{m.unit && ` · ${m.unit}`}</small>
              </td>
              {COLS.map((c) => (
                <td key={c.field}>
                  <input
                    type="number" step="any" inputMode="decimal" placeholder="不設"
                    aria-label={`${m.label} ${c.level === 'yellow' ? '黃燈' : '紅燈'}${c.head}`}
                    aria-invalid={errs.length > 0}
                    value={r[c.field] ?? ''}
                    onChange={(e) => onChange(m.code, c.field, e.target.value)}
                  />
                </td>
              ))}
            </FragmentRow>
          );
        })}
      </tbody>
    </table>
  );
}

function FragmentRow({ children, errs, cols }: { children: ReactNode; errs: string[]; cols: number }) {
  return (
    <Fragment>
      <tr className={errs.length ? 'has-error' : ''}>{children}</tr>
      {errs.length > 0 && (
        <tr className="error-row"><td colSpan={cols}>{errs.join('；')}</td></tr>
      )}
    </Fragment>
  );
}
