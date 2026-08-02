# Light Keepers 設計語言（Design Language v2.0 — R5 戰術化）

> **v2.0（2026-08-02，R5/T1）**：owner 實機檢視後否決 v1.0 落地成果——「平時模式」
> 成了白底通用後台，違反戰術規範。v2.0 的根本修正：
> **戰術 DNA 貫穿雙模式，淺色 SaaS 主題自此不存在。**
> 完整任務規格見 `docs/FRONTEND_TACTICAL_REBUILD_PROMPT.md`；
> `lightkeepers_tactical_uiux_spec_utf8_bundle/` 從「精神來源」升格為**美學權威**（逐條遵守）。
>
> ## v2 核心增補（蓋過下方 v1 內容中矛盾處）
>
> ### A. 雙模式＝張力差，不是身份差
> | | 平時（Ops，低張力） | 災時（Tactical，全張力） |
> |---|---|---|
> | 基底 | `#1B2534`／面板 `#212C3C`（tokens.css **Layer 9**） | `#161E2A`／面板 `#1D2635`（**Layer 8**，data-app-mode="emergency"） |
> | 金色 `#C39B6F` | 主要 CTA 與作用態 | 只剩「立即行動」（派遣/ACK/通報） |
> | 動效 | 極少 | 只有告警脈動 |
> | 導航 | 完整 | 收斂到 回報→分流→任務→執行→結案＋傷檢＋SOS |
>
> ### B. 戰術工藝五律（每個元件都要過）
> 1. **細格線底紋**：app shell 背景 32px 網格、透明度 ≤2.5%（作業台質感，不搶內容）
> 2. **Hairline 分層**：面板一律 1px `--border-default` 邊框＋左側 3px 狀態閂；**不用浮起陰影卡**
> 3. **等寬讀數**：所有數字/時間戳/座標/編號＝`--font-mono`＋`tabular-nums`（3 秒法則：讀數不跳動）
> 4. **金色紀律**：`#C39B6F` 每屏 ≤2 個元素；作用態＝金色細閂（inset 2px），**不整塊填色**
> 5. **狀態安靜律**：正常狀態灰字＋色點；只有異常才讓狀態色說話（參考航空 EFIS：紅色永遠最少）
>
> ### C. 國際參考的轉譯結論
> TAK/ATAK（地圖優先、深底高對比符號）、MIL-STD-2525（形狀＋顏色雙編碼＝色盲安全）、
> Palantir/Anduril（資訊密度管理、mono 數據、chip 狀態）、NASA 任務牆（大數字＋趨勢＋異常才亮）、
> 航空 EFIS（三級告警 Advisory 白/Caution 琥珀/Warning 紅）、OCHA/IFRC GO（人道數字的克制誠實）、
> FEMA ICS（編號/時間/簽核鏈的表單紀律）、台灣 CBS/NCDR（在地災型圖示與告警配色慣例）。
>
> ### D. 紅色憲法（v1 §3 收緊）
> 紅 `#893336`（亮版 `#C25B5F`）**只給生命/安全**：SOS、BLACK 傷票、禁入區、撤離。
> 一般錯誤（表單驗證、網路失敗、4xx/5xx）一律**琥珀 `#D9A05B`**。
>
> ### E. RWD 四層（v1 §6 擴充）
> 360–430 外勤（44px 觸控/拇指區/底導 ≤5）→ 768–1024 車載（地圖+側欄雙窗格）→
> 1280–1920 指揮所（三欄）→ **1920+ TV 牆**（唯讀、3 秒法則、自動輪播，T2 實作）。
>
> ### F. 落地位置（T1 已實作）
> tokens.css Layer 9（平時＝戰術低張力，蓋掉全部亮色預設）；AppShellLayout.css／
> MobileBottomNav.css／situational.css 的「R5/T1」段；SyncStatusIndicator 狀態章範式。
> T2+ 依 `FRONTEND_TACTICAL_REBUILD_PROMPT.md` 分批。
>
> 相關文件：
> - Token 單一來源：`web-dashboard/src/styles/tokens.css`（規則見 `docs/architecture/DESIGN_SYSTEM_CONSOLIDATION.md`）
> - 元件庫單一來源：`web-dashboard/src/design-system/`
> - 權限單一來源：`web-dashboard/src/config/page-policy.ts`
> - 導覽單一來源：`web-dashboard/src/config/navigation.ts`
> - **美學權威**：`lightkeepers_tactical_uiux_spec_utf8_bundle/`（v2 起逐條遵守）
>
> 以下為 v1.0 原文（結構性內容仍有效；視覺敘述與上方 v2 矛盾處以 v2 為準——
> 特別是 v1 任何暗示「平時模式＝淺色」的段落已全部作廢）。

