import { Test, TestingModule } from '@nestjs/testing';
import { IcsFormsController } from './ics-forms.controller';
import { IcsFormsService } from './ics-forms.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('IcsFormsController', () => {
    let controller: IcsFormsController;
    const mockReq = { user: { sub: 'u1', name: 'Test' } } as any;

    beforeEach(async () => {
        const service = {
            findAll: jest.fn().mockResolvedValue({ data: [], total: 0 }),
            getFormTypeDescription: jest.fn().mockReturnValue('ICS-201'),
            findOne: jest.fn().mockResolvedValue({ id: 'f1' }),
            exportToJson: jest.fn().mockResolvedValue({ formType: 'ICS-201' }),
            create: jest.fn().mockResolvedValue({ id: 'f2' }),
            update: jest.fn().mockResolvedValue({ id: 'f1' }),
            approve: jest.fn().mockResolvedValue({ id: 'f1', status: 'approved' }),
            createNewVersion: jest.fn().mockResolvedValue({ id: 'f3', version: 2 }),
            remove: jest.fn().mockResolvedValue(undefined),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [IcsFormsController],
            providers: [{ provide: IcsFormsService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<IcsFormsController>(IcsFormsController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('findAll returns forms list', async () => {
        const result = await controller.findAll({} as any);
        expect(result.total).toBe(0);
    });

    it('findOne returns single form', async () => {
        const result = await controller.findOne('f1');
        expect(result).toBeDefined();
    });

    it('exportToJson exports form', async () => {
        const result = await controller.exportToJson('f1');
        expect(result).toBeDefined();
    });

    it('create creates a form', async () => {
        const result = await controller.create({} as any, mockReq);
        expect(result).toBeDefined();
    });

    it('update updates a form', async () => {
        const result = await controller.update('f1', {} as any);
        expect(result).toBeDefined();
    });

    it('approve approves a form', async () => {
        const result = await controller.approve('f1', { comments: 'ok' } as any, mockReq);
        expect(result).toBeDefined();
    });

    it('createNewVersion creates new version', async () => {
        const result = await controller.createNewVersion('f1', mockReq);
        expect(result).toBeDefined();
    });

    it('remove deletes a form', async () => {
        const result = await controller.remove('f1');
        expect(result.message).toContain('deleted');
    });
});
