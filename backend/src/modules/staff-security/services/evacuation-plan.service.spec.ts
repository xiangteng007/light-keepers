import { EvacuationPlanService } from './evacuation-plan.service';

describe('EvacuationPlanService', () => {
    let service: EvacuationPlanService;

    beforeEach(() => {
        service = new EvacuationPlanService();
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('createPlan', () => {
        it('should create evacuation plan with defaults', async () => {
            const plan = await service.createPlan('loc-1', { name: '台北市疏散計畫' });
            expect(plan.id).toBeDefined();
            expect(plan.name).toBe('台北市疏散計畫');
            expect(plan.locationId).toBe('loc-1');
            expect(plan.routes).toEqual([]);
        });

        it('should create plan with assembly points', async () => {
            const plan = await service.createPlan('loc-2', {
                name: '測試計畫',
                assemblyPoints: [{
                    id: 'ap-1', name: '集合點A',
                    latitude: 25.03, longitude: 121.56,
                    capacity: 100, facilities: ['水', '電'], contacts: ['張三'],
                }],
            });
            expect(plan.assemblyPoints.length).toBe(1);
        });
    });

    describe('getPlan', () => {
        it('should return plan by ID', async () => {
            const created = await service.createPlan('loc-1', { name: 'Test' });
            const found = await service.getPlan(created.id);
            expect(found).toBeDefined();
            expect(found!.name).toBe('Test');
        });

        it('should return null for unknown ID', async () => {
            const found = await service.getPlan('bad-id');
            expect(found).toBeNull();
        });
    });

    describe('getPlansForLocation', () => {
        it('should return plans for specific location', async () => {
            const plan = await service.createPlan('loc-1', { name: 'A' });
            const plans = await service.getPlansForLocation('loc-1');
            expect(plans.length).toBe(1);
            expect(plans[0].locationId).toBe('loc-1');
        });

        it('should return empty for unknown location', async () => {
            const plans = await service.getPlansForLocation('unknown');
            expect(plans.length).toBe(0);
        });
    });

    describe('initiateEvacuation', () => {
        it('should initiate evacuation for existing plan', async () => {
            const plan = await service.createPlan('loc-1', { name: 'Evac' });
            const result = await service.initiateEvacuation(plan.id, 'admin', '地震');
            expect(result.success).toBe(true);
            expect(result.message).toContain('Evac');
        });

        it('should fail for unknown plan', async () => {
            const result = await service.initiateEvacuation('bad', 'admin', 'test');
            expect(result.success).toBe(false);
        });
    });

    describe('getNearestAssemblyPoint', () => {
        it('should find nearest assembly point', async () => {
            const plan = await service.createPlan('loc-1', {
                name: 'Test',
                assemblyPoints: [
                    { id: '1', name: '遠', latitude: 26.0, longitude: 122.0, capacity: 50, facilities: [], contacts: [] },
                    { id: '2', name: '近', latitude: 25.031, longitude: 121.561, capacity: 100, facilities: [], contacts: [] },
                ],
            });
            const nearest = await service.getNearestAssemblyPoint(plan.id, 25.03, 121.56);
            expect(nearest).toBeDefined();
            expect(nearest!.name).toBe('近');
        });

        it('should return null for plan without assembly points', async () => {
            const plan = await service.createPlan('loc-1', { name: 'Empty' });
            const nearest = await service.getNearestAssemblyPoint(plan.id, 25.03, 121.56);
            expect(nearest).toBeNull();
        });
    });

    describe('haversineDistance', () => {
        it('should calculate distance between points', () => {
            const d = (service as any).haversineDistance(25.03, 121.56, 25.04, 121.56);
            expect(d).toBeGreaterThan(0);
            expect(d).toBeLessThan(5); // ~1.1 km
        });
    });
});
