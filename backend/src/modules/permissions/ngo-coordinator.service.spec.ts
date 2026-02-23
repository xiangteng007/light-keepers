import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NgoCoordinatorService, NgoRole, ClusterType, NgoPermission } from './ngo-coordinator.service';

describe('NgoCoordinatorService', () => {
    let service: NgoCoordinatorService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NgoCoordinatorService,
                { provide: EventEmitter2, useValue: { emit: jest.fn() } },
            ],
        }).compile();
        service = module.get(NgoCoordinatorService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('assignCoordinatorRole returns coordinator', () => {
        const c = service.assignCoordinatorRole('u1', NgoRole.CLUSTER_LEAD, 'Red Cross', { clusters: [ClusterType.HEALTH] }, 'admin');
        expect(c.userId).toBe('u1');
        expect(c.role).toBe(NgoRole.CLUSTER_LEAD);
    });

    it('revokeCoordinatorRole works', () => {
        const c = service.assignCoordinatorRole('u1', NgoRole.NGO_LIAISON, 'UNICEF', {}, 'admin');
        expect(service.revokeCoordinatorRole(c.id, 'test')).toBe(true);
    });

    it('getUserCoordinatorRoles returns list', () => {
        service.assignCoordinatorRole('u1', NgoRole.CLUSTER_LEAD, 'Org', {}, 'admin');
        expect(service.getUserCoordinatorRoles('u1').length).toBe(1);
    });

    it('hasPermission checks permissions', () => {
        service.assignCoordinatorRole('u1', NgoRole.CLUSTER_LEAD, 'Org', {}, 'admin');
        expect(service.hasPermission('u1', NgoPermission.MANAGE_CLUSTER_MEETINGS)).toBe(true);
    });

    it('getClusterLeads returns leads', () => {
        service.assignCoordinatorRole('u1', NgoRole.CLUSTER_LEAD, 'Org', { clusters: [ClusterType.HEALTH] }, 'admin');
        expect(service.getClusterLeads(ClusterType.HEALTH).length).toBe(1);
    });

    it('scheduleClusterMeeting returns meeting', () => {
        const m = service.scheduleClusterMeeting(ClusterType.HEALTH, {
            title: 'Week review', scheduledAt: new Date(), venue: 'EOC',
            agenda: ['item1'], participants: ['u1'], description: 'desc', assignee: 'u1',
            dueDate: new Date(), status: 'pending',
        } as any);
        expect(m.id).toBeDefined();
    });

    it('getClusterMeetings returns meetings', () => {
        service.scheduleClusterMeeting(ClusterType.HEALTH, {
            title: 'M', scheduledAt: new Date(), venue: 'V',
            agenda: [], participants: [], description: 'd', assignee: 'a',
            dueDate: new Date(), status: 'pending',
        } as any);
        expect(service.getClusterMeetings(ClusterType.HEALTH).length).toBe(1);
    });

    it('getOrganizationCoordinators returns list', () => {
        service.assignCoordinatorRole('u1', NgoRole.NGO_LIAISON, 'UNICEF', {}, 'admin');
        expect(service.getOrganizationCoordinators('UNICEF').length).toBe(1);
    });

    it('getStats returns statistics', () => {
        const stats = service.getStats();
        expect(stats.totalCoordinators).toBeDefined();
    });

    it('generateCoordinatorDirectory returns data', () => {
        const dir = service.generateCoordinatorDirectory();
        expect(dir.byRole).toBeDefined();
        expect(dir.byCluster).toBeDefined();
    });
});
