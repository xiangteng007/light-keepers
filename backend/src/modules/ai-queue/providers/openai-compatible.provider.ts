import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    AiProviderError,
    LlmHealth,
    LlmProvider,
    LlmRequest,
    LlmResponse,
    LlmTextRequest,
    LlmTextResponse,
    LlmVisionRequest,
    LlmVisionResponse,
    RateLimitError,
    ValidationError,
} from './llm-provider.interface';

/**
 * OpenAI-compatible LLM provider (self-hosted inference).
 *
 * Target deployment (D12/D13): an on-prem RTX 5090 workstation running Ollama,
 * exposing the OpenAI-compatible surface at `http://<host>:11434/v1`.
 * Candidate models: Qwen2.5-32B-Instruct / Qwen2.5-14B-Instruct.
 *
 * Also works unchanged against vLLM, LM Studio, llama.cpp server, LiteLLM, or
 * any other `/v1/chat/completions` endpoint.
 *
 * Deliberately uses native `fetch` rather than the `openai` SDK - the wire
 * format we need is a single POST, and avoiding the dependency keeps the
 * backend bundle (and the Cloud Run cold start) smaller.
 *
 * Env configuration:
 *   LLM_BASE_URL             e.g. http://192.168.1.50:11434/v1   (required)
 *   LLM_MODEL                e.g. qwen2.5:32b-instruct           (required)
 *   LLM_API_KEY              optional - Ollama ignores it, vLLM/LiteLLM may not
 *   LLM_CONNECT_TIMEOUT_MS   probe timeout, default 3000  (workstation offline detection)
 *   LLM_TIMEOUT_MS           generation timeout, default 60000
 *   LLM_MAX_RETRIES          retries for retryable failures, default 1
 */
/**
 * 預設輸出上限。原本是 2048，2026-08-12 因換 qwen3.5:9b 調到 8192。
 *
 * qwen3.5 是 thinking 模型，reasoning 會先吃掉 max_tokens 才輪到 content，而
 * Ollama 的 OpenAI-compatible 端點**沒有**可用的 thinking 關閉開關（實測
 * top-level `think:false` 反而讓 reasoning 衝到 8997 字元且 content 全空；
 * `chat_template_kwargs.enable_thinking:false` 被直接忽略）。
 *
 * 後果不是變慢而是**靜默失敗**：finish_reason='length'、content=''，這裡的
 * `JSON.parse` 就丟 ValidationError('Invalid JSON response from local LLM')。
 * 實測（短英文 prompt，最容易誘發長 reasoning）：2048 → 空回應 2/8；8192 → 0/8。
 * LK 自己的 zh-TW 長 prompt 兩者都 0/8，但短 prompt 的使用情境仍在，故拉高預設。
 */
const DEFAULT_MAX_OUTPUT_TOKENS = 8192;

@Injectable()
export class OpenAiCompatibleProvider implements LlmProvider {
    readonly providerName = 'local';

    private readonly logger = new Logger(OpenAiCompatibleProvider.name);
    private readonly baseUrl: string;
    private readonly model: string;
    /** 視覺模型（LLM_VISION_MODEL），與文字模型分開設定 */
    private readonly visionModel: string;
    private readonly apiKey: string;
    private readonly connectTimeoutMs: number;
    private readonly requestTimeoutMs: number;
    private readonly maxRetries: number;

    constructor(private readonly configService: ConfigService) {
        // Strip trailing slashes so `${baseUrl}/chat/completions` is always well formed
        this.baseUrl = (this.configService.get<string>('LLM_BASE_URL') || '').replace(/\/+$/, '');
        this.model = this.configService.get<string>('LLM_MODEL') || '';
        this.visionModel = this.configService.get<string>('LLM_VISION_MODEL') || '';
        // Ollama accepts (and ignores) any key; keep a placeholder so the header is always valid
        this.apiKey = this.configService.get<string>('LLM_API_KEY') || '';
        this.connectTimeoutMs = this.toInt(this.configService.get('LLM_CONNECT_TIMEOUT_MS'), 3000);
        this.requestTimeoutMs = this.toInt(this.configService.get('LLM_TIMEOUT_MS'), 60000);
        // 0 is meaningful here ("never retry"), so allow it - unlike the timeouts
        this.maxRetries = this.toInt(this.configService.get('LLM_MAX_RETRIES'), 1, 0);

        if (!this.baseUrl) {
            this.logger.debug('LLM_BASE_URL not configured - local provider disabled');
        }
    }

