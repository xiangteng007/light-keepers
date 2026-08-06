import { ConfigService } from '@nestjs/config';
import { detectSimplified, withZhTwRetry, ZH_TW_RETRY_INSTRUCTION } from './zh-tw-guard';
import { LlmProviderService } from '../providers/llm-provider.service';
import { GeminiProvider } from '../providers/gemini.provider';
import { OpenAiCompatibleProvider } from '../providers/openai-compatible.provider';

const cfg = (v: Record<string, string>): ConfigService =>
    ({ get: (k: string) => v[k] }) as unknown as ConfigService;

/**
 * 這段簡體樣本取自 A/B 實測中 qwen3:14b 對「地震當下在室內該怎麼做」
 * 實際吐出的整段簡體回覆（同 prompt 另一次跑則是繁體）。
 */
const REAL_SIMPLIFIED_SAMPLE =
    '1. 迅速寻找坚固家具下躲避：立即蹲下，用手护住头部和颈部，躲到结实的桌子、床或承重墙角落。\n' +
    '2. 远离危险区域：避开窗户、玻璃门、吊灯、书架等易碎或悬挂物。\n' +
    '3. 保持冷静，避免盲目行动：地震发生时切勿使用电梯。';

const TRADITIONAL_SAMPLE =
    '1. 迅速尋找堅固家具下躲避：立即蹲下，用手護住頭部和頸部，躲到結實的桌子、床或承重牆角落。\n' +
    '2. 遠離危險區域：避開窗戶、玻璃門、吊燈、書架等易碎或懸掛物。\n' +
    '3. 保持冷靜，避免盲目行動：地震發生時切勿使用電梯。';

describe('detectSimplified', () => {
    it('🔴 抓到 A/B 實測那段真實簡體輸出', () => {
        const r = detectSimplified(REAL_SIMPLIFIED_SAMPLE);
        expect(r.detected).toBe(true);
        expect(r.hits.length).toBeGreaterThan(3);
        expect(r.ratio).toBeGreaterThan(0);
    });

    it('同內容的正體版本不誤報', () => {
        expect(detectSimplified(TRADITIONAL_SAMPLE).detected).toBe(false);
    });

    it('LK 常見的正體災防用語不誤報', () => {
        const samples = [
            '各級政府平時應依權責實施災害預防事項，並定期檢討災害防救計畫。',
            '民防工作範圍包括空襲之情報傳遞、警報發放、防空疏散避難及空襲災害防護。',
            '請立即封鎖現場並疏散周圍人群，通報建築物管理單位進行結構安全檢查。',
            '趴下、掩護、穩住。躲到堅固桌子下方，保護頭部與頸部。',
            '{"類別":"公共安全","嚴重度":"中","建議處置":"設置警示標誌並通報權責單位"}',
        ];
        for (const s of samples) {
            const r = detectSimplified(s);
            expect({ text: s.slice(0, 12), hits: r.hits }).toEqual({
                text: s.slice(0, 12),
                hits: [],
            });
        }
    });

    it('空字串與非中文不誤報', () => {
        expect(detectSimplified('').detected).toBe(false);
        expect(detectSimplified('{"ok":true}').detected).toBe(false);
    });

    it('minHits 可調高以容忍零星命中', () => {
        const one = '這段話裡只有一個简字';
        expect(detectSimplified(one).detected).toBe(true);
        expect(detectSimplified(one, 5).detected).toBe(false);
    });

    it('withZhTwRetry 會把加強指示接在原 prompt 後面', () => {
        const p = withZhTwRetry('原本的問題');
        expect(p.startsWith('原本的問題')).toBe(true);
        expect(p).toContain(ZH_TW_RETRY_INSTRUCTION.trim().slice(0, 10));
    });
});

describe('LlmProviderService 繁體重試', () => {
    const makeSvc = (texts: string[]) => {
        const generateText = jest
            .fn()
            .mockImplementation(async () => ({
                text: texts.shift() ?? '',
                modelName: 'qwen3:14b',
                processingTimeMs: 1,
            }));
        const local = {
            isConfigured: () => true,
            isVisionConfigured: () => true,
            healthCheck: async () => ({ provider: 'local', configured: true, reachable: true }),
            generateText,
        } as unknown as OpenAiCompatibleProvider;
        const gemini = {
            isConfigured: () => false,
            isVisionConfigured: () => false,
            healthCheck: async () => ({ provider: 'gemini', configured: false, reachable: false }),
            generateText: jest.fn(),
        } as unknown as GeminiProvider;
        return {
            svc: new LlmProviderService(cfg({ LLM_PROVIDER: 'local' }), gemini, local),
            generateText,
        };
    };

    it('🔴 第一次吐簡體 → 自動重試一次，且重試的 prompt 帶繁體加強指示', async () => {
        const { svc, generateText } = makeSvc([REAL_SIMPLIFIED_SAMPLE, TRADITIONAL_SAMPLE]);

        const r = await svc.generateText({ useCaseId: 'test.v1', prompt: '地震怎麼辦' });

        expect(generateText).toHaveBeenCalledTimes(2);
        const retryPrompt = generateText.mock.calls[1][0].prompt;
        expect(retryPrompt).toContain('地震怎麼辦');
        expect(retryPrompt).toContain('正體中文');
        // 最終回傳的是重試後的繁體版本
        expect(detectSimplified(r.text).detected).toBe(false);
        expect(r.text).toBe(TRADITIONAL_SAMPLE);
    });

    it('第一次就是繁體 → 不重試（不浪費一次推論）', async () => {
        const { svc, generateText } = makeSvc([TRADITIONAL_SAMPLE]);
        const r = await svc.generateText({ prompt: 'x' });
        expect(generateText).toHaveBeenCalledTimes(1);
        expect(r.text).toBe(TRADITIONAL_SAMPLE);
    });

    it('重試後仍是簡體 → 照樣回傳，不無限重試', async () => {
        const { svc, generateText } = makeSvc([REAL_SIMPLIFIED_SAMPLE, REAL_SIMPLIFIED_SAMPLE]);
        const r = await svc.generateText({ prompt: 'x' });
        expect(generateText).toHaveBeenCalledTimes(2);
        expect(r.text).toBe(REAL_SIMPLIFIED_SAMPLE);
    });

    it('重試本身失敗 → 回傳第一次結果，不讓整個請求掛掉', async () => {
        const generateText = jest
            .fn()
            .mockResolvedValueOnce({ text: REAL_SIMPLIFIED_SAMPLE, modelName: 'm', processingTimeMs: 1 })
            .mockRejectedValueOnce(new Error('timeout'));
        const local = {
            isConfigured: () => true,
            isVisionConfigured: () => true,
            healthCheck: async () => ({ provider: 'local', configured: true, reachable: true }),
            generateText,
        } as unknown as OpenAiCompatibleProvider;
        const gemini = {
            isConfigured: () => false,
            isVisionConfigured: () => false,
            healthCheck: async () => ({ provider: 'gemini', configured: false, reachable: false }),
            generateText: jest.fn(),
        } as unknown as GeminiProvider;

        const svc = new LlmProviderService(cfg({ LLM_PROVIDER: 'local' }), gemini, local);
        const r = await svc.generateText({ prompt: 'x' });
        expect(r.text).toBe(REAL_SIMPLIFIED_SAMPLE);
    });
});
