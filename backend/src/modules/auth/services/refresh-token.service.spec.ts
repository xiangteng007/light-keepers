import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RefreshTokenService } from './refresh-token.service';
import { RefreshToken } from '../entities/refresh-token.entity';

describe('RefreshTokenService', () => {
    let service: RefreshTokenService;
    let tokenRepo: {
        create: jest.Mock;
        save: jest.Mock;
        findOne: jest.Mock;
        find: jest.Mock;
        update: jest.Mock;
        delete: jest.Mock;
    };

    beforeEach(async () => {
        tokenRepo = {
            create: jest.fn().mockImplementation((data) => ({ id: 'rt-1', ...data })),
            save: jest.fn().mockResolvedValue(undefined),
            findOne: jest.fn().mockResolvedValue(null),
            find: jest.fn().mockResolvedValue([]),
            update: jest.fn().mockResolvedValue({ affected: 0 }),
            delete: jest.fn().mockResolvedValue({ affected: 0 }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RefreshTokenService,
                { provide: getRepositoryToken(RefreshToken), useValue: tokenRepo },
            ],
        }).compile();

        service = module.get<RefreshTokenService>(RefreshTokenService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createRefreshToken', () => {
        it('should create and return a 64-char hex token', async () => {
            const rawToken = await service.createRefreshToken('acc-1', 'browser/1.0', '127.0.0.1');
            expect(rawToken).toMatch(/^[a-f0-9]{64}$/);
            expect(tokenRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    accountId: 'acc-1',
                    userAgent: 'browser/1.0',
                    ipAddress: '127.0.0.1',
                }),
            );
            expect(tokenRepo.save).toHaveBeenCalled();
        });

        it('should truncate long user agent', async () => {
            const longUA = 'A'.repeat(600);
            await service.createRefreshToken('acc-1', longUA);
            expect(tokenRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    userAgent: longUA.substring(0, 500),
                }),
            );
        });
    });

    describe('validateRefreshToken', () => {
        it('should return null for empty token', async () => {
            expect(await service.validateRefreshToken('')).toBeNull();
        });

        it('should return null for unknown token', async () => {
            expect(await service.validateRefreshToken('nonexistent')).toBeNull();
        });

        it('should return null for revoked token', async () => {
            tokenRepo.findOne.mockResolvedValueOnce({
                accountId: 'acc-1',
                isRevoked: true,
                expiresAt: new Date(Date.now() + 86400000),
            });
            expect(await service.validateRefreshToken('some-token')).toBeNull();
        });

        it('should return null for expired token', async () => {
            tokenRepo.findOne.mockResolvedValueOnce({
                accountId: 'acc-1',
                isRevoked: false,
                expiresAt: new Date(Date.now() - 1000), // Expired
            });
            expect(await service.validateRefreshToken('some-token')).toBeNull();
        });

        it('should return accountId and update lastUsedAt for valid token', async () => {
            const token = {
                accountId: 'acc-1',
                isRevoked: false,
                expiresAt: new Date(Date.now() + 86400000),
                lastUsedAt: null as Date | null,
            };
            tokenRepo.findOne.mockResolvedValueOnce(token);

            const result = await service.validateRefreshToken('valid-token');
            expect(result).toBe('acc-1');
            expect(token.lastUsedAt).toBeInstanceOf(Date);
            expect(tokenRepo.save).toHaveBeenCalledWith(token);
        });
    });

    describe('revokeToken', () => {
        it('should return false for empty token', async () => {
            expect(await service.revokeToken('')).toBe(false);
        });

        it('should return true when token revoked', async () => {
            tokenRepo.update.mockResolvedValueOnce({ affected: 1 });
            expect(await service.revokeToken('some-token')).toBe(true);
        });
    });

    describe('revokeAllTokens', () => {
        it('should return affected count', async () => {
            tokenRepo.update.mockResolvedValueOnce({ affected: 3 });
            expect(await service.revokeAllTokens('acc-1')).toBe(3);
        });
    });

    describe('getActiveSessions', () => {
        it('should return mapped session objects', async () => {
            tokenRepo.find.mockResolvedValueOnce([
                {
                    id: 'rt-1',
                    userAgent: 'Chrome',
                    ipAddress: '1.2.3.4',
                    createdAt: new Date(),
                    lastUsedAt: new Date(),
                },
            ]);
            const sessions = await service.getActiveSessions('acc-1');
            expect(sessions).toHaveLength(1);
            expect(sessions[0].userAgent).toBe('Chrome');
            expect(sessions[0]).not.toHaveProperty('tokenHash');
        });
    });

    describe('revokeSession', () => {
        it('should return true when session revoked', async () => {
            tokenRepo.update.mockResolvedValueOnce({ affected: 1 });
            expect(await service.revokeSession('acc-1', 'rt-1')).toBe(true);
        });

        it('should return false when session not found', async () => {
            expect(await service.revokeSession('acc-1', 'nonexistent')).toBe(false);
        });
    });

    describe('cleanupExpiredTokens', () => {
        it('should return affected count', async () => {
            tokenRepo.delete.mockResolvedValueOnce({ affected: 5 });
            expect(await service.cleanupExpiredTokens()).toBe(5);
        });
    });
});
