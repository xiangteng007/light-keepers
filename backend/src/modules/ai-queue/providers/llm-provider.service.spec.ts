import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LlmProviderService } from './llm-provider.service';
import { LlmModule } from './llm.module';
import { GeminiProvider } from './gemini.provider';
import { OpenAiCompatibleProvider } from './openai-compatible.provider';
import { AiProviderError, LlmHealth } from './llm-provider.interface';

const REQUEST = { useCaseId: 'report.summarize.v1', prompt: 'p', schema: {} };

function reachable(overrides: Partial<LlmHealth> = {}): LlmHealth {
    return {
        provider: 'local',
        configured: true,
        reachable: true,
        latencyMs: 5,
        model: 'qwen2.5:32b-instruct',
        baseUrl: 'http://workstation.local:11434/v1',
        ...overrides,
    };
}

function offline(error = 'ECONNREFUSED'): LlmHealth {
    return reachable({ reachable: false, error });
}

interface Harness {
    service: LlmProviderService;
    local: jest.Mocked<OpenAiCompatibleProvider>;
    gemini: jest.Mocked<GeminiProvider>;
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
}

function build(env: Record<string, string> = {}, localConfigured = true): Harness {
    const config = { get: (key: string) => env[key] } as unknown as ConfigService;

    const local = {
        providerName: 'local',
        modelName: 'qwen2.5:32b-instruct',
        endpoint: 'http://workstation.local:11434/v1',
        isConfigured: jest.fn().mockReturnValue(localConfigured),
        healthCheck: jest.fn().mockResolvedValue(reachable()),
        run: jest.fn().mockResolvedValue({
            outputJson: { via: 'local' }, modelName: 'qwen2.5:32b-instruct', processingTimeMs: 10,
        }),
        generateText: jest.fn().mockResolvedValue({
            text: 'local text', modelName: 'qwen2.5:32b-instruct', processingTimeMs: 10,
        }),
    } as unknown as jest.Mocked<OpenAiCompatibleProvider>;

    const gemini = {
        providerName: 'gemini',
        isConfigured: jest.fn().mockReturnValue(true),
        healthCheck: jest.fn().mockResolvedValue({
            provider: 'gemini', configured: true, reachable: true, latencyMs: 40,
        }),
        run: jest.fn().mockResolvedValue({
            outputJson: { via: 'gemini' }, modelName: 'gemini-2.0-flash-exp', processingTimeMs: 200,
        }),
        generateText: jest.fn().mockResolvedValue({
            text: 'gemini text', modelName: 'gemini-2.0-flash-exp', processingTimeMs: 200,
        }),
    } as unknown as jest.Mocked<GeminiProvider>;

    const service = new LlmProviderService(config, gemini, local);

    // Spy after construction so start-up warnings do not pollute assertions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const logger = (service as any).logger;
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const error = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
    jest.spyOn(logger, 'log').mockImplementation(() => undefined);

    return { service, local, gemini, warn, error };
}

describe('LlmModule wiring', () => {
    it('resolves all three providers from the DI container', async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [ConfigModule.forRoot({ ignoreEnvFile: true }), LlmModule],
        }).compile();

        expect(moduleRef.get(LlmProviderService)).toBeInstanceOf(LlmProviderService);
        expect(moduleRef.get(GeminiProvider)).toBeInstanceOf(GeminiProvider);
        expect(moduleRef.get(OpenAiCompatibleProvider)).toBeInstanceOf(OpenAiCompatibleProvider);
        await moduleRef.close();
    });
});

