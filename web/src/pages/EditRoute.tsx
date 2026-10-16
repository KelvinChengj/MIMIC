import { Navigate, useParams } from 'react-router-dom';
import { NotFound } from '../components/PageParts';
import { pageBySlug } from '../catalog/catalog';
import { useUserPages } from '../state/UserPagesContext';
import { UserPageView } from './UserPageView';

/**
 * /p/:slug/edit
 * - 自建頁面、內建燈號牆頁面：積木畫布編輯畫面
 * - 其他內建頁面（下鑽頁、示意頁）沒有編輯模式，回到該頁
 */
export function EditRoute() {
  const { slug = '' } = useParams();
  const page = useUserPages().getPage(slug);
  if (page) return <UserPageView page={page} edit />;
  if (pageBySlug(slug)) return <Navigate to={`/p/${slug}`} replace />;
  return <NotFound what="可編輯的頁面" />;
}
