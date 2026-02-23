import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FirebaseAdminService } from './firebase-admin.service';

// Mock firebase-admin completely
jest.mock('firebase-admin', () => ({
    apps: [],
    initializeApp: jest.fn(),
    credential: {
        cert: jest.fn(),
        applicationDefault: jest.fn(),
    },
    auth: jest.fn().mockReturnValue({
        generateEmailVerificationLink: jest.fn(),
        generatePasswordResetLink: jest.fn(),
        generateVerifyAndChangeEmailLink: jest.fn(),
        getUserByEmail: jest.fn(),
        createUser: jest.fn(),
        updateUser: jest.fn(),
        deleteUser: jest.fn(),
        verifyIdToken: jest.fn(),
    }),
    messaging: jest.fn().mockReturnValue({
        send: jest.fn(),
        sendEachForMulticast: jest.fn(),
        subscribeToTopic: jest.fn(),
        unsubscribeFromTopic: jest.fn(),
    }),
}));

describe('FirebaseAdminService', () => {
    let service: FirebaseAdminService;

    describe('without Firebase configuration', () => {
        beforeEach(async () => {
            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    FirebaseAdminService,
                    {
                        provide: ConfigService,
                        useValue: {
                            get: jest.fn().mockReturnValue(undefined),
                        },
                    },
                ],
            }).compile();

            service = module.get<FirebaseAdminService>(FirebaseAdminService);
            // Don't call onModuleInit — test unconfigured state
        });

        it('should be defined', () => {
            expect(service).toBeDefined();
        });

        it('should report not configured', () => {
            expect(service.isConfigured()).toBe(false);
        });

        it('should return null for email verification link', async () => {
            const result = await service.generateEmailVerificationLink('test@test.com');
            expect(result).toBeNull();
        });

        it('should return null for password reset link', async () => {
            const result = await service.generatePasswordResetLink('test@test.com');
            expect(result).toBeNull();
        });

        it('should return null for email update link', async () => {
            const result = await service.generateEmailUpdateLink('old@test.com', 'new@test.com');
            expect(result).toBeNull();
        });

        it('should return null for create Firebase user', async () => {
            const result = await service.createFirebaseUser('test@test.com');
            expect(result).toBeNull();
        });

        it('should return failure for sendEmailVerification', async () => {
            const result = await service.sendEmailVerification('test@test.com');
            expect(result.success).toBe(false);
            expect(result.message).toContain('Firebase');
        });

        it('should return failure for sendPasswordReset', async () => {
            const result = await service.sendPasswordReset('test@test.com');
            expect(result.success).toBe(false);
        });

        it('should return null for verifyIdToken', async () => {
            const result = await service.verifyIdToken('some-token');
            expect(result).toBeNull();
        });

        it('should return null for getFirebaseUser', async () => {
            const result = await service.getFirebaseUser('test@test.com');
            expect(result).toBeNull();
        });

        it('should return false for isEmailVerified', async () => {
            const result = await service.isEmailVerified('test@test.com');
            expect(result).toBe(false);
        });

        it('should return false for setEmailVerified', async () => {
            const result = await service.setEmailVerified('test@test.com', true);
            expect(result).toBe(false);
        });

        it('should return failure for deleteFirebaseUser', async () => {
            const result = await service.deleteFirebaseUser('test@test.com');
            expect(result.success).toBe(false);
        });

        it('should return failure for deleteFirebaseUserByUid', async () => {
            const result = await service.deleteFirebaseUserByUid('uid-123');
            expect(result.success).toBe(false);
        });

        // FCM tests when not configured
        it('should return failure for sendPushNotification', async () => {
            const result = await service.sendPushNotification('token', 'title', 'body');
            expect(result.success).toBe(false);
        });

        it('should return zero counts for sendMulticastPush', async () => {
            const result = await service.sendMulticastPush(['t1'], 'title', 'body');
            expect(result.successCount).toBe(0);
        });

        it('should return failure for sendTopicPush', async () => {
            const result = await service.sendTopicPush('alerts', 'title', 'body');
            expect(result.success).toBe(false);
        });

        it('should return false for subscribeToTopic', async () => {
            const result = await service.subscribeToTopic(['t1'], 'topic');
            expect(result).toBe(false);
        });

        it('should return false for unsubscribeFromTopic', async () => {
            const result = await service.unsubscribeFromTopic(['t1'], 'topic');
            expect(result).toBe(false);
        });

        it('should return zero for sendMulticastPush with empty tokens', async () => {
            const result = await service.sendMulticastPush([], 'title', 'body');
            expect(result.successCount).toBe(0);
        });
    });
});
