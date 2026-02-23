import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SITREPService } from './sitrep.service';
import { SITREP } from './entities/sitrep.entity';
import { DecisionLog, DecisionType } from './entities/decision-log.entity';

let FieldReport: any;

describe('SITREPService', () => {
    let service: SITREPService;
    const mockSitrep = { id: 'sr1', missionSessionId: 'ms1', sequence: 1, status: 'draft', version: 1 };
    const mockDecision = { id: 'd1', missionSessionId: 'ms1', description: 'Test decision' };

    const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ max: 0 }),
        getMany: jest.fn().mockResolvedValue([]),
    };

    beforeEach(async () => {
        try { FieldReport = (await import('../field-reports/entities/field-report.entity')).FieldReport; } catch { FieldReport = class {}; }

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SITREPService,
                { provide: getRepositoryToken(SITREP), useValue: {
                    create: jest.fn().mockReturnValue(mockSitrep),
                    save: jest.fn().mockResolvedValue(mockSitrep),
                    find: jest.fn().mockResolvedValue([mockSitrep]),
                    findOne: jest.fn().mockResolvedValue(mockSitrep),
                    createQueryBuilder: jest.fn().mockReturnValue(mockQb),
                } },
                { provide: getRepositoryToken(DecisionLog), useValue: {
                    create: jest.fn().mockReturnValue(mockDecision),
                    save: jest.fn().mockResolvedValue(mockDecision),
                    find: jest.fn().mockResolvedValue([]),
                    createQueryBuilder: jest.fn().mockReturnValue(mockQb),
                } },
                { provide: getRepositoryToken(FieldReport), useValue: {
                    find: jest.fn().mockResolvedValue([]),
                } },
            ],
        }).compile();
        service = module.get(SITREPService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('createSITREP returns sitrep', async () => {
        const sitrep = await service.createSITREP({
            missionSessionId: 'ms1', periodStart: new Date(), periodEnd: new Date(), createdBy: 'u1',
        });
        expect(sitrep.id).toBeDefined();
    });

    it('getSITREPs returns list', async () => {
        const sitreps = await service.getSITREPs('ms1');
        expect(sitreps.length).toBe(1);
    });

    it('logDecision returns decision', async () => {
        const decision = await service.logDecision({
            missionSessionId: 'ms1', decisionType: DecisionType.DISPATCH,
            description: 'Test', decidedBy: 'u1',
        });
        expect(decision.id).toBeDefined();
    });

    it('getDecisionsForEntity returns empty', async () => {
        const decisions = await service.getDecisionsForEntity('sector', 's1');
        expect(Array.isArray(decisions)).toBe(true);
    });
});
