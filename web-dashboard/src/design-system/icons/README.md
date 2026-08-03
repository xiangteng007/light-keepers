# B3c 野戰手冊 icon 集（R5/T5）

Light Keepers 主題化圖文系統的 icon 單一來源。
設計語言：`docs/architecture/DESIGN_LANGUAGE.md` v2（B3c 野戰手冊）。
定位：**軍事教範圖例**，不是通用 UI icon 包——全部並排看必須像同一本教範的圖例頁。

## 圖形文法（鐵律）

由 `IconBase.tsx` 的 `createIcon()` 統一鎖定，個別 icon 檔**只放幾何**：

| 規則 | 值 |
|---|---|
| 畫布 | `viewBox="0 0 24 24"`，幾何落在 2–22 安全框內（筆畫外緣不出 1–23） |
| 筆畫 | `stroke-width: 2`，`stroke-linecap: square`，`stroke-linejoin: miter` |
| 顏色 | `stroke="currentColor" fill="none"`——顏色永遠跟文字走，icon 檔內**禁**任何色值；實心變體才准用 fill（目前 0 個） |
| 幾何 | 只准水平線、垂直線、45°（或明確斜率的直線）與閉合多邊形；**禁** circle / ellipse / arc / 貝茲曲線 / 圓角 rx |
| 密度 | 每個圖形 3–7 筆畫；一眼可辨勝過精緻（唯一例外：drone 俯視四軸，複合物件，以 3 個 path 元素收在 9 筆內） |
| 點 | 「點」一律用 `M x y v.01`——square cap 會自然張成 2×2 方點，不用 circle |

### 形制約定（跨 icon 的一致語彙）

- **告警三形制**（MIL-STD-2525 / EFIS 轉譯）：三角＝warning（一般警告，配琥珀）、
  菱形＝events（事態框）、八角＝sos（停止/求援，紅色憲法唯一 icon 對象）。
  三者內部同用「豎線＋方點」驚嘆號，構成同族。
- **人形**＝方首＋梯形肩：user 是放大單兵，teams 是併肩雙兵（共用中線），同族縮放。
- **方框族**：info、clock、theme 共用 16×16 方框，內容物（i / 直角指針 / 半面剖線）區分語義。
- **弧形直角重譯**：一切弧形概念（鎖弓、指紋同心弧、脈搏波、半填圓）不畫弧，
  以直角折線／45° 剖面線重譯（lock、fingerprint、monitor、theme）。
- **45° 律**：所有斜線優先取 45°（search 柄、close、edit、online 波、offline 斬斷線、
  drone 臂），並排時斜線角度不打架。
- **方點律**：online/offline 訊號點、location 中心點、驚嘆號下點、qr 資料點全部是
  同一種 2×2 方點。

## 命名規則

- 元件：`PascalCase + Icon` 後綴（`MapIcon`、`ChevronLeftIcon`），
  簽名 `React.FC<{ size?: number } & React.SVGProps<SVGSVGElement>>`，`size` 預設 24。
- 註冊表 key：kebab-case **語意名**（`'map'`、`'chevron-left'`、`'triage'`），
  對齊導覽/policy 的語意 id，不用視覺描述名（是 `'sos'` 不是 `'octagon-alert'`）。
- 分組檔：`nav.tsx`（導覽/旗艦頁）、`field.tsx`(野戰/設施)、`status.tsx`(狀態/告警)、
  `action.tsx`(操作/工具)、`chevron.tsx`(方向)、`docs.tsx`(文件/資料)、
  `system.tsx`(系統/安全)、`community.tsx`(社群/照護)。新 icon 依語義入組，出口一律走 `index.ts`。

## 用法

```tsx
import { MapIcon, iconRegistry } from '@/design-system/icons';

<MapIcon />                       // 24px，繼承文字色
<MapIcon size={16} />             // 16px（行內/表格）
<MapIcon style={{ color: 'var(--color-accent)' }} />  // 換色走 token，不碰 icon 檔

const Icon = iconRegistry['chevron-left'];  // 語意名動態取用
```

尺寸階：16（行內/表格）／20（按鈕/輸入框）／24（導覽/預設）／32（TV 牆/空狀態）。
非 24 的倍數縮放會讓 2px 筆畫落在半像素上，**不要**用 18、22 這類尺寸。

## 新增 icon 檢核單

1. 先畫在 2–22 安全框，只用直線；數筆畫（3–7）。
2. 光學重量對照：與同組現有 icon 並排（可臨時渲染 `Object.entries(iconRegistry)`
   全表），筆畫密度不得明顯偏黑或偏疏。
3. 命名過語意檢查：key 是「這是什麼」不是「長什麼樣」。
4. 入組、`index.ts` 具名輸出＋`iconRegistry` 註冊，跑
   `npx tsc --noEmit && npx vitest run`（`src/test/design/icons.test.tsx` 會驗文法）。
