import { useCallback, useState } from 'react';

/** localStorage 在隱私模式或被封鎖時會丟例外，所有存取都包起來 */
export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeStorage(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 忽略：僅失去跨重新整理的記憶 */
  }
}

export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => readStorage(key, initial));
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const v = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        writeStorage(key, v);
        return v;
      });
    },
    [key],
  );
  return [value, set] as const;
}

/** 清除這個網站存在瀏覽器的所有設定（自建頁面、改過的版面、側欄分類與狀態），回到原始展示畫面 */
export function resetDemoStorage() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k?.startsWith('mimic.')) keys.push(k);
    }
    keys.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* localStorage 不可用時本來就沒有存任何東西 */
  }
}

/** 重置後重新載入首頁（Hash 路由用 #/，一般路由用 /） */
export function reloadHome() {
  if (import.meta.env.VITE_HASH) {
    window.location.hash = '#/p/overview';
    window.location.reload();
  } else {
    window.location.assign('/p/overview');
  }
}
