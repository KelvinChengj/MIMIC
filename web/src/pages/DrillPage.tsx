import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BlockStack } from '../blocks/BlockView';
import { drillPageBlocks } from '../blocks/builtin';
import { pageHost } from '../blocks/host';
import { BackButton, FullscreenButton, NotFound } from '../components/PageParts';
import { SITES, pageBySlug } from '../catalog/catalog';
import { useSystems } from '../state/SystemsContext';
import type { PageDef } from '../types';

export function DrillRoute() {
  const { slug = '', site = '', system = '' } = useParams();
  const page = pageBySlug(slug);
  const { getSystem } = useSystems();
  // 全廠總覽底下也能下鑽到在「情境管理」新增的情境
  const ok = page?.scope?.sites.includes(site) && (page.scope.systems.includes(system) || (slug === 'overview' && !!getSystem(system)));
  if (!page || !ok) return <NotFound what="燈號頁面" />;
  return <DrillView page={page} siteId={site} systemId={system} />;
}

/** 內建下鑽頁：麵包屑 + 「系統摘要」積木 + 「Tag 清單」積木 */
export function DrillView({ page, siteId, systemId, embedded = false }: { page: PageDef; siteId: string; systemId: string; embedded?: boolean }) {
  const site = SITES.find((s) => s.id === siteId);
  const sys = useSystems().getSystem(systemId);
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
