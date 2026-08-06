/**
 * V.1 視覺路徑：本地為主、hybrid 降級、以及三個呼叫點確實走抽象層。
 */
import { ConfigService } from '@nestjs/config';
import { OpenAiCompatibleProvider } from './openai-compatible.provider';
import { LlmProviderService } from './llm-provider.service';
import { GeminiProvider } from './gemini.provider';
import { AiClassificationService } from '../../line-bot/disaster-report/ai-classification.service';

const cfg = (values: Record<string, string>): ConfigService =>
    ({ get: (k: string) => values[k] }) as unknown as ConfigService;

const PNG_1PX =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('OpenAiCompatibleProvider.generateWithVision', () => {
    const base = {
        LLM_BASE_URL: 'http://192.168.31.23:11434/v1',
        LLM_MODEL: 'qwen3:14b',
        LLM_VISION_MODEL: 'qwen2.5vl:7b',
    };

    afterEach(() => jest.restoreAllMocks());

    it('缺 LLM_VISION_MODEL 時 isVisionConfigured() 為 false 且直接拋 NOT_CONFIGURED', async () => {
        const p = new OpenAiCompatibleProvider(cfg({ ...base, LLM_VISION_MODEL: '' }));
        expect(p.isVisionConfigured()).toBe(false);
        await expect(
            p.generateWithVision({ prompt: 'x', imageBase64: PNG_1PX, mimeType: 'image/png' }),
        ).rejects.toMatchObject({ code: 'NOT_CONFIGURED' });
    });

    it('🔴 影像以 data URL 內嵌，且用 LLM_VISION_MODEL 而非文字模型', async () => {
        const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ({ choices: [{ message: { content: '{"ok":true}' } }] }),
        } as unknown as Response);

        const p = new OpenAiCompatibleProvider(cfg(base));
        const res = await p.generateWithVision({
            useCaseId: 'vision.disasterImage.v1',
            prompt: '分析這張圖',
            imageBase64: PNG_1PX,
            mimeType: 'image/png',
            json: true,
        });

        const [url, init] = fetchSpy.mock.calls[0];
        expect(String(url)).toBe('http://192.168.31.23:11434/v1/chat/completions');
        const body = JSON.parse((init as RequestInit).body as string);

        // 視覺模型，不是文字模型
        expect(body.model).toBe('qwen2.5vl:7b');
        expect(body.model).not.toBe('qwen3:14b');

        // 多模態 content 陣列，影像走 base64 data URL（不傳外部 URL，避免模型端連外）
        const content = body.messages.at(-1).content;
        expect(Array.isArray(content)).toBe(true);
        expect(content[0]).toEqual({ type: 'text', text: '分析這張圖' });
        expect(content[1].type).toBe('image_url');
        expect(content[1].image_url.url).toBe(`data:image/png;base64,${PNG_1PX}`);
        expect(content[1].image_url.url).not.toMatch(/^https?:/);

        // JSON 約束下到解碼層
        expect(body.response_format).toEqual({ type: 'json_object' });

        expect(res.text).toBe('{"ok":true}');
        expect(res.modelName).toBe('qwen2.5vl:7b');
    });
});

describe('LlmProviderService 視覺路由', () => {
    const localOk = () =>
        ({
            isConfigured: () => true,
            isVisionConfigured: () => true,
            healthCheck: async () => ({ provider: 'local', configured: true, reachable: true }),
            generateWithVision: jest.fn().mockResolvedValue({
                text: '{"from":"local"}',
                modelName: 'qwen2.5vl:7b',
                processingTimeMs: 1,
            }),
        }) as unknown as OpenAiCompatibleProvider;

    const geminiOk = () =>
        ({
            isConfigured: () => true,
            isVisionConfigured: () => true,
            healthCheck: async () => ({ provider: 'gemini', configured: true, reachable: true }),
            generateWithVision: jest.fn().mockResolvedValue({
                text: '{"from":"gemini"}',
                modelName: 'gemini-2.0-flash-exp',
                processingTimeMs: 1,
            }),
        }) as unknown as GeminiProvider;

    const req = { prompt: 'p', imageBase64: PNG_1PX, mimeType: 'image/png' };

    it('hybrid：本地可用 → 走本地，完全不碰 Gemini（零雲端）', async () => {
        const local = localOk();
        const gemini = geminiOk();
        const svc = new LlmProviderService(cfg({ LLM_PROVIDER: 'hybrid' }), gemini, local);

        const r = await svc.generateWithVision(req);
        expect(r.text).toBe('{"from":"local"}');
        expect(local.generateWithVision).toHaveBeenCalled();
        expect(gemini.generateWithVision).not.toHaveBeenCalled();
    });

    it('hybrid：本地視覺失敗 → 降級 Gemini', async () => {
        const local = localOk();
        (local.generateWithVision as jest.Mock).mockRejectedValue(new Error('boom'));
        const gemini = geminiOk();
        const svc = new LlmProviderService(cfg({ LLM_PROVIDER: 'hybrid' }), gemini, local);

        const r = await svc.generateWithVision(req);
        expect(r.text).toBe('{"from":"gemini"}');
        expect(gemini.generateWithVision).toHaveBeenCalled();
    });

    it('hybrid：文字可用但沒設 LLM_VISION_MODEL → 直接走 Gemini，不打過去拿 400', async () => {
        const local = localOk();
        (local.isVisionConfigured as unknown) = () => false;
        const gemini = geminiOk();
        const svc = new LlmProviderService(cfg({ LLM_PROVIDER: 'hybrid' }), gemini, local);

        const r = await svc.generateWithVision(req);
        expect(r.text).toBe('{"from":"gemini"}');
        expect(local.generateWithVision).not.toHaveBeenCalled();
    });

    it('🔴 local 模式：本地失敗即拋，不得靜默降級雲端', async () => {
        const local = localOk();
        (local.generateWithVision as jest.Mock).mockRejectedValue(new Error('down'));
        const gemini = geminiOk();
        const svc = new LlmProviderService(cfg({ LLM_PROVIDER: 'local' }), gemini, local);

        await expect(svc.generateWithVision(req)).rejects.toThrow('down');
        expect(gemini.generateWithVision).not.toHaveBeenCalled();
    });

    it('isVisionAvailable 反映各模式', () => {
        const local = localOk();
        const gemini = geminiOk();
        expect(
            new LlmProviderService(cfg({ LLM_PROVIDER: 'local' }), gemini, local).isVisionAvailable(),
        ).toBe(true);
        (local.isVisionConfigured as unknown) = () => false;
        expect(
            new LlmProviderService(cfg({ LLM_PROVIDER: 'local' }), gemini, local).isVisionAvailable(),
        ).toBe(false);
        expect(
            new LlmProviderService(cfg({ LLM_PROVIDER: 'hybrid' }), gemini, local).isVisionAvailable(),
        ).toBe(true);
    });
});

