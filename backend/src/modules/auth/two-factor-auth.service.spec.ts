import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TwoFactorAuthService } from './two-factor-auth.service';

describe('TwoFactorAuthService', () => {
    let service: TwoFactorAuthService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [TwoFactorAuthService],
        }).compile();

        service = module.get<TwoFactorAuthService>(TwoFactorAuthService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== generateSecret =====
    describe('generateSecret', () => {
        it('should generate TOTP secret with otpauth URL', () => {
            const result = service.generateSecret('user-1', 'test@example.com');
            expect(result.secret).toBeDefined();
            expect(result.secret.length).toBe(20);
            expect(result.otpauth_url).toContain('otpauth://totp/Lightkeepers:test@example.com');
            expect(result.otpauth_url).toContain(`secret=${result.secret}`);
            expect(result.qrCodeDataUrl).toContain('qr:');
        });

        it('should generate unique secrets', () => {
            const s1 = service.generateSecret('user-1', 'a@test.com');
            const s2 = service.generateSecret('user-2', 'b@test.com');
            expect(s1.secret).not.toBe(s2.secret);
        });
    });

    // ===== verifyAndEnable =====
    describe('verifyAndEnable', () => {
        it('should throw if no pending setup', () => {
            expect(() => service.verifyAndEnable('user-1', '123456'))
                .toThrow(BadRequestException);
        });

        it('should throw for invalid token', () => {
            service.generateSecret('user-1', 'test@test.com');
            expect(() => service.verifyAndEnable('user-1', '000000'))
                .toThrow(BadRequestException);
        });

        it('should enable 2FA with valid TOTP token', () => {
            const { secret } = service.generateSecret('user-1', 'test@test.com');

            // Generate a valid token using the service's own TOTP logic
            const validToken = (service as any).generateTOTP(secret, 0);

            const result = service.verifyAndEnable('user-1', validToken);
            expect(result.success).toBe(true);
            expect(result.backupCodes).toBeDefined();
            expect(result.backupCodes!.length).toBe(10);
            expect(service.isEnabled('user-1')).toBe(true);
        });
    });

    // ===== verifyLogin =====
    describe('verifyLogin', () => {
        it('should return false if 2FA not enabled', () => {
            expect(service.verifyLogin('user-1', '123456')).toBe(false);
        });

        it('should verify with valid TOTP token', () => {
            // Setup: enable 2FA first
            const { secret } = service.generateSecret('user-1', 'test@test.com');
            const validToken = (service as any).generateTOTP(secret, 0);
            service.verifyAndEnable('user-1', validToken);

            // Verify login
            const newToken = (service as any).generateTOTP(secret, 0);
            expect(service.verifyLogin('user-1', newToken)).toBe(true);
        });

        it('should verify with backup code', () => {
            const { secret } = service.generateSecret('user-1', 'test@test.com');
            const validToken = (service as any).generateTOTP(secret, 0);
            const result = service.verifyAndEnable('user-1', validToken);

            const backupCode = result.backupCodes![0];
            expect(service.verifyLogin('user-1', backupCode)).toBe(true);

            // Backup code should be consumed (one-time use)
            expect(service.verifyLogin('user-1', backupCode)).toBe(false);
        });
    });

    // ===== isEnabled =====
    describe('isEnabled', () => {
        it('should return false initially', () => {
            expect(service.isEnabled('user-1')).toBe(false);
        });
    });

    // ===== getStatus =====
    describe('getStatus', () => {
        it('should return disabled status initially', () => {
            const status = service.getStatus('user-1');
            expect(status.enabled).toBe(false);
            expect(status.setupRequired).toBe(false);
            expect(status.backupCodesRemaining).toBe(0);
        });

        it('should show setupRequired during pending setup', () => {
            service.generateSecret('user-1', 'test@test.com');
            const status = service.getStatus('user-1');
            expect(status.setupRequired).toBe(true);
            expect(status.enabled).toBe(false);
        });

        it('should show enabled after activation', () => {
            const { secret } = service.generateSecret('user-1', 'test@test.com');
            const token = (service as any).generateTOTP(secret, 0);
            service.verifyAndEnable('user-1', token);

            const status = service.getStatus('user-1');
            expect(status.enabled).toBe(true);
            expect(status.backupCodesRemaining).toBe(10);
        });
    });

    // ===== disable =====
    describe('disable', () => {
        it('should throw for invalid token', () => {
            const { secret } = service.generateSecret('user-1', 'test@test.com');
            const token = (service as any).generateTOTP(secret, 0);
            service.verifyAndEnable('user-1', token);

            expect(() => service.disable('user-1', '000000')).toThrow(BadRequestException);
        });

        it('should disable 2FA with valid token', () => {
            const { secret } = service.generateSecret('user-1', 'test@test.com');
            const token = (service as any).generateTOTP(secret, 0);
            service.verifyAndEnable('user-1', token);

            const newToken = (service as any).generateTOTP(secret, 0);
            expect(service.disable('user-1', newToken)).toBe(true);
            expect(service.isEnabled('user-1')).toBe(false);
        });
    });

    // ===== regenerateBackupCodes =====
    describe('regenerateBackupCodes', () => {
        it('should regenerate backup codes with valid token', () => {
            const { secret } = service.generateSecret('user-1', 'test@test.com');
            const token = (service as any).generateTOTP(secret, 0);
            service.verifyAndEnable('user-1', token);

            const newToken = (service as any).generateTOTP(secret, 0);
            const codes = service.regenerateBackupCodes('user-1', newToken);
            expect(codes).toHaveLength(10);
        });
    });
});
