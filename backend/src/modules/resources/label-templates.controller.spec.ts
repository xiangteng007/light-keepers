import { Test, TestingModule } from '@nestjs/testing';
import { LabelTemplatesController } from './label-templates.controller';
import { LabelTemplatesService } from './label-templates.service';

describe('LabelTemplatesController', () => {
    let controller: LabelTemplatesController;

    beforeEach(async () => {
        const service = {
            findAll: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue({ id: 't1' }),
            create: jest.fn().mockResolvedValue({ id: 't1' }),
            update: jest.fn().mockResolvedValue({ id: 't1' }),
            setActive: jest.fn().mockResolvedValue({ id: 't1' }),
            delete: jest.fn().mockResolvedValue(undefined),
            getApplicableTemplates: jest.fn().mockResolvedValue([]),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [LabelTemplatesController],
            providers: [{ provide: LabelTemplatesService, useValue: service }],
        }).compile();

        controller = module.get<LabelTemplatesController>(LabelTemplatesController);
    });

    const req = { user: { uid: 'u1', roleLevel: 5 } } as any;

    it('should be defined', () => expect(controller).toBeDefined());
    it('findAll returns templates', async () => expect(await controller.findAll()).toEqual([]));
    it('findOne returns template', async () => expect(await controller.findOne('t1')).toBeDefined());
    it('create creates template', async () => {
        const result = await controller.create({ name: 'T', targetTypes: ['lot'], controlLevels: ['controlled'], width: 100, height: 50, layoutConfig: {} }, req);
        expect(result).toBeDefined();
    });
    it('delete deletes template', async () => {
        const result = await controller.delete('t1');
        expect(result.message).toContain('刪除');
    });
    it('getApplicable returns applicable', async () => {
        expect(await controller.getApplicable('lot', 'controlled')).toEqual([]);
    });
});
