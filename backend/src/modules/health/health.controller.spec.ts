import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { DataSource } from 'typeorm';

describe('HealthController', () => {
    let controller: HealthController;

    beforeEach(async () => {
        const mockDataSource = {
            isInitialized: true,
            query: jest.fn().mockResolvedValue([{ '1': 1 }]),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [HealthController],
            providers: [{ provide: DataSource, useValue: mockDataSource }],
        }).compile();

        controller = module.get<HealthController>(HealthController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('check returns liveness status', () => {
        const result = controller.check();
        expect(result.status).toBe('ok');
        expect(result.service).toBe('light-keepers-api');
    });

    it('live returns live status', () => {
        const result = controller.live();
        expect(result.status).toBe('live');
    });

    it('ready checks database and returns ready', async () => {
        const result = await controller.ready();
        expect(result.status).toBe('ready');
        expect(result.checks.database).toBe('ok');
    });

    it('details returns detailed health info', async () => {
        const result = await controller.details();
        expect(result).toHaveProperty('service', 'light-keepers-api');
        expect(result).toHaveProperty('memory');
    });

    describe('llm', () => {
        const mockDataSource = { isInitialized: true, query: jest.fn() } as never;

        it('reports not_configured when no LLM provider is wired', async () => {
            const result = await new HealthController(mockDataSource).llmHealth();
            expect(result.status).toBe('not_configured');
            expect(result.active).toBe('none');
        });

        it('exposes the active provider and both probe results', async () => {
            const llm = {
                healthCheck: jest.fn().mockResolvedValue({
                    mode: 'hybrid',
                    active: 'local',
                    providers: {
                        local: { provider: 'local', configured: true, reachable: true, latencyMs: 8 },
                        gemini: { provider: 'gemini', configured: true, reachable: true },
                    },
                }),
            } as never;

            const result: Record<string, unknown> = await new HealthController(
                mockDataSource, llm,
            ).llmHealth();

            expect(result.status).toBe('ok');
            expect(result.mode).toBe('hybrid');
            expect(result.active).toBe('local');
        });

        it('reports unavailable when nothing can serve traffic', async () => {
            const llm = {
                healthCheck: jest.fn().mockResolvedValue({
                    mode: 'local',
                    active: 'none',
                    providers: {
                        local: { provider: 'local', configured: true, reachable: false, error: 'ECONNREFUSED' },
                        gemini: { provider: 'gemini', configured: false, reachable: false },
                    },
                }),
            } as never;

            const result = await new HealthController(mockDataSource, llm).llmHealth();
            expect(result.status).toBe('unavailable');
        });

        it('never throws when the probe itself blows up', async () => {
            const llm = {
                healthCheck: jest.fn().mockRejectedValue(new Error('probe exploded')),
            } as never;

            const result = await new HealthController(mockDataSource, llm).llmHealth();
            expect(result.status).toBe('error');
        });
    });
});
