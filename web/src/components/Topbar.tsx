import { useEffect, useRef, useState } from 'react';
import { useFdm } from '../state/FdmContext';
import { ChatIcon, HelpIcon, RefreshIcon } from './Icons';
import { useSpin } from './PageParts';
import { Legend } from './Lamp';

const pad = (n: number) => String(n).padStart(2, '0');
export const formatClock = (ms: number) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export function Topbar() {
  const { snapshot, refresh, stats } = useFdm();
  const [spin, startSpin] = useSpin();
  const [help, setHelp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!help) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setHelp(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setHelp(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [help]);

  return (
    <header className="topbar">
      <span className="topbar__updated" title={`開啟網頁或按重新整理時才向 FDM 取值（不自動更新）\n最近一次請求：${stats.lastTags} 筆`}>
        更新 <time>{formatClock(snapshot.updatedAt)}</time>
      </span>
      <button className="icon-btn icon-btn--outline" aria-label="重新向 FDM 取值" title="重新向 FDM 取值" onClick={() => { startSpin(); refresh(); }}>
        <RefreshIcon className={spin ? 'spin' : ''} />
      </button>
      <button className="icon-btn icon-btn--outline" aria-label="AI 助理（尚未開放）" title="AI 助理（尚未開放）" disabled>
        <ChatIcon />
      </button>
      <div className="popover-wrap" ref={ref}>
        <button className="icon-btn icon-btn--outline" aria-label="燈號說明" aria-expanded={help} onClick={() => setHelp((h) => !h)}>
          <HelpIcon />
        </button>
        {help && (
          <div className="popover" role="dialog" aria-label="燈號說明">
            <h2>燈號說明</h2>
            <Legend />
            <p className="popover__note">值班燈號 = virtual tag 的燈號代碼（2 紅、1 黃、0 綠）；指揮官燈號取值班情境最差。開啟網頁或按重新整理時才向 FDM 取值。</p>
          </div>
        )}
      </div>
      <span className="avatar" title="KC">KC</span>
    </header>
  );
}
