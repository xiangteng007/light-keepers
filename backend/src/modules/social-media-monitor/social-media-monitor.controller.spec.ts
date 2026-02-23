import { Test, TestingModule } from '@nestjs/testing';
import { SocialMediaMonitorController } from './social-media-monitor.controller';
import { SocialMediaMonitorService } from './social-media-monitor.service';
import { NotificationService } from './services/notification.service';

describe('SocialMediaMonitorController', () => {
    let controller: SocialMediaMonitorController;

    beforeEach(async () => {
        const monitorService = {
            getMonitoredPosts: jest.fn().mockResolvedValue([]),
            exportToCsv: jest.fn().mockReturnValue('csv'),
            exportToJson: jest.fn().mockReturnValue([]),
            getTrends: jest.fn().mockReturnValue([]),
            getStats: jest.fn().mockReturnValue({}),
            getKeywords: jest.fn().mockReturnValue(['flood']),
            setKeywords: jest.fn(),
            getExcludeWords: jest.fn().mockReturnValue([]),
            setExcludeWords: jest.fn(),
            analyzePost: jest.fn().mockResolvedValue({ postId: 'p1', platform: 'twitter', matchedKeywords: [], sentiment: 'neutral', urgency: 3, analyzedAt: new Date().toISOString() }),
            purgeOld: jest.fn().mockReturnValue(5),
        };
        const notificationService = {
            getConfigs: jest.fn().mockResolvedValue([]),
            createConfig: jest.fn().mockResolvedValue({ id: 'n1' }),
            updateConfig: jest.fn().mockResolvedValue({ id: 'n1' }),
            deleteConfig: jest.fn().mockResolvedValue(undefined),
        };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [SocialMediaMonitorController],
            providers: [
                { provide: SocialMediaMonitorService, useValue: monitorService },
                { provide: NotificationService, useValue: notificationService },
            ],
        }).compile();
        controller = module.get<SocialMediaMonitorController>(SocialMediaMonitorController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('getPosts', async () => expect(await controller.getPosts({} as any)).toEqual([]));
    it('getTrends', () => expect(controller.getTrends()).toEqual([]));
    it('getStats', () => expect(controller.getStats()).toBeDefined());
    it('getKeywords', () => expect(controller.getKeywords()).toContain('flood'));
    it('setKeywords', () => expect(controller.setKeywords({ keywords: ['earthquake'] }).keywords).toContain('earthquake'));
    it('getExcludeWords', () => expect(controller.getExcludeWords()).toEqual([]));
    it('setExcludeWords', () => expect(controller.setExcludeWords({ excludeWords: ['spam'] } as any).excludeWords).toContain('spam'));
    it('analyzePost', async () => expect((await controller.analyzePost({ platform: 'twitter', content: 'test' } as any)).postId).toBe('p1'));
    it('purgeOld', () => expect(controller.purgeOld(24).purged).toBe(5));
    it('getNotificationConfigs', async () => expect(await controller.getNotificationConfigs()).toEqual([]));
    it('deleteNotificationConfig', async () => expect((await controller.deleteNotificationConfig('n1')).deleted).toBe(true));
});
