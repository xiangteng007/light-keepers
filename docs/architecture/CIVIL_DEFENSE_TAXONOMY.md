# 民防災型分類法（Civil Defense Disaster Taxonomy）

> **工作項**: C1.1（主題 CD-1 災型分類與告警擴充，決策 D16 民防韌性）
> **日期**: 2026-08-01
> **狀態**: 已實作（後端 enum／DTO／LLM prompt、前端選單／圖標／篩選；migration 已寫未執行）
> **硬要求**: 既有 8 類災型的**資料與流程不得受影響**——本文件每個決策都以此為第一約束。

---

## 1. 現況盤點（擴充前）

### 1.1 權威來源

災型（disaster type）在本系統只有**一個**權威定義，其餘皆為其鏡像或不相干的同名概念：

| 位置 | 形式 | 值 |
|------|------|----|
| `backend/src/modules/reports/reports.entity.ts` | TS union `ReportType` | `earthquake` `flood` `fire` `typhoon` `landslide` `traffic` `infrastructure` `other` |
| DB `reports.type` | **`varchar(50)`**（非 PostgreSQL enum） | 同上（無 DB 層約束） |

### 1.2 鏡像／衍生點（擴充時必須同步）

| 檔案 | 內容 | 形式 |
|------|------|------|
| `backend/src/modules/reports/dto/report.dto.ts` | `CreateReportDto` / `UpdateReportDto` / `ReportQueryDto` 各一組 `@IsIn([...8 值])` | 硬編陣列 ×3 |
| `backend/src/modules/reports/report-dispatcher.service.ts` | `TYPE_TO_SKILLS: Record<ReportType, string[]>`、中文標籤 map | 窮舉 Record ×2 |
| `backend/src/modules/line-bot/disaster-report/ai-classification.service.ts` | 分類 prompt 的類型清單、`parseAIResponse` 的 `validTypes`、Vision prompt 與 `parseVisionResponse` 的 `validTypes`、關鍵字 fallback patterns | 硬編 ×5 |
| `backend/src/modules/line-bot/disaster-report/disaster-report.constants.ts` | `DISASTER_TYPE_KEYWORDS` + `detectDisasterType()` | 硬編 map |
| `backend/src/scripts/llm-benchmark.ts` | `DEFAULT_CASES` 內建對測資料 | 硬編陣列 |
| `web-dashboard/src/api/services/reports.ts` | 前端 `ReportType` union | 硬編 union |
| `web-dashboard/src/pages/ReportPage.tsx` | `DISASTER_TYPES` 選單 + `TYPE_MAPPING` | 硬編陣列 |
| `web-dashboard/src/pages/ReportsAdminPage.tsx` | `TYPE_CONFIG: Record<ReportType, …>` | 窮舉 Record |
| `web-dashboard/src/pages/EventsPage.tsx` | `TYPE_CONFIG: Record<ReportType, …>` | 窮舉 Record |
| `web-dashboard/src/components/field-reports/AiResultCard.tsx` | `CATEGORY_LABELS` | 硬編 map |

**盤點結論**：八個值被重複硬編在 **12 個位置**，這正是「加一個災型」成本高的原因。本次擴充順手把後端收斂到 `backend/src/modules/reports/disaster-types.ts`、前端收斂到 `web-dashboard/src/constants/disasterTypes.ts` 兩個 SSOT，之後再加災型只需改一處。

### 1.3 同名但**不相干**的枚舉（本次不動，避免誤傷）

| 名稱 | 位置 | 語意 |
|------|------|------|
| `FieldReportType` | `field-reports/entities/field-report.entity.ts` | 現場回報**用途**（incident/resource/medical/traffic/sos/other），非災型 |
| `IntakeReportType` | `intake/entities/intake-report.entity.ts` | 通報**來源種類**（damage/event/alert/citizen/patrol），是真 PG enum，但與災型正交 |
| `alertTypeId` | `ncdr-alerts` | NCDR 官方警報代碼（數字），外部系統定義，不可自行加值 |
| `HazardType` | `tactical-maps/insarag-marking.service.ts` | INSARAG 建築物標記的現場危害，國際標準，不可自行加值 |
| `AlertCategory` | `web-dashboard/src/types/core-objects.types.ts` | 前端 alert 分類（含 tsunami/pandemic/industrial），與 `ReportType` 是兩套；本次未動，列為後續收斂候選 |

