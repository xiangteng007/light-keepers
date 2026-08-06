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

    // 改進 2：使用者會在心理支持對話裡問到職災補助、理賠、災民權益等法規題。
    // 實測模型會用溫暖的語氣講出不存在的法條，因此 PFA 也要掛護欄。
    describe('法規護欄', () => {
        function buildWithLlm(generateText: jest.Mock): PFAChatbotService {
            const repo = {
                save: jest.fn().mockResolvedValue({}),
                find: jest.fn().mockResolvedValue([]),
                count: jest.fn().mockResolvedValue(0),
            };
            return new PFAChatbotService(
                repo as never,
                { isAvailable: () => true, generateText } as never,
            );
        }

        it('PFA 的 system prompt 同時保有 HopeBot 角色設定與法規護欄', async () => {
            const generateText = jest.fn().mockResolvedValue({
                text: '我聽到你說的了。',
                modelName: 'qwen3:14b',
                processingTimeMs: 10,
            });

            await buildWithLlm(generateText).chat('u1', 's1', '職災補助有哪些規定？');

            const { systemPrompt } = generateText.mock.calls[0][0];
            expect(systemPrompt).toContain('HopeBot');
            expect(systemPrompt).toContain('不要生成看起來合理的編號');
            expect(systemPrompt).toContain('GB');
        });
    });
});
