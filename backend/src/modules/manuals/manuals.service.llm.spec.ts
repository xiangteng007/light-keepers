import { ManualsService } from './manuals.service';
import type { LlmProviderService } from '../ai-queue/providers/llm-provider.service';

/**
 * N1（S·2.4）路由測試：manuals AI 檢索走 LlmProviderService，
 * 不可用時退回關鍵字搜尋（不打任何外部 API）。
 */
describe('ManualsService × LlmProviderService（N1 路由）', () => {
    it('LLM 不可用 → 關鍵字 fallback（aiAnswer 為 fallback 文案）', async () => {
        const svc = new ManualsService(undefined);
        const res = await svc.searchWithAI('地震');
        expect(res.results.length).toBeGreaterThan(0);
        expect(res.query).toBe('地震');
    });

    it('LLM 可用 → generateText 收到 manuals.search.v1，且回傳 JSON 被解析', async () => {
        const first = new ManualsService(undefined).getAllManuals()[0];
        const generateText = jest.fn().mockResolvedValue({
            text: `{"relevantManualIds":["${first.id}"],"answer":"測試回答"}`,
            modelName: 'fake',
            processingTimeMs: 1,
        });
        const llm = { isAvailable: () => true, generateText } as unknown as LlmProviderService;

        const res = await new ManualsService(llm).searchWithAI('避難');

        expect(generateText).toHaveBeenCalledWith(
            expect.objectContaining({ useCaseId: 'manuals.search.v1' }),
        );
        expect(res.aiAnswer).toBe('測試回答');
        expect(res.results[0]?.manual.id).toBe(first.id);
    });

    // 改進 1：JSON 由 runtime 約束，不靠 prompt 自律
    it('要求 runtime 產生合法 JSON（json + jsonSchema）', async () => {
        const generateText = jest.fn().mockResolvedValue({
            text: '{"relevantManualIds":[],"answer":"x"}',
            modelName: 'fake',
            processingTimeMs: 1,
        });
        const llm = { isAvailable: () => true, generateText } as unknown as LlmProviderService;

        await new ManualsService(llm).searchWithAI('避難');

        const request = generateText.mock.calls[0][0];
        expect(request.json).toBe(true);
        expect(request.jsonSchema).toMatchObject({ required: ['relevantManualIds', 'answer'] });
    });

    it('鍵沒有引號的非法 JSON 仍能解析（不退回關鍵字搜尋）', async () => {
        const first = new ManualsService(undefined).getAllManuals()[0];
        const generateText = jest.fn().mockResolvedValue({
            text: `{relevantManualIds: ["${first.id}"], answer: '就近避難'}`,
            modelName: 'qwen3:14b',
            processingTimeMs: 1,
        });
        const llm = { isAvailable: () => true, generateText } as unknown as LlmProviderService;

        const res = await new ManualsService(llm).searchWithAI('避難');

        expect(res.aiAnswer).toBe('就近避難');
        expect(res.results[0]?.manual.id).toBe(first.id);
    });

    // 改進 2：法規護欄
    it('system prompt 帶上法規護欄（禁止捏造法條／不得把 GB 當我國規定）', async () => {
        const generateText = jest.fn().mockResolvedValue({
            text: '{"relevantManualIds":[],"answer":"x"}',
            modelName: 'fake',
            processingTimeMs: 1,
        });
        const llm = { isAvailable: () => true, generateText } as unknown as LlmProviderService;

        await new ManualsService(llm).searchWithAI('建築物耐震規定');

        const { systemPrompt } = generateText.mock.calls[0][0];
        expect(systemPrompt).toContain('GB');
        expect(systemPrompt).toContain('不要生成看起來合理的編號');
        expect(systemPrompt).toContain('law.moj.gov.tw');
    });

    it('LLM 拋錯 → 安全退回關鍵字搜尋（不對外拋）', async () => {
        const llm = {
            isAvailable: () => true,
            generateText: jest.fn().mockRejectedValue(new Error('boom')),
        } as unknown as LlmProviderService;

        await expect(new ManualsService(llm).searchWithAI('火災')).resolves.toBeDefined();
    });
});
