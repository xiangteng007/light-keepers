# LK 台灣災害防救法規 RAG 導入計畫

> 狀態：**規劃中（僅此文件，未動任何程式碼）**
> 撰寫分支：`plan/disaster-reg-rag`（worktree `../lk-regplan`）
> 日期：2026-08-05
> 起因：本地模型 A/B 實測發現法規題會引用中國 GB 標準並自稱「我國規範」，另一顆模型甚至捏造出不存在的規範編號。
> 相關並行工作：`fix/llm-json-and-reg-guard`（prompt 護欄，**負向**擋捏造）。本計畫是**正向**供給正解，兩者互補而非替代。

---

## 0. 一句話結論

**LK 目前沒有任何可沿用的檢索機制** —— 沒有向量庫、沒有 embedding、沒有分塊，`manuals` 的「AI 語意搜尋」其實是把 8 筆硬編資料塞進 prompt 讓 LLM 挑 id。
但好消息是：**LLM provider 抽象已經在位、Ollama 上的中文 embedding 模型也已經備妥**，缺的是中間那層檢索。所以這是「新建一層」而不是「改造既有系統」，範圍反而比想像中乾淨。

---

## 1. LK 現有檢索／知識架構盤點（實讀 repo）

### 1.1 `manuals` 模組 —— 沒有 RAG

`backend/src/modules/manuals/manuals.service.ts`（207 行）：

| 面向 | 實際做法 |
|---|---|
| 語料儲存 | `const MANUALS_DATA = [...]` —— **8 筆物件硬編在 .ts 檔裡**（地震 2、急救 2、避難 1、火災 1、颱風 1、水災 1） |
| 「AI 語意搜尋」 | 把 8 筆的 `id/分類/標題/摘要` 全部串成字串塞進 prompt，請 LLM 回 `{relevantManualIds, answer}` |
| 相關度分數 | `1 - (index * 0.2)` —— **由 LLM 回傳順序決定，不是真的相似度** |
| Fallback | `String.includes()` 子字串比對，`.slice(0, 5)` |
| 分塊 / 向量 / 索引 | **完全沒有** |

換句話說：這個做法在語料只有 8 筆時勉強可行，**語料一旦上百條就會超出 context 且無法運作**。法規語料（單是《災害防救法》就 50+ 條）不可能沿用這個路徑。

### 1.2 LLM Provider 抽象 —— 可沿用，但缺 embed

`backend/src/modules/ai-queue/providers/`：

- `LlmProviderService` 依 `LLM_PROVIDER` 路由：`gemini` | `local` | `hybrid`
- `OpenAiCompatibleProvider`（本地）：指向 Ollama / vLLM / LM Studio 的 `/v1`
  - env：`LLM_BASE_URL`、`LLM_MODEL`、`LLM_API_KEY`、`LLM_CONNECT_TIMEOUT_MS`(3000)、`LLM_TIMEOUT_MS`(60000)、`LLM_MAX_RETRIES`(1)
  - **只呼叫 `${baseUrl}/chat/completions`**，全檔沒有任何 `/embeddings` 呼叫
- `LlmProvider` 介面只有兩個生成方法：
  - `run(LlmRequest)` —— **JSON schema 約束生成**（已存在，正是法規問答要的）
  - `generateText(LlmTextRequest)` —— 自由文字
  - **沒有 `embed()`**

→ **要做的擴充很小**：新增 `EmbeddingProvider`（或在 `LlmProvider` 加 `embed()`），打同一個 `LLM_BASE_URL` 的 `/embeddings`。Ollama 原生支援該端點，**BASE_URL 不需改動**。

### 1.3 向量庫 / 資料庫 —— 都沒有

| 檢查項 | 結果 |
|---|---|
| `package.json` 向量/RAG 套件（pgvector / langchain / faiss / chroma / qdrant …） | **零** |
| DB extension | `Baseline.ts` 與 `infra/docker/init-db/01-init.sql` 只建 `postgis`、`postgis_topology`、`uuid-ossp` |
| Postgres 映像 | `postgis/postgis:15-3.3-alpine`（docker-compose 與 NAS compose 皆同）—— **不含 pgvector** |
| 中文全文檢索（zhparser / pg_jieba） | **未安裝** |

→ 走 pgvector 就必須**換 DB 映像**，會連動 NAS 部署與 migration。這是本計畫最大的架構分歧點，見 §3.3。

### 1.4 已備妥的資產（意外的好消息）

工作站 Ollama 上**已經拉好中文 embedding 模型**（`ollama list` 實查）：

| 模型 | 大小 | 適用性 |
|---|---|---|
| `bge-m3:latest` | 1.2 GB | **首選** —— 多語言、中文檢索表現強、支援長輸入 |
| `nomic-embed-text-v2-moe` | 957 MB | 備選，多語 |
| `qwen3-embedding:0.6b` | 639 MB | 備選，與 qwen3 同族 |
| `nomic-embed-text` | 274 MB | 英文為主，中文較弱 |

