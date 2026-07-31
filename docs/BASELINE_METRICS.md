# 基準數據對帳表（Baseline Metrics）

> **產出日期**: 2026-07-31
> **狀態**: ✅ 單一數據來源（Single Source of Truth）
> **對應工作項**: `docs/FULL_SYSTEM_REDESIGN_PLAN.md` §5 工作項 0.5（XC-2 文件與計數對帳）
> **口徑規範**: 沿用 `docs/audit/baseline-counting-spec.md` 既有分類定義（module/page/route 的 include/exclude 規則），本文件補上「實測值」與「可重跑指令」

---

## 為什麼需要這份文件

docs/ 內既有文件對「模組數」「頁面數」互相矛盾：

| 文件 | 後端模組 | 前端頁面 | 產出日期 |
|------|:--------:|:--------:|:--------:|
| `docs/audit/00-system-inventory.md` | 175 | 109 | 2026-01-13 |
| `docs/architecture/SYSTEM_OPTIMIZATION_PLAN.md` | 175 | 18（+29 元件） | （早期） |
| **本文件（實測）** | **119**（目錄）/ **136**（`.module.ts` 檔） | **137** | **2026-07-31** |

差異原因：舊文件多半是人工盤點或早期腳本輸出，口徑（目錄數 vs 檔案數 vs 「功能模組」主觀認定）不一致，且 repo 半年來持續新增模組與頁面。**本文件之後，任何人只要照下方指令重跑，數字應與本表一致（誤差僅來自 repo 後續變動）**。若未來數字持續飄移，請直接更新本文件並記錄新的 `產出日期`，而不要在其他文件散落新數字。

---

## 一、後端（backend/src）

| # | 指標 | 定義 | 實測值 | 計數指令 |
|---|------|------|:------:|----------|
| 1 | 後端模組**目錄**數 | `backend/src/modules/` 下第一層子目錄數（每個目錄代表一個功能域，未必都有自己的 `*.module.ts`） | **119** | `find backend/src/modules -maxdepth 1 -mindepth 1 -type d \| wc -l` |
| 2 | `*.module.ts` 檔案數（全部） | `backend/src` 樹下所有 `*.module.ts`，含 `modules/`、`core/`、`common/`、`health/`、根目錄 | **136** | `find backend/src -name "*.module.ts" -not -path "*/node_modules/*" \| wc -l` |
| 2a | ├─ `src/modules/**/*.module.ts` | | 117 | `find backend/src/modules -name "*.module.ts" \| wc -l` |
| 2b | ├─ `src/core/**/*.module.ts` | | 13 | `find backend/src/core -name "*.module.ts" \| wc -l` |
| 2c | ├─ `src/common/**/*.module.ts` | | 3 | `find backend/src/common -name "*.module.ts" \| wc -l` |
| 2d | ├─ `src/health/**/*.module.ts` | | 1 | `find backend/src/health -name "*.module.ts" \| wc -l` |
| 2e | └─ `src/*.module.ts`（根，`app.module.ts` + `health-only.module.ts`） | | 2 | `find backend/src -maxdepth 1 -name "*.module.ts" \| wc -l` |
| 3 | `app.module.ts` `imports:` 陣列中的 `*Module` 識別字（不含被 `//` 註解吃掉的部分） | 對 `imports: [...]` 區塊（第 195–373 行）逐行剝除 `//` 之後文字，再抓 `Module` 結尾識別字 | **94** | `awk 'NR==195,NR==373' backend/src/app.module.ts \| sed 's#//.*##' \| grep -oE '[A-Z][A-Za-z0-9]*Module' \| sort -u \| wc -l` |
| 3a | 同區塊內**全部**出現過的 `*Module` 識別字（含被註解吃掉的、含 `// REMOVED:` 標記的） | 不剝除註解 | 124 | `awk 'NR==195,NR==373' backend/src/app.module.ts \| grep -oE '[A-Z][A-Za-z0-9]*Module' \| sort -u \| wc -l` |
| 4 | Controller 檔案數 | `*.controller.ts`，排除 `*.spec.ts` | **122** | `find backend/src -name "*.controller.ts" -not -name "*.spec.ts" \| wc -l` |
| 5 | Service 檔案數 | `*.service.ts`，排除 `*.spec.ts` | **259** | `find backend/src -name "*.service.ts" -not -name "*.spec.ts" \| wc -l` |
| 6 | Entity 檔案數 | `*.entity.ts` | **108** | `find backend/src -name "*.entity.ts" \| wc -l` |
| 7 | 單元/整合測試（spec）檔案數 | `*.spec.ts`（`backend/src` 樹下） | **355** | `find backend/src -name "*.spec.ts" \| wc -l` |
| 8 | E2E spec 檔案數 | `*.e2e-spec.ts`（`backend/test/`） | **13** | `find backend -path "*/test/*" -name "*.e2e-spec.ts" \| wc -l` |
| 9 | TypeORM migration 支數 | `backend/src/migrations/**/*.ts` + `backend/src/database/migrations/**/*.ts` | **9** | `find backend -path "*/node_modules/*" -prune -o -path "*migrations*" -name "*.ts" -print \| wc -l` |
| 10 | TypeORM 管理外的裸 `.sql` migration 數 | `backend/migrations/*.sql`（不受 TypeORM CLI 管理，見重設計計畫 §1.3 Schema 治理） | **6** | `find backend -path "*/node_modules/*" -prune -o -iname "*.sql" -print` |

