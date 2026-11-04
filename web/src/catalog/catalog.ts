import type { PageDef, SiteDef, SystemDef } from '../types';

export const SITES: SiteDef[] = [
  { id: 'f18p1', name: 'F18P1', label: 'F18P1 廠區', dropTags: 0 },
  { id: 'f18p2', name: 'F18P2', label: 'F18P2 廠區', dropTags: 0 },
  { id: 'f18p3', name: 'F18P3', label: 'F18P3 廠區', dropTags: 1 },
  { id: 'f18p7', name: 'F18P7', label: 'F18P7 廠區', dropTags: 2 },
];

export const SYSTEMS: SystemDef[] = [
  {
    id: 'upw',
    name: '超純水',
    short: 'UPW',
    defaultStaleMinutes: 15,
    metrics: [
      { code: 'TOC', label: 'TOC', unit: 'ppb', decimals: 1, defaults: { yellowHigh: 1.0, redHigh: 3.0 } },
      { code: 'RES', label: '電阻率', unit: 'MΩ·cm', decimals: 1, defaults: { yellowLow: 18.0, redLow: 17.5 } },
      { code: 'PRS', label: '壓力', unit: 'kgf/cm²', decimals: 1, defaults: { yellowLow: 3.2, redLow: 3.0 } },
      { code: 'FLW', label: '流量', unit: 'm³/h', decimals: 1, defaults: { yellowHigh: 30, redHigh: 40 } },
      { code: 'TMP', label: '溫度', unit: '°C', decimals: 1, defaults: { yellowHigh: 25, redHigh: 28 } },
    ],
    tags: [
      { name: 'UPW-POL-01.RES', desc: '拋光 01 出水電阻率', nominal: 18.2 },
      { name: 'UPW-POL-02.TOC', desc: '拋光 02 出水 TOC', nominal: 0.4 },
      { name: 'UPW-POL-03.RES', desc: '拋光 03 出水電阻率', nominal: 18.2 },
      { name: 'UPW-POL-03.TOC', desc: '拋光 03 出水 TOC', nominal: 0.5 },
      { name: 'UPW-LOOP-01.PRS', desc: '供水迴路 01 壓力', nominal: 3.6 },
      { name: 'UPW-RO-03.FLW', desc: 'RO 逆滲透 03 流量', nominal: 24 },
      { name: 'UPW-EDI-02.TMP', desc: 'EDI 混床 02 出水溫度', nominal: 23.8 },
      { name: 'UPW-PRE-04.TOC', desc: '前處理 04 TOC', nominal: 0.6 },
    ],
    groups: [
      { code: 'PRE', name: '前處理', prefix: 'UPW-PRE-' },
      { code: 'RO', name: 'RO 逆滲透', prefix: 'UPW-RO-' },
      { code: 'EDI', name: 'EDI 混床', prefix: 'UPW-EDI-' },
      { code: 'POL', name: '拋光', prefix: 'UPW-POL-' },
      { code: 'LOOP', name: '供水迴路', prefix: 'UPW-LOOP-' },
    ],
  },
  {
    id: 'bulk',
    name: '大宗氣體',
    short: 'BSG',
    defaultStaleMinutes: 15,
    metrics: [
      { code: 'PRS', label: '壓力', unit: 'kgf/cm²', decimals: 1, defaults: { yellowLow: 7.0, redLow: 6.5 } },
      { code: 'DEW', label: '露點', unit: '°C', decimals: 0, defaults: { yellowHigh: -70, redHigh: -60 } },
      { code: 'O2', label: 'O₂ 含量', unit: 'ppb', decimals: 0, defaults: { yellowHigh: 50, redHigh: 100 } },
      { code: 'FLW', label: '流量', unit: 'Nm³/h', decimals: 0, defaults: { yellowHigh: 800, redHigh: 1000 } },
    ],
    tags: [
      { name: 'GAS-GN2-01.PRS', desc: '一般氮氣 01 主管壓力', nominal: 8.2 },
      { name: 'GAS-GN2-01.DEW', desc: '一般氮氣 01 露點', nominal: -78 },
      { name: 'GAS-GN2-01.O2', desc: '一般氮氣 01 O₂', nominal: 12 },
      { name: 'GAS-GN2-02.PRS', desc: '一般氮氣 02 主管壓力', nominal: 8.1 },
      { name: 'GAS-GN2-02.FLW', desc: '一般氮氣 02 流量', nominal: 520 },
      { name: 'GAS-PN2-01.PRS', desc: '純化氮氣 01 壓力', nominal: 7.9 },
      { name: 'GAS-PN2-01.O2', desc: '純化氮氣 01 O₂', nominal: 10 },
      { name: 'GAS-ARG-01.PRS', desc: '氬氣 01 壓力', nominal: 7.6 },
      { name: 'GAS-HE-01.PRS', desc: '氦氣 01 壓力', nominal: 7.5 },
      { name: 'GAS-GN2-03.FLW', desc: '一般氮氣 03 流量', nominal: 610 },
    ],
    groups: [
      { code: 'GN2', name: '一般氮氣', prefix: 'GAS-GN2-' },
      { code: 'PN2', name: '純化氮氣', prefix: 'GAS-PN2-' },
      { code: 'ARG', name: '氬氣', prefix: 'GAS-ARG-' },
      { code: 'HE', name: '氦氣', prefix: 'GAS-HE-' },
    ],
  },
  {
    id: 'chem',
    name: '化學品',
    short: 'CHEM',
    defaultStaleMinutes: 15,
    metrics: [
      { code: 'LVL', label: '液位', unit: '%', decimals: 0, defaults: { yellowLow: 30, redLow: 15 } },
      { code: 'PRS', label: '供液壓力', unit: 'kgf/cm²', decimals: 1, defaults: { yellowLow: 2.0, redLow: 1.5 } },
      { code: 'TMP', label: '液溫', unit: '°C', decimals: 0, defaults: { yellowHigh: 28, redHigh: 32 } },
    ],
    tags: [
      { name: 'CHEM-HF-01.LVL', desc: 'HF 儲槽 01 液位', nominal: 65 },
      { name: 'CHEM-HF-01.TMP', desc: 'HF 儲槽 01 液溫', nominal: 22 },
      { name: 'CHEM-H2SO4-01.LVL', desc: 'H₂SO₄ 儲槽 01 液位', nominal: 58 },
      { name: 'CHEM-H2SO4-01.PRS', desc: 'H₂SO₄ 供液壓力', nominal: 3.2 },
      { name: 'CHEM-NH4OH-01.LVL', desc: 'NH₄OH 儲槽 01 液位', nominal: 72 },
      { name: 'CHEM-NH4OH-01.TMP', desc: 'NH₄OH 儲槽 01 液溫', nominal: 23 },
      { name: 'CHEM-IPA-01.LVL', desc: 'IPA 儲槽 01 液位', nominal: 80 },
      { name: 'CHEM-IPA-01.PRS', desc: 'IPA 供液壓力', nominal: 3.0 },
      { name: 'CHEM-HCL-01.LVL', desc: 'HCl 儲槽 01 液位', nominal: 69 },
      { name: 'CHEM-SC1-01.PRS', desc: 'SC1 供液壓力', nominal: 2.8 },
    ],
    groups: [
      { code: 'HF', name: 'HF 氫氟酸', prefix: 'CHEM-HF-' },
      { code: 'H2SO4', name: 'H₂SO₄ 硫酸', prefix: 'CHEM-H2SO4-' },
      { code: 'NH4OH', name: 'NH₄OH 氨水', prefix: 'CHEM-NH4OH-' },
      { code: 'IPA', name: 'IPA 異丙醇', prefix: 'CHEM-IPA-' },
      { code: 'HCL', name: 'HCl 鹽酸', prefix: 'CHEM-HCL-' },
      { code: 'SC1', name: 'SC1 清洗液', prefix: 'CHEM-SC1-' },
    ],
  },
  {
    id: 'power',
    name: '電力',
    short: 'PWR',
    defaultStaleMinutes: 15,
    metrics: [
      { code: 'VLT', label: '電壓', unit: 'V', decimals: 0, defaults: { yellowHigh: 395, redHigh: 405, yellowLow: 365, redLow: 355 } },
      { code: 'LOAD', label: '負載率', unit: '%', decimals: 0, defaults: { yellowHigh: 80, redHigh: 90 } },
      { code: 'TMP', label: '繞組溫度', unit: '°C', decimals: 0, defaults: { yellowHigh: 80, redHigh: 95 } },
      { code: 'PF', label: '功率因數', unit: '', decimals: 2, defaults: { yellowLow: 0.95, redLow: 0.9 } },
    ],
    tags: [
      { name: 'PWR-TR1.VLT', desc: '變壓器 TR1 二次側電壓', nominal: 380 },
      { name: 'PWR-TR1.LOAD', desc: '變壓器 TR1 負載率', nominal: 62 },
      { name: 'PWR-TR1.TMP', desc: '變壓器 TR1 繞組溫度', nominal: 62 },
      { name: 'PWR-TR2.VLT', desc: '變壓器 TR2 二次側電壓', nominal: 381 },
      { name: 'PWR-TR2.LOAD', desc: '變壓器 TR2 負載率', nominal: 58 },
      { name: 'PWR-TR2.TMP', desc: '變壓器 TR2 繞組溫度', nominal: 60 },
      { name: 'PWR-UPS-A.LOAD', desc: 'UPS A 負載率', nominal: 55 },
      { name: 'PWR-UPS-B.LOAD', desc: 'UPS B 負載率', nominal: 52 },
      { name: 'PWR-BUS-A.PF', desc: '匯流排 A 功率因數', nominal: 0.98 },
      { name: 'PWR-BUS-B.PF', desc: '匯流排 B 功率因數', nominal: 0.98 },
    ],
    groups: [
      { code: 'TR1', name: '變壓器 TR1', prefix: 'PWR-TR1.' },
      { code: 'TR2', name: '變壓器 TR2', prefix: 'PWR-TR2.' },
      { code: 'UPS', name: 'UPS 不斷電', prefix: 'PWR-UPS-' },
      { code: 'BUS', name: '匯流排', prefix: 'PWR-BUS-' },
    ],
  },
  {
    id: 'mau',
    name: '空調 MAU',
    short: 'MAU',
    defaultStaleMinutes: 15,
    metrics: [
      { code: 'TMP', label: '送風溫度', unit: '°C', decimals: 1, defaults: { yellowHigh: 23.5, redHigh: 25, yellowLow: 20.5, redLow: 19 } },
      { code: 'RH', label: '相對濕度', unit: '%', decimals: 0, defaults: { yellowHigh: 50, redHigh: 55, yellowLow: 40, redLow: 35 } },
      { code: 'DP', label: '濾網壓差', unit: 'Pa', decimals: 0, defaults: { yellowHigh: 250, redHigh: 350 } },
    ],
    tags: [
      { name: 'MAU-01.TMP', desc: 'MAU 01 送風溫度', nominal: 22.0 },
      { name: 'MAU-01.RH', desc: 'MAU 01 送風濕度', nominal: 45 },
      { name: 'MAU-01.DP', desc: 'MAU 01 濾網壓差', nominal: 180 },
      { name: 'MAU-02.TMP', desc: 'MAU 02 送風溫度', nominal: 22.1 },
      { name: 'MAU-02.RH', desc: 'MAU 02 送風濕度', nominal: 45 },
      { name: 'MAU-02.DP', desc: 'MAU 02 濾網壓差', nominal: 190 },
      { name: 'MAU-03.TMP', desc: 'MAU 03 送風溫度', nominal: 21.9 },
      { name: 'MAU-03.RH', desc: 'MAU 03 送風濕度', nominal: 46 },
      { name: 'MAU-03.DP', desc: 'MAU 03 濾網壓差', nominal: 170 },
      { name: 'MAU-04.TMP', desc: 'MAU 04 送風溫度', nominal: 22.0 },
    ],
    groups: [
      { code: 'MAU01', name: 'MAU 01', prefix: 'MAU-01.' },
      { code: 'MAU02', name: 'MAU 02', prefix: 'MAU-02.' },
      { code: 'MAU03', name: 'MAU 03', prefix: 'MAU-03.' },
      { code: 'MAU04', name: 'MAU 04', prefix: 'MAU-04.' },
    ],
  },
  {
    id: 'exhaust',
    name: '排氣',
    short: 'EXH',
    defaultStaleMinutes: 15,
    metrics: [
      { code: 'DP', label: '管道負壓', unit: 'Pa', decimals: 0, defaults: { yellowHigh: -200, redHigh: -150 } },
      { code: 'FLW', label: '排氣風量', unit: 'CMH', decimals: 0, defaults: { yellowLow: 8000, redLow: 6000 } },
    ],
    tags: [
      { name: 'EXH-ACID-01.DP', desc: '酸排 01 管道負壓', nominal: -320 },
      { name: 'EXH-ACID-01.FLW', desc: '酸排 01 排氣風量', nominal: 12000 },
      { name: 'EXH-ALK-01.DP', desc: '鹼排 01 管道負壓', nominal: -310 },
      { name: 'EXH-ALK-01.FLW', desc: '鹼排 01 排氣風量', nominal: 11000 },
      { name: 'EXH-VOC-01.DP', desc: 'VOC 排氣 01 管道負壓', nominal: -305 },
      { name: 'EXH-VOC-01.FLW', desc: 'VOC 排氣 01 排氣風量', nominal: 9500 },
      { name: 'EXH-GEX-01.DP', desc: '一般排氣 01 管道負壓', nominal: -300 },
      { name: 'EXH-GEX-01.FLW', desc: '一般排氣 01 排氣風量', nominal: 8800 },
      { name: 'EXH-SCR-01.DP', desc: '洗滌塔 01 管道負壓', nominal: -330 },
      { name: 'EXH-SCR-01.FLW', desc: '洗滌塔 01 排氣風量', nominal: 14000 },
    ],
    groups: [
      { code: 'ACID', name: '酸排', prefix: 'EXH-ACID-' },
      { code: 'ALK', name: '鹼排', prefix: 'EXH-ALK-' },
      { code: 'VOC', name: 'VOC 排氣', prefix: 'EXH-VOC-' },
      { code: 'GEX', name: '一般排氣', prefix: 'EXH-GEX-' },
      { code: 'SCR', name: '洗滌塔', prefix: 'EXH-SCR-' },
    ],
  },
  {
    id: 'cr',
    name: '無塵室環境',
    short: 'CR',
    defaultStaleMinutes: 15,
    metrics: [
      { code: 'TMP', label: '溫度', unit: '°C', decimals: 1, defaults: { yellowHigh: 23, redHigh: 24, yellowLow: 21, redLow: 20 } },
      { code: 'RH', label: '相對濕度', unit: '%', decimals: 0, defaults: { yellowHigh: 50, redHigh: 55, yellowLow: 40, redLow: 35 } },
      { code: 'DP', label: '室壓差', unit: 'Pa', decimals: 0, defaults: { yellowLow: 10, redLow: 5 } },
      { code: 'PC', label: '微粒數 ≥0.1µm', unit: 'pcs/ft³', decimals: 0, defaults: { yellowHigh: 10, redHigh: 35 } },
    ],
    tags: [
      { name: 'CR3F-BAYA.TMP', desc: 'Bay A 黃光區 溫度', nominal: 22.0 },
      { name: 'CR3F-BAYA.RH', desc: 'Bay A 黃光區 相對濕度', nominal: 45 },
      { name: 'CR3F-BAYA.DP', desc: 'Bay A 黃光區 室壓差', nominal: 15 },
      { name: 'CR3F-BAYA.PC', desc: 'Bay A 黃光區 微粒數', nominal: 3 },
      { name: 'CR3F-BAYB.TMP', desc: 'Bay B 黃光區 溫度', nominal: 22.0 },
      { name: 'CR3F-BAYB.RH', desc: 'Bay B 黃光區 相對濕度', nominal: 45 },
      { name: 'CR3F-BAYB.DP', desc: 'Bay B 黃光區 室壓差', nominal: 15 },
      { name: 'CR3F-BAYB.PC', desc: 'Bay B 黃光區 微粒數', nominal: 3 },
      { name: 'CR3F-BAYC.TMP', desc: 'Bay C 蝕刻區 溫度', nominal: 22.0 },
      { name: 'CR3F-BAYC.RH', desc: 'Bay C 蝕刻區 相對濕度', nominal: 45 },
      { name: 'CR3F-BAYC.DP', desc: 'Bay C 蝕刻區 室壓差', nominal: 15 },
      { name: 'CR3F-BAYC.PC', desc: 'Bay C 蝕刻區 微粒數', nominal: 3 },
      { name: 'CR3F-BAYD.TMP', desc: 'Bay D 蝕刻區 溫度', nominal: 22.0 },
      { name: 'CR3F-BAYD.RH', desc: 'Bay D 蝕刻區 相對濕度', nominal: 45 },
      { name: 'CR3F-BAYD.DP', desc: 'Bay D 蝕刻區 室壓差', nominal: 15 },
      { name: 'CR3F-BAYD.PC', desc: 'Bay D 蝕刻區 微粒數', nominal: 3 },
      { name: 'CR3F-BAYE.TMP', desc: 'Bay E 薄膜區 溫度', nominal: 22.0 },
      { name: 'CR3F-BAYE.RH', desc: 'Bay E 薄膜區 相對濕度', nominal: 45 },
      { name: 'CR3F-BAYE.DP', desc: 'Bay E 薄膜區 室壓差', nominal: 15 },
      { name: 'CR3F-BAYE.PC', desc: 'Bay E 薄膜區 微粒數', nominal: 3 },
      { name: 'CR3F-BAYF.TMP', desc: 'Bay F 薄膜區 溫度', nominal: 22.0 },
      { name: 'CR3F-BAYF.RH', desc: 'Bay F 薄膜區 相對濕度', nominal: 45 },
      { name: 'CR3F-BAYF.DP', desc: 'Bay F 薄膜區 室壓差', nominal: 15 },
      { name: 'CR3F-BAYF.PC', desc: 'Bay F 薄膜區 微粒數', nominal: 3 },
      { name: 'CR3F-BAYG.TMP', desc: 'Bay G 擴散區 溫度', nominal: 22.0 },
      { name: 'CR3F-BAYG.RH', desc: 'Bay G 擴散區 相對濕度', nominal: 45 },
      { name: 'CR3F-BAYG.DP', desc: 'Bay G 擴散區 室壓差', nominal: 15 },
      { name: 'CR3F-BAYG.PC', desc: 'Bay G 擴散區 微粒數', nominal: 3 },
      { name: 'CR3F-BAYH.TMP', desc: 'Bay H 量測區 溫度', nominal: 22.0 },
      { name: 'CR3F-BAYH.RH', desc: 'Bay H 量測區 相對濕度', nominal: 45 },
      { name: 'CR3F-BAYH.DP', desc: 'Bay H 量測區 室壓差', nominal: 15 },
      { name: 'CR3F-BAYH.PC', desc: 'Bay H 量測區 微粒數', nominal: 3 },
    ],
    groups: [
      { code: 'BAYA', name: 'Bay A 黃光區', prefix: 'CR3F-BAYA.' },
      { code: 'BAYB', name: 'Bay B 黃光區', prefix: 'CR3F-BAYB.' },
      { code: 'BAYC', name: 'Bay C 蝕刻區', prefix: 'CR3F-BAYC.' },
      { code: 'BAYD', name: 'Bay D 蝕刻區', prefix: 'CR3F-BAYD.' },
      { code: 'BAYE', name: 'Bay E 薄膜區', prefix: 'CR3F-BAYE.' },
      { code: 'BAYF', name: 'Bay F 薄膜區', prefix: 'CR3F-BAYF.' },
      { code: 'BAYG', name: 'Bay G 擴散區', prefix: 'CR3F-BAYG.' },
      { code: 'BAYH', name: 'Bay H 量測區', prefix: 'CR3F-BAYH.' },
    ],
  },
];

