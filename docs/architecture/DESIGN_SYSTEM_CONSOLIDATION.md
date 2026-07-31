# Design System 收斂方案（Design Token × 元件庫）

> 工作項：`FULL_SYSTEM_REDESIGN_PLAN.md` 2.3 / FE-2
> 狀態：**方案確定 + 首步落地已完成**（本文件同時是後續 2.5 / 3.1「每頁換皮」的工序依據）
> 範圍：`web-dashboard/`

---

## 0. TL;DR

| 決策 | 結果 |
|---|---|
| Token 單一來源 | **新建 `src/styles/tokens.css`**，四套 token 檔全數併入；舊檔降級為 deprecated stub |
| Token 衝突優先序 | `design-tokens.css (A)` > `tokens/index.css + globals.css (B)` > `variables.css (D)`；`theme.css (C)` 維持 dark 覆寫層 |
| 元件庫單一來源 | **`src/design-system/`**（11 元件 / 32 檔使用）；`src/components/ui/` 標記 deprecated |
| 刪除孤兒 css | `styles/dynamic-colors.css`、`styles/CommandCenter.css`（全 repo 零引用） |
| 驗證 | entry 頁 token 解析 **3 項變動且皆無實際消費者**；48/53 CSS bundle 位元組相同；tsc / vitest 45/45 / vite build 全綠 |

---

## 1. 盤點：四套 Token 的實測對照

### 1.1 檔案與載入路徑

| 代號 | 檔案 | 行數 | 載入方式 | 是否全域 |
|---|---|---|---|---|
| **A** | `src/styles/design-tokens.css` | 356 | `index.css:12` `@import` | ✅ entry bundle |
| **B** | `src/styles/tokens/index.css`（+ `globals.css` `:root`） | 256 + 323 | `globals.css:13` ← `index.css:11` | ✅ entry bundle |
| **C** | `src/styles/theme.css` | 252 | `main.tsx:7` | ✅ entry bundle |
| **D** | `src/design-system/variables.css` | 319 | `design-system/index.ts:5` | ❌ **lazy chunk** |
| （E） | `src/App.css` `:root` | 45 個變數 | `App.tsx` | ✅ entry bundle，**最先載入** |

> ⚠ 盤點時新發現第 5 套：`App.css` 的 `:root` 區塊（Senteng slate/emerald 主題），
> 它刻意把品牌名重新映射（`--color-brown-900: #1e293b`、`--color-gold-500: #10b981`、
> `--accent-primary: #334155`），是全站 chrome 實際採用的 accent 來源（App.css 內 29 條規則引用）。

### 1.2 規模與使用量（機器統計，`var()` 引用計數）

| 代號 | 定義變數數 | 被引用次數 | 專屬引用（無人重複定義） | 消費檔案數 |
|---|---:|---:|---:|---:|
| A `design-tokens.css` | 92 | 697 | 90 | 117 |
| B `tokens/ + globals` | 140 | 869 | 90 | 122 |
| C `theme.css` | 37 | 439 | **11** | 112 |
| D `variables.css` | 206 | 915 | **212** | 120 |

四套變數名的**交集有 94 個**，其中 `--text-secondary`(84 refs)、`--text-primary`(80)、
`--bg-secondary`(38)、`--bg-primary`(23)、`--border-light`、`--shadow-sm/md/lg` 為四套同時定義。

### 1.3 命名/覆蓋範圍對照

