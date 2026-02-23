import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MeshSyncService } from './mesh-sync.service';
import { MeshMessage, MeshNode } from './entities/mesh-message.entity';

describe('MeshSyncService', () => {
    let service: MeshSyncService;

    beforeEach(async () => {
        const makeRepo = (data: any) => ({
            create: jest.fn().mockReturnValue(data),
            save: jest.fn().mockResolvedValue(data),
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue(null),
            count: jest.fn().mockResolvedValue(0),
            createQueryBuilder: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
                getCount: jest.fn().mockResolvedValue(0),
            }),
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MeshSyncService,
                { provide: getRepositoryToken(MeshMessage), useValue: makeRepo({}) },
                { provide: getRepositoryToken(MeshNode), useValue: makeRepo({}) },
                { provide: EventEmitter2, useValue: { emit: jest.fn() } },
            ],
        }).compile();
        service = module.get(MeshSyncService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('isEmergencyMessage detects SOS', () => {
        expect((service as any).isEmergencyMessage('SOS need help')).toBe(true);
        expect((service as any).isEmergencyMessage('normal message')).toBe(false);
    });

    it('getAllNodes returns nodes', async () => {
        const nodes = await service.getAllNodes();
        expect(Array.isArray(nodes)).toBe(true);
    });

    it('getActiveNodes returns active', async () => {
        const nodes = await service.getActiveNodes();
        expect(Array.isArray(nodes)).toBe(true);
    });

    it('getStats returns statistics', async () => {
        const stats = await service.getStats();
        expect(stats.totalNodes).toBeDefined();
        expect(stats.totalMessages).toBeDefined();
    });

    it('syncOfflineMessages returns sync result', async () => {
        const result = await service.syncOfflineMessages();
        expect(result.synced).toBeDefined();
        expect(result.failed).toBeDefined();
    });
});
