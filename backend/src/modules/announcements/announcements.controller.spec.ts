import { Test, TestingModule } from '@nestjs/testing';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('AnnouncementsController', () => {
    let controller: AnnouncementsController;
    let service: jest.Mocked<Partial<AnnouncementsService>>;

    const mockAnnouncement = { id: '1', title: '緊急通知', isPinned: false };

    beforeEach(async () => {
        service = {
            findPublished: jest.fn().mockResolvedValue([mockAnnouncement]),
            getCategoryStats: jest.fn().mockResolvedValue({ emergency: 2 }),
            findOne: jest.fn().mockResolvedValue(mockAnnouncement),
            incrementViewCount: jest.fn().mockResolvedValue(undefined),
            findAll: jest.fn().mockResolvedValue([mockAnnouncement]),
            create: jest.fn().mockResolvedValue(mockAnnouncement),
            update: jest.fn().mockResolvedValue({ ...mockAnnouncement, title: '更新通知' }),
            publish: jest.fn().mockResolvedValue(mockAnnouncement),
            unpublish: jest.fn().mockResolvedValue(mockAnnouncement),
            archive: jest.fn().mockResolvedValue(mockAnnouncement),
            togglePin: jest.fn().mockResolvedValue({ ...mockAnnouncement, isPinned: true }),
            delete: jest.fn().mockResolvedValue(undefined),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AnnouncementsController],
            providers: [{ provide: AnnouncementsService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<AnnouncementsController>(AnnouncementsController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('findPublished returns published announcements', async () => {
        const result = await controller.findPublished();
        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1);
    });

    it('getCategoryStats returns stats', async () => {
        const result = await controller.getCategoryStats();
        expect(result.success).toBe(true);
    });

    it('findOne returns announcement and increments view', async () => {
        const result = await controller.findOne('1');
        expect(result.success).toBe(true);
        expect(service.incrementViewCount).toHaveBeenCalledWith('1');
    });

    it('findAll returns all announcements including drafts', async () => {
        const result = await controller.findAll();
        expect(result.success).toBe(true);
    });

    it('create creates a new announcement', async () => {
        const result = await controller.create({ title: '新通知' } as any);
        expect(result.success).toBe(true);
        expect(result.message).toContain('草稿');
    });

    it('update updates announcement', async () => {
        const result = await controller.update('1', { title: '更新' } as any);
        expect(result.success).toBe(true);
    });

    it('publish publishes announcement', async () => {
        const result = await controller.publish('1');
        expect(result.message).toContain('發布');
    });

    it('unpublish unpublishes announcement', async () => {
        const result = await controller.unpublish('1');
        expect(result.message).toContain('取消發布');
    });

    it('archive archives announcement', async () => {
        const result = await controller.archive('1');
        expect(result.message).toContain('封存');
    });

    it('togglePin toggles pin state', async () => {
        const result = await controller.togglePin('1');
        expect(result.message).toContain('置頂');
    });

    it('delete deletes announcement', async () => {
        const result = await controller.delete('1');
        expect(result.success).toBe(true);
    });
});
