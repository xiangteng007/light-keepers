import { ReportDispatcherService } from './report-dispatcher.service';

describe('ReportDispatcherService', () => {
    let service: ReportDispatcherService;
    let reportRepo: Record<string, jest.Mock>;
    let taskRepo: Record<string, jest.Mock>;
    let accountRepo: Record<string, jest.Mock>;
    let lineBotService: Record<string, jest.Mock>;
    let accountQB: Record<string, jest.Mock>;

    beforeEach(() => {
        accountQB = {
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
        };
        reportRepo = {
            findOne: jest.fn().mockResolvedValue(null),
        };
        taskRepo = {
            findOne: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation(d => ({ id: 'task-1', ...d })),
            save: jest.fn().mockImplementation(d => Promise.resolve(d)),
        };
        accountRepo = {
            createQueryBuilder: jest.fn().mockReturnValue(accountQB),
        };
        lineBotService = {
            sendTaskAssignment: jest.fn().mockResolvedValue(undefined),
        };
        service = new ReportDispatcherService(
            reportRepo as any, taskRepo as any,
            accountRepo as any, lineBotService as any,
        );
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('autoDispatch', () => {
        it('should return null if report not found', async () => {
            const result = await service.autoDispatch('bad-id');
            expect(result).toBeNull();
        });

        it('should return null if report not confirmed', async () => {
            reportRepo.findOne.mockResolvedValueOnce({ id: 'r1', status: 'pending' });
            const result = await service.autoDispatch('r1');
            expect(result).toBeNull();
        });

        it('should return existing task if already dispatched', async () => {
            reportRepo.findOne.mockResolvedValueOnce({ id: 'r1', status: 'confirmed' });
            taskRepo.findOne.mockResolvedValueOnce({ id: 'task-existing' });
            const result = await service.autoDispatch('r1');
            expect(result?.id).toBe('task-existing');
        });

        it('should create task for confirmed report', async () => {
            reportRepo.findOne.mockResolvedValueOnce({
                id: 'r1', status: 'confirmed', title: '水災回報',
                description: '淹水', type: 'flood', severity: 'high',
                address: '台北市', latitude: 25.03, longitude: 121.56,
            });
            taskRepo.findOne.mockResolvedValueOnce(null);
            const result = await service.autoDispatch('r1');
            expect(taskRepo.create).toHaveBeenCalled();
            expect(taskRepo.save).toHaveBeenCalled();
        });
    });

    describe('calculateDueAt', () => {
        it('should return 2h for critical', () => {
            const due = (service as any).calculateDueAt('critical');
            expect(due.getTime()).toBeGreaterThan(Date.now());
            expect(due.getTime()).toBeLessThan(Date.now() + 3 * 60 * 60 * 1000);
        });

        it('should return 72h for low', () => {
            const due = (service as any).calculateDueAt('low');
            expect(due.getTime()).toBeGreaterThan(Date.now() + 24 * 60 * 60 * 1000);
        });
    });

    describe('translateType', () => {
        it('should translate flood', () => {
            expect((service as any).translateType('flood')).toBe('水災');
        });

        it('should return raw type for unknown', () => {
            expect((service as any).translateType('unknown_type')).toBe('unknown_type');
        });
    });

    describe('translateSeverity', () => {
        it('should translate critical severity', () => {
            expect((service as any).translateSeverity('critical')).toContain('緊急');
        });
    });

    describe('buildTaskDescription', () => {
        it('should build description with address and photos', () => {
            const desc = (service as any).buildTaskDescription({
                address: '台北市', description: '淹水', type: 'flood', severity: 'high',
                contactName: '王先生', contactPhone: '0911111111', photos: ['a.jpg'],
                latitude: 25.03, longitude: 121.56, id: 'r1',
            });
            expect(desc).toContain('台北市');
            expect(desc).toContain('王先生');
            expect(desc).toContain('1 張');
        });
    });
});
