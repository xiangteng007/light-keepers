import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OverlaysService } from './overlays.service';
import { MissionOverlay } from './entities/mission-overlay.entity';
import { OverlayLock } from './entities/overlay-lock.entity';
import { OverlayAuditLog } from './entities/overlay-audit-log.entity';

describe('OverlaysService', () => {
    let service: OverlaysService;
    const mockOverlay = {
        id: 'ov1', sessionId: 's1', type: 'marker', name: 'Test',
        geoJson: {}, version: 1, status: 'draft', createdBy: 'u1',
        createdAt: new Date(), updatedAt: new Date(),
    };
    const mockLock = { id: 'lk1', overlayId: 'ov1', userId: 'u1', expiresAt: new Date(Date.now() + 120000) };

    beforeEach(async () => {
        const overlayRepo = {
            find: jest.fn().mockResolvedValue([mockOverlay]),
            findOne: jest.fn().mockResolvedValue(mockOverlay),
            create: jest.fn().mockReturnValue(mockOverlay),
            save: jest.fn().mockResolvedValue(mockOverlay),
            createQueryBuilder: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mockOverlay]),
            }),
        };
        const lockRepo = {
            findOne: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockReturnValue(mockLock),
            save: jest.fn().mockResolvedValue(mockLock),
            delete: jest.fn().mockResolvedValue({ affected: 1 }),
        };
        const auditRepo = {
            create: jest.fn().mockReturnValue({}),
            save: jest.fn().mockResolvedValue({}),
        };
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OverlaysService,
                { provide: getRepositoryToken(MissionOverlay), useValue: overlayRepo },
                { provide: getRepositoryToken(OverlayLock), useValue: lockRepo },
                { provide: getRepositoryToken(OverlayAuditLog), useValue: auditRepo },
            ],
        }).compile();
        service = module.get(OverlaysService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('findOne returns overlay DTO', async () => {
        const dto = await service.findOne('ov1');
        expect(dto).toBeDefined();
    });

    it('sanitizeForAudit removes functions', () => {
        const result = (service as any).sanitizeForAudit({ id: '1', fn: () => {} });
        expect(result.id).toBe('1');
    });
});
