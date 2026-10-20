import { useParams } from 'react-router-dom';
import { Dot, StatusBadge } from '../components/Lamp';
import { BackButton, NotFound, PageHeader } from '../components/PageParts';
import { pageBySlug } from '../catalog/catalog';
import { useUserPages } from '../state/UserPagesContext';
import { UserPageView } from './UserPageView';

/** /p/:slug：自建頁面與有資料範圍的內建頁面 = 積木畫布（值班情境 / 戰情指揮官）；其餘是示意頁 */
export function PageRoute() {
  const { slug = '' } = useParams();
  const userPage = useUserPages().getPage(slug);
  if (userPage) return <UserPageView page={userPage} edit={false} />;
  const page = pageBySlug(slug);
  if (!page) return <NotFound />;

  // 有資料範圍的內建頁面已在上面由 getPage 以積木畫布呈現
  return (
    <>
      <PageHeader title={page.title} sub="示意頁面" actions={<BackButton />} />
      <section className="card stub">
        <Dot status={page.fixedStatus ?? 'gray'} />
        <div>
          <h2>目前燈號：{page.fixedStatus && <StatusBadge status={page.fixedStatus} />}</h2>
          <p>這個頁面尚未連結 FDM 資料源，燈號為固定示意值。建立連結後即可顯示值班燈號。</p>
        </div>
      </section>
    </>
  );
}
