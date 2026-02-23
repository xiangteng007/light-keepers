import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MissionReportService } from './mission-report.service';
import { MissionSession } from './entities/mission-session.entity';
import { Task } from './entities/task.entity';
import { MissionEvent } from './entities/event.entity';
import { SITREP } from './entities/sitrep.entity';
import { DecisionLog } from './entities/decision-log.entity';
import { AfterActionReview } from './entities/aar.entity';

describe('MissionReportService', () => {
    let service: MissionReportService;
    const mockSession = { id: 'ms1', title: 'Test', status: 'active', startedAt: new Date(), endedAt: new Date() };

    beforeEach(async () => {
        const makeRepo = (data: any) => ({
            find: jest.fn().mockResolvedValue(Array.isArray(data) ? data : []),
            findOne: jest.fn().mockResolvedValue(data),
            count: jest.fn().mockResolvedValue(0),
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MissionReportService,
                { provide: getRepositoryToken(MissionSession), useValue: makeRepo(mockSession) },
                { provide: getRepositoryToken(Task), useValue: makeRepo(null) },
                { provide: getRepositoryToken(MissionEvent), useValue: makeRepo(null) },
                { provide: getRepositoryToken(SITREP), useValue: makeRepo(null) },
                { provide: getRepositoryToken(DecisionLog), useValue: makeRepo(null) },
                { provide: getRepositoryToken(AfterActionReview), useValue: makeRepo(null) },
            ],
        }).compile();
        service = module.get(MissionReportService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('collectReportData returns data', async () => {
        const data = await service.collectReportData('ms1');
        expect(data).toBeDefined();
        expect(data!.session).toBeDefined();
    });

    it('generateJsonPackage returns json', async () => {
        const result = await service.generateJsonPackage('ms1');
        expect(result.success).toBe(true);
        expect(result.contentType).toBe('application/json');
    });

    it('generatePdfReport returns result', async () => {
        const result = await service.generatePdfReport('ms1');
        expect(result.success).toBe(true);
    });

    it('generateCsvReport returns csv', async () => {
        const result = await service.generateCsvReport('ms1');
        expect(result.success).toBe(true);
        expect(result.contentType).toContain('csv');
    });

    it('escapeCsv handles commas', () => {
        const escaped = (service as any).escapeCsv('hello, world');
        expect(escaped).toContain('"');
    });
});
