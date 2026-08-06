/**
 * 法規問答 —— grounded 回答編排。
 *
 * 流程：
 *   查詢 → 向量檢索（domain 隔離 + region 過濾）
 *        → 檢索為空／分數過低 → answerable=false，**不呼叫 LLM**（省資源且零捏造風險）
 *        → 有結果 → 把原文餵給 LLM，要求只引用 context
 *        → 🔴 程式層驗證每一則引用（白名單 + 逐字比對），對不上丟棄
 *        → 全數被丟棄 → 降級為 answerable=false
 *
 * 與 `fix/llm-json-and-reg-guard` 的護欄互補：護欄負向擋捏造，本服務正向供正解。
 */
import { Injectable, Logger, Optional } from '@nestjs/common';
import { LlmProviderService } from '../ai-queue/providers/llm-provider.service';
import { RegulationCorpusService } from './regulation-corpus.service';
import { validateCitations } from './citation-validator';
import {
    DISCLAIMER,
    RegulationAnswer,
    RegulationDomain,
    RegulationRegion,
    RetrievalHit,
    STALENESS_WARN_DAYS,
} from './regulation-rag.types';

export interface AskOptions {
    domain: RegulationDomain;
    region?: RegulationRegion;
}

@Injectable()
export class RegulationQaService {
    private readonly logger = new Logger(RegulationQaService.name);

    constructor(
        private readonly corpus: RegulationCorpusService,
        @Optional() private readonly llm?: LlmProviderService,
    ) {}

    async ask(question: string, options: AskOptions): Promise<RegulationAnswer> {
        const started = Date.now();
        const base = {
            domain: options.domain,
            region: options.region ?? null,
            disclaimer: DISCLAIMER,
            attribution: this.corpus.attribution,
        };

        if (!this.corpus.isReady()) {
            return this.notAnswerable(base, started, '法規語料尚未載入，請聯繫系統管理員。', 0);
        }

        const hits = await this.corpus.search(question, { ...options, topK: 6 });
        if (hits.length === 0) {
            return this.notAnswerable(base, started, this.noResultNotice(options.domain), 0);
        }

        // 檢索到了但 LLM 不可用 → 仍然可以把原文直接回給使用者（原文本身就是答案），
        // 只是沒有白話說明。這比整個功能掛掉有用得多。
        if (!this.llm?.isAvailable()) {
            return {
                ...base,
                answerable: true,
                citations: hits
                    .filter((h) => !h.chunk.referenceOnly)
                    .slice(0, 3)
                    .map((h) => ({
                        lawName: h.chunk.lawName,
                        articleLabel: h.chunk.articleLabel,
                        quotedText: h.chunk.text,
                        lastAmended: h.chunk.lastAmended,
                        sourceUrl: h.chunk.sourceUrl,
                        region: h.chunk.region,
                        regionLabel: h.chunk.region,
                    })),
                plainExplanation: null,
                rejectedCitations: 0,
                notice: 'AI 服務目前不可用，以下為檢索到的法規原文，未附白話說明。',
                processingTimeMs: Date.now() - started,
            };
        }

        let rawCitations: unknown = [];
        let explanation: string | null = null;
        try {
            const res = await this.llm.generateText({
                useCaseId: 'regulation.qa.v1',
                prompt: this.buildPrompt(question, hits),
                maxOutputTokens: 1024,
                temperature: 0.1,
            });
            const parsed = this.extractJson(res.text);
            rawCitations = parsed?.citations ?? [];
            explanation =
                typeof parsed?.plainExplanation === 'string' ? parsed.plainExplanation.trim() : null;
        } catch (e) {
            this.logger.warn(`LLM 生成失敗，退回純檢索結果：${e}`);
        }

        // 🔴 程式層驗證 —— 模型說什麼不重要，對得上檢索結果才算數
        const { accepted, rejected } = validateCitations(rawCitations, hits);
        if (rejected.length > 0) {
            this.logger.warn(
                `引用驗證丟棄 ${rejected.length} 筆：${rejected.map((r) => r.reason).join(',')}`,
            );
        }

        if (accepted.length === 0) {
            // 模型一則有效引用都給不出來 → 視同查無，不輸出任何條號
            return this.notAnswerable(
                base,
                started,
                this.noResultNotice(options.domain),
                rejected.length,
            );
        }

        return {
            ...base,
            answerable: true,
            citations: accepted,
            plainExplanation: explanation,
            rejectedCitations: rejected.length,
            notice: this.stalenessNotice(options.domain),
            processingTimeMs: Date.now() - started,
        };
    }

    private notAnswerable(
        base: Pick<RegulationAnswer, 'domain' | 'region' | 'disclaimer' | 'attribution'>,
        started: number,
        notice: string,
        rejected: number,
    ): RegulationAnswer {
        return {
            ...base,
            answerable: false,
            citations: [], // 🔴 查無時絕不輸出任何條號
            plainExplanation: null,
            rejectedCitations: rejected,
            notice,
            processingTimeMs: Date.now() - started,
        };
    }

    private noResultNotice(domain: RegulationDomain): string {
        // 計畫類來源附上版本與法源，讓使用者知道自己該找哪一份、由誰核定
        const refs = this.corpus
            .referenceOnlySources(domain)
            .map((r) => {
                const bits = [`《${r.lawName}》`];
                if (r.planVersion) bits.push(`（${r.planVersion} 年版，現行）`);
                if (r.legalBasis) bits.push(`法源：${r.legalBasis}`);
                bits.push(r.sourceUrl);
                return bits.join(' ');
            })
            .join('；');
        return (
            '本系統語料目前查無相關規定，因此不提供條號以免誤導。' +
            '建議直接查閱全國法規資料庫 https://law.moj.gov.tw/ ，' +
            '或洽詢主管機關（災害防救：內政部消防署；全民防衛動員：國防部）。' +
            (refs ? `另可參考：${refs}` : '')
        );
    }

    private stalenessNotice(domain: RegulationDomain): string | null {
        const days = this.corpus.stalestAmendmentDays(domain);
        if (days === null || days < STALENESS_WARN_DAYS) return null;
        return (
            `注意：本語料中最舊的一部法規距最後修正已逾 ${Math.floor(days / 365)} 年，` +
            '請點擊出處連結確認是否為現行條文。'
        );
    }

    /** 只把檢索到的原文餵給模型，並明確禁止引用 context 以外的任何法規 */
    private buildPrompt(question: string, hits: RetrievalHit[]): string {
        const context = hits
            .map((h, i) => {
                const c = h.chunk;
                if (c.referenceOnly) {
                    return `[${i + 1}] 《${c.lawName}》（本系統未收錄全文，僅供背景參考，**不得引用其文字**）\n${c.text}`;
                }
                return `[${i + 1}] 法規：${c.lawName}｜條號：${c.articleLabel}｜修正日期：${c.lastAmended ?? '未載'}\n原文：\n${c.text}`;
            })
            .join('\n\n');

        return `你是台灣災害防救與全民防衛動員法規的查詢助理。

以下是從台灣官方法規語料庫檢索到的條文，這是你唯一可以使用的資料來源：

${context}

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

    private extractJson(text: string): { citations?: unknown; plainExplanation?: unknown } | null {
        if (!text) return null;
        const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        const candidate = fenced ? fenced[1] : text;
        const start = candidate.indexOf('{');
        const end = candidate.lastIndexOf('}');
        if (start === -1 || end <= start) return null;
        try {
            return JSON.parse(candidate.slice(start, end + 1));
        } catch {
            return null;
        }
    }
}
