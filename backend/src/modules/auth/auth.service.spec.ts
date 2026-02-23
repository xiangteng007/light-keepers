import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { AccountManagementService } from './services/account-management.service';
import { Account, Role, PagePermission } from '../accounts/entities';
import { OtpService } from './services/otp.service';
import { SmsService } from './services/sms.service';
import { PasswordResetService } from './services/password-reset.service';
import { EmailService } from './services/email.service';
import { FirebaseAdminService } from './services/firebase-admin.service';
import { LineBotService } from '../line-bot/line-bot.service';

// =========================================
// AuthService Tests
// =========================================

describe('AuthService', () => {
    let service: AuthService;
    let accountRepo: any;
    let roleRepo: any;
    let jwtService: any;
    let otpService: any;
    let smsService: any;
    let passwordResetService: any;
    let emailService: any;

    const mockRole = {
        id: 'role-1',
        name: 'volunteer',
        displayName: '登記志工',
        level: 1,
    };

    const mockAccount = {
        id: 'user-123',
        email: 'test@example.com',
        phone: '0912345678',
        displayName: '測試使用者',
        passwordHash: '$2a$10$hashedPassword',
        avatarUrl: null,
        lineUserId: null,
        googleId: null,
        volunteerProfileCompleted: false,
        roles: [mockRole],
        lastLoginAt: null,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: getRepositoryToken(Account),
                    useValue: {
                        findOne: jest.fn(),
                        save: jest.fn(),
                        create: jest.fn(),
                        update: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(Role),
                    useValue: { findOne: jest.fn(), find: jest.fn() },
                },
                {
                    provide: JwtService,
                    useValue: { sign: jest.fn().mockReturnValue('mock-jwt-token'), verify: jest.fn() },
                },
                {
                    provide: OtpService,
                    useValue: {
                        generateOtp: jest.fn(),
                        verifyOtp: jest.fn(),
                    },
                },
                {
                    provide: SmsService,
                    useValue: { sendSms: jest.fn() },
                },
                {
                    provide: PasswordResetService,
                    useValue: {
                        findAccountByEmailOrPhone: jest.fn(),
                        createResetToken: jest.fn(),
                        generateResetUrl: jest.fn(),
                        verifyAndResetPassword: jest.fn(),
                    },
                },
                {
                    provide: EmailService,
                    useValue: {
                        sendOtpEmail: jest.fn(),
                        sendPasswordReset: jest.fn(),
                    },
                },
                {
                    provide: FirebaseAdminService,
                    useValue: {
                        verifyIdToken: jest.fn(),
                        getUserByEmail: jest.fn(),
                        generateEmailVerificationLink: jest.fn(),
                        isConfigured: jest.fn().mockReturnValue(false),
                        sendPasswordReset: jest.fn(),
                    },
                },
                { provide: LineBotService, useValue: { pushMessage: jest.fn() } },
                {
                    provide: SmsService,
                    useValue: {
                        sendOtp: jest.fn(),
                        sendPasswordResetSms: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        accountRepo = module.get(getRepositoryToken(Account));
        roleRepo = module.get(getRepositoryToken(Role));
        jwtService = module.get(JwtService);
        otpService = module.get(OtpService);
        smsService = module.get(SmsService);
        passwordResetService = module.get(PasswordResetService);
        emailService = module.get(EmailService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // -----------------------------------------
    // register()
    // -----------------------------------------
    describe('register', () => {
        it('should register with email and return token', async () => {
            accountRepo.findOne.mockResolvedValue(null); // no existing
            roleRepo.findOne.mockResolvedValue(mockRole);
            accountRepo.create.mockReturnValue(mockAccount);
            accountRepo.save.mockResolvedValue(mockAccount);

            const result = await service.register({
                email: 'new@example.com',
                password: 'password123',
                displayName: '新用戶',
            });

            expect(result.accessToken).toBe('mock-jwt-token');
            expect(result.user.email).toBe('test@example.com');
            expect(accountRepo.create).toHaveBeenCalled();
            expect(accountRepo.save).toHaveBeenCalled();
        });

        it('should throw ConflictException when email or phone not provided', async () => {
            await expect(
                service.register({ password: 'password123' } as any),
            ).rejects.toThrow(ConflictException);
        });

        it('should throw ConflictException when account already exists', async () => {
            accountRepo.findOne.mockResolvedValue(mockAccount);

            await expect(
                service.register({
                    email: 'test@example.com',
                    password: 'password123',
                }),
            ).rejects.toThrow(ConflictException);
        });

        it('should register with phone number', async () => {
            accountRepo.findOne.mockResolvedValue(null);
            roleRepo.findOne.mockResolvedValue(mockRole);
            accountRepo.create.mockReturnValue(mockAccount);
            accountRepo.save.mockResolvedValue(mockAccount);

            const result = await service.register({
                phone: '0912345678',
                password: 'password123',
            });

            expect(result.accessToken).toBeDefined();
        });

        it('should assign volunteer role on registration', async () => {
            accountRepo.findOne.mockResolvedValue(null);
            roleRepo.findOne.mockResolvedValue(mockRole);
            accountRepo.create.mockReturnValue(mockAccount);
            accountRepo.save.mockResolvedValue(mockAccount);

            await service.register({
                email: 'new@example.com',
                password: 'password123',
            });

            expect(roleRepo.findOne).toHaveBeenCalledWith({
                where: { name: 'volunteer' },
            });
            expect(accountRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    roles: [mockRole],
                }),
            );
        });
    });

    // -----------------------------------------
    // login()
    // -----------------------------------------
    describe('login', () => {
        it('should login with valid email and password', async () => {
            const hashedPassword = await bcrypt.hash('password123', 10);
            const account = { ...mockAccount, passwordHash: hashedPassword };
            accountRepo.findOne.mockResolvedValue(account);
            accountRepo.update.mockResolvedValue(undefined);

            const result = await service.login({
                email: 'test@example.com',
                password: 'password123',
            });

            expect(result.accessToken).toBe('mock-jwt-token');
            expect(result.user.id).toBe('user-123');
            expect(accountRepo.update).toHaveBeenCalledWith(
                'user-123',
                expect.objectContaining({ lastLoginAt: expect.any(Date) }),
            );
        });

        it('should throw UnauthorizedException for non-existent account', async () => {
            accountRepo.findOne.mockResolvedValue(null);

            await expect(
                service.login({ email: 'unknown@example.com', password: 'pass' }),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException for wrong password', async () => {
            const hashedPassword = await bcrypt.hash('correct-password', 10);
            accountRepo.findOne.mockResolvedValue({ ...mockAccount, passwordHash: hashedPassword });

            await expect(
                service.login({ email: 'test@example.com', password: 'wrong-password' }),
            ).rejects.toThrow(UnauthorizedException);
        });
    });

    // -----------------------------------------
    // validateToken()
    // -----------------------------------------
    describe('validateToken', () => {
        it('should return account for valid token', async () => {
            jwtService.verify.mockReturnValue({ sub: 'user-123' });
            accountRepo.findOne.mockResolvedValue(mockAccount);

            const result = await service.validateToken('valid-token');

            expect(result).toEqual(mockAccount);
            expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
        });

        it('should return null for invalid token', async () => {
            jwtService.verify.mockImplementation(() => {
                throw new Error('Invalid token');
            });

            const result = await service.validateToken('invalid-token');

            expect(result).toBeNull();
        });
    });

    // -----------------------------------------
    // generateTokenForAccountId()
    // -----------------------------------------
    describe('generateTokenForAccountId', () => {
        it('should generate token for existing account', async () => {
            accountRepo.findOne.mockResolvedValue(mockAccount);

            const result = await service.generateTokenForAccountId('user-123');

            expect(result.accessToken).toBe('mock-jwt-token');
            expect(result.expiresIn).toBe(900); // 15 * 60
            expect(result.user.id).toBe('user-123');
        });

        it('should throw UnauthorizedException for non-existent account', async () => {
            accountRepo.findOne.mockResolvedValue(null);

            await expect(
                service.generateTokenForAccountId('non-existent'),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should include role info in token response', async () => {
            accountRepo.findOne.mockResolvedValue(mockAccount);

            const result = await service.generateTokenForAccountId('user-123');

            expect(result.user.roles).toEqual(['volunteer']);
            expect(result.user.roleLevel).toBe(1);
            expect(result.user.roleDisplayName).toBe('登記志工');
        });
    });

    // -----------------------------------------
    // OTP Methods
    // -----------------------------------------
    describe('sendPhoneOtp', () => {
        it('should generate OTP and send SMS', async () => {
            otpService.generateOtp.mockReturnValue('123456');
            smsService.sendOtp.mockResolvedValue(undefined);

            const result = await service.sendPhoneOtp('0912345678');

            expect(result.success).toBe(true);
            expect(otpService.generateOtp).toHaveBeenCalledWith('0912345678', 'phone');
        });
    });

    describe('verifyPhoneOtp', () => {
        it('should verify valid OTP and update phone verification', async () => {
            otpService.verifyOtp.mockReturnValue(true);
            accountRepo.findOne.mockResolvedValue(mockAccount);
            accountRepo.save.mockResolvedValue(mockAccount);

            const result = await service.verifyPhoneOtp('0912345678', '123456');

            expect(result.success).toBe(true);
            expect(result.verified).toBe(true);
        });

        it('should return verified false for invalid OTP', async () => {
            otpService.verifyOtp.mockReturnValue(false);

            const result = await service.verifyPhoneOtp('0912345678', '000000');

            expect(result.verified).toBe(false);
        });
    });

    // -----------------------------------------
    // Password Reset
    // -----------------------------------------
    describe('requestPasswordReset', () => {
        it('should send reset email when email provided', async () => {
            passwordResetService.findAccountByEmailOrPhone.mockResolvedValue(mockAccount);
            passwordResetService.createResetToken.mockResolvedValue('reset-token-123');
            passwordResetService.generateResetUrl.mockReturnValue('https://example.com/reset/reset-token-123');
            emailService.sendPasswordReset.mockResolvedValue(undefined);

            const result = await service.requestPasswordReset('test@example.com');

            expect(result.success).toBe(true);
            expect(passwordResetService.findAccountByEmailOrPhone).toHaveBeenCalled();
        });

        it('should throw BadRequestException when neither email nor phone provided', async () => {
            await expect(
                service.requestPasswordReset(),
            ).rejects.toThrow(BadRequestException);
        });

        it('should return success even if account not found (security)', async () => {
            passwordResetService.findAccountByEmailOrPhone.mockResolvedValue(null);

            const result = await service.requestPasswordReset('unknown@example.com');

            expect(result.success).toBe(true);
        });
    });

    describe('resetPassword', () => {
        it('should reset password with valid token', async () => {
            passwordResetService.verifyAndResetPassword.mockResolvedValue(undefined);

            const result = await service.resetPassword('reset-token', 'newPassword123');

            expect(result.success).toBe(true);
            expect(result.message).toContain('密碼已成功重設');
            expect(passwordResetService.verifyAndResetPassword).toHaveBeenCalledWith('reset-token', 'newPassword123');
        });

        it('should throw BadRequestException for missing parameters', async () => {
            await expect(
                service.resetPassword('', 'newPassword'),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw BadRequestException for short password', async () => {
            await expect(
                service.resetPassword('token', '123'),
            ).rejects.toThrow(BadRequestException);
        });
    });
});

// =========================================
// AccountManagementService Tests
// =========================================

describe('AccountManagementService', () => {
    let service: AccountManagementService;
    let accountRepo: any;
    let roleRepo: any;
    let pagePermissionRepo: any;

    const mockRole = {
        id: 'role-1',
        name: 'owner',
        displayName: '系統管理員',
        level: 5,
        description: null,
        createdAt: new Date(),
    };

    const mockVolunteerRole = {
        id: 'role-2',
        name: 'volunteer',
        displayName: '登記志工',
        level: 1,
    };

    const mockAccount = {
        id: 'user-123',
        email: 'test@example.com',
        phone: '0912345678',
        displayName: '測試使用者',
        avatarUrl: null,
        lineUserId: null,
        googleId: 'google-id-123',
        volunteerProfileCompleted: false,
        passwordHash: '$2a$10$hashedPassword',
        approvalStatus: 'approved',
        phoneVerified: true,
        emailVerified: false,
        isActive: true,
        prefAlertNotifications: true,
        prefTaskNotifications: false,
        prefTrainingNotifications: true,
        roles: [mockRole],
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AccountManagementService,
                {
                    provide: getRepositoryToken(Account),
                    useValue: {
                        findOne: jest.fn(),
                        save: jest.fn(),
                        create: jest.fn(),
                        delete: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(Role),
                    useValue: { findOne: jest.fn(), find: jest.fn() },
                },
                {
                    provide: getRepositoryToken(PagePermission),
                    useValue: { find: jest.fn() },
                },
            ],
        }).compile();

        service = module.get<AccountManagementService>(AccountManagementService);
        accountRepo = module.get(getRepositoryToken(Account));
        roleRepo = module.get(getRepositoryToken(Role));
        pagePermissionRepo = module.get(getRepositoryToken(PagePermission));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // -----------------------------------------
    // getAccountById
    // -----------------------------------------
    describe('getAccountById', () => {
        it('should return account with roles relation loaded', async () => {
            accountRepo.findOne.mockResolvedValue(mockAccount);
            const result = await service.getAccountById('user-123');

            expect(accountRepo.findOne).toHaveBeenCalledWith({
                where: { id: 'user-123' },
                relations: ['roles'],
            });
            expect(result).toEqual(mockAccount);
            expect(result?.roles).toHaveLength(1);
            expect(result?.roles[0].level).toBe(5);
        });

        it('should return null for non-existent user', async () => {
            accountRepo.findOne.mockResolvedValue(null);
            const result = await service.getAccountById('non-existent');
            expect(result).toBeNull();
        });

        it('should return account with empty roles array when no roles assigned', async () => {
            accountRepo.findOne.mockResolvedValue({ ...mockAccount, roles: [] });
            const result = await service.getAccountById('user-123');
            expect(result?.roles).toEqual([]);
        });
    });

    // -----------------------------------------
    // updateProfile
    // -----------------------------------------
    describe('updateProfile', () => {
        it('should update displayName', async () => {
            accountRepo.findOne.mockResolvedValue({ ...mockAccount });
            accountRepo.save.mockImplementation((a: any) => Promise.resolve(a));

            const result = await service.updateProfile('user-123', { displayName: '新名稱' });

            expect(result.displayName).toBe('新名稱');
        });

        it('should update avatarUrl', async () => {
            accountRepo.findOne.mockResolvedValue({ ...mockAccount });
            accountRepo.save.mockImplementation((a: any) => Promise.resolve(a));

            const result = await service.updateProfile('user-123', { avatarUrl: 'https://img.example.com' });

            expect(result.avatarUrl).toBe('https://img.example.com');
        });

        it('should throw UnauthorizedException for non-existent account', async () => {
            accountRepo.findOne.mockResolvedValue(null);

            await expect(
                service.updateProfile('non-existent', { displayName: '名稱' }),
            ).rejects.toThrow(UnauthorizedException);
        });
    });

    // -----------------------------------------
    // changePassword
    // -----------------------------------------
    describe('changePassword', () => {
        it('should change password with valid current password', async () => {
            const hashedPassword = await bcrypt.hash('oldPassword', 10);
            accountRepo.findOne.mockResolvedValue({ ...mockAccount, passwordHash: hashedPassword });
            accountRepo.save.mockResolvedValue(mockAccount);

            const result = await service.changePassword('user-123', 'oldPassword', 'newPassword');

            expect(result.success).toBe(true);
            expect(accountRepo.save).toHaveBeenCalled();
        });

        it('should throw UnauthorizedException for wrong current password', async () => {
            const hashedPassword = await bcrypt.hash('correctPassword', 10);
            accountRepo.findOne.mockResolvedValue({ ...mockAccount, passwordHash: hashedPassword });

            await expect(
                service.changePassword('user-123', 'wrongPassword', 'newPassword'),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException for non-existent account', async () => {
            accountRepo.findOne.mockResolvedValue(null);

            await expect(
                service.changePassword('non-existent', 'old', 'new'),
            ).rejects.toThrow(UnauthorizedException);
        });
    });

    // -----------------------------------------
    // setPassword
    // -----------------------------------------
    describe('setPassword', () => {
        it('should set password for account without password', async () => {
            accountRepo.findOne.mockResolvedValue({ ...mockAccount, passwordHash: '' });
            accountRepo.save.mockResolvedValue(mockAccount);

            const result = await service.setPassword('user-123', 'newPassword');

            expect(result.success).toBe(true);
        });

        it('should throw BadRequestException if password already set', async () => {
            const hashedPassword = await bcrypt.hash('existing', 10);
            accountRepo.findOne.mockResolvedValue({ ...mockAccount, passwordHash: hashedPassword });

            await expect(
                service.setPassword('user-123', 'newPassword'),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw UnauthorizedException for non-existent account', async () => {
            accountRepo.findOne.mockResolvedValue(null);

            await expect(
                service.setPassword('non-existent', 'newPassword'),
            ).rejects.toThrow(UnauthorizedException);
        });
    });

    // -----------------------------------------
    // adminSetPassword
    // -----------------------------------------
    describe('adminSetPassword', () => {
        it('should set password for any account by email', async () => {
            accountRepo.findOne.mockResolvedValue({ ...mockAccount });
            accountRepo.save.mockResolvedValue(mockAccount);

            const result = await service.adminSetPassword('test@example.com', 'admin-new-pwd');

            expect(result.success).toBe(true);
            expect(result.message).toContain('test@example.com');
        });

        it('should throw NotFoundException for non-existent email', async () => {
            accountRepo.findOne.mockResolvedValue(null);

            await expect(
                service.adminSetPassword('unknown@example.com', 'password'),
            ).rejects.toThrow(NotFoundException);
        });
    });

    // -----------------------------------------
    // hasPassword
    // -----------------------------------------
    describe('hasPassword', () => {
        it('should return true when password hash exists', async () => {
            accountRepo.findOne.mockResolvedValue({
                id: 'user-123',
                passwordHash: '$2a$10$hashedPassword',
            });

            const result = await service.hasPassword('user-123');

            expect(result.hasPassword).toBe(true);
        });

        it('should return false when password hash is empty', async () => {
            accountRepo.findOne.mockResolvedValue({
                id: 'user-123',
                passwordHash: '',
            });

            const result = await service.hasPassword('user-123');

            expect(result.hasPassword).toBe(false);
        });

        it('should return false when password hash is null', async () => {
            accountRepo.findOne.mockResolvedValue({
                id: 'user-123',
                passwordHash: null,
            });

            const result = await service.hasPassword('user-123');

            expect(result.hasPassword).toBe(false);
        });

        it('should throw UnauthorizedException for non-existent account', async () => {
            accountRepo.findOne.mockResolvedValue(null);

            await expect(service.hasPassword('non-existent')).rejects.toThrow(UnauthorizedException);
        });
    });

    // -----------------------------------------
    // getPreferences / updatePreferences
    // -----------------------------------------
    describe('getPreferences', () => {
        it('should return current preferences', async () => {
            accountRepo.findOne.mockResolvedValue(mockAccount);

            const result = await service.getPreferences('user-123');

            expect(result.alertNotifications).toBe(true);
            expect(result.taskNotifications).toBe(false);
            expect(result.trainingNotifications).toBe(true);
        });

        it('should default to true when preference values are null', async () => {
            accountRepo.findOne.mockResolvedValue({
                ...mockAccount,
                prefAlertNotifications: null,
                prefTaskNotifications: null,
                prefTrainingNotifications: null,
            });

            const result = await service.getPreferences('user-123');

            expect(result.alertNotifications).toBe(true);
            expect(result.taskNotifications).toBe(true);
            expect(result.trainingNotifications).toBe(true);
        });

        it('should throw UnauthorizedException for non-existent account', async () => {
            accountRepo.findOne.mockResolvedValue(null);
            await expect(service.getPreferences('non-existent')).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('updatePreferences', () => {
        it('should update only provided preferences', async () => {
            const account = { ...mockAccount };
            accountRepo.findOne.mockResolvedValue(account);
            accountRepo.save.mockImplementation((a: any) => Promise.resolve(a));

            const result = await service.updatePreferences('user-123', {
                taskNotifications: true,
            });

            expect(result.taskNotifications).toBe(true);
            expect(result.alertNotifications).toBe(true); // unchanged
        });

        it('should throw UnauthorizedException for non-existent account', async () => {
            accountRepo.findOne.mockResolvedValue(null);

            await expect(
                service.updatePreferences('non-existent', { alertNotifications: false }),
            ).rejects.toThrow(UnauthorizedException);
        });
    });

    // -----------------------------------------
    // getPagePermissions / getAllRoles
    // -----------------------------------------
    describe('getPagePermissions', () => {
        it('should return visible permissions ordered by sortOrder', async () => {
            const mockPermissions = [
                { id: '1', pageName: 'dashboard', isVisible: true, sortOrder: 1 },
                { id: '2', pageName: 'settings', isVisible: true, sortOrder: 2 },
            ];
            pagePermissionRepo.find.mockResolvedValue(mockPermissions);

            const result = await service.getPagePermissions();

            expect(result).toEqual(mockPermissions);
            expect(pagePermissionRepo.find).toHaveBeenCalledWith({
                where: { isVisible: true },
                order: { sortOrder: 'ASC' },
            });
        });
    });

    describe('getAllRoles', () => {
        it('should return all roles ordered by level', async () => {
            const mockRoles = [mockVolunteerRole, mockRole];
            roleRepo.find.mockResolvedValue(mockRoles);

            const result = await service.getAllRoles();

            expect(result).toEqual(mockRoles);
            expect(roleRepo.find).toHaveBeenCalledWith({
                order: { level: 'ASC' },
            });
        });
    });

    // -----------------------------------------
    // getAccountStatus
    // -----------------------------------------
    describe('getAccountStatus', () => {
        it('should return full account status', async () => {
            accountRepo.findOne.mockResolvedValue(mockAccount);

            const result = await service.getAccountStatus('user-123');

            expect(result.approvalStatus).toBe('approved');
            expect(result.phoneVerified).toBe(true);
            expect(result.emailVerified).toBe(false);
            expect(result.volunteerProfileCompleted).toBe(false);
            expect(result.needsSetup).toBe(true); // approved but not completed
        });

        it('should return needsSetup=false when profile completed', async () => {
            accountRepo.findOne.mockResolvedValue({
                ...mockAccount,
                volunteerProfileCompleted: true,
            });

            const result = await service.getAccountStatus('user-123');

            expect(result.needsSetup).toBe(false);
        });

        it('should return needsSetup=false when not yet approved', async () => {
            accountRepo.findOne.mockResolvedValue({
                ...mockAccount,
                approvalStatus: 'pending',
            });

            const result = await service.getAccountStatus('user-123');

            expect(result.needsSetup).toBe(false);
        });

        it('should throw NotFoundException for non-existent account', async () => {
            accountRepo.findOne.mockResolvedValue(null);

            await expect(service.getAccountStatus('non-existent')).rejects.toThrow(NotFoundException);
        });
    });

    // -----------------------------------------
    // markVolunteerProfileCompleted
    // -----------------------------------------
    describe('markVolunteerProfileCompleted', () => {
        it('should mark volunteer profile as completed', async () => {
            const account = { ...mockAccount };
            accountRepo.findOne.mockResolvedValue(account);
            accountRepo.save.mockResolvedValue({ ...account, volunteerProfileCompleted: true });

            const result = await service.markVolunteerProfileCompleted('user-123');

            expect(result.success).toBe(true);
            expect(account.volunteerProfileCompleted).toBe(true);
            expect(accountRepo.save).toHaveBeenCalled();
        });

        it('should throw NotFoundException for non-existent account', async () => {
            accountRepo.findOne.mockResolvedValue(null);

            await expect(
                service.markVolunteerProfileCompleted('non-existent'),
            ).rejects.toThrow(NotFoundException);
        });
    });

    // -----------------------------------------
    // recreateOwnerAccount
    // -----------------------------------------
    describe('recreateOwnerAccount', () => {
        it('should delete existing and create new owner account', async () => {
            accountRepo.findOne.mockResolvedValue(mockAccount);
            accountRepo.delete.mockResolvedValue(undefined);
            roleRepo.findOne.mockResolvedValue(mockRole);
            accountRepo.create.mockReturnValue({ ...mockAccount, id: 'new-id' });
            accountRepo.save.mockResolvedValue({ ...mockAccount, id: 'new-id' });

            const result = await service.recreateOwnerAccount('test@example.com', 'newPassword');

            expect(result.success).toBe(true);
            expect(accountRepo.delete).toHaveBeenCalled();
            expect(accountRepo.create).toHaveBeenCalled();
        });

        it('should create owner even if no existing account', async () => {
            accountRepo.findOne.mockResolvedValue(null);
            roleRepo.findOne.mockResolvedValue(mockRole);
            accountRepo.create.mockReturnValue({ ...mockAccount, id: 'new-id' });
            accountRepo.save.mockResolvedValue({ ...mockAccount, id: 'new-id' });

            const result = await service.recreateOwnerAccount('new@example.com', 'password');

            expect(result.success).toBe(true);
            expect(accountRepo.delete).not.toHaveBeenCalled();
        });

        it('should throw NotFoundException if owner role does not exist', async () => {
            accountRepo.findOne.mockResolvedValue(null);
            roleRepo.findOne.mockResolvedValue(null);

            await expect(
                service.recreateOwnerAccount('test@example.com', 'password'),
            ).rejects.toThrow(NotFoundException);
        });
    });
});
