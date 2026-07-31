import { Test, TestingModule } from '@nestjs/testing';
import { MoodTrackerController } from './mood-tracker.controller';
import { MoodTrackerService } from './mood-tracker.service';
import { PFAChatbotService } from './pfa-chatbot.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('MoodTrackerController', () => {
    let controller: MoodTrackerController;

    beforeEach(async () => {
        const moodService = {
            logMood: jest.fn().mockResolvedValue({ id: 'm1' }),
            getUserMoodHistory: jest.fn().mockResolvedValue([]),
            getUserMoodSummary: jest.fn().mockResolvedValue({}),
            getTeamMoodTrend: jest.fn().mockResolvedValue([]),
            getUsersNeedingAttention: jest.fn().mockResolvedValue([]),
            getBlessings: jest.fn().mockResolvedValue([]),
            postBlessing: jest.fn().mockResolvedValue({ id: 'b1' }),
            likeBlessing: jest.fn().mockResolvedValue(undefined),
            getStats: jest.fn().mockResolvedValue({}),
        };
        const chatService = {
            chat: jest.fn().mockResolvedValue({ reply: 'Hi' }),
            getChatHistory: jest.fn().mockResolvedValue([]),
            startNewSession: jest.fn().mockReturnValue('Welcome'),
            getStats: jest.fn().mockResolvedValue({}),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [MoodTrackerController],
            providers: [
                { provide: MoodTrackerService, useValue: moodService },
                { provide: PFAChatbotService, useValue: chatService },
            ],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<MoodTrackerController>(MoodTrackerController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('logMood logs mood', async () => {
        const result = await controller.logMood({ userId: 'u1', score: 4 });
        expect(result.success).toBe(true);
    });
    it('getMoodHistory returns history', async () => {
        const result = await controller.getMoodHistory('u1');
        expect(result.success).toBe(true);
    });
    it('getTeamTrend returns trend', async () => {
        const result = await controller.getTeamTrend();
        expect(result.success).toBe(true);
    });
    it('getBlessings returns blessings', async () => {
        const result = await controller.getBlessings();
        expect(result.success).toBe(true);
    });
    it('chat returns reply', async () => {
        const result = await controller.chat({ userId: 'u1', sessionId: 's1', message: 'hi' });
        expect(result.success).toBe(true);
    });
    it('getStats returns combined stats', async () => {
        const result = await controller.getStats();
        expect(result.success).toBe(true);
    });
});
