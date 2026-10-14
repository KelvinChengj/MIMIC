# 積木庫（Block Store）

使用者看到的**所有主要呈現**都是積木：內建的燈號牆頁面是一個「燈號牆」積木，下鑽頁是「系統摘要」＋「Tag 清單」兩個積木，自建頁面的畫布上則可以自由擺放任何積木。大家共用同一套定義，所以新增積木種類只要寫一次。

```
blocks/
  types.ts        BlockDefinition 介面（一種積木要提供什麼）
  registry.ts     積木庫本體：registerBlock / getBlockDef / blockLibrary / createBlock
  index.ts        註冊內建積木（順序 = 積木庫顯示順序）
  layout.ts       尺寸標籤、格線對齊、找空位、畫布範圍（純函式）
  BlockView.tsx   BlockRender（依 type 找到元件）、BlockStack（內建頁面由上而下排版）
  builtin.ts      內建頁面由哪些積木組成
  lamp/ wall/ summary/ tags/ text/   各積木種類：定義 + 呈現 + 編輯器
```

## 資料模型

頁面上的每個積木是 `PageBlock { id, type, title, size, x, y, props }`：

- `type`：對應 registry 裡註冊的種類
- `size`：`'S' | 'M' | 'L'`（小 / 中 / 大），由各積木自己決定三種尺寸長什麼樣
- `props`：該種類自己的內容（例如燈號積木的 `vars / redExpr / yellowExpr`）
- 自建頁面存在 localStorage（`mimic.userpages.v1`）；舊版沒有 `type` 的資料讀取時會自動轉成燈號積木（`normalizeBlock`）

## 內建積木

| type | 名稱 | 說明 | 對頁面燈號的貢獻 |
|---|---|---|---|
| `lamp` | 燈號 | 挑 Tag、寫算式，顯示一顆燈（磚塊格式同燈號牆） | 該燈 |
| `wall` | 燈號牆 | 廠區 × 系統矩陣，點燈號下鑽 | 範圍內最差 |
| `summary` | 系統摘要 | 單一系統整體燈號 + 判定規則 | 該系統 |
| `tags` | Tag 清單 | 名稱 / 說明 / 數值，依嚴重度排序 | 該系統 |
| `text` | 文字 | 標題或備註 | 無 |

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

### 約定

- `Render` 會收到 `mode`：`flow`（內建頁面，寬度跟隨頁面）或 `canvas`（畫布上，寬度用 `footprint`）。需要固定高度（像燈號磚塊）就設 `fixedHeight: true`。
- 三種尺寸都要有意義：小＝只留最重要的資訊，大＝可以多一行說明或放大數值。
- 編輯模式下積木內容的點擊會被外框攔截（才能拖曳），不用自己處理。
- 想在檢視頁點了顯示「判斷過程」就提供 `Explain`；沒有燈號意義就不要寫 `status`。
- 系統裡沒有註冊的 `type`（例如日後移除了某種積木）會顯示提示卡，不會讓整頁壞掉。
