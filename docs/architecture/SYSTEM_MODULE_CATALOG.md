# Light Keepers 系統模組完整目錄

> **版本**: v1.0  
> **日期**: 2026-02-01  
> **總模組數**: 175  
> **總程式碼行數**: ~35,000+ 行

---

## 模組分類總覽

| Domain | 模組數 | 說明 |
|--------|:------:|------|
| 🔐 Core (核心安全) | 18 | 認證、授權、系統管理 |
| 🎯 Mission Command (任務指揮) | 15 | 事件、任務、派遣 |
| 🗺️ Geo-Intel (地理情報) | 14 | 地圖、定位、路線 |
| 📦 Logistics (物資後勤) | 12 | 資源、設備、捐贈 |
| 👥 Workforce (人力資源) | 14 | 志工、培訓、出勤 |
| 🤝 Community (社區服務) | 10 | 社區、協尋、心理 |
| 📊 Analytics (數據分析) | 12 | 報表、儀表板、AI |
| 📡 Connectivity (通訊連接) | 18 | 通知、即時通訊、整合 |
| 🤖 AI & Advanced (進階功能) | 22 | AI、AR/VR、無人機 |
| 🌤️ External Integration (外部整合) | 10 | 氣象、NCDR、消防 |
| 🔧 Infrastructure (基礎設施) | 30 | 快取、佇列、工具 |

---

## 🔐 Core (核心安全) — 18 模組

| 模組 | 行數 | 功能 |
|------|:----:|------|
| `auth` | 1035 | JWT認證、OAuth、登入登出 |
| `accounts` | 391 | 使用者帳戶 CRUD |
| `tenants` | 215 | 組織資料管理（單租戶；歷史命名，見 ADR-001 Superseded） |
| `audit` | 172 | 稽核日誌 |
| `audit-log` | 150 | 存取日誌 |
| `access-log` | 66 | API 存取記錄 |
| `backup` | 254 | 資料備份還原 |
| `two-factor-auth` | 149 | TOTP 雙因素認證 |
| `biometric-auth` | 139 | 生物辨識 |
| `data-encryption` | 120 | 資料加密 |
| `gdpr-compliance` | 165 | GDPR 合規 |
| `ip-whitelist` | 126 | IP 白名單 |
| `secret-rotation` | 118 | 密鑰輪換 |
| `session-timeout` | 99 | Session 管理 |
| `system` | 258 | 系統設定 |
| `features` | 220 | Feature Flags |
| `menu-config` | 34 | 選單配置 |
| `public` | 0 | 公開端點 (Gateway) |

---

## 🎯 Mission Command (任務指揮) — 15 模組

| 模組 | 行數 | 功能 |
|------|:----:|------|
| `mission-sessions` | 235 | 任務場次管理 |
| `events` | 78 | 事件/災情管理 |
| `tasks` | 136 | 任務指派追蹤 |
| `task-dispatch` | 240 | 任務派遣 |
| `auto-dispatch` | 135 | 智慧自動派遣 |
| `triage` | 260 | START 檢傷分類 |
| `field-reports` | 109 | 現場即時回報 |
| `reports` | 341 | 災情回報 CRUD |
| `intake` | 140 | 收容管理 |
| `drill-simulation` | 292 | 災害演練模擬 |
| `aar-analysis` | 351 | 事後分析 (AAR) |
| `fatigue-detection` | 193 | 疲勞偵測 |
| `micro-task` | 173 | 微任務分派 |
| `smart-scheduling` | 184 | 智慧排程 |
| `scheduler` | 239 | 排程引擎 |

---

## 🗺️ Geo-Intel (地理情報) — 14 模組

| 模組 | 行數 | 功能 |
|------|:----:|------|
| `tactical-maps` | 223 | 戰術地圖 |
| `overlays` | 178 | 圖層管理 |
| `location` | 229 | GPS 定位 |
| `routing` | 241 | 路線規劃 |
| `geo-intel` | 320 | 地理情報整合 |
| `geofence-alert` | 175 | 地理圍欄警報 |
| `indoor-positioning` | 254 | 室內定位 |
| `cesium-3d` | 265 | 3D 地球視覺化 |
| `heatmap-analytics` | 117 | 熱力圖分析 |
| `evacuation-sim` | 242 | 疏散模擬 |
| `damage-simulation` | 232 | 災害損失模擬 |
| `offline-tiles` | 239 | 離線地圖圖磚 |
| `offline-map-cache` | 166 | 離線地圖快取 |
| `bim-integration` | 221 | BIM 建築模型 |

