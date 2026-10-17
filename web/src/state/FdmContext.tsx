import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { fetchLatest } from '../lib/fdm';
import { collectTagKeys } from '../lib/systems';
import type { Snapshot } from '../types';
import { useSystems } from './SystemsContext';
import { useUserPages } from './UserPagesContext';

/** 這次開啟以來向 FDM 發出的請求 */
export interface FdmStats {
  requests: number;
  /** 最近一次請求的時間、Tag 數與原因 */
  lastAt: number;
  lastTags: number;
  lastKind: 'open' | 'refresh' | 'check';
}

interface FdmValue {
  snapshot: Snapshot;
  /** 重新向 FDM 取值（使用者按重新整理時） */
  refresh: () => void;
  /** 剛加入、還沒取過值的 Tag：只查這幾個並併入目前的資料（檢查 Tag 時） */
  lookup: (keys: string[]) => void;
  stats: FdmStats;
}
const Ctx = createContext<FdmValue | null>(null);

/**
 * FDM 取值只在兩個時機：開啟網頁時一次、使用者按重新整理時一次（不做定時自動更新）。
 * 每次都先彙整「需要的 Tag」，去除重複後合成一次批次請求；所有頁面與積木共用這份結果。
 */
export function FdmProvider({ children }: { children: ReactNode }) {
  const { systems } = useSystems();
  const { pages } = useUserPages();
  const need = () => collectTagKeys(systems, pages);
  const needRef = useRef(need);
  needRef.current = need;
  const seq = useRef(0);

  const [state, setState] = useState(() => {
    const keys = need();
    const now = Date.now();
    return { snapshot: fetchLatest(keys, 0, now), stats: { requests: 1, lastAt: now, lastTags: keys.length, lastKind: 'open' } as FdmStats };
  });

  const refresh = useCallback(() => {
    seq.current += 1;
    const keys = needRef.current();
    const now = Date.now();
    const snapshot = fetchLatest(keys, seq.current, now);
    setState((s) => ({ snapshot, stats: { requests: s.stats.requests + 1, lastAt: now, lastTags: keys.length, lastKind: 'refresh' } }));
  }, []);

  const lookup = useCallback((keys: string[]) => {
    setState((s) => {
      const missing = [...new Set(keys)].filter((k) => !(k in s.snapshot.readings));
      if (missing.length === 0) return s;
      const got = fetchLatest(missing, seq.current);
      return {
        snapshot: { ...s.snapshot, readings: { ...s.snapshot.readings, ...got.readings } },
        stats: { requests: s.stats.requests + 1, lastAt: got.updatedAt, lastTags: missing.length, lastKind: 'check' },
      };
    });
  }, []);

  const value = useMemo(() => ({ ...state, refresh, lookup }), [state, refresh, lookup]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFdm() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useFdm 必須在 FdmProvider 內使用');
  return v;
}
