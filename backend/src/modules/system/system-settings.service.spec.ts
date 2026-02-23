import { SystemSettingsService } from './system-settings.service';

describe('SystemSettingsService', () => {
    let service: SystemSettingsService;
    let cacheService: Record<string, jest.Mock>;

    beforeEach(() => {
        cacheService = {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
        };
        service = new SystemSettingsService(cacheService as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('getSettings', () => {
        it('should return default settings', async () => {
            const settings = await service.getSettings();
            expect(settings.siteName).toBe('光守護者災防平台');
            expect(settings.maintenanceMode).toBe(false);
        });
    });

    describe('get', () => {
        it('should return single setting value', async () => {
            const value = await service.get('sosAlertRadius');
            expect(value).toBe(5);
        });
    });

    describe('updateSettings', () => {
        it('should update and persist settings', async () => {
            const updated = await service.updateSettings({ siteName: 'New' });
            expect(updated.siteName).toBe('New');
            expect(cacheService.set).toHaveBeenCalled();
        });

        it('should merge with existing settings', async () => {
            await service.updateSettings({ aiEnabled: false });
            const settings = await service.getSettings();
            expect(settings.aiEnabled).toBe(false);
            expect(settings.siteName).toBe('光守護者災防平台');
        });
    });

    describe('resetToDefaults', () => {
        it('should reset all settings to defaults', async () => {
            await service.updateSettings({ siteName: 'Changed' });
            const reset = await service.resetToDefaults();
            expect(reset.siteName).toBe('光守護者災防平台');
        });
    });

    describe('isMaintenanceMode', () => {
        it('should return false by default', async () => {
            expect(await service.isMaintenanceMode()).toBe(false);
        });
    });

    describe('setMaintenanceMode', () => {
        it('should enable maintenance mode', async () => {
            await service.setMaintenanceMode(true, '升級中');
            expect(await service.isMaintenanceMode()).toBe(true);
        });

        it('should disable maintenance mode', async () => {
            await service.setMaintenanceMode(true);
            await service.setMaintenanceMode(false);
            expect(await service.isMaintenanceMode()).toBe(false);
        });
    });
});
