# R4 a11y 稽核報告（WCAG 2.1 AA）

- **工作項**：R4（FE-7 收尾：視覺回歸基準＋a11y AA 驗證）
- **日期**：2026-08-01
- **工具**：`@axe-core/playwright`（規則集 `wcag2a`/`wcag2aa`/`wcag21aa`）
- **測試檔**：`web-dashboard/e2e/a11y-audit.spec.ts`
- **範圍**：與 `visual-regression.spec.ts` 相同的 13 頁（旗艦五頁＋四種 archetype 各 2 頁代表）× 3 態（light／dark／tactical）＝ **39 個掃描案例**，桌機視窗（1440×900）
- **重產方式**：`npx playwright test a11y-audit.spec.ts`（無後端環境，用 `e2e/fixtures/mock-api.ts` 的 route mock＋DevMode 認證繞過渲染頁面；機制細節見該測試檔頭註解）

## 0. 結論摘要

| 指標 | 首次掃描 | 本次修復後 |
|---|---|---|
| 掃描案例（頁×態） | 39 | 39 |
| 通過 | 13 | **39** |
| 失敗（含 critical/serious 違規） | 26 | **0** |
| 違規規則種類 | 4 | 0 |
| 違規元素實例數（含重複） | 約 170 | **0** |

**critical/serious 違規已全數修復（本報告 §2）**；中低嚴重（moderate/minor）違規在此 13 頁 × 3 態範圍內**最終也是零殘留**——沒有「修了幾個、剩幾個中低」的待辦清單，因為過程中定位到的根因（§3）多半是牽連整個 shell/共用元件的系統性問題，修掉根因後連帶清掉了同來源的中低嚴重項目。§4 列出範圍外、未驗證但同源風險的後續追蹤項。

## 1. 掃描規則與方法

- `AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()`，對每個 (頁, 態) 組合各跑一次。
- gate 判準：`impact` 為 `critical` 或 `serious` 的違規數必須為 0（測試斷言），moderate/minor 記錄但不擋（本次掃描結果两者皆為 0，无需要單獨列出的 moderate/minor 清單）。
- 每個案例的完整 axe 原始結果（含未觸發 gate 的規則）以 `testInfo.attach()` 附加於 Playwright 報告，供之後重新產生本報告用。
- 時間凍結（`page.clock.install`）＋固定 mock fixture，確保掃描結果可重現（不受即時時鐘/隨機資料影響）。

## 2. 發現與修復（頁 × 規則 × 嚴重度 × 元素）

### 2.1 `aria-progressbar-name`（serious）— ARIA progressbar 缺 accessible name

| 頁面（態） | 元素 | 修復 |
|---|---|---|
| command-center, core-dashboard（light/dark/tactical，共 6 案例／9 元素） | `.lk-progress__bar[role="progressbar"]`（`design-system/components/Indicators/Indicators.tsx`） | 加 `aria-label={label ?? \`進度 ${percentage}%\`}` |
| （同源，掃描未覆蓋但一併修） | `.shelter-occupancy__fill[role="progressbar"]`（`pages/rescue/SheltersPage.tsx`） | 加 `aria-label` |

### 2.2 `aria-required-children`（**critical**）— `role="list"` 容器缺 `listitem` 子節點

| 頁面（態） | 元素 | 修復 |
|---|---|---|
| workforce-people（light/dark/tactical） | `.volunteers-stats[role="list"]`（`pages/VolunteersPage.tsx`，內容是 `StatIndicator` 摘要卡，不是清單項目） | 改 `role="group"` + `aria-label="志工統計摘要"` |

### 2.3 `nested-interactive`（serious）— 可聚焦元素巢狀在另一個互動元素內

| 頁面（態） | 元素 | 修復 |
|---|---|---|
| triage-board（light/dark/tactical） | `article.victim-card[role="button"][tabindex="0"]` 內含真正的 `<Button>`（`pages/TriagePage.tsx`） | 移除外層卡片的 `role="button"`/`tabIndex`/`onKeyDown`；改在 header 加一個明確的「查看傷患詳情」`<button>` 承載鍵盤可達性，卡片 `onClick` 保留給滑鼠使用者 |

### 2.4 `color-contrast`（serious）— 對比不足 4.5:1（最大宗，約 32 條規則/主題組合、170 個元素實例）

逐一列出所有具體 (fg, bg, ratio) 組合過於冗長；下表按**根因**分組（同一根因常同時解釋多個頁面/元素的違規）：