---

## 0. 三條裁決原則（衝突時依序優先）

災防平台的特殊性是第一原則。所有視覺與互動決策，衝突時依下列順序裁決：

1. **高壓可用性 > 美觀**。使用者可能在低光源、戴手套、單手持機、認知超載的狀態下操作。
   可讀性、觸控目標、最少層級到達關鍵動作，永遠贏過視覺裝飾。
2. **狀態色語意嚴格**。紅＝危急、橙＝警戒、綠＝安全（§3）。狀態色**不得**挪作裝飾、品牌或強調用途；
   反過來，裝飾色也不得與狀態色混淆（例如不可用紅色當「精選」標籤）。
3. **單一來源**。token 只出自 `tokens.css`；權限只出自 `page-policy.ts`；導覽結構只出自 `navigation.ts`；
   元件只出自 `design-system/`。任何頁面不得自建第二份。

---

## 1. 雙模式 IA（平時 / 災時）

平台服務兩種截然不同的情境，介面必須跟著切換：

| | 平時模式（normal） | 災時模式（emergency） |
|---|---|---|
| 服務內容 | 管理、訓練、社群、後勤整備 | 應變、派遣、回報、傷檢、避難 |
| 導覽 | 完整 8 群組（依角色分層，§5） | 收斂到「應變核心」動作清單（見下） |
| 視覺 | 標準 light/dark 主題 | 強制切換高對比戰術深色主題 |
| 資訊密度 | 依角色（志工簡、幹部密） | 一律「行動優先」：大按鈕、少文字、狀態徽章 |
| 狀態列 | 隱藏 | `EmergencyStatusBar` 常駐置頂 |

### 1.1 模式判定規則（已實作於 `useAppMode.ts`）

```
mode = override ?? (emergencyLevel >= Warning(2) ? 'emergency' : 'normal')
```

- **自動觸發**：`EmergencyProvider`（`src/context/useEmergencyContext.tsx`）的
  `emergencyLevel >= EmergencyLevel.Warning` 時自動進入災時模式。
- **手動覆寫**：L2+ 幹部可在 header 手動切換（演練、事後復盤需要），
  儲存於 `localStorage['lk-app-mode-override']`（值：`'emergency' | 'normal'`，無值＝自動）。
- **視覺掛載點**：`AppShellLayout` 根節點設 `data-app-mode="emergency|normal"`；
  `tokens.css` 的災時覆寫層（`.appShellLayout[data-app-mode="emergency"]`）將語義 token
  整組換成戰術深色盤。**頁面 CSS 不需要、也不得針對災時模式另寫顏色**——
  只要頁面全部使用語義 token（`--bg-*` / `--surface-*` / `--text-*` / `--border-*`），切換即自動生效。

### 1.2 災時模式的導覽收斂

災時模式下，側欄與行動端 bottom nav 只顯示標記 `emergencyCore: true` 的項目（`navigation.ts`），
依角色再過濾。核心動作固定順序（前四項在行動端就是 bottom nav）：

1. 快速通報（/intake）
2. 任務（/tasks）
3. 地圖（/geo/map）
4. 傷患分類（/rescue/triage，L1+）
5. 警報（/hub/geo-alerts）、避難所（/geo/shelters）、物資（/logistics/inventory，L1+）、
   人員（/workforce/people，L1+）、現地通訊（/rescue/field-comms，L2+）、戰情儀表板（/command-center）
6. SOS 為獨立紅色 FAB / 側欄快捷，永遠在（§3 紅色規則）。

### 1.3 災時模式視覺規格（tactical dark）

取自戰術 UI spec 的最小可行色盤，已落在 `tokens.css` 災時覆寫層：

| 語義 token | 災時值 | 用途 |
|---|---|---|
| `--bg-primary` | `#161E2A` | 全域背景 |
| `--bg-secondary` / `--surface-default` | `#1D2635` | 面板/卡片 |
| `--border-default` | `#2F3641` | 分隔線/細邊框 |
| `--text-primary` | `#F3F3F2` | 主要文字 |
| `--text-secondary` | `#D0CEC3` | 次要文字 |
| `--text-tertiary` | `#AEAEA7` | 低優先資訊 |
| `--accent-primary` | `#C39B6F`（戰術金） | 關鍵行動/焦點，**克制使用** |

