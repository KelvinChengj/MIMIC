# MIMIC 廠務燈號平台

一目了然的廠務管理品質平台：以燈號呈現狀態，資料來自 FDM 廠務運轉數據。

| 燈號 | 意義 |
|---|---|
| 🔴 紅 | 異常 |
| 🟡 黃 | 部分異常 |
| 🟢 綠 | 正常 |
| ⚪ 灰 | 無資料 |

## 快速開始

```bash
npm start            # http://localhost:3000，零依賴（Node 18+）
npm test
```

## 功能

- **自訂頁面、獨立網址**：`/p/<代稱>` 檢視、`/p/<代稱>/edit` 編輯；首頁 `/` 管理所有頁面。
- **積木編輯器**：積木庫 →「燈號」積木拖到畫布；點擊畫布上的燈號會**彈出編輯視窗**，在視窗內用「如果…就亮…」積木堆疊判斷邏輯。
  - 規則由上而下，**第一個成立**的規則決定顏色；皆不成立則用「否則亮…」。
  - 每條規則可有多個條件，並選「符合任一／符合全部」。
  - 運算子：`> >= < <= == !=`、介於（含）、超出範圍。
  - 任一被引用的資料點無資料 → 內建亮灰燈。
  - 編輯時以即時 FDM 數值預覽結果；`Ctrl/⌘+S` 儲存。
- **看板模式**：檢視頁的「看板模式」隱藏頂欄（Esc 離開），每 5 秒自動更新。

## 純前端試玩版（免後端）

```bash
node scripts/build-demo.mjs   # 輸出 dist-demo/，用任何靜態伺服器開啟 index.html
```

試玩版以 `public/static-backend.js` 在瀏覽器內模擬 API，資料存在 localStorage，與伺服器版共用 `public/shared/`。

## 接上真實 FDM

預設使用內建模擬資料。設定環境變數即切換為真實資料源：

```bash
FDM_API_URL=https://fdm.example.com/api FDM_API_TOKEN=xxx npm start
```

預期介面（若實際格式不同，只需修改 `server/fdm.js`）：

- `GET {FDM_API_URL}/tags` → `[{ "tag", "name", "unit", "area" }]`
- `GET {FDM_API_URL}/values?tags=a,b` → `{ "a": { "value": 1.2, "ts": 1712345678000 }, "b": null }`（`null` = 無資料）

## 結構

```
server/index.js    HTTP 伺服器 + REST API（頁面 CRUD、FDM 代理）
server/fdm.js      FDM 資料源轉接層（模擬 / 真實）
server/store.js    頁面設定儲存（data/pages.json；可換成資料庫）
public/shared/     範例資料、頁面驗證、模擬 FDM（伺服器與試玩版共用）
public/logic.js    燈號判斷邏輯（純函式，已單元測試）
public/app.js      SPA：頁面清單 / 檢視 / 積木編輯器
```

頁面資料格式：`{ title, lights: [{ id, label, fallback, rules: [{ color, mode, conds: [{ tag, op, value, value2 }] }] }] }`。

> 目前尚未做使用者登入與權限；對外開放前請置於內網或加上反向代理驗證。

## React / TypeScript 燈號平台

新版桌機介面以 React 19、TypeScript、Vite 建置，包含白底燈號牆、Tag 下鑽、門檻編輯與 Test 試算、Explore 與 Favorites。

```bash
pnpm install
pnpm dev          # React 開發預覽，http://localhost:5173
pnpm test         # 新增的門檻 / FDM 測試，以及既有後端測試
pnpm build        # TypeScript 檢查與正式產物 dist/
pnpm start        # 有 dist 時提供新版 React；否則提供原介面
```

原介面仍可用 `MIMIC_PUBLIC_DIR=public pnpm start` 開啟，原試玩版可用 `pnpm build:legacy` 建置。

### 路由與操作

- `/overview`：4 個廠區 × 7 個系統燈號牆，點擊燈號可下鑽。統計卡可篩選狀態。
- `/systems/f18p2/upw`：Tag name、Description、Value、狀態及門檻。支援 Tag 搜尋與異常篩選。
- `/edit/f18p2/upw`：設定頁面名稱、資料逾時、監控 Tag、判定方向和黃紅門檻，按 Test 試算後儲存。可新增 FDM Tag。
- `/explore`：搜尋團隊範例頁面，依系統／廠區篩選、排序並收藏。
- `/p/upw-duty` 等：收藏頁面獨立網址；與同一廠區／系統共用監控規則。

紅燈優先，其次黃燈；有缺值、非有限數值或逾時且沒有異常時為灰燈；其餘為綠燈。門檻使用嚴格大於／小於，相等仍在該門檻內。無監控 Tag 為灰燈。門檻與 Favorites 使用 localStorage，此版尚未提供跨使用者共用設定與登入。

### 新介面的 FDM 串接

預設使用固定示範快照，介面會明確標示示範模式。正式資料模式使用既有後端代理，不將 FDM token 放入前端。

```bash
# 終端一：啟動 FDM 代理，正式 URL / token 僅由後端讀取
FDM_API_URL=https://fdm.example.com/api FDM_API_TOKEN=xxx pnpm start
# 終端二：React 開發伺服器代理 /api 至 localhost:3000
VITE_FDM_MODE=live pnpm dev
# 或正式建置後，讓同一 Node 伺服器提供 React 與 API
VITE_FDM_MODE=live pnpm build
FDM_API_URL=https://fdm.example.com/api FDM_API_TOKEN=xxx pnpm start
```

React 呼叫 `/api/fdm/values?tags=...`，預期回傳 `{ mode: "live", values: { "TAG.NAME": { value: 3.4, ts: 1712345678000 } } }`，`ts` 為 Unix 毫秒。缺少 Tag 或 `null` 將顯示灰燈。首次開啟及按「更新數值」時重新取得資料；目前沒有自動輪詢。正式接入時請依 FDM 實際 Tag name 新增／調整監控清單，範例 Tag 未映射時為灰燈。

前端實作：`src/App.tsx`、`src/data.ts`（門檻判定）、`src/fdm.ts`（代理回應驗證）、`src/styles.css`。
