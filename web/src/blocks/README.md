# 積木庫（Block Store）

使用者看到的**所有主要呈現**都是積木：值班情境頁與戰情指揮官頁（內建與自建）都是積木畫布。大家共用同一套定義，所以新增積木種類只要寫一次。

```
blocks/
  types.ts        BlockDefinition 介面（一種積木要提供什麼）
  registry.ts     積木庫本體：registerBlock / getBlockDef / blockLibrary / createBlock
  index.ts        註冊內建積木（順序 = 積木庫顯示順序）
  layout.ts       尺寸標籤、格線對齊、找空位、畫布範圍（純函式）
  BlockView.tsx   BlockRender（依 type 找到元件）
  host.ts         積木的連結（下鑽、進入其他頁面）
  builtin.ts      內建頁面的預設版面（值班情境、戰情指揮官）
  lamp/ duty/ text/   各積木種類：定義 + 呈現 + 編輯器
```

## 內建頁面也是積木畫布

內建頁面的預設版面由 `builtin.ts` 產生：

- 值班情境（各系統頁、Explore 的頁面）：`defaultWallLayout`，每個廠區 × 系統一顆綁 virtual tag（`vtag: { site, name }`）的小燈號，加上欄名、列名、標題的文字積木。
- 戰情指揮官（全廠總覽）：`defaultCommandLayout`，每個內建值班情境一顆值班情境燈號（`page: slug`），展示大、中、小三種尺寸。

使用者第一次修改時才把版面存進 `mimic.userpages.v1`（`builtin: true`、`layer`），之後與自建頁面走同一套編輯與儲存；「重置展示資料」會把存下的版面全部丟掉。內建頁面的層級改變時，層級不符的舊版面不再使用。

## 資料模型

頁面上的每個積木是 `PageBlock { id, type, title, size, x, y, props }`：

- `type`：對應 registry 裡註冊的種類
- `size`：`'S' | 'M' | 'L'`（小 / 中 / 大），由各積木自己決定三種尺寸長什麼樣
- `props`：該種類自己的內容（例如燈號積木的 `vtag`、值班情境燈號的 `page`）
- 自建頁面存在 localStorage（`mimic.userpages.v1`）；舊版沒有 `type` 的資料讀取時會自動轉成燈號積木（`normalizeBlock`）

## 內建積木

| type | 名稱 | 層級 | 說明 | 對頁面燈號的貢獻 |
|---|---|---|---|---|
| `lamp` | 燈號 | 值班情境 | 綁一個 virtual tag，值就是燈號代碼；點了下鑽 InSQL tag 清單 | 該燈 |
| `duty` | 值班情境燈號 | 戰情指揮官 | 代表一個值班情境頁，取該頁燈號最差；點了進入該頁 | 該值班情境 |
| `text` | 文字 | 兩層 | 標題或備註 | 無 |

`layers` 決定積木庫在哪個層級的頁面列出（不寫＝兩層都可用）；`inLibrary: false` 的積木仍然註冊，只是積木庫不列出。

## 新增一種積木

1. 建立 `blocks/<名稱>/index.tsx`，匯出一個 `BlockDefinition<Props>`：

```tsx
export const gaugeBlock: BlockDefinition<GaugeProps> = {
  type: 'gauge',                       // 唯一識別
  label: '量表', description: '…', category: '資料',   // 積木庫分組
  icon: <GaugeIcon />,
  defaultProps: () => ({ tag: undefined }),
  defaultTitle: (n) => `量表 ${n}`,
  footprint: (b) => ({ S: { w: 120, h: 96 }, M: { w: 180, h: 140 }, L: { w: 260, h: 200 } }[b.size]),
  Render: GaugeRender,                 // 檢視、編輯、預覽共用
  Editor: GaugeEditor,                 // 編輯對話框裡的設定表單
  status: (b, env) => /* 紅黃綠灰，或不寫 */,
};
```

2. 在 `blocks/index.ts` 的清單加上它。

之後積木庫面板、畫布（拖曳、小中大切換、複製、刪除）、編輯對話框、即時預覽、側欄圓點、舊資料轉換全部自動支援，不用改其他檔案。

### 尺寸（小 / 中 / 大）

`size: 'S' | 'M' | 'L'`。燈號類積木（燈號、值班情境燈號）的外框長寬是 **1 : 2 : 4**，倍率集中在 `layout.ts` 的 `SCALE`（以中尺寸為 1；要改比例只改這裡）：

| 尺寸 | 外框 | 燈號圖示 | 內容 |
|---|---|---|---|
| 小 | 48 × 44 | 36 | 只有一顆燈：沒有外框、沒有文字（名稱與狀態在滑鼠提示） |
| 中 | 96 × 88 | 28 | 燈 + 一行文字 |
| 大 | 192 × 176 | 56 | 名稱 + 燈 + 一行文字 |

舊資料：尺寸改定義前存的頁面（`UserPage.sizes` 不是 2）讀取時由 `migrateSizes` 換算，原本的小 → 中、中 → 大、原本 384 × 352 的大 → 大。

### 約定

- `Render` 會收到 `mode`（目前都是 `canvas`，寬度用 `footprint`）與 `host`（`blockTo` 下鑽、`pageTo` 進入其他頁面；預覽時兩者都沒有）。需要固定高度（像燈號磚塊）就設 `fixedHeight: true`。
- 三種尺寸都要有意義：小＝只留最重要的資訊，大＝可以多一行說明或放大數值。
- 編輯模式下積木內容的點擊會被外框攔截（才能拖曳），不用自己處理。
- 編輯對話框裡需要共用、但不存進頁面的暫時狀態，可以用 `EditorProvider` 包住整個對話框（目前內建積木沒有使用）。
- 想在檢視頁點了顯示「判斷過程」就提供 `Explain`；沒有燈號意義就不要寫 `status`。
- 系統裡沒有註冊的 `type`（例如日後移除了某種積木）會顯示提示卡，不會讓整頁壞掉。
