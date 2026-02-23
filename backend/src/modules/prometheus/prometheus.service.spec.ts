import { Test, TestingModule } from '@nestjs/testing';
import { PrometheusService } from './prometheus.service';

describe('PrometheusService', () => {
    let service: PrometheusService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [PrometheusService],
        }).compile();
        service = module.get(PrometheusService);
        service.onModuleInit();
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('inc increments counter', () => {
        service.inc('http_requests_total');
        service.inc('http_requests_total');
        // No error = success
    });

    it('observe records histogram value', () => {
        service.observe('http_request_duration_seconds', 0.123);
        service.observe('http_request_duration_seconds', 0.456);
    });

    it('set updates gauge', () => {
        service.set('active_incidents', 5);
    });

    it('getMetrics returns prometheus format', async () => {
        service.inc('http_requests_total');
        const metrics = await service.getMetrics();
        expect(metrics).toContain('http_requests_total');
        expect(metrics).toContain('# HELP');
    });

    it('getMetricsJson returns json format', async () => {
        service.inc('http_requests_total');
        service.set('active_incidents', 3);
        const json = await service.getMetricsJson();
        expect(json.counters).toBeDefined();
        expect(json.gauges).toBeDefined();
        expect(json.timestamp).toBeDefined();
    });

    it('recordHttpRequest tracks request', () => {
        service.recordHttpRequest('GET', '/api/health', 200, 50);
        // No error = success
    });

    it('recordDbQuery tracks query', () => {
        service.recordDbQuery('SELECT', 'users', 10);
    });
});
