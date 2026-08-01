# 授權等級落地紀錄 C — 殘餘 fail-open controller（AUTHZ_LEVELS_APPLIED_C）

> 對應 `docs/FULL_SYSTEM_REDESIGN_PLAN.md` 的 **P0 安全速修**（XC-1）與 **BE-1 授權完整性**。
> 承接 `AUTHZ_LEVELS_APPLIED_A.md`（高敏感 16 筆）與 `AUTHZ_LEVELS_APPLIED_B.md`（中／低敏感 27 筆）之後，
> 以「掛了 `UnifiedRolesGuard` 但沒有任何 `@RequiredLevel` / `@RequiredRoles`」為口徑重掃，
> 找出 **14 個仍然 fail-open 的 controller**。
> 執行日期：2026-08-02。分支：`feat/p0-security-hardening-ci-gates`。

---

## 一、為什麼「有掛 guard」還是等於沒保護

`UnifiedRolesGuard` 在端點沒有任何授權 metadata 時**一律放行**（fail-open），
guard 自己的註解也寫明這件事，並且只在第一次命中時印一行 warn log：

```
[authz-unmarked] XxxController.handler 掛載了 UnifiedRolesGuard，
但未標記 @RequiredLevel / @RequiredRoles；此端點實際上只驗證「已登入」。
```

也就是說，A/B 兩批補上 guard、但沒補定級的端點，實際保護只有 **GlobalAuthGuard 的「有沒有登入」**。
任何等級的帳號（含 L0 一般民眾帳號）都能讀寫戰術標記、他人行蹤位置、補助款財務資料。
本批把這些端點的定級補成宣告式，並在 CI 加了回歸守衛（見 §四）。

## 二、定級原則（沿用 A/B 兩批的慣例，未另創）

| 類型 | 等級 |
|---|---|
| 只操作「呼叫者自己」的資料（service 以 `req.user.id` 過濾） | L1 |
| 現場人員的作業讀取（任務標記、阻斷點、語音記錄、設備查詢） | L1 |
| 現場人員對自己的安全動作（簽到、緊急按鈕、回報事件） | L1 |
| 改動他人資料／戰術圖面／指揮動作／查他人行蹤 | L2 |
| 財務異動、對外報表產製、可持續外送資料的排程組態 | L3 |

有兩處**不是我判斷的，是照既有文件**：
- `triage`：依前端 `page-policy.ts` 的 `rescue-triage` requiredLevel=1，
  與 `docs/architecture/MCI_DESIGN.md`「掛牌／改判升色 L1+、降色與站務 L2+」。
- `equipment`：前端 `page-policy.ts` 的 equipment 頁本來就是 L2。

## 三、逐 controller 定級

| # | Controller | class 級 | 提級的端點 | 理由 |
|---|---|:---:|---|---|
| 1 | `accounts/data-export.controller.ts` | L1 | — | 三個端點都以 `req.user.id` 操作自己的匯出檔 |
| 2 | `auth/two-factor.controller.ts` | L1 | — | 只操作呼叫者自己的 2FA 設定 |
| 3 | `auth/heartbeat.controller.ts` | 逐端點 | `commander-status` L2、`break-glass` L2、`configure-break-glass` L2、`heartbeat` L1 | 指揮鏈名單屬指揮體系情資；break-glass 真正的把關仍在 service（接班人＋超時） |
| 4 | `cluster-coordination` | L1 | `join`、`meetings`、`meetings/:id/actions`、`4w` → L2 | 查詢現場需要；代表組織對外提報需幹部 |
| 5 | `donor-reporting` | L2 | `grants`、`expenditures`、`metrics`、`reports`（POST）→ L3 | 查詢與既有 donations controller 對齊；財務異動與對外報告提高 |
| 6 | `equipment` | L1 | 建檔／維護起訖／指派任務 → L2 | 借出歸還是志工現場動作；主檔與可派遣性屬管理 |
| 7 | `humanitarian-standards` | L2 | `hxl/tags`、`sphere/standards` → L1 | 匯出的是營運與受助資料整包；純標準參照表無業務資料 |
| 8 | `reports/report-scheduler` | L2 | 新增／修改／刪除排程 → L3 | 排程會自動把報表寄給收件人名單＝可持續外送資料的組態 |
| 9 | `routing` | L1 | 移除阻斷點 → L2 | 回報路阻是現場動作；解除封路影響全體路徑規劃 |
| 10 | `staff-security` | L1 | 事件結案、逾時名單、他人位置／簽到歷史、撤離計畫與發動 → L2 | 自身安全動作人人可用；「看／改別人」需幹部 |
| 11 | `tactical-maps` | L1 | 建立／批次／更新／刪除標記、視域分析 → L2 | 現場需要看得到標記；改寫戰術圖面需幹部 |
| 12 | `triage` | L1 | — | 依 page-policy 與 MCI_DESIGN，見 §二 |
| 13 | `voice` | L1 | `sitrep` 產製 → L2 | 與 `sitrep.controller.ts` 的產製端點同級 |
| 14 | `resources/label-templates` | 逐端點 | 三個查詢端點補 L1 | 檔頭原本寫「僅需登入」但沒有宣告式標記，改成 L1 讓註解與行為一致 |

