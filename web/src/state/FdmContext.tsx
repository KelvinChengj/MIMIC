import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { fetchSnapshot } from '../lib/fdm';
import type { Snapshot } from '../types';

interface FdmValue {
  snapshot: Snapshot;
  /** 重新向 FDM 取值 */
  refresh: () => void;
}
const Ctx = createContext<FdmValue | null>(null);

const AUTO_REFRESH_MS = 30_000;

export function FdmProvider({ children }: { children: ReactNode }) {
  const seq = useRef(0);
  const [snapshot, setSnapshot] = useState<Snapshot>(() => fetchSnapshot(0));
  const refresh = useCallback(() => {
    seq.current += 1;
    setSnapshot(fetchSnapshot(seq.current));
  }, []);

  useEffect(() => {
    const id = window.setInterval(refresh, AUTO_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  const value = useMemo(() => ({ snapshot, refresh }), [snapshot, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFdm() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useFdm 必須在 FdmProvider 內使用');
  return v;
}
