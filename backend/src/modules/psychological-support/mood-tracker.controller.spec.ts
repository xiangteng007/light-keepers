import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MoodTrackerController } from './mood-tracker.controller';
import { MoodTrackerService } from './mood-tracker.service';
import { PFAChatbotService } from './pfa-chatbot.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';
import { AuthenticatedRequest } from '../../common/types/request.types';

const reqAs = (sub: string, roleLevel: number) =>
    ({ user: { sub, roleLevel } } as unknown as AuthenticatedRequest);

describe('MoodTrackerController', () => {
    let controller: MoodTrackerController;
    let moodService: {
        logMood: jest.Mock;
        getUserMoodHistory: jest.Mock;
        getUserMoodSummary: jest.Mock;
        getTeamMoodTrend: jest.Mock;
        getUsersNeedingAttention: jest.Mock;
        getBlessings: jest.Mock;
        postBlessing: jest.Mock;
        likeBlessing: jest.Mock;
        getStats: jest.Mock;
    };
    let chatService: {
        chat: jest.Mock;
        getChatHistory: jest.Mock;
        startNewSession: jest.Mock;
        getStats: jest.Mock;
    };

    beforeEach(async () => {
        moodService = {
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
        chatService = {
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
        const result = await controller.logMood(reqAs('u1', 1), { userId: 'u1', score: 4 });
        expect(result.success).toBe(true);
    });

    it('getMoodHistory returns own history', async () => {
        const result = await controller.getMoodHistory(reqAs('u1', 1), 'u1');
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
        const result = await controller.chat(reqAs('u1', 1), { userId: 'u1', sessionId: 's1', message: 'hi' });
        expect(result.success).toBe(true);
    });

    it('getStats returns combined stats', async () => {
        const result = await controller.getStats();
        expect(result.success).toBe(true);
    });

    // ==================== IDOR 防護 ====================

    it('L1 讀他人心情歷史 → Forbidden', async () => {
        await expect(controller.getMoodHistory(reqAs('u1', 1), 'u2'))
            .rejects.toBeInstanceOf(ForbiddenException);
        expect(moodService.getUserMoodHistory).not.toHaveBeenCalled();
    });

    it('L1 讀他人心情摘要 → Forbidden', async () => {
        await expect(controller.getMoodSummary(reqAs('u1', 2), 'u2'))
            .rejects.toBeInstanceOf(ForbiddenException);
    });

    it('L1 讀他人對話歷史 → Forbidden', async () => {
        await expect(controller.getChatHistory(reqAs('u1', 1), 'u2'))
            .rejects.toBeInstanceOf(ForbiddenException);
        expect(chatService.getChatHistory).not.toHaveBeenCalled();
    });

    it('L3 可讀他人心情歷史（督導職權）', async () => {
        const result = await controller.getMoodHistory(reqAs('boss', 3), 'u2');
        expect(result.success).toBe(true);
        expect(moodService.getUserMoodHistory).toHaveBeenCalledWith('u2', 30);
    });

    it('logMood 以 JWT 身分覆寫 body.userId', async () => {
        await controller.logMood(reqAs('real-user', 1), { userId: 'spoofed', score: 2 });
        expect(moodService.logMood).toHaveBeenCalledWith(
            expect.objectContaining({ userId: 'real-user' }),
        );
    });

    it('chat 以 JWT 身分覆寫 body.userId', async () => {
        await controller.chat(reqAs('real-user', 1), { userId: 'spoofed', sessionId: 's1', message: 'hi' });
        expect(chatService.chat).toHaveBeenCalledWith('real-user', 's1', 'hi');
    });

    it('postBlessing 以 JWT 身分覆寫 body.userId', async () => {
        await controller.postBlessing(reqAs('real-user', 1), { userId: 'spoofed', displayName: '小明', message: '加油' });
        expect(moodService.postBlessing).toHaveBeenCalledWith(
            expect.objectContaining({ userId: 'real-user', displayName: '小明' }),
        );
    });
});
