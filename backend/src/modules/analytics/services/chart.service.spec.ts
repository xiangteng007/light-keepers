import { Test, TestingModule } from '@nestjs/testing';
import { ChartService } from './chart.service';

describe('ChartService', () => {
    let service: ChartService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ChartService],
        }).compile();
        service = module.get<ChartService>(ChartService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('buildLineChart', () => {
        it('should create line chart with responsive + animated options', () => {
            const result = service.buildLineChart('Test', ['a', 'b'], [{ label: 's1', data: [1, 2] }]);
            expect(result.type).toBe('line');
            expect(result.title).toBe('Test');
            expect(result.options?.responsive).toBe(true);
            expect(result.options?.animated).toBe(true);
        });
    });

    describe('buildBarChart', () => {
        it('should create bar chart', () => {
            const result = service.buildBarChart('Bar', ['x'], [{ label: 'd', data: [5] }]);
            expect(result.type).toBe('bar');
        });
    });

    describe('buildPieChart', () => {
        it('should auto-generate colors when not provided', () => {
            const result = service.buildPieChart('Pie', ['a', 'b', 'c'], [10, 20, 30]);
            expect(result.type).toBe('pie');
            expect(result.datasets[0].backgroundColor).toHaveLength(3);
        });

        it('should use custom colors', () => {
            const colors = ['#ff0000', '#00ff00'];
            const result = service.buildPieChart('Pie', ['a', 'b'], [10, 20], colors);
            expect(result.datasets[0].backgroundColor).toEqual(colors);
        });
    });

    describe('buildAreaChart', () => {
        it('should create area chart', () => {
            const result = service.buildAreaChart('Area', ['a'], [{ label: 's', data: [1] }]);
            expect(result.type).toBe('area');
        });
    });

    describe('buildRadarChart', () => {
        it('should create radar chart', () => {
            const result = service.buildRadarChart('Radar', ['a', 'b'], [{ label: 's', data: [1, 2] }]);
            expect(result.type).toBe('radar');
        });
    });

    describe('buildTimeSeriesChart', () => {
        it('should group by date and series', () => {
            const data = [
                { timestamp: new Date('2024-01-01'), value: 10, series: 'A' },
                { timestamp: new Date('2024-01-01'), value: 20, series: 'B' },
                { timestamp: new Date('2024-01-02'), value: 30, series: 'A' },
            ];
            const result = service.buildTimeSeriesChart('TS', data);
            expect(result.type).toBe('line');
            expect(result.labels).toHaveLength(2); // 2 dates
            expect(result.datasets).toHaveLength(2); // 2 series
        });

        it('should use "default" series when not specified', () => {
            const data = [{ timestamp: new Date('2024-01-01'), value: 5 }];
            const result = service.buildTimeSeriesChart('TS', data);
            expect(result.datasets[0].label).toBe('default');
        });
    });

    describe('exportToCsv', () => {
        it('should produce valid CSV', () => {
            const config = service.buildBarChart('Test', ['Jan', 'Feb'], [
                { label: 'Sales', data: [100, 200] },
                { label: 'Cost', data: [50, 80] },
            ]);
            const csv = service.exportToCsv(config);
            const lines = csv.split('\n');
            expect(lines[0]).toBe('Label,Sales,Cost');
            expect(lines[1]).toBe('Jan,100,50');
            expect(lines[2]).toBe('Feb,200,80');
        });
    });
});
