import { Test, TestingModule } from '@nestjs/testing';
import { ClusterCoordinationController } from './cluster-coordination.controller';
import { ClusterCoordinationService } from './cluster-coordination.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('ClusterCoordinationController', () => {
    let controller: ClusterCoordinationController;

    beforeEach(async () => {
        const service = {
            getClusterOverview: jest.fn().mockResolvedValue({ clusters: [] }),
            getClusterMembers: jest.fn().mockResolvedValue([]),
            joinCluster: jest.fn().mockResolvedValue({ success: true }),
            getUpcomingMeetings: jest.fn().mockResolvedValue([]),
            scheduleMeeting: jest.fn().mockResolvedValue({ id: 'm1' }),
            addActionItem: jest.fn().mockResolvedValue({ id: 'a1' }),
            getPendingActions: jest.fn().mockResolvedValue([]),
            submitFourW: jest.fn().mockResolvedValue({ id: '4w1' }),
            getFourWSummary: jest.fn().mockResolvedValue({ totalEntries: 0 }),
            getFourWByCluster: jest.fn().mockResolvedValue([]),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ClusterCoordinationController],
            providers: [{ provide: ClusterCoordinationService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<ClusterCoordinationController>(ClusterCoordinationController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('getClusterOverview returns overview', async () => {
        const result = await controller.getClusterOverview();
        expect(result).toBeDefined();
    });

    it('getClusterMembers returns members', async () => {
        const result = await controller.getClusterMembers('health' as any);
        expect(result).toBeDefined();
    });

    it('joinCluster joins a cluster', async () => {
        const result = await controller.joinCluster({
            organizationId: 'org1', organizationName: 'Test',
            cluster: 'health' as any,
            contact: { name: 'A', email: 'a@b.com' },
        });
        expect(result).toBeDefined();
    });

    it('getUpcomingMeetings returns meetings', async () => {
        const result = await controller.getUpcomingMeetings();
        expect(result).toBeDefined();
    });

    it('scheduleMeeting schedules a meeting', async () => {
        const result = await controller.scheduleMeeting({
            cluster: 'health' as any, title: 'Weekly', scheduledAt: '2026-02-15',
            agenda: ['Item 1'],
        });
        expect(result.id).toBe('m1');
    });

    it('submitFourW submits 4W entry', async () => {
        const result = await controller.submitFourW({
            who: 'Red Cross', what: 'Medical aid', where: 'Taipei',
            when: { start: '2026-01-01' }, beneficiaries: 100, cluster: 'health' as any,
        });
        expect(result).toBeDefined();
    });

    it('getFourWSummary returns summary', async () => {
        const result = await controller.getFourWSummary();
        expect(result).toBeDefined();
    });
});