**VRAM 相容性已驗證**：`qwen3:14b` 實測佔 9.3 GB，卡上 16 GB（RTX 4080 SUPER，實測可用 14.2 GB）。`bge-m3` 僅 1.2 GB → **9.3 + 1.2 = 10.5 GB，兩者可同時常駐**，不會觸發 D22 要避免的「模型交替載入抖動」。

### 1.5 其他相關模組

- `ai-queue`：有 `USE_CASE_CONFIG` 註冊表（`requiredLevel` / `maxConcurrency` / `circuitBreakerThreshold` / `promptVersion`）—— 新的法規問答 use case 應在此註冊，直接繼承既有的授權定級與熔斷保護
- `psychological-support/pfa-chatbot.service.ts` —— PFA 對話，**本輪未深讀**，需在 Phase 0 確認它是否另有一套檢索邏輯可參考或需一併收斂（見 §5.5 待確認）
- `training/course-scraper.service.ts` —— 已有外部來源抓取＋落庫的既有模式，ingest 排程可參考其結構

### 1.6 盤點結論

| 問題 | 答案 |
|---|---|
| 有沒有可沿用的檢索機制？ | **沒有。必須新建。** |
| 有沒有可沿用的 LLM 通道？ | **有。** `LlmProviderService` + `OpenAiCompatibleProvider`，只需加 embed 能力 |
| 有沒有可沿用的授權／熔斷／佇列？ | **有。** `ai-queue` 的 `USE_CASE_CONFIG` |
| 有沒有可沿用的向量儲存？ | **沒有。** 見 §3.3 選型 |
| 需要動 DB 映像嗎？ | **Phase 1 建議不要**（用 in-process），見 §3.3 |

---

## 2. 台灣災害防救法規語料來源

### 2.1 核心法規（全國法規資料庫，法務部）

