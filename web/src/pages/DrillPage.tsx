import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BlockStack } from '../blocks/BlockView';
import { drillPageBlocks } from '../blocks/builtin';
import { pageHost } from '../blocks/host';
import { BackButton, FullscreenButton, NotFound } from '../components/PageParts';
import { SITES, SYSTEMS, pageBySlug } from '../catalog/catalog';
import type { PageDef } from '../types';

export function DrillRoute() {
  const { slug = '', site = '', system = '' } = useParams();
  const page = pageBySlug(slug);
  const ok = page?.scope?.sites.includes(site) && page.scope.systems.includes(system);
  if (!page || !ok) return <NotFound what="燈號頁面" />;
  return <DrillView page={page} siteId={site} systemId={system} />;
}

/** 內建下鑽頁：麵包屑 + 「系統摘要」積木 + 「Tag 清單」積木 */
export function DrillView({ page, siteId, systemId, embedded = false }: { page: PageDef; siteId: string; systemId: string; embedded?: boolean }) {
  const site = SITES.find((s) => s.id === siteId);
  const sys = SYSTEMS.find((s) => s.id === systemId);
  const base = `/p/${page.slug}`;
  const host = useMemo(() => pageHost(page), [page]);
  const blocks = useMemo(() => drillPageBlocks(siteId, systemId), [siteId, systemId]);
  if (!site || !sys) return <NotFound what="燈號頁面" />;

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
      <BlockStack blocks={blocks} host={host} />
    </>
  );
}
