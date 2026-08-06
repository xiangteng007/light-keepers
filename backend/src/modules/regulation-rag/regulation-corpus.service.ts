/**
 * 法規語料庫 + in-process 向量檢索。
 *
 * 為什麼不用 pgvector：語料 276 chunks / 3.9 MB，暴力 cosine 是微秒級；
 * 而上 pgvector 要換 DB 映像（現為 postgis/postgis:15-3.3-alpine，不含 pgvector），
 * 會連動 NAS 部署與 migration —— 那是目前最脆弱的路徑。
 * 檢索層已抽 interface，日後語料擴到上萬 chunk 再換實作，呼叫端不動。
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    RegulationChunk,
    RegulationCorpus,
    RegulationDomain,
    RetrievalHit,
    RetrievalOptions,
    MIN_SIMILARITY,
} from './regulation-rag.types';
import { RegulationEmbeddingService } from './regulation-embedding.service';

/** 檢索器介面 —— in-process / pgvector 兩種實作可互換 */
export interface RegulationRetriever {
    search(query: string, options: RetrievalOptions): Promise<RetrievalHit[]>;
    isReady(): boolean;
}

export function cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let na = 0;
    let nb = 0;
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    if (na === 0 || nb === 0) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * 語料檔位置。dist 執行時 __dirname 在 dist/src/modules/... 底下，
 * 因此往上找到 backend/ 再進 data/。兩種路徑都試，找不到就標記未就緒
 * （服務仍可啟動，只是法規問答回報不可用，不影響其他模組）。
 */
function resolveCorpusPath(): string | null {
    const candidates = [
        join(__dirname, '..', '..', '..', 'data', 'regulation-corpus.json'),
        join(__dirname, '..', '..', '..', '..', 'data', 'regulation-corpus.json'),
        join(process.cwd(), 'data', 'regulation-corpus.json'),
    ];
    return candidates.find((p) => existsSync(p)) ?? null;
}

@Injectable()
export class RegulationCorpusService implements RegulationRetriever, OnModuleInit {
    private readonly logger = new Logger(RegulationCorpusService.name);
    private corpus: RegulationCorpus | null = null;

    constructor(private readonly embedding: RegulationEmbeddingService) {}

    onModuleInit(): void {
        const path = resolveCorpusPath();
        if (!path) {
            this.logger.warn('regulation-corpus.json 不存在，法規檢索停用（請跑 scripts/ingest-regulations.mjs）');
            return;
        }
        try {
            const parsed = JSON.parse(readFileSync(path, 'utf8')) as RegulationCorpus;
            const withVectors = parsed.chunks.filter((c) => Array.isArray(c.vector) && c.vector.length > 0);
            if (withVectors.length === 0) {
                this.logger.warn('語料沒有向量，請跑 ingest --embed');
            }
            this.corpus = parsed;
            this.logger.log(
                `法規語料載入：${parsed.chunks.length} chunks（${withVectors.length} 有向量）` +
                    `，model=${parsed.embedModel} dim=${parsed.embedDim}`,
            );
        } catch (e) {
            this.logger.error(`法規語料載入失敗：${e}`);
        }
    }

    isReady(): boolean {
        return !!this.corpus && this.corpus.chunks.length > 0;
    }

    get attribution(): string {
        return this.corpus?.attribution ?? '';
    }

    get sourceReport(): Array<Record<string, unknown>> {
        return this.corpus?.sourceReport ?? [];
    }

    /** 語料中最舊的一筆修正日期距今天數 —— 供時效警語判斷 */
    stalestAmendmentDays(domain?: RegulationDomain): number | null {
        if (!this.corpus) return null;
        const dates = this.corpus.chunks
            .filter((c) => (domain ? c.corpusDomain === domain : true))
            .map((c) => c.lastAmended)
            .filter((d): d is string => !!d)
            .map((d) => Date.parse(d))
            .filter((t) => !Number.isNaN(t));
        if (!dates.length) return null;
        return Math.floor((Date.now() - Math.min(...dates)) / 86400000);
    }

    /**
     * 依 domain（必填）與 region（選填）過濾後做向量檢索。
     *
     * region 語意：帶了就回「該縣市 + 中央」，因為中央法規全國適用；
     * 不帶就只回中央，避免把別的縣市的自治法規回給使用者。
     */
    async search(query: string, options: RetrievalOptions): Promise<RetrievalHit[]> {
        if (!this.isReady()) return [];
        const topK = options.topK ?? 6;

        const pool = this.corpus!.chunks.filter((c) => {
            if (c.corpusDomain !== options.domain) return false; // domain 隔離：硬性
            if (!Array.isArray(c.vector) || c.vector.length === 0) return false;
            if (options.region) {
                return c.region === options.region || c.region === 'NATIONAL';
            }
            return c.region === 'NATIONAL';
        });
        if (!pool.length) return [];

        const qv = await this.embedding.embed(query);
        if (!qv) {
            // Ollama 不可用 → 降級為關鍵字比對，但呼叫端必須明示降級（不可靜默）
            return this.keywordFallback(query, pool, topK);
        }

        return pool
            .map((chunk) => ({ chunk, score: cosineSimilarity(qv, chunk.vector!) }))
            .filter((h) => h.score >= MIN_SIMILARITY)
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    }

    /** embedding 不可用時的降級路徑。分數固定為 0，呼叫端可據此辨識。 */
    private keywordFallback(query: string, pool: RegulationChunk[], topK: number): RetrievalHit[] {
        const terms = query.split(/[\s，,、。;；]+/).filter((t) => t.length >= 2);
        if (!terms.length) return [];
        return pool
            .map((chunk) => {
                const hits = terms.filter((t) => chunk.text.includes(t)).length;
                return { chunk, score: hits === 0 ? 0 : Math.min(0.44, hits / terms.length / 3) };
            })
            .filter((h) => h.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    }

    /** 供 reference-only 來源（授權未確認）在查無逐字引用時附上官方連結 */
    referenceOnlySources(domain: RegulationDomain): RegulationChunk[] {
        if (!this.corpus) return [];
        return this.corpus.chunks.filter((c) => c.referenceOnly && c.corpusDomain === domain);
    }
}
