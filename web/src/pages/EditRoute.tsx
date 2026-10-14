import { Navigate, useLocation, useParams } from 'react-router-dom';
import { NotFound } from '../components/PageParts';
import { pageBySlug } from '../catalog/catalog';
import { useUserPages } from '../state/UserPagesContext';
import { UserPageView } from './UserPageView';

/**
 * /p/:slug/edit
 * - 自建頁面、內建燈號牆頁面：積木畫布編輯畫面
 * - 單一系統的內建下鑽頁：沒有畫布，導向門檻設定（舊連結仍可用）
 */
export function EditRoute() {
  const { slug = '' } = useParams();
  const { search } = useLocation();
  const page = useUserPages().getPage(slug);
  if (page) return <UserPageView page={page} edit />;
  if (pageBySlug(slug)?.scope) return <Navigate to={`/p/${slug}/thresholds${search}`} replace />;
  return <NotFound what="可編輯的頁面" />;
}
