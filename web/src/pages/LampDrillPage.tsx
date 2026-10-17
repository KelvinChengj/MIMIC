import { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { SummaryCard, TagTable, type TagRow } from '../components/DrillParts';
import { BackButton, FullscreenButton, NotFound } from '../components/PageParts';
import { evaluateLamp, lampTags } from '../lib/blocks';
import { OVERVIEW_HOST, pageHost } from '../blocks/host';
import { pageBySlug } from '../catalog/catalog';
import { useTagIndex } from '../state/derived';
import { useUserPages } from '../state/UserPagesContext';
import type { LampProps, PageBlock } from '../types';

/**
 * 燈號積木的下鑽頁：/p/:slug/b/:blockId
 * 版面與系統下鑽頁相同：上面是摘要卡（燈號與規則），下面是這顆積木選取的 Tag 清單。
 */
export function LampDrillRoute() {
  const { slug = '', blockId = '' } = useParams();
  const page = useUserPages().getPage(slug);
  const block = page?.blocks.find((b) => b.id === blockId && b.type === 'lamp') as PageBlock<LampProps> | undefined;
  if (!page || !block) return <NotFound what="燈號頁面" />;
  // 「整個系統」的燈號已經有系統下鑽頁
  const src = block.props.source;
  if (src) {
    const host = page.builtin ? pageHost(pageBySlug(slug)) : OVERVIEW_HOST;
    return <Navigate to={host.drillTo(src.site, src.system)} replace />;
  }
  return <LampDrillView pageSlug={slug} pageTitle={page.title} block={block} />;
}

function LampDrillView({ pageSlug, pageTitle, block }: { pageSlug: string; pageTitle: string; block: PageBlock<LampProps> }) {
  const index = useTagIndex();
  const r = useMemo(() => evaluateLamp(lampTags(block.props), index), [block.props, index]);
  const rows: TagRow[] = r.tags.map((t) => ({
    key: `${t.ref.site}|${t.ref.tag}`,
    name: t.ref.tag,
    desc: t.info
      ? `${t.info.siteName} · ${t.info.desc}${t.info.unit ? ` · ${t.info.unit}` : ''}`
      : `${t.ref.site.toUpperCase()} · FDM 找不到這個 Tag`,
    value: t.reading?.value ?? null,
    decimals: t.info?.decimals ?? 1,
    status: t.status,
    invalid: !t.valid,
  }));
  const title = block.title || '燈號';

  return (
    <>
      <nav className="crumbs" aria-label="路徑">
        <Link to={`/p/${pageSlug}`}>{pageTitle}</Link>
        <span aria-hidden="true">›</span>
        <strong>{title}</strong>
        <span className="crumbs__spacer" />
        <BackButton fallback={`/p/${pageSlug}`} />
        <FullscreenButton />
      </nav>
      <div className="stack">
        <SummaryCard status={r.status} title={title} showActions />
        <TagTable title="Tag 燈號清單" rows={rows} />
      </div>
    </>
  );
}
