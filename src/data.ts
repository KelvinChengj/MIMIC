export type Status = "red" | "yellow" | "green" | "gray";
export type Tag = {
  id: string;
  description: string;
  unit: string;
  value: number | null;
  direction: "above" | "below";
  yellow: number;
  red: number;
  enabled: boolean;
  ageMinutes: number;
};
export const statuses: Record<Status, { label: string; short: string }> = {
  red: { label: "異常", short: "異常" },
  yellow: { label: "部分異常", short: "警告" },
  green: { label: "正常", short: "正常" },
  gray: { label: "無資料", short: "無資料" },
};
export const systems = [
  { id: "upw", name: "超純水", en: "UPW" },
  { id: "gas", name: "大宗氣體", en: "GAS" },
  { id: "chemical", name: "化學品", en: "CHEM" },
  { id: "power", name: "電力", en: "POWER" },
  { id: "hvac", name: "空調", en: "HVAC" },
  { id: "exhaust", name: "排氣", en: "EXH" },
  { id: "waste", name: "廢水", en: "WWT" },
];
export const sites = ["F18P1", "F18P2", "F18P3", "F18P7"];
export const matrix: Status[][] = [
  ["green", "green", "yellow", "green", "green", "green", "green"],
  ["red", "green", "green", "yellow", "green", "green", "gray"],
  ["green", "yellow", "green", "green", "red", "green", "green"],
  ["green", "green", "red", "green", "yellow", "gray", "yellow"],
];
export const upwTags: Tag[] = [
  {
    id: "UPW-POL-02.TOC",
    description: "拋光 02 出水總有機碳",
    unit: "ppb",
    value: 3.4,
    direction: "above",
    yellow: 1,
    red: 3,
    enabled: true,
    ageMinutes: 0,
  },
  {
    id: "UPW-POL-03.RES",
    description: "拋光 03 出水電阻率",
    unit: "MΩ·cm",
    value: 17.6,
    direction: "below",
    yellow: 18,
    red: 17.8,
    enabled: true,
    ageMinutes: 0,
  },
  {
    id: "UPW-LOOP-01.PRS",
    description: "供水迴路 01 壓力",
    unit: "kgf/cm²",
    value: 2.9,
    direction: "below",
    yellow: 3.3,
    red: 3,
    enabled: true,
    ageMinutes: 0,
  },
  {
    id: "UPW-POL-03.TOC",
    description: "拋光 03 出水總有機碳",
    unit: "ppb",
    value: 2.4,
    direction: "above",
    yellow: 1,
    red: 3,
    enabled: true,
    ageMinutes: 0,
  },
  {
    id: "UPW-RO-03.FLW",
    description: "RO 逆滲透 03 流量",
    unit: "m³/h",
    value: 31.5,
    direction: "below",
    yellow: 32,
    red: 28,
    enabled: true,
    ageMinutes: 0,
  },
  {
    id: "UPW-POL-01.RES",
    description: "拋光 01 出水電阻率",
    unit: "MΩ·cm",
    value: 18.2,
    direction: "below",
    yellow: 18,
    red: 17.8,
    enabled: true,
    ageMinutes: 0,
  },
  {
    id: "UPW-EDI-02.TMP",
    description: "EDI 混床 02 出水溫度",
    unit: "°C",
    value: 23.8,
    direction: "above",
    yellow: 26,
    red: 30,
    enabled: true,
    ageMinutes: 0,
  },
  {
    id: "UPW-PRE-04.TOC",
    description: "前處理 04 總有機碳",
    unit: "ppb",
    value: null,
    direction: "above",
    yellow: 1,
    red: 3,
    enabled: true,
    ageMinutes: 16,
  },
];
export function tagStatus(tag: Tag, timeout = 15): Status {
  if (
    tag.value === null ||
    !Number.isFinite(tag.value) ||
    tag.ageMinutes >= timeout
  )
    return "gray";
  const beyond = (n: number) =>
    tag.direction === "above" ? tag.value! > n : tag.value! < n;
  return beyond(tag.red) ? "red" : beyond(tag.yellow) ? "yellow" : "green";
}
export function aggregate(tags: Tag[], timeout = 15): Status {
  const active = tags
    .filter((t) => t.enabled)
    .map((t) => tagStatus(t, timeout));
  if (active.includes("red")) return "red";
  if (active.includes("yellow")) return "yellow";
  if (active.includes("gray") || !active.length) return "gray";
  return "green";
}
export function validRules(tags: Tag[]): boolean {
  return tags.every(
    (t) =>
      Number.isFinite(t.yellow) &&
      Number.isFinite(t.red) &&
      (t.direction === "above" ? t.red > t.yellow : t.red < t.yellow),
  );
}
export function seedTags(site: string, system: string): Tag[] {
  if (system === "upw")
    return upwTags.map((t) => ({
      ...t,
      value:
        site === "F18P2"
          ? t.value
          : t.direction === "above"
            ? t.yellow * 0.6
            : t.yellow * 1.02,
      ageMinutes: site === "F18P2" ? t.ageMinutes : 0,
    }));
  const entry = systems.find((s) => s.id === system)!;
  const status =
    matrix[sites.indexOf(site)]?.[systems.indexOf(entry)] ?? "green";
  return Array.from({ length: 6 }, (_, i) => ({
    id: `${entry.en}-SYS-0${i + 1}.VAL`,
    description: `${entry.name} ${String(i + 1).padStart(2, "0")} 運轉參數`,
    unit: "%",
    value:
      status === "gray"
        ? null
        : status === "red" && i < 3
          ? 96
          : status === "yellow" && i < 2
            ? 85
            : 65 + i,
    direction: "above",
    yellow: 80,
    red: 90,
    enabled: true,
    ageMinutes: status === "gray" ? 16 : 0,
  }));
}
export const communityPages = [
  {
    id: "upw-duty",
    title: "F18P2 UPW 值班監看",
    description: "超純水水質與設備即時監控",
    author: "林怡君",
    initials: "YL",
    team: "廠務一課",
    system: "upw",
    site: "F18P2",
    status: "red" as Status,
    favorites: 42,
    updated: "10:42",
  },
  {
    id: "upw-quality",
    title: "UPW TOC 品質日報",
    description: "TOC 水質趨勢與每日巡檢",
    author: "陳志明",
    initials: "CM",
    team: "水課",
    system: "upw",
    site: "F18P1",
    status: "yellow" as Status,
    favorites: 31,
    updated: "09:18",
  },
  {
    id: "power-load",
    title: "F18P2 電力負載總覽",
    description: "主要變電站與用電負載",
    author: "王建宏",
    initials: "JW",
    team: "電力課",
    system: "power",
    site: "F18P2",
    status: "yellow" as Status,
    favorites: 24,
    updated: "10:35",
  },
  {
    id: "upw-reclaim",
    title: "F18P7 UPW 回收水監看",
    description: "回收水系統的穩定運行",
    author: "張雅婷",
    initials: "YT",
    team: "F18P7 廠務",
    system: "upw",
    site: "F18P7",
    status: "green" as Status,
    favorites: 18,
    updated: "10:28",
  },
  {
    id: "hvac-monitor",
    title: "F18P3 空調 MAU 監控",
    description: "外氣空調箱溫濕度監控",
    author: "黃俊傑",
    initials: "JH",
    team: "空調課",
    system: "hvac",
    site: "F18P3",
    status: "red" as Status,
    favorites: 16,
    updated: "10:41",
  },
  {
    id: "gas-supply",
    title: "大宗氣體供應看板",
    description: "氣體供應與管路壓力管理",
    author: "劉家豪",
    initials: "CH",
    team: "氣體課",
    system: "gas",
    site: "F18P1",
    status: "green" as Status,
    favorites: 12,
    updated: "10:32",
  },
];
