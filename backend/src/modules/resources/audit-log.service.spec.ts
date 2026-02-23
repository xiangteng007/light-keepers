import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditLogService } from './audit-log.service';
import { SensitiveReadLog } from './sensitive-read-log.entity';
import { LabelPrintLog } from './label-print-log.entity';

describe('AuditLogService', () => {
    let service: AuditLogService;
    const mockLog = { id: 'log-1' };

    const mockQb = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockLog], 1]),
    };

    beforeEach(async () => {
        const mockRepo = {
            create: jest.fn().mockReturnValue(mockLog),
            save: jest.fn().mockResolvedValue(mockLog),
            find: jest.fn().mockResolvedValue([mockLog]),
            createQueryBuilder: jest.fn().mockReturnValue(mockQb),
        };
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuditLogService,
                { provide: getRepositoryToken(SensitiveReadLog), useValue: mockRepo },
                { provide: getRepositoryToken(LabelPrintLog), useValue: { ...mockRepo } },
            ],
        }).compile();
        service = module.get(AuditLogService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('logSensitiveRead returns id', async () => {
        const id = await service.logSensitiveRead({
            actorUid: 'u1', actorRole: 'admin', targetType: 'resource' as any,
            targetId: 't1', fieldsAccessed: ['name'], uiContext: 'detail', result: 'success',
        });
        expect(id).toBe('log-1');
    });

    it('logLabelPrint returns id', async () => {
        const id = await service.logLabelPrint({
            actorUid: 'u1', actorRole: 'admin', action: 'print' as any,
            targetType: 'resource' as any, targetIds: ['t1'],
            controlLevel: 'high', templateId: 'tpl1', labelCount: 1,
        });
        expect(id).toBe('log-1');
    });

    it('querySensitiveReadLogs returns paginated', async () => {
        const result = await service.querySensitiveReadLogs({ limit: 10 });
        expect(result.logs).toEqual([mockLog]);
        expect(result.total).toBe(1);
    });

    it('getReadLogsByTarget returns logs', async () => {
        const logs = await service.getReadLogsByTarget('resource' as any, 't1');
        expect(logs).toEqual([mockLog]);
    });
});
