import { Test, TestingModule } from '@nestjs/testing';
import { SystemController } from './system.controller';
import { SystemSettingsService } from './system-settings.service';
import { SystemBackupService } from './system-backup.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('SystemController', () => {
    let controller: SystemController;

    beforeEach(async () => {
        const settingsService = {
            getSettings: jest.fn().mockResolvedValue({ maintenanceMode: false, aiEnabled: true, notificationEnabled: true, pushEnabled: true, lineEnabled: true }),
            updateSettings: jest.fn().mockResolvedValue({}),
            resetToDefaults: jest.fn().mockResolvedValue({}),
            setMaintenanceMode: jest.fn().mockResolvedValue(undefined),
        };
        const backupService = {
            createBackup: jest.fn().mockResolvedValue({ success: true, backup: { id: 'b1' } }),
            listBackups: jest.fn().mockResolvedValue([]),
            restoreBackup: jest.fn().mockResolvedValue({ success: true, restored: 5 }),
            deleteBackup: jest.fn().mockResolvedValue(true),
        };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [SystemController],
            providers: [
                { provide: SystemSettingsService, useValue: settingsService },
                { provide: SystemBackupService, useValue: backupService },
            ],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();
        controller = module.get<SystemController>(SystemController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('getSettings', async () => expect((await controller.getSettings()).success).toBe(true));
    it('updateSettings', async () => expect((await controller.updateSettings({ siteName: 'Test' })).success).toBe(true));
    it('resetSettings', async () => expect((await controller.resetSettings()).success).toBe(true));
    it('setMaintenance', async () => expect((await controller.setMaintenance({ enabled: true })).success).toBe(true));
    it('createBackup', async () => expect((await controller.createBackup({})).success).toBe(true));
    it('listBackups', async () => expect((await controller.listBackups()).success).toBe(true));
    it('restoreBackup', async () => expect((await controller.restoreBackup('b1', {})).success).toBe(true));
    it('deleteBackup', async () => expect((await controller.deleteBackup('b1')).success).toBe(true));
    it('getStatus', async () => expect((await controller.getStatus()).success).toBe(true));
});
