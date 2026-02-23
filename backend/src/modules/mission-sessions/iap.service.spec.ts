import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IAPService } from './iap.service';
import { OperationalPeriod, OperationalPeriodStatus } from './entities/operational-period.entity';
import { IAPDocument, IAPDocumentType, IAPDocumentStatus } from './entities/iap-document.entity';
import { MissionSession } from './entities/mission-session.entity';

describe('IAPService', () => {
    let service: IAPService;
    const mockPeriod = { id: 'p1', missionSessionId: 'ms1', periodNumber: 1, status: OperationalPeriodStatus.DRAFT, version: 1 };
    const mockDoc = { id: 'd1', operationalPeriodId: 'p1', documentType: IAPDocumentType.OBJECTIVES, status: IAPDocumentStatus.DRAFT, version: 1, content: {} };

    const mockQb = {
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ max: 0 }),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                IAPService,
                { provide: getRepositoryToken(OperationalPeriod), useValue: {
                    create: jest.fn().mockReturnValue(mockPeriod),
                    save: jest.fn().mockResolvedValue(mockPeriod),
                    find: jest.fn().mockResolvedValue([mockPeriod]),
                    findOne: jest.fn().mockResolvedValue(mockPeriod),
                    update: jest.fn().mockResolvedValue({ affected: 1 }),
                    createQueryBuilder: jest.fn().mockReturnValue(mockQb),
                } },
                { provide: getRepositoryToken(IAPDocument), useValue: {
                    create: jest.fn().mockReturnValue(mockDoc),
                    save: jest.fn().mockResolvedValue(mockDoc),
                    find: jest.fn().mockResolvedValue([mockDoc]),
                    findOne: jest.fn().mockResolvedValue(null),
                } },
                { provide: getRepositoryToken(MissionSession), useValue: {
                    findOne: jest.fn().mockResolvedValue({ id: 'ms1' }),
                } },
            ],
        }).compile();
        service = module.get(IAPService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('createPeriod returns period', async () => {
        const p = await service.createPeriod({ missionSessionId: 'ms1', startTime: new Date(), createdBy: 'u1' });
        expect(p.id).toBeDefined();
    });

    it('getPeriods returns list', async () => {
        const list = await service.getPeriods('ms1');
        expect(list.length).toBe(1);
    });

    it('approvePeriod sets approved status', async () => {
        const p = await service.approvePeriod('p1', 'admin');
        expect(p).toBeDefined();
    });

    it('closePeriod sets closed', async () => {
        const p = await service.closePeriod('p1');
        expect(p).toBeDefined();
    });

    it('upsertDocument creates new doc', async () => {
        const doc = await service.upsertDocument('p1', IAPDocumentType.OBJECTIVES, { field: 'val' }, 'u1');
        expect(doc.id).toBeDefined();
    });

    it('getDocuments returns docs', async () => {
        const docs = await service.getDocuments('p1');
        expect(docs.length).toBe(1);
    });

    it('exportIAP returns period + documents', async () => {
        const exp = await service.exportIAP('p1');
        expect(exp.period).toBeDefined();
        expect(exp.exportedAt).toBeInstanceOf(Date);
    });
});