describe('LlmProviderService', () => {
    afterEach(() => jest.restoreAllMocks());

    describe('mode parsing', () => {
        it('defaults to gemini when LLM_PROVIDER is unset', () => {
            expect(build().service.getMode()).toBe('gemini');
        });

        it('accepts local / hybrid / gemini case-insensitively', () => {
            expect(build({ LLM_PROVIDER: 'LOCAL' }).service.getMode()).toBe('local');
            expect(build({ LLM_PROVIDER: ' hybrid ' }).service.getMode()).toBe('hybrid');
            expect(build({ LLM_PROVIDER: 'gemini' }).service.getMode()).toBe('gemini');
        });

        it('falls back to gemini on an unknown value', () => {
            expect(build({ LLM_PROVIDER: 'openai' }).service.getMode()).toBe('gemini');
        });
    });

    describe('isAvailable', () => {
        it('is false in local mode when the local provider is unconfigured', () => {
            expect(build({ LLM_PROVIDER: 'local' }, false).service.isAvailable()).toBe(false);
        });

        it('is true in hybrid mode when only Gemini is configured', () => {
            expect(build({ LLM_PROVIDER: 'hybrid' }, false).service.isAvailable()).toBe(true);
        });

        it('is false in hybrid mode when neither is configured', () => {
            const h = build({ LLM_PROVIDER: 'hybrid' }, false);
            h.gemini.isConfigured.mockReturnValue(false);
            expect(h.service.isAvailable()).toBe(false);
        });
    });

    describe('mode=gemini', () => {
        it('routes to Gemini and never probes the local endpoint', async () => {
            const h = build({ LLM_PROVIDER: 'gemini' });

            const result = await h.service.run(REQUEST);

            expect(result.outputJson).toEqual({ via: 'gemini' });
            expect(h.local.run).not.toHaveBeenCalled();
            expect(h.local.healthCheck).not.toHaveBeenCalled();
        });
    });

    describe('mode=local', () => {
        it('routes to the local provider', async () => {
            const h = build({ LLM_PROVIDER: 'local' });

            const result = await h.service.run(REQUEST);

            expect(result.outputJson).toEqual({ via: 'local' });
            expect(h.gemini.run).not.toHaveBeenCalled();
        });

        it('rethrows loudly instead of silently falling back to Gemini', async () => {
            const h = build({ LLM_PROVIDER: 'local' });
            h.local.run.mockRejectedValue(
                new AiProviderError('Local LLM unreachable: ECONNREFUSED', 'UNREACHABLE', true),
            );

            await expect(h.service.run(REQUEST)).rejects.toMatchObject({ code: 'UNREACHABLE' });
            expect(h.gemini.run).not.toHaveBeenCalled();
            expect(h.error).toHaveBeenCalledWith(expect.stringContaining('no fallback configured'));
        });

        it('does not probe first - failures surface from the real call', async () => {
            const h = build({ LLM_PROVIDER: 'local' });
            await h.service.run(REQUEST);
            expect(h.local.healthCheck).not.toHaveBeenCalled();
        });

        it('propagates timeouts', async () => {
            const h = build({ LLM_PROVIDER: 'local' });
            h.local.run.mockRejectedValue(new AiProviderError('timeout', 'TIMEOUT', true));

            await expect(h.service.run(REQUEST)).rejects.toMatchObject({ code: 'TIMEOUT' });
        });
    });

    describe('mode=hybrid', () => {
        it('prefers the local provider when the probe succeeds', async () => {
            const h = build({ LLM_PROVIDER: 'hybrid' });

            const result = await h.service.run(REQUEST);

            expect(h.local.healthCheck).toHaveBeenCalledTimes(1);
            expect(result.outputJson).toEqual({ via: 'local' });
            expect(h.gemini.run).not.toHaveBeenCalled();
        });

        it('falls back to Gemini and warns when the workstation is offline', async () => {
            const h = build({ LLM_PROVIDER: 'hybrid' });
            h.local.healthCheck.mockResolvedValue(offline());

            const result = await h.service.run(REQUEST);

            expect(result.outputJson).toEqual({ via: 'gemini' });
            expect(h.local.run).not.toHaveBeenCalled();
            expect(h.warn).toHaveBeenCalledWith(
                expect.stringContaining('Local LLM unreachable (ECONNREFUSED)'),
            );
        });

        it('falls back to Gemini when the probe passes but generation fails', async () => {
            const h = build({ LLM_PROVIDER: 'hybrid' });
            h.local.run.mockRejectedValue(new AiProviderError('boom', 'TIMEOUT', true));

            const result = await h.service.run(REQUEST);

            expect(result.outputJson).toEqual({ via: 'gemini' });
            expect(h.warn).toHaveBeenCalledWith(expect.stringContaining('TIMEOUT'));
        });

        it('marks local unhealthy after a generation failure so the next call skips it', async () => {
            const h = build({ LLM_PROVIDER: 'hybrid' });
            h.local.run.mockRejectedValueOnce(new AiProviderError('boom', 'TIMEOUT', true));

            await h.service.run(REQUEST);
            await h.service.run(REQUEST);

            // second call went straight to Gemini without re-probing or re-calling local
            expect(h.local.run).toHaveBeenCalledTimes(1);
            expect(h.gemini.run).toHaveBeenCalledTimes(2);
        });

        it('caches a negative probe so an offline workstation is probed once per window', async () => {
            const h = build({ LLM_PROVIDER: 'hybrid', LLM_HEALTH_CACHE_MS: '60000' });
            h.local.healthCheck.mockResolvedValue(offline());

            await h.service.run(REQUEST);
            await h.service.run(REQUEST);
            await h.service.run(REQUEST);

            expect(h.local.healthCheck).toHaveBeenCalledTimes(1);
            expect(h.gemini.run).toHaveBeenCalledTimes(3);
        });

        it('re-probes once the cache window elapses', async () => {
            const h = build({ LLM_PROVIDER: 'hybrid', LLM_HEALTH_CACHE_MS: '0' });
            h.local.healthCheck.mockResolvedValue(offline());

            await h.service.run(REQUEST);
            await h.service.run(REQUEST);

            expect(h.local.healthCheck).toHaveBeenCalledTimes(2);
        });

        it('skips the probe entirely when the local provider is unconfigured', async () => {
            const h = build({ LLM_PROVIDER: 'hybrid' }, false);

            const result = await h.service.run(REQUEST);

            expect(result.outputJson).toEqual({ via: 'gemini' });
            expect(h.local.healthCheck).not.toHaveBeenCalled();
        });

        it('propagates the Gemini error when both providers fail', async () => {
            const h = build({ LLM_PROVIDER: 'hybrid' });
            h.local.run.mockRejectedValue(new AiProviderError('local down', 'UNREACHABLE', true));
            h.gemini.run.mockRejectedValue(new AiProviderError('quota', 'API_ERROR', false));

            await expect(h.service.run(REQUEST)).rejects.toMatchObject({ code: 'API_ERROR' });
        });

        it('applies the same routing to generateText', async () => {
            const h = build({ LLM_PROVIDER: 'hybrid' });
            h.local.healthCheck.mockResolvedValue(offline('timeout after 3000ms'));

            const result = await h.service.generateText({ prompt: '淹水了' });

            expect(result.text).toBe('gemini text');
            expect(h.warn).toHaveBeenCalledWith(expect.stringContaining('timeout after 3000ms'));
        });
    });

    describe('healthCheck', () => {
        it('probes both providers and reports local as active in hybrid mode', async () => {
            const h = build({ LLM_PROVIDER: 'hybrid' });

            const status = await h.service.healthCheck();

            expect(status.mode).toBe('hybrid');
            expect(status.active).toBe('local');
            expect(status.providers.local.reachable).toBe(true);
            expect(status.providers.gemini.reachable).toBe(true);
        });

        it('reports gemini as active in hybrid mode when local is offline', async () => {
            const h = build({ LLM_PROVIDER: 'hybrid' });
            h.local.healthCheck.mockResolvedValue(offline());

            const status = await h.service.healthCheck();
            expect(status.active).toBe('gemini');
        });

        it('reports none in local mode when the workstation is offline', async () => {
            const h = build({ LLM_PROVIDER: 'local' });
            h.local.healthCheck.mockResolvedValue(offline());

            const status = await h.service.healthCheck();
            expect(status.active).toBe('none');
        });

        it('reports none in gemini mode without an API key', async () => {
            const h = build({ LLM_PROVIDER: 'gemini' });
            h.gemini.healthCheck.mockResolvedValue({
                provider: 'gemini', configured: false, reachable: false, error: 'no key',
            });

            const status = await h.service.healthCheck();
            expect(status.active).toBe('none');
        });

        it('warms the probe cache so a following hybrid call reuses it', async () => {
            const h = build({ LLM_PROVIDER: 'hybrid', LLM_HEALTH_CACHE_MS: '60000' });

            await h.service.healthCheck();
            await h.service.run(REQUEST);

            expect(h.local.healthCheck).toHaveBeenCalledTimes(1);
        });

        it('resetHealthCache forces a re-probe', async () => {
            const h = build({ LLM_PROVIDER: 'hybrid', LLM_HEALTH_CACHE_MS: '60000' });

            await h.service.run(REQUEST);
            h.service.resetHealthCache();
            await h.service.run(REQUEST);

            expect(h.local.healthCheck).toHaveBeenCalledTimes(2);
        });
    });
});