| 語義群 | A | B | C | D |
|---|---|---|---|---|
| 品牌色階（原始） | — | `--color-brand-*` | — | ✅ `--color-{brown,beige,gold}-*` |
| 語義色 | ✅ `--color-{success,warning,danger,info}[-light/-dark]` | `--color-{safe,critical}[-bg]` | `--*-color` / `--*-light` | ✅（暖色版，與 A 衝突） |
| 背景/表面 | ✅ `--bg-*` `--surface-{default,raised,hover,active}` | `--surface-{ground,card,pressed}` | `--bg-*`(dark) | `--bg-*`（映射到 brown 色階） |
| 文字 | ✅ `--text-{primary,secondary,tertiary,inverse,link}` | `--text-{heading,body,muted,disabled}` | `--text-*`(dark) | `--text-*`（映射到 beige） |
| 排版尺標 | `--text-xs…4xl` `--font-{normal…bold}` `--leading-*` | ✅ `--font-size-*` `--font-weight-*` `--line-height-*` `--letter-spacing-*` | — | `--font-size-*`（小一級，與 B 衝突） |
| 間距 | `--space-1…16` | ✅ `--space-0…20` | — | ✅ `--spacing-0…24`（獨立命名） |
| 圓角 | `--radius-xs…full` | `--radius-*`(+`2xl`) | — | `--radius-*`(+`3xl`) |
| 陰影 | ✅ 中性黑 | 中性黑（雙層） | dark 版 | 棕色調 `rgba(61,46,36,…)` |
| 動效 | `--transition-*` | `--transition-*` `--focus-ring` | — | ✅ `--ease-*` `--duration-*` |
| 玻璃態/漸層 | — | — | `--glass-*`(dark) | ✅ `--glass-*` `--gradient-*` |
| 元件 token | — | — | — | ✅ `--btn-*` `--card-*` `--badge-*` `--input-*` `--modal-*` `--toast-*` `--widget-*` `--tag-*` `--navbar-*` |
| 版面尺寸 | — | ✅ `--sidebar-width` `--header-height` | — | `--sidebar-width*` `--navbar-height` |
| Z-index | ✅ | ✅ （與 A 同值） | — | 另一套（`--z-modal:400` vs A/B `500`） |

### 1.4 實測：合併前的實際串接順序（由 `dist/assets/index-*.css` 位移反推）

```
 54385  App.css              :root                                   (E)
118740  theme.css            :root[data-theme='dark'], .dark         (C)  specificity 0,2,0
123806  a11y.css             @media(prefers-contrast:more) :root
129803  tokens/index.css     :root                                   (B)
161922  globals.css          :root                                   (B)
166203  design-tokens.css    :root,[data-theme=light],[…bright-steel] (A)  ← :root 最終勝出
168504  design-tokens.css    [data-theme=dark],[…copper-steel]        (A)
171884  index.css            html.dark                                    specificity 0,1,1
────────  以下不在 entry bundle，於 lazy chunk 載入 ────────
Indicators-*.css  variables.css  [data-theme="A"], :root              (D)  ← 事故點
```

### 1.5 ★ 盤點發現的實際缺陷（決策的關鍵證據）

**缺陷 1 — 「進入任一 design-system 頁面後全站變深棕色且不會復原」**

`variables.css` 的選擇器寫成 `[data-theme="A"], :root { --bg-primary: var(--color-brown-900); … }`，
而該檔透過 `design-system/index.ts` 被打包進 **lazy chunk `Indicators-*.css`**（未出現在 `index.html`）。
使用者一旦導覽到 32 個使用 design-system 的頁面之一，該 chunk 注入，
`:root` 的 `--bg-primary` 由 `#F4F4F5` 變成 `#3D2E24`、`--text-primary` 由 `#18181B` 變成米色，
**且離開該頁也不會還原**（CSS 已注入）。實測 diff 顯示受影響變數 40 個。

**缺陷 2 — 兩套元件庫產生相同 class 名但樣式來源不同**

`components/ui/Badge` 與 `design-system/Badge` 都輸出 `.lk-badge` / `.lk-badge--{variant}` / `.lk-badge__dot`，
但樣式分別來自 `styles/tokens/components.css`（entry）與 `design-system/components/Badge/Badge.css`（lazy chunk），
variant 字彙也不同（`safe|critical|neutral|accent` vs `default|success|outline|gradient|subtle`）。
結果 DashboardPage 的 `<Badge variant="safe">` 是「base 樣式取自 design-system、variant 樣式取自 components.css」的混血。
`.lk-btn` / `.lk-card` / `.lk-alert` 有同樣問題。