---

## 📦 Logistics (物資後勤) — 12 模組

| 模組 | 行數 | 功能 |
|------|:----:|------|
| `resources` | 123 | 物資庫存管理 |
| `equipment` | 202 | 設備管理 |
| `equipment-qr` | 237 | 設備 QR 碼 |
| `donations` | 364 | 捐款金流 |
| `donation-tracking` | 145 | 捐贈追蹤 |
| `resource-matching` | 319 | 資源媒合 |
| `resource-optimization` | 250 | 資源優化 |
| `supply-chain-blockchain` | 248 | 供應鏈區塊鏈 |
| `blockchain` | 360 | 區塊鏈帳本 |
| `integrity-ledger` | 271 | 完整性帳本 |
| `predictive-maintenance` | 160 | 預測性維護 |
| `water-resources` | 131 | 水資源管理 |

---

## 👥 Workforce (人力資源) — 14 模組

| 模組 | 行數 | 功能 |
|------|:----:|------|
| `volunteers` | 198 | 志工管理 |
| `volunteer-certification` | 344 | 志工認證 |
| `volunteer-points` | 270 | 志工積分 |
| `training` | 267 | 培訓課程 |
| `attendance` | 337 | 出勤打卡 |
| `shift-calendar` | 157 | 排班日曆 |
| `payroll` | 150 | 薪資核算 |
| `expense-reimbursement` | 144 | 費用報銷 |
| `org-chart` | 154 | 組織架構 |
| `rewards` | 153 | 獎勵系統 |
| `performance-report` | 175 | 績效報告 |
| `activities` | 291 | 活動管理 |
| `manuals` | 190 | 操作手冊 |
| `insarag` | 242 | 國際搜救標準 |

---

## 🤝 Community (社區服務) — 10 模組

| 模組 | 行數 | 功能 |
|------|:----:|------|
| `community` | 208 | 社區聯繫 |
| `disaster-community` | 264 | 災區社區 |
| `community-resilience` | 289 | 社區韌性 |
| `reunification` | 139 | 家屬團聚 |
| `family-reunification` | 283 | AI 相片比對 |
| `psychological-support` | 254 | 心理支持 |
| `psychological-tracking` | 332 | 心理追蹤 |
| `citizen-app` | 299 | 公民 App |
| `crowd-reporting` | 306 | 群眾回報 |
| `public-resources` | 229 | 公共資源 |

---

## 📊 Analytics (數據分析) — 12 模組

| 模組 | 行數 | 功能 |
|------|:----:|------|
| `analytics` | 218 | AI 趨勢分析 |
| `dashboard` | 304 | 儀表板 |
| `dashboard-analytics` | 224 | 儀表板分析 |
| `dashboard-builder` | 126 | 儀表板建置 |
| `reports-export` | 250 | 報表匯出 |
| `report-builder` | 245 | 報表建置器 |
| `report-scheduler` | 147 | 報表排程 |
| `excel-export` | 133 | Excel 匯出 |
| `pdf-generator` | 229 | PDF 產生器 |
| `trend-prediction` | 198 | 趨勢預測 |
| `timeline-visualization` | 132 | 時間軸視覺化 |
| `d3-chart` | 132 | D3 圖表 |

---

## 📡 Connectivity (通訊連接) — 18 模組

| 模組 | 行數 | 功能 |
|------|:----:|------|
| `line-bot` | 501 | LINE 聊天機器人 |
| `line-liff` | 391 | LINE LIFF |
| `line-notify` | 117 | LINE Notify |
| `notifications` | 243 | 通知管理 |
| `notification` | 332 | 通知服務 |
| `push-notification` | 233 | 推播通知 |
| `realtime` | 0 | WebSocket Gateway |
| `realtime-chat` | 185 | 即時聊天 |
| `ptt` | 207 | PTT 對講機 |
| `voice` | 387 | 語音通話 |
| `bluetooth-audio` | 290 | 藍牙音訊 |
| `media-streaming` | 230 | 媒體串流 |
| `satellite-comm` | 329 | 衛星通訊 |
| `offline-sync` | 114 | 離線同步 |
| `offline-mesh` | 281 | 離線網狀網路 |
| `mobile-sync` | 216 | 行動同步 |
| `telegram-bot` | 144 | Telegram 機器人 |
| `slack-integration` | 116 | Slack 整合 |

