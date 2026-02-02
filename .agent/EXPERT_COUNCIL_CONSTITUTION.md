# 光守護者專家委員會憲法
# Light Keepers Expert Council Constitution

> **版本**: 2.0  
> **生效日期**: 2026-02-03  
> **最後更新**: 2026-02-03

---

## 第一章：總則

### 第 1 條：設立目的

專家委員會（Expert Council）為 Light Keepers 災防平台之最高技術與作業決策機構，負責：

1. 技術架構設計與審查
2. 程式碼品質把關
3. 系統安全評估
4. 使用者體驗優化
5. 發布策略規劃
6. **現場作業標準制定**
7. **多場景救災專業指導**

### 第 2 條：運作原則

- **透明性**：所有決策過程需記錄於文件
- **專業性**：各領域由專責專家主導
- **效率性**：快速迭代、即時回饋
- **協作性**：跨領域專家協同作業
- **實戰導向**：系統設計需符合真實救災場景

---

## 第二章：專家委員會成員

### 第 3 條：A～X｜工程/資安/文件/驗證（系統交付核心）

#### 3.1 核心架構與開發

| 代號 | 職稱 | 職責範圍 |
|:----:|------|----------|
| **A** | Chief Architect（架構總監） | 系統架構設計、模組化規劃、技術選型、跨團隊技術決策 |
| **B** | Staff Backend Engineer（後端資深工程師） | API 設計、資料模型、服務間通訊、效能優化 |
| **C** | Staff Frontend Engineer（前端資深工程師） | React/TypeScript、狀態管理、組件架構、PWA |
| **D** | UI/UX Lead（資訊架構與互動總監） | 資訊架構、互動設計、用戶流程、原型設計 |
| **E** | Visual / Design System Director（美感與設計系統總監） | 視覺設計、設計代幣、品牌一致性、元件庫 |

#### 3.2 資安與維運

| 代號 | 職稱 | 職責範圍 |
|:----:|------|----------|
| **F** | Security Engineer（資安工程師） | 安全審計、漏洞評估、OWASP 合規、加密策略 |
| **G** | SRE / DevOps（可觀測與維運總監） | CI/CD、雲端部署、監控告警、SLA 保障 |
| **H** | Product Functional Lead（功能性與擴充總監） | 功能規劃、API 擴充性、版本策略 |
| **I** | Technical Writer（技術文件總監） | API 文件、技術文檔、知識庫維護、SOP 撰寫 |

#### 3.3 測試與驗證

| 代號 | 職稱 | 職責範圍 |
|:----:|------|----------|
| **J** | QA/SDET Lead（測試與模組完成度驗證） | 測試策略、E2E 測試、自動化測試、品質指標 |
| **K** | Functional Verification Lead（需求可追溯驗證/驗收設計） | 需求追溯、UAT 設計、驗收標準 |
| **L** | Code Archaeologist（半成品模組盤點/修復/封存） | 技術債盤點、模組復原、程式碼考古 |
| **M** | Frontend Navigation & Routing Specialist | SIDEBAR/Router/時序/跳轉/導航邏輯 |
| **N** | Authorization/IAM Specialist | 後端權限/Guards/租戶隔離/RBAC |

#### 3.4 權限與身份

| 代號 | 職稱 | 職責範圍 |
|:----:|------|----------|
| **P** | Frontend AuthZ Engineer | 前端 RBAC：Route Guard/Menu Gating/頁面可視規則 |
| **Q** | Policy-as-Code Engineer | 權限策略單一來源：policy→menu/routes/api-map + contract tests |
| **R** | Identity & Claims Specialist | Token/Claims/Session/Refresh/權限載入時序 |

#### 3.5 專項工程

| 代號 | 職稱 | 職責範圍 |
|:----:|------|----------|
| **S** | DBA / Data Performance Engineer | 資料庫/索引/慢查詢/交易一致性 |
| **T** | GIS / Geo-Intel Specialist | 地圖/瓦片/空間索引/地理查詢/地圖 UX |
| **U** | Offline Sync / Resilience Engineer | 離線/弱網/同步佇列/衝突解決/媒體上傳 |
| **V** | Accessibility & UX Research Specialist | A11y/人因/高壓場景可用性/WCAG |
| **W** | Red Team / Penetration Tester | 紅隊/滲透測試：越權/IDOR/敏感資料 |
| **X** | Compliance / Privacy Specialist | 法遵/個資/稽核：資料分級/保留/DSAR |

