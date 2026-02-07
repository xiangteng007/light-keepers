import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { Account, Role, PagePermission } from '../accounts/entities';
import { OtpService } from './services/otp.service';
import { SmsService } from './services/sms.service';
import { PasswordResetService } from './services/password-reset.service';
import { EmailService } from './services/email.service';
import { FirebaseAdminService } from './services/firebase-admin.service';
import { LineBotService } from '../line-bot/line-bot.service';

describe('AuthService', () => {
    let service: AuthService;
    let accountRepo: any;

    const mockRole = {
        id: 'role-1',
        name: 'owner',
        displayName: '系統管理員',
        level: 5,
        description: null,
        createdAt: new Date(),
    };

    const mockAccount = {
        id: 'user-123',
        email: 'test@example.com',
        phone: null,
        displayName: '測試使用者',
        avatarUrl: null,
        lineUserId: null,
        googleId: 'google-id-123',
        volunteerProfileCompleted: false,
        roles: [mockRole],
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
                    },
                },
                {
                    provide: getRepositoryToken(Role),
                    useValue: { findOne: jest.fn() },
                },
                {
                    provide: getRepositoryToken(PagePermission),
                    useValue: { find: jest.fn() },
                },
                {
                    provide: JwtService,
                    useValue: { sign: jest.fn().mockReturnValue('mock-jwt-token') },
                },
                { provide: OtpService, useValue: {} },
                { provide: SmsService, useValue: {} },
                { provide: PasswordResetService, useValue: {} },
                { provide: EmailService, useValue: {} },
                { provide: FirebaseAdminService, useValue: {} },
                { provide: LineBotService, useValue: {} },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        accountRepo = module.get(getRepositoryToken(Account));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

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
});