**缺陷 3 — 排版尺標非決定性**

`--font-size-base` 在 B 為 `16px`、在 D 為 `14px`。進入 design-system 頁面前後，
**全站**（含 `App.css`、`AppShellLayout.css`、`MobileBottomNav.css`）的字級會整體縮一級。

---

## 2. 決策

### 2.1 Token 主幹：以 A `design-tokens.css` 為語義主幹，合併 B/C/D，落成單一檔

**選 A 當主幹的理由（以證據為準，而非偏好）：**

1. **A 是合併前 `:root` 的實際勝出者**。entry bundle 中 A 排在所有 `:root` 之後，
   所有 94 個衝突變數目前都取 A 的值。以 A 為主幹 = **對 Login 及全部非 design-system 頁面零視覺變動**，
   這是「控制風險」的唯一可證明選項。
2. **A 是唯一自帶完整 light/dark 成對定義**（K1 亮鋼 `[data-theme=light]` / K2 銅鋼 `[data-theme=dark]`）
   且語義命名一致（`--bg-*` / `--surface-*` / `--text-*` / `--border-*` / `--color-*`）。
3. B/C/D **不能單純丟棄**：三者各有專屬消費者（B 90、C 11、D 212 次專屬引用），
   直接刪除會讓數百個 `var()` 失效。因此採「合併保留 + 決定性排序」而非「擇一刪三」。

**各套的歸宿：**

| 來源 | 處置 |
|---|---|
| **A** | 語義主幹。`:root` / `[data-theme=dark]` 全數移入 `tokens.css` Layer 3 / 4c（優先序最高） |
| **B** | 排版尺標（`--font-size-*` / `--font-weight-*` / `--line-height-*`）、`--surface-*`、版面尺寸、`--v2-*` 舊別名 → Layer 2b / 2c |
| **C** | dark 別名覆寫層原樣保留 → Layer 4a（**選擇器字串與相對順序逐字保留**，見 2.3） |
| **D** | 品牌色階、動效 `--ease-*/--duration-*`、玻璃態、漸層、`--spacing-*`、元件 token → Layer 1 / 2a / 6；`[data-theme=A/B]` 降為 opt-in → Layer 5 |

### 2.2 為什麼排版尺標取 B（16px）而不是 D（14px）

`--font-size-*` 只有 B 與 D 定義，兩者差一級。取 B 的理由：
(a) 這是首屏與所有非 design-system 頁面目前的值；
(b) `16px` base 符合 `a11y.css` 與 WCAG 的預設字級假設，全站縮到 14px 是可用性回退；
(c) 受影響的只有 design-system 元件本身（字級略放大），而非整站文案。

### 2.3 dark 區塊為何不能重排

`theme.css` 的選擇器是 `:root[data-theme='dark'], .dark`，specificity **(0,2,0)**，
高於 `design-tokens.css` 的 `[data-theme="dark"]` **(0,1,0)** 與 `index.css` 的 `html.dark` **(0,1,1)**。
`ThemeProvider` 同時設定 `data-theme="dark"` 與 `class="dark"`，三者皆命中。
因此 dark 的解析結果是 **specificity 與順序共同決定**的，合併時 Layer 4a/4b/4c 的
選擇器字串與相對順序必須逐字沿用 —— 已於 `tokens.css` 內以註解鎖定。

### 2.4 元件庫主幹：`src/design-system/`

