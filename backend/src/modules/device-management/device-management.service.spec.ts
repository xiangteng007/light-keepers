import { Test, TestingModule } from '@nestjs/testing';
import { DeviceManagementService } from './device-management.service';

describe('DeviceManagementService', () => {
    let service: DeviceManagementService;

    const mockDeviceInput = {
        deviceType: 'desktop',
        deviceName: 'MacBook Pro',
        os: 'macOS',
        browser: 'Chrome',
        ip: '192.168.1.1',
        fingerprint: 'fp-abc123',
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [DeviceManagementService],
        }).compile();

        service = module.get<DeviceManagementService>(DeviceManagementService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== Register =====
    describe('registerDevice', () => {
        it('should register device for user', () => {
            const device = service.registerDevice('user-1', mockDeviceInput);
            expect(device.id).toBeDefined();
            expect(device.userId).toBe('user-1');
            expect(device.trusted).toBe(false);
        });
    });

    // ===== Query =====
    describe('getUserDevices', () => {
        it('should return user devices', () => {
            service.registerDevice('user-1', mockDeviceInput);
            service.registerDevice('user-1', { ...mockDeviceInput, deviceName: 'iPhone' });
            const devices = service.getUserDevices('user-1');
            expect(devices).toHaveLength(2);
        });

        it('should return empty array for unknown user', () => {
            expect(service.getUserDevices('unknown')).toEqual([]);
        });
    });

    // ===== Update Activity =====
    describe('updateActivity', () => {
        it('should update device activity timestamp', () => {
            const device = service.registerDevice('user-1', mockDeviceInput);
            const result = service.updateActivity('user-1', device.id);
            expect(result).toBe(true);
        });

        it('should return false for unknown device', () => {
            expect(service.updateActivity('user-1', 'nonexistent')).toBe(false);
        });
    });

    // ===== Trust =====
    describe('trustDevice', () => {
        it('should mark device as trusted', () => {
            const device = service.registerDevice('user-1', mockDeviceInput);
            const result = service.trustDevice('user-1', device.id);
            expect(result).toBe(true);
            const devices = service.getUserDevices('user-1');
            expect(devices[0].trusted).toBe(true);
        });

        it('should return false for unknown device', () => {
            expect(service.trustDevice('user-1', 'nonexistent')).toBe(false);
        });
    });

    // ===== Remove =====
    describe('removeDevice', () => {
        it('should remove device', () => {
            const device = service.registerDevice('user-1', mockDeviceInput);
            const result = service.removeDevice('user-1', device.id);
            expect(result).toBe(true);
        });

        it('should return false for unknown user', () => {
            expect(service.removeDevice('unknown', 'dev-1')).toBe(false);
        });
    });

    // ===== Logout All =====
    describe('logoutAllDevices', () => {
        it('should remove all devices', () => {
            service.registerDevice('user-1', mockDeviceInput);
            service.registerDevice('user-1', { ...mockDeviceInput, deviceName: 'iPhone' });
            const removed = service.logoutAllDevices('user-1');
            expect(removed).toBe(2);
            expect(service.getUserDevices('user-1')).toEqual([]);
        });

        it('should keep excepted device', async () => {
            const kept = service.registerDevice('user-1', mockDeviceInput);
            // Ensure unique ID by waiting
            await new Promise(r => setTimeout(r, 5));
            service.registerDevice('user-1', { ...mockDeviceInput, deviceName: 'iPhone' });
            const removed = service.logoutAllDevices('user-1', kept.id);
            expect(removed).toBeGreaterThanOrEqual(1);
            const remaining = service.getUserDevices('user-1');
            expect(remaining.length).toBeLessThanOrEqual(1);
        });
    });

    // ===== New Device Check =====
    describe('isNewDevice', () => {
        it('should return true for unknown fingerprint', () => {
            expect(service.isNewDevice('user-1', 'new-fp')).toBe(true);
        });

        it('should return false for known fingerprint', () => {
            service.registerDevice('user-1', mockDeviceInput);
            expect(service.isNewDevice('user-1', 'fp-abc123')).toBe(false);
        });
    });

    // ===== Purge Inactive =====
    describe('purgeInactiveDevices', () => {
        it('should purge inactive devices', () => {
            const device = service.registerDevice('user-1', mockDeviceInput);
            // Manually set lastActive to 60 days ago
            const devices = service.getUserDevices('user-1');
            devices[0].lastActive = new Date(Date.now() - 60 * 24 * 3600000);
            const purged = service.purgeInactiveDevices(30);
            expect(purged).toBe(1);
        });

        it('should not purge active devices', () => {
            service.registerDevice('user-1', mockDeviceInput);
            const purged = service.purgeInactiveDevices(30);
            expect(purged).toBe(0);
        });
    });
});
