/**
 * 法規語料 ingest —— 抓取 → 切塊 → embed → 產出 corpus JSON
 *
 * 用法：
 *   node scripts/ingest-regulations.mjs --fetch          # 只抓取與切塊（需連外）
 *   node scripts/ingest-regulations.mjs --embed          # 只對既有 chunks 產生向量（需 Ollama）
 *   node scripts/ingest-regulations.mjs --fetch --embed  # 全跑
 *
 * 產出：backend/data/regulation-corpus.json
 *   —— 進版控。執行期完全不連外，符合零雲端要求。
 *
 * env：
 *   LLM_BASE_URL   Ollama OpenAI 相容端點，例 http://127.0.0.1:11434/v1
 *   EMBED_MODEL    embedding 模型，預設 bge-m3
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    MOJ_SOURCES,
    REFERENCE_ONLY_SOURCES,
    PLAN_HIERARCHY_SOURCES,
    SOURCE_ATTRIBUTION,
    SOURCE_TYPE,
} from './regulation-sources.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'data');
const OUT_FILE = join(OUT_DIR, 'regulation-corpus.json');

const args = process.argv.slice(2);
const DO_FETCH = args.includes('--fetch');
const DO_EMBED = args.includes('--embed');

const EMBED_MODEL = process.env.EMBED_MODEL || 'bge-m3';
const LLM_BASE_URL = (process.env.LLM_BASE_URL || 'http://127.0.0.1:11434/v1').replace(/\/+$/, '');

const sha256 = (s) => 'sha256:' + createHash('sha256').update(s, 'utf8').digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── HTML 解析 ────────────────────────────────────────────────────────────
const decodeEntities = (s) =>
    s
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d));

const stripTags = (s) => decodeEntities(s.replace(/<[^>]*>/g, '')).replace(/ /g, ' ').trim();

/**
 * 解析全國法規資料庫 LawAll 頁面。
 *
 * 結構（實測 2026-08）：
 *   <tr id="trLNNDate"><th>修正日期：</th><td>民國 110 年 01 月 20 日</td></tr>
 *   <div class="row">
 *     <div class="col-no"><a href="LawSingle.aspx?pcode=X&flno=1">第 1 條</a></div>
 *     <div class="col-data"><div class="law-article">
 *        <div class="line-0000">…</div><div class="line-0004">一、…</div>
 *     </div></div>
 *   </div>
 */
