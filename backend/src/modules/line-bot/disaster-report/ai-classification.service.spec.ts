import { AiClassificationService, buildClassificationPrompt } from './ai-classification.service';

describe('AiClassificationService', () => {
    let service: AiClassificationService;
    let configService: { get: jest.Mock };
    let llm: { isAvailable: jest.Mock; generateText: jest.Mock };

    beforeEach(() => {
        configService = { get: jest.fn().mockReturnValue('') };
        llm = {
            isAvailable: jest.fn().mockReturnValue(false),
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
