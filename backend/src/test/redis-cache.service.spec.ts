import { Test, TestingModule } from '@nestjs/testing';
import { RedisCacheService } from '../modules/redis-cache/redis-cache.service';
import { ConfigService } from '@nestjs/config';

describe('RedisCacheService', () => {
    let service: RedisCacheService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RedisCacheService,
                { provide: ConfigService, useValue: { get: jest.fn() } },
            ],
        }).compile();

        service = module.get<RedisCacheService>(RedisCacheService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('get/set', () => {
        it('should set and get a value', async () => {
            await service.set('testKey', { foo: 'bar' }, 300);
            const result = await service.get<{ foo: string }>('testKey');
            expect(result).toEqual({ foo: 'bar' });
        });

        it('should return null for non-existent key', async () => {
            const result = await service.get('nonExistent');
            expect(result).toBeNull();
        });
    });

    describe('getOrSet', () => {
        it('should return cached value if exists', async () => {
            await service.set('cached', 'value1');
            const result = await service.getOrSet('cached', async () => 'value2');
            expect(result).toBe('value1');
        });

        it('should call factory and cache if not exists', async () => {
            const factory = jest.fn().mockResolvedValue('newValue');
            const result = await service.getOrSet('newKey', factory);
            expect(factory).toHaveBeenCalled();
            expect(result).toBe('newValue');
        });
    });

    describe('del', () => {
        it('should delete a key', async () => {
            await service.set('toDelete', 'value');
            await service.del('toDelete');
            const result = await service.get('toDelete');
            expect(result).toBeNull();
        });
    });

    describe('flush', () => {
        it('should clear all cache', async () => {
            await service.set('key1', 'value1');
            await service.set('key2', 'value2');
            await service.flush();
            expect(await service.get('key1')).toBeNull();
            expect(await service.get('key2')).toBeNull();
        });
    });
});
