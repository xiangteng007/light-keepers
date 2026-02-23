import { Test, TestingModule } from '@nestjs/testing';
import { FeatureFlagsService, FeatureFlag } from './feature-flags.service';
import { CacheService } from '../cache/cache.service';

describe('FeatureFlagsService', () => {
    let service: FeatureFlagsService;
    let cacheService: { get: jest.Mock; set: jest.Mock };

    beforeEach(async () => {
        cacheService = {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FeatureFlagsService,
                { provide: CacheService, useValue: cacheService },
            ],
        }).compile();

        service = module.get<FeatureFlagsService>(FeatureFlagsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('CRUD operations', () => {
        it('should create a flag with auto-generated id and timestamps', async () => {
            const flag = await service.createFlag({
                key: 'new-ui',
                name: 'New UI',
                enabled: true,
                rolloutPercentage: 100,
            });
            expect(flag.id).toContain('flag-');
            expect(flag.key).toBe('new-ui');
            expect(flag.createdAt).toBeInstanceOf(Date);
            expect(cacheService.set).toHaveBeenCalled();
        });

        it('should get all flags', async () => {
            await service.createFlag({ key: 'f1', name: 'F1', enabled: true, rolloutPercentage: 100 });
            await service.createFlag({ key: 'f2', name: 'F2', enabled: false, rolloutPercentage: 0 });
            const all = await service.getAllFlags();
            expect(all).toHaveLength(2);
        });

        it('should get flag by key', async () => {
            await service.createFlag({ key: 'dark-mode', name: 'Dark Mode', enabled: true, rolloutPercentage: 100 });
            const flag = await service.getFlag('dark-mode');
            expect(flag?.key).toBe('dark-mode');
        });

        it('should return null for nonexistent key', async () => {
            const flag = await service.getFlag('nonexistent');
            expect(flag).toBeNull();
        });

        it('should update a flag', async () => {
            await service.createFlag({ key: 'beta', name: 'Beta', enabled: false, rolloutPercentage: 0 });
            const updated = await service.updateFlag('beta', { enabled: true });
            expect(updated?.enabled).toBe(true);
            expect(updated?.updatedAt).toBeInstanceOf(Date);
        });

        it('should return null when updating nonexistent flag', async () => {
            const result = await service.updateFlag('nope', { enabled: true });
            expect(result).toBeNull();
        });

        it('should delete a flag', async () => {
            await service.createFlag({ key: 'temp', name: 'Temp', enabled: true, rolloutPercentage: 100 });
            expect(await service.deleteFlag('temp')).toBe(true);
            expect(await service.getFlag('temp')).toBeNull();
        });

        it('should return false when deleting nonexistent flag', async () => {
            expect(await service.deleteFlag('nope')).toBe(false);
        });
    });

    describe('evaluate', () => {
        it('should return disabled for nonexistent flag', async () => {
            const result = await service.evaluate('nonexistent');
            expect(result.enabled).toBe(false);
            expect(result.reason).toContain('not found');
        });

        it('should return disabled for globally disabled flag', async () => {
            await service.createFlag({ key: 'off', name: 'Off', enabled: false, rolloutPercentage: 100 });
            const result = await service.evaluate('off');
            expect(result.enabled).toBe(false);
            expect(result.reason).toContain('disabled');
        });

        it('should return disabled for expired flag', async () => {
            await service.createFlag({
                key: 'expired',
                name: 'Expired',
                enabled: true,
                rolloutPercentage: 100,
                expiresAt: new Date('2020-01-01'),
            });
            const result = await service.evaluate('expired');
            expect(result.enabled).toBe(false);
            expect(result.reason).toContain('expired');
        });

        it('should block blocked users', async () => {
            await service.createFlag({
                key: 'feat',
                name: 'Feat',
                enabled: true,
                rolloutPercentage: 100,
                blockedUsers: ['bad-user'],
            });
            const result = await service.evaluate('feat', { userId: 'bad-user' });
            expect(result.enabled).toBe(false);
            expect(result.reason).toContain('blocked');
        });

        it('should allow allowed users', async () => {
            await service.createFlag({
                key: 'feat',
                name: 'Feat',
                enabled: true,
                rolloutPercentage: 0, // 0% rollout but user is allowed
                allowedUsers: ['vip-user'],
            });
            const result = await service.evaluate('feat', { userId: 'vip-user' });
            expect(result.enabled).toBe(true);
        });

        it('should reject user with wrong role', async () => {
            await service.createFlag({
                key: 'admin-only',
                name: 'Admin Only',
                enabled: true,
                rolloutPercentage: 100,
                allowedRoles: ['admin'],
            });
            const result = await service.evaluate('admin-only', { role: 'volunteer' });
            expect(result.enabled).toBe(false);
            expect(result.reason).toContain('Role');
        });

        it('should enable for 100% rollout', async () => {
            await service.createFlag({
                key: 'full',
                name: 'Full Rollout',
                enabled: true,
                rolloutPercentage: 100,
            });
            const result = await service.evaluate('full');
            expect(result.enabled).toBe(true);
        });
    });

    describe('isEnabled and getVariant', () => {
        it('isEnabled should return boolean', async () => {
            await service.createFlag({ key: 'on', name: 'On', enabled: true, rolloutPercentage: 100 });
            expect(await service.isEnabled('on')).toBe(true);
            expect(await service.isEnabled('nonexistent')).toBe(false);
        });

        it('getVariant should return null when no variants', async () => {
            await service.createFlag({ key: 'no-var', name: 'No Var', enabled: true, rolloutPercentage: 100 });
            expect(await service.getVariant('no-var')).toBeNull();
        });
    });

    describe('evaluateAll and getEnabledFeatures', () => {
        it('should evaluate all flags', async () => {
            await service.createFlag({ key: 'a', name: 'A', enabled: true, rolloutPercentage: 100 });
            await service.createFlag({ key: 'b', name: 'B', enabled: false, rolloutPercentage: 100 });
            const results = await service.evaluateAll();
            expect(results['a'].enabled).toBe(true);
            expect(results['b'].enabled).toBe(false);
        });

        it('should return only enabled feature keys', async () => {
            await service.createFlag({ key: 'x', name: 'X', enabled: true, rolloutPercentage: 100 });
            await service.createFlag({ key: 'y', name: 'Y', enabled: false, rolloutPercentage: 100 });
            const enabled = await service.getEnabledFeatures();
            expect(enabled).toContain('x');
            expect(enabled).not.toContain('y');
        });
    });
});
