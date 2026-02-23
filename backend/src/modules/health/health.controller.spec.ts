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
});
