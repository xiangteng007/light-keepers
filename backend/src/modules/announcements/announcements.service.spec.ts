import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { Announcement } from './announcements.entity';

describe('AnnouncementsService', () => {
    let service: AnnouncementsService;
    let announcementRepo: any;

    const mockAnnouncement: Partial<Announcement> = {
        id: 'ann-1',
        title: '防災知識講座',
        content: '本週六舉辦防災知識講座',
        status: 'draft',
        category: 'training',
        priority: 'normal',
        isPinned: false,
        sendNotification: false,
        notificationSent: false,
        viewCount: 0,
        authorId: 'author-1',
        authorName: '管理員',
    };

    const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockAnnouncement]),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{ category: 'training', count: '3' }]),
    };

    beforeEach(async () => {
        // Reset mocks
        Object.values(mockQb).forEach(fn => (fn as any).mockClear?.());
        mockQb.getMany.mockResolvedValue([mockAnnouncement]);
        mockQb.getRawMany.mockResolvedValue([{ category: 'training', count: '3' }]);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnnouncementsService,
                {
                    provide: getRepositoryToken(Announcement),
                    useValue: {
                        create: jest.fn().mockImplementation((dto) => ({ id: 'ann-1', ...dto })),
                        save: jest.fn().mockImplementation((a) => Promise.resolve(a)),
                        findOne: jest.fn().mockResolvedValue(mockAnnouncement),
                        find: jest.fn().mockResolvedValue([mockAnnouncement]),
                        delete: jest.fn().mockResolvedValue({ affected: 1 }),
                        increment: jest.fn().mockResolvedValue({ affected: 1 }),
                        createQueryBuilder: jest.fn().mockReturnValue(mockQb),
                    },
                },
            ],
        }).compile();

        service = module.get<AnnouncementsService>(AnnouncementsService);
        announcementRepo = module.get(getRepositoryToken(Announcement));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== CRUD =====
    describe('create', () => {
        it('should create announcement as draft', async () => {
            const dto = { title: '防災知識講座', content: '內容', authorId: 'author-1' };
            const result = await service.create(dto as any);
            expect(announcementRepo.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft' }));
            expect(result).toBeDefined();
        });
    });

    describe('findOne', () => {
        it('should return announcement', async () => {
            const result = await service.findOne('ann-1');
            expect(result).toBeDefined();
        });

        it('should throw NotFoundException', async () => {
            announcementRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('update', () => {
        it('should update announcement', async () => {
            const result = await service.update('ann-1', { title: '更新標題' } as any);
            expect(announcementRepo.save).toHaveBeenCalled();
            expect(result).toBeDefined();
        });
    });

    describe('findPublished', () => {
        it('should return published announcements', async () => {
            const result = await service.findPublished();
            expect(result).toBeDefined();
            expect(announcementRepo.createQueryBuilder).toHaveBeenCalled();
        });
    });

    describe('findAll', () => {
        it('should return all announcements for admin', async () => {
            const result = await service.findAll();
            expect(result).toBeDefined();
        });
    });

    // ===== Lifecycle =====
    describe('publish', () => {
        it('should publish a draft announcement', async () => {
            announcementRepo.findOne.mockResolvedValueOnce({ ...mockAnnouncement, status: 'draft' });
            const result = await service.publish('ann-1');
            expect(result.status).toBe('published');
            expect(result.publishedAt).toBeDefined();
        });

        it('should throw if already published', async () => {
            announcementRepo.findOne.mockResolvedValueOnce({ ...mockAnnouncement, status: 'published' });
            await expect(service.publish('ann-1')).rejects.toThrow(BadRequestException);
        });
    });

    describe('unpublish', () => {
        it('should set status to draft', async () => {
            announcementRepo.findOne.mockResolvedValueOnce({ ...mockAnnouncement, status: 'published' });
            const result = await service.unpublish('ann-1');
            expect(result.status).toBe('draft');
        });
    });

    describe('archive', () => {
        it('should set status to archived', async () => {
            const result = await service.archive('ann-1');
            expect(result.status).toBe('archived');
        });
    });

    describe('togglePin', () => {
        it('should toggle pin status', async () => {
            announcementRepo.findOne.mockResolvedValueOnce({ ...mockAnnouncement, isPinned: false });
            const result = await service.togglePin('ann-1');
            expect(result.isPinned).toBe(true);
        });
    });

    describe('delete', () => {
        it('should delete announcement', async () => {
            await service.delete('ann-1');
            expect(announcementRepo.delete).toHaveBeenCalledWith('ann-1');
        });

        it('should throw NotFoundException if not found', async () => {
            announcementRepo.delete.mockResolvedValueOnce({ affected: 0 });
            await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    // ===== Utilities =====
    describe('incrementViewCount', () => {
        it('should increment view count', async () => {
            await service.incrementViewCount('ann-1');
            expect(announcementRepo.increment).toHaveBeenCalledWith({ id: 'ann-1' }, 'viewCount', 1);
        });
    });

    describe('getCategoryStats', () => {
        it('should return category statistics', async () => {
            const result = await service.getCategoryStats();
            expect(result).toHaveProperty('training');
            expect(result.training).toBe(3);
        });
    });
});
