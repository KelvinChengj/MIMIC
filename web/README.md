# MIMIC Web（React + TypeScript）

廠務燈號平台的桌機版網頁設計。燈號：🔴 紅＝異常、🟡 黃＝部分異常、🟢 綠＝正常、⚪ 灰＝無資料；資料來源為 FDM（目前以模擬資料取代）。

```bash
cd web
npm install
npm run dev        # http://localhost:5173
npm test           # 燈號判定邏輯單元測試（vitest）
npm run build      # tsc 型別檢查 + 正式建置到 dist/
```

## 兩層架構

```
戰情指揮官層（全廠總覽、自建指揮頁）     巨觀與指揮值班
  每顆燈 = 一個值班情境頁，取該頁最差燈號
  點燈號 → 進入值班情境的 MIMIC（不下鑽）
        │
值班情境層（Power、UPW、HVAC…、自建值班頁）
  每顆燈 = 一個 virtual tag，值就是燈號代碼
  點燈號 → 下鑽層：由 virtual tag 讀回 InSQL tag 清單（數值、OOC、OOS）
```

- **值班情境**：和原本的 MIMIC 相同，是燈號與文字積木組成的畫布。燈號綁上游定義的 **virtual tag**，判定在上游完成，MIMIC 不重算。
- **戰情指揮官**：由值班情境組成。燈號取該值班情境頁所有燈號最差（紅 > 黃 > 灰 > 綠，有缺資料不報平安），文字顯示各色數量（例如「1 紅 · 1 黃」）。只能引用值班情境頁，不會一層套一層。
- 指揮官層目前只做燈號；值班人員、異常確認、交辦事項等指揮功能之後再加。

### virtual tag 燈號代碼

| virtual tag 的值 | 燈號 |
|---|---|
| 2 | 紅 |
| 1 | 黃 |
| 0 | 綠 |
| 沒有值、或不在表上 | 灰 |

對照表在 `src/lib/status.ts` 的 `LAMP_CODE`，要改代碼只改這裡。

## 頁面與網址

每一頁都有獨立網址（BrowserRouter；正式部署的靜態伺服器需把所有路徑 fallback 到 `index.html`）。

| 網址 | 內容 |
|---|---|
| `/p/overview` | 首頁：F18A 全廠總覽（戰情指揮官），每顆燈代表一個值班情境，點了進入該頁 |
| `/p/:slug` | 積木畫布頁（值班情境或戰情指揮官，標題旁標示層級）。沒有功能的示意頁（CDA、PCW、我的MIMIC、異常追蹤、設備維護、節能專案）已移除，舊的側欄設定讀取時自動清掉 |
| `/p/:slug/b/:blockId` | 下鑽頁：值班燈號的摘要卡 + 由 virtual tag 讀回的 **InSQL tag 清單**（Tag name / Description / Value / OOC / OOS），可切「僅顯示異常 / 全部 Tag」，Refresh Values 重新取值。指揮官燈號的這個網址會轉到該值班情境頁 |
| `/p/:slug/edit` | 編輯模式：積木畫布，左側積木庫依層級只列出可用的積木；內建頁面可「還原預設版面」 |
| `/vtags` | Virtual Tag 清單（唯讀）：目前值、燈號、組成的 InSQL tag 數、被幾個頁面引用。目前先從側欄隱藏，只能直接輸入網址進入 |
| `/vtags/:site/:name` | 單一 virtual tag 的下鑽 |
| `/explore?q=UPW&page=…&system=…&site=…&author=…&status=…&sort=…&dir=…` | 搜尋他人頁面；表格採 AG Grid 形式：點欄名排序（再點反向），表頭下方的篩選列輸入即篩選；☆ 加入 / 移除 Favorites（條件都放在網址，可分享） |

舊網址：`/p/:slug/:site/:system` 轉到對應燈號的下鑽頁；`/systems`、`/scenarios` 轉到 `/vtags`。

### 積木

使用者看到的主要呈現都是積木，內建頁面與自建頁面共用同一套（架構與擴充方式見 [`src/blocks/README.md`](src/blocks/README.md)）：

| 積木 | 層級 | 用途 |
|---|---|---|
| 燈號 | 值班情境 | 綁一個 virtual tag，值就是燈號；點了下鑽 InSQL tag 清單 |
| 值班情境燈號 | 戰情指揮官 | 代表一個值班情境頁，取該頁最差燈號；點了進入該頁 |
| 文字 | 兩層都可用 | 標題與備註 |

每個積木都有**小 / 中 / 大**三種尺寸，長寬比例 **1 : 2 : 4**。編輯模式下：**點一下積木選取**，工具列固定顯示在積木下方（尺寸切換、編輯、複製、刪除）；雙擊或按「編輯」開啟編輯器，右側以實際大小即時預覽。點空白處或按 Esc 取消選取。

### 燈號積木：選一個 virtual tag

燈號**不需要設定任何條件**。編輯器裡選廠區、輸入 virtual tag 名稱按「檢查並套用」（不分大小寫，上游找不到會提示），或從 virtual tag 清單搜尋點選；選取後顯示目前值與燈號。

舊資料會自動轉換：舊版「整個情境」的燈號轉成該廠區 × 系統的 virtual tag；舊版「選取 Tag」與自訂算式的燈號沒有對應的 virtual tag，顯示灰燈「尚未選擇 virtual tag」，需要重新選擇。

