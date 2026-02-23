import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AARService } from './aar.service';
import { AfterActionReview } from './entities/aar.entity';
import { MissionSession } from './entities/mission-session.entity';
import { DecisionLog } from './entities/decision-log.entity';
import { SITREP } from './entities/sitrep.entity';

let FieldReport: any, Task: any, AuditLog: any;

describe('AARService', () => {
    let service: AARService;
    const mockAAR = { id: 'aar1', missionSessionId: 'ms1', status: 'draft', version: 1 };
    const mockSession = { id: 'ms1', title: 'Test Mission' };

    beforeEach(async () => {
        const makeRepo = (mock: any) => ({
            create: jest.fn().mockReturnValue(mock),
            save: jest.fn().mockResolvedValue(mock),
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue(mock),
            count: jest.fn().mockResolvedValue(0),
        });

        try { FieldReport = (await import('../field-reports/entities/field-report.entity')).FieldReport; } catch { FieldReport = class {}; }
        try { Task = (await import('../tasks/entities/task.entity')).Task; } catch { Task = class {}; }
        try { AuditLog = (await import('../field-reports/entities/audit-log.entity')).AuditLog; } catch { AuditLog = class {}; }

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AARService,
                { provide: getRepositoryToken(AfterActionReview), useValue: makeRepo(mockAAR) },
                { provide: getRepositoryToken(MissionSession), useValue: makeRepo(mockSession) },
                { provide: getRepositoryToken(DecisionLog), useValue: makeRepo({}) },
                { provide: getRepositoryToken(FieldReport), useValue: makeRepo({}) },
                { provide: getRepositoryToken(Task), useValue: makeRepo({}) },
                { provide: getRepositoryToken(AuditLog), useValue: makeRepo({}) },
                { provide: EventEmitter2, useValue: { emit: jest.fn() } },
            ],
        }).compile();
        service = module.get(AARService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('createAAR returns AAR', async () => {
        const aar = await service.createAAR('ms1', 'user1');
        expect(aar).toBeDefined();
    });

    it('getAAR returns AAR for session', async () => {
        const aar = await service.getAAR('ms1');
        expect(aar).toBeDefined();
    });

    it('generateTimeline returns timeline events', async () => {
        const events = await service.generateTimeline('ms1');
        expect(Array.isArray(events)).toBe(true);
    });

    it('generateStatistics returns stats object', async () => {
        const stats = await service.generateStatistics('ms1');
        expect(stats).toBeDefined();
        expect(stats.totalReports).toBeDefined();
    });
});
