# 地圖符號系統（map-symbols）— R5/T5 主題化圖文系統

> **範圍註記：MapLibreTacticalMap 換裝屬下一波，本批只產符號。**
> 本目錄不接線任何頁面或地圖元件；`MapLibreTacticalMap.tsx` 的
> marker/圖層換裝（addImage、symbol layer、icon-image expression）在後續任務處理。

MIL-STD-2525 簡化民用版符號集，10 枚。設計語言遵循 B3c 野戰手冊
（`docs/architecture/DESIGN_LANGUAGE.md` v2；形狀＋顏色雙編碼＝色盲安全，見 §C）。

## 形狀＝陣營語意（鐵律）

| 外框 | 語意 | 收錄符號 |
|---|---|---|
| 方（unit） | 我方單位 | `team`（方＋人）、`rally`（方旗）、`hq`（方旗面＋旗桿） |
| 圓（facility） | 設施 | `shelter`（圓＋屋）、`aed`（圓＋心電）、`warehouse`（圓＋箱）、`air-raid-shelter`（圓＋盾） |
| 菱（incident） | 事件 | `report-incident`（菱＋驚嘆）、`sos`（菱＋閃電） |
| 三角（hazard） | 危害 | `hazard-aoi`（三角＋45° 斜紋） |

**色由使用端決定** — 符號本體不攜帶任何顏色：

- React 元件走 `stroke="currentColor"`，以 CSS `color` 上色；
- `toDataUri(color)` 由呼叫端傳入實際色值。
- **紅色憲法**：紅只給生命/安全（SOS、BLACK 傷票、禁入區、撤離）。
  `sos` 的紅語意由使用端傳入 `--status-danger` 的解析值，不寫死在符號裡。

## 圖形文法（B3c，地圖符號版）

- viewBox **28×28**（一般 UI icon 為 24×24；地圖符號放大格網以保 20px 縮放可辨）
- `stroke-width: 2`、`stroke-linecap: square`、`stroke-linejoin: miter`
- 預設 stroke ＋ `fill="none"`；只有實心變體（驚嘆點、SOS 閃電）用 fill
- 幾何直角、禁圓潤有機曲線；每枚 3–7 筆畫內完成，一眼可辨勝過精緻

## 使用方式

### React（UI 內嵌：圖例、清單、面板）

```tsx
import { ShelterSymbol, mapSymbolRegistry } from 'src/design-system/icons/map-symbols';

// 直接用元件
<ShelterSymbol size={20} style={{ color: 'var(--status-success, currentColor)' }} />

// 或經 registry 動態取用
const { Component, label } = mapSymbolRegistry['air-raid-shelter'];
<Component size={16} aria-label={label} />
```

### MapLibre（下一波換裝時的接線示意）

`toDataUri(color)` 產出 `data:image/svg+xml;charset=utf-8,...`（encodeURIComponent 實作）。
**data URI 內無法解析 `var(--token)`**，須先以 `getComputedStyle` 解析出實際色值：

```ts
import { mapSymbolRegistry, MAP_SYMBOL_IDS } from 'src/design-system/icons/map-symbols';

const style = getComputedStyle(document.documentElement);
const color = style.getPropertyValue('--text-primary').trim();

for (const id of MAP_SYMBOL_IDS) {
    const img = new Image(28, 28);
    img.onload = () => map.addImage(`lk-symbol-${id}`, img, { pixelRatio: 1 });
    img.src = mapSymbolRegistry[id].toDataUri(color);
}
// symbol layer: { 'icon-image': 'lk-symbol-shelter', 'icon-allow-overlap': true }
```

高 DPI：以 `new Image(56, 56)` 搭配 `pixelRatio: 2` 載入同一 URI 即可（SVG 無損放大）。

## 檔案結構

| 檔案 | 職責 |
|---|---|
| `createMapSymbol.tsx` | 工廠與型別：幾何定義一次、同時產出 React 元件與 toDataUri |
| `symbols.ts` | 10 枚符號的幾何定義＋元件＋toDataUri 匯出 |
| `registry.ts` | `mapSymbolRegistry`（id → label/shape/Component/toDataUri） |
| `index.ts` | 公開出入口 |

新增符號時：在 `symbols.ts` 加 `MapSymbolDefinition`（守住形狀語意與 3–7 筆畫），
在 `registry.ts` 的 `MAP_SYMBOL_IDS` 與 `mapSymbolRegistry` 登記，
`src/test/design/map-symbols.test.tsx` 的文法守護測試會自動涵蓋新符號。
