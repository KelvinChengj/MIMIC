import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Dot, Lamp, StatusBadge } from '../components/Lamp';
import { RefreshIcon } from '../components/Icons';
import { BackButton, EditLink, FullscreenButton, NotFound, PathChip, useSpin } from '../components/PageParts';
import { SITES, SYSTEMS, pageBySlug } from '../catalog/catalog';
import { describeRules, formatValue } from '../lib/status';
import { useCell } from '../state/derived';
import { useFdm } from '../state/FdmContext';
import type { PageDef, Status } from '../types';

const SEVERITY: Record<Status, number> = { red: 0, yellow: 1, green: 2, gray: 3 };

export function DrillRoute() {
  const { slug = '', site = '', system = '' } = useParams();
  const page = pageBySlug(slug);
  const ok = page?.scope?.sites.includes(site) && page.scope.systems.includes(system);
  if (!page || !ok) return <NotFound what="燈號頁面" />;
  return <DrillView page={page} siteId={site} systemId={system} />;
}

export function DrillView({ page, siteId, systemId, embedded = false }: { page: PageDef; siteId: string; systemId: string; embedded?: boolean }) {
  const cell = useCell(siteId, systemId);
  const { refresh } = useFdm();
  const [spin, startSpin] = useSpin();
  const [filter, setFilter] = useState<'abnormal' | 'all' | null>(null);
  const site = SITES.find((s) => s.id === siteId);
  const sys = SYSTEMS.find((s) => s.id === systemId);
  if (!cell || !site || !sys) return <NotFound what="燈號頁面" />;

  const { summary, tags, rules } = cell;
  const abnormalCount = summary.red + summary.yellow;
  const effective = filter ?? (abnormalCount > 0 ? 'abnormal' : 'all');
  const shown = tags
    .filter((t) => effective === 'all' || t.status === 'red' || t.status === 'yellow')
    .sort((a, b) => SEVERITY[a.status] - SEVERITY[b.status]);
  const lines = describeRules(sys, rules);
  const base = `/p/${page.slug}`;

  return (
    <>
      <nav className="crumbs" aria-label="路徑">
        {embedded ? (
          <strong>{page.title}</strong>
        ) : (
          <>
            <Link to={base}>{page.title}</Link>
            <span aria-hidden="true">›</span>
            <Link to={`${base}?site=${siteId}`}>{site.label}</Link>
            <span aria-hidden="true">›</span>
            <strong>{sys.name} {sys.short}</strong>
          </>
        )}
        <span className="crumbs__spacer" />
        <BackButton />
        <FullscreenButton />
      </nav>

      <section className={`card summary summary--${summary.status}`}>
        <Lamp status={summary.status} size={78} />
        <div className="summary__body">
          <h1>
            {site.label} · {sys.name} {sys.short} <StatusBadge status={summary.status} />
          </h1>
          <ul className="rule-lines">
            {lines.map((l) => (
              <li key={l.status} title={l.title || undefined}>
                <Dot status={l.status} />
                <b>{{ red: '紅', yellow: '黃', green: '綠', gray: '灰' }[l.status]}</b>
                <span>{l.text}</span>
              </li>
            ))}
          </ul>
          <PathChip />
        </div>
        <div className="summary__actions">
          <button className="btn btn--primary" onClick={() => { startSpin(); refresh(); }}>
            <RefreshIcon size={16} className={spin ? 'spin' : ''} /> Refresh Values
          </button>
          <EditLink to={`${base}/edit?system=${systemId}`} />
        </div>
      </section>

      <section className="card">
        <div className="card__head">
          <h2>Tag 燈號清單</h2>
          <div className="seg" role="group" aria-label="篩選">
            <button className={effective === 'abnormal' ? 'is-on' : ''} aria-pressed={effective === 'abnormal'} onClick={() => setFilter('abnormal')}>
              僅顯示異常{abnormalCount > 0 && <em>{abnormalCount}</em>}
            </button>
            <button className={effective === 'all' ? 'is-on' : ''} aria-pressed={effective === 'all'} onClick={() => setFilter('all')}>
              全部 Tag<em>{tags.length}</em>
            </button>
          </div>
        </div>
        <table className="tag-table">
          <thead>
            <tr>
              <th>Tag name</th>
              <th>Description</th>
              <th className="num">Value</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((t) => (
              <tr key={t.name} className={t.status === 'red' ? 'is-red' : ''}>
                <td><code>{t.name}</code></td>
                <td>{t.desc}{t.metricDef?.unit ? ` · ${t.metricDef.unit}` : ''}</td>
                <td className={`num val val--${t.status}`}>
                  <span className="val__in">
                    <Dot status={t.status} />
                    <span className="val__num">{formatValue(t.value, t.metricDef?.decimals ?? 1)}</span>
                  </span>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={3} className="tag-table__empty">
                  目前沒有異常的 Tag。
                  <button className="link-btn" onClick={() => setFilter('all')}>查看全部 Tag</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
