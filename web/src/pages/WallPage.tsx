import { Fragment } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Legend, Lamp } from '../components/Lamp';
import { BackButton, EditLink, FullscreenButton, PageHeader } from '../components/PageParts';
import { SITES, SYSTEMS } from '../catalog/catalog';
import { STATUS_META, tileText } from '../lib/status';
import { useCell } from '../state/derived';
import type { PageDef } from '../types';

function Tile({ slug, siteId, systemId }: { slug: string; siteId: string; systemId: string }) {
  const cell = useCell(siteId, systemId);
  const site = SITES.find((s) => s.id === siteId)!;
  if (!cell) return <div className="tile tile--gray" />;
  const { summary, sys, rules } = cell;
  const text = tileText(summary, rules.staleMinutes);
  return (
    <Link
      to={`/p/${slug}/${siteId}/${systemId}`}
      className={`tile tile--${summary.status}`}
      aria-label={`${site.label} ${sys.name}：${STATUS_META[summary.status].badge}，${text}`}
    >
      <Lamp status={summary.status} />
      <span className="tile__text">{text}</span>
    </Link>
  );
}

/** 燈號牆：廠區 × 系統 */
export function WallPage({ page }: { page: PageDef }) {
  const [params, setParams] = useSearchParams();
  const scope = page.scope!;
  const only = params.get('site');
  const sites = SITES.filter((s) => scope.sites.includes(s.id) && (!only || s.id === only));
  const systems = SYSTEMS.filter((s) => scope.systems.includes(s.id));
  const filtered = only && sites.length > 0 && sites.length < scope.sites.length;

  return (
    <>
      <PageHeader
        title={page.title}
        sub="廠區 → 系統"
        actions={
          <>
            <BackButton />
            <FullscreenButton />
            <EditLink to={`/p/${page.slug}/edit`} />
          </>
        }
      />
      <section className="card wall" aria-label="燈號牆">
        <div className="card__head">
          <h2>燈號牆 · 廠區 × 系統</h2>
          {filtered && (
            <button className="chip-btn" onClick={() => setParams({})}>
              只顯示 {sites[0].name} · 顯示全部
            </button>
          )}
          <span className="card__hint">點選燈號可下鑽至設備</span>
        </div>
        <div className="wall__scroll">
          <div className="wall__grid" style={{ gridTemplateColumns: `104px repeat(${systems.length}, minmax(104px, 1fr))` }}>
            <div />
            {systems.map((sys) => (
              <div className="wall__col" key={sys.id}>{sys.name}</div>
            ))}
            {sites.map((site) => (
              <Fragment key={site.id}>
                <div className="wall__rowhead">{site.label}</div>
                {systems.map((sys) => (
                  <Tile key={sys.id} slug={page.slug} siteId={site.id} systemId={sys.id} />
                ))}
              </Fragment>
            ))}
          </div>
        </div>
      </section>
      <Legend />
    </>
  );
}