---

## 🤖 AI & Advanced (進階功能) — 22 模組

| 模組 | 行數 | 功能 |
|------|:----:|------|
| `ai` | 268 | AI 服務整合 |
| `ai-prediction` | 217 | 災情預測 (Gemini) |
| `ai-vision` | 257 | 電腦視覺 |
| `ai-queue` | 181 | AI 任務佇列 |
| `image-recognition` | 114 | 圖片辨識 |
| `speech-to-text` | 96 | 語音轉文字 |
| `voice-assistant` | 294 | 語音助理 |
| `chatbot-assistant` | 216 | AI 聊天助手 |
| `rag-knowledge` | 128 | RAG 知識庫 |
| `auto-summary` | 136 | AI 自動摘要 |
| `emotion-analysis` | 232 | 情緒分析 |
| `document-ocr` | 137 | 文件 OCR |
| `translation` | 226 | AI 翻譯 |
| `event-ai` | 231 | 事件 AI 分析 |
| `ar-navigation` | 345 | AR 導航 |
| `ar-field-guidance` | 224 | AR 現場引導 |
| `vr-command` | 344 | VR 指揮中心 |
| `drone-ops` | 223 | 無人機操控 |
| `drone-swarm` | 266 | 無人機群控 |
| `aerial-image-analysis` | 230 | 航拍影像分析 |
| `robot-rescue` | 416 | 救援機器人 |
| `wearable` | 342 | 穿戴裝置 |

---

## 🌤️ External Integration (外部整合) — 10 模組

| 模組 | 行數 | 功能 |
|------|:----:|------|
| `ncdr-alerts` | 915 | 國家災防中心 |
| `weather` | 305 | 氣象服務 |
| `weather-forecast` | 455 | 氣象預報 |
| `weather-hub` | 37 | 氣象整合 |
| `weather-alert-integration` | 203 | 氣象警報 |
| `tccip-climate` | 111 | TCCIP 氣候 |
| `fire-119` | 129 | 消防署 119 |
| `ngo-api` | 388 | NGO 對外 API |
| `ngo-integration` | 225 | NGO 系統整合 |
| `multi-eoc` | 198 | 多 EOC 協調 |

---

## 🔧 Infrastructure (基礎設施) — 30 模組

| 模組 | 行數 | 功能 |
|------|:----:|------|
| `database` | 0 | TypeORM 連線 |
| `health` | 0 | 健康檢查 |
| `shared` | 0 | 共用模組 |
| `cache` | 208 | 快取服務 |
| `redis-cache` | 103 | Redis 快取 |
| `files` | 198 | 檔案管理 |
| `file-upload` | 140 | 檔案上傳 |
| `uploads` | 137 | 上傳服務 |
| `qr-scanner` | 133 | QR 掃描 |
| `nfc` | 148 | NFC 感應 |
| `device-management` | 99 | 設備管理 |
| `error-tracking` | 139 | 錯誤追蹤 |
| `sentry` | 100 | Sentry 整合 |
| `prometheus` | 127 | Prometheus 監控 |
| `metrics` | 209 | 指標收集 |
| `webhooks` | 254 | Webhook 管理 |
| `integrations` | 226 | 整合管理 |
| `i18n-api` | 149 | 國際化 API |
| `announcements` | 194 | 公告管理 |
| `email-template` | 142 | 郵件模板 |
| `scheduled-tasks` | 160 | 排程任務 |
| `mock-data` | 110 | 測試資料 |
| `swagger-auto-docs` | 130 | API 文件 |
| `power-bi` | 203 | Power BI |
| `social-media-monitor` | 292 | 社群監控 |
| `spectrum-analysis` | 299 | 頻譜分析 |
| `disaster-summary` | 170 | 災情摘要 |
| `public-finance` | 153 | 公共財務 |
| `multi-tenant` | - | *(已移除，單租戶降級 D9)* |
| `ai-prediction` *(dup)* | - | *(見 AI 分類)* |

---

## 📈 統計摘要

| 指標 | 數值 |
|------|:----:|
| 總模組數 | 175 |
| 總程式碼行數 | ~35,000+ |
| 平均每模組 | ~200 行 |
| 最大模組 | `auth` (1,035 行) |
| 最小模組 | `menu-config` (34 行) |
| AI 整合模組 | 22 個 |
| 外部整合 | 10 個 |

---

*文件由 Antigravity Agent 生成 | 2026-02-01*
