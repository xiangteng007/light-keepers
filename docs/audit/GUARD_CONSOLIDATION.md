# Guard 體系收斂盤點報告（工作項 1.6）

- 範圍：`backend/src`
- 性質：**行為保持（behavior-preserving）重構**，除本文「§4 已授權的語意修正」明確點名的三處外，任何端點的實際授權行為不變。
- 盤點基準 commit：`3aae110`
- 統計方式：以 `grep -rn --include=*.ts` 掃描 `backend/src`，「生產碼使用處」一律排除 `*.spec.ts`。

---

## 1. 收斂前：14 個 guard，三版並存

| # | Guard / 檔案 | 生產碼 `@UseGuards` 使用處 | 其他引用 | 判定 |
|---|---|---:|---|---|
| 1 | `common/guards/admin.guard.ts` → `AdminGuard` | **0** | 僅 `shared-auth.module.ts` 註解提及 | 死碼，刪除 |
| 2 | `common/guards/rate-limit.guard.ts` → `RateLimitGuard` | **0** | 無 | 死碼，本次**保留**（見 §5） |
| 3 | `common/guards/advanced-rate-limit.guard.ts` → `AdvancedRateLimitGuard` | **0** | 無 | 死碼，本次**保留**（見 §5） |
| 4 | `modules/auth/guards/jwt-auth.guard.ts` → `JwtAuthGuard` | **0** | `auth.module.ts` provider + export；7 個 module 的 `forwardRef(() => AuthModule) // For JwtAuthGuard` 註解 | 死碼，刪除 |
| 5 | `modules/auth/guards/roles.guard.ts` → `RolesGuard`（含 `MinLevel` / `Roles`） | **0** | `auth.module.ts` provider + export | 死碼，刪除 |
| 6 | `modules/shared/simple-jwt.guard.ts` → `SimpleJwtGuard` | **0**（唯一一筆 `@UseGuards(SimpleJwtGuard)` 出現在 `shared-jwt.module.ts` 的 JSDoc 註解裡） | `shared-jwt.module.ts` provider + export，該 module 被 `volunteers.module.ts` import | 死碼，刪除 |
| 7 | `modules/shared/guards/core-jwt.guard.ts` → `CoreJwtGuard` | **163** | 主流慣例 | 保留（主版） |
| 8 | `modules/shared/guards/unified-roles.guard.ts` → `UnifiedRolesGuard` | **147** | 主流慣例 | 保留（主版） |
| 9 | `modules/shared/guards/global-auth.guard.ts` → `GlobalAuthGuard` | 1（`app.module.ts` `APP_GUARD`） | 全域預設拒絕 | 保留 |
| 10 | `modules/shared/guards/optional-jwt.guard.ts` → `OptionalJwtGuard` | 1（`manuals.controller.ts`） | — | 保留 |
| 11 | `modules/shared/guards/resource-owner.guard.ts` → `ResourceOwnerGuard` | 4 | — | 保留 |
| 12 | `modules/shared/guards/tenant.guard.ts` → `TenantGuard` | **0**（唯一一筆在自身 JSDoc） | — | 保留（多租戶功能特化，預留） |
| 13 | `modules/realtime/guards/ws-auth.guard.ts` → `WsAuthGuard` | **0**（唯一一筆在自身 JSDoc） | — | 保留（WS 功能特化） |
| 14 | `modules/drill-simulation/guards/drill-mode.guard.ts` → `DrillModeGuard` | **0** | — | 保留（演習模式功能特化） |

### 慣例分布（生產碼 `@UseGuards(...)` 組合，共 90 個檔案）

```
142  @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
 14  @UseGuards(CoreJwtGuard)
  3  @UseGuards(CoreJwtGuard, UnifiedRolesGuard, ResourceOwnerGuard)
  1  @UseGuards(CoreJwtGuard, TenantGuard)          ← JSDoc 註解，非實際使用
  1  @UseGuards(CoreJwtGuard, ResourceOwnerGuard)
  1  @UseGuards(OptionalJwtGuard)
  1  @UseGuards(WsAuthGuard)                        ← JSDoc 註解，非實際使用
  1  @UseGuards(SimpleJwtGuard)                     ← JSDoc 註解，非實際使用
```

