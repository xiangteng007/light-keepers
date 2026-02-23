import { ConflictResolverService, ConflictType, ConflictRecord } from './conflict-resolver.service';

describe('ConflictResolverService', () => {
    let service: ConflictResolverService;
    const eventEmitter = { emit: jest.fn() };

    const makeConflict = (overrides: Partial<ConflictRecord> = {}): ConflictRecord => ({
        id: 'c1',
        type: ConflictType.DATA_MODIFICATION,
        entityType: 'resource',
        entityId: 'res-1',
        localVersion: { qty: 10 },
        remoteVersion: { qty: 5 },
        localTimestamp: new Date('2026-01-01T10:00:00Z'),
        remoteTimestamp: new Date('2026-01-01T10:05:00Z'),
        localUserId: 'user-a',
        remoteUserId: 'user-b',
        ...overrides,
    });

    beforeEach(() => {
        jest.clearAllMocks();
        service = new ConflictResolverService(eventEmitter as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('resolve', () => {
        it('should resolve data_modification with merge strategy', () => {
            const result = service.resolve(makeConflict());
            expect(result.success).toBe(true);
            expect(result.strategy).toBe('merge');
        });

        it('should resolve location_update with last-write-wins', () => {
            const result = service.resolve(makeConflict({ type: ConflictType.LOCATION_UPDATE }));
            expect(result.success).toBe(true);
            expect(result.strategy).toBe('last_write_wins');
        });
    });

    describe('resolveResourceConflict', () => {
        it('should resolve resource allocation conflict', () => {
            const result = service.resolveResourceConflict('res-1',
                { userId: 'a', timestamp: new Date('2026-01-01T10:00:00Z'), quantity: 10 },
                { userId: 'b', timestamp: new Date('2026-01-01T10:05:00Z'), quantity: 5 },
            );
            expect(result.success).toBe(true);
            expect(result.strategy).toBe('commander_priority');
        });
    });

    describe('resolveTaskConflict', () => {
        it('should resolve task assignment conflict', () => {
            const result = service.resolveTaskConflict('task-1',
                { assigneeId: 'a', timestamp: new Date('2026-01-01T10:00:00Z'), assignedBy: 'cmd1' },
                { assigneeId: 'b', timestamp: new Date('2026-01-01T10:05:00Z'), assignedBy: 'cmd2' },
            );
            expect(result.success).toBe(true);
        });
    });

    describe('resolveLocationConflict', () => {
        it('should resolve location update conflict', () => {
            const result = service.resolveLocationConflict('entity-1',
                { lat: 25.03, lng: 121.56, timestamp: new Date('2026-01-01T10:00:00Z'), userId: 'a' },
                { lat: 25.04, lng: 121.57, timestamp: new Date('2026-01-01T10:05:00Z'), userId: 'b' },
            );
            expect(result.success).toBe(true);
        });
    });

    describe('manual queue', () => {
        it('should return empty initially', () => {
            expect(service.getManualQueue()).toEqual([]);
        });

        it('should return false for manual resolve of non-queued item', () => {
            expect(service.resolveManually('bad', {}, 'admin')).toBe(false);
        });
    });

    describe('getStats', () => {
        it('should return stats with byType', () => {
            service.resolve(makeConflict());
            const stats = service.getStats();
            expect(stats.resolved).toBe(1);
            expect(stats.pendingManual).toBe(0);
        });
    });

    describe('getResolutionHistory', () => {
        it('should return history after resolutions', () => {
            service.resolve(makeConflict());
            const history = service.getResolutionHistory();
            expect(history.length).toBe(1);
        });
    });
});