**授權：政府資料開放授權條款－第 1 版**（[授權宣告](https://law.moj.gov.tw/Service/Copyright.aspx)）—— 無償、非專屬、可再授權、可重製改作，**使用時應註明出處**。這是本計畫最乾淨的來源，法律風險最低。

| 法規 | pcode | 連結 | 備註 |
|---|---|---|---|
| 災害防救法 | `D0120014` | [LawAll](https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=D0120014) | 母法，核心 |
| 災害防救法施行細則 | `D0120021` | [LawSingle](https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=D0120021&flno=2) | 含基本計畫五年檢討之規定 |
| 消防法 | `D0120001` | [LawAll](https://law.moj.gov.tw/LawClass/LawAllPara.aspx?pcode=D0120001) | 火災、救護相關 |

**逐條引用網址格式**（做出處連結用，已驗證可用）：
```
https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=<PCODE>&flno=<條號>
```
例：災防法第 3 條 → `...?pcode=D0120014&flno=3`

**取得方式（三條路，Phase 0 決定走哪條）**：
1. **Open API** —— [Swagger 文件](https://law.moj.gov.tw/api/swagger/index.html)，支援 XML/JSON。
   🔴 **本輪未能驗證實際端點契約**（Swagger 是 SPA，抓不到 spec 內容）。Phase 0 必須實打一次確認路徑、參數與是否需金鑰。
2. **公開資料下載區整批下載** —— 搜尋結果顯示需**先申請帳號**核准後方可下載整批 XML。若要一次抓齊多部法規，這條比較合適，但**需 owner 出面申請**。
3. **逐頁抓取** —— 最後手段，量小時可行，但要自律 rate limit 且解析較脆。

**更新頻率**：法規修正無固定週期（災防法近年有增訂第 37-1、37-2、43-1 條並刪除數條的紀錄）。→ ingest 必須**記錄修正日期並可 diff 重跑**，見 §3.4。

### 2.2 災害防救基本計畫 🔴 授權未定

《災害防救基本計畫》由**中央災害防救會報核定**，性質是**計畫而非法規**，因此**不在全國法規資料庫**，也就**不適用**上面那份開放授權。

- 依施行細則，中央災害防救委員會應每五年檢討一次
- 通常以 PDF 發布於內政部消防署／中央災害防救會報網站
- **本輪未能確認其重製授權** → 列為 **owner 待決事項**（§5.5）。在授權釐清前，**不納入 ingest**。

### 2.3 避難收容 / 疏散避難

規範面多屬**地方自治法規**與作業要點，非單一中央法源；資料面則有開放資料點位：

| 來源 | 連結 | 授權／取得 |
|---|---|---|
| 政府資料開放平臺「避難收容處所點位檔」 | [dataset/73242](https://data.gov.tw/dataset/73242) | 政府資料開放授權；直接下載 |
| NCDR 災防中心資料服務平台「避難收容所」 | [datahub](https://datahub.ncdr.nat.gov.tw/dataset/detail?pid=7e0ec2a5-d17e-49b3-a7b4-4c89c8875de7) | **需申請 Token**（HTTP Header 驗證），見 [API 服務說明](https://datahub.ncdr.nat.gov.tw/paradigm) |
| 臺北市資料大平臺（地方範例） | [避難收容處所一覽表](https://data.taipei/dataset/detail?id=aaf97773-3631-40e2-b3cc-da87bf2ce1d5) | 地方開放資料 |

⚠ **這類是「設施點位資料」不是「法規文本」**，屬於不同的檢索需求。LK 已有 `shelters`、`public-resources`（含防空避難所 entity）模組，**點位資料應走既有模組，不要灌進法規 RAG**。本計畫只處理**規範文本**。

⚠ NCDR 另有「2024 年災害潛勢圖資」等資料集標示**限政府單位申請**，協會身分是否符合需 owner 確認。

### 2.4 地方災防法規

各縣市有獨立法規查詢系統（例：[臺北市法規查詢系統](https://laws.gov.taipei/)）。授權與取得方式**逐縣市不同**，且量體龐大。
→ **建議 Phase 3 再處理，且先只做協會實際服務轄區**，不要一開始就全國掃。

### 2.5 來源清單小結

| 優先 | 來源 | 授權明確？ | 可自動化？ | 納入階段 |
|---|---|---|---|---|
| P0 | 災害防救法 / 施行細則 / 消防法（MOJ） | ✅ 開放授權 v1 | ✅ API 或整批下載 | Phase 1 |
| P1 | 其他 MOJ 災防相關法規 | ✅ 同上 | ✅ | Phase 3 |
| P2 | 災害防救基本計畫 | ❌ **未確認** | ⚠ PDF | **待 owner** |
| P2 | 地方災防法規 | ⚠ 逐地不同 | ⚠ | Phase 3 |
| — | 避難收容點位資料 | ✅ | ✅ | **不納入本 RAG**（走既有模組） |

---

## 3. Ingest 設計

### 3.1 切塊：以「條」為原子單位，不用固定 token 窗

法規天然有結構，**用固定 token 滑窗切法規是錯的**——會把「第 22 條」切成兩半，導致引用時條號對不上。

```
編 → 章 → 節 → 條 → 項 → 款 → 目
                 ↑ 切塊邊界
```

- **主切塊 = 一條**（`第 N 條` 全文）
- 超長條文（實務上少數條會很長）→ **二次切為「項」**，但 metadata 保留母條號，引用時仍顯示「第 N 條第 M 項」
- **不跨條合併**，即使某條很短
- 章節標題**冗餘寫進每個 chunk 的前綴**（`災害防救法 > 第三章 災害預防 > 第 22 條`），讓 embedding 帶到脈絡，也讓使用者看得懂出處

### 3.2 Metadata schema（每個 chunk 必帶）

```jsonc
{
  "corpusDomain": "tw-disaster-regulation",   // ← domain 隔離的關鍵，見 3.5
  "lawId":        "D0120014",                 // pcode
  "lawName":      "災害防救法",
  "lawLevel":     "法律",                      // 法律 / 命令 / 計畫 / 地方自治法規
  "chapter":      "第三章 災害預防",
  "articleNo":    "22",
  "paragraphNo":  null,                        // 二次切塊時才有
  "text":         "...條文原文，一字不改...",
  "lastAmended":  "2022-06-15",                // 修正日期＝版本
  "sourceUrl":    "https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=D0120014&flno=22",
  "contentHash":  "sha256:...",                // 供 diff 重跑
  "ingestedAt":   "2026-08-05T00:00:00Z"
}
```

`lastAmended` + `contentHash` 是**整個設計裡最重要的兩個欄位**——沒有它們就無法回答「這條是不是最新的」，而一個看起來權威、內容卻過期的法規答案，**比沒有 RAG 更危險**。

### 3.3 儲存選型 🔴 架構分歧點

| 方案 | 作法 | 優 | 缺 | 建議 |
|---|---|---|---|---|
| **A. In-process（記憶體）** | ingest 產出 `disaster-reg-corpus.json`（含向量），開機載入，用 cosine 暴力搜尋 | **零基礎設施變更**、不動 DB 映像、不動 NAS compose、可版控、可離線帶著走 | 記憶體隨 instance 數放大；語料大了會慢 | **✅ Phase 1 採用** |
| B. pgvector | 換成 `postgis + pgvector` 自建映像，加 migration | 正統、可擴充、可 SQL join | **要換 DB 映像 → 動 NAS 部署與 migration**；LK 部署管線目前本就卡住 | Phase 3 視語料量再評估 |
| C. Postgres tsvector 全文檢索 | 純關鍵字 | 不需向量 | **中文斷詞需 zhparser/pg_jieba，映像沒有** → 與 B 同樣要換映像，卻只換到較差的檢索品質 | ❌ 不建議 |

**為什麼 Phase 1 選 A**：三部核心法規合計約**數百個 chunk**（災防法 50+ 條、施行細則、消防法），以 bge-m3 的 1024 維 float32 估算，向量本身**不到 5 MB**。這個量級用暴力 cosine 搜尋是**微秒級**的，上向量庫是過度工程；而換 DB 映像會直接踩到目前最脆弱的部署路徑。等語料真的擴到地方法規（可能上萬 chunk）再換 B 不遲，且屆時介面已經抽象好。

**設計要求**：檢索層必須抽介面（`RegulationRetriever`），A→B 換實作時**不改呼叫端**。

### 3.4 版本化與重跑

```
排程（週）→ 抓最新法規 → 比對 contentHash
                              ├─ 相同 → 跳過
                              └─ 不同 → 重新切塊 + 重新 embed + 標記 supersededAt
```

- 保留舊版本（`supersededAt` 非 null）供稽核，但**檢索預設只回現行版本**
- ingest 產出**寫入報告**：新增 N 條、修正 M 條、下架 K 條 → 進 audit log
- 若語料 `lastAmended` 距今超過閾值（建議 180 天未檢查），回答時**附加時效警語**

### 3.5 Domain 隔離：不污染既有 manuals 檢索

這是本設計的硬性要求。三層防護：

1. **儲存分離** —— 法規語料自成一個 corpus（`tw-disaster-regulation`），與 manuals 各自獨立，不共用索引檔
2. **查詢強制帶 domain** —— `RegulationRetriever.search(query, { domain })`，domain 為必填參數（型別層強制），不給預設值
3. **入口分離** —— 法規問答走新的 use case id（`regulation.qa.v1`），與 `manuals.search.v1` 是不同端點、不同授權定級

換句話說：**manuals 的行為完全不變**，法規 RAG 是平行新增的路徑。這也讓 Phase 1 可以獨立上線與獨立回滾。

### 3.6 Embedding 管線（零雲端）

```
ingest CLI ──► 切塊 ──► POST {LLM_BASE_URL}/embeddings  ──► corpus.json
                         model: bge-m3                      (含向量)
查詢時    ──► 同一個 embed 端點 ──► cosine top-k ──► 進 prompt
```

- **沿用既有 `LLM_BASE_URL`**（已指向工作站 Ollama），不新增對外連線 → 符合零雲端
- 新增 env：`EMBED_MODEL`（預設 `bge-m3`）。**不要**沿用 `LLM_MODEL`——那是 chat 模型
- `LLM_PROVIDER=gemini` 時 embed 應**明確拒絕**而非偷偷走雲端（法規語料雖是公開資料，但查詢字串可能含敏感情境）
- Ollama 離線時：檢索降級為關鍵字比對並**在回答中明示「語意檢索不可用」**，不可靜默降級

---

## 4. Grounded 回答與出處

### 4.1 與 `fix/llm-json-and-reg-guard` 的分工

| 機制 | 方向 | 職責 |
|---|---|---|
| reg-guard（並行中） | **負向** | 擋掉未經檢索的法規編號、擋掉 GB/中國法源、擋掉捏造 |
| 本 RAG | **正向** | 提供可引用的台灣法規原文與出處 |

兩者**都要保留**。只有護欄 → 模型變成「什麼都不敢答」；只有 RAG → 檢索失敗時模型仍會自由發揮。合起來才是「有料就引、沒料就明說」。

### 4.2 回答契約

法規問答**必須**走 schema 約束生成（既有 `LlmProvider.run()` 已支援），輸出結構固定：

```jsonc
{
  "answerable": true,
  "citations": [                      // 只能來自檢索結果，不得新增
    {
      "lawName": "災害防救法",
      "articleNo": "22",
      "quotedText": "…條文原文…",      // 逐字，不改寫
      "lastAmended": "2022-06-15",
      "sourceUrl": "https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=D0120014&flno=22"
    }
  ],
  "plainExplanation": "白話說明（明確標示為系統整理，非法條原文）",
  "disclaimer": "本回答依系統語料整理，法律效力以主管機關公告之現行法規為準。"
}
```

**三條硬規則**：
1. `citations[].quotedText` **必須逐字出現在檢索到的 chunk 中** —— 這可以在**程式層驗證**（字串比對），不必信任模型。對不上就整筆丟棄。
2. `citations[]` 的 `lawName`/`articleNo` **必須在檢索結果集合內** —— 同樣程式層白名單驗證。這一條直接消滅「捏造編號」這個原始問題。
3. **原文與白話說明分開欄位呈現**，前端不得混排，避免使用者把系統整理誤認為法條。

### 4.3 查不到時的行為

```
top-1 相似度 < 閾值  或  檢索結果為空
        ↓
answerable = false
        ↓
「本系統語料目前查無相關規定。建議直接查閱全國法規資料庫
 https://law.moj.gov.tw/ ，或洽詢主管機關（內政部消防署）。」
        ↓
不得輸出任何法規編號或條號
```

閾值需以評測集校準（Phase 4），寧可**偏保守**（多說幾次「查無」）也不要在災防場景給錯條號。

### 4.4 評測集

建 20–30 題黃金題，**必須包含三類**：

| 類型 | 例 | 驗什麼 |
|---|---|---|
| 語料內可答 | 「災害防救法對災害應變中心的設置怎麼規定？」 | 引對條號、原文逐字、連結可點 |
| **語料內沒有（陷阱題）** | 「RC 結構鋼筋保護層規範怎麼說？」 | **會不會硬掰** —— 這正是 A/B 實測翻車的那題 |
| 邊界／易混淆 | 「消防法和災防法哪個管火災搶救？」 | 會不會張冠李戴 |

Baseline 直接用 A/B 實測的 Q3 結果（qwen3:14b 引 GB 50010-2010 並稱「我國」）作為改善前對照。

---

## 5. 分期、工作量、風險、分工、待拍板

### 5.1 分期與工作量

| 階段 | 內容 | 估時 | 建議執行 |
|---|---|---|---|
| **Phase 0 可行性驗證** | ①實打 MOJ Open API 確認契約 ②實測 Ollama `/v1/embeddings` + bge-m3 可用 ③抓一份 D0120014 樣本確認可解析 ④深讀 `pfa-chatbot.service.ts` 確認有無既有檢索需收斂 | **0.5–1 d** | **OPUS** |
| **Phase 1 檢索核心** | `EmbeddingProvider`、`RegulationRetriever` 介面 + in-process 實作、條文切塊器、ingest CLI、corpus 產出與版控 | **3–4 d** | **OPUS** |
| **Phase 2 問答串接** | `RegulationQaService`、註冊 `regulation.qa.v1` use case、schema 約束輸出、**程式層引用驗證**、與 reg-guard 銜接、出處渲染 | **2–3 d** | **OPUS** |
| **Phase 3 語料擴充** | 其他 MOJ 災防 pcode 批次 ingest、（若 owner 拍板）地方法規 | **2 d** | **SONNET**（機械批次） |
| **Phase 4 評測與調校** | 黃金題集、相似度閾值校準、迴歸測試進 CI | **1–2 d** | **OPUS** |

**合計約 9–12 人日。** Phase 1／2 是關鍵路徑且互相依賴，不建議平行拆給不同 agent；Phase 3 可與 Phase 4 平行。

### 5.2 分工原則

- **OPUS**：切塊器（法規結構解析容易出邊界錯）、引用驗證（正確性要求高）、閾值校準（需判斷）
- **SONNET**：多部法規的批次 ingest、樣板化測試補齊
- **FABLE**：本計畫**不需要** —— 沒有新設計語言或高風險取捨，是既有模式的延伸
- 各自 worktree，合併前以 main 實跑為準（agent 回報的基準數常過期）

### 5.3 風險

| 風險 | 影響 | 緩解 |
|---|---|---|
| 🔴 **語料過期卻看起來權威** | 災防場景給出已廢止條文 → 最嚴重的失敗模式 | `lastAmended` 必帶、週排程 diff、逾期附警語、回答一律附連結讓使用者可自行核對 |
| 🔴 **災害防救基本計畫授權不明** | 可能整份無法納入 | Phase 1 先不納入；owner 釐清後再議 |
| MOJ API 契約未驗證 | Phase 1 可能要改抓取方式 | Phase 0 先驗；備案為申請整批下載帳號 |
| NCDR 資料限政府單位 | 部分資料拿不到 | 本計畫核心不依賴 NCDR（那是點位資料，非法規） |
| in-process store 記憶體隨 instance 放大 | 多 instance 時浪費 | 語料 < 5 MB，可接受；超標即切 pgvector |
| GPU 同時載 chat + embed | 抖動（D22 要避免的） | 已驗算 9.3 + 1.2 = 10.5 GB < 14.2 GB 可用，**可共存** |
| **LK 尚未部署** | 做完也上不去 | 這是**外部阻塞**：main 目前領先 origin/main 227 commits 未 push、正式環境自 2026-02 起實質離線。本功能上線時程受制於部署解封，**不應把部署當作本計畫的一部分** |
| 法律責任 | 使用者依系統回答行動 | 免責聲明必備且不可由模型生成（固定字串），措辭需 owner 確認 |

### 5.4 不做什麼（明確排除）

- ❌ 不改 `manuals` 既有行為
- ❌ 不把避難收容**點位資料**灌進法規 RAG（走既有 `shelters`／`public-resources`）
- ❌ Phase 1 不換 DB 映像、不加 migration
- ❌ 不引入雲端 embedding
- ❌ 不做法律諮詢式的個案建議，只做「規範說了什麼」的引用

### 5.5 待 owner 拍板

| # | 事項 | 為什麼需要 owner |
|---|---|---|
| 1 | **《災害防救基本計畫》授權** | 非法規、不適用開放授權，可能需去函詢問。**在此之前不納入** |
| 2 | **是否申請 MOJ 公開資料下載帳號** | 需以協會名義申請；影響 Phase 0 走 API 還是整批下載 |
| 3 | **是否申請 NCDR Token / 協會身分是否符合** | 部分資料集限政府單位 |
| 4 | **語料範圍：只中央法規，還是含地方？** | 決定 Phase 3 規模（可能差 5–10 倍工作量） |
| 5 | **免責聲明措辭** | 有法律風險，不應由工程或模型決定 |
| 6 | **儲存選型是否接受 Phase 1 用 in-process** | 若 owner 要求一步到位上 pgvector，需連帶批准換 DB 映像與 NAS 部署變更 |
| 7 | **本計畫與部署解封的先後** | 目前正式環境離線；要先修部署還是先做功能 |

### 5.6 未能查證／需 Phase 0 補齊（如實標註）

- MOJ Open API 的**實際端點與參數契約**未驗證（Swagger UI 為 SPA，抓不到 spec）
- MOJ **整批下載的申請流程與核准條件**僅由搜尋結果推得，未實際走過
- 《災害防救基本計畫》的**授權條款**未找到權威說明
- `pfa-chatbot.service.ts` **未深讀**，不排除它另有一套檢索邏輯
- 避難收容的**中央層級規範**是否存在單一法源，本輪未查到權威答案（現有證據指向多為地方自治法規與作業要點）

---

## 6. 參考連結

- [全國法規資料庫](https://law.moj.gov.tw/) ｜ [Open API 文件](https://law.moj.gov.tw/api/swagger/index.html) ｜ [資料開放授權宣告](https://law.moj.gov.tw/Service/Copyright.aspx)
- [災害防救法 (D0120014)](https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=D0120014)
- [災害防救法施行細則 (D0120021)](https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=D0120021&flno=2)
- [消防法 (D0120001)](https://law.moj.gov.tw/LawClass/LawAllPara.aspx?pcode=D0120001)
- [內政部主管法規共用系統－災害防救法](https://glrs.moi.gov.tw/LawContent.aspx?id=GL000120)
- [政府資料開放平臺](https://data.gov.tw/) ｜ [避難收容處所點位檔](https://data.gov.tw/dataset/73242)
- [NCDR 災防中心資料服務平台](https://datahub.ncdr.nat.gov.tw/) ｜ [API 服務說明](https://datahub.ncdr.nat.gov.tw/paradigm)
- [臺北市資料大平臺－可供避難收容處所一覽表](https://data.taipei/dataset/detail?id=aaf97773-3631-40e2-b3cc-da87bf2ce1d5)
- 相關內部文件：`docs/FULL_SYSTEM_REDESIGN_PLAN.md`（D22 模型統一決策）

---

# 附錄 A：實作紀錄（owner 拍板後，2026-08-06）

> 分支 `rag/disaster-reg`。以下為**實際落地結果**，與上方規劃有出入處以本節為準。

## A.1 owner 四項決策的處置

| # | owner 決策 | 實際處置 |
|---|---|---|
| 1 | 納入《災害防救基本計畫》 | 🔴 **授權無法確認** —— 行政院中央災害防救會報頁面（cdprc.ey.gov.tw）頁尾僅標示「© 行政院版權所有」，未見政府資料開放授權宣告，全文亦不在該頁（僅提供 98-102／103-107／108-112／113-117 四期連結）。**依 owner 指示改採「引用＋官方連結」**：`REFERENCE_ONLY_SOURCES` 只登錄書目、發布機關、性質摘要與官方連結，**不重製內文**；且 `citation-validator` 硬性排除 `referenceOnly` 來源被逐字引用（有測試守住）。查無資料時會在 notice 附上該計畫的官方連結供使用者自行查閱。 |
| 2 | 語料含地方、按區域分類 | 資料模型已加 `region`（`RegulationRegion` enum），檢索語意為「該縣市＋中央」（中央法規全國適用），API 以 `region` 參數過濾。**但地方語料尚未實際 ingest** —— 見 A.4 卡住項。 |
| 3 | 加入戰時動員規定 | ✅ 新增 `tw-wartime-mobilization` domain，已納入 **民防法／全民防衛動員準備法／其施行細則／全民國防教育法**，共 107 chunks。 |
| 4 | 加免責聲明 | ✅ `DISCLAIMER` 常數（`regulation-rag.types.ts`），**固定字串、不由模型生成**，每則回答必帶（有測試守住）。⚠ **措辭為工程端擬的保守版，標記 owner／法務待審**。 |

## A.2 實際納入的語料

| 法規 | pcode | domain | 條 | chunks | 最後修正 |
|---|---|---|---|---|---|
| 災害防救法 | D0120014 | 災防 | 66 | 66 | 2025-05-28 |
| 災害防救法施行細則 | D0120021 | 災防 | 22 | 22 | 2022-12-12 |
| 消防法 | D0120001 | 災防 | 80 | 80 | 2024-11-29 |
| 民防法 | D0080118 | 戰時 | 31 | 31 | 2021-01-20 |
| 全民防衛動員準備法 | F0070013 | 戰時 | 48 | 48 | 2019-06-19 |
| 全民防衛動員準備法施行細則 | F0070022 | 戰時 | 13 | 13 | 2008-04-11 |
| 全民國防教育法 | F0080014 | 戰時 | 15 | 15 | 2005-02-02 |
| **合計** | | | **275** | **275** | |
| 災害防救基本計畫 | — | 災防 | — | 1（reference-only） | — |

**授權**：全數來自全國法規資料庫，採政府資料開放授權條款－第 1 版，已於 corpus 內建 `attribution` 欄位並隨每則回答輸出。

### 🔴 ingest 內建廢止偵測（實際擋下一部）

《全民防衛動員準備實施辦法》(F0070012) 原列入來源清單，實抓發現其法規類別為
**「廢止法規 ＞ 國防部」、廢止日期民國 90 年 12 月 27 日**，已自動排除並記入 `sourceReport`。

這正是規劃時列為「最嚴重失效模式」的情境：**若盲目 ingest，系統會用權威口吻引用一部已廢止 25 年的法規**。
偵測邏輯（`廢止日期` 欄位存在 或 法規類別以「廢止法規」開頭）對所有來源生效，日後其他法規遭廢止亦會自動擋下。

## A.3 引用驗證與評測結果

`citation-validator.ts` 三道關卡全在程式層，**不信任模型輸出**：
① 法規名白名單 ② 條號白名單 ③ 原文逐字比對（正規化空白／全半形後）。
輸出的 `lastAmended`／`sourceUrl`／`region` **一律取自語料**，模型給的值一概不採用。

**黃金題集實跑（qwen3:14b + bge-m3，本機零雲端）：10/10 通過**

- 可答題 A1–A6：條號、修正日期、出處連結皆正確
- 陷阱題 T1–T4：全數正確回 `answerable: false`
  - **T1 = A/B 實測讓 qwen3:14b 引用「GB 50010-2010」並自稱「我國規範」的那題 RC 保護層** → 現在回查無
  - T3 直接問 GB 50010-2010 → 檢索 top < 0.45 無命中，**連 LLM 都不呼叫**
- 驗證器在 A1／A3／A5 實際擋下 3 筆（`ARTICLE_NOT_IN_RETRIEVAL` ×2、`QUOTE_NOT_VERBATIM` ×1）
  —— 證明模型**確實仍會亂引**，程式層驗證**確實有在擋**

## A.4 卡住／未完成（如實標註）

| 項目 | 狀態 | 說明 |
|---|---|---|
| **地方法規語料** | 🔴 **結構就緒、內容未 ingest** | `LOCAL_SOURCES` 已登錄 5 個代表性縣市（北市／新北／中市／高市／花蓮）的法規系統入口，但**各縣市系統的網址格式與 HTML 結構皆不同，無法沿用 MOJ 解析器**，需逐縣市寫 adapter。目前 `status: 'pending'`，不會產生 chunk。資料模型與檢索的 region 過濾已可直接承接。 |
| MOJ Open API | 未使用 | Swagger 為 SPA 抓不到 spec；改用 `LawAll.aspx` 頁面解析（穩定、已驗證），自律 1.5s rate limit。整批下載需申請帳號，未走。 |
| 《災害防救基本計畫》全文 | 不納入 | 授權未確認，見 A.1。 |
| 前端 UI | 未做 | 本輪只做後端 API。 |

## A.5 留給 owner

1. 🔴 **免責聲明措辭定稿** —— `DISCLAIMER` 常數，涉法律責任，請法務／owner 覆核
2. 🔴 **《災害防救基本計畫》授權** —— 若能取得重製授權，可從 reference-only 升級為全文 ingest
3. **地方語料涵蓋範圍** —— 要做哪幾個縣市？每個縣市 adapter 約 0.5–1 人日
4. **相似度門檻 0.45** —— 目前 10/10 通過，但陷阱題 T1/T2/T4 的 top 分數落在 0.52–0.58（高於門檻但被引用驗證擋下）。若要更保守可調高門檻，代價是可答題召回下降
5. **語料更新排程** —— 目前為手動跑 `ingest-regulations.mjs`；是否要排週更新

---

# 附錄 B：災害防救計畫三層階層（owner 補充後修訂，2026-08-06）

owner 提供的權威摘要已納入資料模型。**所有法源皆對本系統語料逐條核對過**，以下為核對結果。

## B.1 三層階層 —— 這是法律寫死的，不是我們自訂的分類

| 層級 | 法源 | 擬訂者 → 核定者 | 法定檢討週期 | `planLevel` |
|---|---|---|---|---|
| **基本計畫**（全國上位） | 災防法 **§17** | 中央災害防救委員會 → 中央災害防救會報核定 → 行政院函送 | **5 年**（細則 §6） | `basic-plan` |
| **業務計畫**（按災種） | 災防法 **§19** | ①公共事業 → 中央目的事業主管機關<br>②中央災害防救業務主管機關 → 中央災害防救會報 | **2 年**（細則 §7） | `operational-plan` |
| **地區計畫**（地方） | 災防法 **§20** | ①直轄市、縣（市）政府<br>②鄉（鎮、市）、山地原住民區公所 | **2 年**（細則 §8） | `regional-plan` |

§20 II、V 明定 **下級計畫不得牴觸上級計畫**。三層的擬訂機關、核定程序、檢討週期、適用範圍全都不同，
因此資料模型**刻意分開**，不混成一堆 —— 混在一起檢索會讓使用者分不清哪一份管到自己。

## B.2 一處與 owner 摘要的差異（已依法條為準）

> owner 摘要：「法源＝§17……**每 5 年通盤檢討**」

核對語料原文後：**§17 只寫「應定期檢討，必要時得隨時為之」，母法並未出現「五年」**。
五年是**施行細則 §6** 才規定的（「中央災害防救委員會**每五年**應依本法第十七條第二項規定……檢討災害防救基本計畫」）。

法源分屬已在 `legalBasis` 欄如實標成「災害防救法第 17 條（檢討週期見同法施行細則第 6 條）」，
並有測試 `§17 母法只寫「應定期檢討」，並未寫五年` 守住，避免日後有人把細則的規定講成母法的規定。

另 owner 摘要的「三大範疇」，法條文字（細則 §6、本法 §18）為**四項並列**：
**減災／整備／災害應變／災後復原重建**，故 `ScopeTag` 建為四個。

## B.3 資料模型新增欄位

```ts
sourceType      // 'regulation' | 'plan' —— 法規與計畫的授權與效力完全不同
planLevel       // 'basic-plan' | 'operational-plan' | 'regional-plan' | null
planVersion     // 例 '113-117'（現行；前版 108-112）
reviewCycleYears// 5 / 2 / 2
legalBasis      // '災害防救法第 17 條（檢討週期見同法施行細則第 6 條）'
scopeTags       // 減災／整備／應變／復原重建
region          // 直轄市、縣（市）層級，或 NATIONAL
subRegion       // 鄉（鎮、市）、山地原住民區層級（§20 IV 的第二級）
```

`region` / `subRegion` 兩級**正是 §20 地區計畫的兩級**，owner 要的「地方按區域分類」骨架即此。

## B.4 基本計畫的處置（維持 reference-only）

owner 補充印證了授權問題：權威來源是**行政院中央災害防救會報（cdprc.ey.gov.tw）而非全國法規資料庫**，
因為它是「計畫」不是「法規」—— 也就不適用法規資料庫那份開放授權。該站頁尾僅「© 行政院版權所有」。

故維持 **摘要＋官方連結**：`referenceOnly: true`，`planVersion: '113-117'`，
查無資料時的 notice 會附上「《災害防救基本計畫》（113-117 年版，現行）法源：災害防救法第 17 條 <連結>」。
測試守住它**不得被逐字引用**、且來源網址不得是 law.moj.gov.tw。

## B.5 尚未 ingest 的兩層（結構已就緒）

| 層級 | 狀態 | 待辦 |
|---|---|---|
| 業務計畫 | `pending` | 按災種（水災／震災／土石流／火災…）各部會分別發布，授權需逐份確認 |
| 地區計畫 | `pending` | 兩級 region/subRegion 欄位已備妥，待 owner 圈縣市範圍 |

兩者已登錄在 `sourceReport` 並有測試確認**不會產生 chunk**，避免「以為有、其實沒有」。
