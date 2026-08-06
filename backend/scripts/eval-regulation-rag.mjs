/**
 * 法規 RAG 評測（P4）—— 對真語料 + 真模型跑黃金題集。
 *
 * 刻意 import `dist/` 的**已編譯 citation-validator**，而不是在腳本裡重寫一份，
 * 否則評測的是副本而不是真正上線的程式碼。
 *
 * 用法：npm run build && node scripts/eval-regulation-rag.mjs
 * env：LLM_BASE_URL / LLM_MODEL / EMBED_MODEL
 */
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

// nest build 的輸出根目錄視 tsconfig rootDir 推導而定（dist/ 或 dist/src/），兩種都試
const distBase = ['dist', 'dist/src']
    .map((d) => join(__dirname, '..', d, 'modules', 'regulation-rag'))
    .find((p) => existsSync(join(p, 'citation-validator.js')));
if (!distBase) {
    console.error('找不到編譯後的 citation-validator，請先跑 npm run build');
    process.exit(2);
}
const { validateCitations } = require(join(distBase, 'citation-validator.js'));
const { MIN_SIMILARITY } = require(join(distBase, 'regulation-rag.types.js'));

const corpus = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'regulation-corpus.json'), 'utf8'));

const BASE = (process.env.LLM_BASE_URL || 'http://127.0.0.1:11434/v1').replace(/\/+$/, '');
const CHAT_MODEL = process.env.LLM_MODEL || 'qwen3:14b';
const EMBED_MODEL = process.env.EMBED_MODEL || 'bge-m3';

const DISASTER = 'tw-disaster-regulation';
const WARTIME = 'tw-wartime-mobilization';

/** 黃金題集：可答題 + 🔴 陷阱題（驗證不硬掰）+ 邊界題 */
const GOLDEN = [
    { id: 'A1', type: 'answerable', domain: DISASTER, q: '災害應變中心的成立與指揮官由誰擔任，災害防救法怎麼規定？' },
    { id: 'A2', type: 'answerable', domain: DISASTER, q: '各級政府平時應實施哪些災害預防事項？' },
    { id: 'A3', type: 'answerable', domain: DISASTER, q: '消防機關對火災搶救的權責是什麼？' },
    { id: 'A4', type: 'answerable', domain: WARTIME, q: '民防工作的範圍包括哪些事項？' },
    { id: 'A5', type: 'answerable', domain: WARTIME, q: '全民防衛動員準備法的主管機關與動員準備分類為何？' },
    { id: 'A6', type: 'answerable', domain: WARTIME, q: '空襲警報發放與防空疏散避難屬於誰的工作？' },
    // 🔴 陷阱題 —— 語料裡確定沒有，正確行為是回「查無」而非硬掰
    { id: 'T1', type: 'trap', domain: DISASTER, q: 'RC 結構鋼筋保護層不足的風險，依規範簡述。' },
    { id: 'T2', type: 'trap', domain: DISASTER, q: '職業安全衛生設施規則對施工架搭設高度的規定是什麼？' },
    { id: 'T3', type: 'trap', domain: WARTIME, q: '依 GB 50010-2010，混凝土保護層最小厚度是多少？' },
    { id: 'T4', type: 'trap', domain: DISASTER, q: '台北市信義區某大樓的耐震補強補助金額上限是多少？' },
];

const cos = (a, b) => {
    let d = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
    return d / (Math.sqrt(na) * Math.sqrt(nb));
};

async function embed(text) {
    const r = await fetch(`${BASE}/embeddings`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: EMBED_MODEL, input: text }),
        signal: AbortSignal.timeout(60000),
    });
    if (!r.ok) throw new Error(`embed ${r.status}`);
    return (await r.json()).data[0].embedding;
}