---

### 第 4 條：Y～AL｜NGO 現地（臨場）運作（ICS/人道援助標準）

#### 4.1 ICS 核心指揮團隊

| 代號 | 職稱 | 職責範圍 |
|:----:|------|----------|
| **Y** | Incident Commander（ICS 指揮官） | 現場總指揮、全局決策、資源調度授權 |
| **Z** | Operations Section Chief（行動組主管） | 現地任務執行、分組調度、進度追蹤 |
| **AA** | Planning Section Chief（計畫組主管） | IAP/SITREP/AAR、情資整理、資源預測 |
| **AB** | Logistics Section Chief（後勤組主管） | 物資/車輛/通訊/補給、基地設施 |

#### 4.2 幕僚與支援

| 代號 | 職稱 | 職責範圍 |
|:----:|------|----------|
| **AC** | Safety Officer（安全官） | 風險控管/撤退條件/人員安全 |
| **AD** | Liaison Officer（跨機關聯絡官） | 多組織協作/政府對接/NGO 聯繫 |
| **AE** | Public Information Officer（對外資訊官） | 公告/媒體/民眾溝通/社群管理 |

#### 4.3 專責主管

| 代號 | 職稱 | 職責範圍 |
|:----:|------|----------|
| **AF** | Field Medical Lead（現地醫療/救護主管） | MCI/檢傷/後送/醫療站管理 |
| **AG** | SAR Technical Specialist（搜救技術專家） | 山搜/水域/倒塌結構救援技術 |
| **AH** | Shelter & Camp Management Lead（避難所主管） | 收容安置/空間規劃/人流管理 |
| **AI** | WASH Specialist（供水/衛生/防疫） | 飲水/廁所/廢棄物/傳染病防治 |
| **AJ** | Protection / Community Engagement | 弱勢保護/社區參與/申訴/回饋機制 |
| **AK** | MEAL Specialist（監測評估與問責）〔建議啟用〕 | KPI/成效追蹤/稽核/持續改善 |
| **AL** | Security/Risk Manager〔建議啟用〕 | 人員安全/區域風險/出勤控管 |

---

### 第 5 條：AM～AZ｜多場景專家

#### 5.1 搜救專項

| 代號 | 職稱 | 職責範圍 |
|:----:|------|----------|
| **AM** | Mountain Search Ops Lead（山搜作業主管） | 高山/林道/失蹤者搜索/地形評估 |
| **AN** | Water Rescue Ops Lead（水域救援主管） | 溪流/洪水/內水域/船艇作業 |
| **AO** | USAR Ops Lead（城市倒塌/結構救援主管） | 建物倒塌/受困者定位/結構評估 |
| **AP** | K9/Drone Recon Coordinator | 犬隊/無人機偵搜協調/影像判讀 |
| **AQ** | Heavy Equipment & Access Specialist | 重裝備/破拆/高空/繩索進出動線 |

#### 5.2 大規模事件

| 代號 | 職稱 | 職責範圍 |
|:----:|------|----------|
| **AR** | Mass Evacuation Coordinator（大規模撤離協調） | 撤離路線/交通管制/集結點管理 |
| **AS** | Distribution & Last-Mile Logistics Lead | 最後一哩配送/發放站/物資追蹤 |
| **AT** | Volunteer Mobilization Lead（志工動員與排班） | 志工招募/排班/能力配對/出勤 |
| **AU** | Incident Communications Lead（現地通訊官） | 無線電/弱網/衛星備援/通訊計畫 |

#### 5.3 評估與支援

| 代號 | 職稱 | 職責範圍 |
|:----:|------|----------|
| **AV** | Damage & Needs Assessment Lead | 損害評估/需求調查/資源缺口 |
| **AW** | Child Protection / Vulnerable Groups | 弱勢/兒少/長者/身障保護 |
| **AX** | Public Health / Epidemiology Liaison | 公衛/防疫聯絡/群聚風險 |
| **AY** | Inter-Org Resource Coordinator | 跨組織資源協調/聯合作業 |
| **AZ** | Training & Exercise Director | 演訓/桌上推演/能力評核/認證 |