---

## 2. 新增災型定義

### 2.1 五個新項目一覽

| 代碼 | 中文 | 形式 | 預設 severity | lucide 圖標 | 顏色 |
|------|------|------|---------------|-------------|------|
| `air_raid` | 空襲／砲擊 | 互斥類別 | `critical` | `Siren` | `#B71C1C` |
| `explosion` | 爆炸／爆裂物 | 互斥類別 | `high` | `Bomb` | `#E64A19` |
| `terror_attack` | 恐怖攻擊 | 互斥類別 | `critical` | `ShieldAlert` | `#880E4F` |
| `cbrn` | 化生放核（CBRN） | 互斥類別 | `critical` | `Biohazard` | `#6A1B9A` |
| `mass_casualty` | 大量傷患（MCI） | **跨災型旗標** | —（不改 severity） | `Users` | `#C2185B` |

### 2.2 逐類定義

#### `air_raid` — 空襲／砲擊

- **觸發情境**：防空警報／飛彈來襲告警（PWS）發布後的民眾通報；聽到／目擊飛彈、砲擊、無人機攻擊、空爆；彈著點災損；防空避難疏散需求。
- **預設 severity**：`critical`（無條件——空襲通報的錯殺成本遠低於漏判）。
- **應變動作提示**：
  1. 立即引導最近防空避難處所（CD-2 資料層）
  2. 確認彈著點與二次危害（火、瓦斯、結構）
  3. 人員清點與失聯回報
  4. 現場勿聚集，警報解除前不得復歸
- **與既有類別界線**：爆炸來源可歸因於**空中攻擊**時為 `air_raid`；地面不明爆炸為 `explosion`。

#### `explosion` — 爆炸／爆裂物

- **觸發情境**：路邊／公共場所不明爆炸；發現疑似爆裂物、可疑包裹、無人認領行李；未爆彈藥；爆炸後的碎片傷害與結構破壞。
- **預設 severity**：`high`。
- **應變動作提示**：
  1. 半徑警戒與人員疏散（不得接近、不得移動可疑物）
  2. **關閉現場無線電／手機發射**（遙控起爆風險），改用有線或指定頻道
  3. 通報警方排爆單位
  4. **搜索二次裝置**（針對第一批到場人員的攻擊模式）
  5. 傷患檢傷、保存現場證物
- **⚠️ 與既有 `fire` 的界線（向後相容關鍵決策）**：
  既有 `fire` 的定義**本來就寫著「火災、爆炸」**，關鍵字 fallback 也把 `爆炸` 掛在 `fire` 下，內建對測資料更有一題「瓦斯氣爆，隔壁整面牆炸開 → `fire`」。若把所有爆炸改判 `explosion`，等於**變更既有類別的語意與既有資料的正確標籤**，違反硬要求。
  因此界線定為：
  - **民生／工業起因的氣爆、火災伴生爆炸 → 維持 `fire`**（瓦斯外洩氣爆、鍋爐爆炸、油氣槽爆燃）
  - **爆裂物、不明來源爆炸、彈藥 → `explosion`**
  這條界線的正當性不只是相容：兩者的**應變流程本來就不同**——氣爆走消防搶救，爆裂物走警戒／排爆／二次裝置搜索。prompt 與關鍵字表都以此為準（`爆炸` 二字**不**加入 `explosion` 的關鍵字，避免奪走 `fire` 的既有命中）。

#### `terror_attack` — 恐怖攻擊

