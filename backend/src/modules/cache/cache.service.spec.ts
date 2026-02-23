import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';

describe('CacheService', () => {
    let service: CacheService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CacheService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockReturnValue(null), // No Redis URL → memory cache
                    },
                },
            ],
        }).compile();

        service = module.get<CacheService>(CacheService);
        // Manually call onModuleInit for memory mode (no Redis)
        await service.onModuleInit();
    });

    afterEach(async () => {
        await service.onModuleDestroy();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== Basic Operations =====
    describe('set and get', () => {
        it('should store and retrieve value', async () => {
            await service.set('key1', { data: 'hello' });
            const result = await service.get('key1');
            expect(result).toEqual({ data: 'hello' });
        });

        it('should return null for missing key', async () => {
            const result = await service.get('nonexistent');
            expect(result).toBeNull();
        });

        it('should support namespace', async () => {
            await service.set('key1', 'namespaced', { namespace: 'ns1' });
            const result = await service.get('key1', { namespace: 'ns1' });
            expect(result).toBe('namespaced');
            const noNs = await service.get('key1');
            expect(noNs).toBeNull();
        });

        it('should expire after TTL', async () => {
            await service.set('expiring', 'value', { ttl: -1 }); // Already expired
            const result = await service.get('expiring');
            expect(result).toBeNull();
        });
    });

    // ===== Delete =====
    describe('del', () => {
        it('should delete key', async () => {
            await service.set('toDelete', 'value');
            await service.del('toDelete');
            const result = await service.get('toDelete');
            expect(result).toBeNull();
        });
    });

    describe('delByPattern', () => {
        it('should delete keys matching pattern', async () => {
            await service.set('user:1', 'a');
            await service.set('user:2', 'b');
            await service.set('task:1', 'c');
            const deleted = await service.delByPattern('user:*');
            expect(deleted).toBe(2);
            const remaining = await service.get('task:1');
            expect(remaining).toBe('c');
        });
    });

    // ===== Get or Set =====
    describe('getOrSet', () => {
        it('should return cached value if exists', async () => {
            await service.set('cached', 'existing');
            const factory = jest.fn().mockResolvedValue('new');
            const result = await service.getOrSet('cached', factory);
            expect(result).toBe('existing');
            expect(factory).not.toHaveBeenCalled();
        });

        it('should call factory and cache when value missing', async () => {
            const factory = jest.fn().mockResolvedValue('computed');
            const result = await service.getOrSet('missing', factory);
            expect(result).toBe('computed');
            expect(factory).toHaveBeenCalled();
            // Should be cached now
            const cached = await service.get('missing');
            expect(cached).toBe('computed');
        });
    });

    // ===== Has =====
    describe('has', () => {
        it('should return true for existing key', async () => {
            await service.set('exists', 'value');
            expect(await service.has('exists')).toBe(true);
        });

        it('should return false for missing key', async () => {
            expect(await service.has('nope')).toBe(false);
        });
    });

    // ===== Clear =====
    describe('clear', () => {
        it('should clear all cache entries', async () => {
            await service.set('k1', 'v1');
            await service.set('k2', 'v2');
            await service.clear();
            expect(await service.get('k1')).toBeNull();
            expect(await service.get('k2')).toBeNull();
        });
    });

    // ===== Stats =====
    describe('getStats', () => {
        it('should return memory type and size', async () => {
            await service.set('s1', 'v1');
            const stats = service.getStats();
            expect(stats.type).toBe('memory');
            expect(stats.size).toBeGreaterThanOrEqual(1);
        });
    });
});
