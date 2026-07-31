# 系統盤點清單 (System Inventory)

> ⚠️ **本文件計數已過期（SUPERSEDED）— 2026-07-31**
> 本文件（2026-01-13）「後端模組 175 / 前端頁面 109」等計數已不反映現況。2026-07-31 實測為：**119 個後端模組目錄（136 個 `*.module.ts` 檔）／137 個前端頁面檔／127 條路由**，附完整可重跑計數指令，請見 `docs/BASELINE_METRICS.md`——**之後一律以該文件為準**，本文件的數字僅供歷史脈絡參考。
> 本文件與 `docs/architecture/SYSTEM_OPTIMIZATION_PLAN.md` 提出的「175→50 模組大合併」建議，已被 `docs/FULL_SYSTEM_REDESIGN_PLAN.md` §5 決策 **D3（正式放棄）** 取代；stub 模組去留改依 **D10**（刪除 41 個經「無 controller 且無 entity」口徑確認的真 stub，見該計畫工作項 4.2），而非本文件 §9「未來科技模組」段落的個別建議。
> 本文件其餘章節（缺口分析、風險發現等）多數仍具參考價值，未一併作廢，惟數字與模組合併建議請勿再引用。

> **產出日期**: 2026-01-13  
> **稽核範圍**: Light Keepers 災難緊急應變系統  
> **版本**: v6.1 (Consolidated)

---

## 📊 系統規模總覽

| 類別 | 數量 | 狀態 |
|------|:----:|:----:|
| 後端模組 | 175 | ✅ |
| TypeORM Entities | 100+ | ✅ |
| API Controllers | 130+ | ✅ |
| 前端頁面 | 109 | ✅ |
| Sidebar 導航項 | 30 | ✅ |

---

## 🎯 核心功能域分類

### 1️⃣ 應變指揮 (ICS/C2) - **CRITICAL**

| 模組 | 目的 | 角色 | 完成度 | 風險 |
|------|------|------|:------:|:----:|
| `mission-sessions` | 任務場次管理 (ICS) | L2+ | 85% | M |
| `events` | 事件管理 | L1+ | 90% | L |
| `field-reports` | 現場回報 (GPS) | L1+ | 90% | L |
| `overlays` | 戰術地圖圖層 | L2+ | 80% | M |
| `tactical-maps` | 戰術標記 | L2+ | 75% | M |

**關鍵流程**:

```
事件建立 → 場次啟動 → 圖層配置 → 現場回報 → 態勢更新
```

**缺口**:

- ❌ SITREP 自動產出（僅模板）
- ❌ IAP 簽核流程
- ⚠️ 指揮鏈 (IC/Section Chiefs) 未完整建模

---

### 2️⃣ 動員與通知 - **HIGH**

| 模組 | 目的 | 角色 | 完成度 | 風險 |
|------|------|------|:------:|:----:|
| `notifications` | 統一通知中心 | All | 90% | L |
| `line-bot` | LINE Bot 整合 | All | 95% | L |
| `push-notification` | Event-driven 推播 | L1+ | 80% | M |
| `volunteers` | 志工名冊 | L2+ | 90% | L |
| `volunteers/assignments` | 任務指派 | L2+ | 80% | M |

**整合點**:

- ✅ NotificationsModule (Facade: FCM + LINE)
- ✅ PushNotificationService (Event handlers)
- ⚠️ SMS 未實作（僅 mock）

**缺口**:

- ❌ 志工召集條件篩選（技能/距離/裝備）未完整
- ❌ 回覆機制未串接到任務系統
- ⚠️ 集合點管理僅地圖標記

---

### 3️⃣ 災情回報與案件管理 - **CRITICAL**

| 模組 | 目的 | 角色 | 完成度 | 風險 |
|------|------|------|:------:|:----:|
| `reports` | 災情通報 | L0+ | 95% | L |
| `intake` | 統一通報入口 (v2.1) | L0+ | 90% | L |
| `tasks` | 任務看板 | L1+ | 85% | M |
| `tasks-dispatch` | 智慧派遣 | L2+ | 70% | H |

**Entity 結構**:

```typescript
Report {
  id, title, description, location (Point), severity
  photos[], status, assignedTo, createdBy
  createdAt, updatedAt
}
```

**缺口**:

- ❌ 案件去重邏輯未實作
- ❌ SLA 監控未建立
- ⚠️ 關聯資源/任務僅外鍵，無雙向追蹤

---

### 4️⃣ 任務與派遣 (含地圖) - **CRITICAL**

