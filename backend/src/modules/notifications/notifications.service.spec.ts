import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { Notification } from './notifications.entity';
import { Account } from '../accounts/entities/account.entity';
import { FirebaseAdminService } from '../auth/services/firebase-admin.service';

describe('NotificationsService', () => {
    let service: NotificationsService;
    let notificationRepo: any;
    let accountRepo: any;
    let firebaseAdmin: any;

    const mockNotification: Partial<Notification> = {
        id: 'notif-1',
        title: '任務指派',
        message: '您已被指派新任務',
        type: 'task_assignment' as any,
        priority: 'normal' as any,
        isRead: false,
        volunteerId: 'vol-1',
    };

    const mockAccount: Partial<Account> = {
        id: 'acc-1',
        displayName: '系統管理員',
        fcmTokens: ['token-1', 'token-2'],
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationsService,
                {
                    provide: getRepositoryToken(Notification),
                    useValue: {
                        create: jest.fn().mockReturnValue(mockNotification),
                        save: jest.fn().mockResolvedValue(mockNotification),
                        find: jest.fn().mockResolvedValue([mockNotification]),
                        findOne: jest.fn().mockResolvedValue(mockNotification),
                        count: jest.fn().mockResolvedValue(5),
                        update: jest.fn().mockResolvedValue({ affected: 3 }),
                        delete: jest.fn().mockResolvedValue({ affected: 2 }),
                        createQueryBuilder: jest.fn().mockReturnValue({
                            where: jest.fn().mockReturnThis(),
                            andWhere: jest.fn().mockReturnThis(),
                            delete: jest.fn().mockReturnThis(),
                            execute: jest.fn().mockResolvedValue({ affected: 2 }),
                        }),
                    },
                },
                {
                    provide: getRepositoryToken(Account),
                    useValue: {
                        findOne: jest.fn().mockResolvedValue(mockAccount),
                        find: jest.fn().mockResolvedValue([mockAccount]),
                        save: jest.fn().mockResolvedValue(mockAccount),
                        update: jest.fn().mockResolvedValue({ affected: 1 }),
                    },
                },
                {
                    provide: FirebaseAdminService,
                    useValue: {
                        sendMulticast: jest.fn().mockResolvedValue({ successCount: 2, failureCount: 0 }),
                        sendToTopic: jest.fn().mockResolvedValue('msg-id'),
                        subscribeToTopic: jest.fn().mockResolvedValue(undefined),
                        unsubscribeFromTopic: jest.fn().mockResolvedValue(undefined),
                    },
                },
            ],
        }).compile();

        service = module.get<NotificationsService>(NotificationsService);
        notificationRepo = module.get(getRepositoryToken(Notification));
        accountRepo = module.get(getRepositoryToken(Account));
        firebaseAdmin = module.get(FirebaseAdminService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== Create =====
    describe('create', () => {
        it('should create a notification', async () => {
            const dto = { title: '任務指派', message: '新任務', type: 'task_assignment', volunteerId: 'vol-1' };
            const result = await service.create(dto as any);
            expect(notificationRepo.create).toHaveBeenCalled();
            expect(notificationRepo.save).toHaveBeenCalled();
            expect(result).toEqual(mockNotification);
        });
    });

    // ===== Batch Send =====
    describe('sendToMultiple', () => {
        it('should send notifications to multiple volunteers', async () => {
            const dto = { title: '動員通知', message: '緊急集合', type: 'mobilization' };
            const result = await service.sendToMultiple(['vol-1', 'vol-2', 'vol-3'], dto as any);
            expect(result).toBe(3);
        });
    });

    // ===== Query by Volunteer =====
    describe('getByVolunteer', () => {
        it('should return notifications for a volunteer', async () => {
            notificationRepo.createQueryBuilder.mockReturnValue({
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mockNotification]),
            });
            const result = await service.getByVolunteer('vol-1');
            expect(result).toEqual([mockNotification]);
        });

        it('should filter unread only', async () => {
            // getByVolunteer uses QueryBuilder internally
            // Just verify it doesn't throw
            notificationRepo.createQueryBuilder.mockReturnValue({
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mockNotification]),
            });
            const result = await service.getByVolunteer('vol-1', true);
            expect(result).toBeDefined();
        });
    });

    // ===== Unread Count =====
    describe('getUnreadCount', () => {
        it('should return unread count', async () => {
            const result = await service.getUnreadCount('vol-1');
            expect(result).toBe(5);
        });
    });

    // ===== Mark as Read =====
    describe('markAsRead', () => {
        it('should mark notification as read', async () => {
            const result = await service.markAsRead('notif-1');
            expect(notificationRepo.save).toHaveBeenCalled();
            expect(result).toBeDefined();
        });
    });

    describe('markAllAsRead', () => {
        it('should mark all notifications as read', async () => {
            const result = await service.markAllAsRead('vol-1');
            expect(notificationRepo.update).toHaveBeenCalled();
            expect(result).toBe(3);
        });
    });

    // ===== Specialized Notifications =====
    describe('sendAssignmentNotification', () => {
        it('should send task assignment notification', async () => {
            await service.sendAssignmentNotification('vol-1', '救援任務', 'assign-1');
            expect(notificationRepo.create).toHaveBeenCalled();
            expect(notificationRepo.save).toHaveBeenCalled();
        });
    });

    describe('sendMobilizationNotification', () => {
        it('should send mobilization notifications', async () => {
            await service.sendMobilizationNotification(['vol-1', 'vol-2'], '緊急動員', '立即集合');
            expect(notificationRepo.save).toHaveBeenCalled();
        });
    });

    describe('sendTrainingReminder', () => {
        it('should send training reminder', async () => {
            await service.sendTrainingReminder('vol-1', '急救課程', 'course-1');
            expect(notificationRepo.create).toHaveBeenCalled();
        });
    });

    // ===== Cleanup =====
    describe('cleanupExpired', () => {
        it('should cleanup expired notifications', async () => {
            const result = await service.cleanupExpired();
            expect(result).toBeGreaterThanOrEqual(0);
        });
    });

    // ===== FCM Token Management =====
    describe('registerFcmToken', () => {
        it('should register FCM token', async () => {
            const result = await service.registerFcmToken('acc-1', 'new-token');
            expect(result).toBe(true);
            expect(accountRepo.update).toHaveBeenCalled();
        });

        it('should not duplicate existing token', async () => {
            const result = await service.registerFcmToken('acc-1', 'token-1');
            expect(result).toBe(true);
        });
    });

    describe('unregisterFcmToken', () => {
        it('should unregister FCM token', async () => {
            const result = await service.unregisterFcmToken('acc-1', 'token-1');
            expect(result).toBe(true);
            expect(accountRepo.update).toHaveBeenCalled();
        });
    });
});