export function parseMojLawPage(html) {
    const rocDate = (label) => {
        const m2 = html.match(
            new RegExp(`${label}：?</th>\\s*<td>\\s*民國\\s*(\\d+)\\s*年\\s*(\\d+)\\s*月\\s*(\\d+)\\s*日`),
        );
        if (!m2) return null;
        const [, y, mo, d] = m2;
        return `${Number(y) + 1911}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
    };

    // 修正／公發布／公布日期 —— 不同法規用的欄位名不一樣
    const lastAmended = rocDate('修正日期') || rocDate('公發布日') || rocDate('公布日期');

    // 法規類別
    const catMatch = html.match(/法規類別：?<\/th>\s*<td>([^<]*)</);
    const category = catMatch ? stripTags(catMatch[1]) : null;

    // 🔴 廢止偵測 —— 引用已廢止法規是本系統最嚴重的失效模式，必須在 ingest 就擋掉。
    // 全國法規資料庫對廢止法規會出現「廢止日期」欄位，且法規類別以「廢止法規」開頭。
    const repealedDate = rocDate('廢止日期');
    const repealed = !!repealedDate || /^廢止法規/.test(category || '');

    // 條文
    const articles = [];
    const rowRe =
        /<div class="col-no">\s*<a[^>]*flno=([\w-]+)"[^>]*>([^<]*)<\/a>\s*<\/div>\s*<div class="col-data">([\s\S]*?)<\/div>\s*<\/div>/g;
    let m;
    while ((m = rowRe.exec(html)) !== null) {
        const flno = m[1];
        const label = stripTags(m[2]); // 「第 1 條」
        const body = m[3];

        // 逐 line div 取文字，保留換行讓「項」可辨識
        const lines = [];
        const lineRe = /<div class="line-\d+[^"]*">([\s\S]*?)<\/div>/g;
        let lm;
        while ((lm = lineRe.exec(body)) !== null) {
            const t = stripTags(lm[1]);
            if (t) lines.push(t);
        }
        if (!lines.length) {
            const t = stripTags(body);
            if (t) lines.push(t);
        }
        if (!lines.length) continue;

        articles.push({ flno, label, lines });
    }

    return { lastAmended, category, articles, repealed, repealedDate };
}

/**
 * 切塊：以「條」為原子單位。
 *
 * 刻意不用固定 token 窗——法規引用的最小單位就是「條」，
 * 滑窗會把一條切成兩半，導致引用時條號對不上。
 * 超長條文才二次切「項」，但 metadata 保留母條號。
 */
const MAX_CHARS = 1200;

export function chunkArticles(source, parsed) {
    const chunks = [];
    for (const art of parsed.articles) {
        const full = art.lines.join('\n');
        const base = {
            corpusDomain: source.domain,
            region: source.region,
            subRegion: null,
            sourceType: SOURCE_TYPE.REGULATION, // 法規，非計畫
            planLevel: null,
            planVersion: null,
            reviewCycleYears: null,
            legalBasis: null,
            lawId: source.pcode,
            lawName: source.name,
            lawLevel: source.level,
            category: parsed.category,
            articleNo: art.flno,
            articleLabel: art.label,
            lastAmended: parsed.lastAmended,
            sourceUrl: `https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=${source.pcode}&flno=${art.flno}`,
        };

        if (full.length <= MAX_CHARS) {
            chunks.push({
                id: `${source.pcode}#${art.flno}`,
                ...base,
                paragraphNo: null,
                text: full,
                // 前綴讓 embedding 帶到脈絡，也讓使用者看得懂出處
                embedText: `${source.name} ${art.label}\n${full}`,
                contentHash: sha256(full),
            });
            continue;
        }

        // 二次切：以「項」（line）為界累積，不跨條
        let buf = [];
        let part = 1;
        const flush = () => {
            if (!buf.length) return;
            const text = buf.join('\n');
            chunks.push({
                id: `${source.pcode}#${art.flno}-p${part}`,
                ...base,
                paragraphNo: String(part),
                text,
                embedText: `${source.name} ${art.label}（第 ${part} 段）\n${text}`,
                contentHash: sha256(text),
            });
            part += 1;
            buf = [];
        };
        for (const line of art.lines) {
            if (buf.join('\n').length + line.length > MAX_CHARS) flush();
            buf.push(line);
        }
        flush();
    }
    return chunks;
}

