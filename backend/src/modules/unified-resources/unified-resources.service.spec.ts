import { UnifiedResourcesService } from './unified-resources.service';

describe('UnifiedResourcesService', () => {
    let service: UnifiedResourcesService;
    let matching: Record<string, jest.Mock>;
    let optimization: Record<string, jest.Mock>;

    beforeEach(() => {
        matching = {
            submitDonation: jest.fn().mockReturnValue({ id: 'd1', status: 'available' }),
            submitNeed: jest.fn().mockReturnValue({ id: 'n1' }),
            getAvailableDonations: jest.fn().mockReturnValue([]),
            getOpenNeeds: jest.fn().mockReturnValue([]),
            createMatch: jest.fn().mockReturnValue({ id: 'm1' }),
            confirmMatch: jest.fn().mockReturnValue({ id: 'm1', status: 'confirmed' }),
            completeMatch: jest.fn().mockReturnValue({ id: 'm1', status: 'completed' }),
            getStatistics: jest.fn().mockReturnValue({ total: 10 }),
            getDonorLeaderboard: jest.fn().mockReturnValue([]),
        };
        optimization = {
            optimizeAllocation: jest.fn().mockReturnValue({ allocations: [] }),
            suggestDepotLocations: jest.fn().mockReturnValue([]),
            optimizeRoutes: jest.fn().mockReturnValue({ route: [] }),
        };

        service = new UnifiedResourcesService(matching as any, optimization as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('getStatus', () => {
        it('should return ready', () => {
            const status = service.getStatus();
            expect(status.matchingReady).toBe(true);
            expect(status.optimizationReady).toBe(true);
        });
    });

    describe('matching delegation', () => {
        it('should delegate submitDonation', () => {
            service.submitDonation({ name: 'A', phone: '0911', address: 'Taipei', region: '台北', shippingOptions: ['pickup'] }, []);
            expect(matching.submitDonation).toHaveBeenCalled();
        });

        it('should delegate submitNeed', () => {
            service.submitNeed({ organizationName: 'NGO', contactName: 'B', contactPhone: '0922', itemType: 'food', itemName: '米', quantity: 100, unit: '公斤', urgency: 'high', region: '台北', deliveryAddress: 'addr', canPickup: true });
            expect(matching.submitNeed).toHaveBeenCalled();
        });

        it('should delegate createMatch', () => {
            service.createMatch('d1', 'n1', 50);
            expect(matching.createMatch).toHaveBeenCalledWith('d1', 'n1', 50);
        });

        it('should delegate getMatchingStats', () => {
            const stats = service.getMatchingStats();
            expect(stats).toBeDefined();
            expect(matching.getStatistics).toHaveBeenCalled();
        });
    });

    describe('optimization delegation', () => {
        it('should delegate optimizeAllocation', () => {
            service.optimizeAllocation({ resources: [], demands: [] });
            expect(optimization.optimizeAllocation).toHaveBeenCalled();
        });

        it('should delegate suggestDepotLocations', () => {
            service.suggestDepotLocations([], 3);
            expect(optimization.suggestDepotLocations).toHaveBeenCalledWith([], 3);
        });

        it('should delegate optimizeRoutes', () => {
            service.optimizeRoutes({ lat: 25, lng: 121 }, []);
            expect(optimization.optimizeRoutes).toHaveBeenCalled();
        });
    });

    describe('smartAllocateResources', () => {
        it('should return timestamp when no data', async () => {
            const result = await service.smartAllocateResources({});
            expect(result.suggestedAllocations).toBeNull();
            expect(result.timestamp).toBeInstanceOf(Date);
        });
    });
});
