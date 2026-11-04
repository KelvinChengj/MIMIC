import type { PageBackground } from '../types';

/**
 * 內建底圖（範本用的示意圖，不是真實圖面）。頁面只存 builtin:<id>，顯示時才轉成圖檔網址。
 * 幾何位置也匯出給版面使用，燈號才會剛好落在各區塊上。
 */
export const CLEANROOM = {
  id: 'f18p2-3f-cleanroom',
  name: 'F18P2 3F 無塵室（示意圖）',
  width: 1200,
  height: 720,
  bayW: 245,
  bayH: 180,
  rows: [220, 470],
  cols: [90, 355, 620, 885],
  bays: [
    ['A', '黃光區'], ['B', '黃光區'], ['C', '蝕刻區'], ['D', '蝕刻區'],
    ['E', '薄膜區'], ['F', '薄膜區'], ['G', '擴散區'], ['H', '量測區'],
  ] as const,
  mau: { y: 138, w: 180, h: 44 },
};

/** Bay 的位置：上排 A～D、下排 E～H；MAU 0n 在第 n 欄上方，供氣給該欄上下兩個 Bay */
export const bayRect = (i: number) => ({ x: CLEANROOM.cols[i % 4], y: CLEANROOM.rows[Math.floor(i / 4)], w: CLEANROOM.bayW, h: CLEANROOM.bayH });
export const mauRect = (i: number) => ({ x: CLEANROOM.cols[i] + (CLEANROOM.bayW - CLEANROOM.mau.w) / 2, y: CLEANROOM.mau.y, w: CLEANROOM.mau.w, h: CLEANROOM.mau.h });

const FONT = `font-family="'Noto Sans TC','Microsoft JhengHei','PingFang TC',sans-serif"`;

function cleanroomSvg(): string {
  const { width: W, height: H } = CLEANROOM;
  const out: string[] = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" ${FONT}>`);
  out.push(`<rect width="${W}" height="${H}" fill="#f6f7f9"/>`);
  out.push(`<text x="60" y="40" font-size="22" font-weight="700" fill="#2b4764">F18P2 · 3F 無塵室</text>`);
  out.push(`<text x="60" y="64" font-size="13" fill="#6b7280">示意圖 · Bay A～H · 空調機房 MAU 01～04 · 柱位格線 1～10 / A～F</text>`);
  // 建築外框
  out.push(`<rect x="60" y="100" width="1100" height="600" rx="6" fill="#fbfcfd" stroke="#8d99a6" stroke-width="2"/>`);
  // 空調機房
  out.push(`<rect x="76" y="114" width="1068" height="76" rx="4" fill="#eef3f8" stroke="#c9d4df"/>`);
  out.push(`<text x="86" y="130" font-size="11" fill="#5b6b7c">空調機房（MAU）</text>`);
  // 主走道
  out.push(`<text x="610" y="441" font-size="14" fill="#8d99a6" text-anchor="middle" letter-spacing="8">主 走 道</text>`);
  // 風管：MAU → 上排 Bay；穿過走道 → 下排 Bay（畫在 Bay 底下）
  CLEANROOM.cols.forEach((_, i) => {
    const m = mauRect(i);
    const cx = m.x + m.w / 2;
    out.push(`<line x1="${cx}" y1="${m.y + m.h}" x2="${cx}" y2="${CLEANROOM.rows[1]}" stroke="#7fa7cf" stroke-width="3" stroke-dasharray="8 6"/>`);
  });
  // Bay
  CLEANROOM.bays.forEach(([id, area], i) => {
    const r = bayRect(i);
    out.push(`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="4" fill="#ffffff" stroke="#a9b4bf" stroke-width="1.5"/>`);
    out.push(`<text x="${r.x + 14}" y="${r.y + 28}" font-size="17" font-weight="700" fill="#2b4764">Bay ${id}</text>`);
    out.push(`<text x="${r.x + 14}" y="${r.y + 48}" font-size="13" fill="#6b7280">${area}</text>`);
  });
  // MAU 機組
  CLEANROOM.cols.forEach((_, i) => {
    const m = mauRect(i);
    out.push(`<rect x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}" rx="6" fill="#ffffff" stroke="#7fa7cf" stroke-width="1.5"/>`);
    out.push(`<text x="${m.x + 16}" y="${m.y + 28}" font-size="15" font-weight="700" fill="#2b4764">MAU 0${i + 1}</text>`);
  });
  // 柱位格線（淡）與編號
  for (let i = 0; i < 10; i++) {
    const x = 60 + 110 * (i + 0.5);
    out.push(`<line x1="${x}" y1="100" x2="${x}" y2="700" stroke="#c3ccd6" stroke-dasharray="4 6" opacity="0.7"/>`);
    out.push(`<text x="${x}" y="92" font-size="12" fill="#8d99a6" text-anchor="middle">${i + 1}</text>`);
  }
  'ABCDEF'.split('').forEach((r, j) => {
    const y = 150 + 100 * j;
    out.push(`<line x1="60" y1="${y}" x2="1160" y2="${y}" stroke="#c3ccd6" stroke-dasharray="4 6" opacity="0.7"/>`);
    out.push(`<text x="42" y="${y + 4}" font-size="12" fill="#8d99a6" text-anchor="middle">${r}</text>`);
  });
  out.push('</svg>');
  return out.join('');
}

const BUILTIN: Record<string, () => string> = { [CLEANROOM.id]: cleanroomSvg };
const cache = new Map<string, string>();

/** 內建範本底圖（可在編輯模式的「底圖」區套用） */
export const BUILTIN_BACKGROUNDS: PageBackground[] = [
  { src: `builtin:${CLEANROOM.id}`, width: CLEANROOM.width, height: CLEANROOM.height, name: CLEANROOM.name },
];

/** 底圖的實際圖檔網址：builtin:<id> 轉成 SVG data URL，其餘（上傳的 data URL）原樣使用 */
export function backgroundUrl(src: string): string {
  if (!src.startsWith('builtin:')) return src;
  const id = src.slice('builtin:'.length);
  let url = cache.get(id);
  if (!url) {
    const svg = BUILTIN[id]?.() ?? '';
    url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    cache.set(id, url);
  }
  return url;
}