戰術金只用於「可行動的關鍵按鈕/選取/焦點」；紅色仍保留給生命安全（§3）。
災時模式下動效一律縮短（`--duration-fast`），禁止裝飾性動畫。

---

## 2. 格線、密度、字階、間距節奏

### 2.1 spacing 節奏（4px 基準）

一律使用 `--space-1..16`（4/8/12/16/24/32/48/64）。規則：

- 元件內 padding：`--space-3`（12px）或 `--space-4`（16px）
- 卡片之間 gap：`--space-4`（16px）；行動端縮為 `--space-3`
- 區塊（section）之間：`--space-6`（24px）
- 頁面外框 padding：桌機 `--space-6`、平板 `--space-4`、手機 `--space-3`
- 禁止出現非 4 倍數的 magic number（例外：1px 邊框、圖示光學對齊 ±2px）

### 2.2 字階（type scale）

基準 16px（`--font-size-base`），不得縮小全域基準。層級固定五階：

| 用途 | token | 桌機 | 行動端 | 字重 |
|---|---|---|---|---|
| 頁面標題（每頁一個） | `--font-size-2xl` | 24px | 20px | 700 |
| 區塊標題 / 卡片標題 | `--font-size-lg` | 18px | 16px | 600 |
| 正文 / 表格內容 | `--font-size-base` | 16px | 15px | 400 |
| 輔助文字 / meta | `--font-size-sm` | 14px | 13px | 400 |
| 徽章 / 標籤 / 表頭 | `--font-size-xs` | 12px | 12px | 600 |

- 時間戳、座標、編號、計數一律等寬數字：`font-variant-numeric: tabular-nums`。
- 中文按鈕文案 2–4 字；空間不足用縮寫，不縮字級。

### 2.3 格線與密度

- 桌機主工作區：12 欄隱式格線（CSS grid `repeat(12, 1fr)`，gap `--space-4`）。
  卡片以 span 3/4/6/12 佈局，不用任意百分比。
- 密度兩檔，由 shell 依角色設定 `data-density`：
  - `simple`（L0–L1）：行高寬鬆（列表 row ≥ 56px）、大觸控目標、每屏資訊少。
  - `dense`（L2+）：表格 row 40–44px、可多窗格。
- **不論密度，可點擊目標最小 44×44px**（行動端硬性；桌機按鈕高度可 36px 但點擊熱區補足 44px）。

### 2.4 圓角與陰影

- 圓角三檔：`--radius-sm`(8) 小元件、`--radius-md`(12) 卡片/面板、`--radius-lg`(16) modal/sheet。避免過度圓潤。
- 陰影只用 `--shadow-sm/md/lg`；災時模式下陰影自動加深（token 層處理），頁面不用管。

---

## 3. 狀態色語意表（嚴格，不可挪用）

| 語意 | token | Light | 災級對應 | 允許用途 | 禁止用途 |
|---|---|---|---|---|---|
| **危急**（生命/安全） | `--color-danger` | `#EF4444` | Emergency(3) | SOS、危急事件、禁入區、刪除等不可逆操作 | 品牌強調、促銷、一般錯誤提示以外的裝飾 |
| **大規模危機** | `--color-critical` | `#7C3AED` | Critical(4) | 僅 EmergencyStatusBar 與事件等級徽章 | 其他一切 |
| **警戒**（需注意） | `--color-warning` | `#F59E0B` | Warning(2)/Advisory(1) | 警報、待處理、庫存不足、離線狀態 | 裝飾、高亮 |
| **安全 / 成功** | `--color-success` / `--color-safe` | `#22C55E` / `#059669` | Normal(0) | 安全狀態、完成、在線 | 品牌綠、按鈕主色 |
| **中性資訊** | `--color-info` | `#3B82F6` | — | 提示、連結、進行中 | — |

硬性規則：

1. 狀態色必須**同時**搭配圖示或文字（色盲防呆），不得只靠顏色傳達狀態。
2. 危急（紅）在任一畫面上同時出現的元件數應最小化——紅色一多就失去警示力。
3. 狀態徽章一律用 `design-system` 的 `Badge`，variant 對照：
   `success`＝安全、`warning`＝警戒、`danger`＝危急（＋dot＋pulse 表進行中）、`default`＝中性。
4. 對比：狀態色作為文字時必須用 `-dark` 變體或加底色（`--color-*-bg`）以達 AA（4.5:1）。

---

## 4. 元件層級（何時用什麼）

由小到大四層，**只能向下組合，不得跨層自刻**：