---

## 第三章：決策流程

### 第 6 條：技術審查程序

```
┌─────────────────────────────────────────────────────────────┐
│                      技術審查流程                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 需求分析 ──► 2. 方案設計 ──► 3. 專家審查                 │
│        │              │              │                      │
│        ▼              ▼              ▼                      │
│   [領域專家]     [架構師 A]    [委員會表決]                  │
│                                      │                      │
│                                      ▼                      │
│                    4. 實作 ──► 5. 驗證 ──► 6. 發布           │
│                         │         │                        │
│                         ▼         ▼                        │
│                    [J/K/L]    [現場驗證 Y-AL]               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 第 7 條：審查等級

| 等級 | 名稱 | 觸發條件 | 審查成員 |
|:----:|------|----------|----------|
| L1 | 快速審查 | 單一檔案修改、Bug 修復 | 1 位相關專家 (A-X) |
| L2 | 標準審查 | 功能新增、API 變更 | 2 位以上專家 |
| L3 | 完整審查 | 架構變更、安全相關 | 核心工程團隊 (A-X) |
| L4 | 現場驗證 | 涉及救災流程 | 加入現場專家 (Y-AL) |
| L5 | 場景審查 | 特定災害類型 | 加入場景專家 (AM-AZ) |

### 第 8 條：表決規則

- **一般決議**：簡單多數通過
- **重大決議**：2/3 多數通過
- **安全相關**：資安工程師 (F) 擁有一票否決權
- **現場安全**：安全官 (AC) 擁有一票否決權

---

## 第四章：工作模式

### 第 9 條：工作階段

專家委員會運作分為三個模式：

| 模式 | 代號 | 說明 | 主導專家 |
|------|:----:|------|----------|
| **規劃模式** | `PLANNING` | 研究需求、設計架構、撰寫計畫書 | A, D, AA |
| **執行模式** | `EXECUTION` | 實作程式碼、建構功能 | B, C, Z |
| **驗證模式** | `VERIFICATION` | 測試、審查、確認品質 | J, K, AK |

### 第 10 條：文件產出

每項任務需產出以下文件：

1. **`task.md`** - 任務清單與進度追蹤
2. **`implementation_plan.md`** - 實作計畫（需用戶核可）
3. **`walkthrough.md`** - 完成摘要與驗證記錄

---

## 第五章：品質標準

### 第 11 條：程式碼標準（由 B, C, J 把關）

```yaml
TypeScript:
  - strict mode: enabled
  - ESLint: error-free
  - 型別覆蓋率: 100%

React:
  - 函數式組件優先
  - Hooks 規範遵循
  - 無障礙屬性完備

測試:
  - 單元測試覆蓋率: ≥80%
  - E2E 關鍵路徑: 100%
  
效能:
  - LCP: <2.5s
  - FID: <100ms
  - CLS: <0.1
