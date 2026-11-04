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

interface WaterNode {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  sub: string;
  /** 有燈號的處理單元（自來水、Fab 只是流程節點） */
  lamp: boolean;
}

/**
 * 純水／廢水水平衡拓樸圖：上排純水製造、右側供水到 Fab，下排四股廢水，
 * 酸鹼與有機廢水回收回原水池，研磨與含氟廢水處理後放流。流量為設計值（m³/h），收支平衡：
 * 補水 600 ＝ 放流 520 ＋ 損耗 80；回收 400 ／ 用水 1,000。
 */
export const WATER = {
  id: 'f18p1-water-balance',
  name: 'F18P1 純水／廢水水平衡（示意圖）',
  width: 1200,
  height: 720,
  nodes: {
    src: { x: 30, y: 120, w: 120, h: 70, title: '自來水補水', sub: '600 m³/h', lamp: false },
    raw: { x: 190, y: 120, w: 150, h: 70, title: '原水池', sub: '液位', lamp: true },
    pre: { x: 380, y: 120, w: 150, h: 70, title: '前處理', sub: 'TOC', lamp: true },
    ro: { x: 570, y: 120, w: 150, h: 70, title: 'RO 逆滲透', sub: '流量', lamp: true },
    edi: { x: 760, y: 120, w: 150, h: 70, title: 'EDI 混床', sub: '溫度', lamp: true },
    pol: { x: 950, y: 120, w: 150, h: 70, title: '拋光', sub: 'TOC · 電阻率', lamp: true },
    loop: { x: 950, y: 250, w: 150, h: 70, title: '供水迴路', sub: '壓力', lamp: true },
    fab: { x: 800, y: 380, w: 370, h: 70, title: '製程機台（Fab）', sub: '用水 1,000 m³/h', lamp: false },
    rcl: { x: 190, y: 250, w: 150, h: 70, title: '回收水', sub: '導電度', lamp: true },
    bal: { x: 380, y: 372, w: 380, h: 86, title: '水平衡', sub: '', lamp: true },
    org: { x: 360, y: 560, w: 140, h: 70, title: '有機廢水', sub: 'TOC', lamp: true },
    aw: { x: 530, y: 560, w: 140, h: 70, title: '酸鹼廢水', sub: 'pH', lamp: true },
    cmp: { x: 700, y: 560, w: 140, h: 70, title: '研磨廢水', sub: 'SS', lamp: true },
    fw: { x: 870, y: 560, w: 140, h: 70, title: '含氟廢水', sub: 'F⁻', lamp: true },
    dis: { x: 1040, y: 560, w: 140, h: 70, title: '放流水', sub: 'pH · 520 m³/h', lamp: true },
  } satisfies Record<string, WaterNode>,
};
export type WaterNodeId = keyof typeof WATER.nodes;

/** 燈號放在節點方框內右側（小尺寸燈號 48 × 44） */
export const waterLampAt = (id: WaterNodeId) => {
  const n = WATER.nodes[id];
  return { x: n.x + n.w - 52, y: n.y + Math.round((n.h - 44) / 2) };
};

