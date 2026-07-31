# 依賴漏洞修補報告（Phase E.6 — 2026-07-31）

## 摘要

依 `docs/FULL_SYSTEM_REDESIGN_PLAN.md` Phase E「生產緊急止血」E.6 項執行：對 `backend/`、`web-dashboard/` 兩個 npm 套件樹執行 `npm audit fix`（**未使用 `--force`**，避免強制升級 major 版本造成 breaking change）。

| 專案 | 修補前 | 修補後 | 已消除 | 備註 |
| --- | --- | --- | --- | --- |
| backend | 84 個（critical 4 / high 22 / moderate 53 / low 5） | 43 個（critical **0** / high 30 / moderate 13 / low 0） | 41 個（含全部 4 個 critical、全部 5 個 low） | `ws`、`websocket-driver`（原調查提及的關鍵項）已完全修復 |
| web-dashboard | 38 個（critical 5 / high 21 / moderate 11 / low 1） | 23 個（critical **0** / high 20 / moderate 3 / low 0） | 15 個（含全部 5 個 critical、全部 1 個 low） | `npm audit fix` 執行兩輪才收斂（第二輪修掉 `react-router`/`react-router-dom`） |

**所有 critical 與 low 等級漏洞均已消除。** 剩餘皆為 high／moderate，且清一色需要 **major 版本升級**（`npm audit fix --force` 才能處理），因此依指示保留、未自動套用，改列表如下待人工評估。

> 附註：`backend/` 的安裝方式沿用專案既有慣例 `npm install --legacy-peer-deps`（見 `.github/workflows/ci-cd.yml`、`.github/workflows/audit-gates.yml`、`backend/Dockerfile` 皆使用此旗標，因 `@nestjs/config@3.x` 的 peer range 尚未涵蓋 `@nestjs/common@11.x`），非本次新增的變通作法。`web-dashboard/` 則沿用標準 `npm install`。

## 驗證結果（修補後）

| 項目 | 指令 | 結果 |
| --- | --- | --- |
| backend 型別檢查 | `npx tsc --noEmit` | 通過，無錯誤 |
| backend 單元測試 | `npm test`（Jest 全套） | 354/355 測試檔通過；3476/3480 案例通過。**4 個失敗與本次依賴修補無關**（見下方說明），為既有問題 |
| web-dashboard 建置 | `npm run build`（`tsc -b && vite build`） | 建置成功，僅有既有的 chunk-size 警告（非本次修補導致） |
| web-dashboard 測試 | `npm run test:run`（Vitest） | 4 個測試檔、45 個案例，全數通過 |

### 關於 backend 4 個失敗測試

失敗檔案：`backend/src/modules/weather-service/services/forecast.service.spec.ts`（4 個 case：`getGeneralForecast`、`getWeeklyForecast`、`getTideForecast`、`getForecastSummary`）。

錯誤原因是測試檔內的 mock 物件方法名稱寫成 `fetchData`，但實際 `CwaApiService`（`backend/src/modules/weather-service/services/cwa-api.service.ts:79`）的方法名稱是 `fetch`，造成 `TypeError: this.cwaApi.fetch is not a function`。

此問題與本次 `npm audit fix` 完全無關（未涉及任何 npm 套件變更，純粹是既有測試檔與原始碼方法名稱不一致，來自先前的 `refactor(backend): replace any with unknown in weather-service module` 等提交），已另外開一個背景任務追蹤修復，不影響本次安全修補的合併。

## 剩餘漏洞清單（無法透過 `npm audit fix` 自動修補）

### backend（43 個：high 30 / moderate 13）

