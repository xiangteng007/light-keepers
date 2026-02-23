import { Test, TestingModule } from '@nestjs/testing';
import { IAPController } from './iap.controller';
import { IAPService } from './iap.service';

describe('IAPController', () => {
    let controller: IAPController;

    beforeEach(async () => {
        const service = {
            getPeriods: jest.fn().mockResolvedValue([]),
            getActivePeriod: jest.fn().mockResolvedValue({}),
            createPeriod: jest.fn().mockResolvedValue({ id: 'p1' }),
            updatePeriod: jest.fn().mockResolvedValue({}),
            approvePeriod: jest.fn().mockResolvedValue({}),
            activatePeriod: jest.fn().mockResolvedValue({}),
            closePeriod: jest.fn().mockResolvedValue({}),
            getDocuments: jest.fn().mockResolvedValue([]),
            getDocument: jest.fn().mockResolvedValue({}),
            upsertDocument: jest.fn().mockResolvedValue({}),
            approveDocument: jest.fn().mockResolvedValue({}),
            exportIAP: jest.fn().mockResolvedValue({}),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [IAPController],
            providers: [{ provide: IAPService, useValue: service }],
        }).compile();

        controller = module.get<IAPController>(IAPController);
    });

    const req = { user: { uid: 'u1' } } as any;

    it('should be defined', () => expect(controller).toBeDefined());
    it('getPeriods returns periods', async () => {
        const result = await controller.getPeriods('s1');
        expect(result.success).toBe(true);
    });
    it('getActivePeriod returns active', async () => {
        const result = await controller.getActivePeriod('s1');
        expect(result.success).toBe(true);
    });
    it('createPeriod creates period', async () => {
        const result = await controller.createPeriod('s1', { startTime: '2025-01-01' }, req);
        expect(result.success).toBe(true);
    });
    it('activatePeriod activates', async () => {
        const result = await controller.activatePeriod('p1');
        expect(result.success).toBe(true);
    });
    it('closePeriod closes', async () => {
        const result = await controller.closePeriod('p1');
        expect(result.success).toBe(true);
    });
    it('getDocuments returns docs', async () => {
        const result = await controller.getDocuments('p1');
        expect(result.success).toBe(true);
    });
    it('exportIAP exports', async () => {
        const result = await controller.exportIAP('p1');
        expect(result.success).toBe(true);
    });
});
