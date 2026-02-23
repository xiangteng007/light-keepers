import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MeshtasticService } from './meshtastic.service';

describe('MeshtasticService', () => {
    let service: MeshtasticService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MeshtasticService,
                { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(undefined) } },
                { provide: EventEmitter2, useValue: { emit: jest.fn() } },
            ],
        }).compile();
        service = module.get(MeshtasticService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('connect sets connected status', async () => {
        const ok = await service.connect('serial', '/dev/ttyUSB0');
        expect(ok).toBe(true);
        expect(service.getConnectionStatus().isConnected).toBe(true);
    });

    it('disconnect resets status', async () => {
        await service.connect('serial', '/dev/ttyUSB0');
        await service.disconnect();
        expect(service.getConnectionStatus().isConnected).toBe(false);
    });

    it('sendMessage returns false when disconnected', async () => {
        const ok = await service.sendMessage('hello');
        expect(ok).toBe(false);
    });

    it('sendMessage returns true when connected', async () => {
        await service.connect('tcp', '192.168.1.1');
        const ok = await service.sendMessage('hello');
        expect(ok).toBe(true);
    });

    it('handleIncomingMessage stores message', () => {
        service.handleIncomingMessage({ from: 'node1', text: 'test' });
        const msgs = service.getRecentMessages(10);
        expect(msgs.length).toBe(1);
        expect(msgs[0].text).toBe('test');
    });

    it('handlePositionUpdate stores position', () => {
        service.handlePositionUpdate({ nodeId: 'n1', latitude: 25.0, longitude: 121.5 });
        const pos = service.getNodePosition('n1');
        expect(pos).toBeDefined();
        expect(pos!.latitude).toBe(25.0);
    });

    it('getAllPositions returns array', () => {
        service.handlePositionUpdate({ nodeId: 'n1', latitude: 25.0, longitude: 121.5 });
        expect(service.getAllPositions().length).toBe(1);
    });

    it('handleNodeInfo stores node', () => {
        service.handleNodeInfo({ nodeId: 'n1', longName: 'Node-1', shortName: 'N1' });
        expect(service.getNode('n1')).toBeDefined();
    });

    it('getAllNodes returns all', () => {
        service.handleNodeInfo({ nodeId: 'n1', longName: 'Node-1' });
        expect(service.getAllNodes().length).toBe(1);
    });

    it('getOnlineNodes filters by lastHeard', () => {
        service.handleNodeInfo({ nodeId: 'n1', longName: 'N1' });
        expect(service.getOnlineNodes().length).toBe(1);
    });
});