| 面向 | `src/design-system/` ✅ 採用 | `src/components/ui/` ❌ 淘汰 |
|---|---|---|
| 元件數 | 11（Button, Card, Badge, Alert, Tag, Navbar, Modal, Toast, InputField, WidgetWrapper, Indicators） | 7（Button, Card, Badge, Skeleton, Input, Alert, Modal） |
| App 端使用檔案 | **32** | **1**（DashboardPage，只用 Badge） |
| CSS | colocated（`Button/Button.css` …） | 部分無 css，仰賴 `styles/tokens/components.css` |
| 額外能力 | Toast / ToastContainer、ProgressBar / CircularProgress / StatIndicator、WidgetWrapper、Tag、Navbar | SafeBadge/DangerBadge 等便捷包裝、CardHeader/Body/Footer 組合、Skeleton、Textarea、ConfirmModal |
| 型別風格 | `React.FC<Props>` | `forwardRef` + 繼承 HTML props（較佳，但無人使用） |

**結論：以使用量與 CSS 完整度壓倒性領先，選 `design-system/`。**
`components/ui/` 的優點（forwardRef、Skeleton、Textarea、ConfirmModal）記入「未竟事項」，
未來吸收進 design-system 而不是保留第二套庫。

> 註：`components/ui/` 目錄下另有 `ThemeSwitcher`（`AppShellLayout` 使用中）、
> `MobileDrawer` / `OfflineIndicator` / `MissionCard` / `TacticalPanel`（目前零引用）。
> 這些不屬於「重疊的兩套基礎元件庫」，**不在本次淘汰範圍**，維持原狀。

---

## 3. 收斂後的檔案結構與命名慣例

```
web-dashboard/src/
├── styles/
│   ├── tokens.css              ★ 單一真相來源（唯一宣告 CSS 自訂屬性的檔案）
│   ├── design-tokens.css       deprecated(tokens)：僅留 .btn-metal/.card-industrial/.tag-* 樣式
│   ├── globals.css             deprecated(tokens)：僅留 @tailwind 與 .bento-* / .v2-btn 樣式
│   ├── theme.css               deprecated(tokens)：僅留 .dark ＊ 樣式與 .theme-toggle
│   ├── tokens/
│   │   ├── index.css           deprecated(tokens)：僅留 webfont @import 與 base reset
│   │   ├── components.css      .lk-* 元件樣式（components/ui 的樣式來源）
│   │   ├── bento-grid.css / motion.css / accessibility.css
│   ├── a11y.css / EmergencyTheme.css / map-page.css / ncdr-page.css / manuals-page.css
│   └── ✂ dynamic-colors.css    已刪除（零引用）
│   └── ✂ CommandCenter.css     已刪除（零引用）
├── design-system/              ★ 單一元件庫
│   ├── variables.css           deprecated：re-export stub → @import '../styles/tokens.css'
│   ├── lightkeepers_vi.tokens.json
│   └── components/{Alert,Badge,Button,Card,Indicators,InputField,Modal,Navbar,Tag,Toast,WidgetWrapper}/
└── components/ui/              deprecated 元件庫（barrel 已標註遷移對照表）
```

### 命名慣例（新增 token 一律依此分層）

| Layer | 前綴 | 用途 | 可否被元件直接引用 |
|---|---|---|---|
| L1 Primitive | `--color-{brown,beige,gold}-{50..900}` | 原始色階 | ❌ 只供 L3 引用 |
| L2 Scale | `--space-*` `--spacing-*` `--radius-*` `--shadow-*` `--font-size-*` `--font-weight-*` `--duration-*` `--ease-*` `--z-*` | 無語義尺標 | ✅ |
| L3 Semantic | `--bg-*` `--surface-*` `--text-*` `--border-*` `--color-{success,warning,danger,info,safe,critical}` | 有語義、隨主題切換 | ✅ **優先使用** |
| L4 Component | `--btn-*` `--card-*` `--badge-*` `--input-*` `--modal-*` `--toast-*` `--widget-*` `--tag-*` `--navbar-*` | 元件級 | ✅ 僅該元件 |

**硬性規則**

1. `tokens.css` 是唯一可以出現 `:root { --x: … }` 的檔案。其他 css 檔一律不得宣告自訂屬性。
2. 元件 css 不得出現硬編 hex；一律 `var(--token)`。
3. 不得再從 lazy-loaded 模組注入 `:root` 主題映射（缺陷 1 的根因）。
4. 新頁面只能 `import { … } from '@/design-system'`，不得使用 `components/ui`。

