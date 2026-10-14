import { Outlet } from 'react-router-dom';
import { useUi } from '../state/UiContext';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CloseIcon } from './Icons';

export function Layout() {
  const { kiosk, exitKiosk, toast } = useUi();
  return (
    <div className={`app ${kiosk ? 'app--kiosk' : ''}`}>
      {!kiosk && <Sidebar />}
      <div className="app__main">
        {!kiosk && <Topbar />}
        <main className="content" id="main">
          <Outlet />
        </main>
      </div>
      {kiosk && (
        <button className="kiosk-exit" onClick={exitKiosk}>
          <CloseIcon size={16} /> 離開全螢幕（Esc）
        </button>
      )}
      <div className="toast-region" role="status" aria-live="polite">
        {toast && <div className="toast">{toast}</div>}
      </div>
    </div>
  );
}