    isConfigured(): boolean {
        return !!this.baseUrl && !!this.model;
    }

    get modelName(): string {
        return this.model;
    }

    get endpoint(): string {
        return this.baseUrl;
    }

    /**
     * Cheap reachability probe against `GET /models`, bounded by the *connect*
     * timeout (default 3s) rather than the generation timeout.
     *
     * This is what makes hybrid mode usable against a desktop workstation that is
     * not guaranteed to be online: we pay at most `LLM_CONNECT_TIMEOUT_MS` before
     * deciding to fall back, instead of blocking for the full generation timeout.
     *
     * Never throws.
     */
    async healthCheck(): Promise<LlmHealth> {
        const base: LlmHealth = {
            provider: this.providerName,
            configured: this.isConfigured(),
            reachable: false,
            model: this.model || undefined,
            baseUrl: this.baseUrl || undefined,
        };

        if (!this.isConfigured()) {
            return { ...base, error: 'LLM_BASE_URL / LLM_MODEL not configured' };
        }

        const startTime = Date.now();
        try {
            const response = await fetch(`${this.baseUrl}/models`, {
                method: 'GET',
                headers: this.buildHeaders(),
                signal: AbortSignal.timeout(this.connectTimeoutMs),
            });

            if (!response.ok) {
                return {
                    ...base,
                    latencyMs: Date.now() - startTime,
                    error: `probe returned HTTP ${response.status}`,
                };
            }

            return { ...base, reachable: true, latencyMs: Date.now() - startTime };
        } catch (error) {
            return {
                ...base,
                latencyMs: Date.now() - startTime,
                error: this.describeError(error),
            };
        }
    }

    /**
     * Structured generation. Mirrors `GeminiProvider.run()` so the two are
     * interchangeable from a use case's point of view.
     *
     * JSON is enforced two ways, because `json_schema` response_format support
     * varies by runtime (Ollama supports `json_object`, vLLM supports both):
     *  1. `response_format: { type: 'json_object' }` on the request
     *  2. the schema is inlined into the system prompt
     * The response is then parsed and checked against `schema.required`.
     */
    async run(request: LlmRequest): Promise<LlmResponse> {
        const startTime = Date.now();

        if (!this.isConfigured()) {
            throw new AiProviderError(
                'Local LLM not configured (LLM_BASE_URL / LLM_MODEL)',
                'NOT_CONFIGURED',
                false,
            );
        }

        const systemPrompt = [
            'You are a JSON API. Reply with a single JSON object and nothing else.',
            'Do not wrap the output in markdown code fences.',
            'The object MUST conform to this JSON schema:',
            JSON.stringify(request.schema),
        ].join('\n');

        const content = await this.chatCompletion({
            useCaseId: request.useCaseId,
            systemPrompt,
            prompt: request.prompt,
            maxOutputTokens: request.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
            temperature: 0.3,
            jsonMode: true,
        });

        let outputJson: object;
        try {
            outputJson = JSON.parse(this.stripCodeFence(content));
        } catch {
            throw new ValidationError(
                `Invalid JSON response from local LLM: ${content.substring(0, 200)}`,
            );
        }

        if (!this.validateSchema(outputJson, request.schema)) {
            throw new ValidationError('Response does not match expected schema');
        }

        return {
            outputJson,
            modelName: this.model,
            processingTimeMs: Date.now() - startTime,
        };
    }

