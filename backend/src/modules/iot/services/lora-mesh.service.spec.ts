import { Test, TestingModule } from '@nestjs/testing';
import { LoRaMeshService, LoRaDeviceType, LoRaPriority } from './lora-mesh.service';

describe('LoRaMeshService', () => {
    let service: LoRaMeshService;
    const device = { deviceId: 'd1', deviceType: LoRaDeviceType.NODE, name: 'Node1', frequency: 923, spreadingFactor: 7, bandwidth: 125, isOnline: true };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [LoRaMeshService],
        }).compile();
        service = module.get(LoRaMeshService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('registerDevice adds device', () => {
        service.registerDevice(device);
        expect(service.getDevices().length).toBe(1);
    });

    it('getOnlineDevices filters', () => {
        service.registerDevice(device);
        service.registerDevice({ ...device, deviceId: 'd2', isOnline: false });
        expect(service.getOnlineDevices().length).toBe(1);
    });

    it('sendMessage returns message id', async () => {
        service.registerDevice(device);
        const id = await service.sendMessage({ sourceDeviceId: 'd1', payload: { type: 'TEXT', message: 'hi' }, priority: LoRaPriority.NORMAL, ackRequired: false });
        expect(id).toContain('lora-');
    });

    it('sendSOS returns message id', async () => {
        const id = await service.sendSOS('d1', { lat: 25, lng: 121 }, 'Help!');
        expect(id).toContain('lora-');
    });

    it('subscribe/unsubscribe works', () => {
        const cb = jest.fn();
        service.subscribe('sub1', cb);
        service.unsubscribe('sub1');
    });

    it('getNetworkStats returns stats', () => {
        service.registerDevice(device);
        const stats = service.getNetworkStats();
        expect(stats.totalDevices).toBe(1);
        expect(stats.onlineDevices).toBe(1);
    });
});
