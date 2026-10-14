/** 紅異常 / 黃部分異常 / 綠正常 / 灰無資料 */
export type Status = 'red' | 'yellow' | 'green' | 'gray';

/** 單一量測類型（Tag 名稱 `.` 後的尾碼，例如 TOC、RES）的管制門檻；留空代表不管制 */
export interface MetricRule {
  yellowHigh?: number;
  yellowLow?: number;
  redHigh?: number;
  redLow?: number;
}

export interface MetricDef {
  code: string;
  /** 規則說明中顯示的名稱，例如「電阻率」 */
  label: string;
  unit: string;
  decimals: number;
  defaults: MetricRule;
}

export interface TagTemplate {
  /** 完整 Tag 名稱，尾碼（`.` 之後）即 metric code */
  name: string;
  desc: string;
  /** 正常運轉的典型值，用於產生模擬 FDM 資料 */
  nominal: number;
}

export interface SystemDef {
  id: string;
  name: string;
  short: string;
  /** 紅燈需連續成立的點數 */
  defaultConsecutive: number;
  /** 超過幾分鐘沒有 FDM 資料就判定為灰燈 */
  defaultStaleMinutes: number;
  metrics: MetricDef[];
  tags: TagTemplate[];
}

export interface SiteDef {
  id: string;
  name: string;
  label: string;
  /** 該廠區較小，少掉最後幾個 Tag */
  dropTags: number;
}

export interface SystemRules {
  consecutive: number;
  staleMinutes: number;
  metrics: Record<string, MetricRule>;
}
export type RulesConfig = Record<string, SystemRules>;

/** 近期歷史，最後一筆為最新值；null = 無資料 */
export type History = (number | null)[];

export interface TagReading {
  name: string;
  desc: string;
  metric: string;
  history: History;
}
export type Snapshot = {
  updatedAt: number;
  data: Record<string, Record<string, TagReading[]>>;
};

export interface Scope {
  sites: string[];
  systems: string[];
}

export interface PageDef {
  slug: string;
  title: string;
  /** 有 scope → 燈號由 FDM 即時計算；沒有 → 示意頁，使用固定狀態 */
  scope?: Scope;
  fixedStatus?: Status;
  author?: { name: string; initials: string; dept: string };
  systemTags?: string[];
  siteLabel?: string;
  clicks?: number;
  /** 不含自己的收藏數 */
  favorites?: number;
  updatedLabel?: string;
  /** 越大越新，僅用於排序 */
  updatedRank?: number;
  /** 出現在 Explore 搜尋結果 */
  explore?: boolean;
}

/** 積木尺寸：小 / 中 / 大 */
export type BlockSize = 'S' | 'M' | 'L';

export interface BlockVar {
  /** 算式中使用的名稱：A、B、C… */
  name: string;
  site?: string;
  tag?: string;
}

/** 「燈號積木」(type: 'lamp') 的內容 */
export interface LampProps {
  vars: BlockVar[];
  /** 顯示值算式（可空白）。例：(A + B) / 2 */
  valueExpr: string;
  unit: string;
  /** 紅燈條件。例：A > 3 or B < 17.5 */
  redExpr: string;
  /** 黃燈條件；紅燈不成立時才判斷 */
  yellowExpr: string;
}

/**
 * 頁面上的一個積木。所有積木共用這個外殼，
 * 各積木種類自己的內容放在 props（由 src/blocks/ 底下對應的定義負責解讀）。
 */
export interface PageBlock<P = unknown> {
  id: string;
  /** 積木種類，對應 blocks/registry 裡註冊的 type */
  type: string;
  title: string;
  size: BlockSize;
  /** 畫布座標（流式排版的內建頁面不使用） */
  x: number;
  y: number;
  props: P;
}

export interface UserPage {
  slug: string;
  title: string;
  blocks: PageBlock[];
  createdAt: number;
}