describe('AiClassificationService 三個視覺呼叫點都走抽象層', () => {
    const makeLlm = (text: string) =>
        ({
            isAvailable: () => true,
            isVisionAvailable: () => true,
            generateWithVision: jest
                .fn()
                .mockResolvedValue({ text, modelName: 'qwen2.5vl:7b', processingTimeMs: 5 }),
        }) as unknown as LlmProviderService;

    const img = { b64: PNG_1PX, mime: 'image/png' };

    it('影像分析走 generateWithVision，並帶對 useCaseId', async () => {
        const llm = makeLlm(
            JSON.stringify({ type: 'flood', confidence: 0.9, reasoning: 'r', severity: 'high' }),
        );
        const svc = new AiClassificationService(cfg({}), llm);
        const r = await svc.analyzeDisasterImage(img.b64, img.mime);

        expect(llm.generateWithVision).toHaveBeenCalledWith(
            expect.objectContaining({ useCaseId: 'vision.disasterImage.v1', json: true, imageBase64: img.b64 }),
        );
        expect(r.type).toBe('flood');
    });

    it('水位估算走 generateWithVision', async () => {
        const llm = makeLlm(
            JSON.stringify({ floodLevel: 45, confidence: 0.8, referenceUsed: '車輪', riskLevel: 'danger', description: 'd' }),
        );
        const svc = new AiClassificationService(cfg({}), llm);
        const r = await svc.analyzeFloodLevel(img.b64, img.mime);

        expect(llm.generateWithVision).toHaveBeenCalledWith(
            expect.objectContaining({ useCaseId: 'vision.floodLevel.v1', json: true }),
        );
        expect(r.floodLevel).toBe(45);
    });

    it('損壞評估走 generateWithVision', async () => {
        const llm = makeLlm(
            JSON.stringify({ structuralDamage: true, infrastructureDamage: false, vehicleDamage: false }),
        );
        const svc = new AiClassificationService(cfg({}), llm);
        await svc.assessDamage(img.b64, img.mime);

        expect(llm.generateWithVision).toHaveBeenCalledWith(
            expect.objectContaining({ useCaseId: 'vision.damageAssessment.v1', json: true }),
        );
    });

    it('視覺不可用時三支都回 fallback 而不是拋錯', async () => {
        const llm = { isAvailable: () => true, isVisionAvailable: () => false } as unknown as LlmProviderService;
        const svc = new AiClassificationService(cfg({}), llm);

        await expect(svc.analyzeDisasterImage(img.b64, img.mime)).resolves.toBeDefined();
        await expect(svc.analyzeFloodLevel(img.b64, img.mime)).resolves.toBeDefined();
        await expect(svc.assessDamage(img.b64, img.mime)).resolves.toBeDefined();
    });

    it('模型吐帶圍籬的 JSON 也能救回（本地小模型常見）', async () => {
        const llm = makeLlm(
            '```json\n' + JSON.stringify({ type: 'fire', confidence: 0.7, reasoning: 'r', severity: 'high' }) + '\n```',
        );
        const svc = new AiClassificationService(cfg({}), llm);
        const r = await svc.analyzeDisasterImage(img.b64, img.mime);
        expect(r.type).toBe('fire');
    });
});