export const siteById = (id: string) => SITES.find((s) => s.id === id);
export const systemById = (id: string) => SYSTEMS.find((s) => s.id === id);
export const metricOf = (sys: SystemDef, tagName: string) => {
  const code = tagName.slice(tagName.lastIndexOf('.') + 1);
  return sys.metrics.find((m) => m.code === code);
};

const ALL = { sites: SITES.map((s) => s.id), systems: SYSTEMS.map((s) => s.id) };
const allSites = SITES.map((s) => s.id);

/**
 * 南科戰情官總覽：F18P1～P3 × 水、電、空調、氣體、化學供應。
 * 每一格是一個值班情境頁（slug 如 f18p2-water），頁內是整體燈號 + 各子系統燈號。
 */
export const STSP = {
  sites: ['f18p1', 'f18p2', 'f18p3'],
  columns: [
    { key: 'water', system: 'upw', label: '水', title: '水系統' },
    { key: 'power', system: 'power', label: '電', title: '電力' },
    { key: 'hvac', system: 'mau', label: '空調', title: '空調' },
    { key: 'gas', system: 'bulk', label: '氣體', title: '氣體' },
    { key: 'chem', system: 'chem', label: '化學供應', title: '化學供應' },
  ],
};
export const stspSlug = (siteId: string, key: string) => `${siteId}-${key}`;
const STSP_DUTY_PAGES: PageDef[] = STSP.sites.flatMap((siteId) =>
  STSP.columns.map((c): PageDef => ({
    slug: stspSlug(siteId, c.key),
    title: `${SITES.find((s) => s.id === siteId)!.name} ${c.title}值班`,
    scope: { sites: [siteId], systems: [c.system] },
    preset: 'subsystems',
  })),
);

