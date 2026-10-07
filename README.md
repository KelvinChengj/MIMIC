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
server/validate.js 頁面設定驗證與淨化
public/logic.js    燈號判斷邏輯（純函式，已單元測試）
public/app.js      SPA：頁面清單 / 檢視 / 積木編輯器
```

頁面資料格式：`{ title, lights: [{ id, label, fallback, rules: [{ color, mode, conds: [{ tag, op, value, value2 }] }] }] }`。

> 目前尚未做使用者登入與權限；對外開放前請置於內網或加上反向代理驗證。
