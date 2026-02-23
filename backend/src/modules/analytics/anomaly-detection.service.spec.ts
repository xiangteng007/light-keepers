import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AnomalyDetectionService } from './anomaly-detection.service';

describe('AnomalyDetectionService', () => {
    let service: AnomalyDetectionService;
    let dataSource: { query: jest.Mock };

    beforeEach(async () => {
        dataSource = { query: jest.fn().mockResolvedValue([]) };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnomalyDetectionService,
                { provide: DataSource, useValue: dataSource },
            ],
        }).compile();

        service = module.get<AnomalyDetectionService>(AnomalyDetectionService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== Full Detection =====
    describe('detectAnomalies', () => {
        it('should return empty array when no anomalies', async () => {
            const result = await service.detectAnomalies();
            expect(result).toEqual([]);
        });

        it('should run all detectors and aggregate results', async () => {
            // Each detector calls safeQuery; with all returning empty, no anomalies
            const result = await service.detectAnomalies();
            expect(Array.isArray(result)).toBe(true);
        });
    });

    // ===== Report Spike Detection =====
    describe('detectReportSpikes', () => {
        it('should return empty when less than 3 hours of data', async () => {
            dataSource.query.mockResolvedValueOnce([
                { hour: '2024-01-01T01:00:00Z', count: '5' },
            ]);
            const result = await service.detectReportSpikes();
            expect(result).toEqual([]);
        });

        it('should detect spike above threshold', async () => {
            // Need many normal-range hours + 1 extreme spike for z-score > 2.5
            dataSource.query.mockResolvedValueOnce([
                { hour: '2024-01-01T01:00:00Z', count: '3' },
                { hour: '2024-01-01T02:00:00Z', count: '2' },
                { hour: '2024-01-01T03:00:00Z', count: '3' },
                { hour: '2024-01-01T04:00:00Z', count: '2' },
                { hour: '2024-01-01T05:00:00Z', count: '3' },
                { hour: '2024-01-01T06:00:00Z', count: '2' },
                { hour: '2024-01-01T07:00:00Z', count: '3' },
                { hour: '2024-01-01T08:00:00Z', count: '2' },
                { hour: '2024-01-01T09:00:00Z', count: '3' },
                { hour: '2024-01-01T10:00:00Z', count: '500' }, // extreme spike
            ]);
            const result = await service.detectReportSpikes();
            expect(result.length).toBeGreaterThanOrEqual(1);
            expect(result[0].type).toBe('spike_in_reports');
            expect(result[0].metrics).toBeDefined();
        });

        it('should not detect spike when data is uniform', async () => {
            dataSource.query.mockResolvedValueOnce([
                { hour: '2024-01-01T01:00:00Z', count: '5' },
                { hour: '2024-01-01T02:00:00Z', count: '5' },
                { hour: '2024-01-01T03:00:00Z', count: '5' },
            ]);
            const result = await service.detectReportSpikes();
            expect(result).toEqual([]);
        });
    });

    // ===== Unusual Locations =====
    describe('detectUnusualLocations', () => {
        it('should return empty when no historical data', async () => {
            dataSource.query
                .mockResolvedValueOnce([]) // recent
                .mockResolvedValueOnce([]); // historical
            const result = await service.detectUnusualLocations();
            expect(result).toEqual([]);
        });

        it('should detect far-away report', async () => {
            dataSource.query
                .mockResolvedValueOnce([
                    { id: 'r1', latitude: '35.0', longitude: '136.0', location: '大阪', created_at: new Date().toISOString() },
                ])
                .mockResolvedValueOnce([
                    { lat: '25.0', lng: '121.5' }, // center: 台北
                ]);
            const result = await service.detectUnusualLocations();
            expect(result.length).toBeGreaterThanOrEqual(1);
            expect(result[0].type).toBe('unusual_location');
        });
    });

    // ===== Suspicious Patterns =====
    describe('detectSuspiciousPatterns', () => {
        it('should return empty when no rapid reporters', async () => {
            dataSource.query.mockResolvedValueOnce([]);
            const result = await service.detectSuspiciousPatterns();
            expect(result).toEqual([]);
        });

        it('should detect rapid-fire reporter', async () => {
            dataSource.query.mockResolvedValueOnce([
                { reporter_id: 'user-1', count: '12' },
            ]);
            const result = await service.detectSuspiciousPatterns();
            expect(result).toHaveLength(1);
            expect(result[0].severity).toBe('high');
        });
    });

    // ===== Resource Anomalies =====
    describe('detectResourceAnomalies', () => {
        it('should return empty when resources are sufficient', async () => {
            dataSource.query.mockResolvedValueOnce([]);
            const result = await service.detectResourceAnomalies();
            expect(result).toEqual([]);
        });

        it('should detect depleted resource', async () => {
            dataSource.query.mockResolvedValueOnce([
                { name: '飲用水', quantity: '0', unit: '箱' },
            ]);
            const result = await service.detectResourceAnomalies();
            expect(result).toHaveLength(1);
            expect(result[0].severity).toBe('critical');
            expect(result[0].recommendation).toContain('Replenish');
        });

        it('should detect low resource as high severity', async () => {
            dataSource.query.mockResolvedValueOnce([
                { name: '急救包', quantity: '5', unit: '組' },
            ]);
            const result = await service.detectResourceAnomalies();
            expect(result).toHaveLength(1);
            expect(result[0].severity).toBe('high');
        });
    });
});
