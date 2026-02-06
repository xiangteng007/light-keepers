import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Error types for AI provider
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

export interface GeminiRequest {
    useCaseId: string;
    prompt: string;
    schema: object;
    maxOutputTokens?: number;
}

export interface GeminiResponse {
    outputJson: object;
    modelName: string;
    processingTimeMs: number;
}

/**
 * Gemini API Provider
 * Wraps Gemini API calls with schema validation and error handling
 */
@Injectable()
export class GeminiProvider {
    private readonly logger = new Logger(GeminiProvider.name);
    private readonly apiKey: string;
    // v1beta required for structured JSON output (responseMimeType/responseSchema)
    private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

    constructor(private configService: ConfigService) {
        this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    }

    /**
     * Execute a Gemini API call with schema validation
     */
    async run(request: GeminiRequest): Promise<GeminiResponse> {
        const startTime = Date.now();
        // Use gemini-2.0-flash-exp which supports structured JSON output (responseMimeType/responseSchema)
        const modelName = 'gemini-2.0-flash-exp';

        if (!this.apiKey) {
            throw new AiProviderError('Gemini API key not configured', 'NOT_CONFIGURED', false);
        }

        const url = `${this.baseUrl}/models/${modelName}:generateContent?key=${this.apiKey}`;

        const body = {
            contents: [{
                parts: [{ text: request.prompt }],
            }],
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: request.schema,
                maxOutputTokens: request.maxOutputTokens || 2048,
                temperature: 0.3,
            },
        };