### 備註（模組目錄數 vs 模組檔案數的落差）

`backend/src/modules/` 下 119 個目錄中，有 **3 個目錄完全沒有 `*.module.ts`**（`iot/`、`permissions/`、`supply-chain/`，內含 loose service/helper 檔但未註冊為獨立 NestJS module），另有 **1 個目錄（`shared/`）有 2 個 module 檔**（`shared-auth.module.ts`、`shared-jwt.module.ts`，無單一 `shared.module.ts`）。119 − 3 + (2−1) = 117，與 §2a 的 117 一致。

`app.module.ts` 的 `imports:` 陣列存在「模組名被 `//` 註解吃掉」的已知 bug（見 `docs/FULL_SYSTEM_REDESIGN_PLAN.md` §1.5-3、工作項 E.3）：陣列文字中共出現 124 個相異 `*Module` 識別字，但其中僅 94 個位於註解剝除後仍存在的位置、在編譯期真正屬於 `imports:` 陣列成員；其餘差額包含（a）故意寫的 `// REMOVED: XxxModule` 說明性註解，以及（b）因換行被壓縮、模組名被吃進註解而**實際未被註冊**的模組（例如 `DonationsModule`、`TacticalMapsModule`、`Fire119Module` 等，詳見重設計計畫 §1.5-3 的逐項清單與 file:line 證據）。本文件僅提供可重跑的計數方法，不重複列出該清單，以該計畫文件的分析為準。

---

## 二、前端（web-dashboard/src）

