import { Test, TestingModule } from '@nestjs/testing';
import { ClusterCoordinationService, ClusterType } from './cluster-coordination.service';

const delay = (ms = 2) => new Promise(r => setTimeout(r, ms));

describe('ClusterCoordinationService', () => {
    let service: ClusterCoordinationService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ClusterCoordinationService],
        }).compile();

        service = module.get<ClusterCoordinationService>(ClusterCoordinationService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('joinCluster', () => {
        it('should register organization to a cluster', async () => {
            const m = await service.joinCluster('org-1', '紅十字會', ClusterType.HEALTH, { name: '張三', email: 'z@org.tw' }, 'lead');
            expect(m.id).toContain('mem-');
            expect(m.cluster).toBe(ClusterType.HEALTH);
            expect(m.role).toBe('lead');
        });

        it('should default role to member', async () => {
            const m = await service.joinCluster('org-2', '慈濟', ClusterType.SHELTER, { name: '李四', email: 'l@org.tw' });
            expect(m.role).toBe('member');
        });
    });

    describe('getClusterMembers', () => {
        it('should return members sorted by role', async () => {
            await service.joinCluster('org-1', 'A', ClusterType.WASH, { name: 'a', email: 'a@' }, 'member');
            await delay();
            await service.joinCluster('org-2', 'B', ClusterType.WASH, { name: 'b', email: 'b@' }, 'lead');
            await delay();
            await service.joinCluster('org-3', 'C', ClusterType.WASH, { name: 'c', email: 'c@' }, 'observer');
            const members = await service.getClusterMembers(ClusterType.WASH);
            expect(members).toHaveLength(3);
            expect(members[0].role).toBe('lead');
            expect(members[2].role).toBe('observer');
        });

        it('should filter by cluster', async () => {
            await service.joinCluster('org-1', 'A', ClusterType.HEALTH, { name: 'a', email: 'a@' });
            await delay();
            await service.joinCluster('org-2', 'B', ClusterType.LOGISTICS, { name: 'b', email: 'b@' });
            const health = await service.getClusterMembers(ClusterType.HEALTH);
            expect(health).toHaveLength(1);
        });
    });

    describe('getClusterOverview', () => {
        it('should return all 11 clusters', async () => {
            const overview = await service.getClusterOverview();
            expect(overview).toHaveLength(11);
        });

        it('should include lead org', async () => {
            await service.joinCluster('org-1', 'WHO', ClusterType.HEALTH, { name: 'a', email: 'a@' }, 'lead');
            const overview = await service.getClusterOverview();
            const health = overview.find(o => o.cluster === ClusterType.HEALTH);
            expect(health!.leadOrg).toBe('WHO');
            expect(health!.memberCount).toBe(1);
        });
    });

    describe('scheduleMeeting', () => {
        it('should create meeting with agenda', async () => {
            const future = new Date(Date.now() + 86400000);
            const mtg = await service.scheduleMeeting(ClusterType.LOGISTICS, '物資協調', future, ['議題1', '議題2']);
            expect(mtg.id).toContain('mtg-');
            expect(mtg.agenda).toHaveLength(2);
            expect(mtg.actionItems).toHaveLength(0);
        });
    });

    describe('addActionItem', () => {
        it('should add action item to meeting', async () => {
            const future = new Date(Date.now() + 86400000);
            const mtg = await service.scheduleMeeting(ClusterType.HEALTH, 'test', future, []);
            const action = await service.addActionItem(mtg.id, '準備報告', 'org-1', future);
            expect(action).not.toBeNull();
            expect(action!.status).toBe('pending');
        });

        it('should return null for unknown meeting', async () => {
            const result = await service.addActionItem('fake', 'x', 'y', new Date());
            expect(result).toBeNull();
        });
    });

    describe('submitFourW', () => {
        it('should auto-set status to planned for future', async () => {
            const future = new Date(Date.now() + 86400000 * 5);
            const entry = await service.submitFourW({
                who: 'UNICEF', what: '發放物資', where: '花蓮',
                when: { start: future }, beneficiaries: 500, cluster: ClusterType.FOOD_SECURITY,
            });
            expect(entry.status).toBe('planned');
        });

        it('should auto-set status to ongoing for current', async () => {
            const pastStart = new Date(Date.now() - 86400000);
            const entry = await service.submitFourW({
                who: 'WHO', what: '醫療服務', where: '台東',
                when: { start: pastStart }, beneficiaries: 200, cluster: ClusterType.HEALTH,
            });
            expect(entry.status).toBe('ongoing');
        });
    });

    describe('getFourWSummary', () => {
        it('should aggregate 4W entries', async () => {
            const past = new Date(Date.now() - 86400000);
            await service.submitFourW({ who: 'A', what: 'x', where: 'a', when: { start: past }, beneficiaries: 100, cluster: ClusterType.WASH });
            await service.submitFourW({ who: 'B', what: 'y', where: 'b', when: { start: past }, beneficiaries: 200, cluster: ClusterType.WASH });
            const summary = await service.getFourWSummary();
            expect(summary.totalActivities).toBe(2);
            expect(summary.byCluster[0].beneficiaries).toBe(300);
        });
    });

    describe('getUpcomingMeetings', () => {
        it('should return meetings sorted by date', async () => {
            const d1 = new Date(Date.now() + 86400000);
            const d2 = new Date(Date.now() + 86400000 * 3);
            await service.scheduleMeeting(ClusterType.HEALTH, 'M1', d2, []);
            await service.scheduleMeeting(ClusterType.HEALTH, 'M2', d1, []);
            const upcoming = await service.getUpcomingMeetings();
            expect(upcoming[0].title).toBe('M2');
        });
    });

    describe('getPendingActions', () => {
        it('should return non-completed actions', async () => {
            const future = new Date(Date.now() + 86400000);
            const mtg = await service.scheduleMeeting(ClusterType.SHELTER, 'test', future, []);
            await service.addActionItem(mtg.id, 'Task A', 'org-1', future);
            await service.addActionItem(mtg.id, 'Task B', 'org-2', future);
            const pending = await service.getPendingActions();
            expect(pending).toHaveLength(2);
            expect(pending[0].cluster).toBe(ClusterType.SHELTER);
        });
    });
});