function waterSvg(): string {
  const { width: W, height: H, nodes: N } = WATER;
  const C = { upw: '#3f7cc0', ww: '#8a6a3e', rcl: '#4b7f4a', loss: '#8d99a6' };
  const out: string[] = [];
  const line = (pts: [number, number][], color: string, dash = false) =>
    out.push(`<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round"${dash ? ' stroke-dasharray="9 6"' : ''} marker-end="url(#a-${color.slice(1)})"/>`);
  const seg = (pts: [number, number][], color: string) =>
    out.push(`<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round"/>`);
  const label = (x: number, y: number, text: string, color: string, anchor = 'middle') =>
    out.push(`<text x="${x}" y="${y}" font-size="12.5" font-weight="700" fill="${color}" text-anchor="${anchor}" stroke="#ffffff" stroke-width="4" paint-order="stroke">${text}</text>`);

  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" ${FONT}>`);
  out.push('<defs>');
  for (const c of Object.values(C))
    out.push(`<marker id="a-${c.slice(1)}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker>`);
  out.push('</defs>');
  out.push(`<rect width="${W}" height="${H}" fill="#f6f7f9"/>`);
  out.push(`<text x="30" y="64" font-size="13" fill="#6b7280">示意圖 · 流量為設計值（m³/h）· 藍：純水　棕：廢水　綠：回收</text>`);
  // 區域
  out.push(`<rect x="365" y="96" width="750" height="239" rx="10" fill="#eaf1f9" stroke="#c6d6e8"/>`);
  out.push(`<text x="377" y="113" font-size="12" font-weight="700" fill="#3f7cc0">純水系統（UPW）</text>`);
  out.push(`<rect x="345" y="488" width="845" height="222" rx="10" fill="#f6efe5" stroke="#e2d3bd"/>`);
  out.push(`<text x="357" y="506" font-size="12" font-weight="700" fill="#8a6a3e">廢水處理</text>`);

  // 純水：補水 → 原水池 → 前處理 → RO → EDI → 拋光 → 供水迴路 → Fab
  line([[150, 155], [188, 155]], C.upw);
  line([[340, 155], [378, 155]], C.upw);
  label(359, 180, '1,000', C.upw);
  line([[530, 155], [568, 155]], C.upw);
  line([[720, 155], [758, 155]], C.upw);
  line([[910, 155], [948, 155]], C.upw);
  line([[1025, 190], [1025, 248]], C.upw);
  line([[1025, 320], [1025, 378]], C.upw);
  label(1035, 356, 'UPW 1,000', C.upw, 'start');
  // 損耗
  line([[1150, 380], [1150, 348]], C.loss);
  label(1190, 340, '損耗 80', C.loss, 'end');
  // Fab → 四股廢水（集水管）
  seg([[985, 450], [985, 520], [430, 520]], C.ww);
  for (const [x, v] of [[430, '100'], [600, '300'], [770, '300'], [940, '220']] as const) {
    line([[x, 520], [x, 558]], C.ww);
    label(x + 8, 514, v, C.ww, 'start');
  }
  // 研磨＋含氟 → 放流
  seg([[770, 630], [770, 680], [1110, 680]], C.ww);
  seg([[940, 630], [940, 680]], C.ww);
  line([[1110, 680], [1110, 632]], C.ww);
  label(940, 700, '研磨 300 ＋ 含氟 220 → 放流 520', C.ww);
  // 酸鹼＋有機 → 回收水 → 原水池
  seg([[600, 630], [600, 680], [265, 680], [265, 595]], C.rcl);
  seg([[360, 595], [265, 595]], C.rcl);
  line([[265, 595], [265, 322]], C.rcl, true);
  label(430, 674, '酸鹼 300', C.rcl);
  label(312, 588, '有機 100', C.rcl);
  line([[265, 250], [265, 192]], C.rcl, true);
  label(275, 226, '回收 400', C.rcl, 'start');

  // 節點
  for (const [id, n] of Object.entries(N)) {
    const plain = !n.lamp;
    out.push(`<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${plain ? 35 : 8}" fill="${plain ? '#eef1f4' : '#ffffff'}" stroke="${plain ? '#a9b4bf' : '#8fa3b8'}" stroke-width="1.5"/>`);
    if (id === 'bal') {
      out.push(`<text x="${n.x + 14}" y="${n.y + 26}" font-size="15" font-weight="700" fill="#2b4764">水平衡（設計）</text>`);
      out.push(`<text x="${n.x + 14}" y="${n.y + 50}" font-size="13" fill="#3d4b59">補水 600 ＝ 放流 520 ＋ 損耗 80</text>`);
      out.push(`<text x="${n.x + 14}" y="${n.y + 71}" font-size="13" fill="#3d4b59">回收 400 ／ 用水 1,000 → 回收率 40%</text>`);
      continue;
    }
    const tx = plain ? n.x + n.w / 2 : n.x + 12;
    const anchor = plain ? 'middle' : 'start';
    out.push(`<text x="${tx}" y="${n.y + 30}" font-size="15" font-weight="700" fill="#2b4764" text-anchor="${anchor}">${n.title}</text>`);
    out.push(`<text x="${tx}" y="${n.y + 51}" font-size="12" fill="#6b7280" text-anchor="${anchor}">${n.sub}</text>`);
  }
  out.push('</svg>');
  return out.join('');
}

/**
 * 台電入口到高壓迴路的單線圖（由上而下）：
 * 台電 161 kV 兩回線 → 161 kV GIS 受電站 → 主變壓器 MTR-1／MTR-2 → 22.8 kV Bus A／Bus B（聯絡斷路器常開）
 * → 高壓迴路一／二（中間常開點，開環運轉）→ 次變電站 SS-1～SS-4；緊急發電機併 Bus B。
 */
