import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OfflineSyncService, OfflineOperationType, ConflictResolutionStrategy } from './offline-sync.service';

describe('OfflineSyncService', () => {
    let service: OfflineSyncService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OfflineSyncService,
                { provide: EventEmitter2, useValue: { emit: jest.fn() } },
            ],
        }).compile();
        service = module.get(OfflineSyncService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('queueOperation adds operation', () => {
        const op = service.queueOperation({
            clientId: 'c1', entityType: 'resource', entityId: 'r1',
            operation: OfflineOperationType.CREATE, data: { name: 'test' }, timestamp: new Date(),
        });
        expect(op.id).toBeDefined();
        expect(op.syncStatus).toBe('pending');
    });

    it('getPendingOperations returns queued ops', () => {
        service.queueOperation({
            clientId: 'c2', entityType: 'task', entityId: 't1',
            operation: OfflineOperationType.UPDATE, data: {}, timestamp: new Date(),
        });
        const pending = service.getPendingOperations('c2');
        expect(pending.length).toBe(1);
    });

    it('getConflictOperations returns empty initially', () => {
        expect(service.getConflictOperations('c3')).toEqual([]);
    });

    it('setConflictStrategy updates strategy', () => {
        expect(() => service.setConflictStrategy(ConflictResolutionStrategy.MERGE)).not.toThrow();
    });

    it('syncBatch returns result', async () => {
        const result = await service.syncBatch('c4');
        expect(result.clientId).toBe('c4');
        expect(result.synced).toBe(0);
    });
});