    /**
     * Free-form text generation.
     */
    async generateText(request: LlmTextRequest): Promise<LlmTextResponse> {
        const startTime = Date.now();

        if (!this.isConfigured()) {
            throw new AiProviderError(
                'Local LLM not configured (LLM_BASE_URL / LLM_MODEL)',
                'NOT_CONFIGURED',
                false,
            );
        }

        // `json: true` turns on the same decoder-level constraint that `run()` uses.
        // When a schema is supplied we also inline it, mirroring `run()`'s system prompt.
        const systemPrompt = request.json
            ? [
                request.systemPrompt,
                'Reply with a single valid JSON object and nothing else.',
                'All keys and string values MUST be wrapped in double quotes.',
                'Do not wrap the output in markdown code fences.',
                request.jsonSchema
                    ? `The object MUST conform to this JSON schema:\n${JSON.stringify(request.jsonSchema)}`
                    : undefined,
            ]
                .filter(Boolean)
                .join('\n')
            : request.systemPrompt;

        const text = await this.chatCompletion({
            useCaseId: request.useCaseId,
            systemPrompt,
            prompt: request.prompt,
            maxOutputTokens: request.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
            temperature: request.temperature ?? 0.3,
            jsonMode: request.json === true,
        });

        return {
            text,
            modelName: this.model,
            processingTimeMs: Date.now() - startTime,
        };
    }

    /**
     * 視覺生成 —— OpenAI 相容的多模態 content 陣列，對應 Ollama 的 qwen2.5vl。
     *
     * 影像以 `data:<mime>;base64,<b64>` 形式放進 `image_url`。刻意不傳外部 URL：
     * 讓 Ollama 去抓圖等於把「零雲端」破口開在模型端，且 NAS 與工作站的
     * 網路可達性不同，圖抓不到會變成難查的偶發失敗。
     */
    async generateWithVision(request: LlmVisionRequest): Promise<LlmVisionResponse> {
        const startTime = Date.now();

        if (!this.isVisionConfigured()) {
            throw new AiProviderError(
                'Local vision not configured (need LLM_BASE_URL + LLM_VISION_MODEL)',
                'NOT_CONFIGURED',
                false,
            );
        }

        const text = await this.chatCompletion({
            useCaseId: request.useCaseId,
            systemPrompt: request.systemPrompt,
            prompt: request.prompt,
            maxOutputTokens: request.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
            temperature: request.temperature ?? 0.2,
            jsonMode: request.json === true,
            modelOverride: this.visionModel,
            userContent: [
                { type: 'text', text: request.prompt },
                {
                    type: 'image_url',
                    image_url: {
                        url: `data:${request.mimeType};base64,${request.imageBase64}`,
                    },
                },
            ],
        });

        return {
            text,
            modelName: this.visionModel,
            processingTimeMs: Date.now() - startTime,
        };
    }

    isVisionConfigured(): boolean {
        return !!this.baseUrl && !!this.visionModel;
    }

    get visionModelName(): string {
        return this.visionModel;
    }

    // ---------------------------------------------------------------------
    // Internals
    // ---------------------------------------------------------------------

    /**
     * POST /chat/completions with bounded retries on retryable failures.
     */
    private async chatCompletion(options: {
        useCaseId?: string;
        systemPrompt?: string;
        prompt: string;
        maxOutputTokens: number;
        temperature: number;
        jsonMode: boolean;
        /** 視覺路徑用：改掛在 user message 上的多模態 content 陣列 */
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        userContent?: any;
        /** 視覺路徑用：改用 LLM_VISION_MODEL 而非文字模型 */
        modelOverride?: string;
    }): Promise<string> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const messages: Array<{ role: string; content: any }> = [];
        if (options.systemPrompt) {
            messages.push({ role: 'system', content: options.systemPrompt });
        }
        messages.push({ role: 'user', content: options.userContent ?? options.prompt });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body: any = {
            model: options.modelOverride ?? this.model,
            messages,
            max_tokens: options.maxOutputTokens,
            temperature: options.temperature,
            stream: false,
        };
        if (options.jsonMode) {
            body.response_format = { type: 'json_object' };
        }