| 模組 | 目的 | 角色 | 完成度 | 風險 |
|------|------|------|:------:|:----:|
| `task-dispatch` | 任務派遣引擎 | L2+ | 70% | H |
| `location` | 地理圍欄服務 | L2+ | 85% | M |
| `tactical-maps` | Mapbox 服務 | L1+ | 75% | M |
| `routing` | 路徑規劃 | L2+ | 60% | H |

**地圖整合**:

- ✅ Mapbox (geocoding, directions, isochrone)
- ✅ Google Maps (NCDR alerts)
- ⚠️ 避難所、AED 資料來自 PublicResources

**缺口**:

- ❌ 簽到/簽退機制未串接
- ❌ 失聯警報邏輯未完整
- ❌ 離線 mesh 網路僅 stub
- ⚠️ 禁制區/熱區僅地圖繪製，無警報邏輯

---

### 5️⃣ 資源與後勤 - **HIGH**

| 模組 | 目的 | 角色 | 完成度 | 風險 |
|------|------|------|:------:|:----:|
| `resources` | 物資管理 (40 entities!) | L2+ | 95% | M |
| `donations` | 捐贈追蹤 | L2+ | 90% | L |
| `equipment` | 裝備管理 | L2+ | 80% | M |

**Entity 複雜度**:

```
resources/
├─ resources.entity.ts
├─ resource-batch.entity.ts
├─ resource-transaction.entity.ts
├─ warehouse.entity.ts
├─ storage-location.entity.ts
├─ asset.entity.ts
├─ asset-transaction.entity.ts
├─ dispatch-order.entity.ts
├─ inventory-audit.entity.ts
├─ lot.entity.ts
└─ ... (30+ more)
```

**風險**:

- ⚠️ Entity 數量過多可能導致維護困難
- ⚠️ 借領歸還流程需完整測試

---

### 6️⃣ 風險治理與合規 - **CRITICAL**

| 模組 | 目的 | 角色 | 完成度 | 風險 |
|------|------|------|:------:|:----:|
| `auth` | Firebase Auth + JWT | All | 95% | L |
| `audit-log` | 稽核日誌 + 異常偵測 | L3+ | 80% | M |
| `biometric-auth` | WebAuthn | L4+ | 60% | H |
| `webhooks` | Webhook 訂閱 | L4+ | 85% | M |
| `ip-whitelist` | IP 白名單 | L5 | 70% | M |

**RBAC 模型**:

```typescript
PermissionLevel {
  Anonymous = 0,
  Volunteer = 1,
  Supervisor = 2,
  Manager = 3,
  Admin = 4,
  Owner = 5
}
```

**Guards**:

- ✅ `UnifiedRolesGuard` (roleLevel based)
- ✅ `ResourceOwnerGuard` (IDOR protection)
- ⚠️ 部分 Controller 未套用 guard

**缺口**:

- ❌ 敏感資料遮罩策略未完整
- ❌ 照片/影片不可竄改機制（hash/版本）未建立
- ⚠️ 刪除策略：硬刪 vs 軟刪未統一

---

### 7️⃣ 復盤與報表 - **MEDIUM**

| 模組 | 目的 | 角色 | 完成度 | 風險 |
|------|------|------|:------:|:----:|
| `aar-analysis` | 事後復盤 (AAR) | L3+ | 50% | H |
| `reports-export` | 報表匯出 | L2+ | 85% | M |
| `analytics` | 趨勢分析 | L2+ | 75% | M |
| `excel-export` | Excel 產出 | L2+ | 90% | L |
| `pdf-generator` | PDF 產出 | L2+ | 85% | M |

**缺口**:

- ❌ AAR 模板僅 stub
- ❌ 與 IAP/SITREP 自動關聯未建立
- ⚠️ 時間線視覺化（timeline-visualization）未串接

---

### 8️⃣ 外部整合 - **HIGH**

| 整合項 | 模組 | 狀態 | API Key 配置 |
|--------|------|:----:|:------------:|
| Firebase Auth | `auth` | ✅ | ✅ |
| LINE Messaging | `line-bot` | ✅ | ✅ |
| NCDR 警報 | `ncdr-alerts` | ✅ | ✅ |
| CWA 氣象 | `weather-hub` | ✅ | ✅ |
| Google Maps | MapPage | ✅ | ✅ |
| Mapbox | `tactical-maps` | ✅ | ✅ |
| Gemini AI | `chatbot-assistant` | ✅ | ✅ |
| Email/SendGrid | | ⚠️ Mock | ❌ |
| SMS/Twilio | | ⚠️ Mock | ❌ |

---

### 9️⃣ 未來科技模組 (低優先度)

