import { useEffect, useRef, useState } from 'react';
import { useFdm } from '../state/FdmContext';
import { ChatIcon, HelpIcon } from './Icons';
import { Legend } from './Lamp';

const pad = (n: number) => String(n).padStart(2, '0');
export const formatClock = (ms: number) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export function Topbar() {
  const { snapshot } = useFdm();
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
      <span className="topbar__updated" title="最近一次向 FDM 取值的時間（每 30 秒自動更新）">
        更新 <time>{formatClock(snapshot.updatedAt)}</time>
      </span>
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
            <p className="popover__note">資料來自 FDM；紅燈需連續多點超出紅色管制才成立，點數可在編輯模式調整。</p>
          </div>
        )}
      </div>
      <span className="avatar" title="KC">KC</span>
    </header>
  );
}
