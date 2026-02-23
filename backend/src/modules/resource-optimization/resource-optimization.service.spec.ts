import { Test, TestingModule } from '@nestjs/testing';
import { ResourceOptimizationService } from './resource-optimization.service';

describe('ResourceOptimizationService', () => {
    let service: ResourceOptimizationService;

    const taipei = { lat: 25.033, lng: 121.565 };
    const kaohsiung = { lat: 22.627, lng: 120.301 };
    const taichung = { lat: 24.147, lng: 120.673 };
    const hualien = { lat: 23.991, lng: 121.611 };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ResourceOptimizationService],
        }).compile();

        service = module.get<ResourceOptimizationService>(ResourceOptimizationService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== optimizeAllocation =====
    describe('optimizeAllocation', () => {
        it('should allocate resources to demands by priority', () => {
            const result = service.optimizeAllocation({
                resources: [
                    { id: 'r1', type: 'water', available: 100, location: taipei },
                ],
                demands: [
                    { id: 'd1', resourceType: 'water', quantity: 50, location: taichung, priority: 'high' },
                    { id: 'd2', resourceType: 'water', quantity: 30, location: kaohsiung, priority: 'critical' },
                ],
            });
            expect(result.allocations.length).toBeGreaterThan(0);
            // Critical should be allocated first
            const criticalAlloc = result.allocations.find(a => a.demandId === 'd2');
            expect(criticalAlloc).toBeDefined();
            expect(criticalAlloc!.quantity).toBe(30);
        });

        it('should track fulfillment rate', () => {
            const result = service.optimizeAllocation({
                resources: [
                    { id: 'r1', type: 'food', available: 50, location: taipei },
                ],
                demands: [
                    { id: 'd1', resourceType: 'food', quantity: 100, location: taichung, priority: 'medium' },
                ],
            });
            expect(result.metrics.fulfillmentRate).toBe(0.5);
            expect(result.metrics.totalAllocated).toBe(50);
            expect(result.metrics.totalDemand).toBe(100);
            expect(result.metrics.unmetDemandsCount).toBe(1);
        });

        it('should prefer nearest resource source', () => {
            const result = service.optimizeAllocation({
                resources: [
                    { id: 'r-far', type: 'medicine', available: 50, location: kaohsiung },
                    { id: 'r-near', type: 'medicine', available: 50, location: taichung },
                ],
                demands: [
                    { id: 'd1', resourceType: 'medicine', quantity: 30, location: taipei, priority: 'high' },
                ],
            });
            // Taichung is closer to Taipei than Kaohsiung
            expect(result.allocations[0].resourceId).toBe('r-near');
        });

        it('should handle 100% fulfillment', () => {
            const result = service.optimizeAllocation({
                resources: [{ id: 'r1', type: 'blanket', available: 200, location: taipei }],
                demands: [{ id: 'd1', resourceType: 'blanket', quantity: 100, location: taichung, priority: 'low' }],
            });
            expect(result.metrics.fulfillmentRate).toBe(1);
            expect(result.metrics.unmetDemandsCount).toBe(0);
        });

        it('should generate recommendations for unmet critical demands', () => {
            const result = service.optimizeAllocation({
                resources: [],
                demands: [{ id: 'd1', resourceType: 'water', quantity: 100, location: taipei, priority: 'critical' }],
            });
            expect(result.recommendations.some(r => r.includes('關鍵需求'))).toBe(true);
        });

        it('should handle empty config', () => {
            const result = service.optimizeAllocation({ resources: [], demands: [] });
            expect(result.allocations).toHaveLength(0);
            expect(result.metrics.fulfillmentRate).toBe(1);
        });
    });

    // ===== suggestDepotLocations =====
    describe('suggestDepotLocations', () => {
        it('should suggest depot locations via K-means', () => {
            const demands = [taipei, taichung, kaohsiung, hualien];
            const depots = service.suggestDepotLocations(demands, 2);
            expect(depots).toHaveLength(2);
            depots.forEach(d => {
                expect(d.id).toContain('depot-');
                expect(d.location.lat).toBeDefined();
                expect(d.coverageRadius).toBeGreaterThan(0);
            });
        });

        it('should return all points when k >= points', () => {
            const points = [taipei, kaohsiung];
            const depots = service.suggestDepotLocations(points, 5);
            expect(depots).toHaveLength(2);
        });
    });

    // ===== optimizeRoutes =====
    describe('optimizeRoutes', () => {
        it('should optimize route using nearest neighbor TSP', () => {
            const route = service.optimizeRoutes(taipei, [kaohsiung, taichung, hualien]);
            expect(route.route[0]).toEqual(taipei);
            expect(route.stops).toBe(3);
            expect(route.totalDistance).toBeGreaterThan(0);
            expect(route.estimatedTime).toBeGreaterThan(0);
        });

        it('should visit taichung before kaohsiung from taipei', () => {
            const route = service.optimizeRoutes(taipei, [kaohsiung, taichung]);
            // Nearest neighbor: taipei -> taichung -> kaohsiung
            expect(route.route[1]).toEqual(taichung);
            expect(route.route[2]).toEqual(kaohsiung);
        });

        it('should handle single destination', () => {
            const route = service.optimizeRoutes(taipei, [kaohsiung]);
            expect(route.stops).toBe(1);
            expect(route.route).toHaveLength(2);
        });
    });
});
