import { Injectable, Logger } from '@nestjs/common';

/**
 * Device Management Service
 * Manage user login devices
 */
@Injectable()
export class DeviceManagementService {
    private readonly logger = new Logger(DeviceManagementService.name);
    private devices: Map<string, UserDevice[]> = new Map();

    /**
     * 註冊裝置
     */
    registerDevice(userId: string, device: DeviceInput): UserDevice {
        const userDevices = this.devices.get(userId) || [];

        const newDevice: UserDevice = {
            id: `dev-${Date.now()}`,
            userId,
            ...device,
            lastActive: new Date(),
            registeredAt: new Date(),
            trusted: false,
        };

        userDevices.push(newDevice);
        this.devices.set(userId, userDevices);

        return newDevice;
    }

    /**
     * 取得使用者裝置
     */
    getUserDevices(userId: string): UserDevice[] {
        return this.devices.get(userId) || [];
    }

    /**
     * 更新活動時間
     */
    updateActivity(userId: string, deviceId: string): boolean {
        const userDevices = this.devices.get(userId);
        const device = userDevices?.find((d) => d.id === deviceId);
        if (!device) return false;

        device.lastActive = new Date();
        return true;
    }

    /**
     * 標記信任裝置
     */
    trustDevice(userId: string, deviceId: string): boolean {
        const userDevices = this.devices.get(userId);
        const device = userDevices?.find((d) => d.id === deviceId);
        if (!device) return false;

        device.trusted = true;
        return true;
    }

    /**
     * 移除裝置
     */
    removeDevice(userId: string, deviceId: string): boolean {
        const userDevices = this.devices.get(userId);
        if (!userDevices) return false;

        const filtered = userDevices.filter((d) => d.id !== deviceId);
        this.devices.set(userId, filtered);
        return true;
    }

    /**
     * 登出所有裝置
     */
    logoutAllDevices(userId: string, exceptDeviceId?: string): number {
        const userDevices = this.devices.get(userId) || [];
        const toRemove = userDevices.filter((d) => d.id !== exceptDeviceId);

        if (exceptDeviceId) {
            this.devices.set(userId, userDevices.filter((d) => d.id === exceptDeviceId));
        } else {
            this.devices.delete(userId);
        }

        return toRemove.length;
    }

    /**
     * 檢查是否為新裝置
     */
    isNewDevice(userId: string, fingerprint: string): boolean {
        const userDevices = this.devices.get(userId) || [];
        return !userDevices.some((d) => d.fingerprint === fingerprint);
    }

    /**
     * 清除閒置裝置
     */
    purgeInactiveDevices(maxInactiveDays: number = 30): number {
        const cutoff = Date.now() - maxInactiveDays * 24 * 3600000;
        let purged = 0;

        for (const [userId, devices] of this.devices) {
            const active = devices.filter((d) => d.lastActive.getTime() > cutoff);
            purged += devices.length - active.length;
            this.devices.set(userId, active);
        }

        return purged;
    }
}

// Types
interface DeviceInput { deviceType: string; deviceName: string; os: string; browser: string; ip: string; fingerprint: string; }
interface UserDevice extends DeviceInput { id: string; userId: string; lastActive: Date; registeredAt: Date; trusted: boolean; }
