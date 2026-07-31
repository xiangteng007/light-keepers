/**
 * LLM 對測腳手架 (D13)
 * ---------------------------------------------------------------------------
 * 對同一批災情分類測資，分別跑「本地 OpenAI-compatible endpoint」與「Gemini」，
 * 輸出準確率 / 延遲對比表，供 owner 用真實資料做 D13 模型選型決策。
 *
 * 用法：
 *   # 兩邊都跑，用內建測資
 *   LLM_BASE_URL=http://192.168.1.50:11434/v1 LLM_MODEL=qwen2.5:32b-instruct \
 *   GEMINI_API_KEY=xxx \
 *   npx ts-node src/scripts/llm-benchmark.ts
 *
 *   # 只跑本地
 *   npx ts-node src/scripts/llm-benchmark.ts --only=local
 *
 *   # 用自己的測資（JSON 陣列：[{ "description": "...", "expected": "flood" }]）
 *   npx ts-node src/scripts/llm-benchmark.ts --dataset=./fixtures/reports.json
 *
 *   # 每題重複 3 次取中位數延遲
 *   npx ts-node src/scripts/llm-benchmark.ts --repeat=3
 *
 *   # 輸出 CSV 方便貼進試算表
 *   npx ts-node src/scripts/llm-benchmark.ts --csv=./llm-benchmark.csv
 *
 * 旗標：
 *   --only=local|gemini|both   預設 both
 *   --dataset=<path>           測資 JSON；未指定則用內建 20 筆
 *   --repeat=<n>               每題重複次數，預設 1
 *   --limit=<n>                只跑前 n 題
 *   --csv=<path>               另存逐題結果 CSV
 *
 * 注意：本腳本會真的打 API，需要工作站在線 / Gemini key 有效。
 * 不需連線也可執行——缺少組態的 provider 會被跳過並在報表中標示 skipped。
 */

import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

import { GeminiProvider } from '../modules/ai-queue/providers/gemini.provider';
import { OpenAiCompatibleProvider } from '../modules/ai-queue/providers/openai-compatible.provider';
import { LlmProvider } from '../modules/ai-queue/providers/llm-provider.interface';
import { buildClassificationPrompt } from '../modules/line-bot/disaster-report/ai-classification.service';

// ---------------------------------------------------------------------------
// 測資
// ---------------------------------------------------------------------------

export interface BenchmarkCase {
    description: string;
    /** 期望的災害類型代碼 */
    expected: string;
}

/**
 * 內建測資：取自 line-bot 分類的關鍵字 fixture 與既有 spec 案例，
 * 涵蓋 8 種類型 + 邊界情境（多重災害、口語化、無明確關鍵字）。
 * Owner 應以真實 LINE 回報資料替換（--dataset）。
 */
export const DEFAULT_CASES: BenchmarkCase[] = [
    { description: '淹水了，水很深，已經淹到膝蓋', expected: 'flood' },
    { description: '巷口積水嚴重，機車都推不動了', expected: 'flood' },
    { description: '地震了，建築物倒塌', expected: 'earthquake' },
    { description: '剛剛搖很大，家裡櫃子都倒了', expected: 'earthquake' },
    { description: '房子著火了，濃煙一直冒出來', expected: 'fire' },
    { description: '瓦斯氣爆，隔壁整面牆炸開', expected: 'fire' },
    { description: '颱風把屋頂掀掉了，強風還在吹', expected: 'typhoon' },
    { description: '風災導致路樹全倒', expected: 'typhoon' },
    { description: '山區土石流，道路被沖斷', expected: 'landslide' },
    { description: '邊坡坍方有落石掉到路面', expected: 'landslide' },
    { description: '路口發生車禍，兩台車追撞', expected: 'traffic' },
    { description: '國道上有交通事故，車輛回堵', expected: 'traffic' },
    { description: '電線桿倒塌壓到路面', expected: 'infrastructure' },
    { description: '橋墩出現裂縫，看起來有點危險', expected: 'infrastructure' },
    { description: '馬路有很大的坑洞，機車騎過去會摔車', expected: 'infrastructure' },
    { description: '有人受傷需要救護車', expected: 'other' },
    { description: '一般情況，沒什麼特別的', expected: 'other' },
    { description: '停電了，整條街都黑的', expected: 'infrastructure' },
    // 邊界：多重災害，主因應為水災
    { description: '颱風過後淹水，社區地下室全滿了', expected: 'flood' },
    // 邊界：口語、沒有典型關鍵字
    { description: '阿伯家後面那片山昨晚整個垮下來', expected: 'landslide' },
];

