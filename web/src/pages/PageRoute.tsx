import { useParams } from 'react-router-dom';
import { Dot, StatusBadge } from '../components/Lamp';
import { BackButton, NotFound, PageHeader } from '../components/PageParts';
import { pageBySlug } from '../catalog/catalog';
import { useUserPages } from '../state/UserPagesContext';
import { DrillView } from './DrillPage';
import { UserPageView } from './UserPageView';

/** /p/:slug：自建頁面與內建燈號牆 = 積木畫布；單一系統 = 下鑽頁；其餘是示意頁 */
export function PageRoute() {
  const { slug = '' } = useParams();
  const userPage = useUserPages().getPage(slug);
  if (userPage) return <UserPageView page={userPage} edit={false} />;
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
            <p>這個頁面尚未連結 FDM 資料源，燈號為固定示意值。建立連結後即可顯示廠區 × 情境的燈號牆。</p>
          </div>
        </section>
      </>
    );
  }

  // 範圍只有一個格子 = 下鑽頁；多個格子的燈號牆頁面已在上面由 getPage 以積木畫布呈現
  const { sites, systems } = page.scope;
  return <DrillView page={page} siteId={sites[0]} systemId={systems[0]} embedded />;
}