---

## 4. 「每頁換皮」標準工序 checklist（供 2.5 / 3.1 批次執行）

每頁一個 PR / commit，逐條打勾：

**A. 前置**
- [ ] `git grep -n "#[0-9a-fA-F]\{3,8\}" <page>.css` 列出該頁所有硬編色，逐一標註語義用途
- [ ] 確認該頁是否宣告了 `:root` 自訂屬性；有的話標記為必須移除（違反規則 1）

**B. Token 替換**
- [ ] 背景 → `--bg-primary/secondary/tertiary` 或 `--surface-default/raised/hover/active`
- [ ] 文字 → `--text-primary/secondary/tertiary/inverse`
- [ ] 邊框 → `--border-default/light/dark/focus`
- [ ] 狀態色 → `--color-{success,warning,danger,info}[-light|-dark]`；災防等級用 `--color-{safe,critical}`
- [ ] 間距 → `--space-*`（4px 尺標）；圓角 → `--radius-*`；陰影 → `--shadow-*`
- [ ] 字級/字重 → `--font-size-*` / `--font-weight-*`；動效 → `--duration-*` + `--ease-*`
- [ ] 頁面私有 token（`--cc-*` / `--manual-*` / `--cpm-*` / `--account-*`）→ 收斂成 L3/L4 標準名，或明確保留並在檔頭註明理由

**C. 元件替換**
- [ ] `components/ui` → `design-system`（對照表見 `src/components/ui/index.ts` 檔頭）
- [ ] 頁面自刻的 button/card/badge/modal → 改用 design-system 元件
- [ ] variant 對照：`safe→success`、`critical→danger + dot + pulse`、`neutral→default`、`accent→gradient`

**D. 驗證（每頁必做）**
- [ ] `npx tsc --noEmit -p tsconfig.app.json` 無新增錯誤（基準：2 個既有 `@line/liff` 錯誤）
- [ ] `npx vitest run` 維持 45/45
- [ ] `npx vite build` 成功
- [ ] **CSS 產出比對**：建置前後對 `dist/assets/<Page>-*.css` 取 MD5；
      未動該頁 css 時應完全相同，動了則以 token 解析 diff 檢查（工具見 §5）
- [ ] dark mode 目視：切 `data-theme=dark` 確認無不可讀對比

**E. 收尾**
- [ ] 該頁不再引用 `components/ui`
- [ ] 該頁 css 硬編 hex 歸零（或於檔頭列出白名單與理由）
- [ ] commit 前綴 `refactor(ui):`

---

## 5. 首步落地內容與驗證結果

### 5.1 變更清單

| 檔案 | 變更 |
|---|---|
| `src/styles/tokens.css` | **新增**（單一真相來源，345 個變數，7 個 Layer） |
| `src/index.css` | `@import './styles/tokens.css'` 置於最前 |
| `src/styles/design-tokens.css` | 移除全部 `:root`/`[data-theme]`/`@media` 變數區塊；保留樣式規則 + deprecated 標註 |
| `src/styles/tokens/index.css` | 同上（保留 webfont + base reset） |
| `src/styles/globals.css` | 移除 `:root` 變數區塊；保留 tailwind 指令與樣式 |
| `src/styles/theme.css` | 移除 dark 變數區塊；保留 `.dark ＊` 樣式 |
| `src/design-system/variables.css` | 降級為 re-export stub（`@import '../styles/tokens.css'`）+ deprecated 說明 |
| `src/components/ui/index.ts` | deprecated 標註 + 完整遷移對照表 |
| `src/pages/domains/core/DashboardPage.tsx` | Badge 由 `components/ui` 遷至 `design-system`（variant 對應調整） |
| ~~`src/styles/dynamic-colors.css`~~ | **刪除**（267 行） |
| ~~`src/styles/CommandCenter.css`~~ | **刪除**（723 行） |

