import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { newId } from '../lib/blocks';
import { defaultSystems } from '../lib/systems';
import type { SystemConfig, SystemLogEntry } from '../types';
import { usePersistentState } from './storage';

/** 示範中的登入者；正式環境由登入資訊取得，且只有系統負責人能編輯 */
export const CURRENT_USER = 'KC';

interface SystemsValue {
  systems: SystemConfig[];
  getSystem: (id: string) => SystemConfig | undefined;
  /** 儲存一個系統的定義，並寫一筆變更紀錄 */
  saveSystem: (next: SystemConfig, note: string) => void;
  createSystem: (name: string, short: string) => string;
  deleteSystem: (id: string) => void;
  log: SystemLogEntry[];
}
const Ctx = createContext<SystemsValue | null>(null);

/**
 * 系統定義。正式環境存在 MIMIC 後端資料庫（所有人共用同一份）；
 * 示範版沒有後端，先存在瀏覽器裡。
 */
export function SystemsProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = usePersistentState<SystemConfig[] | null>('mimic.systems.v1', null);
  const [log, setLog] = usePersistentState<SystemLogEntry[]>('mimic.systems.log.v1', []);
  const systems = useMemo(() => stored ?? defaultSystems(), [stored]);

  const value = useMemo<SystemsValue>(() => {
    const write = (fn: (prev: SystemConfig[]) => SystemConfig[]) => setStored((prev) => fn(prev ?? defaultSystems()));
    const note = (systemId: string, text: string) =>
      setLog((prev) => [{ at: Date.now(), systemId, who: CURRENT_USER, text }, ...prev].slice(0, 200));
    return {
      systems,
      getSystem: (id) => systems.find((s) => s.id === id),
      saveSystem: (next, text) => {
        write((prev) => prev.map((s) => (s.id === next.id ? { ...next, updatedAt: Date.now() } : s)));
        note(next.id, text);
      },
      createSystem: (name, short) => {
        const id = newId('sys');
        const sys: SystemConfig = {
          id, name: name.trim() || '未命名系統', short: short.trim().toUpperCase(), owner: CURRENT_USER,
          staleMinutes: 15, tags: {}, custom: true, updatedAt: Date.now(),
        };
        write((prev) => [...prev, sys]);
        note(id, '建立系統');
        return id;
      },
      deleteSystem: (id) => {
        write((prev) => prev.filter((s) => s.id !== id || !s.custom));
        note(id, '刪除系統');
      },
      log,
    };
  }, [systems, log, setStored, setLog]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSystems() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSystems 必須在 SystemsProvider 內使用');
  return v;
}
