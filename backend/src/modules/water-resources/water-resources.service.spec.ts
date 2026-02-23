import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WaterResourcesService } from './water-resources.service';

// Mock global fetch
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe('WaterResourcesService', () => {
    let service: WaterResourcesService;

    beforeEach(async () => {
        mockFetch.mockReset();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WaterResourcesService,
                { provide: ConfigService, useValue: { get: jest.fn() } },
            ],
        }).compile();
        service = module.get<WaterResourcesService>(WaterResourcesService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('getRiverLevels', () => {
        it('should return mock data on API failure', async () => {
            mockFetch.mockRejectedValue(new Error('network'));
            const levels = await service.getRiverLevels();
            expect(levels.length).toBeGreaterThan(0);
            expect(levels[0].stationId).toBe('R01');
            expect(levels[0].status).toBe('normal');
        });

        it('should parse API response', async () => {
            mockFetch.mockResolvedValue({
                json: () => Promise.resolve({
                    RiverLevels: [{
                        StationIdentifier: 'S1', StationName: '測站', RiverName: '河',
                        WaterLevel: '3.0', WarningLevel: '5.0', AlertLevel: '6.0', RecordTime: '2025-01-01',
                    }],
                }),
            });
            const levels = await service.getRiverLevels();
            expect(levels).toHaveLength(1);
            expect(levels[0].waterLevel).toBe(3.0);
            expect(levels[0].status).toBe('normal');
        });
    });

    describe('getReservoirStatus', () => {
        it('should return mock data on API failure', async () => {
            mockFetch.mockRejectedValue(new Error('network'));
            const reservoirs = await service.getReservoirStatus();
            expect(reservoirs.length).toBe(2);
            expect(reservoirs[0].reservoirName).toBe('翡翠水庫');
        });
    });

    describe('getFloodPotentialAreas', () => {
        it('should return potential areas', async () => {
            const areas = await service.getFloodPotentialAreas('台北');
            expect(areas.length).toBe(2);
            expect(areas[0].riskLevel).toBe('high');
        });
    });

    describe('getActiveAlerts', () => {
        it('should return active water alerts', () => {
            const alerts = service.getActiveAlerts();
            expect(alerts).toHaveLength(1);
            expect(alerts[0].type).toBe('river_warning');
        });
    });

    describe('subscribeToAlerts', () => {
        it('should create subscription', () => {
            const sub = service.subscribeToAlerts(['台北', '基隆'], 'https://cb.example.com');
            expect(sub.regions).toEqual(['台北', '基隆']);
            expect(sub.status).toBe('active');
        });
    });
});
