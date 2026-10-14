import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BlockStack } from '../blocks/BlockView';
import { wallPageBlocks } from '../blocks/builtin';
import { Legend } from '../components/Lamp';
import { BackButton, EditLink, FullscreenButton, PageHeader } from '../components/PageParts';
import { SITES } from '../catalog/catalog';
import type { PageDef } from '../types';

/** 內建燈號牆頁面：頁首 + 一個「燈號牆」積木 */
export function WallPage({ page }: { page: PageDef }) {
  const [params, setParams] = useSearchParams();
  const only = params.get('site');
  const scope = page.scope!;
  const blocks = useMemo(() => wallPageBlocks(page, only), [page, only]);
  const filtered = !!only && scope.sites.includes(only) && scope.sites.length > 1;

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
      {filtered && (
        <p className="filter-note">
          <button className="chip-btn" onClick={() => setParams({})}>
            只顯示 {SITES.find((s) => s.id === only)?.name} · 顯示全部
          </button>
        </p>
      )}
      <BlockStack blocks={blocks} host={{ drillBase: page.slug }} />
      <Legend />
    </>
  );
}