// ---------------------------------------------------------------------------
// 執行
// ---------------------------------------------------------------------------

interface CaseResult {
    provider: string;
    index: number;
    description: string;
    expected: string;
    actual: string | null;
    correct: boolean;
    confidence: number | null;
    latencyMs: number;
    error?: string;
}

interface ProviderSummary {
    provider: string;
    model: string;
    skipped: boolean;
    skipReason?: string;
    total: number;
    correct: number;
    errors: number;
    accuracy: number;
    latencyAvgMs: number;
    latencyP50Ms: number;
    latencyP95Ms: number;
}

function parseArgs(argv: string[]): Record<string, string> {
    const args: Record<string, string> = {};
    for (const raw of argv.slice(2)) {
        const match = raw.match(/^--([^=]+)(?:=(.*))?$/);
        if (match) {
            args[match[1]] = match[2] ?? 'true';
        }
    }
    return args;
}

function loadCases(datasetPath?: string, limit?: number): BenchmarkCase[] {
    let cases = DEFAULT_CASES;

    if (datasetPath) {
        const resolved = path.resolve(process.cwd(), datasetPath);
        const parsed = JSON.parse(fs.readFileSync(resolved, 'utf8'));
        if (!Array.isArray(parsed)) {
            throw new Error(`Dataset must be a JSON array: ${resolved}`);
        }
        cases = parsed.map((row: Record<string, string>, i: number) => {
            const description = row.description ?? row.message ?? row.text;
            const expected = row.expected ?? row.type ?? row.label;
            if (!description || !expected) {
                throw new Error(
                    `Dataset row ${i} needs "description" and "expected" (or message/type)`,
                );
            }
            return { description, expected };
        });
    }

    return limit && limit > 0 ? cases.slice(0, limit) : cases;
}