| 層級 | 來源 | 用途 | 判準 |
|---|---|---|---|
| **原子元件** | `design-system/`（Button, Badge, Tag, InputField, Alert, Toast, Modal, Indicators） | 一切互動原子 | 頁面不得自刻 button/badge/input |
| **Card** | `design-system/Card` | 一則獨立資訊單元（一個事件、一位人員、一項物資） | 內容可獨立理解、可點擊進詳情 → Card |
| **Panel** | 版型層（頁面內的 `section.panel`，樣式由 shell/archetype CSS 提供） | 一組相關內容的容器：篩選列、表格區、地圖側欄 | 內容彼此相依、不可獨立存在 → Panel |
| **Widget** | `components/layout/Widget*`（儀表板專用） | 只有 dashboard 類頁面（command-center 等）可用；可拖拉/隱藏 | 不是儀表板就不要用 Widget |

其他規則：

- Modal 只用於「必須中斷目前工作」的決策（不可逆確認、必填輸入）；其餘用 inline panel 或行動端 bottom sheet。
- 空狀態一律用 `components/shared/EmptyState`（含「頁面建置中」placeholder）。
- 不可逆操作：二次確認（`ConfirmModal` 模式）＋事後 Toast；重要操作需落審計（時間戳＋操作者＋對象）。

---

## 5. 角色分層殼（L0–L5）

權限值一律查 `page-policy.ts`（`pagePolicy.getRequiredLevelByPath`）。Shell 只認三個檔位：

| 檔位 | 角色 | 殼行為 |
|---|---|---|
| **訪客**（L0） | 公眾 | 只見公開項（地圖/警報/氣象/手冊/通報入口）；無管理群組；`data-density="simple"` |
| **任務導向極簡殼**（L1 志工） | 志工 | 側欄為**扁平清單**（無群組樹）：通報、任務、地圖、警報、排班、訓練、通知、社區、手冊；`data-density="simple"` |
| **管理密度殼**（L2+ 幹部以上） | 幹部/理事/管理 | 完整 8 群組樹（項目依 policy 過濾）；`data-density="dense"`；L5 另有側欄編輯/Widget 編輯 |

實作：`navigation.ts` 每個項目可標 `volunteerCore: true`（進 L1 扁平清單）與 `emergencyCore: true`（進災時清單）。
可見性判定唯一公式：`userLevel >= pagePolicy.getRequiredLevelByPath(item.path)`。
**任何地方不得再出現第二份 minLevel。**（側欄設定 UI 只能改順序/顯示/名稱，不能改權限。）

---

## 6. 行動端斷點策略

| 斷點 | 範圍 | 行為 |
|---|---|---|
| mobile | ≤ 767px | 隱藏側欄；bottom nav（4 tab + 更多）＋ SOS FAB；drawer 為全功能導覽 |
| tablet | 768–1023px | 側欄收合為 icon rail（可展開 overlay）；主區單欄 |
| desktop | 1024–1439px | 側欄常駐（可收合）；主區 12 欄格線 |
| wide | ≥ 1440px | 同 desktop，內容最大寬 1600px 置中（地圖頁例外：滿版） |

- 行動優先：新頁面先寫 mobile 樣式再往上加。
- 單手原則：行動端主要動作放**下半屏**（bottom nav、FAB、sheet 內的主按鈕靠底）。
- 到達關鍵動作的層級：通報/SOS/任務/地圖在任何頁面 **1 次點擊內**（bottom nav 或 FAB）；
  其餘功能 ≤ 2 層（更多選單 → 項目）。
- bottom sheet 取代桌機 modal；支援手勢下滑關閉；Esc 關閉（外接鍵盤）。

---

## 7. 頁面版型範本（四種 archetype）

R2/R3 重建每一頁時，先判定 archetype，再套對應骨架。判定不了的頁面（純表單、精靈流程）以「詳情頁」為基底。
所有骨架的外層都由 `PageWrapper`（legacy children 模式）提供捲動容器，頁面本身**不要**再做全頁捲動容器。

### 7.1 列表頁（List）— 例：事件、物資、人員、審批

```
┌ page-header ────────────────────────────────┐
│ h1 標題           [主要動作 Button gold/primary] │
│ 統計摘要列（3–4 個 StatIndicator，可省略）         │
├ panel: toolbar ─────────────────────────────┤
│ 搜尋框 | 篩選 chips | 檢視切換(表格/卡片)          │
├ panel: content ─────────────────────────────┤
│ 桌機：表格（固定表頭、排序、row 40–56px、狀態欄用 Badge）│
│ 行動端：Card 直列（每卡=一列，左資訊右狀態，可滑動操作）  │
└ 分頁 / 無限捲動 ────────────────────────────┘
```

