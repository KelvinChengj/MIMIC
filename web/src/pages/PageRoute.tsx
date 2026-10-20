import { useParams } from 'react-router-dom';
import { NotFound } from '../components/PageParts';
import { useUserPages } from '../state/UserPagesContext';
import { UserPageView } from './UserPageView';

/** /p/:slug：自建頁面與內建頁面都是積木畫布（值班情境 / 戰情指揮官） */
export function PageRoute() {
  const { slug = '' } = useParams();
  const page = useUserPages().getPage(slug);
  return page ? <UserPageView page={page} edit={false} /> : <NotFound />;
}