### 5.2 孤兒 css 刪除證據

```
$ grep -rn "dynamic-colors\|CommandCenter.css" \
    --include=*.ts --include=*.tsx --include=*.css \
    --include=*.html --include=*.json --include=*.md . | grep -v node_modules
（無輸出 — 全 repo 零引用）
```

兩檔皆從未被任何模組 `import`，Vite 只打包被 import 的 CSS，故它們從未進入任何 bundle。

> 另註：`src/styles/senteng-theme.css` 已於更早的變更中移除（`web_src_tree.txt` 仍有殘留記載，屬過時清單）。
> `manual-design-system.css` **不是孤兒**（`ComponentShowcase.tsx` 使用，路由 `/showcase`），故保留。

### 5.3 驗證方法與結果

**方法**：分別建置「合併前（HEAD）」與「合併後」，對 `dist/assets/*.css` 做兩層比對。

1. **Token 解析 diff（specificity-aware）**
   模擬 `<html>`（light）與 `<html data-theme="dark" class="dark">`（dark）兩種根節點狀態，
   依 CSS 串接順序 + specificity 逐條解析自訂屬性，得到「該頁實際生效的 token 值表」，前後對比。
   分別對兩種頁面情境取樣：
   - **entry-only**：只載入 `index.html` 內的 entry CSS（Login 及所有未觸發 design-system 的頁面）
   - **design-system 頁**：entry CSS + `Indicators-*.css`（Resources / Donations / Map / Approval …）

2. **Bundle 位元組比對**：對 53 個產出 CSS 逐檔取 MD5。

**結果**

| 情境 | same | changed | added | removed |
|---|---:|---:|---:|---:|
| entry-only / light | 277 | **3** | 124 | 0 |
| design-system 頁 / light | 364 | 40 | 0 | 3 |
| design-system 頁 / dark | 395 | 28 | 0 | 1 |

*entry-only 的 3 項變動，逐一查證消費者後確認**無視覺影響**：*

| 變數 | 前 → 後 | 消費者 |
|---|---|---|
| `--color-brown-900` | `#1e293b` → `#3D2E24` | 僅被 `tokens.css` 內 opt-in 的 `[data-theme=A/B]` 引用 → **零實際消費者** |
| `--color-brown-800` | `#334155` → `#4A3728` | 同上 → **零實際消費者** |
| `--color-gold-500` | `#10b981` → `#B8976F` | 僅 `index.css:259` `var(--color-gold-500, #B8976F)`（捲軸 thumb hover）→ **收斂為作者原本寫的 fallback 值** |

*design-system 頁的 40 / 28 項變動即「刻意修好的缺陷 1」*：這些頁面不再單方面翻成深棕／米色，
而是收斂到與其餘頁面完全相同的值（`--bg-primary` `var(--color-brown-900)` → `#F4F4F5`、
`--text-primary` → `#18181B`、`--accent-primary` → App.css 的 slate `#334155`、
`--font-size-base` `14px` → `16px`、語義色由暖色版回到標準版）。
3 個 removed（`--bg-active` / `--border-lighter` / `--accent-active`）經 grep 確認**全 repo 零 `var()` 引用**。

**Bundle 比對**：**48 / 53 位元組完全相同**。三個代表頁全部逐位元組相同：

```
LoginPage-C6LEHj1R.css          identical=True   ← 代表頁 1（Login）
ResourcesPage-3lWnwIco.css      identical=True   ← 代表頁 2（design-system 重度使用頁）
ApprovalCenterPage-BPFsji2n.css identical=True   ← 代表頁 3（表單/審核頁）
DonationsPage / EquipmentPage   identical=True
```

不同的 5 個為預期內：4 個 `index-*.css`（entry 與其相依，`186.4 KB → 193.4 KB`，
D 的 token 由 lazy chunk 前移至 entry）與 `Indicators-*.css`（`33.3 KB → 43.1 KB`，
re-export stub 造成 tokens 在該 chunk 複製一份）。

