import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IcsFormsService } from './ics-forms.service';
import { IcsForm } from './entities/ics-form.entity';

describe('IcsFormsService', () => {
    let service: IcsFormsService;
    const mockForm = { id: 'f1', formType: 'ICS-201', title: 'Test', status: 'draft', save: jest.fn() };

    beforeEach(async () => {
        const repo = {
            create: jest.fn().mockReturnValue(mockForm),
            save: jest.fn().mockResolvedValue(mockForm),
            findOne: jest.fn().mockResolvedValue(mockForm),
            find: jest.fn().mockResolvedValue([mockForm]),
            createQueryBuilder: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn().mockResolvedValue([[mockForm], 1]),
            }),
            remove: jest.fn().mockResolvedValue(undefined),
            update: jest.fn().mockResolvedValue(undefined),
        };
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                IcsFormsService,
                { provide: getRepositoryToken(IcsForm), useValue: repo },
            ],
        }).compile();
        service = module.get(IcsFormsService);
    });

    it('should be defined', () => expect(service).toBeDefined());
    it('create returns a form', async () => expect(await service.create({ formType: 'ICS-201' } as any, 'u1', 'User')).toBeDefined());
    it('findAll returns data and total', async () => {
        const result = await service.findAll({} as any);
        expect(result.data).toBeDefined();
        expect(result.total).toBe(1);
    });
    it('findOne returns a form', async () => expect(await service.findOne('f1')).toBeDefined());
    it('getFormTypeDescription returns description', () => expect(service.getFormTypeDescription('ICS-201' as any)).toBeDefined());
});
