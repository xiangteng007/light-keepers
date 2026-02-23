import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('NotificationsController', () => {
    let controller: NotificationsController;

    beforeEach(async () => {
        const service = {
            create: jest.fn().mockResolvedValue({ id: 'n1' }),
            broadcast: jest.fn().mockResolvedValue({ id: 'n2' }),
            sendMobilizationNotification: jest.fn().mockResolvedValue(3),
            getByVolunteer: jest.fn().mockResolvedValue([]),
            getUnreadCount: jest.fn().mockResolvedValue(5),
            markAsRead: jest.fn().mockResolvedValue({ id: 'n1' }),
            markAllAsRead: jest.fn().mockResolvedValue(5),
            registerFcmToken: jest.fn().mockResolvedValue(true),
            unregisterFcmToken: jest.fn().mockResolvedValue(true),
            broadcastWithPush: jest.fn().mockResolvedValue(undefined),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [NotificationsController],
            providers: [{ provide: NotificationsService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<NotificationsController>(NotificationsController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('create creates notification', async () => {
        const result = await controller.create({} as any);
        expect(result.success).toBe(true);
    });
    it('broadcast broadcasts', async () => {
        const result = await controller.broadcast({} as any);
        expect(result.success).toBe(true);
    });
    it('mobilize sends mobilization', async () => {
        const result = await controller.mobilize(['v1'], 'Title', 'Message');
        expect(result.success).toBe(true);
    });
    it('getByVolunteer returns list', async () => {
        const result = await controller.getByVolunteer('v1');
        expect(result.success).toBe(true);
    });
    it('getUnreadCount returns count', async () => {
        const result = await controller.getUnreadCount('v1');
        expect(result.data.count).toBe(5);
    });
    it('markAsRead marks read', async () => {
        const result = await controller.markAsRead('n1');
        expect(result.success).toBe(true);
    });
    it('markAllAsRead marks all read', async () => {
        const result = await controller.markAllAsRead('v1');
        expect(result.success).toBe(true);
    });
    it('registerFcmToken registers', async () => {
        const result = await controller.registerFcmToken('a1', 'token');
        expect(result.success).toBe(true);
    });
    it('broadcastWithPush broadcasts with push', async () => {
        const result = await controller.broadcastWithPush('Title', 'Msg');
        expect(result.success).toBe(true);
    });
});