export const POWER = {
  id: 'f18p2-hv-single-line',
  name: 'F18P2 台電受電至高壓迴路單線圖（示意圖）',
  width: 1200,
  height: 720,
  /** 有燈號的設備：方框（燈號放框內右側）或點位（燈號左上角座標） */
  boxes: {
    tpca: { x: 250, y: 96, w: 200, h: 60, title: '台電 一回線', sub: '161 kV · 60 Hz' },
    tpcb: { x: 750, y: 96, w: 200, h: 60, title: '台電 二回線', sub: '161 kV · 60 Hz' },
    gis: { x: 200, y: 190, w: 800, h: 60, title: '161 kV GIS 受電站', sub: 'SF₆ 氣壓 · 局部放電' },
    mtr1: { x: 250, y: 290, w: 200, h: 80, title: '主變壓器 MTR-1', sub: '161/22.8 kV · 60 MVA' },
    mtr2: { x: 750, y: 290, w: 200, h: 80, title: '主變壓器 MTR-2', sub: '161/22.8 kV · 60 MVA' },
    gen: { x: 1040, y: 280, w: 140, h: 70, title: '緊急發電機', sub: 'GEN · 2 MW' },
    ss1: { x: 215, y: 590, w: 170, h: 70, title: '次變電站 SS-1', sub: 'Fab 黃光' },
    ss2: { x: 405, y: 590, w: 170, h: 70, title: '次變電站 SS-2', sub: 'Fab 蝕刻' },
    ss3: { x: 625, y: 590, w: 170, h: 70, title: '次變電站 SS-3', sub: 'CUB 冰水主機' },
    ss4: { x: 815, y: 590, w: 170, h: 70, title: '次變電站 SS-4', sub: 'UPW／廢水' },
  },
  points: {
    busa: { x: 130, y: 370, title: '22.8 kV Bus A' },
    busb: { x: 960, y: 370, title: '22.8 kV Bus B' },
    tie: { x: 576, y: 434, title: '聯絡斷路器' },
    loop1: { x: 212, y: 458, title: '高壓迴路一' },
    loop2: { x: 940, y: 458, title: '高壓迴路二' },
  },
};
export type PowerNodeId = keyof typeof POWER.boxes | keyof typeof POWER.points;

export function powerLampAt(id: PowerNodeId): { x: number; y: number; title: string } {
  if (id in POWER.boxes) {
    const b = POWER.boxes[id as keyof typeof POWER.boxes];
    return { x: b.x + b.w - 52, y: b.y + Math.round((b.h - 44) / 2), title: b.title };
  }
  return POWER.points[id as keyof typeof POWER.points];
}

