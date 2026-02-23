import { Test, TestingModule } from '@nestjs/testing';
import { TwoFactorController } from './two-factor.controller';
import { TwoFactorService } from './services/two-factor.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('TwoFactorController', () => {
    let controller: TwoFactorController;
    const mockReq = { user: { id: 'u1' } } as any;

    beforeEach(async () => {
        const service = {
            getStatus: jest.fn().mockResolvedValue({ enabled: false }),
            generateSetup: jest.fn().mockResolvedValue({ secret: 'SEC', qrCodeUrl: 'data:image/png', backupCodes: ['ABC'] }),
            verifyAndEnable: jest.fn().mockResolvedValue(undefined),
            verifyLogin: jest.fn().mockResolvedValue(true),
            disable: jest.fn().mockResolvedValue(undefined),
            regenerateBackupCodes: jest.fn().mockResolvedValue(['NEW1', 'NEW2']),
            verifyBackupCode: jest.fn().mockResolvedValue(true),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [TwoFactorController],
            providers: [{ provide: TwoFactorService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<TwoFactorController>(TwoFactorController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('getStatus returns 2FA status', async () => {
        const result = await controller.getStatus(mockReq);
        expect(result.success).toBe(true);
    });

    it('setup generates QR code and secret', async () => {
        const result = await controller.setup(mockReq);
        expect(result.data.secret).toBe('SEC');
        expect(result.data.qrCodeUrl).toBeDefined();
    });

    it('verify enables 2FA', async () => {
        const result = await controller.verify(mockReq, { secret: 'SEC', token: '123456' });
        expect(result.success).toBe(true);
    });

    it('validate verifies TOTP during login', async () => {
        const result = await controller.validate(mockReq, { token: '123456' });
        expect(result.success).toBe(true);
    });

    it('disable disables 2FA', async () => {
        const result = await controller.disable(mockReq, { password: 'pass' });
        expect(result.success).toBe(true);
    });

    it('regenerateBackupCodes returns new codes', async () => {
        const result = await controller.regenerateBackupCodes(mockReq);
        expect(result.data.backupCodes).toHaveLength(2);
    });

    it('verifyBackupCode validates backup code', async () => {
        const result = await controller.verifyBackupCode(mockReq, { code: 'NEW1' });
        expect(result.success).toBe(true);
    });
});
