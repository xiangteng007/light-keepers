import { ReportDeduplicationService } from './report-deduplication.service';

describe('ReportDeduplicationService', () => {
    let service: ReportDeduplicationService;
    let reportRepo: Record<string, jest.Mock>;

    const mockReport = {
        id: 'fr1', missionSessionId: 'ms1', type: 'hazard',
        severity: 3, message: '道路塌陷', status: 'new',
        geom: { type: 'Point', coordinates: [121.56, 25.03] },
        createdAt: new Date(), mergedIntoId: null,
    };

    beforeEach(() => {
        reportRepo = {
            findOne: jest.fn().mockResolvedValue({ ...mockReport }),
            find: jest.fn().mockResolvedValue([]),
            save: jest.fn().mockImplementation(d => Promise.resolve(d)),
            createQueryBuilder: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                setParameter: jest.fn().mockReturnThis(),
                setParameters: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue([]),
                getMany: jest.fn().mockResolvedValue([]),
            }),
        };
        service = new ReportDeduplicationService(reportRepo as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('checkDuplicates', () => {
        it('should return no duplicates when none found', async () => {
            const result = await service.checkDuplicates('fr1');
            expect(result.reportId).toBe('fr1');
            expect(result.hasDuplicates).toBe(false);
            expect(result.candidates).toEqual([]);
        });
    });

    describe('calculateTextSimilarity', () => {
        it('should return 1.0 for identical text', () => {
            const score = (service as any).calculateTextSimilarity('道路塌陷危險', '道路塌陷危險');
            expect(score).toBe(1.0);
        });

        it('should return 0 for completely different text', () => {
            const score = (service as any).calculateTextSimilarity('ab', 'cd');
            expect(score).toBe(0);
        });
    });

    describe('calculateMatchScore', () => {
        it('should score higher for same type+severity', () => {
            const score = (service as any).calculateMatchScore(
                { ...mockReport, occurredAt: mockReport.createdAt },
                {
                    ...mockReport, id: 'fr2', distance: 0.0001,
                    r_type: 'hazard', r_severity: 3,
                    r_occurred_at: mockReport.createdAt.toISOString(),
                    r_message: '道路塌陷',
                },
            );
            expect(score).toBeGreaterThan(50);
        });
    });

    describe('getMatchReasons', () => {
        it('should include distance reason', () => {
            const candidate = {
                ...mockReport, id: 'fr2', distance: 0.0001,
                r_type: 'hazard', r_severity: 3,
                r_occurred_at: mockReport.createdAt.toISOString(),
            };
            const reasons = (service as any).getMatchReasons(
                { ...mockReport, occurredAt: mockReport.createdAt },
                candidate,
            );
            expect(reasons.length).toBeGreaterThan(0);
        });
    });

    describe('mergeReports', () => {
        it('should merge duplicate into primary', async () => {
            const duplicate = { ...mockReport, id: 'fr2', status: 'new' };
            reportRepo.findOne
                .mockResolvedValueOnce({ ...mockReport })
                .mockResolvedValueOnce(duplicate);
            const result = await service.mergeReports('fr1', 'fr2', 'admin');
            expect(reportRepo.save).toHaveBeenCalled();
        });
    });

    describe('getRelatedReports', () => {
        it('should return related reports', async () => {
            reportRepo.findOne.mockResolvedValueOnce({ ...mockReport, mergedIntoId: null });
            const result = await service.getRelatedReports('fr1');
            expect(result.mergedInto).toBeNull();
        });
    });
});
