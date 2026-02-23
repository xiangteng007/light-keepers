import { Test, TestingModule } from '@nestjs/testing';
import { FeatureFlagsController } from './feature-flags.controller';
import { FeatureFlagsService } from './feature-flags.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('FeatureFlagsController', () => {
    let controller: FeatureFlagsController;
    const mockUser = { uid: 'u1', id: 'u1', role: 'officer' } as any;

    beforeEach(async () => {
        const service = {
            getAllFlags: jest.fn().mockResolvedValue([{ key: 'dark_mode', enabled: true }]),
            createFlag: jest.fn().mockResolvedValue({ key: 'new_flag', enabled: false }),
            getFlag: jest.fn().mockResolvedValue({ key: 'dark_mode', enabled: true }),
            updateFlag: jest.fn().mockResolvedValue({ key: 'dark_mode', enabled: false }),
            deleteFlag: jest.fn().mockResolvedValue(true),
            evaluateAll: jest.fn().mockResolvedValue({ dark_mode: true }),
            evaluate: jest.fn().mockResolvedValue({ enabled: true, variant: null }),
            getEnabledFeatures: jest.fn().mockResolvedValue(['dark_mode']),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [FeatureFlagsController],
            providers: [{ provide: FeatureFlagsService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<FeatureFlagsController>(FeatureFlagsController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('getAllFlags returns all flags', async () => {
        const result = await controller.getAllFlags();
        expect(result.success).toBe(true);
    });

    it('createFlag creates a new flag', async () => {
        const result = await controller.createFlag({ key: 'new', name: 'New' } as any);
        expect(result.success).toBe(true);
    });

    it('getFlag returns a flag by key', async () => {
        const result = await controller.getFlag('dark_mode');
        expect(result.success).toBe(true);
    });

    it('updateFlag updates a flag', async () => {
        const result = await controller.updateFlag('dark_mode', { enabled: false });
        expect(result.success).toBe(true);
    });

    it('deleteFlag deletes a flag', async () => {
        const result = await controller.deleteFlag('old_flag');
        expect(result.success).toBe(true);
    });

    it('evaluateAll evaluates all flags for user', async () => {
        const result = await controller.evaluateAll(mockUser);
        expect(result.success).toBe(true);
    });

    it('evaluateFlag evaluates single flag', async () => {
        const result = await controller.evaluateFlag('dark_mode', mockUser);
        expect(result.success).toBe(true);
    });

    it('getEnabledFeatures returns enabled features', async () => {
        const result = await controller.getEnabledFeatures(mockUser);
        expect(result.success).toBe(true);
    });
});
