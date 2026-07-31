import { Test, TestingModule } from '@nestjs/testing';
import { MeshController } from './mesh.controller';
import { MeshSyncService } from './mesh-sync.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('MeshController', () => {
    let controller: MeshController;

    beforeEach(async () => {
        const service = {
            getAllNodes: jest.fn().mockResolvedValue([]),
            getActiveNodes: jest.fn().mockResolvedValue([]),
            getNodeMessages: jest.fn().mockResolvedValue([]),
            getStats: jest.fn().mockResolvedValue({}),
            syncOfflineMessages: jest.fn().mockResolvedValue({ synced: 5 }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [MeshController],
            providers: [{ provide: MeshSyncService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<MeshController>(MeshController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('getAllNodes returns nodes', async () => {
        const result = await controller.getAllNodes();
        expect(result.success).toBe(true);
    });
    it('getActiveNodes returns active', async () => {
        const result = await controller.getActiveNodes();
        expect(result.success).toBe(true);
    });
    it('getNodeMessages returns messages', async () => {
        const result = await controller.getNodeMessages('node1', '10');
        expect(result.success).toBe(true);
    });
    it('getStats returns stats', async () => {
        const result = await controller.getStats();
        expect(result.success).toBe(true);
    });
    it('syncOfflineData syncs', async () => {
        const result = await controller.syncOfflineData();
        expect(result.success).toBe(true);
    });
});
