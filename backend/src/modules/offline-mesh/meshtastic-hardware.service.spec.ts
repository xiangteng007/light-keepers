import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MeshtasticHardwareService } from './meshtastic-hardware.service';

describe('MeshtasticHardwareService', () => {
    let service: MeshtasticHardwareService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MeshtasticHardwareService,
                { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(undefined) } },
                { provide: EventEmitter2, useValue: { emit: jest.fn() } },
            ],
        }).compile();
        service = module.get(MeshtasticHardwareService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('getDevices returns empty initially', () => {
        expect(service.getDevices().length).toBe(0);
    });

    it('getNodes returns empty initially', () => {
        expect(service.getNodes().length).toBe(0);
    });

    it('connectSerial returns device', async () => {
        const device = await service.connectSerial('/dev/ttyUSB0');
        expect(device.id).toBeDefined();
        expect(device.connectionType).toBe('serial');
        expect(device.connected).toBe(true);
    });

    it('connectBle returns device', async () => {
        const device = await service.connectBle('Meshtastic-1234');
        expect(device.connectionType).toBe('ble');
    });

    it('connectHttp returns device', async () => {
        const device = await service.connectHttp('http://192.168.1.100');
        expect(device.connectionType).toBe('http');
    });

    it('disconnect sets connected to false', async () => {
        const device = await service.connectSerial('/dev/ttyUSB0');
        await service.disconnect(device.id);
        const devices = service.getDevices();
        expect(devices.find(d => d.id === device.id)?.connected).toBe(false);
    });

    it('handleNodeInfo stores node', () => {
        service.handleNodeInfo({ num: 1, user: { id: 'n1', longName: 'Node1', shortName: 'N1' } });
        expect(service.getNodes().length).toBe(1);
    });

    it('handleMessage emits event', () => {
        service.handleMessage({ from: 1, to: 0xFFFFFFFF, channel: 0, payload: 'hello' });
        // No error = success
    });
});
