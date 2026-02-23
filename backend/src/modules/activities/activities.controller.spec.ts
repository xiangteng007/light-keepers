import { Test, TestingModule } from '@nestjs/testing';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('ActivitiesController', () => {
    let controller: ActivitiesController;
    let service: jest.Mocked<Partial<ActivitiesService>>;

    const mockActivity = { id: 'a1', title: '防災訓練', status: 'draft' };
    const mockRegistration = { id: 'r1', status: 'confirmed', activityId: 'a1' };

    beforeEach(async () => {
        service = {
            findActivities: jest.fn().mockResolvedValue([mockActivity]),
            findActivity: jest.fn().mockResolvedValue(mockActivity),
            getActivityStats: jest.fn().mockResolvedValue({ confirmed: 8, pending: 1, waitlist: 0, cancelled: 0, attended: 5 }),
            createActivity: jest.fn().mockResolvedValue(mockActivity),
            updateActivity: jest.fn().mockResolvedValue({ ...mockActivity, title: '更新訓練' }),
            publishActivity: jest.fn().mockResolvedValue({ ...mockActivity, status: 'published' }),
            closeRegistration: jest.fn().mockResolvedValue({ ...mockActivity, status: 'closed' }),
            cancelActivity: jest.fn().mockResolvedValue({ ...mockActivity, status: 'cancelled' }),
            completeActivity: jest.fn().mockResolvedValue({ ...mockActivity, status: 'completed' }),
            getRegistrations: jest.fn().mockResolvedValue([mockRegistration]),
            register: jest.fn().mockResolvedValue(mockRegistration),
            getUserRegistrations: jest.fn().mockResolvedValue([mockRegistration]),
            approveRegistration: jest.fn().mockResolvedValue({ ...mockRegistration, status: 'approved' }),
            cancelRegistration: jest.fn().mockResolvedValue(undefined),
            markAttendance: jest.fn().mockResolvedValue({ ...mockRegistration, attended: true }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ActivitiesController],
            providers: [{ provide: ActivitiesService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<ActivitiesController>(ActivitiesController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('findAll returns activities list', async () => {
        const result = await controller.findAll();
        expect(result.success).toBe(true);
        expect(result.count).toBe(1);
    });

    it('findOne returns single activity', async () => {
        const result = await controller.findOne('a1');
        expect(result.data).toEqual(mockActivity);
    });

    it('getStats returns activity stats', async () => {
        const result = await controller.getStats('a1');
        expect(result.data.confirmed).toBe(8);
    });

    it('create creates new activity', async () => {
        const result = await controller.create({ title: '防災訓練' } as any);
        expect(result.message).toContain('建立');
    });

    it('update updates activity', async () => {
        const result = await controller.update('a1', { title: '更新' });
        expect(result.message).toContain('更新');
    });

    it('publish publishes activity', async () => {
        const result = await controller.publish('a1');
        expect(result.message).toContain('發布');
    });

    it('close closes registration', async () => {
        const result = await controller.close('a1');
        expect(result.message).toContain('關閉');
    });

    it('cancel cancels activity', async () => {
        const result = await controller.cancel('a1');
        expect(result.message).toContain('取消');
    });

    it('complete completes activity', async () => {
        const result = await controller.complete('a1');
        expect(result.message).toContain('完成');
    });

    it('getRegistrations returns registrations', async () => {
        const result = await controller.getRegistrations('a1');
        expect(result.count).toBe(1);
    });

    it('register registers for activity', async () => {
        const result = await controller.register('a1', { userId: 'u1', name: '測試' } as any);
        expect(result.success).toBe(true);
    });

    it('approveRegistration approves registration', async () => {
        const result = await controller.approveRegistration('r1', { reviewedBy: 'admin1' });
        expect(result.message).toContain('審核');
    });

    it('cancelRegistration cancels registration', async () => {
        const result = await controller.cancelRegistration('r1', 'u1');
        expect(result.message).toContain('取消');
    });

    it('markAttendance marks attendance', async () => {
        const result = await controller.markAttendance('r1', { attended: true });
        expect(result.message).toContain('簽到');
    });
});