**建置 / 型別 / 測試**

| 檢查 | 結果 |
|---|---|
| `npx vite build` | ✅ 成功 |
| `npx vitest run` | ✅ **45 / 45**（4 test files） |
| `npx tsc --noEmit -p tsconfig.app.json` | ✅ 與 HEAD 完全相同：2 個既有 `@line/liff` TS2307（`@line/liff` 未安裝於 node_modules，屬環境缺口，非本次變更造成；已用 clean cache 於 HEAD 重現） |

> 測試基準說明：工作單提到的 88/88 在本 worktree 無法重現；
> `web-dashboard` 的 `vitest.config.ts` `include: src/**/*.{test,spec}.*` 實際只涵蓋 4 個檔案共 45 個測試，
> 合併前後皆為 45/45。（`e2e/` 為 Playwright、`backend/` 為 Jest，不在此指令範圍。）

### 5.4 單點回滾開關

若需回到「design-system 頁面深棕主題」的舊行為，只需在
`src/styles/tokens.css` Layer 5 的 `[data-theme="A"]` 選擇器加回 `, :root`（單行變更）。

---

## 6. 未竟事項（後續工作項）

| # | 項目 | 建議歸屬 |
|---|---|---|
| 1 | `src/App.css` `:root`（第 5 套 token，45 個變數、Senteng slate/emerald）尚未併入 `tokens.css`。目前靠「載入順序在 tokens.css 之前」讓它繼續提供全站 accent；應正式收編為 L3 semantic。 | 2.5 |
| 2 | 156 個 css 檔仍含硬編 hex；188 個 css 僅 16 個為 `*.module.css`，樣式隔離度低。 | 2.5 / 3.1 |
| 3 | 280 個 `var()` 引用的變數不在四套 token 內（`--cc-*` / `--manual-*` / `--cpm-*` / `--account-*` / `--luxury-*` / `--tactical-*` …），多為頁面私有前綴，需逐頁收斂。 | 3.1 |
| 4 | `design-system` 缺 Skeleton / Textarea / ConfirmModal / forwardRef 支援（`components/ui` 的優點），補齊後才能真正刪除 `components/ui`。 | 新工作項 |
| 5 | `variables.css` re-export stub 使 tokens 在 `Indicators-*.css` 重複一份（+9.8 KB raw / 約 +2 KB gzip）。確認無單獨載入 design-system 的情境後可移除 stub 與 `design-system/index.ts` 的 import。 | 2.5 |
| 6 | 存在兩個 ThemeProvider：`src/context/ThemeProvider.tsx` 與 `src/contexts/ThemeProvider.tsx`（目錄名一單一複數），需釐清何者為準。 | 新工作項 |
| 7 | **Tailwind 完全未生效**。`tailwind.config.ts` 存在但無 `postcss.config.*`，`@tailwind` / `@apply` 原樣輸出到 bundle，且產出的 CSS 中**不存在任何 utility class**（`grep -o "\.flex{[^}]*}" dist/assets/index-*.css` 無結果，`@apply inline-flex …` 以原文留在 `.v2-btn`）。意即 JSX 中大量使用的 `flex items-center gap-3` / `space-y-3` / `text-xl` 等 class 目前全是 no-op（例如 `DashboardPage.tsx` 整頁版面）。**與本次 token 收斂無關，合併前即如此**，但影響面大，建議優先處理。 | 新工作項（高優先） |
| 8 | `web-dashboard/web_src_tree.txt` 為過時的檔案清單快照（仍列出已刪除的 `senteng-theme.css`），建議刪除或改為自動產生。 | 清理 |
| 9 | `src/styles/manuals-page.css:556` 有編碼損毀字元（`content: '鈻?;`），建置時產生 esbuild `Unterminated string token` 警告。**合併前即存在**（HEAD baseline bundle 可重現），非本次造成。同檔另有多處 mojibake 註解。 | 清理 |