### 關鍵前提：`GlobalAuthGuard` 是 `APP_GUARD`

`app.module.ts` 註冊了兩個全域 guard：`ThrottlerGuard` 與 `GlobalAuthGuard`。
**所有端點預設都需要認證**，除非標記 `@Public()` 或 `@RequiredLevel(0)`。
因此「舊版 guard 使用處 = 0」不代表這些端點沒有保護 —— 它們一直是靠 `APP_GUARD` 保護的。
這也是本次刪除舊版 guard 完全不改變授權行為的原因。

### `@Public()` 重複定義盤點

兩份定義使用**同一個 metadata key `'isPublic'`**，行為等價：

| 定義檔 | 匯入者（生產碼） |
|---|---|
| `modules/shared/guards/public.decorator.ts`（主版） | `auth-oauth.controller.ts`、`intake.controller.ts`（經 `../shared/guards`）、`line-liff.controller.ts`（直接路徑）、`modules/health/health.controller.ts`、`modules/public/public.controller.ts`（經 `shared-auth.module`）→ 共 5 |
| `modules/auth/decorators/public.decorator.ts`（重複） | `src/health-only.controller.ts`、`src/health/health.controller.ts`、`modules/auth/auth.controller.ts` → 共 3 |

生產碼 `@Public()` 標記總數：**31**。
生產碼 `@RequiredLevel(...)` 標記總數：**296**。

---

## 2. 收斂後 guard 清單

| Guard | 位置 | 角色 |
|---|---|---|
| `GlobalAuthGuard` | `shared/guards/global-auth.guard.ts` | `APP_GUARD`，預設拒絕；`@Public()` / `@RequiredLevel(0)` 放行 |
| `CoreJwtGuard` | `shared/guards/core-jwt.guard.ts` | 認證主版（不查 DB，避免循環依賴）；**新增**尊重 `@Public()` |
| `UnifiedRolesGuard` | `shared/guards/unified-roles.guard.ts` | 授權主版（`@RequiredLevel` / `@RequiredRoles`）；**新增**未標記時 warn |
| `OptionalJwtGuard` | `shared/guards/optional-jwt.guard.ts` | 可選認證（匿名 = roleLevel 0） |
| `ResourceOwnerGuard` | `shared/guards/resource-owner.guard.ts` | 資源擁有者檢查 |
| `TenantGuard` | `shared/guards/tenant.guard.ts` | 多租戶隔離（功能特化，目前未掛載） |
| `WsAuthGuard` | `realtime/guards/ws-auth.guard.ts` | WebSocket 認證（功能特化） |
| `DrillModeGuard` | `drill-simulation/guards/drill-mode.guard.ts` | 演習模式（功能特化） |
| `RateLimitGuard` | `common/guards/rate-limit.guard.ts` | 自製限流（未掛載，見 §5 建議） |
| `AdvancedRateLimitGuard` | `common/guards/advanced-rate-limit.guard.ts` | 自製限流（未掛載，見 §5 建議） |

**14 → 10**（刪除 4 個檔案中的 3 個 guard 類別 + 1 個 module）。

---

## 3. 遷移／刪除明細

### 3.1 刪除的檔案

| 檔案 | 需要遷移的使用處 | 處置 |
|---|---:|---|
| `src/common/guards/admin.guard.ts` | 0 | 直接刪除 |
| `src/modules/auth/guards/jwt-auth.guard.ts` | 0 | 直接刪除 |
| `src/modules/auth/guards/roles.guard.ts` | 0 | 直接刪除 |
| `src/modules/auth/guards/index.ts` | 1（`auth.module.ts`） | 刪除 barrel，並清掉 `auth.module.ts` 的 import / provider / export |
| `src/modules/shared/simple-jwt.guard.ts` | 0 | 直接刪除 |
| `src/modules/shared/shared-jwt.module.ts` | 1（`volunteers.module.ts` import） | 刪除 module，`volunteers.module.ts` 移除 import |

**實際需要改動的遷移點：2 處**（`auth.module.ts`、`volunteers.module.ts`）。
零個 controller 需要改 `@UseGuards` —— 舊版 guard 從未被任何 controller 掛載過。

### 3.2 語意對應表（舊版 → 新版等價物）

