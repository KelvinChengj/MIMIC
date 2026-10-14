import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { SYSTEMS } from '../catalog/catalog';
import type { MetricRule, RulesConfig, SystemDef, SystemRules } from '../types';
import { usePersistentState } from './storage';

export const defaultRulesFor = (sys: SystemDef): SystemRules => ({
  consecutive: sys.defaultConsecutive,
  staleMinutes: sys.defaultStaleMinutes,
  metrics: Object.fromEntries(sys.metrics.map((m) => [m.code, { ...m.defaults }])),
});

export const defaultRules = (): RulesConfig => Object.fromEntries(SYSTEMS.map((s) => [s.id, defaultRulesFor(s)]));

/** 已儲存的設定可能缺少新增的系統 / 量測類型，與預設值合併後才使用 */
function merge(saved: RulesConfig | undefined): RulesConfig {
  const base = defaultRules();
  if (!saved) return base;
  for (const sys of SYSTEMS) {
    const s = saved[sys.id];
    if (!s) continue;
    base[sys.id] = {
      consecutive: s.consecutive ?? base[sys.id].consecutive,
      staleMinutes: s.staleMinutes ?? base[sys.id].staleMinutes,
      metrics: { ...base[sys.id].metrics, ...s.metrics },
    };
  }
  return base;
}

interface RulesValue {
  rules: RulesConfig;
  saveRules: (patch: Partial<RulesConfig>) => void;
}
const Ctx = createContext<RulesValue | null>(null);

export function RulesProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = usePersistentState<RulesConfig | undefined>('mimic.rules.v1', undefined);
  const rules = useMemo(() => merge(saved), [saved]);
  const saveRules = useCallback(
    (patch: Partial<RulesConfig>) => setSaved((prev) => ({ ...merge(prev), ...patch }) as RulesConfig),
    [setSaved],
  );
  const value = useMemo(() => ({ rules, saveRules }), [rules, saveRules]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRules() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useRules 必須在 RulesProvider 內使用');
  return v;
}

export const cloneMetricRules = (m: Record<string, MetricRule>) =>
  Object.fromEntries(Object.entries(m).map(([k, v]) => [k, { ...v }]));