| 套件（root cause） | 嚴重度 | 目前版本 | 需要升級到 | 是否 Breaking | 建議處置 |
| --- | --- | --- | --- | --- | --- |
| `jest` 生態系（`jest`、`@jest/*`、`babel-jest`、`babel-plugin-istanbul`、`create-jest`、`jest-circus`、`jest-cli`、`jest-config`、`jest-runner`、`jest-runtime`、`jest-snapshot`、`test-exclude`、`ts-jest` 等 19 個 transitive 項目） | high | `jest@29.7.0`、`ts-jest@29.1.1` | Major（npm 建議字面上寫 `jest@25.0.0`，屬 npm 演算法找到的「移除漏洞的最低版本」，**不代表應該降版**；實務應直接評估最新穩定版 `jest@30.x` + 對應 `ts-jest`） | 建議排入下個 Sprint：獨立分支升級 Jest 30，跑全套測試與 CI 驗證後再合併，不宜隨 Phase E 止血一起做 |
| `@nestjs/cli`、`@nestjs/schematics`、`@angular-devkit/core`、`@angular-devkit/schematics`、`ajv`、`picomatch`、`fork-ts-checker-webpack-plugin`、`brace-expansion`、`minimatch`、`glob`（CLI/schematics 鏈） | high／moderate | `@nestjs/cli@11.0.14`、`@nestjs/schematics@10.1.0` | Major（`@nestjs/schematics@11.1.0`；npm 對 `@nestjs/cli` 建議的 `6.8.1` 明顯是版本比對演算法的異常結果，應忽略字面版號，改直接升級到最新 major） | 純開發工具鏈（`nest generate`/build 用），不影響執行期安全性；建議與 Nest 主體升級一併排程 |
| `@nestjs/typeorm`、`typeorm` | high | `@nestjs/typeorm@11.0.0`、`typeorm@0.3.19` | Major（`typeorm@1.1.0` 這個版號同樣是 npm 演算法產物，實際应評估 TypeORM 官方最新 0.3.x patch 或後續 major，需搭配資料庫 migration 相容性測試） | **生產環境核心 ORM，需完整回歸測試**；不建議在止血階段倉促升級，排入獨立的資料層升級計畫 |
| `@nestjs/swagger`（經由 `js-yaml`） | high | `11.2.3` | 理論上 `fixAvailable: true`（非 major），但實測 `npm audit fix` 多輪仍未收斂 | 建議手動 `npm install @nestjs/swagger@latest --legacy-peer-deps` 單獨測試，或等待上游釋出修正版 |
| `@nestjs/config`、`lodash` | moderate | `@nestjs/config@3.1.0` | Major（`@nestjs/config@4.0.4`） | `@nestjs/config` 4.x 有設定載入 API 變動，需檢查 `ConfigModule.forRoot()` 用法；建議獨立 PR 處理並跑完整 e2e |
| `nodemailer` | high | `7.0.12`（package.json 宣告 `^7.0.12`，但目前解析到含漏洞的舊子版本） | Major（`9.0.3`） | 涉及 SMTP 寄信、CRLF injection 等多個 CVE，建議優先排程（僅次於本次已修的 critical），但需驗證信件寄送模組（`notification`/`mail` service）行為 |
| `firebase-admin`、`@google-cloud/storage`、`@google-cloud/firestore`、`google-gax`、`gaxios`、`retry-request`、`teeny-request`、`uuid`（moderate，Firebase/GCS 依賴鏈） | moderate | `firebase-admin@13.6.0`、`@google-cloud/storage@7.18.0` | Major（`firebase-admin@10.3.0`、`@google-cloud/storage@5.18.3` — 同樣是 npm 演算法找到的「較舊但無漏洞」版本，不建議真的降版；應改評估目前 firebase-admin/GCS SDK 最新版是否已修正） | 涉及推播通知、雲端儲存等外部整合，建議排入下一輪 sprint，並在 staging 環境驗證 Firebase/GCS 功能 |

### web-dashboard（23 個：high 20 / moderate 3）

| 套件（root cause） | 嚴重度 | 目前版本 | 需要升級到 | 是否 Breaking | 建議處置 |
| --- | --- | --- | --- | --- | --- |
| `rxdb`（經由 `ws`、`ajv`） | high／moderate | `16.21.1` | Major（`17.4.0`） | rxdb 17 有 storage adapter / schema API 變動，**離線資料同步核心套件**，需完整回歸測試離線模式 | 排入獨立離線功能升級計畫，優先度中高（`ws` 記憶體耗盡 DoS 屬本次調查提及的高風險項，但目前僅用於 rxdb 內部 replication，非對外開放埠） |
| `exceljs`（經由 `archiver`、`archiver-utils`、`zip-stream`、`readdir-glob`、`glob`、`uuid`） | high／moderate | `4.4.0` | Major（`3.4.0`，同樣是 npm「較舊但無漏洞」版本，實務應評估 exceljs 最新版） | 匯出報表功能（Excel 匯出）使用中，升級後需重跑匯出功能測試 |
| `eslint`（經由 `@eslint/config-array`、`@eslint/eslintrc`、`minimatch`、`brace-expansion`） | high | `9.39.1` | Major（`10.8.0`） | 純開發工具（lint），不影響執行期安全性；可獨立升級並跑一次 `npm run lint` 確認規則相容 |
| `@trickfilm400/rollup-plugin-off-main-thread`、`ejs`、`jake`、`filelist`、`workbox-build` | high | 由 `vite-plugin-pwa` 間接帶入 | `fixAvailable: true`（非 major），已跑多輪 `npm audit fix` 但未收斂 | 建議手動 `npm install vite-plugin-pwa@latest`，或等待 workbox-build 上游修正版釋出後重試 |
| `react-router` / `react-router-dom` | — | 已於第二輪 `npm audit fix` 修復 | 已修復 | 無需處置（列出供對照，確認非遺漏項） |

## 建議後續步驟

1. **本次（E.6）已完成**：所有 critical／low 漏洞清除，`ws`／`websocket-driver` 等原調查提及之高風險項已修復；型別檢查、建置、測試皆通過（除既有無關的 4 個 forecast 測試，已另開任務追蹤）。
2. **下一輪排程建議（依優先度）**：
   - `nodemailer` major 升級（SMTP injection 相關 CVE 較新且明確）。
   - `rxdb` 17.x 升級（離線同步核心，含 `ws` DoS 修復）。
   - Jest 30.x／`@nestjs/schematics` 11.x／`eslint` 10.x（開發工具鏈，風險低但應排入技術債清理）。
   - `typeorm`／`@nestjs/typeorm`、`@nestjs/config`、Firebase/GCS SDK 一併評估（資料層與外部整合，需較長回歸測試週期）。
3. 每次上述升級皆應開獨立分支，跑 `npx tsc --noEmit`、`npm test`（backend）、`npm run build` + `npm run test:run`（web-dashboard），並在 staging 環境驗證相關功能後才合併。
