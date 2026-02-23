import { ReportSlaService } from './report-sla.service';

describe('ReportSlaService', () => {
    let service: ReportSlaService;
    let reportRepo: Record<string, jest.Mock>;

    const nowDate = new Date();
    const mockReport = {
        id: 'fr1', severity: 4, status: 'new',
        createdAt: new Date(nowDate.getTime() - 20 * 60000), // 20 min ago
        respondedAt: null, resolvedAt: null,
    };

    beforeEach(() => {
        reportRepo = {
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue({ ...mockReport }),
            createQueryBuilder: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
                getCount: jest.fn().mockResolvedValue(0),
                select: jest.fn().mockReturnThis(),
                getRawOne: jest.fn().mockResolvedValue({ avg: null }),
            }),
        };
        service = new ReportSlaService(reportRepo as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('getSlaStatus', () => {
        it('should return SLA status for report', () => {
            const status = service.getSlaStatus(mockReport as any);
            expect(status.reportId).toBe('fr1');
            expect(status.responseDeadline).toBeDefined();
            expect(status.resolutionDeadline).toBeDefined();
        });

        it('should mark response as overdue for severity 4 after 15 min', () => {
            const status = service.getSlaStatus(mockReport as any);
            expect(status.isResponseOverdue).toBe(true); // 20 min > 15 min deadline
        });
    });

    describe('calculateResponseDeadline', () => {
        it('should add 15 min for severity 4', () => {
            const deadline = service.calculateResponseDeadline(mockReport as any);
            const expected = new Date(mockReport.createdAt.getTime() + 15 * 60000);
            expect(deadline.getTime()).toBe(expected.getTime());
        });
    });

    describe('calculateResolutionDeadline', () => {
        it('should add 2 hours for severity 4', () => {
            const deadline = service.calculateResolutionDeadline(mockReport as any);
            const expected = new Date(mockReport.createdAt.getTime() + 120 * 60000);
            expect(deadline.getTime()).toBe(expected.getTime());
        });
    });

    describe('setConfig', () => {
        it('should update SLA config', () => {
            service.setConfig({ responseDeadline: { 4: 10 } });
            const newDeadline = service.calculateResponseDeadline(mockReport as any);
            const expected = new Date(mockReport.createdAt.getTime() + 10 * 60000);
            expect(newDeadline.getTime()).toBe(expected.getTime());
        });
    });

    describe('findResponseOverdue', () => {
        it('should query overdue reports', async () => {
            const result = await service.findResponseOverdue('ms1');
            expect(Array.isArray(result)).toBe(true);
        });
    });

    describe('findResolutionOverdue', () => {
        it('should query resolution overdue', async () => {
            const result = await service.findResolutionOverdue();
            expect(Array.isArray(result)).toBe(true);
        });
    });
});
