import { Test, TestingModule } from '@nestjs/testing';
import { IntakeController } from './intake.controller';
import { IntakeService } from './intake.service';

describe('IntakeController', () => {
    let controller: IntakeController;

    beforeEach(async () => {
        const service = {
            createIntake: jest.fn().mockResolvedValue({ id: 'int1', trackingCode: 'TRK001' }),
            findAll: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue({ id: 'int1' }),
            findByIncident: jest.fn().mockResolvedValue([]),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [IntakeController],
            providers: [{ provide: IntakeService, useValue: service }],
        }).compile();

        controller = module.get<IntakeController>(IntakeController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('create creates an intake report', async () => {
        const result = await controller.create({} as any);
        expect(result).toBeDefined();
    });

    it('findAll returns intake list', async () => {
        const result = await controller.findAll();
        expect(result).toBeDefined();
    });

    it('findOne returns single intake', async () => {
        const result = await controller.findOne('int1');
        expect(result).toBeDefined();
    });

    it('findByIncident returns related intakes', async () => {
        const result = await controller.findByIncident('inc1');
        expect(result).toBeDefined();
    });
});
