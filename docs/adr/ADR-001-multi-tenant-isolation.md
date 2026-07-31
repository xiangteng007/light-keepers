# ADR-001: 多租戶隔離策略

> [!WARNING]
> **本 ADR 已於 2026-08-01 依決策 D9（工作項 DA-2）廢止（Superseded）——平台正式降級為「單租戶」定位。**
>
> **狀態變更**：提議中 → **已廢止（Superseded；從未完整實作）**
>
> **理由（實況查核）**
> - `TenantGuard`（原 `backend/src/modules/shared/guards/tenant.guard.ts`）自建立起 **0 處使用**，未掛載於任何 controller，亦未從 `shared/guards/index.ts` 匯出。
> - 本 ADR 所述的 `TenantSubscriber`（Query 層自動注入 `WHERE tenantId = ?`）**從未實作**。
> - 全庫約 120 張表中**僅 4 處**帶 `tenantId`：`domain_events_outbox`(metadata JSONB)、`audit_logs`、`tenant_members`、`webhook_subscriptions`。其餘業務表皆無租戶維度，「查詢自動隔離」的前提不成立。
> - `TenantGuard` 內 `user.roleLevel >= 6` 的系統級旁路判斷為**死碼**——RBAC 角色等級上限為 5（見 ADR-005），條件恆為 false。
> - 實際使用情境為**單一協會（台灣光守護者協會）自用**，不存在多組織共用同一部署的需求。
>
> **影響**
> - `TenantGuard` 及其附屬 `@TenantConfig` / `@BypassTenantCheck` 裝飾器與 `TenantAware` 介面已**刪除**（純死碼，無執行期行為變更）。
> - `tenants` 模組（`TenantModule` / `TenantController` / `TenantService`）**保留**，重新定位為「**組織資料管理**」——維護協會自身的組織檔案、成員名冊、方案配額與品牌設定。為避免 API breaking change，模組／控制器／路由名稱維持不變，僅文件與註解對齊新定位。
> - 現存 4 處 `tenantId` 欄位**一律保留**，不做 schema 變更；單租戶模式下恆為預設值／null，保留供未來回遷。
> - 安全模型不再宣稱「跨租戶隔離」。授權邊界由 RBAC（ADR-005）與 `ResourceOwnerGuard`（ADR-003）承擔。
>
> **若未來要回遷多租戶**：須重新設計並實作 Query Subscriber、為全部業務表補 `tenantId`、補齊 raw query 過濾，並另立新版 ADR，而非復用本文。
>
> ---
>
> 以下為原文，僅供歷史紀錄，**不代表現行架構**。

## 狀態
~~提議中~~ → **已廢止（Superseded, 2026-08-01, D9）**

## 背景
Light Keepers 平台需要支援多個獨立組織（租戶）同時使用，每個租戶的資料必須完全隔離。

## 決策
採用 TypeORM Query Subscriber 在 Query 層級自動注入租戶過濾條件。

### 方案比較

| 方案 | 優點 | 缺點 |
|------|------|------|
| Row-Level Security (RLS) | 資料庫層級強制 | PostgreSQL 特定 |
| Query Subscriber | 應用層透明 | 需要確保覆蓋所有查詢 |
| Repository Override | 明確控制 | 需要修改每個 Repository |

### 選擇：Query Subscriber + Global Guard

1. 建立 `TenantSubscriber` 自動注入 `WHERE tenantId = ?`
2. 建立 `TenantGuard` 驗證請求的租戶權限
3. 所有敏感 Entity 加入 `tenantId` 欄位

## 後果
- ✅ 查詢自動隔離
- ✅ 無需修改現有 Repository
- ⚠️ 需要確保所有 raw query 也加入租戶過濾
