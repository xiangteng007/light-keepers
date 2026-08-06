import { AiClassificationService, buildClassificationPrompt } from './ai-classification.service';

describe('AiClassificationService', () => {
    let service: AiClassificationService;
    let configService: { get: jest.Mock };
    let llm: { isAvailable: jest.Mock; isVisionAvailable: jest.Mock; generateText: jest.Mock };

    beforeEach(() => {
        configService = { get: jest.fn().mockReturnValue('') };
        llm = {
            isAvailable: jest.fn().mockReturnValue(false),
            // V.1：視覺路徑加進 LlmProviderService 契約後，test double 也要跟上
            isVisionAvailable: jest.fn().mockReturnValue(false),
            generateText: jest.fn(),
        };
        service = new AiClassificationService(configService as any, llm as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('buildClassificationPrompt', () => {
        it('embeds the description and the allowed type list', () => {
            const prompt = buildClassificationPrompt('淹水了');
            expect(prompt).toContain('淹水了');
            expect(prompt).toContain('earthquake');
            expect(prompt).toContain('infrastructure');
        });
    });

    describe('fallbackClassification', () => {
        it('should classify flood keywords', () => {
            const result = (service as any).fallbackClassification('淹水了，水很深');
            expect(result.type).toBeDefined();
            expect(result.confidence).toBeGreaterThan(0);
        });

        it('should classify earthquake keywords', () => {
            const result = (service as any).fallbackClassification('地震了，建築物倒塌');
            expect(result.type).toBeDefined();
        });

        it('should classify fire keywords', () => {
            const result = (service as any).fallbackClassification('房子著火了');
            expect(result.type).toBeDefined();
        });

        it('should return default type for unknown', () => {
            const result = (service as any).fallbackClassification('一般情況');
            expect(result.type).toBeDefined();
            expect(result.confidence).toBeLessThanOrEqual(1);
        });
    });

    describe('classifyDisasterType', () => {
        it('should fallback when AI not configured', async () => {
            const result = await service.classifyDisasterType('淹水了');
            expect(result.type).toBeDefined();
            expect(result.confidence).toBeGreaterThan(0);
            expect(llm.generateText).not.toHaveBeenCalled();
        });

        it('should fallback when no LLM provider is injected at all', async () => {
            const bare = new AiClassificationService(configService as any);
            const result = await bare.classifyDisasterType('淹水了');
            expect(result.reasoning).toBe('Keyword-based detection');
        });

        it('should route through LlmProviderService when available', async () => {
            llm.isAvailable.mockReturnValue(true);
            llm.generateText.mockResolvedValue({
                text: '{"type":"flood","confidence":0.92,"reasoning":"描述提到淹水"}',
                modelName: 'qwen2.5:32b-instruct',
                processingTimeMs: 120,
            });

            const result = await service.classifyDisasterType('淹水了，水很深');

            expect(llm.generateText).toHaveBeenCalledWith(
                expect.objectContaining({ useCaseId: 'linebot.disaster.classify.v1' }),
            );
            expect(result.type).toBe('flood');
            expect(result.confidence).toBeCloseTo(0.92);
        });

        it('should fall back to keywords when the provider throws (both LLMs down)', async () => {
            llm.isAvailable.mockReturnValue(true);
            llm.generateText.mockRejectedValue(new Error('Local LLM unreachable: ECONNREFUSED'));

            const result = await service.classifyDisasterType('房子起火了');

            expect(result.type).toBe('fire');
            expect(result.reasoning).toBe('Keyword-based detection');
        });

        // 改進 1：JSON 的保證下放到 runtime 的解碼約束
        it('要求 runtime 產生合法 JSON（json + jsonSchema）', async () => {
            llm.isAvailable.mockReturnValue(true);
            llm.generateText.mockResolvedValue({
                text: '{"type":"flood","confidence":0.9}',
                modelName: 'qwen3:14b',
                processingTimeMs: 100,
            });

            await service.classifyDisasterType('淹水了');

            const request = llm.generateText.mock.calls[0][0];
            expect(request.json).toBe(true);
            expect(request.jsonSchema).toMatchObject({ required: ['type', 'confidence'] });
        });

        // A/B 實測 qwen3:14b 真的吐過這種東西：鍵沒有引號 → 舊版 JSON.parse 直接爆，
        // 分類整包退回關鍵字比對（準確度掉一大截）。保底解析要能救回來。
        it('鍵沒有引號的非法 JSON 仍能正確分類（不退回關鍵字）', async () => {
            llm.isAvailable.mockReturnValue(true);
            llm.generateText.mockResolvedValue({
                text: '{type: "air_raid", confidence: 0.88, massCasualty: true, reasoning: "防空警報"}',
                modelName: 'qwen3:14b',
                processingTimeMs: 130,
            });

            const result = await service.classifyDisasterType('防空警報響了');

            expect(result.type).toBe('air_raid');
            expect(result.confidence).toBeCloseTo(0.88);
            expect(result.massCasualty).toBe(true);
            expect(result.reasoning).not.toBe('Keyword-based detection');
        });

        it('單引號＋尾逗號＋圍籬的組合也能救回來', async () => {
            llm.isAvailable.mockReturnValue(true);
            llm.generateText.mockResolvedValue({
                text: "```json\n{'type': 'landslide', 'confidence': 0.7,}\n```",
                modelName: 'qwen3:14b',
                processingTimeMs: 110,
            });

            const result = await service.classifyDisasterType('山崩了');
            expect(result.type).toBe('landslide');
        });

        it('should fall back to keywords on an unparseable response', async () => {
            llm.isAvailable.mockReturnValue(true);
            llm.generateText.mockResolvedValue({
                text: 'I think it is a flood',
                modelName: 'qwen2.5:32b-instruct',
                processingTimeMs: 90,
            });

            const result = await service.classifyDisasterType('地震了');
            expect(result.reasoning).toBe('Keyword-based detection');
        });
    });

    // CD-1: 民防災型擴充（設計見 docs/architecture/CIVIL_DEFENSE_TAXONOMY.md）
    describe('CD-1 民防擴充', () => {
        it('prompt 列出四個民防類別與 massCasualty 欄位', () => {
            const prompt = buildClassificationPrompt('防空警報');
            for (const type of ['air_raid', 'explosion', 'terror_attack', 'cbrn']) {
                expect(prompt).toContain(type);
            }
            expect(prompt).toContain('massCasualty');
        });

        it('prompt 明寫「瓦斯氣爆歸 fire」這條反直覺界線', () => {
            const prompt = buildClassificationPrompt('測試');
            expect(prompt).toContain('瓦斯氣爆');
        });

        it.each([
            ['剛剛防空警報響了，遠處有爆炸聲', 'air_raid'],
            ['路邊有個沒人認領的可疑包裹', 'explosion'],
            ['夜市有人持刀砍人', 'terror_attack'],
            ['信封裡有不明粉末', 'cbrn'],
        ])('關鍵字 fallback：「%s」→ %s', (text, expected) => {
            const result = (service as any).fallbackClassification(text);
            expect(result.type).toBe(expected);
        });

        it('向後相容：既有 8 類的關鍵字命中結果與擴充前完全相同', () => {
            const legacyFixtures: Array<[string, string]> = [
                ['淹水了，水很深', 'flood'],
                ['地震了，建築物倒塌', 'earthquake'],
                ['房子起火了', 'fire'],
                // 「爆炸」必須仍然落在 fire，不得被 explosion 奪走
                ['工廠發生爆炸，現場還在冒煙', 'fire'],
                // 既有行為：'氣爆'/'炸開' 本來就不在任何關鍵字表裡 → other
                ['瓦斯氣爆，隔壁整面牆炸開', 'other'],
                ['颱風把屋頂掀掉了', 'typhoon'],
                ['山區土石流，道路被沖斷', 'landslide'],
                ['路口發生車禍', 'traffic'],
                ['電線桿倒塌壓到路面', 'infrastructure'],
                ['一般情況，沒什麼特別的', 'other'],
            ];
            for (const [text, expected] of legacyFixtures) {
                expect((service as any).fallbackClassification(text).type).toBe(expected);
            }
        });

        it('大量傷患是與災型正交的旗標', () => {
            const mci = (service as any).fallbackClassification('車禍現場很多人受傷，救護車不夠');
            expect(mci.type).toBe('traffic');
            expect(mci.massCasualty).toBe(true);

            const normal = (service as any).fallbackClassification('路口發生車禍');
            expect(normal.type).toBe('traffic');
            expect(normal.massCasualty).toBe(false);
        });

        it('parseAIResponse 接受民防類別並讀取 massCasualty', () => {
            const result = (service as any).parseAIResponse(
                '{"type":"cbrn","confidence":0.9,"massCasualty":true,"reasoning":"不明氣體"}',
            );
            expect(result.type).toBe('cbrn');
            expect(result.massCasualty).toBe(true);
        });

        it('parseAIResponse 對缺少 massCasualty 的舊格式回應向下相容', () => {
            const result = (service as any).parseAIResponse('{"type":"flood","confidence":0.9}');
            expect(result.type).toBe('flood');
            expect(result.massCasualty).toBe(false);
        });
    });

    describe('parseAIResponse', () => {
        it('should parse JSON response', () => {
            const result = (service as any).parseAIResponse('{"type":"flood","confidence":0.9,"reasoning":"水災相關描述"}');
            expect(result).toBeDefined();
        });

        it('should handle invalid JSON gracefully', () => {
            expect(() => (service as any).parseAIResponse('not json')).toThrow();
        });
    });

    describe('batchClassify', () => {
        it('should classify multiple descriptions', async () => {
            const results = await service.batchClassify(['淹水了', '地震']);
            expect(results.length).toBe(2);
        });
    });

    describe('sleep', () => {
        it('should delay execution', async () => {
            const start = Date.now();
            await (service as any).sleep(50);
            expect(Date.now() - start).toBeGreaterThanOrEqual(40);
        });
    });
});