| 舊版 | 新版等價物 | 語意是否完全等價 | 說明 |
|---|---|---|---|
| `AdminGuard` + `@RequiredLevel(n)` | `UnifiedRolesGuard` + `@RequiredLevel(n)` | **是** | 兩者都讀 `requiredLevel` metadata、都比對 `user.roleLevel`、都丟 `ForbiddenException`。`AdminGuard` 的 `user` 預設值是 `VOLUNTEER(1)`，`UnifiedRolesGuard` 是 `0` —— 但 `AdminGuard` 從未被掛載，故無實際差異 |
| `AdminGuard` + `@Roles('admin')`（`common/guards` 版） | `@RequiredLevel(ROLE_LEVELS.OFFICER)`（=2） | 概念等價 | `AdminGuard` 內部就是把 `'admin'` 映射到 `ROLE_LEVEL.OFFICER`。無使用處 |
| `AdminGuard` + `@Roles('coordinator'/'volunteer'/'viewer')` | `@RequiredLevel(ROLE_LEVELS.VOLUNTEER)`（=1） | 概念等價 | 同上，`AdminGuard` 對非 `admin` 一律只要求 `VOLUNTEER`。無使用處 |
| `ROLE_LEVEL`（`admin.guard.ts`） | `ROLE_LEVELS`（`unified-roles.guard.ts`） | **是** | 兩份常數的 0–5 對應完全相同 |
| `ROLE_HIERARCHY` / `hasMinimumRole` / `UserRole`（`admin.guard.ts`） | 無對應 | — | 舊 `admin/coordinator/volunteer/viewer` 四級模型的遺留，與 0–5 `roleLevel` 模型不相容，零使用處，直接刪除 |
| `JwtAuthGuard` | `CoreJwtGuard` | **否（刻意）** | `JwtAuthGuard` 會 `accountRepository.findOne()` 取完整 `Account` 實體放入 `request.user`；`CoreJwtGuard` 只放 JWT payload 正規化物件（`id/sub/uid/email/name/role/roleLevel/roles`），**不查 DB**。這正是新版避免循環依賴與 N+1 的設計。無使用處，故不影響任何端點 |
| `RolesGuard` + `@MinLevel(n)`（`auth/guards`） | `UnifiedRolesGuard` + `@RequiredLevel(n)` | 近似 | `UnifiedRolesGuard` 已內建讀取 legacy metadata key `'minLevel'` 作為後備，故 `@MinLevel` 標記仍可被新版讀到。**差異**：`RolesGuard` 從 DB `user.roles[].level` 取最大值、失敗時 `return false`（→ 403 無訊息）；`UnifiedRolesGuard` 從 JWT `roleLevel` 取值、丟帶訊息的 `ForbiddenException`。無使用處 |
| `RolesGuard` + `@Roles('owner', ...)`（`auth/guards`，metadata key `'roles'`） | `UnifiedRolesGuard` + `@RequiredRoles(...)`（metadata key `'requiredRoles'`） | **否（key 不同）** | 舊版用 `'roles'`、新版用 `'requiredRoles'`，**不會**互相讀取。零使用處，故遷移時無需改寫任何標記 |
| `SimpleJwtGuard` | `CoreJwtGuard` | 近似 | 兩者都只驗 token 不查 DB。**差異**：`SimpleJwtGuard` 失敗時 `return false`（Nest 轉成 403），`CoreJwtGuard` 丟 `UnauthorizedException`（401）；`SimpleJwtGuard` 放入的 user 只有 `{id, email, name}`（**沒有 roleLevel**，故無法搭配 `UnifiedRolesGuard`），`CoreJwtGuard` 放入完整正規化物件。無使用處 |
| `SharedJwtModule` | `SharedAuthModule`（`@Global`） | **是** | 兩者以相同 `JWT_SECRET`、相同 `expiresIn: '7d'` 註冊 `JwtModule`。`SharedAuthModule` 是 `@Global` 且已在 `app.module.ts` import，`volunteers.module.ts` 移除 `SharedJwtModule` 後仍可注入 `JwtService`，且同樣不與 `AuthModule` 產生循環依賴 |

### 3.3 `@Public()` 重複定義收斂

`modules/auth/decorators/public.decorator.ts` 改為 **re-export** shared 版：

