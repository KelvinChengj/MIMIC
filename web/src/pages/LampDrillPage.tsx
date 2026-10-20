import { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { SummaryCard, TagTable, type TagRow } from '../components/DrillParts';
import { BackButton, FullscreenButton, NotFound } from '../components/PageParts';
import { formatClock } from '../components/Topbar';
import { SITES, SYSTEMS } from '../catalog/catalog';
import { evaluateLamp, lampVTag, vtagKey } from '../lib/blocks';
import { vtagName } from '../lib/fdm';
import { tagStatus } from '../lib/status';
import { useFdm } from '../state/FdmContext';
import { useTagIndex } from '../state/derived';
import { useUserPages } from '../state/UserPagesContext';
import type { DutyProps, LampProps, VTagRef } from '../types';

/**
 * /p/:slug/b/:blockId
 * - 值班情境的燈號：下鑽頁（摘要卡 + 由 virtual tag 讀回的 InSQL tag 清單）
 * - 戰情指揮官的燈號：不下鑽，進入該值班情境頁
 */
export function LampDrillRoute() {
  const { slug = '', blockId = '' } = useParams();
  const page = useUserPages().getPage(slug);
  const block = page?.blocks.find((b) => b.id === blockId);
  if (!page || !block) return <NotFound what="燈號頁面" />;
  if (block.type === 'duty') return <Navigate to={`/p/${(block.props as DutyProps).page}`} replace />;
  if (block.type !== 'lamp') return <NotFound what="燈號頁面" />;
  const ref = lampVTag(block.props as LampProps);
  return (
    <VTagDrillView
      vref={ref}
      title={block.title || ref?.name || '燈號'}
      crumbs={<Link to={`/p/${slug}`}>{page.title}</Link>}
      back={`/p/${slug}`}
    />
  );
}

/** 舊網址 /p/:slug/:site/:system：轉到該頁對應燈號的下鑽頁，頁面上沒有時轉到 virtual tag 清單的下鑽 */
export function LegacyDrillRoute() {
  const { slug = '', site = '', system = '' } = useParams();
  const page = useUserPages().getPage(slug);
  if (!SITES.some((s) => s.id === site) || !SYSTEMS.some((s) => s.id === system)) return <NotFound what="燈號頁面" />;
  const cell = `cell-${site}-${system}`;
  if (page?.blocks.some((b) => b.id === cell)) return <Navigate to={`/p/${slug}/b/${cell}`} replace />;
  return <Navigate to={`/vtags/${site}/${encodeURIComponent(vtagName(site, system))}`} replace />;
}

/** 下鑽頁：virtual tag 的燈號與規則，加上由它讀回的 InSQL tag 清單（數值、OOC、OOS） */
export function VTagDrillView({ vref, title, crumbs, back }: { vref?: VTagRef; title: string; crumbs: React.ReactNode; back: string }) {
  const index = useTagIndex();
  const { details, loadDetail } = useFdm();
  const r = evaluateLamp(vref, index);
  const key = vref ? vtagKey(vref) : '';
  const loaded = key in details;
  useEffect(() => {
    if (r.info && !loaded) loadDetail(key);
  }, [r.info, loaded, key, loadDetail]);
  const detail = details[key];

  const rows: TagRow[] = (detail?.tags ?? []).map((t) => ({
    key: t.key,
    name: t.name,
    desc: `${t.desc}${t.unit ? ` · ${t.unit}` : ''}`,
    value: t.value,
    decimals: t.decimals,
    status: tagStatus(t),
    isOOC: t.isOOC,
    isOOS: t.isOOS,
  }));

  return (
    <>
      <nav className="crumbs" aria-label="路徑">
        {crumbs}
        <span aria-hidden="true">›</span>
        <strong>{title}</strong>
        <span className="crumbs__spacer" />
        <BackButton fallback={back} />
        <FullscreenButton />
      </nav>
      <div className="stack">
        <SummaryCard status={r.status} title={title} showActions />
        <section className="card vtinfo" aria-label="virtual tag">
          {r.info ? (
            <>
              <span>Virtual tag <code>{r.info.name}</code></span>
              <span>{r.info.desc}</span>
              <span>目前值 <b className="mono">{r.value ?? '—'}</b> → {r.text}</span>
              <span>由 {r.info.sources.length} 個 InSQL tag 組成{detail ? `，清單讀取於 ${formatClock(detail.at)}` : '，讀取中…'}</span>
            </>
          ) : (
            <span>{r.reason === 'empty' ? '這顆燈號還沒有選擇 virtual tag，請到編輯模式設定。' : `上游找不到 virtual tag「${vref?.name}」。`}</span>
          )}
        </section>
        {r.info && <TagTable title="InSQL tag 清單" rows={rows} />}
      </div>
    </>
  );
}
