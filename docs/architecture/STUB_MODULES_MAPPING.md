# Light Keepers 空殼/Stub 模組功能對照表

> **版本**: v1.0  
> **日期**: 2026-02-01  
> **識別標準**: 模組內檔案數 ≤ 2

---

## 總覽

| 分類 | 數量 | 說明 |
|------|:----:|------|
| 總 Stub 模組 | 75 | 僅有 module + service/controller |
| P0 刪除候選 | 15 | 明確無用途 |
| P1 評估候選 | 30 | 可合併至其他模組 |
| P2 待開發 | 30 | 未來功能預留 |

---

## 1. AI 與機器學習相關（11 個）

| 模組 | 預期功能 | 建議處置 | 優先級 |
|------|----------|----------|:------:|
| `ai-prediction` | AI 災情預測引擎 | 合併至 `ai` | P1 |
| `ai-vision` | 電腦視覺影像分析 | 合併至 `ai` | P1 |
| `auto-dispatch` | 智慧自動派遣 | 合併至 `task-dispatch` | P1 |
| `auto-summary` | AI 自動摘要生成 | 合併至 `ai` | P1 |
| `emotion-analysis` | 情緒分析（心理健康）| 合併至 `psychological-support` | P2 |
| `image-recognition` | 圖片辨識（災情分類）| 合併至 `ai-vision` → `ai` | P1 |
| `predictive-maintenance` | 設備預測性維護 | 合併至 `equipment` | P2 |
| `speech-to-text` | 語音轉文字 | 合併至 `ai` 或 `voice` | P2 |
| `voice-assistant` | 語音助理互動 | 合併至 `voice` | P2 |
| `document-ocr` | 文件 OCR 辨識 | 合併至 `ai` | P2 |
| `damage-simulation` | 災害損失模擬 | 未來開發 | P3 |

---

## 2. 地理資訊與可視化（8 個）

| 模組 | 預期功能 | 建議處置 | 優先級 |
|------|----------|----------|:------:|
| `geo-intel` | 地理情報整合層 | 合併至 `tactical-maps` | P1 |
| `cesium-3d` | 3D 地球可視化 | 合併至 `tactical-maps` | P2 |
| `d3-chart` | D3.js 圖表組件 | 合併至 `analytics` | P1 |
| `heatmap-analytics` | 熱力圖分析 | 合併至 `analytics` | P1 |
| `ar-navigation` | AR 導航（災場）| 未來開發 | P3 |
| `evacuation-sim` | 疏散路線模擬 | 合併至 `routing` | P2 |
| `bim-integration` | BIM 建築模型整合 | 未來開發 | P3 |
| `vr-command` | VR 指揮中心 | 未來開發 | P3 |

---

## 3. 通訊與連線（12 個）

| 模組 | 預期功能 | 建議處置 | 優先級 |
|------|----------|----------|:------:|
| `line-liff` | LINE LIFF 小程式 | 合併至 `line-bot` | P1 |
| `line-notify` | LINE Notify 推播 | 合併至 `notifications` | P1 |
| `push-notification` | 推播通知服務 | 合併至 `notifications` | P1 |
| `notification` | 通知基礎模組 | 合併至 `notifications` | P1 |
| `telegram-bot` | Telegram 機器人 | 保留但降優先 | P2 |
| `slack-integration` | Slack 整合 | 保留但降優先 | P2 |
| `ptt` | PTT 對講機（WebRTC）| 合併至 `realtime` | P2 |
| `satellite-comm` | 衛星通訊整合 | 未來開發 | P3 |
| `bluetooth-audio` | 藍牙音訊（對講）| 合併至 `ptt` → `realtime` | P2 |
| `media-streaming` | 媒體串流服務 | 合併至 `realtime` | P2 |
| `nfc` | NFC 近場通訊 | 未來開發（打卡、設備識別）| P3 |
| `offline-tiles` | 離線地圖圖磚 | 合併至 `offline-sync` | P1 |
| `offline-map-cache` | 離線地圖快取 | 合併至 `offline-sync` | P1 |

---

## 4. 安全與合規（8 個）

| 模組 | 預期功能 | 建議處置 | 優先級 |
|------|----------|----------|:------:|
| `data-encryption` | 資料加密服務 | 合併至 `auth` | P1 |
| `gdpr-compliance` | GDPR 合規工具 | 合併至 `accounts` (data-export) | P1 |
| `ip-whitelist` | IP 白名單管理 | 合併至 `auth` | P1 |
| `secret-rotation` | 密鑰輪換 | 合併至 `system` | P2 |
| `session-timeout` | Session 超時管理 | 合併至 `auth` | P1 |
| `two-factor-auth` | 雙因素認證 | 合併至 `auth` | P1 |
| `sentry` | Sentry 錯誤追蹤 | 合併至 `system` | P1 |
| `swagger-auto-docs` | Swagger 文件自動化 | 已內建 NestJS，可刪除 | P0 |

---

## 5. 報表與分析（6 個）

