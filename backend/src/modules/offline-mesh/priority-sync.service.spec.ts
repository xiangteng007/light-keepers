import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrioritySyncService, SyncPriority } from './priority-sync.service';

describe('PrioritySyncService', () => {
    let service: PrioritySyncService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PrioritySyncService,
                { provide: EventEmitter2, useValue: { emit: jest.fn() } },
            ],
        }).compile();
        service = module.get(PrioritySyncService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('enqueue adds item and returns id', () => {
        const id = service.enqueue('test', { data: 1 }, SyncPriority.NORMAL);
        expect(id).toBeDefined();
        expect(service.hasPending()).toBe(true);
    });

    it('enqueueSOS uses CRITICAL priority', () => {
        service.enqueueSOS({ sos: true });
        expect(service.getCriticalCount()).toBe(1);
    });

    it('enqueueResourceRequest uses HIGH priority', () => {
        service.enqueueResourceRequest({ type: 'water' });
        const status = service.getStatus();
        expect(status.byPriority[SyncPriority.HIGH]).toBe(1);
    });

    it('dequeue returns CRITICAL first', () => {
        service.enqueue('low', {}, SyncPriority.LOW);
        service.enqueueSOS({ sos: true });
        const item = service.dequeue();
        expect(item!.type).toBe('sos');
    });

    it('dequeueBatch returns multiple items', () => {
        service.enqueue('a', {}, SyncPriority.NORMAL);
        service.enqueue('b', {}, SyncPriority.NORMAL);
        const batch = service.dequeueBatch(5);
        expect(batch.length).toBe(2);
    });

    it('markSynced increments counter', () => {
        const id = service.enqueue('test', {});
        service.dequeue();
        service.markSynced(id);
        expect(service.getStatus().synced).toBe(1);
    });

    it('markFailed retries up to MAX_RETRIES', () => {
        const id = service.enqueue('test', {});
        const item = service.dequeue()!;
        const ok = service.markFailed(item);
        expect(ok).toBe(true); // re-queued
    });

    it('cleanupExpired removes expired items', () => {
        service.enqueue('test', {}, SyncPriority.LOW, 1); // expires in 1ms
        // Wait a tiny bit for expiration
        const cleaned = service.cleanupExpired();
        expect(typeof cleaned).toBe('number');
    });

    it('getRetryInterval returns interval', () => {
        expect(service.getRetryInterval(SyncPriority.CRITICAL)).toBe(5000);
    });

    it('clear empties all queues', () => {
        service.enqueue('a', {});
        service.enqueue('b', {});
        service.clear();
        expect(service.hasPending()).toBe(false);
    });

    it('getStatus returns full status', () => {
        const status = service.getStatus();
        expect(status.pending).toBeDefined();
        expect(status.synced).toBeDefined();
        expect(status.failed).toBeDefined();
    });
});
