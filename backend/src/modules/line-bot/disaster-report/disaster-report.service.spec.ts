import { DisasterReportService } from './disaster-report.service';

describe('DisasterReportService', () => {
    let service: DisasterReportService;
    let svc: any; // for private method access
    let sessionService: Record<string, jest.Mock>;
    let imageUploadService: Record<string, jest.Mock>;
    let aiClassificationService: Record<string, jest.Mock>;
    let reportsService: Record<string, jest.Mock>;

    beforeEach(() => {
        sessionService = {
            getSession: jest.fn().mockResolvedValue(null),
            createSession: jest.fn().mockResolvedValue({ state: 'WAIT_TEXT', data: {} }),
            updateSession: jest.fn().mockResolvedValue(undefined),
            deleteSession: jest.fn().mockResolvedValue(undefined),
            isInReportFlow: jest.fn().mockResolvedValue(false),
            getStats: jest.fn().mockReturnValue({ activeSessions: 0, totalReports: 0 }),
        };
        imageUploadService = {
            uploadFromLine: jest.fn().mockResolvedValue('https://img.example.com/photo.jpg'),
        };
        aiClassificationService = {
            classifyDisasterType: jest.fn().mockResolvedValue({ type: 'flood', confidence: 0.9 }),
        };
        reportsService = {
            create: jest.fn().mockResolvedValue({ id: 'report-1', status: 'pending' }),
        };

        service = new DisasterReportService(
            { get: jest.fn().mockReturnValue(null) } as any,
            sessionService as any,
            imageUploadService as any,
            aiClassificationService as any,
            reportsService as any,
        );
        svc = service as any;
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('isReportTrigger', () => {
        it('should detect report trigger keywords', () => {
            expect(service.isReportTrigger('我要回報災情')).toBe(true);
            expect(service.isReportTrigger('今天天氣好')).toBe(false);
        });
    });

    describe('isCancelCommand (private)', () => {
        it('should detect cancel keywords', () => {
            expect(svc.isCancelCommand('取消')).toBe(true);
            expect(svc.isCancelCommand('繼續')).toBe(false);
        });
    });

    describe('isSkipImageCommand (private)', () => {
        it('should detect skip image keywords', () => {
            expect(svc.isSkipImageCommand('跳過')).toBe(true);
        });
    });

    describe('isConfirmCommand (private)', () => {
        it('should detect confirm keywords', () => {
            expect(svc.isConfirmCommand('確認')).toBe(true);
        });
    });

    describe('handleTextMessage', () => {
        it('should start report flow on trigger', async () => {
            const result = await service.handleTextMessage('user1', '回報災情', '王大明');
            expect(result.shouldReply).toBe(true);
            expect(result.replyMessage).toBeDefined();
        });

        it('should return no-reply for non-trigger without session', async () => {
            const result = await service.handleTextMessage('user1', '你好');
            expect(result.shouldReply).toBe(false);
        });
    });

    describe('isUserInReportFlow', () => {
        it('should return false for users not in flow', async () => {
            sessionService.isInReportFlow.mockResolvedValueOnce(false);
            const inFlow = await service.isUserInReportFlow('unknown');
            expect(inFlow).toBe(false);
        });

        it('should return true if session exists', async () => {
            sessionService.isInReportFlow.mockResolvedValueOnce(true);
            const inFlow = await service.isUserInReportFlow('user1');
            expect(inFlow).toBe(true);
        });
    });

    describe('cancelReport (private)', () => {
        it('should delete session', async () => {
            await svc.cancelReport('user1');
            expect(sessionService.deleteSession).toHaveBeenCalled();
        });
    });

    describe('getStats', () => {
        it('should return service stats', () => {
            const stats = service.getStats();
            expect(stats).toBeDefined();
        });
    });
});