        let lastError: AiProviderError | undefined;

        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                return await this.postOnce(body, options.useCaseId);
            } catch (error) {
                const providerError =
                    error instanceof AiProviderError
                        ? error
                        : new AiProviderError(
                            `Local LLM request failed: ${this.describeError(error)}`,
                            'UNKNOWN_ERROR',
                            false,
                        );

                lastError = providerError;

                if (!providerError.isRetryable || attempt >= this.maxRetries) {
                    throw providerError;
                }

                const backoffMs = 500 * (attempt + 1);
                this.logger.warn(
                    `Local LLM attempt ${attempt + 1}/${this.maxRetries + 1} failed ` +
                    `(${providerError.code}), retrying in ${backoffMs}ms`,
                );
                await this.sleep(backoffMs);
            }
        }

        /* istanbul ignore next - loop always returns or throws */
        throw lastError ?? new AiProviderError('Local LLM request failed', 'UNKNOWN_ERROR', false);
    }

    private async postOnce(body: unknown, useCaseId?: string): Promise<string> {
        this.logger.debug(
            `Calling local LLM (${this.model}) for ${useCaseId ?? 'adhoc'} at ${this.baseUrl}`,
        );

        let response: Response;
        try {
            response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: this.buildHeaders(),
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(this.requestTimeoutMs),
            });
        } catch (error) {
            const name = (error as Error)?.name;
            if (name === 'AbortError' || name === 'TimeoutError') {
                throw new AiProviderError('Local LLM request timeout', 'TIMEOUT', true);
            }
            // ECONNREFUSED / EHOSTUNREACH / DNS failure - the workstation is very
            // likely powered off. Retryable so hybrid mode can decide what to do.
            throw new AiProviderError(
                `Local LLM unreachable: ${this.describeError(error)}`,
                'UNREACHABLE',
                true,
            );
        }

        if (response.status === 429) {
            const retryAfter = response.headers?.get?.('Retry-After');
            const retryAfterMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 30000;
            throw new RateLimitError('Local LLM rate limit exceeded', retryAfterMs);
        }

        if (response.status === 503) {
            throw new AiProviderError('Local LLM service unavailable', 'SERVICE_UNAVAILABLE', true);
        }

        if (!response.ok) {
            const errorText = await this.safeText(response);
            throw new AiProviderError(
                `Local LLM API error: ${response.status} - ${errorText}`,
                'API_ERROR',
                response.status >= 500,
            );
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;

        if (!content || typeof content !== 'string' || !content.trim()) {
            throw new ValidationError('Empty response from local LLM');
        }

        return content.trim();
    }

    private buildHeaders(): Record<string, string> {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (this.apiKey) {
            headers.Authorization = `Bearer ${this.apiKey}`;
        }
        return headers;
    }

    /**
     * Some runtimes still emit ```json fences even in JSON mode.
     */
    private stripCodeFence(text: string): string {
        return text
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/```\s*$/, '')
            .trim();
    }

    /**
     * Basic required-field validation, matching `GeminiProvider.validateSchema`.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private validateSchema(data: object, schema: any): boolean {
        if (!schema?.properties) return true;

        const required: string[] = schema.required || [];
        for (const field of required) {
            if (!(field in data)) {
                this.logger.warn(`Missing required field: ${field}`);
                return false;
            }
        }

        return true;
    }

    private async safeText(response: Response): Promise<string> {
        try {
            return (await response.text()).substring(0, 300);
        } catch {
            return '<unreadable body>';
        }
    }

    private describeError(error: unknown): string {
        const err = error as { name?: string; message?: string; cause?: { code?: string } };
        if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
            return `timeout after ${this.connectTimeoutMs}ms`;
        }
        return err?.cause?.code || err?.message || String(error);
    }

    private toInt(value: unknown, fallback: number, min = 1): number {
        const parsed = parseInt(String(value ?? ''), 10);
        return Number.isFinite(parsed) && parsed >= min ? parsed : fallback;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
