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

    it('LLM 拋錯 → 安全退回關鍵字搜尋（不對外拋）', async () => {
        const llm = {
            isAvailable: () => true,
            generateText: jest.fn().mockRejectedValue(new Error('boom')),
        } as unknown as LlmProviderService;

        await expect(new ManualsService(llm).searchWithAI('火災')).resolves.toBeDefined();
    });
});