- **觸發情境**：槍擊、持刀無差別攻擊、車輛衝撞人群、挾持人質、多點同時攻擊、攻擊者宣稱訴求。
- **預設 severity**：`critical`。
- **應變動作提示**：
  1. **Run–Hide–Tell**：先避難再通報，勿趨近現場
  2. 現場尚未肅清前，救護人員在**警方指定集結點**待命（不進入熱區）
  3. 回報攻擊者人數／方向／武器／衣著
  4. 傷患多以穿刺／槍創為主 → 優先止血帶與 MARCH 流程
  5. 高機率併發 `mass_casualty`（見 2.3）
- **與 `explosion` 的界線**：判準是**有組織的攻擊意圖**，不是手法。
  - 有明確攻擊行為或意圖線索（持械攻擊人、宣稱、多點同時、鎖定人群）→ `terror_attack`（即使手法是爆裂物）
  - 只有「爆炸了」而無攻擊意圖線索 → `explosion`（**預設落點**，避免在情資不足時就替事件定性）
  這個「預設落 `explosion`」的偏誤是刻意的：把事件標成恐攻有法律與社會後果，應由指揮層在情資明朗後升級，而非由前線通報或 LLM 自行認定。

#### `cbrn` — 化生放核

- **觸發情境**：不明刺鼻／異味氣體導致多人同時不適；不明白色粉末信件／包裹；輻射偵測警報；化學槽車洩漏；生物製劑疑慮；核設施事故。
- **預設 severity**：`critical`。
- **應變動作提示**：
  1. **上風處、上坡處、遠離**（uphill / upwind / upstream）
  2. 未著防護裝備者不得進入；先劃管制區
  3. **除污站優先於後送**（未除污傷患會污染救護車與醫院）
  4. 回報氣味／顏色／來源方向／風向
  5. 高機率併發 `mass_casualty`
- **與既有類別界線**：既有 `infrastructure`（管線損壞）可能同時成立；**只要出現人員症狀或不明物質，一律升級為 `cbrn`**（防護優先於分類精確）。

#### `mass_casualty` — 大量傷患（MCI）

**設計取捨：做成「跨災型旗標」而非互斥類別。**

- **選項 A（互斥類別，未採用）**：把 `mass_casualty` 加進 `ReportType` union。
  - 缺點（致命）：MCI 與災型是**正交**的——地震、空襲、恐攻、遊覽車事故都可能是 MCI。做成互斥類別後，一個 20 人受傷的地震只能二選一，等於**丟失災型或丟失 MCI 訊號**；而這兩個訊號驅動的是不同下游（災型→技能／裝備調度，MCI→檢傷站／後送／醫院容量）。
  - 更糟的是它會污染既有資料的統計口徑：既有以 `type='earthquake'` 為條件的報表，會在 MCI 地震發生時漏算。**直接違反向後相容硬要求。**
- **選項 B（子類別，未採用）**：`earthquake_mci` 之類的複合值。會讓 enum 值數量爆炸（8×2），且所有既有 `type = 'earthquake'` 查詢全部要改寫成 `LIKE 'earthquake%'`。同樣違反硬要求。
- **選項 C（採用）**：`reports.isMassCasualty: boolean` 旗標 + `casualtyEstimate: int | null`。
  - 災型欄位語意不變，既有查詢／報表／派遣邏輯**零影響**（預設 `false`，既有列全部落在原本的行為分支）。
  - MCI 可與任一災型自由組合，也可獨立成立（例：遊覽車事故 `traffic` + MCI）。
  - 為 CD-3（MCI 流程／START 傷票／分流站）預留掛載點：C2 期的 MCI 級聯直接以此旗標為觸發條件，不需再改 enum。