// ── 抓取 ─────────────────────────────────────────────────────────────────
async function fetchAll() {
    const chunks = [];
    const sourceReport = [];

    for (const src of MOJ_SOURCES) {
        process.stdout.write(`fetch ${src.pcode} ${src.name} ... `);
        try {
            const res = await fetch(src.url, {
                headers: { 'User-Agent': 'LightKeepers-RegulationIngest/1.0 (disaster-response NGO)' },
                signal: AbortSignal.timeout(45000),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const html = await res.text();
            const parsed = parseMojLawPage(html);

            // 🔴 已廢止的法規一律不進語料。寧可查無，也不能引用失效條文。
            if (parsed.repealed) {
                sourceReport.push({
                    ...pickSource(src),
                    status: 'repealed-skipped',
                    repealedDate: parsed.repealedDate,
                    category: parsed.category,
                    note: '該法規已廢止，依設計不納入語料。',
                });
                console.log(`SKIPPED（已廢止 ${parsed.repealedDate ?? ''}，類別「${parsed.category}」）`);
                await sleep(1500);
                continue;
            }

            if (!parsed.articles.length) throw new Error('解析不到任何條文');
            const c = chunkArticles(src, parsed);
            chunks.push(...c);
            sourceReport.push({
                ...pickSource(src),
                status: 'ok',
                articles: parsed.articles.length,
                chunks: c.length,
                lastAmended: parsed.lastAmended,
            });
            console.log(`${parsed.articles.length} 條 → ${c.length} chunks（修正 ${parsed.lastAmended}）`);
        } catch (e) {
            sourceReport.push({ ...pickSource(src), status: 'failed', error: String(e.message || e) });
            console.log(`FAILED: ${e.message || e}`);
        }
        await sleep(1500); // 自律 rate limit
    }

    // 授權未確認來源：只登錄書目，不重製內文
    for (const ref of REFERENCE_ONLY_SOURCES) {
        chunks.push({
            id: `ref:${ref.id}`,
            corpusDomain: ref.domain,
            region: ref.region,
            subRegion: ref.subRegion ?? null,
            sourceType: ref.sourceType ?? SOURCE_TYPE.PLAN,
            planLevel: ref.planLevel ?? null,
            planVersion: ref.planVersion ?? null,
            reviewCycleYears: ref.reviewCycleYears ?? null,
            legalBasis: ref.legalBasis ?? null,
            scopeTags: ref.scopeTags ?? [],
            lawId: ref.id,
            lawName: ref.name,
            lawLevel: ref.level,
            category: null,
            articleNo: null,
            articleLabel: null,
            paragraphNo: null,
            lastAmended: null,
            sourceUrl: ref.url,
            referenceOnly: true,
            licenceNote: ref.licenceNote,
            issuer: ref.issuer ?? null,
            text: ref.summary,
            embedText: `${ref.name}（${ref.planVersion ?? ''}）\n${ref.summary}`,
            contentHash: sha256(ref.summary),
        });
        sourceReport.push({
            pcode: ref.id,
            name: ref.name,
            domain: ref.domain,
            region: ref.region,
            sourceType: ref.sourceType,
            planLevel: ref.planLevel,
            planVersion: ref.planVersion,
            legalBasis: ref.legalBasis,
            status: 'reference-only',
            note: ref.licenceNote,
        });
    }

    // 計畫階層的下兩層：僅登錄結構，尚未 ingest 內容（不產生 chunk）
    for (const p of PLAN_HIERARCHY_SOURCES) {
        sourceReport.push({
            pcode: p.id,
            name: p.name,
            domain: p.domain,
            region: p.region ?? null,
            sourceType: p.sourceType,
            planLevel: p.planLevel,
            legalBasis: p.legalBasis,
            status: p.status,
            note: p.note,
        });
    }

    return { chunks, sourceReport };
}

const pickSource = (s) => ({
    pcode: s.pcode,
    name: s.name,
    domain: s.domain,
    region: s.region,
    url: s.url,
});

// ── Embedding ────────────────────────────────────────────────────────────
async function embedTexts(texts) {
    const out = [];
    const BATCH = 8;
    for (let i = 0; i < texts.length; i += BATCH) {
        const batch = texts.slice(i, i + BATCH);
        const res = await fetch(`${LLM_BASE_URL}/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: EMBED_MODEL, input: batch }),
            signal: AbortSignal.timeout(120000),
        });
        if (!res.ok) throw new Error(`embed HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
        const j = await res.json();
        for (const d of j.data) out[i + d.index] = d.embedding;
        process.stdout.write(`\r  embedded ${Math.min(i + BATCH, texts.length)}/${texts.length}`);
    }
    process.stdout.write('\n');
    return out;
}

// ── main ─────────────────────────────────────────────────────────────────
(async () => {
    let corpus;

    if (DO_FETCH) {
        const { chunks, sourceReport } = await fetchAll();
        corpus = {
            schemaVersion: 1,
            attribution: SOURCE_ATTRIBUTION,
            embedModel: null,
            embedDim: null,
            ingestedAt: new Date().toISOString(),
            sourceReport,
            chunks,
        };
        console.log(`\n總計 ${chunks.length} chunks`);
    } else {
        if (!existsSync(OUT_FILE)) {
            console.error('沒有既有 corpus，請先跑 --fetch');
            process.exit(1);
        }
        corpus = JSON.parse(readFileSync(OUT_FILE, 'utf8'));
    }

    if (DO_EMBED) {
        console.log(`embedding via ${LLM_BASE_URL} model=${EMBED_MODEL}`);
        const vectors = await embedTexts(corpus.chunks.map((c) => c.embedText));
        corpus.chunks.forEach((c, i) => {
            c.vector = vectors[i];
        });
        corpus.embedModel = EMBED_MODEL;
        corpus.embedDim = vectors[0]?.length ?? null;
        console.log(`embedDim=${corpus.embedDim}`);
    }

    if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(OUT_FILE, JSON.stringify(corpus), 'utf8');
    console.log(`written → ${OUT_FILE}`);

    console.table(
        corpus.sourceReport.map((s) => ({
            法規: s.name,
            domain: s.domain?.replace('tw-', ''),
            region: s.region,
            狀態: s.status,
            條: s.articles ?? '-',
            chunks: s.chunks ?? '-',
        })),
    );
})();
