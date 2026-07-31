import { ConfigService } from '@nestjs/config';
import { OpenAiCompatibleProvider } from './openai-compatible.provider';
import { AiProviderError, RateLimitError, ValidationError } from './llm-provider.interface';

const SCHEMA = {
    type: 'object',
    properties: {
        type: { type: 'string' },
        confidence: { type: 'number' },
    },
    required: ['type', 'confidence'],
};

function makeConfig(overrides: Record<string, string> = {}): ConfigService {
    const values: Record<string, string> = {
        LLM_BASE_URL: 'http://workstation.local:11434/v1',
        LLM_MODEL: 'qwen2.5:32b-instruct',
        LLM_MAX_RETRIES: '0',
        ...overrides,
    };
    return { get: (key: string) => values[key] } as unknown as ConfigService;
}

function chatResponse(content: string) {
    return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => ({ choices: [{ message: { content } }] }),
        text: async () => content,
    };
}

function errorResponse(status: number, body = 'boom', headers: Record<string, string> = {}) {
    return {
        ok: false,
        status,
        headers: { get: (k: string) => headers[k] ?? null },
        json: async () => ({}),
        text: async () => body,
    };
}

describe('OpenAiCompatibleProvider', () => {
    let fetchMock: jest.Mock;

    beforeEach(() => {
        fetchMock = jest.fn();
        global.fetch = fetchMock as unknown as typeof fetch;
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('configuration', () => {
        it('is configured when base url and model are present', () => {
            expect(new OpenAiCompatibleProvider(makeConfig()).isConfigured()).toBe(true);
        });

        it('is not configured without LLM_BASE_URL', () => {
            const provider = new OpenAiCompatibleProvider(makeConfig({ LLM_BASE_URL: '' }));
            expect(provider.isConfigured()).toBe(false);
        });

        it('is not configured without LLM_MODEL', () => {
            const provider = new OpenAiCompatibleProvider(makeConfig({ LLM_MODEL: '' }));
            expect(provider.isConfigured()).toBe(false);
        });

        it('strips trailing slashes from the base url', () => {
            const provider = new OpenAiCompatibleProvider(
                makeConfig({ LLM_BASE_URL: 'http://host:11434/v1///' }),
            );
            expect(provider.endpoint).toBe('http://host:11434/v1');
        });

        it('omits the Authorization header when LLM_API_KEY is empty (Ollama)', async () => {
            fetchMock.mockResolvedValue(chatResponse('{"type":"flood","confidence":0.9}'));
            const provider = new OpenAiCompatibleProvider(makeConfig());

            await provider.run({ useCaseId: 'u', prompt: 'p', schema: SCHEMA });

            const headers = fetchMock.mock.calls[0][1].headers;
            expect(headers.Authorization).toBeUndefined();
        });

        it('sends a bearer token when LLM_API_KEY is set (vLLM/LiteLLM)', async () => {
            fetchMock.mockResolvedValue(chatResponse('{"type":"flood","confidence":0.9}'));
            const provider = new OpenAiCompatibleProvider(makeConfig({ LLM_API_KEY: 'secret' }));

            await provider.run({ useCaseId: 'u', prompt: 'p', schema: SCHEMA });

            expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer secret');
        });
    });

    describe('run', () => {
        it('posts to /chat/completions with json mode and returns parsed output', async () => {
            fetchMock.mockResolvedValue(chatResponse('{"type":"flood","confidence":0.87}'));
            const provider = new OpenAiCompatibleProvider(makeConfig());

            const result = await provider.run({
                useCaseId: 'report.summarize.v1',
                prompt: 'hello',
                schema: SCHEMA,
                maxOutputTokens: 256,
            });

            expect(fetchMock.mock.calls[0][0]).toBe(
                'http://workstation.local:11434/v1/chat/completions',
            );
            const body = JSON.parse(fetchMock.mock.calls[0][1].body);
            expect(body.model).toBe('qwen2.5:32b-instruct');
            expect(body.response_format).toEqual({ type: 'json_object' });
            expect(body.max_tokens).toBe(256);
            expect(body.stream).toBe(false);
            expect(body.messages[0].role).toBe('system');
            expect(body.messages[0].content).toContain('"required":["type","confidence"]');
            expect(result.outputJson).toEqual({ type: 'flood', confidence: 0.87 });
            expect(result.modelName).toBe('qwen2.5:32b-instruct');
        });

        it('strips markdown code fences some runtimes still emit', async () => {
            fetchMock.mockResolvedValue(
                chatResponse('```json\n{"type":"fire","confidence":0.5}\n```'),
            );
            const provider = new OpenAiCompatibleProvider(makeConfig());

            const result = await provider.run({ useCaseId: 'u', prompt: 'p', schema: SCHEMA });
            expect(result.outputJson).toEqual({ type: 'fire', confidence: 0.5 });
        });

        it('throws NOT_CONFIGURED without touching the network', async () => {
            const provider = new OpenAiCompatibleProvider(makeConfig({ LLM_BASE_URL: '' }));

            await expect(provider.run({ useCaseId: 'u', prompt: 'p', schema: SCHEMA }))
                .rejects.toMatchObject({ code: 'NOT_CONFIGURED', isRetryable: false });
            expect(fetchMock).not.toHaveBeenCalled();
        });

        it('throws ValidationError on non-JSON output', async () => {
            fetchMock.mockResolvedValue(chatResponse('I think it is a flood.'));
            const provider = new OpenAiCompatibleProvider(makeConfig());

            await expect(provider.run({ useCaseId: 'u', prompt: 'p', schema: SCHEMA }))
                .rejects.toBeInstanceOf(ValidationError);
        });

        it('throws ValidationError when a required field is missing', async () => {
            fetchMock.mockResolvedValue(chatResponse('{"type":"flood"}'));
            const provider = new OpenAiCompatibleProvider(makeConfig());

            await expect(provider.run({ useCaseId: 'u', prompt: 'p', schema: SCHEMA }))
                .rejects.toThrow('Response does not match expected schema');
        });

        it('throws ValidationError on an empty completion', async () => {
            fetchMock.mockResolvedValue(chatResponse('   '));
            const provider = new OpenAiCompatibleProvider(makeConfig());

            await expect(provider.run({ useCaseId: 'u', prompt: 'p', schema: SCHEMA }))
                .rejects.toThrow('Empty response from local LLM');
        });
    });

    describe('error mapping', () => {
        it('maps ECONNREFUSED to a retryable UNREACHABLE error (workstation powered off)', async () => {
            const netError = Object.assign(new Error('fetch failed'), {
                cause: { code: 'ECONNREFUSED' },
            });
            fetchMock.mockRejectedValue(netError);
            const provider = new OpenAiCompatibleProvider(makeConfig());

            await expect(provider.run({ useCaseId: 'u', prompt: 'p', schema: SCHEMA }))
                .rejects.toMatchObject({ code: 'UNREACHABLE', isRetryable: true });
        });

        it('maps an aborted request to a retryable TIMEOUT error', async () => {
            fetchMock.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'TimeoutError' }));
            const provider = new OpenAiCompatibleProvider(makeConfig());

            await expect(provider.run({ useCaseId: 'u', prompt: 'p', schema: SCHEMA }))
                .rejects.toMatchObject({ code: 'TIMEOUT', isRetryable: true });
        });

        it('maps HTTP 429 to RateLimitError with Retry-After', async () => {
            fetchMock.mockResolvedValue(errorResponse(429, 'slow down', { 'Retry-After': '12' }));
            const provider = new OpenAiCompatibleProvider(makeConfig());

            await expect(provider.run({ useCaseId: 'u', prompt: 'p', schema: SCHEMA }))
                .rejects.toBeInstanceOf(RateLimitError);
        });

        it('maps HTTP 503 to a retryable SERVICE_UNAVAILABLE error', async () => {
            fetchMock.mockResolvedValue(errorResponse(503));
            const provider = new OpenAiCompatibleProvider(makeConfig());

            await expect(provider.run({ useCaseId: 'u', prompt: 'p', schema: SCHEMA }))
                .rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE', isRetryable: true });
        });

        it('maps HTTP 400 to a non-retryable API_ERROR', async () => {
            fetchMock.mockResolvedValue(errorResponse(400, 'model not found'));
            const provider = new OpenAiCompatibleProvider(makeConfig());

            await expect(provider.run({ useCaseId: 'u', prompt: 'p', schema: SCHEMA }))
                .rejects.toMatchObject({ code: 'API_ERROR', isRetryable: false });
        });
    });

    describe('retries', () => {
        it('retries retryable failures up to LLM_MAX_RETRIES then succeeds', async () => {
            fetchMock
                .mockResolvedValueOnce(errorResponse(503))
                .mockResolvedValueOnce(chatResponse('{"type":"flood","confidence":1}'));
            const provider = new OpenAiCompatibleProvider(makeConfig({ LLM_MAX_RETRIES: '1' }));

            const result = await provider.run({ useCaseId: 'u', prompt: 'p', schema: SCHEMA });

            expect(fetchMock).toHaveBeenCalledTimes(2);
            expect(result.outputJson).toEqual({ type: 'flood', confidence: 1 });
        });

        it('gives up after exhausting retries', async () => {
            fetchMock.mockResolvedValue(errorResponse(503));
            const provider = new OpenAiCompatibleProvider(makeConfig({ LLM_MAX_RETRIES: '2' }));

            await expect(provider.run({ useCaseId: 'u', prompt: 'p', schema: SCHEMA }))
                .rejects.toBeInstanceOf(AiProviderError);
            expect(fetchMock).toHaveBeenCalledTimes(3);
        });

        it('does not retry non-retryable failures', async () => {
            fetchMock.mockResolvedValue(errorResponse(400));
            const provider = new OpenAiCompatibleProvider(makeConfig({ LLM_MAX_RETRIES: '3' }));

            await expect(provider.run({ useCaseId: 'u', prompt: 'p', schema: SCHEMA }))
                .rejects.toMatchObject({ code: 'API_ERROR' });
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });
    });

    describe('generateText', () => {
        it('returns raw text without json mode', async () => {
            fetchMock.mockResolvedValue(chatResponse('  hello world  '));
            const provider = new OpenAiCompatibleProvider(makeConfig());

            const result = await provider.generateText({
                prompt: 'hi',
                systemPrompt: 'be nice',
                temperature: 0.9,
            });

            const body = JSON.parse(fetchMock.mock.calls[0][1].body);
            expect(body.response_format).toBeUndefined();
            expect(body.temperature).toBe(0.9);
            expect(body.messages).toHaveLength(2);
            expect(result.text).toBe('hello world');
        });

        it('throws NOT_CONFIGURED when unset', async () => {
            const provider = new OpenAiCompatibleProvider(makeConfig({ LLM_MODEL: '' }));
            await expect(provider.generateText({ prompt: 'hi' }))
                .rejects.toMatchObject({ code: 'NOT_CONFIGURED' });
        });
    });

    describe('healthCheck', () => {
        it('reports reachable when GET /models succeeds', async () => {
            fetchMock.mockResolvedValue({ ok: true, status: 200 });
            const provider = new OpenAiCompatibleProvider(makeConfig());

            const health = await provider.healthCheck();

            expect(fetchMock.mock.calls[0][0]).toBe('http://workstation.local:11434/v1/models');
            expect(health).toMatchObject({ provider: 'local', configured: true, reachable: true });
            expect(health.latencyMs).toBeGreaterThanOrEqual(0);
        });

        it('reports unreachable (never throws) when the workstation is offline', async () => {
            fetchMock.mockRejectedValue(
                Object.assign(new Error('fetch failed'), { cause: { code: 'ECONNREFUSED' } }),
            );
            const provider = new OpenAiCompatibleProvider(makeConfig());

            const health = await provider.healthCheck();

            expect(health.reachable).toBe(false);
            expect(health.error).toBe('ECONNREFUSED');
        });

        it('reports unreachable on a non-ok probe', async () => {
            fetchMock.mockResolvedValue({ ok: false, status: 502 });
            const provider = new OpenAiCompatibleProvider(makeConfig());

            const health = await provider.healthCheck();
            expect(health.reachable).toBe(false);
            expect(health.error).toContain('502');
        });

        it('reports not configured without probing', async () => {
            const provider = new OpenAiCompatibleProvider(makeConfig({ LLM_BASE_URL: '' }));

            const health = await provider.healthCheck();

            expect(health).toMatchObject({ configured: false, reachable: false });
            expect(fetchMock).not.toHaveBeenCalled();
        });

        it('bounds the probe with the connect timeout, not the request timeout', async () => {
            fetchMock.mockResolvedValue({ ok: true, status: 200 });
            const timeoutSpy = jest.spyOn(AbortSignal, 'timeout');
            const provider = new OpenAiCompatibleProvider(
                makeConfig({ LLM_CONNECT_TIMEOUT_MS: '1500', LLM_TIMEOUT_MS: '90000' }),
            );

            await provider.healthCheck();

            expect(timeoutSpy).toHaveBeenCalledWith(1500);
        });

        it('uses the request timeout for generation', async () => {
            fetchMock.mockResolvedValue(chatResponse('{"type":"fire","confidence":1}'));
            const timeoutSpy = jest.spyOn(AbortSignal, 'timeout');
            const provider = new OpenAiCompatibleProvider(
                makeConfig({ LLM_CONNECT_TIMEOUT_MS: '1500', LLM_TIMEOUT_MS: '90000' }),
            );

            await provider.run({ useCaseId: 'u', prompt: 'p', schema: SCHEMA });

            expect(timeoutSpy).toHaveBeenCalledWith(90000);
        });

        it('falls back to default timeouts on garbage env values', async () => {
            fetchMock.mockResolvedValue({ ok: true, status: 200 });
            const timeoutSpy = jest.spyOn(AbortSignal, 'timeout');
            const provider = new OpenAiCompatibleProvider(
                makeConfig({ LLM_CONNECT_TIMEOUT_MS: 'not-a-number' }),
            );

            await provider.healthCheck();

            expect(timeoutSpy).toHaveBeenCalledWith(3000);
        });
    });
});