- **觸發情境**：通報中出現「很多人受傷」「一堆人倒在地上」「傷患很多救護車不夠」等**傷患數量超出現場能量**的描述；或明確人數 ≥ 5（協會層級門檻，正式 MCI 定義由 CD-3 訂）。
- **應變動作提示**：
  1. 立即設檢傷站，執行 START／JumpSTART 分類（紅／黃／綠／黑）
  2. 回報概估傷患數與最重傷勢，不要逐一詳述
  3. 請求增援救護車與醫院容量查詢
  4. 建立傷患追蹤編號（掛牌→後送→醫院）

### 2.3 預設 severity 對照（含既有類別，證明未變動）

| 類型 | 擴充前預設 | 擴充後預設 | 變動 |
|------|-----------|-----------|------|
| earthquake / flood / fire / typhoon / landslide / traffic / infrastructure / other | `medium`（來自 entity 欄位 default 與 `reports.service.create` 的 `dto.severity \|\| 'medium'`） | `medium` | **無** |
| air_raid | — | `critical` | 新增 |
| explosion | — | `high` | 新增 |
| terror_attack | — | `critical` | 新增 |
| cbrn | — | `critical` | 新增 |

預設 severity 只在「呼叫端未指定 severity」時套用（`dto.severity || DISASTER_TYPE_META[type].defaultSeverity`）。既有 8 類的預設值刻意維持 `medium`，因此**既有任何路徑的行為與擴充前逐位元相同**。

---

## 3. 向後相容分析

| 面向 | 風險 | 處置 |
|------|------|------|
| DB 欄位型別 | `reports.type` 是 `varchar(50)`，**不是** PG enum | 加值**不需要任何 DDL**；新值長度最長 `terror_attack`（13 字元）遠小於 50 |
| 既有列 | — | 不 UPDATE 任何既有列；新增欄位 `isMassCasualty` 給 `NOT NULL DEFAULT false`、`casualtyEstimate` 可為 NULL |
| DTO 驗證 | `@IsIn` 只**放寬**不收緊 | 既有 8 值仍全部合法 |
| 窮舉 `Record<ReportType, …>` | 加 union 值會讓 TS 編譯失敗（這是**好事**，等於編譯器幫我們找出所有鏡像點） | 後端 2 處、前端 2 處全部補齊；`npx tsc --noEmit` 雙側乾淨 |
| 關鍵字 fallback | 若把新關鍵字插在既有 pattern 之前，可能奪走既有命中 | 見 §4 二階段策略 |
| LLM 分類 | 類別變多可能拉低既有類別準確率 | benchmark 既有 20 題全數保留為回歸基準，與新增 12 題一起跑（見 §5） |
| 前端既有頁 | 顏色／圖標／標籤若改動即為視覺回歸 | 既有 8 類的 label／emoji／色碼**逐字沿用**原值搬進 SSOT |
| 地圖 marker | 既有回報 marker 依 severity 上色 | 既有 8 類維持 severity 上色（輸出與 `createMarkerIcon` 完全相同）；只有民防類改用災型色，見 §6 |

---

## 4. 關鍵字 fallback 的二階段策略

LLM 不可用時（`LLM_PROVIDER` 全滅）才會走關鍵字。既有 patterns 陣列是**依序**比對、先中先贏，因此新增位置決定行為：

- **階段 1（新增）**：民防**強訊號**關鍵字，優先比對。
  這組詞彙與既有 8 類的關鍵字表**完全無交集**（刻意避開 `爆炸`、`倒塌`、`火` 等既有詞），因此任何「只含既有關鍵字」的文本，比對結果與擴充前完全相同。
  只有同時含強訊號與既有關鍵字的文本會改判（例：「空襲警報，遠處有爆炸聲」擴充前判 `fire`，現在判 `air_raid`）——這正是本次要修正的錯判。
- **階段 2（原封不動）**：既有 7 組 patterns，順序、關鍵字、信心值皆未更動。

強訊號詞彙（節錄，完整清單見 `backend/src/modules/reports/disaster-types.ts`）：