| 模組 | 預期功能 | 建議處置 | 優先級 |
|------|----------|----------|:------:|
| `dashboard` | 儀表板核心 | 合併至 `analytics` | P1 |
| `dashboard-builder` | 自訂儀表板建置 | 合併至 `analytics` | P2 |
| `power-bi` | Power BI 整合 | 保留但降優先 | P3 |
| `report-scheduler` | 報表排程發送 | 合併至 `reports-export` | P1 |
| `aar-analysis` | AAR 事後分析 | 合併至 `mission-sessions` | P1 |
| `disaster-summary` | 災情摘要報告 | 合併至 `reports` | P1 |

---

## 6. 人力資源相關（4 個）

| 模組 | 預期功能 | 建議處置 | 優先級 |
|------|----------|----------|:------:|
| `volunteer-certification` | 志工認證管理 | 合併至 `training` | P1 |
| `psychological-tracking` | 心理健康追蹤 | 合併至 `psychological-support` | P1 |
| `rewards` | 志工獎勵積分 | 合併至 `volunteer-points` | P1 |
| `wearable` | 穿戴裝置整合 | 未來開發（疲勞監測）| P3 |

---

## 7. 外部整合（6 個）

| 模組 | 預期功能 | 建議處置 | 優先級 |
|------|----------|----------|:------:|
| `ngo-api` | NGO 對外 API | 合併為 `ngo-integration` | P1 |
| `ngo-integration` | NGO 系統整合 | 保留 | P1 |
| `fire-119` | 消防署 119 介接 | 保留 | P2 |
| `insarag` | 國際搜救隊標準 | 合併至 `triage` | P2 |
| `multi-eoc` | 多 EOC 協調 | 合併至 `mission-sessions` | P2 |
| `multi-tenant` | 多租戶支援 | 合併至 `tenants` | P1 |

---

## 8. 基礎設施（10 個）

| 模組 | 預期功能 | 建議處置 | 優先級 |
|------|----------|----------|:------:|
| `database` | 資料庫連線 | 合併至 `shared` | P0 |
| `redis-cache` | Redis 快取服務 | 合併至 `cache` | P1 |
| `file-upload` | 檔案上傳 | 合併至 `uploads` | P0 |
| `email-template` | 郵件模板 | 合併至 `notifications` | P1 |
| `i18n-api` | 國際化 API | 合併至 `system` | P1 |
| `translation` | 翻譯服務 | 合併至 `i18n-api` → `system` | P1 |
| `mock-data` | 測試假資料 | 移至 `test/` 目錄 | P0 |
| `scheduled-tasks` | 排程任務 | 合併至 `scheduler` | P0 |
| `qr-scanner` | QR 碼掃描 | 合併至 `equipment-qr` | P1 |
| `public` | 公開端點 | 已有，確認無重複 | P0 |

---

## 9. 進階功能（10 個）

| 模組 | 預期功能 | 建議處置 | 優先級 |
|------|----------|----------|:------:|
| `citizen-app` | 公民 App 後端 | 未來 Mobile 開發 | P2 |
| `community-resilience` | 社區韌性評估 | 合併至 `community` | P2 |
| `crowd-reporting` | 群眾回報系統 | 合併至 `reports` | P1 |
| `device-management` | 設備管理 | 合併至 `equipment` | P1 |
| `micro-task` | 微任務分派 | 合併至 `tasks` | P2 |
| `resource-matching` | 資源媒合 | 合併至 `resources` | P1 |
| `resource-optimization` | 資源優化 | 合併至 `resources` | P2 |
| `robot-rescue` | 救援機器人控制 | 未來開發 | P3 |
| `drone-swarm` | 無人機群控 | 合併至 `drone-ops` | P2 |
| `timeline-visualization` | 時間軸可視化 | 合併至 `analytics` | P1 |

---

## 處置摘要

| 處置方式 | 數量 | 說明 |
|----------|:----:|------|
| **刪除** | 5 | `swagger-auto-docs`, `database`, `mock-data`, `scheduled-tasks`, `public` |
| **合併** | 55 | 整合至對應 Domain 主模組 |
| **保留降優先** | 5 | `telegram-bot`, `slack-integration`, `power-bi`, `fire-119`, `ngo-integration` |
| **未來開發** | 10 | `satellite-comm`, `robot-rescue`, `vr-command`, `bim-integration` 等 |

---

## 合併對照表

| 目標模組 | 合併來源 |
|----------|----------|
| `ai` | ai-prediction, ai-vision, auto-summary, image-recognition, document-ocr, speech-to-text |
| `auth` | data-encryption, ip-whitelist, session-timeout, two-factor-auth |
| `notifications` | line-notify, push-notification, notification, email-template |
| `analytics` | dashboard, dashboard-builder, d3-chart, heatmap-analytics, timeline-visualization |
| `task-dispatch` | auto-dispatch |
| `offline-sync` | offline-tiles, offline-map-cache |
| `system` | secret-rotation, sentry, i18n-api, translation |
| `reports` | disaster-summary, crowd-reporting |
| `tactical-maps` | geo-intel, cesium-3d |
| `realtime` | ptt, bluetooth-audio, media-streaming |
| `resources` | resource-matching, resource-optimization |
| `equipment` | device-management, predictive-maintenance |
| `training` | volunteer-certification |
| `psychological-support` | emotion-analysis, psychological-tracking |

---

*文件由 Antigravity Agent 生成 | 2026-02-01*
