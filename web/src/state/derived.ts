import { useMemo } from 'react';
import { SYSTEMS, systemById } from '../catalog/catalog';
import { evaluateSystem, worstOf } from '../lib/status';
import type { PageDef, Status } from '../types';
import { useFdm } from './FdmContext';
import { useRules } from './RulesContext';

/** 某廠區 × 系統目前的判定結果 */
export function useCell(siteId: string, systemId: string) {
  const { snapshot } = useFdm();
  const { rules } = useRules();
  return useMemo(() => {
    const sys = systemById(systemId);
    const readings = snapshot.data[siteId]?.[systemId];
    if (!sys || !readings) return null;
    return { sys, rules: rules[systemId], ...evaluateSystem(sys, readings, rules[systemId]) };
  }, [snapshot, rules, siteId, systemId]);
}

/** 頁面（側欄、Explore）上的整體燈號 */
export function usePageStatus() {
  const { snapshot } = useFdm();
  const { rules } = useRules();
  return useMemo(() => {
    return (page: PageDef): Status => {
      if (!page.scope) return page.fixedStatus ?? 'gray';
      const statuses: Status[] = [];
      for (const siteId of page.scope.sites)
        for (const sysId of page.scope.systems) {
          const sys = SYSTEMS.find((s) => s.id === sysId);
          const readings = snapshot.data[siteId]?.[sysId];
          if (sys && readings) statuses.push(evaluateSystem(sys, readings, rules[sysId]).summary.status);
        }
      return worstOf(statuses);
    };
  }, [snapshot, rules]);
}