## 四、CI 回歸守衛

`backend/src/common/security/security-invariants.spec.ts`（跑在既有 `npm test` 內，阻擋式）：

1. **authz 定級覆蓋率**：掛角色 guard 的端點必須有 `@RequiredLevel` / `@RequiredRoles` / `@Public`。
   掃描器附正／負向自我測試。
2. **`@Body() x: any` 維持 0**。
3. **已外洩的預設密鑰字串**只能出現在 `jwt.config.ts` 的「已知外洩清單」常數。
4. **行內型別 `@Body() body: { ... }` 不得復發**：已 DTO 化的 8 個 controller 零容忍；
   全專案總數棘輪（基準線 111，只能降不能升，降了要同步調降基準線）。

`.github/workflows/ci-cd.yml` 另加：後端 lint 閘門、`npm test -- --coverage`（讓 coverageThreshold 真的生效）、
前端 dist 不得含 `devModeUser`、production 部署設定不得啟用 `SYNC_TABLES` 且必須掛 `JWT_SECRET`。

## 四之二、輸入驗證（同批處理，2026-08-02）

真正的驗證缺口不是 `@Body() any`（那個已清零），而是**行內型別**：
`@Body() body: { periodStart: string; ... }` 編譯後不留下 metatype，
全域 ValidationPipe 拿不到可驗證的型別就整段跳過——端點看起來有驗證，實際上完全沒驗。
全專案約 130 處，本輪處理最高風險的兩批：

| 批次 | 端點數 | 內容 |
|---|:---:|---|
| auth／2FA（先前 session 完成，已整併在本分支） | 23 | OAuth code 交換、OTP、密碼重設；順修 `GET /auth/check-email-verification` 用 GET 讀 body 導致回傳任意帳號驗證狀態、`/auth/2fa/verify\|validate\|DELETE` 空 DTO 導致正式環境恆 400 |
| 作戰情資／派遣／個資（本輪） | 24 | SITREP 3、IAP 作戰週期 2、AAR 1、map-dispatch 9、task-dispatch 簽到簽退 2、心理支持 care 4 |

實作要點（踩到的坑，寫下來避免重複）：
- 巢狀陣列必須 `class + @Type + @ValidateNested({ each: true })`，否則 whitelist 不下探到子物件
- 必填的巢狀物件要加 `@IsDefined()`，只有 `@ValidateNested()` 時整包缺欄位會靜默通過
- 自由鍵值物件（如 SITREP 的 `casualties`）不能用 `@IsNumber({}, { each: true })`：
  class-validator 的 `each` 不走訪純物件，需自訂 constraint
- mood-tracker 的 `req.user?.sub ?? body.userId` 退路一併移除（JWT 取不到身分時退回呼叫端自報 userId，
  等於替剛補好的 IDOR 留後門），改為取不到即 403

## 五、留給 owner／後續的判斷題

| # | 事項 | 現況處置 | 需要誰決定 |
|---|---|---|---|
| C-1 | `donor-reporting` 的財務寫入定 L3（常務理事） | 已套 L3 | 若協會實務是「幹部登帳、理事覆核」，應降為 L2＋覆核流程 → owner |
| C-2 | `staff-security` 的「查自己的簽到歷史」被 L2 一併擋掉 | 暫時 L2 | 正解是掛 `ResourceOwnerGuard`（ADR-003）而非降級，屬 P0 之後 |
| C-3 | `auth` / `auth-oauth` 共 38 個端點仍未定級 | 列入 CI 棘輪基準線（只能降不能升） | 這些端點語意上需要 `@Public()`＋`public-surface.policy.json` 條目，屬公開介面決策 → owner |
| C-4 | triage「降色需 L2+ 確認」 | 未實作 | 同一端點內依內容分級，`@RequiredLevel` 表達不了，留給 C2 MCI 實作（M2/M3） |
| C-5 | 前端 2FA 呼叫 `/auth/2fa/verify` 只送 `token`，後端要 `secret + token` | 未修 | 功能面 bug（非 P0 安全洞）：前端要改成把 setup 回傳的 secret 一起送，或後端改由暫存的 pending secret 取用 → 需 owner 決定改哪一側 |
| C-6 | 其餘約 106 處未驗證端點 | 列入 CI 棘輪基準線 | 建議照「碰個資／碰錢／碰指揮權」分批補，不必一次做完 → owner 排序 |