function powerSvg(): string {
  const { width: W, height: H, boxes: B } = POWER;
  const C = { hv: '#6b4fa0', mv: '#3f7cc0', loop: '#2b7a78', gen: '#7b8794' };
  const out: string[] = [];
  const wire = (pts: [number, number][], color: string, w = 3) =>
    out.push(`<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linejoin="round"/>`);
  /** 斷路器：線上的小方框；open＝常開（空心、虛線框） */
  const cb = (x: number, y: number, color: string, open = false) =>
    out.push(`<rect x="${x - 9}" y="${y - 9}" width="18" height="18" rx="2" fill="${open ? '#ffffff' : color}" stroke="${color}" stroke-width="2"${open ? ' stroke-dasharray="3 2"' : ''}/>`);
  const text = (x: number, y: number, t: string, size: number, color: string, anchor = 'start', bold = false) =>
    out.push(`<text x="${x}" y="${y}" font-size="${size}"${bold ? ' font-weight="700"' : ''} fill="${color}" text-anchor="${anchor}" stroke="#f6f7f9" stroke-width="4" paint-order="stroke">${t}</text>`);

  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" ${FONT}>`);
  out.push(`<rect width="${W}" height="${H}" fill="#f6f7f9"/>`);
  text(30, 64, '示意單線圖 · 161 kV 受電 → 22.8 kV 匯流排 → 高壓迴路（開環）→ 次變電站', 13, '#6b7280');
  text(600, 132, '台電公司 161 kV 輸電線', 13, C.hv, 'middle', true);

  // 161 kV：台電 → GIS → 主變
  for (const x of [350, 850]) {
    wire([[x, 156], [x, 190]], C.hv);
    wire([[x, 250], [x, 290]], C.hv);
    cb(x, 270, C.hv);
  }
  // 主變 → 22.8 kV 匯流排
  for (const x of [350, 850]) {
    wire([[x, 370], [x, 420]], C.mv);
    cb(x, 396, C.mv);
  }
  wire([[120, 420], [585, 420]], C.mv, 7);
  wire([[615, 420], [1150, 420]], C.mv, 7);
  cb(600, 420, C.mv, true);
  text(600, 404, '常開', 11, C.mv, 'middle');
  text(184, 403, 'Bus A　22.8 kV', 13, C.mv, 'start', true);
  text(1150, 446, 'Bus B　22.8 kV', 13, C.mv, 'end', true);
  text(600, 500, '聯絡斷路器（常開）', 12, C.mv, 'middle');
  // 緊急發電機 → Bus B
  wire([[1110, 350], [1110, 420]], C.gen);
  cb(1110, 386, C.gen);
  // 高壓迴路：Bus A → 迴路一 → SS-1、SS-2；Bus B → 迴路二 → SS-4、SS-3；中間常開點
  wire([[200, 420], [200, 560], [588, 560]], C.loop, 4);
  wire([[1000, 420], [1000, 560], [612, 560]], C.loop, 4);
  cb(200, 440, C.loop);
  cb(1000, 440, C.loop);
  out.push(`<line x1="588" y1="550" x2="588" y2="570" stroke="${C.loop}" stroke-width="3"/><line x1="612" y1="550" x2="612" y2="570" stroke="${C.loop}" stroke-width="3"/>`);
  text(600, 545, '常開點', 11, C.loop, 'middle', true);
  text(266, 487, '高壓迴路一', 13, C.loop, 'start', true);
  text(934, 487, '高壓迴路二', 13, C.loop, 'end', true);
  for (const id of ['ss1', 'ss2', 'ss3', 'ss4'] as const) {
    const b = B[id];
    wire([[b.x + b.w / 2, 560], [b.x + b.w / 2, b.y]], C.loop, 3);
  }

  // 設備方框
  for (const [id, b] of Object.entries(B)) {
    const color = id.startsWith('tpc') || id === 'gis' ? C.hv : id.startsWith('mtr') ? C.mv : id === 'gen' ? C.gen : C.loop;
    out.push(`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="#ffffff" stroke="${color}" stroke-width="1.8"/>`);
    const ty = b.y + b.h / 2 - 3;
    out.push(`<text x="${b.x + 12}" y="${ty}" font-size="15" font-weight="700" fill="#2b4764">${b.title}</text>`);
    out.push(`<text x="${b.x + 12}" y="${ty + 20}" font-size="12" fill="#6b7280">${b.sub}</text>`);
  }
  // 圖例
  text(30, 704, '線色：紫 161 kV　藍 22.8 kV 匯流排　青 高壓迴路　灰 緊急發電機　■ 斷路器（閉合）　□ 常開', 12, '#6b7280');
  out.push('</svg>');
  return out.join('');
}

/**
 * 內建底圖的大標題：不畫在圖裡，而是放成畫布上的「文字」積木（位置對齊圖上原本的標題區），
 * 在編輯模式點兩下就能改。副標題仍畫在圖裡。
 */
export const MAP_TITLES: Record<string, { text: string; x: number; y: number }> = {
  [CLEANROOM.id]: { text: 'F18P2 · 3F 無塵室', x: 59, y: 12 },
  [WATER.id]: { text: 'F18P1 · 純水／廢水 水平衡', x: 29, y: 12 },
  [POWER.id]: { text: 'F18P2 · 台電入口至高壓迴路', x: 29, y: 12 },
};

/** 內建底圖的 id（上傳的圖檔沒有） */
export const builtinBackgroundId = (src: string) => (src.startsWith('builtin:') ? src.slice('builtin:'.length) : undefined);

const BUILTIN: Record<string, () => string> = { [CLEANROOM.id]: cleanroomSvg, [WATER.id]: waterSvg, [POWER.id]: powerSvg };
const cache = new Map<string, string>();

/** 內建範本底圖（可在編輯模式的「底圖」區套用）；label 是按鈕上的短名稱 */
export const BUILTIN_BACKGROUNDS: (PageBackground & { label: string })[] = [
  { src: `builtin:${CLEANROOM.id}`, width: CLEANROOM.width, height: CLEANROOM.height, name: CLEANROOM.name, label: '無塵室示意圖', v: 2 },
  { src: `builtin:${WATER.id}`, width: WATER.width, height: WATER.height, name: WATER.name, label: '水平衡拓樸圖', v: 2 },
  { src: `builtin:${POWER.id}`, width: POWER.width, height: POWER.height, name: POWER.name, label: '高壓單線圖', v: 2 },
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