### 內建頁面也是積木

- **全廠總覽**（戰情指揮官）：每個內建值班情境（Power、UPW、HVAC、Exhaust、Gas、Chemical）一顆中尺寸燈號。
- **各系統頁與 Explore 的頁面**（值班情境）：每個廠區 × 系統一顆小燈號，綁該格的 virtual tag；欄名、列名、標題是文字積木。

按 **Edit** 就能像自建頁面一樣拖曳、縮放、增刪，修改自動儲存；**還原預設版面**可回到原樣。內建頁面的層級改變時（例如全廠總覽改為戰情指揮官），之前存下的舊版面不再使用，改用新的預設版面。

### 自建頁面

- 側欄「＋ 新增頁面」（或各分類標題的 ＋）建立空白頁面，先選**層級**（值班情境 / 戰情指揮官），再進入畫布編輯模式（`/p/u-xxxxxx/edit`）。
- 左側**積木庫**依層級列出可用的積木，點一下加到畫布；積木可拖曳（對齊 10px 格線）、方向鍵微調、複製、刪除。

### 側欄

- 戰情指揮官頁在側欄標示「指揮」。
- Favorites 旁的 ＋ 是**新增分類**；分類可改名、刪除（頁面會併入相鄰分類，不會消失）。
- **所有頁面（含內建頁面）都能上下調整**：拖曳到任何分類的任何位置，或用滑過時出現的 ↑ ↓ 按鈕（到分類邊界會跨到相鄰分類）。分類本身也能拖曳或用 ↑ ↓ 調整順序。

左側 Favorites 側欄可收合為窄欄、群組可展開 / 收起、群組內可拖曳排序；狀態存在 localStorage。**Full screen** 進入看板模式（Esc 離開）。

## FDM 取值時機

- **燈號**：只在開啟網頁時一次、按重新整理時一次（頂欄更新時間旁的按鈕、下鑽頁的 Refresh Values），不做定時自動更新。只取所有頁面燈號用到的 virtual tag，去除重複後**合成一次批次請求**（`fetchLamps`），所有頁面與積木共用這份結果。
- **下鑽**：進入下鑽頁時，才由那個 virtual tag 讀回 InSQL tag 清單（`fetchVTagDetail`，一次請求），暫存到下次按重新整理。
- **新選的 virtual tag**：在燈號編輯器選了還沒取過值的 virtual tag 時，只查這一個並併入目前的資料。
- 指揮官燈號不另外取值，直接用值班情境頁裡的 virtual tag 結果。
- 正式環境建議由 MIMIC 後端統一向 FDM 取值並暫存，不論多少使用者，FDM 每次只被呼叫一次。

## 燈號判定規則

- **值班燈號**：virtual tag 的值就是燈號代碼（見上表），前端不做門檻判斷。
- **下鑽的 InSQL tag**：沒有資料 → 灰；`isOOS` → 紅；`isOOC` → 黃；否則綠。
- **指揮官燈號、頁面燈號**（側欄、Explore 的圓點）：取最差，紅 > 黃 > 灰 > 綠，有缺資料的頁面不報平安。

## 結構

```
src/catalog/catalog.ts  廠區、系統、模擬資料用的 InSQL tag、頁面目錄（含 Explore 資料與層級）
src/lib/fdm.ts          FDM / InSQL 資料來源（模擬）：virtual tag 主檔、fetchLamps、fetchVTagDetail。接真實 API 只需替換這兩個函式
src/lib/status.ts       燈號代碼對照、InSQL tag 判定、彙整、規則文字（純函式，有測試）
src/lib/blocks.ts       燈號積木綁的 virtual tag 與判定（有測試）
src/lib/pages.ts        頁面層級、指揮官看值班情境的彙整、要取值的 virtual tag（有測試）
src/blocks/             積木：lamp（燈號）、duty（值班情境燈號）、text（文字），以及內建頁面的預設版面
src/state/              FDM / 頁面 / Favorites / UI 的 Context
src/pages/              UserPageView、LampDrillPage（下鑽）、VTagsPage、ExplorePage、PageRoute、EditRoute
src/components/         Layout、Sidebar、Topbar、Lamp、LayerChip 等
```

示範資料：F18P2 超純水的 virtual tag 為 2（下鑽可看到 3 OOS、2 OOC、1 無資料）；F18P7 排氣沒有資料（灰）；F18P1 電力 TR1 溫度 97 °C 為 OOS（紅）。模擬的 virtual tag 依組成的 InSQL tag 計算代碼，接上真實資料後改由上游提供。

> 這是前端設計稿：沒有後端與登入，自建頁面與版面只存在瀏覽器 localStorage。
>
> 已移除以精簡設計：「門檻設定」頁（可從 commit `a303852` 的 `src/pages/EditPage.tsx` 找回）、燈號積木的自訂算式 / 條件精靈 / 模擬值（可從 commit `a5e732e` 的 `src/lib/expr.ts`、`src/blocks/lamp/` 找回）、情境管理（可從 commit `21ebae7` 的 `src/pages/SystemsPage.tsx`、`src/pages/SystemEditPage.tsx` 找回）。
