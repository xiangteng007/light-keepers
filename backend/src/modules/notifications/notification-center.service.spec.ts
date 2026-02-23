import { NotificationCenterService } from './notification-center.service';

describe('NotificationCenterService', () => {
    let service: NotificationCenterService;

    beforeEach(() => {
        service = new NotificationCenterService({ } as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('send', () => {
        it('should create and store notification', async () => {
            const item = await service.send({
                type: 'alert' as any,
                channel: 'push' as any,
                recipient: 'u1',
                title: '測試通知',
                body: '這是測試',
            });
            expect(item.id).toBeDefined();
            expect(item.status).toBeDefined();
        });
    });

    describe('broadcast', () => {
        it('should send to multiple recipients', async () => {
            const result = await service.broadcast({
                type: 'alert' as any,
                channels: ['push' as any],
                recipients: ['u1', 'u2'],
                title: '廣播',
                body: '緊急通知',
            });
            expect(result.sent).toBeGreaterThanOrEqual(0);
            expect(typeof result.failed).toBe('number');
        });
    });

    describe('getUserNotifications', () => {
        it('should return user notifications', async () => {
            await service.send({ type: 'info' as any, channel: 'push' as any, recipient: 'u1', title: 'T', body: 'B' });
            const list = await service.getUserNotifications('u1');
            expect(list.length).toBeGreaterThanOrEqual(1);
        });

        it('should filter unread only', async () => {
            await service.send({ type: 'info' as any, channel: 'push' as any, recipient: 'u1', title: 'T', body: 'B' });
            const list = await service.getUserNotifications('u1', { unreadOnly: true });
            expect(list.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('markAsRead', () => {
        it('should mark notification as read', async () => {
            const item = await service.send({ type: 'info' as any, channel: 'push' as any, recipient: 'u1', title: 'T', body: 'B' });
            const result = await service.markAsRead(item.id);
            expect(result).toBe(true);
        });

        it('should return false for unknown ID', async () => {
            const result = await service.markAsRead('bad-id');
            expect(result).toBe(false);
        });
    });

    describe('markAllAsRead', () => {
        it('should mark all user notifications as read', async () => {
            await service.send({ type: 'info' as any, channel: 'push' as any, recipient: 'u2', title: 'T1', body: 'B' });
            await service.send({ type: 'info' as any, channel: 'push' as any, recipient: 'u2', title: 'T2', body: 'B' });
            const count = await service.markAllAsRead('u2');
            expect(count).toBeGreaterThanOrEqual(2);
        });
    });

    describe('getUnreadCount', () => {
        it('should return unread count', async () => {
            await service.send({ type: 'info' as any, channel: 'push' as any, recipient: 'u3', title: 'T', body: 'B' });
            const count = await service.getUnreadCount('u3');
            expect(count).toBeGreaterThanOrEqual(1);
        });
    });

    describe('getStats', () => {
        it('should return notification stats', async () => {
            const stats = await service.getStats();
            expect(stats).toHaveProperty('total');
            expect(stats).toHaveProperty('deliveryRate');
        });
    });

    describe('getRecentActivity', () => {
        it('should return recent notifications', async () => {
            const recent = await service.getRecentActivity(5);
            expect(Array.isArray(recent)).toBe(true);
        });
    });
});