/** 從 LLM 的自由文字輸出中萃取分類 JSON */
export function extractClassification(text: string): { type: string; confidence: number } | null {
    const cleaned = text
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```\s*$/, '')
        .trim();

    // 有些模型會在 JSON 前後多講幾句，抓第一個 {...} 區塊
    const jsonSlice = cleaned.startsWith('{')
        ? cleaned
        : cleaned.slice(cleaned.indexOf('{'), cleaned.lastIndexOf('}') + 1);

    try {
        const parsed = JSON.parse(jsonSlice);
        if (!parsed?.type) return null;
        return {
            type: String(parsed.type),
            confidence: typeof parsed.confidence === 'number' ? parsed.confidence : NaN,
        };
    } catch {
        return null;
    }
}

async function runProvider(
    provider: LlmProvider,
    model: string,
    cases: BenchmarkCase[],
    repeat: number,
): Promise<{ summary: ProviderSummary; results: CaseResult[] }> {
    const name = provider.providerName;

    if (!provider.isConfigured()) {
        return {
            summary: emptySummary(name, model, 'not configured (missing env vars)'),
            results: [],
        };
    }

    const health = await provider.healthCheck();
    if (!health.reachable) {
        return {
            summary: emptySummary(name, model, `unreachable: ${health.error ?? 'unknown'}`),
            results: [],
        };
    }

    const results: CaseResult[] = [];

    for (let i = 0; i < cases.length; i++) {
        const testCase = cases[i];
        const latencies: number[] = [];
        let last: CaseResult | null = null;

        for (let attempt = 0; attempt < repeat; attempt++) {
            const startTime = Date.now();
            try {
                const response = await provider.generateText({
                    useCaseId: 'benchmark.disaster.classify',
                    prompt: buildClassificationPrompt(testCase.description),
                    maxOutputTokens: 512,
                    temperature: 0.2,
                });
                const latencyMs = Date.now() - startTime;
                latencies.push(latencyMs);

                const parsed = extractClassification(response.text);
                last = {
                    provider: name,
                    index: i,
                    description: testCase.description,
                    expected: testCase.expected,
                    actual: parsed?.type ?? null,
                    correct: parsed?.type === testCase.expected,
                    confidence: parsed && Number.isFinite(parsed.confidence) ? parsed.confidence : null,
                    latencyMs,
                    error: parsed ? undefined : 'unparseable response',
                };
            } catch (error) {
                const latencyMs = Date.now() - startTime;
                latencies.push(latencyMs);
                last = {
                    provider: name,
                    index: i,
                    description: testCase.description,
                    expected: testCase.expected,
                    actual: null,
                    correct: false,
                    confidence: null,
                    latencyMs,
                    error: (error as Error).message,
                };
            }
        }

        if (last) {
            // 多次重複時，延遲取中位數（結果取最後一次）
            last.latencyMs = percentile(latencies, 50);
            results.push(last);
            process.stdout.write(last.correct ? '.' : last.error ? 'E' : 'x');
        }
    }
    process.stdout.write('\n');

    const latencies = results.map((r) => r.latencyMs);
    const correct = results.filter((r) => r.correct).length;
    const errors = results.filter((r) => r.error).length;

    return {
        summary: {
            provider: name,
            model,
            skipped: false,
            total: results.length,
            correct,
            errors,
            accuracy: results.length ? correct / results.length : 0,
            latencyAvgMs: average(latencies),
            latencyP50Ms: percentile(latencies, 50),
            latencyP95Ms: percentile(latencies, 95),
        },
        results,
    };
}

function emptySummary(provider: string, model: string, reason: string): ProviderSummary {
    return {
        provider,
        model,
        skipped: true,
        skipReason: reason,
        total: 0,
        correct: 0,
        errors: 0,
        accuracy: 0,
        latencyAvgMs: 0,
        latencyP50Ms: 0,
        latencyP95Ms: 0,
    };
}

function average(values: number[]): number {
    if (!values.length) return 0;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function percentile(values: number[], p: number): number {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
    return sorted[index];
}

// ---------------------------------------------------------------------------
// 報表
// ---------------------------------------------------------------------------

function printComparison(summaries: ProviderSummary[]): void {
    const pad = (s: string, n: number) => s.padEnd(n);
    const num = (s: string, n: number) => s.padStart(n);

    console.log('\n=== D13 LLM 對測結果 ===\n');
    console.log(
        pad('Provider', 10) + pad('Model', 28) + num('Cases', 7) + num('Accuracy', 10) +
        num('Errors', 8) + num('Avg ms', 9) + num('p50 ms', 9) + num('p95 ms', 9),
    );
    console.log('-'.repeat(90));

    for (const s of summaries) {
        if (s.skipped) {
            console.log(
                pad(s.provider, 10) + pad(s.model || '-', 28) + '  SKIPPED - ' + s.skipReason,
            );
            continue;
        }
        console.log(
            pad(s.provider, 10) +
            pad(s.model.substring(0, 27), 28) +
            num(String(s.total), 7) +
            num(`${(s.accuracy * 100).toFixed(1)}%`, 10) +
            num(String(s.errors), 8) +
            num(String(s.latencyAvgMs), 9) +
            num(String(s.latencyP50Ms), 9) +
            num(String(s.latencyP95Ms), 9),
        );
    }

    const active = summaries.filter((s) => !s.skipped);
    if (active.length === 2) {
        const [a, b] = active;
        const accDelta = (a.accuracy - b.accuracy) * 100;
        const latRatio = b.latencyP50Ms ? a.latencyP50Ms / b.latencyP50Ms : 0;
        console.log('\n--- 差異 ---');
        console.log(
            `準確率：${a.provider} ${accDelta >= 0 ? '+' : ''}${accDelta.toFixed(1)} 百分點 vs ${b.provider}`,
        );
        console.log(
            `p50 延遲：${a.provider} 是 ${b.provider} 的 ${latRatio.toFixed(2)}x`,
        );
    }
    console.log('');
}

function printPerCaseDisagreements(results: CaseResult[], cases: BenchmarkCase[]): void {
    const byIndex = new Map<number, CaseResult[]>();
    for (const r of results) {
        if (!byIndex.has(r.index)) byIndex.set(r.index, []);
        byIndex.get(r.index)!.push(r);
    }

    const rows: string[] = [];
    for (const [index, group] of byIndex) {
        const wrong = group.filter((r) => !r.correct);
        if (!wrong.length) continue;
        const detail = group
            .map((r) => `${r.provider}=${r.actual ?? 'ERR'}`)
            .join(' ');
        rows.push(
            `  [${index}] 期望 ${cases[index].expected} | ${detail} | ${cases[index].description}`,
        );
    }

    if (rows.length) {
        console.log('--- 分類錯誤/歧異案例 ---');
        rows.forEach((r) => console.log(r));
        console.log('');
    }
}

function writeCsv(filePath: string, results: CaseResult[]): void {
    const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = 'provider,index,expected,actual,correct,confidence,latency_ms,error,description';
    const lines = results.map((r) =>
        [
            r.provider, r.index, r.expected, r.actual ?? '', r.correct,
            r.confidence ?? '', r.latencyMs, r.error ?? '', r.description,
        ].map(escape).join(','),
    );
    const resolved = path.resolve(process.cwd(), filePath);
    fs.writeFileSync(resolved, [header, ...lines].join('\n'), 'utf8');
    console.log(`逐題結果已寫入 ${resolved}\n`);
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

export async function main(argv: string[] = process.argv): Promise<void> {
    const args = parseArgs(argv);
    const only = (args.only || 'both').toLowerCase();
    const repeat = Math.max(1, parseInt(args.repeat || '1', 10) || 1);
    const limit = parseInt(args.limit || '', 10);

    const cases = loadCases(args.dataset, limit);
    console.log(
        `測資 ${cases.length} 題，每題重複 ${repeat} 次，模式 ${only}\n` +
        `(. = 正確, x = 分類錯誤, E = 呼叫失敗)\n`,
    );

    // ConfigService 直接讀 process.env，不需要啟動整個 Nest app
    const configService = new ConfigService();

    const summaries: ProviderSummary[] = [];
    const allResults: CaseResult[] = [];

    if (only === 'local' || only === 'both') {
        const local = new OpenAiCompatibleProvider(configService);
        console.log(`> local  (${local.modelName || '?'} @ ${local.endpoint || 'unset'})`);
        const { summary, results } = await runProvider(
            local, local.modelName || '(unset)', cases, repeat,
        );
        summaries.push(summary);
        allResults.push(...results);
    }

    if (only === 'gemini' || only === 'both') {
        const gemini = new GeminiProvider(configService);
        console.log('> gemini (gemini-2.0-flash-exp)');
        const { summary, results } = await runProvider(
            gemini, 'gemini-2.0-flash-exp', cases, repeat,
        );
        summaries.push(summary);
        allResults.push(...results);
    }

    printComparison(summaries);
    printPerCaseDisagreements(allResults, cases);

    if (args.csv) {
        writeCsv(args.csv, allResults);
    }
}

/* istanbul ignore next - CLI entrypoint */
if (require.main === module) {
    main().catch((error) => {
        console.error('benchmark failed:', error);
        process.exit(1);
    });
}
