/**
 * Shared LLM provider contract.
 *
 * Two concrete implementations exist:
 *  - `GeminiProvider`             (cloud, Google Generative Language API)
 *  - `OpenAiCompatibleProvider`   (self-hosted, Ollama / vLLM / LM Studio `/v1`)
 *
 * `LlmProviderService` is the selector that routes between them based on the
 * `LLM_PROVIDER` env var (`gemini` | `local` | `hybrid`).
 */

/**
 * Error types for AI providers.
 *
 * NOTE: these live here (not in `gemini.provider.ts`) so that both the cloud and
 * the local provider can throw the same taxonomy. `gemini.provider.ts` re-exports
 * them for backwards compatibility with existing imports.
 */
export class AiProviderError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly isRetryable: boolean,
    ) {
        super(message);
        this.name = 'AiProviderError';
    }
}

export class RateLimitError extends AiProviderError {
    constructor(message: string, public readonly retryAfterMs?: number) {
        super(message, 'RATE_LIMITED', true);
        this.name = 'RateLimitError';
    }
}

export class ValidationError extends AiProviderError {
    constructor(message: string) {
        super(message, 'VALIDATION_FAILED', false);
        this.name = 'ValidationError';
    }
}

/**
 * Structured (JSON-schema constrained) generation request.
 */
export interface LlmRequest {
    useCaseId: string;
    prompt: string;
    schema: object;
    maxOutputTokens?: number;
}

export interface LlmResponse {
    outputJson: object;
    modelName: string;
    processingTimeMs: number;
}

/**
 * Free-form text generation request (no schema constraint).
 */
export interface LlmTextRequest {
    /** Logical caller id, used for logging only */
    useCaseId?: string;
    prompt: string;
    systemPrompt?: string;
    maxOutputTokens?: number;
    temperature?: number;

    /**
     * Ask the runtime to constrain decoding to valid JSON.
     *
     * Why this exists: several callers (disaster classification, manual search)
     * prompt for JSON in plain text and then `JSON.parse()` the answer. A/B
     * testing against `qwen3:14b` showed the model periodically emits JSON with
     * **unquoted keys** - syntactically invalid, and no amount of prompt wording
     * fixes it reliably. Both runtimes can enforce this at the decoder level
     * (`response_format: json_object` / `responseMimeType: application/json`),
     * so the guarantee should come from the runtime, not from model discipline.
     *
     * Callers must still handle parse failure: `json: true` guarantees the
     * runtime *tried*, not that a stale/degraded endpoint complied.
     */
    json?: boolean;

    /**
     * Optional JSON schema, inlined into the system prompt when `json` is set.
     * Kept separate from `LlmRequest.schema` because this path returns raw text
     * (the caller owns parsing and field validation).
     */
    jsonSchema?: object;
}

export interface LlmTextResponse {
    text: string;
    modelName: string;
    processingTimeMs: number;
}

/**
 * Vision (multimodal) generation request.
 *
 * 影像一律以 base64 傳入，由 provider 決定包裝方式：
 *  - 本地（OpenAI 相容）→ `image_url` 帶 `data:<mime>;base64,<b64>`（Ollama qwen2.5vl 吃這個）
 *  - Gemini            → `inlineData { mimeType, data }`
 * 呼叫端不需要知道差別。
 */
export interface LlmVisionRequest {
    useCaseId?: string;
    systemPrompt?: string;
    prompt: string;
    imageBase64: string;
    mimeType: string;
    /** 要求 JSON 輸出——約束下到解碼層，不靠 prompt 的「只回覆 JSON」 */
    json?: boolean;
    maxOutputTokens?: number;
    temperature?: number;
}

export interface LlmVisionResponse {
    text: string;
    modelName: string;
    processingTimeMs: number;
}

/**
 * Result of a lightweight reachability probe.
 */
export interface LlmHealth {
    /** Provider identifier, e.g. `gemini` / `local` */
    provider: string;
    /** Whether the required env vars are present */
    configured: boolean;
    /** Whether the endpoint answered the probe */
    reachable: boolean;
    latencyMs?: number;
    model?: string;
    baseUrl?: string;
    error?: string;
}

export interface LlmProvider {
    /** Stable provider identifier used in logs and health output */
    readonly providerName: string;

    run(request: LlmRequest): Promise<LlmResponse>;

    generateText(request: LlmTextRequest): Promise<LlmTextResponse>;

    /** 影像輸入生成。本地走 qwen2.5vl，Gemini 走既有 Vision API。 */
    generateWithVision(request: LlmVisionRequest): Promise<LlmVisionResponse>;

    isConfigured(): boolean;

    /** 視覺路徑是否可用（可能與文字路徑分開設定，例如缺 LLM_VISION_MODEL） */
    isVisionConfigured(): boolean;

    /** Cheap reachability probe; must never throw. */
    healthCheck(): Promise<LlmHealth>;
}
