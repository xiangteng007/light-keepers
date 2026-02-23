import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PasswordResetService } from './password-reset.service';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { Account } from '../../accounts/entities';

// Mock bcrypt and crypto
jest.mock('bcryptjs', () => ({
    hash: jest.fn().mockResolvedValue('hashed-password-123'),
}));

describe('PasswordResetService', () => {
    let service: PasswordResetService;
    let tokenRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock; delete: jest.Mock };
    let accountRepo: { findOne: jest.Mock; save: jest.Mock };
    let configService: { get: jest.Mock };

    beforeEach(async () => {
        tokenRepo = {
            findOne: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation((data) => ({ ...data })),
            save: jest.fn().mockResolvedValue(undefined),
            delete: jest.fn().mockResolvedValue({ affected: 0 }),
        };
        accountRepo = {
            findOne: jest.fn().mockResolvedValue(null),
            save: jest.fn().mockResolvedValue(undefined),
        };
        configService = {
            get: jest.fn().mockReturnValue('https://lightkeepers.ngo'),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PasswordResetService,
                { provide: getRepositoryToken(PasswordResetToken), useValue: tokenRepo },
                { provide: getRepositoryToken(Account), useValue: accountRepo },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        service = module.get<PasswordResetService>(PasswordResetService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createResetToken', () => {
        it('should create and save a token', async () => {
            const token = await service.createResetToken('account-1');
            expect(token).toBeDefined();
            expect(token.length).toBe(64); // 32 bytes hex = 64 chars
            expect(tokenRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    accountId: 'account-1',
                    token,
                    used: false,
                }),
            );
            expect(tokenRepo.save).toHaveBeenCalled();
        });
    });

    describe('generateResetUrl', () => {
        it('should generate URL with frontend base', () => {
            const url = service.generateResetUrl('abc123');
            expect(url).toBe('https://lightkeepers.ngo/reset-password?token=abc123');
        });

        it('should use default URL when not configured', () => {
            configService.get.mockReturnValueOnce(undefined);
            const url = service.generateResetUrl('xyz');
            expect(url).toBe('https://lightkeepers.ngo/reset-password?token=xyz');
        });
    });

    describe('verifyAndResetPassword', () => {
        it('should throw if token not found or expired', async () => {
            await expect(service.verifyAndResetPassword('invalid-token', 'newpass'))
                .rejects.toThrow(BadRequestException);
        });

        it('should throw if account not found', async () => {
            tokenRepo.findOne.mockResolvedValueOnce({
                token: 'valid-token',
                accountId: 'account-999',
                used: false,
            });
            accountRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.verifyAndResetPassword('valid-token', 'newpass'))
                .rejects.toThrow(NotFoundException);
        });

        it('should reset password and mark token as used', async () => {
            const tokenRecord = {
                token: 'valid-token',
                accountId: 'account-1',
                used: false,
            };
            const account = {
                id: 'account-1',
                passwordHash: 'old-hash',
            };
            tokenRepo.findOne.mockResolvedValueOnce(tokenRecord);
            accountRepo.findOne.mockResolvedValueOnce(account);

            await service.verifyAndResetPassword('valid-token', 'new-password-123');

            expect(account.passwordHash).toBe('hashed-password-123'); // bcrypt mock
            expect(accountRepo.save).toHaveBeenCalledWith(account);
            expect(tokenRecord.used).toBe(true);
            expect(tokenRepo.save).toHaveBeenCalledWith(tokenRecord);
        });
    });

    describe('findAccountByEmailOrPhone', () => {
        it('should throw if neither email nor phone provided', async () => {
            await expect(service.findAccountByEmailOrPhone())
                .rejects.toThrow(BadRequestException);
        });

        it('should search by email', async () => {
            accountRepo.findOne.mockResolvedValueOnce({ id: 'a1', email: 'test@test.com' });
            const result = await service.findAccountByEmailOrPhone('test@test.com');
            expect(result?.id).toBe('a1');
        });

        it('should search by phone', async () => {
            accountRepo.findOne.mockResolvedValueOnce({ id: 'a2', phone: '0912345678' });
            const result = await service.findAccountByEmailOrPhone(undefined, '0912345678');
            expect(result?.id).toBe('a2');
        });

        it('should return null when not found', async () => {
            const result = await service.findAccountByEmailOrPhone('nobody@test.com');
            expect(result).toBeNull();
        });
    });

    describe('cleanupExpiredTokens', () => {
        it('should return affected count', async () => {
            tokenRepo.delete.mockResolvedValueOnce({ affected: 3 });
            const count = await service.cleanupExpiredTokens();
            expect(count).toBe(3);
        });
    });
});
