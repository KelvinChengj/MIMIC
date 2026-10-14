import { useParams } from 'react-router-dom';
import { Dot, StatusBadge } from '../components/Lamp';
import { BackButton, NotFound, PageHeader } from '../components/PageParts';
import { pageBySlug } from '../catalog/catalog';
import { DrillView } from './DrillPage';
import { WallPage } from './WallPage';

/** /p/:slug：依頁面設定決定顯示燈號牆、單一系統下鑽，或示意頁 */
export function PageRoute() {
  const { slug = '' } = useParams();
  const page = pageBySlug(slug);
  if (!page) return <NotFound />;

  if (!page.scope) {
    return (
      <>
        <PageHeader title={page.title} sub="示意頁面" actions={<BackButton />} />
        <section className="card stub">
          <Dot status={page.fixedStatus ?? 'gray'} />
          <div>
            <h2>目前燈號：{page.fixedStatus && <StatusBadge status={page.fixedStatus} />}</h2>
            <p>這個頁面尚未連結 FDM 資料源，燈號為固定示意值。建立連結後即可顯示廠區 × 系統的燈號牆。</p>
          </div>
        </section>
      </>
    );
  }

  const { sites, systems } = page.scope;
  if (sites.length === 1 && systems.length === 1) {
    return <DrillView page={page} siteId={sites[0]} systemId={systems[0]} embedded />;
  }
  return <WallPage page={page} />;
}