```ts
export { Public, IS_PUBLIC_KEY } from '../../shared/guards/public.decorator';
```

3 個既有 import 路徑（`src/health-only.controller.ts`、`src/health/health.controller.ts`、`modules/auth/auth.controller.ts`）維持不變、行為不變（本來 metadata key 就相同）。

---

## 4. 已授權的語意修正（**唯三**改變行為的地方）

### 4.1 `unified-roles.guard.ts` — 未標記時的 fail-open

**問題**：未設 `@RequiredLevel` / `@RequiredRoles` 時直接 `return true`。掛了
`@UseGuards(CoreJwtGuard, UnifiedRolesGuard)` 但忘記標定級的端點「看起來有權限保護、
實際上只驗證了有沒有登入」。

**修正**（維持 fail-open，避免大面積破壞）：

- 放行行為**不變**。
- 新增一次性 **warn 級 log**，含 `Controller.handler`：
  `[authz-unmarked] FooController.bar 掛載了 UnifiedRolesGuard，但未標記 @RequiredLevel / @RequiredRoles；...`
- 以 `private static readonly warnedHandlers = new Set<string>()` 去重，每個 handler 全程序只 warn 一次，不會洗版。

**驗證**：`src/modules/shared/guards/unified-roles.guard.spec.ts`
（放行仍為 `true`、warn 內容含 `Controller.handler`、同 handler 只 warn 一次、不同 handler 各 warn 一次、
有標記時完全不 warn、等級不足/未登入仍 403、`@RequiredLevel(0)` 仍允許匿名）。

### 4.2 reunification 5 個管理端點補上 `@RequiredLevel`

定級原則對齊同性質的 `shelters.controller.ts`（同樣是災民相關資料的管理端），管理端落在 L2–L3：

| 端點 | 修正前 | 修正後 | 理由 |
|---|---|---|---|
| `POST /reunification/reports` | 僅驗登入 | `@RequiredLevel(ROLE_LEVELS.OFFICER)`（L2） | 失蹤者報案登錄＝第一線協尋作業 |
| `GET /reunification/missions/:id` | 僅驗登入 | `L2 OFFICER` | 失蹤者名單含個資，屬幹部層級 |
| `GET /reunification/missions/:id/stats` | 僅驗登入 | `L2 OFFICER` | 與名單同一操作面 |
| `PUT /reunification/:id/found` | 僅驗登入 | `L2 OFFICER` | 標記已尋獲＝現場作業狀態更新，對應 shelters 的 check-in/out（L2） |
| `PUT /reunification/:id/reunited` | 僅驗登入 | `@RequiredLevel(ROLE_LEVELS.DIRECTOR)`（L3） | 標記已團聚＝個案結案，不可逆的記錄狀態，對應 shelters 的 `daily-report`/`activate`（L3） |

> **附帶發現（未修改）**：`GET /reunification/search` 的註解寫「公開查詢（無需登入）」，
> 但它既沒有 `@Public()` 也沒有 `@RequiredLevel(0)`，實際上會被 `APP_GUARD`
> 攔下要求登入。是否真的對外公開屬於 public surface 決策，需先更新
> `docs/policy/public-surface.policy.json`，故本次僅在程式碼中加註說明，**不改行為**。

**驗證**：`unified-roles.guard.spec.ts` 以真實 `Reflector` 讀 `ReunificationController.prototype`
上的 `requiredLevel` metadata，逐一斷言 5 個 handler 的等級；並確認這些端點不再觸發 `authz-unmarked` warn。

### 4.3 `core-jwt.guard.ts` — 尊重 `@Public()`

**問題**：`CoreJwtGuard` 不認得 `@Public()`，無 token 一律 401。這使得
「controller class 級掛 `CoreJwtGuard` + handler 級 `@Public()`」這種寫法無法成立，
intake 類匿名通報 controller 因此無法用 class 級 guard。

**修正**：注入 `Reflector`，以**與 `GlobalAuthGuard` 相同的 metadata key `'isPublic'`**
（`getAllAndOverride([getHandler(), getClass()])`）判斷；為 `@Public()` 時放行。
放行時若仍帶有有效 token，會盡力解析並填入 `request.user`（解析失敗不拋錯），
讓公開端點也能在使用者已登入時取得身分。

