import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PFAChatbotService } from './pfa-chatbot.service';
import { PFAChatLog } from './entities/mood-log.entity';

describe('PFAChatbotService', () => {
    let service: PFAChatbotService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PFAChatbotService,
                { provide: getRepositoryToken(PFAChatLog), useValue: {
                    save: jest.fn().mockResolvedValue({}),
                    find: jest.fn().mockResolvedValue([]),
                    count: jest.fn().mockResolvedValue(0),
                    createQueryBuilder: jest.fn().mockReturnValue({
                        select: jest.fn().mockReturnThis(),
                        getRawOne: jest.fn().mockResolvedValue({ avg: '0' }),
                    }),
                } },
            ],
        }).compile();
        service = module.get(PFAChatbotService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('startNewSession returns greeting', () => {
        const greeting = service.startNewSession('s1');
        expect(greeting).toContain('HopeBot');
    });

    it('chat returns response with sentiment', async () => {
        const result = await service.chat('u1', 's1', '今天還不錯');
        expect(result.response).toBeDefined();
        expect(result.sentiment).toBeDefined();
        expect(result.sentiment.label).toBeDefined();
    });

    it('chat detects crisis keywords', async () => {
        const result = await service.chat('u1', 's2', '我不想活了');
        expect(result.resources).toBeDefined();
        expect(result.resources!.length).toBeGreaterThan(0);
    });

    it('analyzeSentiment detects negative', () => {
        const result = (service as any).analyzeSentiment('難過 焦慮 絕望');
        expect(result.score).toBeLessThan(0);
    });

    it('analyzeSentiment detects positive', () => {
        const result = (service as any).analyzeSentiment('今天很開心 很感謝');
        expect(result.label).toBe('positive');
    });

    it('detectCrisisKeywords returns true for crisis', () => {
        expect((service as any).detectCrisisKeywords('我想自殺')).toBe(true);
        expect((service as any).detectCrisisKeywords('我今天感覺還好')).toBe(false);
    });

    it('getChatHistory returns logs', async () => {
        const logs = await service.getChatHistory('u1');
        expect(Array.isArray(logs)).toBe(true);
    });

    it('getStats returns data', async () => {
        const stats = await service.getStats();
        expect(stats.totalConversations).toBeDefined();
    });
});