| 根因 | 影響範圍 | 修復 |
|---|---|---|
| **`src/index.css` 有一條舊版「戰術主題」全域覆寫**：`html.dark p, html.dark span, html.dark label { color: var(--text-secondary); }`（2 個 compound selector，優先權高於多數元件的單一 class 規則）。這是 R1/R2/R3 建立 `[data-theme]` token 系統前的殘留，會在 dark 主題把「幾乎所有」span/p/label 文字強制蓋成同一個灰色，蓋掉元件本來選對的顏色。 | dark 主題下全站絕大多數文字元素（Badge 文字、sync indicator、header level-badge 等），是本次最大宗違規的直接觸發點 | **移除**該條規則；元件改回吃自己的語義 token |
| **`src/App.css` 有一份無主題區分的舊版「Senteng」`:root` 區塊**，內含 `--accent-primary: #334155`（深板岩色，本意是深色底的 active 背景，不是可讀文字色）。這蓋過了 `tokens.css` 刻意讓 `--accent-primary` 在預設主題留白、退回 `--color-secondary` 的設計（tokens.css 有明確註解說明這個設計），導致所有 `var(--accent-primary, var(--color-secondary))` 寫法在任何主題下都拿到同一個不會變的深色，在 dark 主題文字幾乎看不見（量到 1.72:1）。 | `.volunteers-tabs .tab-btn.active`（志工列表分頁，dark） | 局部加 `[data-theme="dark"]` 覆寫用 `--color-secondary-light`；**`--accent-primary: #334155` 本身未動**（30+ 處消費者，全面改動超出本次範圍，見 §4 待辦） |
| **Badge／SyncStatusIndicator／header level-badge 用半透明 `rgba(color, 0.1~0.15)` 疊在頁面背景上**，實際渲染色隨底下頁面背景而變，四種主題量到最低 1.77:1。 | `design-system/Badge`（success/warning/danger/info/default 五種 variant）、`SyncStatusIndicator`、`AppShellLayout` 的 `.header__level-badge` | 全部改為**不透明**淺色底＋深色字的固定配色（如 success `#DCFCE7`/`#166534`），對比與底下頁面背景無關，四主題共用同一組值可保證 ≥6:1 |
| **`--text-muted` / `--text-tertiary` 在多數主題的常見底色上本身就量不到 4.5:1**（light 主題 `--text-muted #9CA3AF` on 白底僅 2.53:1；`--text-tertiary #71717A` on `--bg-primary` 僅 4.39:1，剛好卡在門檻下） | 十餘處：`.empty-state`、`.page-subtitle`（含 ResourcesPage 自己的更具體覆寫）、`.lk-stat__label`、`.er-stat dt`、`.cc-updated`、`.wizard-progress__label`、`.victim-card__time`、`.volunteer-card__region`/`.volunteer-card__stats` | 逐一改用 `--text-secondary`（同語意層級但對比足夠：light 主題 7:1+、dark 主題 5.7:1+） |
| **`--text-link` / `--color-secondary`（品牌橘 `#F97316`）直接當文字色**，在白底僅 2.55–2.8:1 | `.sit-panel__link`／`.dash-header__link`（CommandCenter/CoreDashboard 的「查看全部 →」連結）、`.map-layer-panel__preset`／`.map-layer-panel__basemap.active`（地圖圖層面板） | `--text-link` token 值改深（`#F97316`→`#C2410C`，同色相過 AA）；地圖面板按鈕文字固定用 `#C2410C`（light）／`--color-secondary-light`（dark，加 `[data-theme="dark"]` 覆寫） |
| **Active tab／分類篩選按鈕用品牌橘當底色＋白字**，白字在該橘色上僅 2.68:1 | `.resources-tabs .tab-btn.active`、`.resources-categories .category-btn.active`（物資頁分頁/分類篩選） | 底色改用較深的 `#C2410C`；文字固定白色（**不用** `--text-inverse`，因為它在 dark/tactical 主題會變深色，配固定深橘底仍不夠深，量到 3.2–3.4:1） |
| **`.lk-tag--default`（design-system Tag）用半透明底＋`--text-secondary`**，dark 主題 9px 粗體文字（不符 WCAG 大字門檻）只有 4.03:1 | `VolunteerDetailPage`／`ManualDetailPage`／`TasksPage` 的技能/標籤 chip；另有 `App.css` 全域 `.skill-tag`（同樣模式，志工列表用） | 改用 `--text-primary`（dark 主題對比 8.4:1+） |
| **`TriagePage.css` 的 `.victim-card__transport--*` 直接把 3:1 門檻的語義色（`--color-info`/`--color-success`）當 12px 文字色** | 檢傷看板卡片內「運送中/已到院」狀態文字 | 依主題分別覆寫成過 AA 的深/淺變體（light `#1D4ED8`/`#15803D`；dark `#7DD3FC`/`#86EFAC`） |
| **`ManualDetailPage` 手冊分類文字直接套用分類自訂色**（10 種分類色多數在頁面底色上 <3:1，如地震 `#5BA3C0` 僅 2.57:1） | 手冊詳情頁 breadcrumb 分類標籤 | 移除文字上的分類色，改用一般可讀文字色；分類識別保留給 emoji 圖示與下方步驟編號圓圈背景 |

