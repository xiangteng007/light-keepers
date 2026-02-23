import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { TwoFactorService } from './two-factor.service';
import { Account } from '../../accounts/entities/account.entity';

describe('TwoFactorService', () => {
    let service: TwoFactorService;
    let accountRepo: {
        findOne: jest.Mock;
        update: jest.Mock;
        createQueryBuilder: jest.Mock;
    };
    let mockQb: any;

    beforeEach(async () => {
        mockQb = {
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue(undefined),
        };

        accountRepo = {
            findOne: jest.fn().mockResolvedValue(null),
            update: jest.fn().mockResolvedValue(undefined),
            createQueryBuilder: jest.fn().mockReturnValue(mockQb),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TwoFactorService,
                { provide: getRepositoryToken(Account), useValue: accountRepo },
            ],
        }).compile();

        service = module.get<TwoFactorService>(TwoFactorService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('generateSetup', () => {
        it('should throw if account not found', async () => {
            await expect(service.generateSetup('no-acc'))
                .rejects.toThrow(BadRequestException);
        });

        it('should return secret, qrCodeUrl, and backupCodes', async () => {
            accountRepo.findOne.mockResolvedValueOnce({
                id: 'acc-1',
                email: 'test@test.com',
            });
            const result = await service.generateSetup('acc-1');
            expect(result.secret).toBeTruthy();
            expect(result.secret.length).toBeGreaterThan(10);
            expect(result.qrCodeUrl).toContain('otpauth');
            expect(result.qrCodeUrl).toContain('LightKeepers');
            expect(result.backupCodes).toHaveLength(8);
            // Backup codes should be in XXXX-XXXX format
            expect(result.backupCodes[0]).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}$/);
        });
    });

    describe('verifyAndEnable', () => {
        it('should throw if account not found', async () => {
            await expect(service.verifyAndEnable('no-acc', 'secret', '123456'))
                .rejects.toThrow(BadRequestException);
        });

        it('should throw for invalid TOTP code', async () => {
            accountRepo.findOne.mockResolvedValueOnce({ id: 'acc-1' });
            await expect(service.verifyAndEnable('acc-1', 'JBSWY3DPEHPK3PXP', '000000'))
                .rejects.toThrow('驗證碼不正確');
        });
    });

    describe('verifyLogin', () => {
        it('should throw if account not found', async () => {
            await expect(service.verifyLogin('no-acc', '123456'))
                .rejects.toThrow(UnauthorizedException);
        });

        it('should attempt TOTP verification for existing account', async () => {
            accountRepo.findOne.mockResolvedValueOnce({ id: 'acc-1' });
            // verifyLogin uses 'DEMO_SECRET' in demo mode
            const result = await service.verifyLogin('acc-1', '000000');
            expect(typeof result).toBe('boolean');
        });
    });

    describe('verifyBackupCode', () => {
        it('should throw if account not found', async () => {
            await expect(service.verifyBackupCode('no-acc', 'ABCD-1234'))
                .rejects.toThrow(UnauthorizedException);
        });

        it('should return true in demo mode', async () => {
            accountRepo.findOne.mockResolvedValueOnce({ id: 'acc-1' });
            const result = await service.verifyBackupCode('acc-1', 'ABCD-1234');
            expect(result).toBe(true);
        });
    });

    describe('disable', () => {
        it('should throw if account not found', async () => {
            await expect(service.disable('no-acc', 'password'))
                .rejects.toThrow(BadRequestException);
        });

        it('should disable 2FA for existing account', async () => {
            accountRepo.findOne.mockResolvedValueOnce({ id: 'acc-1' });
            const result = await service.disable('acc-1', 'password');
            expect(result).toBe(true);
            expect(mockQb.execute).toHaveBeenCalled();
        });
    });

    describe('getStatus', () => {
        it('should throw if account not found', async () => {
            await expect(service.getStatus('no-acc'))
                .rejects.toThrow(BadRequestException);
        });

        it('should return status for existing account', async () => {
            accountRepo.findOne.mockResolvedValueOnce({ id: 'acc-1' });
            const result = await service.getStatus('acc-1');
            expect(result).toEqual({ enabled: false, hasBackupCodes: false });
        });
    });

    describe('regenerateBackupCodes', () => {
        it('should throw if account not found', async () => {
            await expect(service.regenerateBackupCodes('no-acc'))
                .rejects.toThrow(BadRequestException);
        });

        it('should return 8 new backup codes', async () => {
            accountRepo.findOne.mockResolvedValueOnce({ id: 'acc-1' });
            const codes = await service.regenerateBackupCodes('acc-1');
            expect(codes).toHaveLength(8);
            codes.forEach(code => {
                expect(code).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}$/);
            });
        });
    });
});
