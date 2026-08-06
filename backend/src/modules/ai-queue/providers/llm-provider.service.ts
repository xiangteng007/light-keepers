import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeminiProvider } from './gemini.provider';
import { OpenAiCompatibleProvider } from './openai-compatible.provider';
import {
    AiProviderError,
    LlmHealth,
    LlmRequest,
    LlmResponse,
    LlmTextRequest,
    LlmTextResponse,
    LlmVisionRequest,
    LlmVisionResponse,
} from './llm-provider.interface';
import { detectSimplified, withZhTwRetry } from '../prompts/zh-tw-guard';

export type LlmProviderMode = 'gemini' | 'local' | 'hybrid';

export interface LlmStatus {
    mode: LlmProviderMode;
    /** Provider that would serve the next request right now */
    active: 'gemini' | 'local' | 'none';
    providers: {
        local: LlmHealth;
        gemini: LlmHealth;
    };
}

/**
 * Routes LLM traffic between the self-hosted OpenAI-compatible endpoint and
 * Gemini, according to `LLM_PROVIDER`.
 *
 * | LLM_PROVIDER | behaviour                                                        |
 * |--------------|------------------------------------------------------------------|
 * | `gemini`     | Gemini only (default - preserves pre-M.2 behaviour)               |
 * | `local`      | Local only. Failures propagate loudly, never silently downgraded. |
 * | `hybrid`     | Local first with a short reachability probe, Gemini on failure.   |
 *
 * Why hybrid exists (D12/D13): the inference host is a desktop workstation that
 * is NOT guaranteed to be online 24/7. Hybrid keeps the platform serving during
 * an incident even when the workstation is powered off, at the cost of a cloud
 * call. Every downgrade is logged at WARN so the fallback rate is observable.
 *
 * Offline detection is a `GET /models` probe bounded by `LLM_CONNECT_TIMEOUT_MS`
 * (default 3s), and the negative result is cached for `LLM_HEALTH_CACHE_MS`
 * (default 30s) so a powered-off workstation costs at most one 3s probe per
 * 30s window rather than 3s per request.
 */
@Injectable()
export class LlmProviderService {
    private readonly logger = new Logger(LlmProviderService.name);
    private readonly mode: LlmProviderMode;
    private readonly healthCacheMs: number;

    /** Cached probe result, used only in hybrid mode */
    private cachedLocalHealth: LlmHealth | null = null;
    private cachedLocalHealthAt = 0;

    constructor(
        private readonly configService: ConfigService,
        private readonly gemini: GeminiProvider,
        private readonly local: OpenAiCompatibleProvider,
    ) {
        this.mode = this.parseMode(this.configService.get<string>('LLM_PROVIDER'));
        const cacheMs = parseInt(String(this.configService.get('LLM_HEALTH_CACHE_MS') ?? ''), 10);
        this.healthCacheMs = Number.isFinite(cacheMs) && cacheMs >= 0 ? cacheMs : 30000;

        this.logger.log(`LLM provider mode: ${this.mode}`);
        if (this.mode !== 'gemini' && !this.local.isConfigured()) {
            this.logger.warn(
                `LLM_PROVIDER=${this.mode} but LLM_BASE_URL/LLM_MODEL are not set - ` +
                (this.mode === 'hybrid'
                    ? 'all traffic will go to Gemini'
                    : 'every request will fail'),
            );
        }
    }

    getMode(): LlmProviderMode {
        return this.mode;
    }

    /**
     * Whether any provider is configured well enough to be worth calling.
     * Cheap and synchronous - no network access. Callers that must degrade
     * gracefully (e.g. the LINE bot keyword fallback) should check this first.
     */
    isAvailable(): boolean {
        if (this.mode === 'local') return this.local.isConfigured();
        if (this.mode === 'gemini') return this.gemini.isConfigured();
        return this.local.isConfigured() || this.gemini.isConfigured();
    }

    /**
     * Structured (schema-constrained) generation.
     */
    async run(request: LlmRequest): Promise<LlmResponse> {
        return this.dispatch(
            request.useCaseId,
            () => this.local.run(request),
            () => this.gemini.run(request),
        );
    }

    /**
     * Free-form text generation.
     */
    async generateText(request: LlmTextRequest): Promise<LlmTextResponse> {
        const useCaseId = request.useCaseId ?? 'text';
        const first = await this.dispatch(
            useCaseId,
            () => this.local.generateText(request),
            () => this.gemini.generateText(request),
        );
        return this.enforceTraditional(useCaseId, first, () => {
            const retryPrompt = withZhTwRetry(request.prompt);
            return this.dispatch(
                useCaseId,
                () => this.local.generateText({ ...request, prompt: retryPrompt }),
                () => this.gemini.generateText({ ...request, prompt: retryPrompt }),
            );
        });
    }

    /**
     * 繁體中文護欄：偵測到簡體就用加強版 prompt **重試一次**。
     *
     * 只重試一次是刻意的——災防場景不能為了字形無限重試把延遲拉長。
     * 第二次仍是簡體就照樣回傳，但留 WARN 讓退化率可觀測。
     */
    private async enforceTraditional<T extends { text: string }>(
        useCaseId: string,
        first: T,
        retry: () => Promise<T>,
    ): Promise<T> {
        const hit = detectSimplified(first.text);
        if (!hit.detected) return first;

        this.logger.warn(
            `簡體字偵測命中（${useCaseId}）：${hit.hits.join('')} ` +
            `（比例 ${(hit.ratio * 100).toFixed(1)}%）—— 以加強 prompt 重試一次`,
        );

        try {
            const second = await retry();
            const again = detectSimplified(second.text);
            if (again.detected) {
                this.logger.warn(
                    `重試後仍含簡體字（${useCaseId}）：${again.hits.join('')} —— 照原樣回傳`,
                );
            }
            return second;
        } catch (error) {
            // 重試失敗不應該讓整個請求掛掉：第一次的結果雖然是簡體，仍然有內容
            this.logger.warn(
                `繁體重試失敗（${useCaseId}）：${(error as Error).message} —— 回傳第一次結果`,
            );
            return first;
        }
    }

