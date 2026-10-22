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
/** virtual tag 的最新值：值就是燈號代碼（對照見 lib/status.ts 的 LAMP_CODE） */
export interface VTagReading {
  value: number | null;
}

/** 一次向 FDM 批次取值的結果（只取燈號用的 virtual tag） */
export type Snapshot = {
  updatedAt: number;
  /** 依「廠區|virtual tag」存放；FDM 沒有的 virtual tag 不會出現 */
  readings: Record<string, VTagReading>;
};

/** 下鑽時由 virtual tag 讀回的 InSQL tag 清單與數值 */
export interface VTagDetail {
  at: number;
  tags: (TagReading & { key: string; unit: string; decimals: number })[];
}

/** 頁面層級：值班情境（燈號 = virtual tag，點了下鑽）／戰情指揮官（燈號 = 值班情境頁，點了進入該頁） */
export type Layer = 'duty' | 'command';

export interface Scope {
  sites: string[];
  systems: string[];
}

export interface PageDef {
  slug: string;
  title: string;
  /** 內建頁面的層級（預設值班情境） */
  layer?: Layer;
  /** 資料範圍：哪些廠區 × 系統 */
  scope?: Scope;
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

/** 燈號積木選取的一個 Tag（廠區 + Tag 名稱；舊版資料） */
export interface TagRef {
  site: string;
  tag: string;
}

/** 一個 virtual tag（廠區 + 名稱） */
export interface VTagRef {
  site: string;
  name: string;
}

/**
 * 值班情境層的「燈號積木」(type: 'lamp')：綁一個 virtual tag，值就是燈號代碼；點了下鑽 InSQL tag 清單。
 */
export interface LampProps {
  vtag?: VTagRef;
  /** 舊版：整個情境（廠區 + 情境代號），讀取時轉成對應的 virtual tag */
  source?: { site: string; system: string };
  /** 舊版：選取的 Tag／自訂算式的資料點；已不再使用 */
  tags?: TagRef[];
  vars?: { name: string; site?: string; tag?: string }[];
}

/** 戰情指揮官層的「值班情境燈號」(type: 'duty')：指向一個值班情境頁 */
export interface DutyProps {
  page: string;
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
  /** 頁面層級；舊資料沒有這個欄位時視為值班情境 */
  layer?: Layer;
  /** 燈號尺寸定義的版本：2 = 小只有燈、中為原本的小、大為原本的中。舊資料讀取時換算 */
  sizes?: 2;
  /** 頁面分類：System（系統，例如「超純水」）與 Phase（廠區，例如「F18P2」），和 Explore 的欄位一致 */
  system?: string;
  phase?: string;
}

export type PageMeta = Pick<UserPage, 'system' | 'phase'>;
