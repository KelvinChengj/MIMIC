// FDM 廠務運轉數據資料源轉接層。
// - 預設使用內建模擬資料（無需任何設定即可 demo）。
// - 設定 FDM_API_URL 後改為呼叫真實 FDM：
//     GET {FDM_API_URL}/tags            -> [{ tag, name, unit, area }]
//     GET {FDM_API_URL}/values?tags=a,b -> { "a": { value, ts }, "b": null }
//   （若實際 API 格式不同，只需改這個檔案。）

import { MOCK_TAGS, mockValue } from '../public/shared/fdm-mock.js';

const FDM_API_URL = process.env.FDM_API_URL?.replace(/\/$/, '');
const FDM_API_TOKEN = process.env.FDM_API_TOKEN;

async function realFetch(path) {
  const res = await fetch(FDM_API_URL + path, {
    headers: FDM_API_TOKEN ? { Authorization: `Bearer ${FDM_API_TOKEN}` } : {},
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`FDM ${res.status}`);
  return res.json();
}

export const fdmMode = () => (FDM_API_URL ? 'live' : 'mock');

export async function listTags() {
  if (FDM_API_URL) return realFetch('/tags');
  return MOCK_TAGS.map(({ tag, name, unit, area }) => ({ tag, name, unit, area }));
}

// 回傳 { tag: { value, ts } | null }；null 代表無資料（燈號會顯示灰色）
export async function getValues(tags) {
  if (FDM_API_URL) {
    return realFetch(`/values?tags=${encodeURIComponent(tags.join(','))}`);
  }
  const now = Date.now();
  const out = {};
  for (const tag of tags) {
    const def = MOCK_TAGS.find((d) => d.tag === tag);
    const value = def ? mockValue(def, now) : null;
    out[tag] = value === null ? null : { value, ts: now };
  }
  return out;
}