        try {
            this.logger.debug(`Calling Gemini API for ${request.useCaseId}`);

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(30000), // 30s timeout
            });

            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After');
                const retryAfterMs = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
                throw new RateLimitError('Gemini rate limit exceeded', retryAfterMs);
            }

            if (response.status === 503) {
                throw new AiProviderError('Gemini service unavailable', 'SERVICE_UNAVAILABLE', true);
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new AiProviderError(
                    `Gemini API error: ${response.status} - ${errorText}`,
                    'API_ERROR',
                    response.status >= 500,
                );
            }

            const data = await response.json();
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!content) {
                throw new ValidationError('Empty response from Gemini');
            }

            // Parse JSON response
            let outputJson: object;
            try {
                outputJson = JSON.parse(content);
            } catch (e) {
                throw new ValidationError(`Invalid JSON response: ${content.substring(0, 200)}`);
            }

            // Validate against schema (basic validation)
            if (!this.validateSchema(outputJson, request.schema)) {
                throw new ValidationError('Response does not match expected schema');
            }

            return {
                outputJson,
                modelName,
                processingTimeMs: Date.now() - startTime,
            };

        } catch (error) {
            if (error instanceof AiProviderError) {
                throw error;
            }

            if (error.name === 'AbortError' || error.name === 'TimeoutError') {
                throw new AiProviderError('Gemini request timeout', 'TIMEOUT', true);
            }

            throw new AiProviderError(
                `Gemini request failed: ${error.message}`,
                'UNKNOWN_ERROR',
                false,
            );
        }
    }

    /**
     * Basic schema validation
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private validateSchema(data: object, schema: any): boolean {
        if (!schema.properties) return true;

        const required = schema.required || [];
        for (const field of required) {
            if (!(field in data)) {
                this.logger.warn(`Missing required field: ${field}`);
                return false;
            }
        }

        return true;
    }

    /**
     * Check if provider is configured
     */
    isConfigured(): boolean {
        return !!this.apiKey;
    }

    /**
     * Execute a Gemini API call with image input (Vision API)
     */
    async generateWithImage(options: {
        systemPrompt: string;
        userPrompt: string;
        imageUrl?: string;
        imageBase64?: string;
        mimeType: string;
        outputSchema?: object;
        maxOutputTokens?: number;
    }): Promise<{ success: boolean; data?: unknown; error?: string }> {
        const startTime = Date.now();
        const modelName = 'gemini-2.0-flash-exp';

        if (!this.apiKey) {
            return { success: false, error: 'Gemini API key not configured' };
        }

        const url = `${this.baseUrl}/models/${modelName}:generateContent?key=${this.apiKey}`;

        // Build image part
        let imagePart: { inlineData: { mimeType: string; data: string } } | undefined;
        if (options.imageBase64) {
            imagePart = {
                inlineData: {
                    mimeType: options.mimeType,
                    data: options.imageBase64,
                },
            };
        } else if (options.imageUrl) {
            // Fetch image and convert to base64
            try {
                const imageResponse = await fetch(options.imageUrl);
                const imageBuffer = await imageResponse.arrayBuffer();
                const base64 = Buffer.from(imageBuffer).toString('base64');
                imagePart = {
                    inlineData: {
                        mimeType: options.mimeType,
                        data: base64,
                    },
                };
            } catch (error) {
                return { success: false, error: `Failed to fetch image: ${(error as Error).message}` };
            }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body: any = {
            systemInstruction: {
                parts: [{ text: options.systemPrompt }],
            },
            contents: [{
                parts: [
                    imagePart,
                    { text: options.userPrompt },
                ],
            }],
            generationConfig: {
                maxOutputTokens: options.maxOutputTokens || 4096,
                temperature: 0.3,
            },
        };

        // Add JSON schema if provided
        if (options.outputSchema) {
            body.generationConfig.responseMimeType = 'application/json';
            body.generationConfig.responseSchema = options.outputSchema;
        }

        try {
            this.logger.debug(`Calling Gemini Vision API`);

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(60000), // 60s timeout for image processing
            });

            if (!response.ok) {
                const errorText = await response.text();
                return { success: false, error: `Gemini API error: ${response.status} - ${errorText}` };
            }

            const data = await response.json();
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!content) {
                return { success: false, error: 'Empty response from Gemini Vision' };
            }

            // Parse JSON if schema was provided
            if (options.outputSchema) {
                try {
                    const parsed = JSON.parse(content);
                    this.logger.debug(`Vision API processed in ${Date.now() - startTime}ms`);
                    return { success: true, data: parsed };
                } catch {
                    return { success: false, error: 'Invalid JSON from Vision API' };
                }
            }

            return { success: true, data: content };
        } catch (error) {
            this.logger.error('Vision API error', error);
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * Execute a Gemini API call with audio input (Voice API)
     */
    async generateWithAudio(options: {
        systemPrompt: string;
        userPrompt: string;
        audioBase64: string;
        mimeType: string;
        outputSchema?: object;
        maxOutputTokens?: number;
    }): Promise<{ success: boolean; data?: unknown; error?: string }> {
        const startTime = Date.now();
        const modelName = 'gemini-2.0-flash-exp';

        if (!this.apiKey) {
            return { success: false, error: 'Gemini API key not configured' };
        }

        const url = `${this.baseUrl}/models/${modelName}:generateContent?key=${this.apiKey}`;

        const audioPart = {
            inlineData: {
                mimeType: options.mimeType,
                data: options.audioBase64,
            },
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body: any = {
            systemInstruction: {
                parts: [{ text: options.systemPrompt }],
            },
            contents: [{
                parts: [
                    audioPart,
                    { text: options.userPrompt },
                ],
            }],
            generationConfig: {
                maxOutputTokens: options.maxOutputTokens || 4096,
                temperature: 0.2,
            },
        };

        if (options.outputSchema) {
            body.generationConfig.responseMimeType = 'application/json';
            body.generationConfig.responseSchema = options.outputSchema;
        }

        try {
            this.logger.debug(`Calling Gemini Audio API`);

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(90000), // 90s timeout for audio
            });

            if (!response.ok) {
                const errorText = await response.text();
                return { success: false, error: `Gemini API error: ${response.status} - ${errorText}` };
            }

            const data = await response.json();
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!content) {
                return { success: false, error: 'Empty response from Gemini Audio' };
            }

            if (options.outputSchema) {
                try {
                    const parsed = JSON.parse(content);
                    this.logger.debug(`Audio API processed in ${Date.now() - startTime}ms`);
                    return { success: true, data: parsed };
                } catch {
                    return { success: false, error: 'Invalid JSON from Audio API' };
                }
            }

            return { success: true, data: content };
        } catch (error) {
            this.logger.error('Audio API error', error);
            return { success: false, error: (error as Error).message };
        }
    }
}