| 類型 | 關鍵字 |
|------|--------|
| `air_raid` | 空襲、防空警報、飛彈、砲擊、砲彈、轟炸、空襲警報、無人機攻擊 |
| `explosion` | 爆裂物、可疑包裹、不明爆炸、炸彈、未爆彈、土製炸彈、可疑物品 |
| `terror_attack` | 恐攻、恐怖攻擊、槍擊、開槍、持刀、砍人、挾持、人質、無差別攻擊、衝撞人群 |
| `cbrn` | 化學攻擊、毒氣、神經毒、輻射、核災、生化、白色粉末、不明粉末、刺鼻氣體 |
| MCI 旗標 | 大量傷患、很多人受傷、傷患很多、一堆人倒、集體中毒、多人不適 |

MCI 旗標與災型**分開比對**：先判災型，再獨立掃 MCI 詞彙，兩者可同時成立。

---

## 5. LLM 分類器擴充與對測

- **prompt**：類別清單由 `disaster-types.ts` 產生（不再硬編），每類附一行判準；`explosion` vs `fire`、`terror_attack` vs `explosion` 兩條界線在 prompt 中以**正反例**明寫（含「瓦斯氣爆→fire」這條反直覺規則）。回傳格式新增 `massCasualty: boolean`（舊欄位不變，parser 對缺欄位容錯 → `false`）。
- **對測**：`llm-benchmark.ts` 的 `DEFAULT_CASES` 既有 20 題**一題未改**（回歸基準），新增 12 題民防口語通報。`BenchmarkCase` 新增選填 `expectedMassCasualty`，MCI 旗標準確率單獨統計，不混入災型準確率。
- **驗收門檻**：民防新類別（`air_raid`/`explosion`/`terror_attack`/`cbrn`）準確率 ≥ 90%，且既有 8 類準確率不得低於擴充前基準。
- **實測結果**：見 §8。

---

## 6. 前端擴充

- SSOT：`web-dashboard/src/constants/disasterTypes.ts`（label／emoji／lucide 圖標／色碼／描述／`civilDefense` 旗標）。既有 8 類的 label／emoji／色碼逐字沿用 `EventsPage` 與 `ReportsAdminPage` 的原值。
  **已知的小幅文案統一**：`ReportPage` 原本自帶另一套標籤（flood 寫「水災」、other 用 ❓、fire 描述無「瓦斯氣爆」），與另兩頁本來就不一致；收斂後全站統一採用 `EventsPage` 那一套。災型**代碼與送出的資料完全不變**，只有通報表單上的顯示字樣與圖標統一，且選單改為天災／民防兩組（順序因此重排）。
- 通報表單（`ReportPage`）：選單由 SSOT 產生，民防類獨立分組（標題「民防／人為事件」）並顯示 lucide 圖標；新增「大量傷患」勾選與概估人數欄位。
- 報表篩選（`ReportsAdminPage`）：新增災型下拉篩選（含「全部」與民防分組）＋ MCI 篩選。
- 地圖 marker：`createDisasterReportMarkerIcon(type, severity)`——既有 8 類回傳與 `createMarkerIcon(severity)` **完全相同**的物件；民防類改用災型色並加粗外框以利辨識。

---

## 7. Migration

檔案：`backend/src/migrations/1754029200000-AddCivilDefenseDisasterTypes.ts`（**只寫檔不執行**，依 D7/D15 窗口排程）。

內容與理由：

1. `reports` 加 `isMassCasualty boolean NOT NULL DEFAULT false`、`casualtyEstimate integer NULL`。
2. 加 `IDX_reports_type`、`IDX_reports_mass_casualty`（partial index，`WHERE "isMassCasualty" = true`——MCI 是稀疏事件，全表索引不划算）。
3. **不含**任何 `ALTER TYPE`：`reports.type` 是 `varchar(50)`，災型加值在 DB 層是 no-op。

**PostgreSQL enum 加值語法確認**（本次雖不需要，仍記錄以備 `intake_reports_sourcetype_enum` 等真 enum 未來擴充）：

