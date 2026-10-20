import type { ComponentType, ReactNode } from 'react';
import type { TagIndex } from '../lib/blocks';
import type { BlockSize, Layer, PageBlock, Snapshot, Status, UserPage } from '../types';
import type { Footprint } from './layout';

/** 積木判定燈號時可取用的資料 */
export interface BlockEnv {
  snapshot: Snapshot;
  /** FDM 最新回傳，依「廠區|Tag」查詢 */
  index: TagIndex;
  /** 依 slug 取得頁面（指揮官層的燈號要看值班情境頁裡的燈號） */
  getPage: (slug: string) => UserPage | undefined;
}

/** 積木所在的頁面環境 */
export interface BlockHost {
  /** 畫布頁上某顆積木的下鑽頁（值班情境的燈號）；預覽等沒有頁面的情境不提供 */
  blockTo?: (blockId: string) => string;
  /** 前往另一個頁面（指揮官層的燈號進入值班情境頁）；預覽時不提供 */
  pageTo?: (slug: string) => string;
}

export interface RenderProps<P> {
  block: PageBlock<P>;
  /** flow：內建頁面由上而下排版（寬度跟隨頁面）；canvas：畫布上依尺寸固定大小 */
  mode: 'flow' | 'canvas';
  host: BlockHost;
}

export interface EditorProps<P> {
  block: PageBlock<P>;
  /** 更新積木自己的內容（props），只需給要改的欄位 */
  onProps: (patch: Partial<P>) => void;
}

/**
 * 積木定義：一種積木需要提供的全部東西。
 * 新增積木種類 = 寫一個 BlockDefinition，再在 blocks/index.ts 註冊，
 * 積木庫、畫布、編輯對話框、側欄燈號都會自動支援。
 */
export interface BlockDefinition<P = unknown> {
  type: string;
  label: string;
  description: string;
  /** 積木庫裡的分組 */
  category: string;
  /** 哪些層級的頁面可以使用（積木庫只列出符合的）；不寫＝都可以 */
  layers?: Layer[];
  icon: ReactNode;
  defaultProps: () => P;
  /** 新增時的預設名稱；n 是頁面上同種積木的序號 */
  defaultTitle: (n: number) => string;
  defaultSize?: BlockSize;
  /**
   * false＝不出現在積木庫（使用者無法自己新增），但仍可註冊給內建頁面使用。
   * 預設 true。
   */
  inLibrary?: boolean;
  /** 選填：包住整個編輯對話框的 Provider（編輯器、預覽、判斷過程共用的暫時狀態，例如模擬值） */
  EditorProvider?: ComponentType<{ children: ReactNode }>;
  /** 名稱欄位對這種積木沒意義時設為 true（例如文字積木本身就是內容） */
  titleless?: boolean;
  /** true：畫布上高度固定等於 footprint.h（燈號磚塊）；否則高度跟著內容 */
  fixedHeight?: boolean;
  /** 在畫布上佔用的大小，由尺寸與內容決定（用來避開重疊、決定畫布範圍） */
  footprint: (block: PageBlock<P>) => Footprint;
  /** 使用者看到的呈現（檢視、編輯、預覽共用同一個元件） */
  Render: ComponentType<RenderProps<P>>;
  /** 編輯對話框裡的內容設定 */
  Editor: ComponentType<EditorProps<P>>;
  /** 選填：判斷過程說明（顯示在預覽下方；有這個的積木在檢視頁點擊會開啟說明） */
  Explain?: ComponentType<{ block: PageBlock<P> }>;
  /** 選填：這顆積木在檢視頁點了是否開啟 Explain（預設有 Explain 就開）；自己會處理點擊（例如下鑽）的積木回傳 false */
  explainable?: (block: PageBlock<P>) => boolean;
  /** 選填：這顆積木對整頁燈號（側欄圓點）的貢獻；沒有燈號意義的積木不用寫 */
  status?: (block: PageBlock<P>, env: BlockEnv) => Status | null;
}
