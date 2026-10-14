import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Overrides } from '../../lib/blocks';

interface Sim {
  overrides: Overrides;
  setValue: (name: string, v: number | null) => void;
  clear: (name?: string) => void;
}

const NONE: Sim = { overrides: {}, setValue: () => undefined, clear: () => undefined };
const Ctx = createContext<Sim>(NONE);

/**
 * 編輯燈號積木時的「模擬值」：手動指定資料點的數值來試算燈號，
 * 不會存進頁面。Provider 只包在編輯對話框內，所以畫布與檢視頁一律使用 FDM 真實數值。
 */
export function LampSimProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Overrides>({});
  const setValue = useCallback((name: string, v: number | null) => setOverrides((o) => ({ ...o, [name]: v })), []);
  const clear = useCallback(
    (name?: string) =>
      setOverrides((o) => {
        if (!name) return {};
        const { [name]: _drop, ...rest } = o;
        void _drop;
        return rest;
      }),
    [],
  );
  const value = useMemo(() => ({ overrides, setValue, clear }), [overrides, setValue, clear]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useLampSim = () => useContext(Ctx);