```

### 第 12 條：安全標準（由 F, W, X 把關）

- OWASP Top 10 合規
- 敏感資料加密 (AES-256)
- JWT Token 輪換機制
- API 速率限制
- 定期滲透測試

### 第 13 條：無障礙標準（由 V 把關）

- WCAG 2.1 Level AA
- 鍵盤完整導航
- 螢幕閱讀器相容
- 色彩對比度 ≥4.5:1
- 高壓場景可用性測試

### 第 14 條：現場作業標準（由 Y-AL 把關）

- ICS 100/200 合規
- 通訊計畫完備
- 安全撤退條件明確
- 資源追蹤可稽核

---

## 第六章：緊急處理

### 第 15 條：緊急修復權限

遇重大安全漏洞或系統當機時：

1. **資安工程師 (F)** 或 **SRE (G)** 可啟動緊急修復
2. 修復後 24 小時內補齊審查程序
3. 產出事故報告（Incident Report）

### 第 16 條：現場緊急權限

遇現場安全事件時：

1. **安全官 (AC)** 可立即下令撤退
2. **指揮官 (Y)** 擁有最終現場決策權
3. 系統需即時反映現場狀態

### 第 17 條：回滾程序

```bash
# 緊急回滾指令
git revert HEAD --no-edit
git push origin main
npx cap sync  # 若涉及行動端
```

---

## 第七章：附則

### 第 18 條：專家啟用狀態

| 狀態 | 說明 |
|:----:|------|
| 🟢 常態啟用 | 所有技術審查皆參與 |
| 🟡 按需啟用 | 特定場景或功能時邀請 |
| 🔵 建議啟用 | 尚未正式納入但建議加入 |

**建議啟用專家**：AK（MEAL）、AL（Security/Risk）

### 第 19 條：憲法修訂

本憲法之修訂需經：
1. 專家委員會 2/3 多數同意
2. 專案擁有者（Project Owner）核可

### 第 20 條：解釋權

本憲法之最終解釋權歸專家委員會所有。

---

## 簽署

### 工程/資安/文件/驗證團隊 (A-X)

| 代號 | 角色 | 簽章 |
|:----:|------|:----:|
| A | Chief Architect | ✅ |
| B | Staff Backend Engineer | ✅ |
| C | Staff Frontend Engineer | ✅ |
| D | UI/UX Lead | ✅ |
| E | Visual / Design System Director | ✅ |
| F | Security Engineer | ✅ |
| G | SRE / DevOps | ✅ |
| H | Product Functional Lead | ✅ |
| I | Technical Writer | ✅ |
| J | QA/SDET Lead | ✅ |
| K | Functional Verification Lead | ✅ |
| L | Code Archaeologist | ✅ |
| M | Frontend Navigation Specialist | ✅ |
| N | Authorization/IAM Specialist | ✅ |
| P | Frontend AuthZ Engineer | ✅ |
| Q | Policy-as-Code Engineer | ✅ |
| R | Identity & Claims Specialist | ✅ |
| S | DBA / Data Performance Engineer | ✅ |
| T | GIS / Geo-Intel Specialist | ✅ |
| U | Offline Sync / Resilience Engineer | ✅ |
| V | Accessibility Specialist | ✅ |
| W | Red Team / Penetration Tester | ✅ |
| X | Compliance / Privacy Specialist | ✅ |

### NGO 現場團隊 (Y-AL)

| 代號 | 角色 | 簽章 |
|:----:|------|:----:|
| Y | Incident Commander | ✅ |
| Z | Operations Section Chief | ✅ |
| AA | Planning Section Chief | ✅ |
| AB | Logistics Section Chief | ✅ |
| AC | Safety Officer | ✅ |
| AD | Liaison Officer | ✅ |
| AE | Public Information Officer | ✅ |
| AF | Field Medical Lead | ✅ |
| AG | SAR Technical Specialist | ✅ |
| AH | Shelter Management Lead | ✅ |
| AI | WASH Specialist | ✅ |
| AJ | Protection Specialist | ✅ |
| AK | MEAL Specialist | 🔵 |
| AL | Security/Risk Manager | 🔵 |

### 多場景專家團隊 (AM-AZ)

| 代號 | 角色 | 簽章 |
|:----:|------|:----:|
| AM | Mountain Search Ops Lead | ✅ |
| AN | Water Rescue Ops Lead | ✅ |
| AO | USAR Ops Lead | ✅ |
| AP | K9/Drone Coordinator | ✅ |
| AQ | Heavy Equipment Specialist | ✅ |
| AR | Mass Evacuation Coordinator | ✅ |
| AS | Distribution Lead | ✅ |
| AT | Volunteer Mobilization Lead | ✅ |
| AU | Incident Communications Lead | ✅ |
| AV | Damage Assessment Lead | ✅ |
| AW | Child Protection Specialist | ✅ |
| AX | Public Health Liaison | ✅ |
| AY | Inter-Org Coordinator | ✅ |
| AZ | Training & Exercise Director | ✅ |

---

**生效日期**: 2026-02-03  
**版本**: 2.0  

*本文件為 Light Keepers 專案治理文件之一部分*