    /**
     * 視覺（多模態）生成。
     *
     * 走與文字完全相同的 dispatch：local 模式失敗即拋（不靜默降級），
     * hybrid 模式本地不可用才退 Gemini。
     *
     * 唯一的差別是 hybrid 下多一層檢查：本地**文字**可用不代表**視覺**可用
     * （少設 LLM_VISION_MODEL 就會這樣）。此時直接走 Gemini，而不是打過去拿 400。
     */
    async generateWithVision(request: LlmVisionRequest): Promise<LlmVisionResponse> {
        const useCaseId = request.useCaseId ?? 'vision';

        if (this.mode === 'hybrid' && !this.local.isVisionConfigured()) {
            this.logger.warn(
                `Local vision not configured (LLM_VISION_MODEL missing) - using Gemini for ${useCaseId}`,
            );
            return this.gemini.generateWithVision(request);
        }

        return this.dispatch(
            useCaseId,
            () => this.local.generateWithVision(request),
            () => this.gemini.generateWithVision(request),
        );
    }

    /**
     * 視覺路徑是否值得呼叫。呼叫端要能優雅降級（例如回 fallback 分類）時先查這個。
     */
    isVisionAvailable(): boolean {
        if (this.mode === 'local') return this.local.isVisionConfigured();
        if (this.mode === 'gemini') return this.gemini.isVisionConfigured();
        return this.local.isVisionConfigured() || this.gemini.isVisionConfigured();
    }

    /**
     * Health snapshot for `/health/llm`. Never throws.
     */
    async healthCheck(): Promise<LlmStatus> {
        const [local, gemini] = await Promise.all([
            this.local.healthCheck(),
            this.gemini.healthCheck(),
        ]);

        // A fresh probe supersedes whatever we had cached
        this.cachedLocalHealth = local;
        this.cachedLocalHealthAt = Date.now();

        let active: LlmStatus['active'] = 'none';
        if (this.mode === 'gemini') {
            active = gemini.configured ? 'gemini' : 'none';
        } else if (this.mode === 'local') {
            active = local.reachable ? 'local' : 'none';
        } else {
            if (local.reachable) active = 'local';
            else if (gemini.configured) active = 'gemini';
        }

        return { mode: this.mode, active, providers: { local, gemini } };
    }

    /** Drops the cached probe result - used by tests and after config reloads. */
    resetHealthCache(): void {
        this.cachedLocalHealth = null;
        this.cachedLocalHealthAt = 0;
    }

    // ---------------------------------------------------------------------
    // Internals
    // ---------------------------------------------------------------------

    private async dispatch<T>(
        useCaseId: string,
        callLocal: () => Promise<T>,
        callGemini: () => Promise<T>,
    ): Promise<T> {
        if (this.mode === 'gemini') {
            return callGemini();
        }

        if (this.mode === 'local') {
            // Explicit failure - no silent downgrade. Operators picked `local` on
            // purpose (data residency / cost), so a Gemini call would be a surprise.
            try {
                return await callLocal();
            } catch (error) {
                this.logger.error(
                    `Local LLM failed for ${useCaseId} and LLM_PROVIDER=local ` +
                    `(no fallback configured): ${(error as Error).message}`,
                );
                throw error;
            }
        }

        // hybrid
        if (!this.local.isConfigured()) {
            return callGemini();
        }

        const health = await this.getLocalHealth();
        if (!health.reachable) {
            this.logger.warn(
                `Local LLM unreachable (${health.error ?? 'unknown'}) - ` +
                `falling back to Gemini for ${useCaseId}`,
            );
            return callGemini();
        }

        try {
            return await callLocal();
        } catch (error) {
            const err = error as AiProviderError;
            // The workstation answered the probe but not the generation. Treat it
            // as unhealthy so the next few requests skip straight to Gemini.
            this.invalidateLocalHealth(err?.message);
            this.logger.warn(
                `Local LLM failed for ${useCaseId} (${err?.code ?? 'UNKNOWN'}: ${err?.message}) - ` +
                'falling back to Gemini',
            );
            return callGemini();
        }
    }

    /**
     * Probe the local endpoint, reusing a recent result if we have one.
     */
    private async getLocalHealth(): Promise<LlmHealth> {
        const now = Date.now();
        if (
            this.cachedLocalHealth &&
            now - this.cachedLocalHealthAt < this.healthCacheMs
        ) {
            return this.cachedLocalHealth;
        }

        const health = await this.local.healthCheck();
        this.cachedLocalHealth = health;
        this.cachedLocalHealthAt = now;
        return health;
    }

    private invalidateLocalHealth(error?: string): void {
        this.cachedLocalHealth = {
            provider: this.local.providerName,
            configured: this.local.isConfigured(),
            reachable: false,
            model: this.local.modelName || undefined,
            baseUrl: this.local.endpoint || undefined,
            error: error ?? 'generation failed',
        };
        this.cachedLocalHealthAt = Date.now();
    }

    private parseMode(raw: string | undefined): LlmProviderMode {
        const value = (raw || '').trim().toLowerCase();
        if (value === 'local' || value === 'hybrid' || value === 'gemini') {
            return value;
        }
        if (value) {
            this.logger.warn(`Unknown LLM_PROVIDER="${raw}", defaulting to "gemini"`);
        }
        return 'gemini';
    }
}
