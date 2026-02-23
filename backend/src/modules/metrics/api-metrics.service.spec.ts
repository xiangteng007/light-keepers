import { Test, TestingModule } from '@nestjs/testing';
import { ApiMetricsService } from './api-metrics.service';
import { CacheService } from '../cache/cache.service';

describe('ApiMetricsService', () => {
    let service: ApiMetricsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApiMetricsService,
                { provide: CacheService, useValue: { get: jest.fn().mockResolvedValue(null), set: jest.fn().mockResolvedValue(undefined) } },
            ],
        }).compile();
        service = module.get(ApiMetricsService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('recordRequest creates endpoint metrics', () => {
        service.recordRequest('/api/v1/health', 'GET', 200, 50);
        const metrics = service.getEndpointMetrics();
        expect(metrics.length).toBe(1);
        expect(metrics[0].totalRequests).toBe(1);
    });

    it('getSystemMetrics returns system stats', () => {
        const metrics = service.getSystemMetrics();
        expect(metrics.uptime).toBeGreaterThanOrEqual(0);
        expect(metrics.memory).toBeDefined();
    });

    it('getSlowEndpoints returns sorted', () => {
        service.recordRequest('/slow', 'GET', 200, 500);
        service.recordRequest('/fast', 'GET', 200, 10);
        const slow = service.getSlowEndpoints(1);
        expect(slow[0].path).toBe('/slow');
    });

    it('getErrorProneEndpoints filters errors', () => {
        service.recordRequest('/errors', 'GET', 500, 100);
        const errored = service.getErrorProneEndpoints();
        expect(errored.length).toBe(1);
    });

    it('resetMetrics clears all', () => {
        service.recordRequest('/test', 'GET', 200, 10);
        service.resetMetrics();
        expect(service.getEndpointMetrics().length).toBe(0);
    });

    it('normalizePath replaces UUIDs', () => {
        const normalized = (service as any).normalizePath('/api/users/550e8400-e29b-41d4-a716-446655440000');
        expect(normalized).toContain(':id');
    });
});