- 主要動作永遠在 header 右側（行動端固定於底部或 FAB）。
- 每列必有：識別（名稱/編號）、狀態 Badge、時間（tabular-nums）、單一主操作。
- 空狀態用 `EmptyState`（含引導動作）；載入用 skeleton row（≥3 列）。

### 7.2 詳情頁（Detail）— 例：事件詳情、人員檔案、物資項目

```
┌ page-header ────────────────────────────────┐
│ ← 返回 | h1 名稱 + 狀態 Badge      [操作群 ≤3]  │
├ 2 欄（桌機 8+4 / 行動端直落）───────────────────┤
│ 主欄：分段 Panel（基本資料/內容/歷程 timeline）      │
│ 側欄：狀態卡、關聯資訊卡、快速操作                   │
└─────────────────────────────────────────────┘
```

- 操作 ≤3 個直接顯示，其餘收進「⋯」選單；不可逆操作紅色且需確認。
- 歷程（timeline）必含：時間戳＋操作者＋對象（可審計性）。

### 7.3 看板頁（Board）— 例：任務看板、傷患分類、審批流

```
┌ page-header + toolbar（同列表頁）──────────────┐
├ board-columns（水平捲動容器）───────────────────┤
│ 欄=狀態（待命/進行/受阻/完成…），欄頭含計數 Badge     │
│ 卡片=Card：識別+負責人+優先度+時間；拖拉改狀態(桌機)   │
└─────────────────────────────────────────────┘
```

- 行動端：欄切換用頂部 segmented tabs（不做水平多欄），狀態變更用卡片上的快速按鈕（單手可及）。
- 欄狀態枚舉固定，顏色遵守 §3（「受阻」＝warning、「完成」＝success，欄底色僅淡色 `--color-*-bg`）。

### 7.4 地圖頁（Map）— 例：統一地圖、避難所、搜救

```
┌ 地圖滿版（不受 1600px 限制）───────────────────┐
│ 左上：圖層/搜尋控制（浮動 Panel，可收合）            │
│ 右側(桌機)：詳情側欄 360px（選取物件時滑入）          │
│ 行動端：底部 bottom sheet（半開/全開兩檔）           │
│ 右下：定位/縮放/量測控制，觸控目標 44px              │
└─────────────────────────────────────────────┘
```

- 控制元件不得遮擋地圖中心 60% 區域。
- 底圖低彩度；態勢疊圖半透明填色＋邊框；狀態色遵守 §3（危險區紅、警戒橙、安全綠）。
- 離線：地圖頁必須顯示離線/同步狀態（shell 的 `SyncStatusIndicator` 已提供全域版）。

---

## 8. 深淺色與無障礙（AA）

- 三個主題狀態：light（預設）、dark（`data-theme="dark"`）、tactical（災時模式，蓋過前兩者）。
- 頁面只要使用語義 token 就自動支援三態；**驗收時三態都要目視**。
- 對比：正文 ≥ 4.5:1、大字（≥18px bold 或 24px）≥ 3:1、UI 邊框/圖示 ≥ 3:1。
- 焦點可見：一律 `--focus-ring`；不得 `outline: none` 而無替代。
- 鍵盤：桌機全鍵盤可達；CommandPalette（Cmd/Ctrl+K）為全域快速導覽。
- 動效尊重 `prefers-reduced-motion`；災時模式動效一律最短。
- 狀態不得只用顏色（§3 規則 1）。

---

## 9. R2/R3 每頁執行 checklist（SONNET 用）

1. 判定 archetype（§7），依骨架重排版；殼（header/sidebar/bottom nav）不要動——那是 shell 的事。
2. 硬編色歸零：`git grep -n "#[0-9a-fA-F]\{3,8\}" <page>.css`，全部換語義 token（對照 `DESIGN_SYSTEM_CONSOLIDATION.md` §4B）。
3. 自刻元件換 `design-system/`（§4）；狀態一律 Badge，語意對照 §3。
4. 間距/字階/圓角全部 token 化（§2）；觸控目標 ≥44px。
5. 三態目視（light/dark/tactical—在 header 切換災時模式）＋ 行動端 375px 檢查。
6. 驗證：`npx tsc --noEmit -p tsconfig.app.json`、`npx vitest run`、`npx vite build`；
   commit 前綴 `refactor(ui):`（R3）/ `feat(redesign):`（R2）。
