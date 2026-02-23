import { Test, TestingModule } from '@nestjs/testing';
import { HeatmapService } from './heatmap.service';

describe('HeatmapService', () => {
    let service: HeatmapService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [HeatmapService],
        }).compile();

        service = module.get<HeatmapService>(HeatmapService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== generateHeatmap =====
    describe('generateHeatmap', () => {
        it('should generate heatmap with default config', () => {
            const points = [
                { lat: 25.033, lng: 121.565, value: 5 },
                { lat: 25.040, lng: 121.570, value: 3 },
            ];
            const result = service.generateHeatmap(points);
            expect(result.id).toContain('heatmap-');
            expect(result.points).toHaveLength(2);
            expect(result.config.radius).toBe(25);
            expect(result.config.blur).toBe(15);
            expect(result.config.maxZoom).toBe(18);
            expect(result.config.gradient).toBeDefined();
        });

        it('should merge custom config', () => {
            const result = service.generateHeatmap([], { radius: 50, blur: 20 });
            expect(result.config.radius).toBe(50);
            expect(result.config.blur).toBe(20);
            expect(result.config.maxZoom).toBe(18); // default preserved
        });
    });

    // ===== aggregateByGrid =====
    describe('aggregateByGrid', () => {
        it('should return empty for no points', () => {
            const result = service.aggregateByGrid([]);
            expect(result).toEqual([]);
        });

        it('should aggregate nearby points into same cell', () => {
            const points = [
                { lat: 25.0331, lng: 121.5651, value: 4 },
                { lat: 25.0335, lng: 121.5655, value: 6 },
            ];
            // gridSize=0.01 → both are floor(25.033/0.01)=2503 → same cell
            const result = service.aggregateByGrid(points, 0.01);
            expect(result).toHaveLength(1);
            expect(result[0].value).toBe(5); // avg of 4 and 6
            expect(result[0].lat).toBeCloseTo(25.0333, 3);
        });

        it('should keep distant points in separate cells', () => {
            const points = [
                { lat: 25.01, lng: 121.51, value: 3 },
                { lat: 25.05, lng: 121.55, value: 7 },
            ];
            const result = service.aggregateByGrid(points, 0.01);
            expect(result).toHaveLength(2);
        });
    });

    // ===== generateIncidentHeatmap =====
    describe('generateIncidentHeatmap', () => {
        it('should map severity to value', () => {
            const result = service.generateIncidentHeatmap([
                { lat: 25.0, lng: 121.0, severity: 5 },
                { lat: 25.1, lng: 121.1, severity: 2 },
            ]);
            expect(result.points[0].value).toBe(5);
            expect(result.points[1].value).toBe(2);
        });
    });

    // ===== generateResourceHeatmap =====
    describe('generateResourceHeatmap', () => {
        it('should use custom green-yellow-red gradient', () => {
            const result = service.generateResourceHeatmap([
                { lat: 25.0, lng: 121.0, quantity: 100 },
            ]);
            expect(result.config.gradient![0.4]).toBe('green');
            expect(result.config.gradient![1.0]).toBe('red');
        });
    });
});