```sql
-- 正確語法（PG 9.1+ 有 ADD VALUE；PG 9.6+ 有 IF NOT EXISTS）
ALTER TYPE "public"."intake_reports_sourcetype_enum" ADD VALUE IF NOT EXISTS 'air_raid';
```

必須知道的三個陷阱：

1. **PG < 12 不允許在交易區塊內執行 `ALTER TYPE … ADD VALUE`**。TypeORM 預設把每支 migration 包在交易裡，因此在舊版需要 `await queryRunner.commitTransaction()` 前後拆開，或把該 migration 標成非交易式。PG 12+ 已放寬。
2. 即使在 PG 12+，**同一交易內不得使用剛加入的值**（不能 ADD VALUE 後立刻 `UPDATE … SET x = 'air_raid'`），須拆成兩支 migration。
3. **enum 值無法在 migration 的 `down()` 中移除**——PostgreSQL 沒有 `DROP VALUE`。回滾只能重建整個 type 並改寫所有引用欄位。這是本專案災型刻意維持 `varchar` 的實務理由之一，本次不改變此設計。

---

## 8. 驗證結果（2026-08-01）

### 8.1 LLM 對測（本機 Ollama `qwen2.5:7b-instruct`，`--only=local`，連跑兩次結果一致）

```
Provider  Model                         Cases  Accuracy  Errors   Avg ms   p50 ms   p95 ms
------------------------------------------------------------------------------------------
local     qwen2.5:7b-instruct              32     96.9%       0      768      751      953

--- CD-1 分組（民防新災型 / 既有 8 類 / MCI 旗標）---
Provider             民防             既有          MCI旗標
local      100.0% (10/10)   95.5% (21/22)   100.0% (2/2)

--- 分類錯誤/歧異案例 ---
  [15] 期望 other | local=traffic | 有人受傷需要救護車
```

| 指標 | 門檻 | 實測 | 判定 |
|------|------|------|------|
| 民防新類別準確率 | ≥ 90% | **100%（10/10）** | ✅ 一次過關，未需迭代 prompt |
| 既有 8 類回歸 | 不低於 D13 基準 95%（19/20） | 原始 20 題 **19/20 = 95%**（唯一錯題 [15] 與 D13 基準同一題），連同兩題新增的既有類別邊界題為 21/22 = 95.5% | ✅ 零回歸 |
| MCI 旗標 | —（新指標） | 100%（2/2） | ✅ |
| 邊界題「瓦斯氣爆 → fire」 | 必須維持 fire | 判為 `fire` | ✅ 未被 explosion 奪走 |
| 邊界題「防空警報＋爆炸聲 → air_raid」 | — | 判為 `air_raid` | ✅ |

唯一錯題 [15]「有人受傷需要救護車」是 D13 時期就存在的既有誤判（模型判 `traffic`，測資標 `other`），與本次擴充無關。

### 8.2 其他驗證

| 項目 | 結果 |
|------|------|
| `npx tsc --noEmit`（backend） | 乾淨 |
| `npx tsc --noEmit`（web-dashboard） | 乾淨 |
| 後端 jest 全套 | **334 suites / 3,357 tests 全綠**（基準 333/3,315；本次新增 1 suite `disaster-types.spec.ts` 與 42 個 test） |
| 前端 vitest | 118/118 通過（11 檔，與基準相同） |
| `npx eslint`（改動的後端目錄） | 0 error（既有 warning 數量未增加） |

---

## 9. 後續（不在 C1.1 範圍）

- `AlertCategory`（前端 `core-objects.types.ts`）與 `ReportType` 兩套分類收斂。
- CD-3：以 `isMassCasualty` 為觸發條件的 MCI 級聯（START 傷票、分流站、傷患追蹤）。
- CD-2：`air_raid` 與防空避難處所圖層的聯動（通報 → 一鍵導引最近避難處所）。
- 「戰時模式」一鍵切換（收到 PWS 警報後由值班人員人工觸發，拉高全站預設 severity 與看板佈局）。