**非 `@Public()` 端點行為完全不變**：無 token → 401、無效 token → 401、有效 token → 正規化 `request.user`。

**驗證**：`src/modules/shared/guards/core-jwt.guard.spec.ts`，含
- `@Public()`：無 token 放行 / 無效 token 放行不拋錯 / 有效 token 仍填 `request.user`
- 非 `@Public()`：三種情境行為保持
- `@Public()` 寫入的 key 確實是 `'isPublic'`（與 `GlobalAuthGuard` 同 key）
- **intake 匿名通報路徑**：以真實 `Reflector` 驗證 `IntakeController.prototype.create` 帶有
  `isPublic` metadata，且 `CoreJwtGuard` 在無 token 情況下放行；同時驗證
  `IntakeController.prototype.findAll` 沒有 `isPublic`（仍需登入）。

> 註：`IntakeController` 目前並未掛任何 `@UseGuards`，其認證來自 `APP_GUARD`
> (`GlobalAuthGuard`)，而 `GlobalAuthGuard` 本來就認得 `@Public()`。
> 因此匿名通報路徑在修正前後都是通的；本次修正是為了讓 class 級 `CoreJwtGuard`
> 的寫法在未來可用，並補上迴歸測試把這個保證釘住。

---

## 5. 限流（rate limit）盤點與建議 —— 本次**不改行為**

| 實作 | 掛載處 | 觸發方式 |
|---|---|---|
| `@nestjs/throttler` `ThrottlerGuard` | `app.module.ts` `APP_GUARD`（全域生效） | `@Throttle({ default: { limit, ttl } })` |
| `common/guards/rate-limit.guard.ts` `RateLimitGuard` | **無** | `@RateLimit({points, duration, blockDuration})`，metadata key `'rateLimit'`；依賴 `CacheService` |
| `common/guards/advanced-rate-limit.guard.ts` `AdvancedRateLimitGuard` | **無** | 同名 decorator `RateLimit`，**同一個 metadata key `'rateLimit'`**；純記憶體 `Map`，單機 |

**結論**：兩套自製 guard 皆為**完全未掛載的死碼**，且與 `ThrottlerGuard` 功能重疊；
兩者還互相衝突（同名 `RateLimit` decorator、同一 metadata key，若同時 import 會踩到對方）。
`AdvancedRateLimitGuard` 的記憶體 `Map` 在多實例（Cloud Run）部署下也無法正確計數。

**建議（列入後續工作項，本次不執行）**：

1. 刪除 `common/guards/rate-limit.guard.ts` 與 `common/guards/advanced-rate-limit.guard.ts`，統一使用 `@nestjs/throttler`。
2. 若需要分散式限流，改用 `@nestjs/throttler` 的 Redis storage，而非自製 `Map`。
3. 補齊 policy：所有 `@Public()` 端點都應同時標 `@Throttle`（`auth/decorators/public.decorator.ts` 原註解已如此要求，需要一支檢查腳本落實）。

之所以不在本工作項刪除：任務明確要求「不要在本任務直接改限流行為」，且刪除檔案會連帶移除
`RateLimit` decorator 這個公開 API 面，屬於獨立決策。

---

## 6. 順帶修正（1.5b 發現）

### 6.1 `label-templates.controller.ts` — 註解與實作不符

- **修正前**：檔頭註解寫「貼紙模板管理 API（幹部專用）」、各 handler 註解寫「僅幹部可…」，
  但 inline 檢查是 `(user.roleLevel ?? 0) < 5` → 實際要求 **L5 OWNER 系統擁有者**，不是幹部（L2）。
- **修正後（保持 L5，只讓宣告與實作一致）**：
  - 4 個異動端點（`create` / `update` / `setActive` / `delete`）改為
    `@UseGuards(UnifiedRolesGuard)` + `@RequiredLevel(ROLE_LEVELS.OWNER)`，移除 inline 檢查。
  - 註解全面改寫為「L5 系統擁有者專用」，並在檔頭說明這是對齊「實際行為」而非改變它。
  - 3 個查詢端點（`findAll` / `findOne` / `getApplicable`）維持原樣：僅需登入（由 `APP_GUARD` 提供）。

