# Emergency Response 驗收標準與測試案例

**文件編號**：09  
**版本**：1.0

---

## 1. 驗收標準（12 條）

| # | 類別 | 驗收標準 | 驗證方式 |
|---|------|----------|----------|
| 1 | RWD | 手機第一屏可看到 Quick Actions + KPI 列 | 視覺檢查 375px |
| 2 | RWD | 平板 768px 為 2 欄佈局 | 視覺檢查 |
| 3 | 權限 | 僅 Admin/Commander 可啟用任務 | API 測試 403 |
| 4 | 權限 | 僅 Admin 可執行重置 | API 測試 403 |
| 5 | 稽核 | 啟用/結束/重置/匯出有 Audit Log | DB 查詢 |
| 6 | 同步 | WS 正常時顯示「Online」綠燈 | 視覺檢查 |
| 7 | 同步 | WS 斷線 HTTP 可用時顯示「Degraded」黃燈 | 模擬斷線 |
| 8 | 同步 | 完全離線顯示「Offline」紅燈 + 最後同步時間 | 斷網測試 |
| 9 | 報表 | 任務結束可匯出 PDF/CSV/JSON 且欄位一致 | 下載驗證 |
| 10 | 重置 | 重置只清除 Session Data，主資料不變 | TC-10 測試 |
| 11 | 即時 | 地圖與資源變更 60 秒內同步至 Dashboard | SLA 測試 |
| 12 | NCDR | 警示 XML 解析失敗時顯示錯誤 + 重試按鈕 | 模擬錯誤 |

---

## 2. 測試案例

### TC-01：建立任務場次

```
前置：登入 Admin 帳號
步驟：
1. POST /api/er/sessions { name: "Test", code: "ER-TEST-001" }
2. 確認回傳 201 + session ID
3. 確認 audit_logs 有記錄
預期：成功建立，狀態為 draft
```

### TC-05：權限測試 - Operator 無法重置

```
前置：登入 Operator 帳號
步驟：
1. DELETE /api/er/sessions/:id/purge
預期：回傳 403 Forbidden
```

### TC-10：重置後主資料不變（關鍵案例）

```
前置：
1. 主資料有志工 A（ID: vol-001）
2. 任務期間：新增事件 X、派工 Y、物資異動 Z

步驟：
1. 記錄志工 A 資料
2. 執行 DELETE /api/er/sessions/:id/purge
3. 查詢 events, tasks, inventory_txns → 應為空
4. 查詢 volunteers WHERE id = 'vol-001' → 應存在且資料完整

預期：
- events/tasks/inventory_txns 被清除
- volunteers 表資料不變
- Audit log 記錄重置操作
```

### TC-11：離線模式讀取快照

```
前置：Dashboard 已載入 KPI 資料
步驟：
1. 斷開網路
2. 重新整理頁面
預期：
- 顯示 Offline 狀態
- 仍可看到最後一次 KPI 快照
- 新增按鈕顯示禁用狀態
```

### TC-12：PDF 報表匯出驗證

```
前置：任務已結束（status = closing）
步驟：
1. GET /api/er/sessions/:id/export/pdf
2. 下載 PDF 檔案
3. 檢查內容包含：任務摘要、警示、通報、派工、志工、物資
預期：
- PDF 可正常開啟
- 所有區塊資料完整
- 頁尾有產生時間與頁碼
```

---

## 3. 前端路由測試

| 路由 | 預期元件 | 權限 |
|------|----------|------|
| `/emergency-response` | DashboardPage | All |
| `/emergency-response/map` | MapPage | All |
| `/emergency-response/manual` | ManualPage | All |
| `/emergency-response/alerts` | AlertsPage | All |
| `/emergency-response/reports/new` | NewReportPage | Operator+ |
| `/emergency-response/sessions/:id` | SessionConsolePage | Commander+ |
