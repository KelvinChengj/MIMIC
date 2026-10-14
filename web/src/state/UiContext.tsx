import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePersistentState } from './storage';

interface UiValue {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  /** 全螢幕看板：隱藏側欄與頂欄 */
  kiosk: boolean;
  enterKiosk: () => void;
  exitKiosk: () => void;
  toast: string | null;
  showToast: (msg: string) => void;
}
const Ctx = createContext<UiValue | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setCollapsed] = usePersistentState('mimic.sidebar.collapsed', false);
  const [kiosk, setKiosk] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number>();

  const toggleSidebar = useCallback(() => setCollapsed((c) => !c), [setCollapsed]);

  const enterKiosk = useCallback(() => {
    setKiosk(true);
    // 瀏覽器可能拒絕全螢幕（iframe、權限）；拒絕時仍保留隱藏框架的看板模式
    document.documentElement.requestFullscreen?.().catch(() => undefined);
  }, []);
  const exitKiosk = useCallback(() => {
    setKiosk(false);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!kiosk) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && exitKiosk();
    const onFs = () => !document.fullscreenElement && setKiosk(false);
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFs);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFs);
    };
  }, [kiosk, exitKiosk]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2800);
  }, []);

  const value = useMemo(
    () => ({ sidebarCollapsed, toggleSidebar, kiosk, enterKiosk, exitKiosk, toast, showToast }),
    [sidebarCollapsed, toggleSidebar, kiosk, enterKiosk, exitKiosk, toast, showToast],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUi() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useUi 必須在 UiProvider 內使用');
  return v;
}
