import { Test, TestingModule } from '@nestjs/testing';
import { StructuralAssessmentController } from './structural-assessment.controller';
import { StructuralAssessmentService } from './structural-assessment.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('StructuralAssessmentController', () => {
    let controller: StructuralAssessmentController;

    beforeEach(async () => {
        const service = {
            create: jest.fn().mockResolvedValue({ id: 'sa1' }),
            findAll: jest.fn().mockResolvedValue([]),
            getStatistics: jest.fn().mockResolvedValue({}),
            findBySafetyLevel: jest.fn().mockResolvedValue([]),
            findById: jest.fn().mockResolvedValue({ id: 'sa1' }),
            update: jest.fn().mockResolvedValue({ id: 'sa1' }),
            updateRescueCount: jest.fn().mockResolvedValue({ id: 'sa1' }),
        };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [StructuralAssessmentController],
            providers: [{ provide: StructuralAssessmentService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();
        controller = module.get<StructuralAssessmentController>(StructuralAssessmentController);
    });

    const user = { id: 'u1' } as any;

    it('should be defined', () => expect(controller).toBeDefined());
    it('create', async () => expect(await controller.create({} as any, user)).toBeDefined());
    it('findAll', async () => expect(await controller.findAll()).toEqual([]));
    it('getStatistics', async () => expect(await controller.getStatistics()).toBeDefined());
    it('findBySafetyLevel', async () => expect(await controller.findBySafetyLevel('safe' as any)).toEqual([]));
    it('findById', async () => expect(await controller.findById('sa1')).toBeDefined());
    it('update', async () => expect(await controller.update('sa1', {} as any, user)).toBeDefined());
    it('updateRescued', async () => expect(await controller.updateRescued('sa1', 5)).toBeDefined());
});