| 模組 | 狀態 | 建議 |
|------|:----:|------|
| `ar-field-guidance` | Stub | 延後 |
| `ar-navigation` | Stub | 延後 |
| `vr-command` | Stub | 延後 |
| `drone-swarm` | Stub | 延後 |
| `robot-rescue` | Stub | 延後 |
| `blockchain` | Stub | 延後 |
| `supply-chain-blockchain` | Stub | 延後 |

**建議**: 這些模組目前無實質功能，建議在 Phase 2+ 再實作。

---

## 📄 前端頁面盤點

### 關鍵頁面 (Top 20)

| 頁面 | 路由 | 權限 | 完成度 | 風險 |
|------|------|:----:|:------:|:----:|
| CommandCenterPage | `/command-center` | L0 | 90% | L |
| MapPage | `/geo/map` | L0 | 95% | L |
| ReportPage | `/intake` | L0 | 90% | L |
| TasksPage | `/tasks` | L1 | 85% | M |
| ResourcesPage | `/logistics/inventory` | L1 | 90% | L |
| VolunteersPage | `/workforce/people` | L1 | 85% | M |
| EmergencyResponsePage | `/emergency-response` | L2 | 80% | M |
| MissionCommandPage | `/c2/command` | L2 | 75% | M |
| SecurityPage | `/governance/security` | L3 | 70% | M |
| WebhooksPage | `/governance/webhooks` | L4 | 75% | M |

**頁面問題**:

- ⚠️ 部分頁面使用 mock data
- ⚠️ RWD 未完整測試
- ❌ Offline 模式僅 UI，無實際離線邏輯

---

## 🗄️ 資料庫架構

### 核心 Entity 統計

| 領域 | Entity 數量 | 關聯複雜度 |
|------|:-----------:|:----------:|
| Resources | 40+ | 極高 |
| Volunteers | 10 | 高 |
| Reports | 5 | 中 |
| Tasks | 5 | 中 |
| Events | 3 | 低 |
| Overlays | 8 | 高 |

### PostGIS 地理資料

```sql
-- Reports.location (Point)
-- Overlays/Location.geom (Geometry)
-- PublicResources (shelters, AED) - Point
```

**索引狀態**: ⚠️ 需檢查 GiST 索引是否建立

---

## 🔌 WebSocket/Realtime

| 模組 | 功能 | 狀態 |
|------|------|:----:|
| `realtime` | WebSocket gateway | ✅ |
| `realtime-chat` | 即時聊天 | ⚠️ |
| `location` (tracking) | 位置追蹤 | ⚠️ |

**缺口**:

- ❌ 事件推送未完整串接
- ❌ 任務狀態即時更新未驗證

---

## 📦 CI/CD 與 DevOps

| 項目 | 狀態 | 風險 |
|------|:----:|:----:|
| Cloud Run (backend) | ✅ | L |
| Cloud Run (frontend) | ✅ | L |
| CI/CD (GitHub Actions) | ✅ | L |
| 環境變數管理 | ✅ | L |
| Cloud SQL 連線 | ✅ | L |
| Error Reporting | ⚠️ | M |
| Log Aggregation | ⚠️ | M |

---

## ⚠️ 高風險發現

| # | 問題 | 影響 | 優先度 |
|:-:|------|------|:------:|
| 1 | Resources 模組 40+ entities 過於複雜 | 維護困難 | M |
| 2 | 部分 Controller 無 guard | 權限漏洞 | H |
| 3 | 案件去重、SLA 監控未實作 | 運營風險 | H |
| 4 | IAP/SITREP 自動產出未完成 | ICS 不完整 | H |
| 5 | 志工召集條件篩選不足 | 動員效率 | M |
| 6 | 照片影片防竄改機制缺失 | 證據鏈風險 | H |
| 7 | Offline mesh 僅 stub | 斷網場景 | M |
| 8 | 刪除策略未統一 | 資料一致性 | M |

---

## ✅ 完成度矩陣

| 功能域 | Must Have | Should Have | Could Have | Won't Have |
|--------|:---------:|:-----------:|:----------:|:----------:|
| ICS/C2 | 70% | 60% | 40% | 0% |
| 動員通知 | 85% | 70% | 50% | 0% |
| 災情回報 | 90% | 75% | 60% | 0% |
| 任務派遣 | 75% | 60% | 40% | 0% |
| 資源後勤 | 95% | 85% | 70% | 0% |
| 權限治理 | 80% | 70% | 50% | 0% |
| 復盤報表 | 60% | 50% | 30% | 0% |

---

**下一步**: 產出 Gap Analysis (B) 與 Integration Map (C)
