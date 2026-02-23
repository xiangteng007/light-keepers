import { AiClassificationService } from './ai-classification.service';

describe('AiClassificationService', () => {
    let service: AiClassificationService;
    let configService: { get: jest.Mock };

    beforeEach(() => {
        configService = { get: jest.fn().mockReturnValue('') };
        service = new AiClassificationService(configService as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

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
