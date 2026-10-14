import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useUi } from '../state/UiContext';
import { BackIcon, EditIcon, FullscreenIcon } from './Icons';

/** 有站內上一頁就回上一頁，直接開網址進來時才回首頁 */
export function useBack(fallback = '/') {
  const navigate = useNavigate();
  const { key } = useLocation();
  return () => (key !== 'default' ? navigate(-1) : navigate(fallback));
}

export function PathChip() {
  const { pathname } = useLocation();
  return <code className="path-chip">mimic{pathname}</code>;
}

export function PageHeader({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        <p className="page-head__sub">
          {sub}
          {sub && <span className="page-head__sep" aria-hidden="true" />}
          <PathChip />
        </p>
      </div>
      <div className="page-head__actions">{actions}</div>
    </div>
  );
}

export function BackButton({ fallback }: { fallback?: string }) {
  const back = useBack(fallback);
  return (
    <button className="btn" onClick={back}>
      <BackIcon size={16} /> Back
    </button>
  );
}

export function FullscreenButton() {
  const { enterKiosk } = useUi();
  return (
    <button className="btn" onClick={enterKiosk}>
      <FullscreenIcon size={16} /> Full screen
    </button>
  );
}

export function EditLink({ to }: { to: string }) {
  return (
    <Link className="btn btn--primary" to={to}>
      <EditIcon size={16} /> Edit
    </Link>
  );
}

export function NotFound({ what = '頁面' }: { what?: string }) {
  return (
    <div className="empty-state">
      <h1>找不到{what}</h1>
      <p>這個網址沒有對應的內容，可能已被移除或網址有誤。</p>
      <Link className="btn btn--primary" to="/">回到全廠總覽</Link>
    </div>
  );
}

/** 重新整理按鈕按下後轉圈 0.7 秒給點回饋 */
export function useSpin(): [boolean, () => void] {
  const [spin, setSpin] = useState(false);
  useEffect(() => {
    if (!spin) return;
    const id = window.setTimeout(() => setSpin(false), 700);
    return () => window.clearTimeout(id);
  }, [spin]);
  return [spin, () => setSpin(true)];
}
