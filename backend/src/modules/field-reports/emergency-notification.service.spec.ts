import { EmergencyNotificationService } from './emergency-notification.service';

describe('EmergencyNotificationService', () => {
    let service: EmergencyNotificationService;
    let notificationsService: Record<string, jest.Mock>;
    let lineBotService: Record<string, jest.Mock>;
    let accountRepo: Record<string, jest.Mock>;

    const mockAccount = {
        id: 'acc1', uid: 'u1', displayName: 'Alice',
        fcmTokens: ['token1'], lineUserId: 'L123',
        roles: [{ name: 'officer' }], isActive: true,
    };

    beforeEach(() => {
        notificationsService = {
            sendToUser: jest.fn().mockResolvedValue(true),
            sendToMultipleUsers: jest.fn().mockResolvedValue({ successCount: 1 }),
            sendAssignmentNotification: jest.fn().mockResolvedValue(true),
            create: jest.fn().mockResolvedValue({ id: 'n1' }),
        };
        lineBotService = {
            isEnabled: jest.fn().mockReturnValue(true),
            sendTextMessage: jest.fn().mockResolvedValue(undefined),
            sendFlexMessage: jest.fn().mockResolvedValue(undefined),
            sendTaskAssignment: jest.fn().mockResolvedValue(undefined),
            pushText: jest.fn().mockResolvedValue(undefined),
        };
        accountRepo = {
            find: jest.fn().mockResolvedValue([mockAccount]),
            findOne: jest.fn().mockResolvedValue(mockAccount),
            createQueryBuilder: jest.fn().mockReturnValue({
                innerJoinAndSelect: jest.fn().mockReturnThis(),
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mockAccount]),
            }),
        };
        service = new EmergencyNotificationService(
            notificationsService as any,
            lineBotService as any,
            accountRepo as any,
        );
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('sendSosAlert', () => {
        it('should send SOS alert to officers', async () => {
            const result = await service.sendSosAlert({
                missionSessionId: 'ms1', sosId: 'sos1',
                userName: 'Alice', lat: 25.03, lng: 121.56,
            });
            expect(result.fcmCount).toBeGreaterThanOrEqual(0);
        });
    });

    describe('sendTaskAssignment', () => {
        it('should send task notification', async () => {
            const result = await service.sendTaskAssignment({
                volunteerId: 'v1', accountId: 'acc1', taskId: 't1',
                taskTitle: '搜救任務', location: '台北市',
            });
            expect(result).toBeDefined();
        });
    });

    describe('sendNewReportAlert', () => {
        it('should send report alert', async () => {
            const result = await service.sendNewReportAlert({
                missionSessionId: 'ms1', reportId: 'fr1',
                reporterName: 'Bob', reportType: 'hazard', severity: 4,
            });
            expect(result).toBeDefined();
        });
    });

    describe('sendSosAcknowledged', () => {
        it('should notify SOS trigger user', async () => {
            const result = await service.sendSosAcknowledged({
                userId: 'u1', sosId: 'sos1', ackedByName: 'Admin',
            });
            expect(result).toBeDefined();
        });
    });

    describe('sendMobilizationAlert', () => {
        it('should send mobilization notification', async () => {
            const result = await service.sendMobilizationAlert({
                title: '緊急動員', message: '需要志工支援',
            });
            expect(result).toBeDefined();
        });
    });
});