## 3. 修改檔案清單

```
web-dashboard/src/index.css                                                          （移除舊版 html.dark 全域文字覆寫）
web-dashboard/src/App.css                                                            （.empty-state / .skill-tag / .volunteer-card__region / .volunteer-card__stats）
web-dashboard/src/styles/tokens.css                                                  （--text-link 改深）
web-dashboard/src/styles/map-page.css                                                （.map-layer-panel__preset / .map-layer-panel__basemap.active）
web-dashboard/src/styles/manuals-page.css                                            （.page-subtitle，全站共用）
web-dashboard/src/components/layout/AppShellLayout.css                               （.header__level-badge）
web-dashboard/src/components/Breadcrumb/Breadcrumb.module.css                        （原本硬編 rgba(255,255,255,*)，light 主題下幾乎看不見）
web-dashboard/src/components/SyncStatusIndicator/SyncStatusIndicator.module.css      （.indicator 三態 + .badge）
web-dashboard/src/design-system/components/Indicators/Indicators.tsx                 （progressbar aria-label）
web-dashboard/src/design-system/components/Indicators/Indicators.css                 （.lk-stat__label）
web-dashboard/src/design-system/components/Badge/Badge.css                           （success/warning/danger/info/default 五種 variant）
web-dashboard/src/design-system/components/Tag/Tag.css                               （.lk-tag--default）
web-dashboard/src/pages/rescue/SheltersPage.tsx                                      （progressbar aria-label）
web-dashboard/src/pages/VolunteersPage.tsx                                           （role="list"→"group"）
web-dashboard/src/pages/VolunteersPage.css                                           （dark 主題 active tab 覆寫）
web-dashboard/src/pages/ReportPage.css                                               （.wizard-progress__label；另修 2 處 #fff 硬編色，屬 R4 工作項 3 靜態守護範圍）
web-dashboard/src/pages/ResourcesPage.css                                            （.page-subtitle / active tab / active category）
web-dashboard/src/pages/CommandCenterPage.css                                        （.cc-updated）
web-dashboard/src/pages/EmergencyResponsePage.css                                    （.er-stat dt）
web-dashboard/src/pages/TriagePage.tsx                                               （victim-card 移除 nested role="button"）
web-dashboard/src/pages/TriagePage.css                                               （.victim-card__identifier--btn 新樣式／.victim-card__time／.victim-card__transport--*）
web-dashboard/src/pages/ManualDetailPage.tsx                                         （移除分類色文字）
web-dashboard/src/pages/account/components/{PreferencesPanel,ProfilePanel,SecurityPanel}/*.module.css
                                                                                       （硬編 hex 修正，屬工作項 3 靜態守護範圍，非本次 axe 掃描發現）
```

## 4. 範圍外、未驗證但同源的追蹤項（不在本次 gate 內，供後續參考）

以下是修復過程中定位到、但**未逐一驗證**的系統性問題根因（因為超出本次 13 頁 × 3 態的掃描範圍，全面修復需要更廣的視覺回歸驗證）：

1. **`App.css` 的 `--accent-primary: #334155`**（無主題區分的固定值）在全站 **30+ 處**以 `var(--accent-primary, var(--color-secondary))` 或裸 `var(--accent-primary)` 使用（Button、Card、InputField、Navbar、Toast、Modal、NotificationsPage、VolunteerProfileSetupPage、PermissionsPage、AuditLogPage 等）。本次只針對掃描到違規的 `.volunteers-tabs .tab-btn.active` 做局部覆寫；其餘消費點是否也有 dark 主題對比問題**未逐一驗證**，建議另開工作項全面盤點並讓 `--accent-primary` 恢復 tokens.css 原本「刻意留白、退回 `--color-secondary`」的設計（或給它一個真正主題感知的定義）。
2. **`html.dark .badge { color: var(--text-secondary) !important; }`**（`index.css`，與本次移除的 `html.dark p/span/label` 同一區塊）尚未移除——目前判斷它只匹配字面 class `"badge"`（design-system 用的是 `lk-badge`，CSS Modules 產生雜湊 class），不影響本次範圍，但同屬「舊戰術主題全域覆寫」遺跡，建議與 `--accent-primary` 一併列入後續清理。
3. 本次 13 頁樣本未覆蓋的其餘 ~64 個可達路由（見 `docs/audit/ROUTE_IA_RECONCILIATION.md`）尚未跑過 a11y 掃描；上述兩個根因（`--accent-primary` 全域值、Badge/Tag 半透明底）理論上會影響任何用到這些共用元件的頁面，建議把 `a11y-audit.spec.ts` 的 `PAGES` 清單擴充到全站作為下一步。

## 5. 重新驗證

```bash
cd web-dashboard
npx playwright test a11y-audit.spec.ts
# 39 passed（0 critical/serious 違規）
```