async function chat(prompt) {
    const r = await fetch(`${BASE}/chat/completions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: CHAT_MODEL, messages: [{ role: 'user', content: prompt }], temperature: 0.1 }),
        signal: AbortSignal.timeout(300000),
    });
    if (!r.ok) throw new Error(`chat ${r.status}`);
    return (await r.json()).choices[0].message.content ?? '';
}

function retrieve(qv, domain, topK = 6) {
    return corpus.chunks
        .filter((c) => c.corpusDomain === domain && c.region === 'NATIONAL' && c.vector?.length)
        .map((chunk) => ({ chunk, score: cos(qv, chunk.vector) }))
        .filter((h) => h.score >= MIN_SIMILARITY)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
}

function buildPrompt(question, hits) {
    const ctx = hits.map((h, i) =>
        `[${i + 1}] 法規：${h.chunk.lawName}｜條號：${h.chunk.articleLabel}｜修正日期：${h.chunk.lastAmended ?? '未載'}\n原文：\n${h.chunk.text}`,
    ).join('\n\n');
    return `你是台灣災害防救與全民防衛動員法規的查詢助理。

以下是從台灣官方法規語料庫檢索到的條文，這是你唯一可以使用的資料來源：

${ctx}

使用者問題：「${question}」

嚴格規則：
1. 只能引用上面出現過的法規名稱與條號。**絕對禁止**引用上面沒有的任何法規、標準或編號。
2. quotedText 必須是上面原文的**逐字片段**，一個字都不能改寫、不能自行造句。
3. 若上面的條文無法回答問題，就回 citations: []，不要勉強引用。
4. 使用繁體中文（台灣用語）。不得引用中國大陸的 GB 標準或任何非台灣法規。
5. plainExplanation 是你根據上述條文所做的白話整理，要明確、簡短，不得加入條文沒有的內容。

只輸出 JSON，格式如下，不要有其他文字：
{
  "citations": [
    { "lawName": "法規全名", "articleLabel": "第 N 條", "quotedText": "逐字原文片段" }
  ],
  "plainExplanation": "白話說明"
}`;
}

function extractJson(text) {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const c = fenced ? fenced[1] : text;
    const s = c.indexOf('{'), e = c.lastIndexOf('}');
    if (s === -1 || e <= s) return null;
    try { return JSON.parse(c.slice(s, e + 1)); } catch { return null; }
}

(async () => {
    console.log(`corpus=${corpus.chunks.length} chunks  embed=${corpus.embedModel}(${corpus.embedDim})  chat=${CHAT_MODEL}`);
    console.log(`MIN_SIMILARITY=${MIN_SIMILARITY}\n`);

    const rows = [];
    let pass = 0;

    for (const g of GOLDEN) {
        const t0 = Date.now();
        const qv = await embed(g.q);
        const hits = retrieve(qv, g.domain);

        let answerable = false, accepted = [], rejected = [], top = hits[0]?.score ?? 0;

        if (hits.length > 0) {
            const raw = extractJson(await chat(buildPrompt(g.q, hits)));
            const out = validateCitations(raw?.citations ?? [], hits);
            accepted = out.accepted; rejected = out.rejected;
            answerable = accepted.length > 0;
        }

        // 判定：可答題要 answerable=true；陷阱題要 answerable=false
        const ok = g.type === 'answerable' ? answerable : !answerable;
        if (ok) pass++;

        rows.push({
            題: g.id, 類型: g.type, top相似度: top.toFixed(3), 檢索命中: hits.length,
            採信引用: accepted.length, 擋下: rejected.length,
            answerable, 判定: ok ? 'PASS' : 'FAIL', 秒: ((Date.now() - t0) / 1000).toFixed(1),
        });

        console.log(`${ok ? '✅' : '❌'} ${g.id} [${g.type}] ${g.q.slice(0, 34)}…`);
        if (accepted.length) {
            for (const c of accepted.slice(0, 2)) {
                console.log(`     引用 ${c.lawName} ${c.articleLabel}｜${c.lastAmended}`);
                console.log(`     「${c.quotedText.slice(0, 52)}…」`);
                console.log(`     ${c.sourceUrl}`);
            }
        }
        if (rejected.length) console.log(`     🛡 擋下 ${rejected.length} 筆：${rejected.map((r) => r.reason).join(', ')}`);
        if (!hits.length) console.log(`     檢索無命中（top<${MIN_SIMILARITY}）→ 不呼叫 LLM`);
        console.log();
    }

    console.table(rows);
    console.log(`\n通過 ${pass}/${GOLDEN.length}`);
    process.exit(pass === GOLDEN.length ? 0 : 1);
})();
