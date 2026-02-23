import { Test, TestingModule } from '@nestjs/testing';
import { Fire119Controller } from './fire-119.controller';
import { Fire119Service } from './fire-119.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('Fire119Controller', () => {
    let controller: Fire119Controller;

    beforeEach(async () => {
        const service = {
            getRecentIncidents: jest.fn().mockResolvedValue([]),
            getIncidentDetails: jest.fn().mockResolvedValue({ id: 'inc1', type: '火警' }),
            getFireUnitLocations: jest.fn().mockResolvedValue([]),
            getIncidentStats: jest.fn().mockResolvedValue({ total: 5 }),
            subscribeToIncidents: jest.fn().mockResolvedValue({ subscriptionId: 'sub1' }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [Fire119Controller],
            providers: [{ provide: Fire119Service, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<Fire119Controller>(Fire119Controller);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('getRecentIncidents returns incidents', async () => {
        const result = await controller.getRecentIncidents('taipei', 24);
        expect(result).toBeDefined();
    });

    it('getIncidentDetails returns details', async () => {
        const result = await controller.getIncidentDetails('inc1');
        expect(result.success).toBe(true);
    });

    it('getIncidentDetails returns error for not found', async () => {
        const service = controller['fire119Service'] as any;
        service.getIncidentDetails.mockResolvedValueOnce(null);
        const result = await controller.getIncidentDetails('notfound');
        expect(result.success).toBe(false);
    });

    it('getFireUnitLocations returns locations', async () => {
        const result = await controller.getFireUnitLocations('taipei');
        expect(result.success).toBe(true);
    });

    it('getIncidentStats returns stats', async () => {
        const result = await controller.getIncidentStats('taipei', 'day');
        expect(result.success).toBe(true);
    });

    it('subscribeToIncidents subscribes', async () => {
        const result = await controller.subscribeToIncidents({ callbackUrl: 'http://test', types: ['fire'] });
        expect(result).toBeDefined();
    });
});