export const PAGES: PageDef[] = [
  // ── 側欄預設 Favorites ──
  { slug: 'overview', title: 'F18A 全廠總覽', scope: ALL, layer: 'command' },
  { slug: 'power', title: 'Power 電力系統', scope: { sites: allSites, systems: ['power'] } },
  { slug: 'upw', title: 'UPW 超純水', scope: { sites: allSites, systems: ['upw'] } },
  { slug: 'hvac', title: 'HVAC 空調系統', scope: { sites: allSites, systems: ['mau'] } },
  { slug: 'exhaust', title: 'Exhaust 廢氣系統', scope: { sites: allSites, systems: ['exhaust'] } },
  { slug: 'gas', title: 'Gas 特殊氣體', scope: { sites: allSites, systems: ['bulk'] } },
  { slug: 'chemical', title: 'Chemical 化學品', scope: { sites: allSites, systems: ['chem'] } },
  { slug: 'stsp', title: '南科戰情官總覽', scope: { sites: STSP.sites, systems: STSP.columns.map((c) => c.system) }, layer: 'command', preset: 'stsp' },
  ...STSP_DUTY_PAGES,
  // 綠燈範例：F18P1 的公用系統目前都正常（戰情指揮官頁用來展示綠燈）
  // 地圖型 MIMIC：無塵室平面圖當底圖，各 Bay 與 MAU 放小尺寸燈號
  { slug: 'cleanroom-hvac', title: '無塵室空調品質管理', scope: { sites: ['f18p2'], systems: ['cr', 'mau'] }, preset: 'cleanroom' },
  { slug: 'f18p1-utility', title: 'F18P1 公用系統值班', scope: { sites: ['f18p1'], systems: ['upw', 'bulk', 'mau', 'exhaust'] } },
  { slug: 'f18p2-bulk', title: 'F18P2 大宗氣體值班', scope: { sites: ['f18p2'], systems: ['bulk'] } },

  // ── Explore：他人建立的頁面 ──
  {
    slug: 'f18p2-upw-duty', title: 'F18P2 UPW 值班監看', scope: { sites: ['f18p2'], systems: ['upw'] },
    author: { name: '林怡君', initials: 'LY', dept: '廠務一課' }, systemTags: ['超純水'], siteLabel: 'F18P2',
    clicks: 1284, favorites: 41, updatedLabel: '10:40', updatedRank: 95, explore: true,
  },
  {
    slug: 'upw-toc-daily', title: 'UPW TOC 品質日報', scope: { sites: allSites, systems: ['upw'] },
    author: { name: '陳志明', initials: 'CM', dept: '水課' }, systemTags: ['超純水'], siteLabel: 'F18A',
    clicks: 956, favorites: 31, updatedLabel: '今天 08:00', updatedRank: 80, explore: true,
  },
  {
    slug: 'f18p7-upw-reclaim', title: 'F18P7 UPW 回收水監看', scope: { sites: ['f18p7'], systems: ['upw'] },
    author: { name: '張雅婷', initials: 'YT', dept: 'F18P7 廠務' }, systemTags: ['超純水', '廢水'], siteLabel: 'F18P7',
    clicks: 702, favorites: 18, updatedLabel: '10:35', updatedRank: 94, explore: true,
  },
  {
    slug: 'upw-plant-load', title: 'UPW 主機群負載', scope: { sites: ['f18p1', 'f18p2', 'f18p3'], systems: ['upw'] },
    author: { name: '王建宏', initials: 'JW', dept: '水課' }, systemTags: ['超純水'], siteLabel: 'F18P1–P3',
    clicks: 431, favorites: 11, updatedLabel: '10:41', updatedRank: 96, explore: true,
  },
  {
    slug: 'f18p3-upw-particle', title: 'F18P3 UPW 顆粒監看', scope: { sites: ['f18p3'], systems: ['upw'] },
    author: { name: '黃俊傑', initials: 'JH', dept: 'F18P3 廠務' }, systemTags: ['超純水'], siteLabel: 'F18P3',
    clicks: 187, favorites: 9, updatedLabel: '昨天 17:20', updatedRank: 40, explore: true,
  },
  {
    slug: 'upw-drill', title: 'UPW 停機演練看板', scope: { sites: ['f18p1'], systems: ['upw'] },
    author: { name: '劉家豪', initials: 'CH', dept: '工安課' }, systemTags: ['超純水'], siteLabel: 'F18A',
    clicks: 52, favorites: 4, updatedLabel: '3 天前', updatedRank: 10, explore: true,
  },
  {
    slug: 'f18p1-power-duty', title: 'F18P1 電力值班總覽', scope: { sites: ['f18p1'], systems: ['power'] },
    author: { name: '周柏諺', initials: 'BY', dept: '電力課' }, systemTags: ['電力'], siteLabel: 'F18P1',
    clicks: 884, favorites: 27, updatedLabel: '10:38', updatedRank: 93, explore: true,
  },
  {
    slug: 'mau-humidity', title: 'MAU 溫濕度總覽', scope: { sites: allSites, systems: ['mau'] },
    author: { name: '蔡宗翰', initials: 'ZH', dept: '空調課' }, systemTags: ['空調 MAU'], siteLabel: 'F18A',
    clicks: 640, favorites: 22, updatedLabel: '10:30', updatedRank: 90, explore: true,
  },
  {
    slug: 'chem-tank-level', title: '化學品儲槽液位', scope: { sites: allSites, systems: ['chem'] },
    author: { name: '吳佩珊', initials: 'PS', dept: '化學品課' }, systemTags: ['化學品'], siteLabel: 'F18A',
    clicks: 512, favorites: 19, updatedLabel: '今天 09:15', updatedRank: 85, explore: true,
  },
  {
    slug: 'exhaust-pressure', title: '排氣管道負壓監看', scope: { sites: allSites, systems: ['exhaust'] },
    author: { name: '鄭育廷', initials: 'ZT', dept: '空調課' }, systemTags: ['排氣'], siteLabel: 'F18A',
    clicks: 301, favorites: 8, updatedLabel: '昨天 22:10', updatedRank: 50, explore: true,
  },
  {
    slug: 'bulk-n2-quality', title: '大宗氣體 N2 品質', scope: { sites: allSites, systems: ['bulk'] },
    author: { name: '許嘉文', initials: 'XJ', dept: '氣體課' }, systemTags: ['大宗氣體'], siteLabel: 'F18A',
    clicks: 268, favorites: 14, updatedLabel: '今天 07:50', updatedRank: 78, explore: true,
  },
  {
    slug: 'f18p7-overview', title: 'F18P7 廠區總覽', scope: { sites: ['f18p7'], systems: SYSTEMS.map((s) => s.id) },
    author: { name: '張雅婷', initials: 'YT', dept: 'F18P7 廠務' }, systemTags: ['全系統'], siteLabel: 'F18P7',
    clicks: 977, favorites: 33, updatedLabel: '10:36', updatedRank: 92, explore: true,
  },
];

export const pageBySlug = (slug: string) => PAGES.find((p) => p.slug === slug);

/** 新增頁面時可選的 System 與 Phase（用詞與 Explore 的 System、Site 欄一致） */
export const SYSTEM_OPTIONS = [...SYSTEMS.map((s) => s.name), '全系統'];
export const PHASE_OPTIONS = [...SITES.map((s) => s.name), 'F18A'];
