import { Test, TestingModule } from '@nestjs/testing';
import { SheltersController } from './shelters.controller';
import { SheltersService } from './shelters.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('SheltersController', () => {
    let controller: SheltersController;

    beforeEach(async () => {
        const service = {
            create: jest.fn().mockResolvedValue({ id: 's1', name: 'Shelter A' }),
            findAll: jest.fn().mockResolvedValue([]),
            findById: jest.fn().mockResolvedValue({ id: 's1' }),
            activate: jest.fn().mockResolvedValue({ id: 's1', status: 'active' }),
            deactivate: jest.fn().mockResolvedValue({ id: 's1', status: 'inactive' }),
            checkIn: jest.fn().mockResolvedValue({ id: 'e1' }),
            checkOut: jest.fn().mockResolvedValue({ id: 'e1' }),
            getEvacuees: jest.fn().mockResolvedValue([]),
            createHealthScreening: jest.fn().mockResolvedValue({ id: 'h1' }),
            getHealthScreenings: jest.fn().mockResolvedValue([]),
            assignBed: jest.fn().mockResolvedValue({ id: 'e1' }),
            createDailyReport: jest.fn().mockResolvedValue({ id: 'dr1' }),
            getDailyReports: jest.fn().mockResolvedValue([]),
            findEvacueeByQueryCode: jest.fn().mockResolvedValue(null),
        };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [SheltersController],
            providers: [{ provide: SheltersService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();
        controller = module.get<SheltersController>(SheltersController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('create', async () => expect(await controller.create({} as any)).toBeDefined());
    it('findAll', async () => expect(await controller.findAll()).toEqual([]));
    it('findById', async () => expect(await controller.findById('s1')).toBeDefined());
    it('activate', async () => expect(await controller.activate('s1', {} as any, { id: 'u1' } as any)).toBeDefined());
    it('deactivate', async () => expect(await controller.deactivate('s1')).toBeDefined());
    it('checkIn', async () => expect(await controller.checkIn('s1', {} as any, { id: 'u1' } as any)).toBeDefined());
    it('getEvacuees', async () => expect(await controller.getEvacuees('s1')).toEqual([]));
});
