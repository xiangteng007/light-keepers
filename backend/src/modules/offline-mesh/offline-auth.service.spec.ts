import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OfflineAuthService } from './offline-auth.service';

describe('OfflineAuthService', () => {
    let service: OfflineAuthService;
    const mockJwt = {
        sign: jest.fn().mockReturnValue('mock.jwt.token'),
        verify: jest.fn().mockReturnValue({ sub: 'u1', type: 'offline', permissions: ['read'] }),
        decode: jest.fn().mockReturnValue({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + 86400 }),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OfflineAuthService,
                { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('test-secret') } },
                { provide: JwtService, useValue: mockJwt },
            ],
        }).compile();
        service = module.get(OfflineAuthService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('issueOfflineToken returns token', () => {
        const token = service.issueOfflineToken('u1', ['admin'], ['read', 'write']);
        expect(token.token).toBeDefined();
        expect(token.userId).toBe('u1');
        expect(token.signature).toBeDefined();
    });

    it('verifyOfflineToken returns valid', () => {
        const result = service.verifyOfflineToken('mock.jwt.token');
        expect(result.valid).toBe(true);
        expect(result.userId).toBe('u1');
    });

    it('revokeToken makes token invalid', () => {
        service.revokeToken('mock.jwt.token');
        const result = service.verifyOfflineToken('mock.jwt.token');
        expect(result.valid).toBe(false);
    });

    it('cachePermissions / getCachedPermissions works', () => {
        service.cachePermissions('u1', ['admin'], ['read']);
        const cached = service.getCachedPermissions('u1');
        expect(cached).not.toBeNull();
        expect(cached!.roles).toContain('admin');
    });

    it('getCachedPermissions returns null for unknown user', () => {
        expect(service.getCachedPermissions('unknown')).toBeNull();
    });

    it('getTokenRemainingTime returns positive', () => {
        const remaining = service.getTokenRemainingTime('mock.jwt.token');
        expect(remaining).toBeGreaterThan(0);
    });

    it('shouldRenewToken returns boolean', () => {
        expect(typeof service.shouldRenewToken('mock.jwt.token')).toBe('boolean');
    });

    it('cleanupExpiredCache returns count', () => {
        const cleaned = service.cleanupExpiredCache();
        expect(typeof cleaned).toBe('number');
    });

    it('getStats returns stats', () => {
        const stats = service.getStats();
        expect(stats.cachedUsers).toBeDefined();
        expect(stats.revokedTokens).toBeDefined();
    });

    it('revokeAllUserTokens clears cache', () => {
        service.cachePermissions('u1', ['admin'], ['read']);
        service.revokeAllUserTokens('u1');
        expect(service.getCachedPermissions('u1')).toBeNull();
    });
});
