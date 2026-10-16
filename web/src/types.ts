/** 紅異常 / 黃部分異常 / 綠正常 / 灰無資料 */
export type Status = 'red' | 'yellow' | 'green' | 'gray';

/**
 * 單一量測類型（Tag 名稱 `.` 後的尾碼，例如 TOC、RES）的界限。
 * 只給「模擬 FDM」用來產生 isOOS / isOOC 旗標：red＝規格界限（超出即 OOS），yellow＝管制界限（超出即 OOC）。
 * 前端本身不再用門檻判斷燈號。
 */
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

/** FDM 回傳的單一 Tag：最新值與 FDM 判定的旗標 */
export interface TagReading {
  name: string;
  desc: string;
  metric: string;
  /** 最新值；null＝沒有收到資料 */
  value: number | null;
  /** Out of Spec：超出規格界限 → 紅燈 */
  isOOS: boolean;
  /** Out of Control：超出管制界限（未超規格）→ 黃燈 */
  isOOC: boolean;
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

/** 燈號積木選取的一個 Tag（廠區 + Tag 名稱） */
export interface TagRef {
  site: string;
  tag: string;
}

/**
 * 「燈號積木」(type: 'lamp') 的內容。燈號完全由 FDM 旗標決定：
 * 任一 Tag isOOS → 紅；否則任一 isOOC → 黃；都正常 → 綠；全部無資料 → 灰。
 */
export interface LampProps {
  /** 選取的 Tag */
  tags?: TagRef[];
  /** 整個系統：顯示某廠區某系統所有 Tag 的彙整燈號（文字如「3 台異常」，點了下鑽） */
  source?: { site: string; system: string };
  /** 舊版（自訂算式時期）的資料點；讀取時轉成 tags，條件算式已不再使用 */
  vars?: { name: string; site?: string; tag?: string }[];
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
  /** 內建頁面（燈號牆）的版面：預設由程式產生，使用者改過才會存下來 */
  builtin?: boolean;
}
