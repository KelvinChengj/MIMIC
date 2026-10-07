// 驗證並淨化前端送來的頁面設定，避免寫入非預期結構。
export const COLORS = ['red', 'yellow', 'green', 'gray'];
export const OPS = ['>', '>=', '<', '<=', '==', '!=', 'between_in', 'between_out'];

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function validatePage(input) {
  if (!input || typeof input !== 'object') return { error: '格式錯誤' };
  const title = str(input.title, 60).trim();
  if (!title) return { error: '頁面名稱不可為空' };
  if (!Array.isArray(input.lights) || input.lights.length > 200) return { error: '燈號數量不合法' };

  const lights = [];
  for (const l of input.lights) {
    if (!l || typeof l !== 'object') return { error: '燈號格式錯誤' };
    if (!Array.isArray(l.rules) || l.rules.length > 50) return { error: '規則數量不合法' };
    const rules = l.rules.map((r) => ({
      id: str(r.id, 20),
      color: COLORS.includes(r.color) && r.color !== 'gray' ? r.color : 'red',
      mode: r.mode === 'all' ? 'all' : 'any',
      conds: (Array.isArray(r.conds) ? r.conds : []).slice(0, 30).map((c) => ({
        tag: str(c.tag, 80),
        op: OPS.includes(c.op) ? c.op : '>',
        value: num(c.value),
        value2: num(c.value2),
      })),
    }));
    lights.push({
      id: str(l.id, 20),
      label: str(l.label, 40),
      fallback: COLORS.includes(l.fallback) && l.fallback !== 'gray' ? l.fallback : 'green',
      rules,
    });
  }
  return { page: { title, lights } };
}
