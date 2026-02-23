import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MeshHealthService } from './mesh-health.service';

describe('MeshHealthService', () => {
    let service: MeshHealthService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MeshHealthService,
                { provide: EventEmitter2, useValue: { emit: jest.fn() } },
            ],
        }).compile();
        service = module.get(MeshHealthService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('registerNode creates node', () => {
        const node = service.registerNode({
            id: 'n1', name: 'Relay-1', type: 'relay', signalDbm: -60,
            neighbors: [], hopCount: 0, packetLoss: 0, latencyMs: 10,
        });
        expect(node.id).toBe('n1');
        expect(node.status).toBeDefined();
    });

    it('handleHeartbeat updates node', () => {
        service.registerNode({ id: 'n1', name: 'R1', type: 'relay', signalDbm: -60, neighbors: [], hopCount: 0, packetLoss: 0, latencyMs: 10 });
        const ok = service.handleHeartbeat('n1', { signalDbm: -55, neighbors: ['n2'], latencyMs: 5, packetLoss: 0 });
        expect(ok).toBe(true);
    });

    it('getAllNodes / getOnlineNodes', () => {
        service.registerNode({ id: 'n1', name: 'R1', type: 'relay', signalDbm: -60, neighbors: [], hopCount: 0, packetLoss: 0, latencyMs: 10 });
        expect(service.getAllNodes().length).toBe(1);
        expect(service.getOnlineNodes().length).toBe(1);
    });

    it('getNetworkHealth returns summary', () => {
        service.registerNode({ id: 'n1', name: 'R1', type: 'relay', signalDbm: -60, neighbors: [], hopCount: 0, packetLoss: 0, latencyMs: 10 });
        const health = service.getNetworkHealth();
        expect(health.totalNodes).toBe(1);
        expect(health.onlineNodes).toBe(1);
    });

    it('getActiveAlerts returns empty initially', () => {
        expect(service.getActiveAlerts().length).toBe(0);
    });

    it('resolveAlert returns false for unknown id', () => {
        expect(service.resolveAlert('nonexist')).toBe(false);
    });
});
