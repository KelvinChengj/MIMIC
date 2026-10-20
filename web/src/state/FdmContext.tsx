import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { allLayoutPages } from '../blocks/builtin';
import { fetchLamps, fetchVTagDetail } from '../lib/fdm';
import { collectVTagKeys } from '../lib/pages';
import type { Snapshot, VTagDetail } from '../types';
import { useUserPages } from './UserPagesContext';

/** 這次開啟以來向 FDM 發出的請求 */
export interface FdmStats {
  requests: number;
  /** 最近一次請求的時間、項目數與原因 */
  lastAt: number;
  lastTags: number;
  lastKind: 'open' | 'refresh' | 'check' | 'detail';
}

interface FdmValue {
  snapshot: Snapshot;
  /** 重新向 FDM 取值（使用者按重新整理時）；已讀回的下鑽清單也一併清掉，下次進入下鑽頁重新讀 */
  refresh: () => void;
  /** 剛選的 virtual tag 還沒取過值：只查這幾個並併入目前的資料 */
  lookup: (keys: string[]) => void;
  /** 下鑽：由 virtual tag 讀回 InSQL tag 清單（已讀過就用暫存，按重新整理後才重讀） */
  details: Record<string, VTagDetail | null>;
  loadDetail: (key: string) => void;
  stats: FdmStats;
}
const Ctx = createContext<FdmValue | null>(null);

/**
 * FDM 取值時機：
 * - 燈號：開啟網頁時一次、按重新整理時一次（不做定時自動更新）。只取所有頁面燈號綁的 virtual tag，去除重複後合成一次批次請求。
 * - 下鑽：進入下鑽頁時，由那個 virtual tag 讀回 InSQL tag 清單（一次請求，暫存到下次重新整理）。
 */
export function FdmProvider({ children }: { children: ReactNode }) {
  const { pages } = useUserPages();
  const need = () => collectVTagKeys(allLayoutPages(pages));
  const needRef = useRef(need);
  needRef.current = need;
  const seq = useRef(0);

  const [state, setState] = useState(() => {
    const keys = need();
    const now = Date.now();
    return {
      snapshot: fetchLamps(keys, 0, now),
      details: {} as Record<string, VTagDetail | null>,
      stats: { requests: 1, lastAt: now, lastTags: keys.length, lastKind: 'open' } as FdmStats,
    };
  });

  const refresh = useCallback(() => {
    seq.current += 1;
    const keys = needRef.current();
    const now = Date.now();
    const snapshot = fetchLamps(keys, seq.current, now);
    setState((s) => ({ snapshot, details: {}, stats: { requests: s.stats.requests + 1, lastAt: now, lastTags: keys.length, lastKind: 'refresh' } }));
  }, []);

  const lookup = useCallback((keys: string[]) => {
    setState((s) => {
      const missing = [...new Set(keys)].filter((k) => !(k in s.snapshot.readings));
      if (missing.length === 0) return s;
      const got = fetchLamps(missing, seq.current);
      return {
        ...s,
        snapshot: { ...s.snapshot, readings: { ...s.snapshot.readings, ...got.readings } },
        stats: { requests: s.stats.requests + 1, lastAt: got.updatedAt, lastTags: missing.length, lastKind: 'check' },
      };
    });
  }, []);

  const loadDetail = useCallback((key: string) => {
    setState((s) => {
      if (key in s.details) return s;
      const detail = fetchVTagDetail(key, seq.current);
      return {
        ...s,
        details: { ...s.details, [key]: detail },
        stats: { requests: s.stats.requests + 1, lastAt: detail?.at ?? Date.now(), lastTags: detail?.tags.length ?? 0, lastKind: 'detail' },
      };
    });
  }, []);

  const value = useMemo(() => ({ ...state, refresh, lookup, loadDetail }), [state, refresh, lookup, loadDetail]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFdm() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useFdm 必須在 FdmProvider 內使用');
  return v;
}