| # | 指標 | 定義 | 實測值 | 計數指令 |
|---|------|------|:------:|----------|
| 11 | 前端 Page 檔案數 | `web-dashboard/src/pages/**/*.tsx`，排除 `*.test.tsx`、`*.spec.tsx`、`*.stories.tsx`（依 `baseline-counting-spec.md` 既有規則） | **137** | `find web-dashboard/src/pages -name "*.tsx" -not -name "*.test.tsx" -not -name "*.spec.tsx" -not -name "*.stories.tsx" \| wc -l` |
| 12 | 路由（`<Route>`）條數 | `web-dashboard/src/routes/*.tsx`（8 個 route group 檔：`domains` / `geo` / `governance` / `hub` / `legacy` / `logistics` / `public` / `rescue`）內 `<Route ` 出現次數總和 | **127** | `grep -c "<Route " web-dashboard/src/routes/*.tsx`（各檔案分計後加總） |
| 13 | CSS 檔案數 | `web-dashboard/src/**/*.css` | **188** | `find web-dashboard/src -name "*.css" \| wc -l` |
| 13a | └─ 其中 CSS Module 化（`*.module.css`） | | 16 | `find web-dashboard/src -name "*.module.css" \| wc -l` |
| 14 | 前端單元測試（vitest）檔案數 | `*.test.ts(x)` / `*.spec.ts(x)`（`web-dashboard/src` 樹下） | **4** | `find web-dashboard/src -name "*.test.tsx" -o -name "*.test.ts" -o -name "*.spec.tsx" -o -name "*.spec.ts" \| wc -l` |
| 15 | Playwright E2E spec 檔案數 | `web-dashboard/e2e/*.spec.ts` | **8** | `find web-dashboard/e2e -name "*.spec.ts" \| wc -l` |

### 備註（路由條數與舊數字的落差）

`docs/FULL_SYSTEM_REDESIGN_PLAN.md`（2026-07-31 同日）記載「126 條路由」；本文件用 `grep -c "<Route "` 逐檔加總得到 127，差 1，推測為某個 route group 檔內有 1 個不對應獨立頁面的 wrapper/layout `<Route>`（例如僅作巢狀 index 用途）。差異在容忍範圍內，不影響「126 vs 舊文件 18」這個量級落差的結論；若要精確到個位數，需人工核對各 `*.routes.tsx` 是否有 layout-only route，非本次對帳範圍。

---

## 三、與既有文件數字的對照小結

| 指標 | 舊文件數字 | 本文件實測 | 差異原因 |
|------|:----------:|:----------:|----------|
| 後端模組 | 175（`00-system-inventory.md`、`SYSTEM_OPTIMIZATION_PLAN.md`） | 119 目錄 / 136 `.module.ts` 檔 | 舊數字疑為人工盤點或含已刪除/合併模組，口徑未定義是否含 `core`/`common`/`health` |
| 前端頁面 | 109（`00-system-inventory.md`） | 137 | 半年間新增頁面；舊文件未附計數指令，無法回溯口徑 |
| 前端頁面 | 18（`SYSTEM_OPTIMIZATION_PLAN.md`） | 137 | 該文件「18 頁」疑似僅列出「Top 20 關鍵頁面」等子集，非全量 |
| 前端元件 | 29（`SYSTEM_OPTIMIZATION_PLAN.md`） | 未在本文件重新定義 | `components/` 元件盤點屬 FE-2（設計系統收斂）範疇，非本次 XC-2 對帳範圍 |

**結論**：本文件之後，**任何模組數/頁面數/路由數的引用，一律以本文件為準**；`docs/audit/00-system-inventory.md` 與 `docs/architecture/SYSTEM_OPTIMIZATION_PLAN.md` 的舊數字與其衍生建議（如「175→50 模組合併」）已由 `docs/FULL_SYSTEM_REDESIGN_PLAN.md` §5 決策 D3/D9/D10 取代，兩份文件頂部已加註 superseded 說明（不刪除內容，供歷史脈絡參考）。

---

## 四、重跑本表的方式

在 repo 根目錄（`backend/`、`web-dashboard/` 同層）逐一執行上表「計數指令」欄的指令即可。所有指令均為單行、無需額外腳本，可直接複製貼上到 bash 或 Git Bash 執行；Windows PowerShell 使用者可改用對應的 `Get-ChildItem -Recurse -Filter` 寫法，邏輯相同。

若指令結果與本表不符，請以**當下重跑結果**為準，並更新本文件頂部的「產出日期」與內文數字，而不要回頭改舊的稽核文件——舊文件的角色是「歷史快照＋superseded 警示」，不是即時數據來源。