**為什麼只掛 `UnifiedRolesGuard` 而不是慣例的 `CoreJwtGuard, UnifiedRolesGuard`？**
本 controller 原本沒有任何 `@UseGuards`，`request.user` 來自 `GlobalAuthGuard`（＝原始 JWT payload）。
若加上 `CoreJwtGuard`，`request.user` 會被換成正規化物件，`create()` 內的
`createdBy: user.uid || user.id` 取值結果會跟著改變 —— 那是行為變更，超出本次授權範圍。
只掛 `UnifiedRolesGuard` 可讀到 `GlobalAuthGuard` 放入的 `roleLevel`，授權判斷與 inline 檢查完全等價
（`!user` → 403、`roleLevel < 5` → 403），且 `request.user` 一字不動。

> **附帶發現（未修改）**：實際簽發的 JWT payload 只有 `{ sub, email, roles, roleLevel }`，
> 沒有 `uid` 也沒有 `id`。因此 `GlobalAuthGuard` 路徑下 `user.uid || user.id` 目前恆為 `undefined`，
> `create()` 寫入的 `createdBy` 是 `undefined`。這是既有 bug，屬 Phase 3 DTO/授權重構範圍。

### 6.2 `label-print.controller.ts` — 中文字串硬編授權

**維持行為不變**，僅加 TODO 註解標記為 Phase 3 重構項。問題記錄：

1. 以中文顯示名稱 `'倉管'` 比對角色，不是穩定的 role key，改名即失效。
2. JWT payload 只帶 `roles: string[]`，**沒有 `role` 欄位** → `user.role !== '倉管'` 恆為 `true`，
   實際生效條件只剩 `roleLevel < 3`，等同 L3 DIRECTOR 以上。
3. 授權寫在 handler 內而非宣告式 guard，授權盤點工具掃不到。

Phase 3 應改為 `@UseGuards(CoreJwtGuard, UnifiedRolesGuard)` + `@RequiredLevel(...)`
或 `@RequiredRoles('<stable-role-key>')`。

---

## 7. 驗證

| 檢查 | 結果 |
|---|---|
| `npx tsc --noEmit` | 通過（0 錯誤） |
| `npx jest`（全套） | 見下方「測試結果」 |
| `npm run lint:modules` | **此 script 在本 worktree 的 `backend/package.json` 中不存在**（worktree 基準 commit `3aae110` 尚未包含）。已改以 `tsc --noEmit` + 全套 jest 作為把關 |

### 測試基準

- 修改前基準：`355 suites (1 failed) / 3480 tests (4 failed)`
  唯一失敗為既有問題 `modules/weather-service/services/forecast.service.spec.ts`
  （`TypeError: this.cwaApi.fetch is not a function`），與 guard 無關。
- 修改後結果：`357 suites (1 failed) / 3504 tests (4 failed)`
  —— 失敗的仍是同一支 `forecast.service.spec.ts`，**未新增任何失敗**。
- 新增 2 個 spec 檔（`core-jwt.guard.spec.ts` 9 tests、`unified-roles.guard.spec.ts` 15 tests），
  合計 `+2 suites / +24 tests`，全綠。

---

## 8. 後續建議（不在本工作項範圍）

1. **補齊未定級端點**：上線後蒐集 `[authz-unmarked]` warn，逐一補 `@RequiredLevel`；
   全數補齊後可考慮把 `UnifiedRolesGuard` 的 fail-open 改成 fail-closed。
2. **限流收斂**：見 §5。
3. **`GET /reunification/search` 的公開面決策**：見 §4.2 附帶發現。
4. **`label-print.controller` 授權重構**：見 §6.2。
5. **JWT payload 補 `uid`/`name`**：見 §6.1 附帶發現，`createdBy` 目前寫入 `undefined`。
6. **清理過期註解**：7 個 module 仍有 `forwardRef(() => AuthModule) // For JwtAuthGuard` 註解，
   `JwtAuthGuard` 已不存在，`forwardRef` 本身仍需保留（其他 AuthModule 匯出物），僅註解過期。
7. **`backend/test/helpers/create-test-module.ts`** 以 `require('../../src/common/guards/unified-roles.guard')`
   讀取一個不存在的路徑（包在 try/catch 內故不報錯），正確路徑是
   `src/modules/shared/guards/unified-roles.guard`。
