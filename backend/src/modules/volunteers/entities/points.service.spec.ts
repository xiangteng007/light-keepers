import { PointsService } from './points.service';

describe('PointsService', () => {
    let service: PointsService;
    let repo: Record<string, jest.Mock>;
    let queryBuilder: Record<string, jest.Mock>;

    const mockRecord = {
        id: 'p1', volunteerId: 'v1', recordType: 'task',
        hours: 4, points: 40, multiplier: 1.0,
    };

    beforeEach(() => {
        queryBuilder = {
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            setParameter: jest.fn().mockReturnThis(),
            groupBy: jest.fn().mockReturnThis(),
            getRawMany: jest.fn().mockResolvedValue([]),
        };
        repo = {
            create: jest.fn().mockImplementation(d => ({ id: 'p1', ...d })),
            save: jest.fn().mockImplementation(d => Promise.resolve(d)),
            find: jest.fn().mockResolvedValue([mockRecord]),
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
        };
        service = new PointsService(repo as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('create', () => {
        it('should create points record', async () => {
            const result = await service.create({
                volunteerId: 'v1', recordType: 'task' as any,
                hours: 3, points: 30,
            });
            expect(repo.create).toHaveBeenCalled();
        });
    });

    describe('findByVolunteer', () => {
        it('should return records', async () => {
            const result = await service.findByVolunteer('v1');
            expect(result.length).toBe(1);
        });
    });

    describe('findByVolunteerInPeriod', () => {
        it('should return records in date range', async () => {
            await service.findByVolunteerInPeriod('v1', new Date('2026-01-01'), new Date('2026-12-31'));
            expect(repo.find).toHaveBeenCalled();
        });
    });

    describe('getVolunteerSummary', () => {
        it('should return summary', async () => {
            const summary = await service.getVolunteerSummary('v1');
            expect(summary.totalHours).toBeDefined();
            expect(summary.totalPoints).toBeDefined();
        });
    });

    describe('calculateSummary', () => {
        it('should calculate from records', () => {
            const summary = (service as any).calculateSummary([
                { hours: 4, points: 40, recordType: 'task' },
                { hours: 2, points: 10, recordType: 'training' },
            ]);
            expect(summary.totalHours).toBe(6);
            expect(summary.totalPoints).toBe(50);
            expect(summary.taskCount).toBe(1);
            expect(summary.trainingCount).toBe(1);
        });

        it('should handle empty records', () => {
            const summary = (service as any).calculateSummary([]);
            expect(summary.totalHours).toBe(0);
        });
    });

    describe('recordTaskPoints', () => {
        it('should calculate base points (1h = 10pts)', async () => {
            const result = await service.recordTaskPoints('v1', 'task-1', 3);
            expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
                points: 30, // 3h * 10
            }));
        });

        it('should apply night and high-risk multiplier', async () => {
            const result = await service.recordTaskPoints('v1', 'task-1', 2, {
                isNight: true, isHighRisk: true,
            });
            // multiplier = 1.0 + 0.5 + 0.5 = 2.0, points = 2*10*2 = 40
            expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
                points: 40,
            }));
        });
    });

    describe('recordTrainingPoints', () => {
        it('should calculate training points (1h = 5pts)', async () => {
            const result = await service.recordTrainingPoints('v1', 2, '防災訓練');
            expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
                points: 10,
            }));
        });
    });

    describe('adjustPoints', () => {
        it('should create adjustment record', async () => {
            const result = await service.adjustPoints('v1', 50, '特殊獎勵', 'admin');
            expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
                recordType: 'adjustment', points: 50,
            }));
        });
    });

    describe('exportReport', () => {
        it('should return aggregated report', async () => {
            queryBuilder.getRawMany.mockResolvedValueOnce([
                { volunteerId: 'v1', totalHours: '10', totalPoints: '100', taskCount: '3' },
            ]);
            const result = await service.exportReport(new Date('2026-01-01'), new Date('2026-12-31'));
            expect(result.length).toBe(1);
            expect(result[0].totalPoints).toBe(100);
        });
    });
});
