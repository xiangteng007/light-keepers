import { Test, TestingModule } from '@nestjs/testing';
import { FieldReportsController } from './field-reports.controller';
import { FieldReportsService } from './field-reports.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('FieldReportsController', () => {
    let controller: FieldReportsController;
    const mockUser = { uid: 'u1', id: 'u1', roleLevel: 3 } as any;

    beforeEach(async () => {
        const service = {
            create: jest.fn().mockResolvedValue({ id: 'rpt1', status: 'draft' }),
            findBySession: jest.fn().mockResolvedValue({ data: [], total: 0 }),
            update: jest.fn().mockResolvedValue({ id: 'rpt1', status: 'triaged' }),
            softDelete: jest.fn().mockResolvedValue(undefined),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [FieldReportsController],
            providers: [{ provide: FieldReportsService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<FieldReportsController>(FieldReportsController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('create creates a field report', async () => {
        const result = await controller.create('ms1', {} as any, mockUser);
        expect(result).toBeDefined();
    });

    it('findAll lists field reports', async () => {
        const result = await controller.findAll('ms1', {} as any);
        expect(result).toBeDefined();
    });

    it('update updates a field report', async () => {
        const result = await controller.update('rpt1', {} as any, '"1"', mockUser);
        expect(result).toBeDefined();
    });

    it('delete soft deletes a field report', async () => {
        await expect(controller.delete('rpt1', mockUser)).resolves.toBeUndefined();
    });
});
